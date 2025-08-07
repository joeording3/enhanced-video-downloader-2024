"""
Provide yt-dlp download handling functionality.

This module defines functions to configure and execute video downloads using
yt-dlp, including option building, progress hooks, process tracking, and error cleanup.
"""

import json
import logging
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import browser_cookie3  # type: ignore[import-untyped]
import psutil  # Added for type annotations
import yt_dlp
from flask import jsonify
from yt_dlp.utils import sanitize_filename

from server.config import Config
from server.downloads import progress_data, progress_lock
from server.history import append_history_entry

# Get a logger instance
logger = logging.getLogger(__name__)

# Import the process tracking functions if available
try:
    from server.__main__ import register_download_process, unregister_download_process

    _process_tracking_available = True
except ImportError:
    # Define dummy functions if the imports fail (e.g., when running under a different context)
    def register_download_process(process: psutil.Process) -> None:
        """
        Register a download process for tracking.

        Parameters
        ----------
        process : psutil.Process
            Process object representing the download.

        Returns
        -------
        None
            This function does not return a value.
        """

    def unregister_download_process(process: psutil.Process) -> None:
        """
        Unregister a previously registered download process.

        Parameters
        ----------
        process : psutil.Process
            Process object representing the download.

        Returns
        -------
        None
            This function does not return a value.
        """

    _process_tracking_available = False


# Helper functions to simplify build_opts and reduce its complexity
def _default_ydl_opts(output_path: str, download_playlist: bool) -> dict[str, Any]:
    return {
        "format": "bestvideo+bestaudio/best",
        "merge_output_format": "mp4",
        "outtmpl": output_path,
        "writeinfojson": True,
        "continuedl": True,
        "fragment_retries": 10,
        "ignoreerrors": False,
        "concurrent_fragments": 4,
        "logger": logging.getLogger("yt_dlp_native"),
        "noplaylist": not download_playlist,
        "yesplaylist": download_playlist,
        "cookies_from_browser": "chrome",
    }


def _apply_custom_opts(ydl_opts: dict[str, Any], custom_opts: Any, _download_id: str | None) -> None:
    if isinstance(custom_opts, dict):
        ydl_opts.update(
            {
                key: value
                for key, value in custom_opts.items()
                if key not in ["outtmpl", "progress_hooks", "logger", "noplaylist", "yesplaylist"]
            }
        )
        logger.debug(f"Applied custom yt-dlp options from config: {custom_opts}")
    else:
        logger.warning("Config ytdlp_options is not a dictionary, using defaults only")


def _apply_playlist_flags(ydl_opts: dict[str, Any], download_playlist: bool) -> None:
    """
    Apply playlist flags to yt-dlp options.

    Only one of noplaylist or yesplaylist should be set based on download_playlist.

    Parameters
    ----------
    ydl_opts : Dict[str, Any]
        yt-dlp options dictionary to modify.
    download_playlist : bool
        Whether to download playlists.

    Returns
    -------
    None
        Modifies ydl_opts in place.
    """
    if download_playlist:
        ydl_opts["yesplaylist"] = True
        ydl_opts.pop("noplaylist", None)  # Remove noplaylist if present
    else:
        ydl_opts["noplaylist"] = True
        ydl_opts.pop("yesplaylist", None)  # Remove yesplaylist if present


def _assign_progress_hook(ydl_opts: dict[str, Any], download_id: str) -> None:
    def progress_hook_wrapper(d: dict[str, Any]) -> None:
        return ytdlp_progress_hook(d, download_id)

    ydl_opts["progress_hooks"] = [progress_hook_wrapper]


def _handle_cookies(ydl_opts: dict[str, Any], download_id: str | None) -> None:
    cfb = ydl_opts.get("cookies_from_browser")
    if not cfb:
        return
    try:
        cj = browser_cookie3.chrome(domain_name="youtube.com")
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tmp_file:
            cj.save(tmp_file.name)  # type: ignore[attr-defined]
            ydl_opts["cookiefile"] = tmp_file.name
        logger.debug(f"[{download_id}] Using cookie file: {tmp_file.name}")
    except Exception as e:
        logger.warning(f"[{download_id}] Could not extract browser cookies: {e}")


