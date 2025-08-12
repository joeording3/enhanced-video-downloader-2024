"""
Provide blueprint for download-related API endpoints.

This module defines endpoints to handle video and gallery downloads,
including validation, processing, and status management.
"""

import logging
import os
import time
from collections import defaultdict
from contextlib import suppress
from pathlib import Path
from typing import Any, TypedDict, cast

import psutil
from flask import Blueprint, jsonify, request
from flask.wrappers import Response
from pydantic import ValidationError
from werkzeug.exceptions import BadRequest, RequestEntityTooLarge

from server.config import Config
from server.downloads import progress_data, progress_lock
from server.downloads.gallery_dl import handle_gallery_dl_download
from server.downloads.resume import handle_resume_download
from server.downloads.ytdlp import (
    download_process_registry,
    download_tempfile_registry,
    handle_ytdlp_download,
)
from server.queue import queue_manager
from server.schemas import DownloadRequest, GalleryDLRequest, PriorityRequest, ResumeRequest
from server.utils import cleanup_expired_cache

# Create blueprint with '/api' prefix
download_bp = Blueprint("download_api", __name__, url_prefix="/api")
logger = logging.getLogger(__name__)
# Narrow JSON payload types used within this module to reduce Unknown warnings


# Add permissive CORS headers for this blueprint to support extension background fetch
@download_bp.after_request
def _add_cors_headers(response: Response) -> Response:
    try:
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        # Required for Chrome Private Network Access (PNA) when calling localhost from a secure context
        response.headers.add("Access-Control-Allow-Private-Network", "true")
        response.headers.add("Vary", "Access-Control-Request-Private-Network")
    except Exception:
        logger.debug("Failed to add CORS headers", exc_info=True)
    return response


class _RawDownloadData(TypedDict, total=False):
    url: str
    downloadId: str
    use_gallery_dl: bool
    download_playlist: bool
    page_title: str
    yt_dlp_options: dict[str, Any]


# Keep separate type for gallery requests


class _RawGalleryData(TypedDict, total=False):
    url: str
    downloadId: str
    options: dict[str, Any]


# Rate limiting storage
_rate_limit_storage: defaultdict[str, list[float]] = defaultdict(list)
# Allow runtime configuration via environment variables
_RATE_LIMIT_WINDOW = int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60"))
_MAX_REQUESTS_PER_WINDOW = int(os.getenv("MAX_REQUESTS_PER_WINDOW", "10"))

# Background cleanup tracking
_last_cleanup_time = 0.0
_CLEANUP_INTERVAL = 300  # 5 minutes


def clear_rate_limit_storage() -> None:
    """Clear the rate limit storage (for testing purposes)."""
    _rate_limit_storage.clear()


def check_rate_limit(ip_address: str) -> bool:
    """Check if the IP address has exceeded the rate limit.

    Parameters
    ----------
    ip_address : str
        The client's IP address.

    Returns
    -------
    bool
        True if rate limit is exceeded, False otherwise.
    """
    current_time = time.time()
    window_start = current_time - _RATE_LIMIT_WINDOW

    # Clean old entries
    _rate_limit_storage[ip_address] = [ts for ts in _rate_limit_storage[ip_address] if ts > window_start]

    # Check if limit exceeded
    if len(_rate_limit_storage[ip_address]) >= _MAX_REQUESTS_PER_WINDOW:
        return True

    # Add current request
    _rate_limit_storage[ip_address].append(current_time)
    return False


