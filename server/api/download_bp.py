"""
Provide blueprint for download-related API endpoints.

This module defines endpoints to handle video and gallery downloads,
including validation, processing, and status management.
"""

import logging
import time
from collections import defaultdict
from pathlib import Path
from typing import Any

import psutil
from flask import Blueprint, jsonify, request
from flask.wrappers import Response
from pydantic import ValidationError
from werkzeug.exceptions import BadRequest, RequestEntityTooLarge

from server.config import Config
from server.downloads import progress_data
from server.downloads.gallery_dl import handle_gallery_dl_download
from server.downloads.resume import handle_resume_download
from server.downloads.ytdlp import download_process_registry, download_tempfile_registry, handle_ytdlp_download
from server.schemas import DownloadRequest, GalleryDLRequest, PriorityRequest, ResumeRequest
from server.utils import cleanup_expired_cache

# Create blueprint with '/api' prefix
download_bp = Blueprint("download_api", __name__, url_prefix="/api")
logger = logging.getLogger(__name__)

# Rate limiting storage
_rate_limit_storage = defaultdict(list)
_RATE_LIMIT_WINDOW = 60  # 1 minute window
_MAX_REQUESTS_PER_WINDOW = 10  # Max 10 requests per minute per IP

# Background cleanup tracking
_last_cleanup_time = 0.0
_CLEANUP_INTERVAL = 300  # 5 minutes


def clear_rate_limit_storage() -> None:
    """Clear the rate limit storage (for testing purposes)."""
    _rate_limit_storage.clear()


def check_rate_limit(ip_address: str) -> bool:
    """
    Check if the IP address has exceeded the rate limit.

    Args:
        ip_address: The client's IP address

    Returns:
        True if rate limit is exceeded, False otherwise
    """
    current_time = time.time()
    window_start = current_time - _RATE_LIMIT_WINDOW

    # Clean old entries
    _rate_limit_storage[ip_address] = [
        timestamp for timestamp in _rate_limit_storage[ip_address] if timestamp > window_start
    ]

    # Check if limit exceeded
    if len(_rate_limit_storage[ip_address]) >= _MAX_REQUESTS_PER_WINDOW:
        return True

    # Add current request
    _rate_limit_storage[ip_address].append(current_time)
    return False


def rate_limit_response() -> tuple[Response, int]:
    """Return rate limit exceeded response."""
    return (
        jsonify(
            {
                "status": "error",
                "message": "Rate limit exceeded. Please wait before making more requests.",
                "error_type": "RATE_LIMIT_EXCEEDED",
                "downloadId": "unknown",
            }
        ),
        429,
    )


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
    """Parse and return raw JSON payload from the request."""
    data: Any = request.get_json(force=True)
    if isinstance(data, dict):
        return data  # type: ignore[return-value]
    return {}


def _get_download_id(raw_data: dict[str, Any]) -> str:
    """Extract the downloadId or use 'unknown' if missing."""
    download_id = raw_data.get("downloadId", "unknown")
    return str(download_id) if download_id is not None else "unknown"


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

    # Playlist permission check
    resp = _playlist_permission_response(validated_data, download_id)
    if resp is not None:
        return resp, None

    # Log the validated request safely
    _log_validated_request(download_id, validated_data)

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

    # Check rate limit
    client_ip = request.remote_addr or "unknown"
    if check_rate_limit(client_ip):
        logger.warning(f"Rate limit exceeded for IP: {client_ip}")
        return rate_limit_response()

    raw_data = {}
    try:
        # Parse raw JSON and extract download ID
        raw_data = _parse_download_raw()

        # Process the request
        response, _ = _process_download_request(raw_data)
    except RequestEntityTooLarge:
        # Large payloads should yield a structured 413 JSON
        return (
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
    except ValidationError as e:
        logger.warning(f"Invalid download request: {e}")
        return _download_error_response(
            f"Invalid request data: {e}", "VALIDATION_ERROR", raw_data.get("downloadId", "unknown"), 400
        )
    except Exception as e:
        logger.error(f"Unexpected error processing download request: {e}", exc_info=True)
        return _download_error_response(
            f"Server error: {e!s}", "SERVER_ERROR", raw_data.get("downloadId", "unknown"), 500
        )

    return response


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

    raw_data = {}
    try:
        raw_data = request.get_json(force=True)
        download_id = raw_data.get("downloadId", "unknown")

        # Validate with Pydantic
        gallery_request = GalleryDLRequest(**raw_data)
        validated_data = gallery_request.model_dump()

        logger.debug(f"Processing gallery-dl request [{download_id}]: {validated_data}")

        # Pass to gallery-dl handler
        return handle_gallery_dl_download(validated_data)

    except ValidationError as e:
        logger.warning(f"Invalid gallery-dl request: {e}")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Invalid request data: {e}",
                    "error_type": "VALIDATION_ERROR",
                    "downloadId": raw_data.get("downloadId", "unknown"),  # type: ignore[arg-type]
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
                    "downloadId": raw_data.get("downloadId", "unknown"),  # type: ignore[arg-type]
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
    raw_data = {}
    try:
        raw_data = request.get_json(force=True)
        download_id = raw_data.get("downloadId", "unknown")

        # Validate with Pydantic
        resume_request = ResumeRequest(**raw_data)
        validated_data = resume_request.model_dump()

        logger.debug(f"Processing resume request [{download_id}]: {validated_data}")

        # Pass to resume handler
        return handle_resume_download(validated_data)

    except ValidationError as e:
        logger.warning(f"Invalid resume request: {e}")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Invalid request data: {e}",
                    "error_type": "VALIDATION_ERROR",
                    "downloadId": raw_data.get("downloadId", "unknown"),  # type: ignore[arg-type]
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
                    "downloadId": raw_data.get("downloadId", "unknown"),  # type: ignore[arg-type]
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
        temp_files_to_clean = []

        # Collect temp files to clean up
        for download_id, temp_files in list(download_tempfile_registry.items()):
            if download_id not in download_process_registry:
                # Process is gone but temp files remain
                temp_files_to_clean.extend(temp_files)
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
                f"Background cleanup completed: {cache_cleaned} cache entries, "
                f"{temp_files_cleaned} temp files, {progress_cleaned} progress entries"
            )

        # Update cleanup time using nonlocal-like approach
        globals()["_last_cleanup_time"] = current_time

    except Exception as e:
        logger.error(f"Error during background cleanup: {e}", exc_info=True)