def build_opts(output_path: str, download_id: str | None = None, download_playlist: bool = False) -> dict[str, Any]:
    """
    Build options dictionary for yt-dlp.

    Parameters
    ----------
    output_path : str
        Path where the downloaded file should be saved.
    download_id : Optional[str], optional
        ID for tracking the download (used in progress hook), by default None.
    download_playlist : bool, optional
        Whether to download a playlist, by default False.

    Returns
    -------
    Dict[str, Any]
        Dictionary of options to pass to yt-dlp.
    """
    # Load config to get custom yt-dlp options
    config = Config.load()
    ytdlp_config_options = config.get_value("yt_dlp_options", {})

    # Start with default options
    ydl_opts: dict[str, Any] = _default_ydl_opts(output_path, download_playlist)

    # Override with config options if present
    _apply_custom_opts(ydl_opts, ytdlp_config_options, download_id)

    # Ensure only one of noplaylist or yesplaylist is present based on download_playlist
    _apply_playlist_flags(ydl_opts, download_playlist)

    # Only add progress hook if download_id is provided
    if download_id is not None:
        _assign_progress_hook(ydl_opts, download_id)

    # Handle cookies_from_browser: extract browser cookies to a temp file
    _handle_cookies(ydl_opts, download_id)

    return ydl_opts


# Global or class-level dictionary to store detailed errors from hooks
# This is a simple way; a more robust solution might involve a class or context manager
download_errors_from_hooks: dict[str, dict[str, Any]] = {}
# Registry mapping download IDs to partial-file prefixes for cleanup
download_tempfile_registry: dict[str, str] = {}
# Registry mapping download IDs to their download process for cancellation
download_process_registry: dict[str, psutil.Process] = {}


# Progress hook helpers to reduce complexity of ytdlp_progress_hook
def _extract_video_metadata(d: dict[str, Any]) -> dict[str, Any]:
    """
    Extract video metadata from yt-dlp progress data.

    Parameters
    ----------
    d : Dict[str, Any]
        Progress data dictionary from yt-dlp hook.

    Returns
    -------
    Dict[str, Any]
        Dictionary containing video metadata.
    """
    metadata: dict[str, Any] = {}

    # Extract id
    if "id" in d:
        metadata["id"] = d["id"]

    # Extract title
    if "title" in d:
        metadata["title"] = d["title"]
    elif "filename" in d:
        # Fallback to filename without extension
        filename = Path(d["filename"]).stem
        metadata["title"] = filename

    # Extract duration
    if "duration" in d:
        metadata["duration"] = d["duration"]
    elif "duration_string" in d:
        metadata["duration_string"] = d["duration_string"]

    # Set default for duration if missing
    if "duration" not in metadata:
        metadata["duration"] = 0

    # Extract filesize
    if "filesize" in d:
        metadata["filesize"] = d["filesize"]

    # Set default for filesize if missing
    if "filesize" not in metadata:
        metadata["filesize"] = 0

    # Extract format
    if "format" in d:
        metadata["format"] = d["format"]

    # Set default for format if missing
    if "format" not in metadata:
        metadata["format"] = "Unknown"

    # Extract resolution
    if "resolution" in d:
        metadata["resolution"] = d["resolution"]

    # Set default for resolution if missing
    if "resolution" not in metadata:
        metadata["resolution"] = "Unknown"

    # Extract other useful metadata
    if "uploader" in d:
        metadata["uploader"] = d["uploader"]
    if "upload_date" in d:
        metadata["upload_date"] = d["upload_date"]
    if "view_count" in d:
        metadata["view_count"] = d["view_count"]
    if "like_count" in d:
        metadata["like_count"] = d["like_count"]
    if "webpage_url" in d:
        metadata["webpage_url"] = d["webpage_url"]

    # Set default for uploader if missing
    if "uploader" not in metadata:
        metadata["uploader"] = "Unknown"

    return metadata