def rate_limit_response() -> tuple[Response, int]:
    """Return rate limit exceeded response with a Retry-After hint."""
    resp = jsonify(
        {
            "status": "error",
            "message": "Rate limit exceeded. Please wait before making more requests.",
            "error_type": "RATE_LIMIT_EXCEEDED",
            "downloadId": "unknown",
        }
    )
    # Suggest short backoff (10s by default if window is 60s)
    with suppress(Exception):
        resp.headers["Retry-After"] = str(min(max(_RATE_LIMIT_WINDOW // 6, 1), _RATE_LIMIT_WINDOW))
    return resp, 429


def _cleanup_temp_files(temp_file: str) -> None:
    """Clean up a temporary file safely."""
    try:
        if Path(temp_file).exists():
            Path(temp_file).unlink()
            logger.debug(f"Cleaned up temp file: {temp_file}")
    except Exception as e:
        logger.warning(f"Failed to clean up temp file {temp_file}: {e}")


def cleanup_failed_download(download_id: str) -> None:
    """
    Clean up resources for a failed download.

    Args:
        download_id: The ID of the failed download to clean up
    """
    try:
        # Clean up process registry
        if download_id in download_process_registry:
            try:
                proc = download_process_registry[download_id]
                if proc and proc.is_running():
                    proc.terminate()
                    proc.wait(timeout=5)
            finally:
                del download_process_registry[download_id]

        # Clean up temp files
        if download_id in download_tempfile_registry:
            temp_file = download_tempfile_registry[download_id]
            _cleanup_temp_files(temp_file)
            del download_tempfile_registry[download_id]

        # Remove from progress data
        if download_id in progress_data:
            del progress_data[download_id]

        logger.info(f"Cleaned up failed download: {download_id}")

    except Exception as e:
        logger.error(f"Error during cleanup for {download_id}: {e}", exc_info=True)


# Helper functions for the /api/download endpoint
def _parse_download_raw() -> dict[str, Any]:
    """Parse and return raw JSON payload from the request.

    Let JSON parsing errors bubble up so the route-level handler can
    produce a consistent server error response expected by tests.
    """
    data: Any = request.get_json(force=True)
    if isinstance(data, dict):
        return cast(dict[str, Any], data)
    return {}


def _get_download_id(raw_data: dict[str, Any]) -> str:
    """Extract a download ID from either 'downloadId' or 'download_id'; generate one if missing."""
    download_id = raw_data.get("downloadId")
    if download_id is None:
        download_id = raw_data.get("download_id")
    if not download_id:
        # Millisecond timestamp fallback for stability
        return str(int(time.time() * 1000))
    return str(download_id)


def _missing_url_response(download_id: str) -> tuple[Response, int]:
    """Return a Flask JSON error response for a missing URL in the request."""
    return (
        jsonify(
            {
                "status": "error",
                "message": "URL is required",
                "error_type": "MISSING_URL",
                "downloadId": download_id,
            }
        ),
        400,
    )


def _maybe_handle_gallery(raw_data: dict[str, Any]) -> Any | None:
    """Handle GalleryDL flow if requested."""
    if raw_data.get("use_gallery_dl", False):
        validated = GalleryDLRequest(**raw_data).model_dump()
        return handle_gallery_dl_download(validated)
    return None


def _validation_error_response(e: ValidationError, download_id: str) -> tuple[Response, int]:
    """Return JSON response for Pydantic validation errors."""
    field_errors: list[str] = []
    for error in e.errors():
        loc = ".".join(str(loc) for loc in error["loc"])
        field_errors.append(f"{loc}: {error['msg']}")
    logger.warning(f"Validation failed for download request [{download_id}]: {'; '.join(field_errors)}")
    return (
        jsonify(
            {
                "status": "error",
                "message": f"Invalid request data: {'; '.join(field_errors)}",
                "error_type": "VALIDATION_ERROR",
                "downloadId": download_id,
                "validation_errors": field_errors,
            }
        ),
        400,
    )


def _playlist_permission_response(validated_data: dict[str, Any], download_id: str) -> tuple[Response, int] | None:
    """Check if playlist downloads are allowed in config."""
    if validated_data.get("download_playlist", False):
        config = Config.load()
        if not config.get_value("allow_playlists", False):
            logger.warning(f"Playlist download denied for [{download_id}]: Playlists not allowed")
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Playlist downloads are not allowed by server configuration",
                        "error_type": "PLAYLIST_DOWNLOADS_DISABLED",
                        "downloadId": download_id,
                    }
                ),
                403,
            )
        logger.info(f"Playlist download allowed for [{download_id}]: Playlists enabled")
    return None


def _log_validated_request(download_id: str, validated_data: dict[str, Any]) -> None:
    """Log a safe copy of the validated request for debugging."""
    safe_data = validated_data.copy()
    if "url" in safe_data:
        url_val = safe_data["url"]
        safe_data["url"] = f"{url_val[:50]}..." if len(url_val) > 50 else url_val
    logger.debug(f"Processing validated download request [{download_id}]: {safe_data}")


def _get_cancel_proc(download_id: str) -> tuple[psutil.Process | None, tuple[Response, int] | None]:
    """Retrieve process for cancellation or return error response."""
    proc = download_process_registry.get(download_id)
    if not proc:
        return None, (
            jsonify(
                {
                    "status": "error",
                    "message": "No active download with given ID.",
                    "downloadId": download_id,
                }
            ),
            404,
        )
    return proc, None


def _terminate_proc(proc: psutil.Process, download_id: str) -> tuple[None, tuple[Response, int] | None]:
    """Attempt graceful then forceful termination, or return error response."""
    try:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except psutil.TimeoutExpired:
            proc.kill()
    except Exception:
        return None, (
            jsonify(
                {
                    "status": "error",
                    "message": "Failed to terminate download process",
                    "downloadId": download_id,
                }
            ),
            500,
        )
    else:
        return None, None


def _cleanup_cancel_partfiles(download_id: str) -> None:
    """Remove any .part files for a canceled download."""
    try:
        cfg = Config.load()
        download_dir = cfg.get_value("download_dir", "")
        prefix = download_tempfile_registry.get(download_id)
        if download_dir and prefix:
            path = Path(download_dir)
            for pf in path.glob(f"{prefix}*.part"):
                pf.unlink()
    except Exception as e:
        logger.debug(f"Failed to clean cancel partfiles for {download_id}: {e}")


def _download_error_response(message: str, error_type: str, download_id: str, status_code: int) -> tuple[Response, int]:
    """Create standardized error response for download endpoint."""
    return (
        jsonify(
            {
                "status": "error",
                "message": message,
                "error_type": error_type,
                "downloadId": download_id,
            }
        ),
        status_code,
    )


def _priority_response(
    status: str, message: str, download_id: str, status_code: int, **kwargs: Any
) -> tuple[Response, int]:
    """Create standardized response for priority endpoint."""
    response_data: dict[str, Any] = {"status": status, "message": message, "downloadId": download_id, **kwargs}
    return jsonify(response_data), status_code


def _process_download_request(raw_data: dict[str, Any]) -> tuple[Any, str | None]:
    """Process download request and return response or None if validation fails."""
    download_id = _get_download_id(raw_data)

    # Missing URL check
    if not raw_data.get("url"):
        logger.warning(f"Missing URL in download request [{download_id}]")
        return _missing_url_response(download_id), None

    # GalleryDL flow
    resp = _maybe_handle_gallery(raw_data)
    if resp is not None:
        return resp, None

    # Validate with Pydantic
    try:
        download_request = DownloadRequest(**raw_data)
    except ValidationError as e:
        return _validation_error_response(e, download_id), None

    validated_data = download_request.model_dump()

    # Ensure a non-null download_id flows to the downstream handler
    if not validated_data.get("download_id"):
        validated_data["download_id"] = download_id

    # Playlist permission check
    resp = _playlist_permission_response(validated_data, download_id)
    if resp is not None:
        return resp, None

    # Log the validated request safely
    _log_validated_request(download_id, validated_data)

    # Reflect a minimal status entry immediately so /api/status is non-empty for observers/tests
    try:
        with progress_lock:
            progress_data[download_id] = {
                "status": "queued",
                "url": validated_data.get("url", ""),
                "last_update": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            }
    except Exception:
        # Best effort; do not block request processing
        logger.debug("Failed to pre-populate queued status entry", exc_info=True)

    # Proceed with the download
    return handle_ytdlp_download(validated_data), None