def _calculate_eta_from_speeds(speed_values: list[int], remaining_bytes: int) -> str:
    """Calculate ETA from speed values."""
    if not speed_values:
        return ""

    # Use median speed for more stable ETA
    speed_values.sort()
    median_speed: int = speed_values[len(speed_values) // 2]

    if median_speed <= 0:
        return ""

    eta_seconds = remaining_bytes / median_speed
    return _format_duration(eta_seconds)


def _calculate_improved_eta(speeds: list[str], downloaded: str, total: str) -> str:
    """
    Calculate improved ETA using historical speed data.

    Parameters
    ----------
    speeds : List[str]
        List of historical speed measurements.
    downloaded : str
        Current downloaded bytes as string.
    total : str
        Total bytes as string.

    Returns
    -------
    str
        Improved ETA calculation.
    """
    # Early validation
    if not speeds or not downloaded or not total:
        return ""

    try:
        # Parse downloaded and total bytes
        downloaded_bytes = parse_bytes(downloaded)
        total_bytes = parse_bytes(total)

        if downloaded_bytes is None or total_bytes is None:
            return ""

        remaining_bytes = total_bytes - downloaded_bytes
        if remaining_bytes <= 0:
            return "0s"

        # Calculate average speed from recent measurements (last 10)
        recent_speeds = speeds[-10:] if len(speeds) > 10 else speeds
        speed_values: list[int] = []

        for speed_str in recent_speeds:
            clean_speed = speed_str.strip().split("/")[0]
            speed_bytes = parse_bytes(clean_speed)
            if speed_bytes is not None:
                speed_values.append(speed_bytes)

        if len(speed_values) < 2:
            return "Unknown"

        return _calculate_eta_from_speeds(speed_values, remaining_bytes)

    except Exception:
        return ""


def parse_bytes(bytes_str: str) -> int | None:
    """
    Parse bytes string (e.g., "1.5MiB", "2.3GB") to integer bytes.

    Parameters
    ----------
    bytes_str : str
        Bytes string to parse.

    Returns
    -------
    Optional[int]
        Number of bytes or None if parsing failed.
    """
    if not bytes_str:
        return None

    try:
        # Remove common suffixes and convert to float
        clean_str = bytes_str.strip().upper()

        # Handle different byte units
        multipliers = {
            "B": 1,
            "KB": 1024,
            "KIB": 1024,
            "MB": 1024**2,
            "MIB": 1024**2,
            "GB": 1024**3,
            "GIB": 1024**3,
            "TB": 1024**4,
            "TIB": 1024**4,
        }

        # Sort suffixes by length descending to avoid matching 'B' before 'MIB'
        for suffix, multiplier in sorted(multipliers.items(), key=lambda x: -len(x[0])):
            if clean_str.endswith(suffix):
                number_str = clean_str[: -len(suffix)]
                return int(float(number_str) * multiplier)

        # Try parsing as plain number
        return int(float(clean_str))

    except (ValueError, AttributeError):
        return None


def _format_duration(seconds: float) -> str:
    """
    Format duration in seconds to human-readable string.

    Parameters
    ----------
    seconds : float
        Duration in seconds.

    Returns
    -------
    str
        Formatted duration string.
    """
    if seconds < 60:
        return f"{int(seconds)}s"
    if seconds < 3600:
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes}m{secs}s"
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    return f"{hours}h{minutes}m"


def _progress_downloading(d: dict[str, Any], download_id: str | None) -> None:
    """Handle 'downloading' status updates from yt-dlp."""
    str_id = str(download_id) if download_id else "unknown_id"
    percent = str(d.get("_percent_str", "")).strip()
    downloaded = d.get("_downloaded_bytes_str")
    total = d.get("_total_bytes_estimate_str")
    speed = str(d.get("_speed_str", "")).strip()
    eta = str(d.get("_eta_str", "")).strip()

    # Extract video metadata
    metadata = _extract_video_metadata(d)

    parts = [f"Download {str_id} progress:"]
    if percent:
        parts.append(percent)
    if downloaded and total:
        parts.append(f"({downloaded}/{total})")
    if speed:
        parts.append(f"at {speed}")
    if eta:
        parts.append(f"ETA {eta}")
    logger.debug(" ".join(parts))

    # Update detailed progress, historical speeds, and full progress history
    with progress_lock:
        old = progress_data.get(str_id, {})

        # Accumulate speeds
        speeds = old.get("speeds", [])
        if speed:
            speeds.append(speed)

        # Calculate improved ETA using historical data
        improved_eta = _calculate_improved_eta(
            speeds, str(downloaded) if downloaded else "", str(total) if total else ""
        )

        # Accumulate history snapshots
        history = old.get("history", [])
        snapshot = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "percent": percent,
            "downloaded": downloaded,
            "total": total,
            "speed": speed,
            "eta": eta,
            "improved_eta": improved_eta,
        }
        history.append(snapshot)

        # Update entry with enhanced data
        progress_data[str_id] = {
            "status": "downloading",
            "percent": percent,
            "downloaded": downloaded,
            "total": total,
            "speed": speed,
            "eta": eta,
            "improved_eta": improved_eta,
            "speeds": speeds,
            "history": history,
            # Add video metadata
            "metadata": metadata,
            # Add download start time if not present
            "start_time": old.get("start_time", datetime.now(timezone.utc).isoformat()),
            # Add current timestamp
            "last_update": datetime.now(timezone.utc).isoformat(),
        }