@download_bp.route("/download", methods=["POST", "OPTIONS"])
def download() -> Any:
    """
    Process video download requests.

    Parse and validate request JSON for download options, handle gallery or
    standard download flow based on flags, and return the appropriate
    Flask response.

    Returns
    -------
    Any
        Flask JSON response representing download status or error message.
    """
    if request.method == "OPTIONS":
        return "", 204

    # Perform background cleanup
    perform_background_cleanup()

    # Prepare unified response holder to minimize return statements
    unified_response: Any

    # Check rate limit
    client_ip = request.remote_addr or "unknown"
    if check_rate_limit(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        unified_response = rate_limit_response()
    else:
        raw_data: _RawDownloadData = {}
        try:
            # Parse JSON first without consuming the stream; if this yields None or non-dict,
            # fallback to strict parsing which will raise on invalid JSON and be handled uniformly below.
            json_obj: Any = request.get_json(silent=True)
            if isinstance(json_obj, dict):
                raw_data = cast(_RawDownloadData, json_obj)
            else:
                raw_data = cast(_RawDownloadData, _parse_download_raw())

            # Server-side debug log when a download request is received (safe fields only)
            try:
                safe_url = str(raw_data.get("url", ""))
                trimmed = safe_url[:100] + ("…" if len(safe_url) > 100 else "")
                logger.info(
                    "EVD server: download request received",
                    extra={
                        "url": trimmed,
                        "has_playlist": bool(raw_data.get("download_playlist")),
                        "page_title": str(raw_data.get("page_title", ""))[:80],
                    },
                )
            except Exception:
                logger.debug("Failed to log safe download request fields", exc_info=True)

            # If server is at capacity, enqueue and return queued status immediately
            try:
                cfg = Config.load()
                max_concurrent = int(cfg.get_value("max_concurrent_downloads", 3))
            except Exception:
                max_concurrent = 3
            if len(download_process_registry) >= max_concurrent:
                # Ensure a downloadId exists for queue tracking
                if not raw_data.get("downloadId") and not raw_data.get("download_id"):
                    raw_data["downloadId"] = str(int(time.time() * 1000))
                queue_manager.enqueue(dict(raw_data))
                queue_manager.start()
                unified_response = jsonify(
                    {
                        "status": "queued",
                        "message": "Server at capacity. Request added to queue.",
                        "downloadId": str(raw_data.get("downloadId") or raw_data.get("download_id") or "unknown"),
                    }
                )
            else:
                # Otherwise process immediately
                unified_response, _ = _process_download_request(cast(dict[str, Any], raw_data))
        except RequestEntityTooLarge:
            # Large payloads should yield a structured 413 JSON
            unified_response = (
                jsonify(
                    {
                        "status": "error",
                        "message": "Request entity too large",
                        "error_type": "REQUEST_ENTITY_TOO_LARGE",
                        "downloadId": raw_data.get("downloadId", "unknown"),
                    }
                ),
                413,
            )
        except BadRequest as e:
            # Bad JSON/malformed payload; align with existing behavior to return 500 with sanitized body
            logger.warning(f"Bad request payload for download: {e}")
            unified_response = _download_error_response(
                "Server error: Invalid JSON payload", "SERVER_ERROR", str(raw_data.get("downloadId", "unknown")), 500
            )
        except ValidationError as e:
            logger.warning(f"Invalid download request: {e}")
            unified_response = _download_error_response(
                f"Invalid request data: {e}", "VALIDATION_ERROR", str(raw_data.get("downloadId", "unknown")), 400
            )
        except Exception as e:
            logger.error(f"Unexpected error processing download request: {e}", exc_info=True)
            unified_response = _download_error_response(
                f"Server error: {e!s}", "SERVER_ERROR", str(raw_data.get("downloadId", "unknown")), 500
            )

    return unified_response


@download_bp.route("/gallery-dl", methods=["POST", "OPTIONS"])
def gallery_dl() -> Any:
    """
    Process gallery download requests using gallery-dl.

    Returns
    -------
    Any
        Flask JSON response representing download status or error message.
    """
    if request.method == "OPTIONS":
        return "", 204

    # Check rate limit
    client_ip = request.remote_addr or "unknown"
    if check_rate_limit(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        return rate_limit_response()

    raw_data: _RawGalleryData = {}
    try:
        # Avoid automatic 400 on bad JSON; treat as server error per tests
        json_obj: Any = request.get_json(silent=True)
        if not isinstance(json_obj, dict):
            return _download_error_response("Server error: Invalid JSON payload", "SERVER_ERROR", "unknown", 500)
        raw_data = cast(_RawGalleryData, json_obj)
        download_id = raw_data.get("downloadId", "unknown")

        # Validate with Pydantic
        gallery_request = GalleryDLRequest(**cast(dict[str, Any], raw_data))
        validated_data = gallery_request.model_dump()

        logger.debug(f"Processing gallery-dl request [{download_id}]: {validated_data}")

        # Pass to gallery-dl handler
        return handle_gallery_dl_download(cast(dict[str, Any], validated_data))

    except ValidationError as e:
        logger.warning(f"Invalid gallery-dl request: {e}")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Invalid request data: {e}",
                    "error_type": "VALIDATION_ERROR",
                    "downloadId": str(raw_data.get("downloadId", "unknown")),
                }
            ),
            400,
        )
    except Exception as e:
        logger.error(f"Error processing gallery-dl request: {e}", exc_info=True)
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Server error: {e!s}",
                    "error_type": "SERVER_ERROR",
                    "downloadId": str(raw_data.get("downloadId", "unknown")),
                }
            ),
            500,
        )