def _progress_finished(d: dict[str, Any], download_id: str | None) -> None:
    """Handle 'finished' status updates from yt-dlp."""
    str_id = str(download_id) if download_id else "unknown_id"
    filename = d.get("filename")
    # Append history entry from info JSON if available
    if filename:
        info_json_path = f"{filename}.info.json"
        try:
            with Path(info_json_path).open(encoding="utf-8") as f:
                info_data = json.load(f)

            append_history_entry(info_data)
            logger.info(f"[{str_id}] Appended download metadata to history: {info_json_path}")
        except Exception as e:
            logger.warning(f"[{str_id}] Failed to append history entry from {info_json_path}: {e}")
    if filename:
        # Log completion with explicit 'reported as FINISHED' for consistency
        logger.info(f"Download {str_id} reported as FINISHED: '{filename}'")
    else:
        logger.warning(f"Download {str_id} finished with no filename provided")


def _progress_error(d: dict[str, Any], download_id: str | None) -> None:
    """Handle 'error' status updates from yt-dlp."""
    str_id = str(download_id) if download_id else "unknown_id"
    error_msg = str(d.get("error", "Unknown error from hook"))
    detailed = str(d.get("fragment_error") or d.get("message") or error_msg)

    # Enhanced error classification
    err_type = "HOOK_ERROR"
    troubleshooting = "Check your internet connection and try again."

    if "Unsupported URL" in detailed:
        err_type = "HOOK_UNSUPPORTED_URL"
        troubleshooting = "This URL format is not supported. Try a different video source."
    elif "video unavailable" in detailed.lower():
        err_type = "HOOK_VIDEO_UNAVAILABLE"
        troubleshooting = "This video is no longer available or has been removed."
    elif "private" in detailed.lower():
        err_type = "HOOK_PRIVATE_VIDEO"
        troubleshooting = "This video is private and requires authentication."
    elif "age restricted" in detailed.lower():
        err_type = "HOOK_AGE_RESTRICTED"
        troubleshooting = "This video has age restrictions and cannot be downloaded."
    elif "copyright" in detailed.lower():
        err_type = "HOOK_COPYRIGHT_ISSUE"
        troubleshooting = "This video has copyright restrictions."
    elif "network" in detailed.lower() or "connection" in detailed.lower():
        err_type = "HOOK_NETWORK_ERROR"
        troubleshooting = "Network connection issue. Check your internet connection."
    elif "quota" in detailed.lower() or "limit" in detailed.lower():
        err_type = "HOOK_QUOTA_EXCEEDED"
        troubleshooting = "Download quota exceeded. Try again later."

    logger.error(f"Error during download for {str_id} (hook): {err_type} - {detailed}")

    # Enhanced error data structure
    if str_id not in download_errors_from_hooks:
        download_errors_from_hooks[str_id] = {
            "original_message": detailed,
            "parsed_type": err_type,
            "source": "hook",
            "details": d,
            "troubleshooting": troubleshooting,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "download_id": str_id,
        }


def ytdlp_progress_hook(d: dict[str, Any], download_id: str | None) -> None:
    """
    Process progress updates from yt-dlp.

    Log download status updates and capture errors reported by the yt-dlp hook.

    Parameters
    ----------
    d : Dict[str, Any]
        Progress data dictionary from yt-dlp hook.
    download_id : Optional[str]
        Identifier for the current download.

    Returns
    -------
    None
        This hook does not return a value.
    """
    status: str | None = d.get("status")
    if status == "downloading":
        _progress_downloading(d, download_id)
    elif status == "finished":
        _progress_finished(d, download_id)
    elif status == "error":
        _progress_error(d, download_id)


# Added helper to initialize download request data and prepare directory
def _init_download(data: dict[str, Any]) -> tuple[Path | None, str, str, str, bool, tuple[Any, int] | None]:
    """
    Validate request data and prepare download directory or return error response tuple.

    Returns:
        Tuple of (download_path, url, download_id, page_title, download_playlist_flag, error_tuple).
        error_tuple is (response, status) if error occurred, otherwise None.
    """
    url = data.get("url", "").strip()
    download_id = data.get("downloadId", "N/A")
    page_title = data.get("page_title", "video")
    download_playlist = bool(data.get("download_playlist", False))
    if not url:
        return (
            None,
            url,
            download_id,
            page_title,
            download_playlist,
            (
                jsonify(
                    {
                        "status": "error",
                        "message": "No URL provided",
                        "error_type": "MISSING_URL",
                        "downloadId": download_id,
                    }
                ),
                400,
            ),
        )
    try:
        config = Config.load()
        download_dir_val = config.get_value("download_dir")
        if not download_dir_val:
            return (
                None,
                url,
                download_id,
                page_title,
                download_playlist,
                (
                    jsonify(
                        {
                            "status": "error",
                            "message": "Download directory not configured on server.",
                            "error_type": "SERVER_CONFIG_ERROR_NO_DOWNLOAD_DIR",
                            "downloadId": download_id,
                        }
                    ),
                    500,
                ),
            )
        download_path = Path(download_dir_val)
        download_path.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        # Use download_dir_val if available, otherwise use a placeholder
        download_dir_display = download_dir_val if "download_dir_val" in locals() else "unknown"
        return (
            None,
            url,
            download_id,
            page_title,
            download_playlist,
            (
                jsonify(
                    {
                        "status": "error",
                        "message": f"Server error with download directory '{download_dir_display}': {e}",
                        "error_type": "SERVER_CONFIG_DOWNLOAD_DIR_ERROR",
                        "original_error": str(e),
                        "downloadId": download_id,
                    }
                ),
                500,
            ),
        )
    return download_path, url, download_id, page_title, download_playlist, None


# Helper to prepare file naming metadata and output template
def _prepare_download_metadata(
    url: str, page_title: str, download_id: str, download_path: Path
) -> tuple[str, str, str, str]:
    """
    Sanitize page title and URL to generate a safe filename, id component, prefix, and output template.

    Returns:
        safe_title: sanitized page title
        sanitized_id: sanitized URL path segment or download_id fallback
        prefix: combined safe_title and sanitized_id for tmp files
        output_template: full output path template for yt-dlp
    """
    # Sanitize title
    logger.info(f"[{download_id}] Received page_title for sanitization: '{page_title}'")
    safe_title = sanitize_filename(str(page_title) if page_title else "default_video_title")
    logger.info(f"[{download_id}] Sanitized title for output template: '{safe_title}'")
    # Extract unique ID from URL path
    parsed = urlparse(url)
    path_seg = parsed.path.rstrip("/").rsplit("/", 1)[-1]
    id_component = path_seg or download_id
    sanitized_id = sanitize_filename(id_component) or sanitize_filename(str(download_id)) or "unique_id"
    # Register prefix for partial file cleanup
    prefix = f"{safe_title}_{sanitized_id}"
    download_tempfile_registry[str(download_id)] = prefix
    # Clear any pre-existing hook error for this id
    if id_component in download_errors_from_hooks:
        del download_errors_from_hooks[id_component]
        logger.debug(f"[{id_component}] Cleared pre-existing hook error for this id.")
    # Build output template path
    output_template = str(download_path / f"{safe_title}_{sanitized_id}.%(ext)s")
    logger.info(
        f"[{download_id}] Output template set to: '{output_template}' "
        + f"(title: '{safe_title}', id_comp: '{sanitized_id}')"
    )
    return safe_title, sanitized_id, prefix, output_template


# Helper to assert playlist downloads are allowed by config
def _assert_playlist_allowed(download_id: str, download_playlist: bool) -> tuple[Any, int] | None:
    """
    Check server config for playlist permissions and return an error response if disallowed.
    """
    if download_playlist:
        config = Config.load()
        allow_playlists = config.get_value("allow_playlists", False)
        if not allow_playlists:
            logger.warning(f"[{download_id}] Playlist download denied: Playlists not allowed in server config")
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
        logger.info(f"[{download_id}] Playlist download requested and allowed by config")
    else:
        logger.debug(f"[{download_id}] Single video download (not a playlist)")
    return None