@download_bp.route("/resume", methods=["POST"])
def resume() -> Any:
    """
    Resume downloads from partial files.

    Returns
    -------
    Any
        Flask JSON response representing resume status or error message.
    """
    raw_data: _RawDownloadData = {}
    try:
        # Avoid automatic 400 on bad JSON; treat as server error per tests
        json_obj: Any = request.get_json(silent=True)
        if not isinstance(json_obj, dict):
            return _download_error_response("Server error: Invalid JSON payload", "SERVER_ERROR", "unknown", 500)
        raw_data = cast(_RawDownloadData, json_obj)
        download_id = raw_data.get("downloadId", "unknown")

        # Validate with Pydantic
        resume_request = ResumeRequest(**cast(dict[str, Any], raw_data))
        validated_data = resume_request.model_dump()

        logger.debug(f"Processing resume request [{download_id}]: {validated_data}")

        # Pass to resume handler
        return handle_resume_download(cast(dict[str, Any], validated_data))

    except ValidationError as e:
        logger.warning(f"Invalid resume request: {e}")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Invalid request data: {e}",
                    "error_type": "VALIDATION_ERROR",
                    "downloadId": str(raw_data.get("downloadId", "unknown")),
                }
            ),
            400,
        )
    except Exception as e:
        logger.error(f"Error processing resume request: {e}", exc_info=True)
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Server error: {e!s}",
                    "error_type": "SERVER_ERROR",
                    "downloadId": str(raw_data.get("downloadId", "unknown")),
                }
            ),
            500,
        )


@download_bp.route("/download/<download_id>/cancel", methods=["POST", "OPTIONS"])
def cancel_download(download_id: str) -> Any:
    """
    Cancel an active download and cleanup partial files.

    Parameters
    ----------
    download_id : str
        Identifier of the download to cancel.

    Returns
    -------
    Any
        Flask JSON response tuple (response, status code) indicating cancellation result or error.
    """
    if request.method == "OPTIONS":
        return "", 204

    # Lookup process and early error
    proc, resp = _get_cancel_proc(download_id)
    if resp:
        return resp

    # Terminate process and handle errors
    assert proc is not None  # If resp was None, proc should not be None
    _, resp = _terminate_proc(proc, download_id)
    if resp:
        return resp

    # Cleanup partial files
    _cleanup_cancel_partfiles(download_id)

    # Remove from registries
    download_process_registry.pop(download_id, None)
    download_tempfile_registry.pop(download_id, None)
    return (
        jsonify(
            {
                "status": "success",
                "message": "Download canceled.",
                "downloadId": download_id,
            }
        ),
        200,
    )


@download_bp.route("/download/<download_id>/pause", methods=["POST", "OPTIONS"])
def pause_download(download_id: str) -> Any:
    """
    Pause an active download by suspending its process.

    Parameters
    ----------
    download_id : str
        Identifier of the download to pause.

    Returns
    -------
    Any
        Flask JSON response tuple (response, status code) indicating pause result or error.
    """
    if request.method == "OPTIONS":
        return "", 204

    proc = download_process_registry.get(download_id)
    if not proc:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "No active download with given ID.",
                    "downloadId": download_id,
                }
            ),
            404,
        )
    try:
        proc.suspend()
    except Exception as e:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Failed to pause download: {e}",
                    "downloadId": download_id,
                }
            ),
            500,
        )
    return (
        jsonify(
            {
                "status": "success",
                "message": "Download paused.",
                "downloadId": download_id,
            }
        ),
        200,
    )