# Mapping of error substrings to error types and user-friendly messages
_YTDLP_ERROR_MESSAGE_MAPPINGS = [
    (
        ["is not a valid URL", "Unsupported URL"],
        "YT_DLP_UNSUPPORTED_URL",
        "The provided URL is not supported or is invalid. Please check the URL and try again.",
    ),
    (
        ["video unavailable"],
        "YT_DLP_VIDEO_UNAVAILABLE",
        "This video is unavailable. It may have been removed or set to private.",
    ),
    (
        ["private video"],
        "YT_DLP_PRIVATE_VIDEO",
        "This video is private and cannot be downloaded.",
    ),
    (
        ["geo restricted", "georestricted", "not available in your country"],
        "YT_DLP_GEO_RESTRICTED",
        "This video is not available in your country or region.",
    ),
    (
        ["Video is protected by DRM", "DRM protection"],
        "YT_DLP_DRM_PROTECTED",
        "This video is protected by DRM and cannot be downloaded.",
    ),
    (
        ["No space left on device"],
        "SYSTEM_DISK_FULL",
        "There is no space left on the server's disk to save the video.",
    ),
    (
        ["HTTP Error 400", "Bad Request"],
        "YT_DLP_HTTP_400_BAD_REQUEST",
        (
            "The server received a bad request from yt-dlp. This might be due to an issue with the URL "
            "or site compatibility."
        ),
    ),
    (
        ["HTTP Error 401", "Unauthorized"],
        "YT_DLP_HTTP_401_UNAUTHORIZED",
        "Access to this video is unauthorized. It may require login or subscription.",
    ),
    (
        ["HTTP Error 403", "Forbidden"],
        "YT_DLP_HTTP_403_FORBIDDEN",
        "Access to this video is forbidden. The server may be blocking requests.",
    ),
    (
        ["HTTP Error 404", "Not Found"],
        "YT_DLP_HTTP_404_NOT_FOUND",
        "The requested video or resource was not found (Error 404).",
    ),
    (
        ["HTTP Error 429", "Too Many Requests"],
        "YT_DLP_HTTP_429_TOO_MANY_REQUESTS",
        "The server is receiving too many requests. Please try again later.",
    ),
    (
        ["HTTP Error 500", "Internal Server Error"],
        "YT_DLP_HTTP_500_REMOTE_SERVER_ERROR",
        "The video site's server encountered an internal error. Please try again later.",
    ),
    (
        ["HTTP Error 503", "Service Unavailable"],
        "YT_DLP_HTTP_503_SERVICE_UNAVAILABLE",
        "The video site's server is temporarily unavailable. Please try again later.",
    ),
    (
        ["connection timed out", "timeout"],
        "YT_DLP_CONNECTION_TIMEOUT",
        "The connection to the video server timed out. Please check your internet connection or try again later.",
    ),
    (
        ["resolve host name", "name or service not known"],
        "YT_DLP_DNS_ERROR",
        "Could not resolve the video server's address. Please check the URL or your network settings.",
    ),
]


def _cleanup_partial_files(prefix: str, download_path: Path, download_id: str) -> None:
    """Remove partial .part files for the given download prefix."""
    try:
        pattern = f"{prefix}.*.part"
        for pf in download_path.glob(pattern):
            pf.unlink()
            logger.debug(f"Removed partial file {pf} for aborted download {download_id}")
    except Exception as cleanup_err:
        logger.warning(f"[{download_id}] Failed to clean partial files: {cleanup_err}")


def map_error_message(error_message: str) -> tuple[str, str]:
    """
    Map a raw error message to a structured error_type and user-friendly message.

    Returns a tuple of (error_type, user_message).
    """
    lower_msg = error_message.lower()
    for substrings, type_code, user_msg in _YTDLP_ERROR_MESSAGE_MAPPINGS:
        for sub in substrings:
            if sub.lower() in lower_msg:
                return type_code, user_msg
    # Default fallback
    return "YT_DLP_UNKNOWN_ERROR", f"A download error occurred: {error_message}. Contact support if this persists."