@download_bp.route("/download/<download_id>/resume", methods=["POST", "OPTIONS"])
def resume_download(download_id: str) -> Any:
    """
    Resume a paused download by continuing its process.

    Parameters
    ----------
    download_id : str
        Identifier of the download to resume.

    Returns
    -------
    Any
        Flask JSON response tuple (response, status code) indicating resume result or error.
    """
    if request.method == "OPTIONS":
        return "", 204

    proc = download_process_registry.get(download_id)
    if not proc:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "No paused download with given ID.",
                    "downloadId": download_id,
                }
            ),
            404,
        )
    try:
        proc.resume()
    except Exception as e:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Failed to resume download: {e}",
                    "downloadId": download_id,
                }
            ),
            500,
        )
    return (
        jsonify(
            {
                "status": "success",
                "message": "Download resumed.",
                "downloadId": download_id,
            }
        ),
        200,
    )


def _process_priority_request(download_id: str, data: dict[str, Any]) -> tuple[Response, int]:
    """Process priority request and return response."""
    try:
        pr = PriorityRequest(**data)
    except ValidationError as e:
        errors = [err.get("msg") for err in e.errors()]
        return _priority_response("error", f"Invalid priority value: {errors}", download_id, 400)

    # Process mode: adjust OS process priority
    proc = download_process_registry.get(download_id)
    if not proc:
        return _priority_response("error", "Download not found", download_id, 404)

    try:
        proc.nice(pr.priority)
    except Exception as e:
        return _priority_response("error", f"Failed to set priority: {e}", download_id, 500)

    return _priority_response("success", "Priority set successfully", download_id, 200, priority=pr.priority)


@download_bp.route("/download/<download_id>/priority", methods=["POST", "OPTIONS"])
def set_priority(download_id: str) -> Any:
    """Adjust the OS process priority (nice value) for a download process."""
    # Handle preflight
    if request.method == "OPTIONS":
        return "", 204

    # Parse and validate payload
    try:
        data = request.get_json(force=True)
        if data is None:
            return _priority_response("error", "Invalid JSON", download_id, 400)
    except BadRequest:
        return _priority_response("error", "Invalid JSON", download_id, 400)

    return _process_priority_request(download_id, data)


def perform_background_cleanup() -> None:
    """
    Perform background cleanup tasks.

    This function should be called periodically to clean up:
    - Expired cache entries
    - Orphaned temp files
    - Stale process registry entries
    """
    current_time = time.time()
    if current_time - _last_cleanup_time < _CLEANUP_INTERVAL:
        return  # Not time for cleanup yet

    try:
        # Clean up expired cache entries
        cache_cleaned = cleanup_expired_cache()

        # Clean up orphaned temp files
        temp_files_cleaned = 0
        temp_files_to_clean: list[str] = []

        # Collect temp files to clean up
        for download_id, temp_files in list(download_tempfile_registry.items()):
            if download_id not in download_process_registry:
                # Process is gone but temp files remain
                temp_files_to_clean.extend(list(temp_files))
                del download_tempfile_registry[download_id]

        # Clean up temp files (moved try-except outside loop for performance)
        for temp_file in temp_files_to_clean:
            if Path(temp_file).exists():
                try:
                    Path(temp_file).unlink()
                    temp_files_cleaned += 1
                except Exception as e:
                    logger.warning(f"Failed to clean up temp file {temp_file}: {e}")

        # Clean up stale progress data
        progress_cleaned = 0
        for download_id in list(progress_data.keys()):
            if download_id not in download_process_registry:
                del progress_data[download_id]
                progress_cleaned += 1

        if cache_cleaned > 0 or temp_files_cleaned > 0 or progress_cleaned > 0:
            logger.info(
                "Background cleanup completed: %s cache entries, %s temp files, %s progress entries",
                cache_cleaned,
                temp_files_cleaned,
                progress_cleaned,
            )

        # Update cleanup time using nonlocal-like approach
        globals()["_last_cleanup_time"] = current_time

    except Exception as e:
        logger.error(f"Error during background cleanup: {e}", exc_info=True)