def _handle_yt_dlp_download_error(
    download_id: str,
    url: str,
    prefix: str,
    download_path: Path,
    sanitized_id: str,
    exception: Exception,
) -> tuple[Any, int]:
    """
    Cleanup partial files and map yt-dlp DownloadError into a Flask JSON response.
    """
    # Cleanup partial files
    _cleanup_partial_files(prefix, download_path, download_id)

    # Prepare error messages
    exc_message = str(exception)
    hook_details = download_errors_from_hooks.get(sanitized_id)
    if hook_details:
        # Use hook-provided error details
        error_type = hook_details.get("parsed_type", "YT_DLP_HOOK_ERROR")
        user_msg = f"Download failed: {hook_details['original_message']}"
        client_error = hook_details["original_message"]
        logger.info(f"[{download_id}] Using error details from progress hook: {error_type} - {client_error}")
    else:
        # Map common errors
        error_type, user_msg = map_error_message(exc_message)
        client_error = exc_message

    logger.error(f"[{download_id}] yt-dlp download error for URL {url}: Type='{error_type}', Message='{client_error}'")
    return (
        jsonify(
            {
                "status": "error",
                "message": user_msg,
                "error_type": error_type,
                "original_error": client_error,
                "downloadId": download_id,
            }
        ),
        500,
    )


def handle_ytdlp_download(data: dict[str, Any]) -> Any:
    """
    Handle video download requests using yt-dlp.

    Validate input, prepare download directory and output template, build options,
    invoke yt-dlp download, track the process, handle errors and cleanup, and return
    a Flask JSON response.

    Parameters
    ----------
    data : Dict[str, Any]
        Dictionary containing 'url', 'downloadId', optional 'page_title', and playlist flag.

    Returns
    -------
    Any
        Flask JSON response tuple (response, status code) indicating the result.
    """
    # Validate request and prepare download directory
    download_path, url, download_id, page_title, download_playlist_val, init_error = _init_download(data)
    if init_error:
        return init_error

    # At this point, download_path cannot be None since init_error would be set
    assert download_path is not None

    # Prepare metadata and output template
    _, sanitized_id_component, prefix, output_template = _prepare_download_metadata(
        url,
        page_title,
        download_id,
        download_path,
    )

    # Assert playlist permission
    playlist_error = _assert_playlist_allowed(download_id, download_playlist_val)
    if playlist_error:
        return playlist_error

    ydl_opts = build_opts(
        output_template,
        download_id,
        download_playlist_val,  # Pass original download_id to build_opts for hook
    )

    logger.info(f"[{download_id}] Attempting to download URL: {url}")
    logger.debug(f"[{download_id}] yt-dlp options: {ydl_opts}")

    try:
        # Prepare process tracking variable
        current_process: psutil.Process | None = None
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:  # type: ignore[import-untyped]
            # Register the download process if the tracking is available
            if _process_tracking_available:
                current_process = psutil.Process()
                logger.debug(f"[{download_id}] Registering download process PID {current_process.pid}")
                register_download_process(current_process)
                # Keep map of download ID to process
                download_process_registry[str(download_id)] = current_process

            try:
                # Perform the download
                ydl.download([url])
            finally:
                # Always unregister the process when done, even if there's an exception
                if _process_tracking_available and current_process is not None:
                    logger.debug(f"[{download_id}] Unregistering download process")
                    unregister_download_process(current_process)

        logger.info(f"[{download_id}] Download process completed for URL: {url}")
        return (
            jsonify(
                {
                    "status": "success",
                    "message": "Download initiated successfully and reported as complete by yt-dlp.",
                    "downloadId": download_id,
                }
            ),
            200,
        )
    except yt_dlp.utils.DownloadError as e:  # type: ignore[import-untyped]
        return _handle_yt_dlp_download_error(
            download_id,
            url,
            prefix,
            download_path,
            sanitized_id_component,
            e,
        )
    except Exception as e:
        logger.error(
            f"[{download_id}] Unexpected server error during download for URL {url}: {e}",
            exc_info=True,
        )
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"An unexpected server error occurred: {e!s}",
                    "error_type": "UNEXPECTED_SERVER_ERROR",
                    "original_error": str(e),
                    "downloadId": download_id,
                }
            ),
            500,
        )
