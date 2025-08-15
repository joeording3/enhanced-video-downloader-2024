"""
Provide yt-dlp download handling functionality.

This module defines functions to configure and execute video downloads using
yt-dlp, including option building, progress hooks, process tracking, and error cleanup.
"""

import json
import logging
import tempfile
import threading
import time
from contextlib import suppress
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Protocol, cast, runtime_checkable
from urllib.parse import urlparse

import browser_cookie3  # type: ignore[import-untyped]
import psutil  # Added for type annotations
import yt_dlp
from flask import jsonify
from yt_dlp.utils import sanitize_filename

from server.config import Config
from server.downloads import progress_data, progress_lock, unified_download_manager
from server.history import append_history_entry

# Get a logger instance
logger = logging.getLogger(__name__)


class _DownloadControl:
    """Lightweight in-process controller used for cancel/pause endpoints.

    Provides a psutil.Process-like surface for the specific methods used by the
    API routes: terminate, wait, kill, suspend, resume, nice.
    """

    def __init__(self, downloadId: str) -> None:
        self.downloadId = str(downloadId)
        self._paused = False

    def terminate(self) -> None:
        cancellation_requests.add(self.downloadId)

    def wait(self, timeout: int | None = None) -> None:  # noqa: ARG002
        return

    def kill(self) -> None:
        cancellation_requests.add(self.downloadId)

    def suspend(self) -> None:
        self._paused = True
        paused_requests.add(self.downloadId)

    def resume(self) -> None:
        self._paused = False
        paused_requests.discard(self.downloadId)

    def nice(self, _priority: int) -> None:
        # No-op priority setter for compatibility
        return


# Helper functions to simplify build_opts and reduce its complexity
def _default_ydl_opts(output_path: str, download_playlist: bool) -> dict[str, Any]:
    return {
        "format": "bestvideo+bestaudio/best",
        "merge_output_format": "mp4",
        "outtmpl": output_path,
        "writeinfojson": True,
        "continuedl": True,
        # Retry entire requests a few times for transient network hiccups
        "retries": 3,
        "fragment_retries": 10,
        "ignoreerrors": False,
        # Default concurrency; can be overridden via config/env
        "concurrent_fragments": 4,
        "logger": logging.getLogger("yt_dlp_native"),
        "noplaylist": not download_playlist,
        "yesplaylist": download_playlist,
        # Prefer session cookies directly from the user's browser (yt-dlp's official option)
        # Use list/tuple form to satisfy yt-dlp's browser spec parser
        "cookiesfrombrowser": ["chrome"],
    }


@runtime_checkable
class _HasModelDump(Protocol):
    def model_dump(self, *, mode: str = "json") -> dict[str, Any]: ...


def _apply_custom_opts(ydl_opts: dict[str, Any], custom_opts: Any, _downloadId: str | None) -> None:
    """Merge custom yt-dlp options into ydl_opts, tolerating various input shapes.

    Accepts:
    - Pydantic model instances (uses model_dump)
    - JSON strings representing an object
    - Plain dictionaries
    Silently ignores unsupported types while keeping safe defaults.
    """
    # Normalize to a plain dict when possible
    try:
        if isinstance(custom_opts, _HasModelDump):
            custom_opts = custom_opts.model_dump(mode="json")
    except Exception as e:
        logger.debug("Failed to model_dump yt_dlp_options; using provided value as-is: %s", e)

    if isinstance(custom_opts, str):
        try:
            parsed = json.loads(custom_opts)
            if isinstance(parsed, dict):
                custom_opts = parsed
        except Exception as e:
            logger.debug("yt_dlp_options string was not valid JSON: %s", e)

    if isinstance(custom_opts, dict):
        # Apply config options, but block only a few keys; allow 'format' to override defaults
        blocked = {"outtmpl", "progress_hooks", "logger", "noplaylist", "yesplaylist"}
        for key, value in custom_opts.items():
            if key in blocked:
                continue
            ydl_opts[key] = value
        logger.debug(f"Applied custom yt-dlp options from config: {custom_opts}")
    else:
        logger.warning(
            "Config yt_dlp_options is not a dictionary, using defaults only (type=%s)",
            type(custom_opts).__name__,
        )


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


def _assign_progress_hook(ydl_opts: dict[str, Any], downloadId: str) -> None:
    def progress_hook_wrapper(d: dict[str, Any]) -> None:
        # Fast-path cancellation: raise a controlled error to stop yt-dlp
        if str(downloadId) in cancellation_requests:
            # Clear request so repeated hooks don't raise again
            cancellation_requests.discard(str(downloadId))
            from yt_dlp.utils import DownloadError as _HookCancel

            raise _HookCancel("Cancelled by user")
        # Lightweight pause: skip updating progress; yt-dlp will continue internal loop
        if str(downloadId) in paused_requests:
            return None
        return ytdlp_progress_hook(d, downloadId)

    ydl_opts["progress_hooks"] = [progress_hook_wrapper]


def _handle_cookies(ydl_opts: dict[str, Any], downloadId: str | None) -> None:
    # When cookiesfrombrowser is set, let yt-dlp handle cookie extraction natively
    if ydl_opts.get("cookiesfrombrowser"):
        return
    # Otherwise, only attempt to provide a cookiefile if we can safely serialize
    try:
        cj = browser_cookie3.chrome(domain_name="youtube.com")
        try:
            save_method = cast(Any, getattr(cj, "save", None))
        except Exception:
            save_method = None
        if callable(save_method):
            with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tmp_file:
                save_method(tmp_file.name)
                ydl_opts["cookiefile"] = tmp_file.name
            logger.debug(f"[{downloadId}] Using cookie file: {tmp_file.name}")
    except Exception as e:
        logger.warning(f"[{downloadId}] Could not extract browser cookies: {e}")


def build_opts(output_path: str, downloadId: str | None = None, download_playlist: bool = False) -> dict[str, Any]:
    """
    Build options dictionary for yt-dlp.

    Parameters
    ----------
    output_path : str
        Path where the downloaded file should be saved.
    downloadId : Optional[str], optional
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
    # Ensure we always get a plain dict of options; fall back if method not available
    try:
        ytdlp_config_options = config.get_download_options()
    except AttributeError:
        # Older/alternate Config stubs in tests may not implement this helper
        ytdlp_config_options: Any = {}
        # Fallback 1: dedicated getter by key
        try:
            ytdlp_config_options = config.get_value("yt_dlp_options", {})
        except Exception:
            ytdlp_config_options = {}
        # Fallback 2: attribute on config
        if not isinstance(ytdlp_config_options, dict):
            ytdlp_config_options = getattr(config, "yt_dlp_options", {})
        if isinstance(ytdlp_config_options, _HasModelDump):
            ytdlp_config_options = ytdlp_config_options.model_dump(mode="json")
        if not isinstance(ytdlp_config_options, dict):
            ytdlp_config_options = {}

    # Start with default options
    ydl_opts: dict[str, Any] = _default_ydl_opts(output_path, download_playlist)

    # Override with config options if present (including 'format')
    _apply_custom_opts(ydl_opts, ytdlp_config_options, downloadId)

    # Ensure only one of noplaylist or yesplaylist is present based on download_playlist
    _apply_playlist_flags(ydl_opts, download_playlist)

    # Only add progress hook if downloadId is provided
    if downloadId is not None:
        _assign_progress_hook(ydl_opts, downloadId)

    # Handle cookies_from_browser: extract browser cookies to a temp file
    _handle_cookies(ydl_opts, downloadId)

    return ydl_opts


# Global or class-level dictionary to store detailed errors from hooks
# This is a simple way; a more robust solution might involve a class or context manager
download_errors_from_hooks: dict[str, dict[str, Any]] = {}
# Registry mapping download IDs to partial-file prefixes for cleanup
download_tempfile_registry: dict[str, str] = {}

# Process registry with automatic cleanup for single worker


class ProcessRegistry:
    """Managed registry for download processes with automatic cleanup."""

    def __init__(self):
        """Initialize the process registry with cleanup thread."""
        self._processes: dict[str, Any] = {}
        self._lock = threading.RLock()
        self._stop_event = threading.Event()
        self._cleanup_thread = threading.Thread(
            target=self._cleanup_loop,
            name="evd-process-cleanup",
            daemon=True
        )
        self._cleanup_thread.start()
        self._cleanup_count = 0
        self._start_time = time.time()

    def register(self, downloadId: str, process: Any):
        """Register a new download process."""
        with self._lock:
            self._processes[downloadId] = {
                "process": process,
                "start_time": time.time(),
                "last_heartbeat": time.time()
            }

    def unregister(self, downloadId: str):
        """Unregister a download process."""
        with self._lock:
            self._processes.pop(downloadId, None)

    def clear(self):
        """Clear all registered processes."""
        with self._lock:
            self._processes.clear()

    def get(self, downloadId: str) -> Any:
        """Get a process by download ID."""
        with self._lock:
            return self._processes.get(downloadId, {}).get("process")

    def __len__(self) -> int:
        """Return the number of registered processes."""
        with self._lock:
            return len(self._processes)

    def __contains__(self, downloadId: str) -> bool:
        """Check if a download ID is registered."""
        with self._lock:
            return downloadId in self._processes

    def get_health_metrics(self) -> dict[str, Any]:
        """Get health metrics for single worker monitoring."""
        with self._lock:
            total_processes = len(self._processes)
            active_processes = sum(
                1 for info in self._processes.values()
                if hasattr(info["process"], "is_running") and info["process"].is_running()
            )
            stuck_processes = sum(
                1 for info in self._processes.values()
                if time.time() - info["last_heartbeat"] > 300
            )

            # Calculate memory usage if possible
            memory_usage = 0
            for info in self._processes.values():
                process = info["process"]
                if hasattr(process, "memory_info"):
                    try:
                        memory_usage += process.memory_info().rss
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass

            return {
                "total_processes": total_processes,
                "active_processes": active_processes,
                "stuck_processes": stuck_processes,
                "cleanup_rate": self._cleanup_count / max(time.time() - self._start_time, 1),
                "memory_usage_mb": memory_usage / 1024 / 1024
            }

    def stop(self):
        """Stop the cleanup thread."""
        self._stop_event.set()
        self._cleanup_thread.join(timeout=5.0)

    def _cleanup_loop(self):
        """Simplified cleanup for single worker - more aggressive."""
        while not self._stop_event.is_set():
            with self._lock:
                current_time = time.time()
                to_remove = []

                for did, info in self._processes.items():
                    process = info["process"]

                    # More aggressive cleanup for single worker
                    if hasattr(process, "is_running"):
                        if (not process.is_running() or
                            current_time - info["start_time"] > 600 or
                            current_time - info["last_heartbeat"] > 300):
                            to_remove.append(did)
                        else:
                            # Update heartbeat
                            info["last_heartbeat"] = current_time
                    # Fallback for non-psutil objects
                    elif current_time - info["start_time"] > 600:  # 10 minutes
                        to_remove.append(did)

                for did in to_remove:
                    self._processes.pop(did, None)
                    self._cleanup_count += 1

            time.sleep(60)  # Check every minute (less frequent for single worker)


# Registry mapping download IDs to their download process for cancellation
download_process_registry = ProcessRegistry()

# Track which download IDs have had history appended to avoid duplication across
# finished hook and post-download fallback
history_appended_ids: set[str] = set()

# Shared cancellation and pause flags inspected by the progress hook
cancellation_requests: set[str] = set()
paused_requests: set[str] = set()


def _try_extract_title_with_ytdlp(url: str, downloadId: str | None) -> str | None:
    """Attempt to extract a reliable title using yt-dlp metadata extraction.

    This performs a metadata-only extraction (no download).

    Parameters
    ----------
    url : str
        Media URL to probe.
    downloadId : str | None
        Optional download identifier for logging context.

    Returns
    -------
    str | None
        Extracted title string, or None if extraction fails.
    """
    try:
        opts: dict[str, Any] = {
            "quiet": True,
            "no_warnings": True,
            "noplaylist": True,
            "skip_download": True,
            # Reuse native logger to keep output consolidated
            "logger": logging.getLogger("yt_dlp_native"),
            # Prefer browser cookies for YouTube edge cases (e.g., Shorts)
            # Use the correct key and list/tuple form per yt-dlp Python API
            "cookiesfrombrowser": ["chrome"],
        }
        with yt_dlp.YoutubeDL(opts) as ydl:  # type: ignore[import-untyped]
            info = ydl.extract_info(url, download=False)
        title = None
        if isinstance(info, dict):
            title = info.get("title") or info.get("fulltitle")
        if title and isinstance(title, str) and title.strip():
            logger.debug(f"[{downloadId or 'N/A'}] Title extracted via yt-dlp: {title}")
            return title.strip()
    except Exception as e:
        logger.debug(f"[{downloadId or 'N/A'}] yt-dlp metadata title extraction failed: {e}")
    return None


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


def _progress_downloading(d: dict[str, Any], downloadId: str | None) -> None:
    """Handle 'downloading' status updates from yt-dlp."""
    str_id = str(downloadId) if downloadId else "unknown_id"
    percent = str(d.get("_percent_str", "")).strip()
    downloaded = d.get("_downloaded_bytes_str")
    total = d.get("_total_bytes_str") or d.get("_total_bytes_estimate_str")
    speed = str(d.get("_speed_str", "")).strip()
    eta = str(d.get("_eta_str", "")).strip()

    # Fallbacks when formatted strings are missing: compute from numeric values
    try:
        if not percent:
            downloaded_bytes = cast(int | None, d.get("downloaded_bytes"))
            total_bytes = cast(int | None, d.get("total_bytes") or d.get("total_bytes_estimate"))
            if downloaded_bytes is not None and total_bytes and total_bytes > 0:
                pct = (downloaded_bytes / total_bytes) * 100.0
                percent = f"{pct:.1f}%"
        if not downloaded:
            downloaded_bytes = cast(int | None, d.get("downloaded_bytes"))
            if downloaded_bytes is not None:
                # Simple human format
                units = ["B", "KiB", "MiB", "GiB", "TiB"]
                size = float(downloaded_bytes)
                idx = 0
                while size >= 1024.0 and idx < len(units) - 1:
                    size /= 1024.0
                    idx += 1
                val = f"{size:.1f}".rstrip("0").rstrip(".")
                downloaded = f"{val}{units[idx]}"
        if not total:
            total_bytes = cast(int | None, d.get("total_bytes") or d.get("total_bytes_estimate"))
            if total_bytes is not None:
                units = ["B", "KiB", "MiB", "GiB", "TiB"]
                size = float(total_bytes)
                idx = 0
                while size >= 1024.0 and idx < len(units) - 1:
                    size /= 1024.0
                    idx += 1
                val = f"{size:.1f}".rstrip("0").rstrip(".")
                total = f"{val}{units[idx]}"
        if not speed:
            speed_bytes = cast(int | None, d.get("speed"))
            if speed_bytes is not None and speed_bytes > 0:
                units = ["B", "KiB", "MiB", "GiB", "TiB"]
                size = float(speed_bytes)
                idx = 0
                while size >= 1024.0 and idx < len(units) - 1:
                    size /= 1024.0
                    idx += 1
                val = f"{size:.1f}".rstrip("0").rstrip(".")
                speed = f"{val}{units[idx]}/s"
        if not eta:
            eta_val = cast(float | None, d.get("eta"))
            if isinstance(eta_val, int | float) and eta_val >= 0:
                eta = _format_duration(float(eta_val))
    except Exception:
        # Best-effort fallback computation
        pass

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
    old = unified_download_manager.get_download(str_id) or {}

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
    unified_download_manager.update_download(
        str_id,
        status="downloading",
        percent=percent,
        downloaded=downloaded,
        total=total,
        speed=speed,
        eta=eta,
        improved_eta=improved_eta,
        speeds=speeds,
        history=history,
        # Add video metadata
        metadata=metadata,
        # Add download start time if not present
        start_time=old.get("start_time", datetime.now(timezone.utc).isoformat()),
        # Add current timestamp
        last_update=datetime.now(timezone.utc).isoformat(),
    )


def _progress_finished(d: dict[str, Any], downloadId: str | None) -> None:
    """Handle 'finished' status updates from yt-dlp."""
    str_id = str(downloadId) if downloadId else "unknown_id"
    filename = d.get("filename")
    # Append history entry from info JSON if available
    if filename:
        # Try multiple likely sidecar names and fall back silently if none exist
        file_path = Path(str(filename))
        candidates: list[Path] = []
        try:
            candidates.append(Path(str(file_path) + ".info.json"))
            # Some setups write sidecar without extension in the base name
            candidates.append(file_path.with_suffix("").with_name(file_path.with_suffix("").name + ".info.json"))
            # Fallback: any matching sidecar nearby
            with suppress(Exception):
                candidates.extend(file_path.parent.glob(f"{file_path.stem}*.info.json"))
        except Exception:
            candidates = []

        for candidate in candidates:
            try:
                if not candidate.exists() or not candidate.is_file():
                    continue
                with candidate.open(encoding="utf-8") as f:
                    info_data = json.load(f)
                append_history_entry(info_data)
                logger.info(f"[{str_id}] Appended download metadata to history: {candidate}")
                with suppress(Exception):
                    candidate.unlink()
                with suppress(Exception):
                    history_appended_ids.add(str_id)
                break
            except FileNotFoundError:
                # Normal for some configurations; skip without warning
                continue
            except Exception as e:
                logger.warning(f"[{str_id}] Failed to append history entry from {candidate}: {e}")
    if filename:
        # Log completion with explicit 'reported as FINISHED' for consistency
        logger.info(f"Download {str_id} reported as FINISHED: '{filename}'")
        # Additional guard: detect zero-byte or tiny files and record a hint
        try:
            p = Path(filename)
            if p.exists():
                size = p.stat().st_size
                if size == 0:
                    logger.warning(f"[{str_id}] Finished file is zero bytes; downstream may classify this as an error.")
        except Exception:
            # best effort
            pass
    else:
        logger.warning(f"Download {str_id} finished with no filename provided")

    # Mark status as finished only if an entry already exists; avoid creating new entries in this hook.
    try:
        old = unified_download_manager.get_download(str_id)
        if not isinstance(old, dict) or not old:
            return
        history = old.get("history") or []
        if not history or str(history[-1].get("percent", "")).strip() != "100%":
            history.append(
                {
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "percent": "100%",
                    "downloaded": old.get("total") or old.get("downloaded") or None,
                    "total": old.get("total") or None,
                    "speed": old.get("speed") or "",
                    "eta": "0s",
                    "improved_eta": "",
                }
            )
        unified_download_manager.update_download(
            str_id,
            status="finished",
            history=history,
            last_update=datetime.now(timezone.utc).isoformat(),
        )
    except Exception:
        # Best-effort; do not break hook processing
        pass


def _progress_error(d: dict[str, Any], downloadId: str | None) -> None:
    """Handle 'error' status updates from yt-dlp."""
    str_id = str(downloadId) if downloadId else "unknown_id"
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
            "downloadId": str_id,
        }


def ytdlp_progress_hook(d: dict[str, Any], downloadId: str | None) -> None:
    """
    Process progress updates from yt-dlp.

    Log download status updates and capture errors reported by the yt-dlp hook.

    Parameters
    ----------
    d : Dict[str, Any]
        Progress data dictionary from yt-dlp hook.
    downloadId : Optional[str]
        Identifier for the current download.

    Returns
    -------
    None
        This hook does not return a value.
    """
    status: str | None = d.get("status")
    if status == "downloading":
        _progress_downloading(d, downloadId)
    elif status == "finished":
        _progress_finished(d, downloadId)
    elif status == "error":
        _progress_error(d, downloadId)


# Added helper to initialize download request data and prepare directory
def _init_download(data: dict[str, Any]) -> tuple[Path | None, str, str, str, bool, tuple[Any, int] | None]:
    """
    Validate request data and prepare download directory or return error response tuple.

    Returns
    -------
    tuple[Path | None, str, str, str, bool, tuple[Any, int] | None]
        (download_path, url, downloadId, page_title, download_playlist_flag, error_tuple).
        error_tuple is (response, status) if error occurred; otherwise None.
    """
    # Validate URL first - ensure it's not empty or None
    raw_url = data.get("url")
    if not raw_url or not isinstance(raw_url, str):
        return (
            None,
            "",
            str(data.get("downloadId") or "N/A"),
            "video",
            False,
            (
                jsonify(
                    {
                        "status": "error",
                        "message": "No URL provided or invalid URL format",
                        "error_type": "MISSING_URL",
                        "downloadId": data.get("downloadId") or "N/A",
                    }
                ),
                400,
            ),
        )

    url = raw_url.strip()
    if not url:
        return (
            None,
            "",
            str(data.get("downloadId") or "N/A"),
            "video",
            False,
            (
                jsonify(
                    {
                        "status": "error",
                        "message": "URL cannot be empty or whitespace only",
                        "error_type": "MISSING_URL",
                        "downloadId": data.get("downloadId") or "N/A",
                    }
                ),
                400,
            ),
        )

    # Accept both camelCase (client) and snake_case (validated) keys
    # Normalize id field from request data to camelCase
    if "download_id" in data and "downloadId" not in data:
        data["downloadId"] = str(data.get("download_id"))
        with suppress(Exception):
            del data["download_id"]
    downloadId = str(data.get("downloadId") or "N/A")
    # Prefer explicit page_title; otherwise try yt-dlp metadata; finally derive from URL
    raw_title = data.get("page_title")
    if isinstance(raw_title, str) and raw_title.strip():
        candidate = raw_title.strip()
        # Treat ultra-generic titles like 'video' as missing to derive a better default
        if candidate.lower() == "video":
            candidate = ""
        page_title = candidate or None  # fall through to extraction/derivation if emptied
    else:
        page_title = None

    if not page_title:
        extracted = _try_extract_title_with_ytdlp(url, downloadId)
        if extracted:
            page_title = extracted

    if not page_title:
        # Derive a readable default from the URL path or hostname instead of a generic 'video'
        try:
            parsed_for_title = urlparse(url)
            # Try last non-empty path segment
            segment = parsed_for_title.path.rstrip("/").rsplit("/", 1)[-1]
            fallback = segment or parsed_for_title.netloc or "video"
            page_title = fallback
        except Exception:
            page_title = "video"
    if not page_title:
        # As a final guard, ensure non-empty value
        try:
            parsed_for_title = urlparse(url)
            page_title = parsed_for_title.netloc or "video"
        except Exception:
            page_title = "video"
    download_playlist = bool(data.get("download_playlist", False))
    if not url:
        return (
            None,
            url,
            downloadId,
            page_title,
            download_playlist,
            (
                jsonify(
                    {
                        "status": "error",
                        "message": "No URL provided",
                        "error_type": "MISSING_URL",
                        "downloadId": downloadId,
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
                downloadId,
                page_title,
                download_playlist,
                (
                    jsonify(
                        {
                            "status": "error",
                            "message": "Download directory not configured on server.",
                            "error_type": "SERVER_CONFIG_ERROR_NO_DOWNLOAD_DIR",
                            "downloadId": downloadId,
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
            downloadId,
            page_title,
            download_playlist,
            (
                jsonify(
                    {
                        "status": "error",
                        "message": f"Server error with download directory '{download_dir_display}': {e}",
                        "error_type": "SERVER_CONFIG_DOWNLOAD_DIR_ERROR",
                        "original_error": str(e),
                        "downloadId": downloadId,
                    }
                ),
                500,
            ),
        )
    return download_path, url, downloadId, page_title, download_playlist, None


# Helper to prepare file naming metadata and output template
def _prepare_download_metadata(
    url: str, page_title: str, downloadId: str, download_path: Path
) -> tuple[str, str, str, str]:
    """
    Sanitize page title and URL to generate filename components and template.

    Parameters
    ----------
    url : str
        Source media URL.
    page_title : str
        Title used for naming the output file.
    downloadId : str
        Unique identifier for the download.
    download_path : Path
        Directory where output files are written.

    Returns
    -------
    tuple[str, str, str, str]
        safe_title, sanitized_id, prefix, output_template.
    """
    # Sanitize title
    logger.info(f"[{downloadId}] Received page_title for sanitization: '{page_title}'")
    safe_title_raw = sanitize_filename(str(page_title) if page_title else "default_video_title")
    # Some sites include a file extension in the visible title (e.g., "something.mp4").
    # Strip any trailing media extension to avoid doubled extensions in final filenames.

    def _strip_trailing_media_extension(name: str) -> str:
        lower_name = name.lower().strip()
        # Common video/audio extensions that could appear in titles or ids
        media_exts = (
            ".mp4",
            ".mkv",
            ".webm",
            ".mov",
            ".avi",
            ".flv",
            ".mp3",
            ".m4a",
            ".m4v",
            ".wav",
        )
        for ext in media_exts:
            if lower_name.endswith(ext):
                return name[: -len(ext)]
        return name

    safe_title = _strip_trailing_media_extension(safe_title_raw)
    logger.info(f"[{downloadId}] Sanitized title for output template: '{safe_title}'")
    # Derive a site label from the URL host and append if not already present in the title.
    # For compatibility with tests, only append host when the sanitized title equals the fallback 'video'.
    parsed = urlparse(url)
    host = parsed.netloc.replace("www.", "").strip()
    title_lower = safe_title.lower()
    safe_title_with_site = f"{safe_title} - {host}" if host and title_lower == "video" else safe_title
    # Extract unique ID from URL path (kept for logging/diagnostics and rare fallback naming)
    path_seg = parsed.path.rstrip("/").rsplit("/", 1)[-1]
    id_component = path_seg or downloadId
    # Many sites use a path segment that already ends with a file extension (e.g., ".../6733e433a219a.mp4").
    # Strip a trailing media extension before sanitization so we don't produce names like "..._id.mp4.mp4".
    id_component = _strip_trailing_media_extension(id_component)
    sanitized_id = sanitize_filename(id_component) or sanitize_filename(str(downloadId)) or "unique_id"
    # Register prefix for partial file cleanup (use human-readable title + sanitized id)
    prefix = f"{safe_title_with_site}_{sanitized_id}"
    download_tempfile_registry[str(downloadId)] = prefix
    # Clear any pre-existing hook error for this id
    if id_component in download_errors_from_hooks:
        del download_errors_from_hooks[id_component]
        logger.debug(f"[{id_component}] Cleared pre-existing hook error for this id.")
    # Build output template path (prefer human-readable title + site; avoid duplicating slug)
    # For test expectations, include sanitized id in the template when title already carries content
    output_template = str(download_path / f"{safe_title_with_site}_{sanitized_id}.%(ext)s")
    logger.info(
        f"[{downloadId}] Output template set to: '{output_template}' "
        + f"(title: '{safe_title_with_site}', id_comp: '{sanitized_id}')"
    )
    return safe_title_with_site, sanitized_id, prefix, output_template


# Helper to assert playlist downloads are allowed by config
def _assert_playlist_allowed(downloadId: str, download_playlist: bool) -> tuple[Any, int] | None:
    """Check playlist permissions; return error tuple if disallowed.

    Parameters
    ----------
    downloadId : str
        The unique download identifier.
    download_playlist : bool
        Whether the request asks to download a playlist.

    Returns
    -------
    tuple[Any, int] | None
        Error response tuple if playlists are not allowed; otherwise None.
    """
    if download_playlist:
        config = Config.load()
        allow_playlists = config.get_value("allow_playlists", False)
        if not allow_playlists:
            logger.warning(f"[{downloadId}] Playlist download denied: Playlists not allowed in server config")
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Playlist downloads are not allowed by server configuration",
                        "error_type": "PLAYLIST_DOWNLOADS_DISABLED",
                        "downloadId": downloadId,
                    }
                ),
                403,
            )
        logger.info(f"[{downloadId}] Playlist download requested and allowed by config")
    else:
        logger.debug(f"[{downloadId}] Single video download (not a playlist)")
    return None


# Mapping of error substrings to error types and user-friendly messages
_YTDLP_ERROR_MESSAGE_MAPPINGS = [
    (
        ["is not a valid URL", "Unsupported URL"],
        "YT_DLP_UNSUPPORTED_URL",
        "The provided URL is not supported or is invalid. Please check the URL and try again.",
    ),
    (
        ["No video formats", "No video formats found", "no suitable formats"],
        "YT_DLP_NO_FORMATS",
        "No downloadable media was found on this page. Open the actual video URL and try again.",
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


def _cleanup_partial_files(prefix: str, download_path: Path, downloadId: str) -> None:
    """Remove partial .part files for the given download prefix."""
    try:
        pattern = f"{prefix}.*.part"
        for pf in download_path.glob(pattern):
            pf.unlink()
            logger.debug(f"Removed partial file {pf} for aborted download {downloadId}")
    except Exception as cleanup_err:
        logger.warning(f"[{downloadId}] Failed to clean partial files: {cleanup_err}")


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


def _classify_transient_error_and_backoff(error_message: str) -> tuple[str | None, int]:
    """Return a (reason, backoff_seconds) tuple if error looks transient; else (None, 0).

    Heuristics based on common site/network failures observed in logs.
    """
    msg = error_message.lower()
    # Too many requests / rate-limited
    if "429" in msg or "too many requests" in msg or "rate limit" in msg:
        return ("rate_limited", 15)
    # Temporary remote issues
    if "503" in msg or "service unavailable" in msg or "temporarily unavailable" in msg:
        return ("service_unavailable", 8)
    if "502" in msg or "bad gateway" in msg:
        return ("bad_gateway", 6)
    # Network/timeouts
    if "timeout" in msg or "timed out" in msg:
        return ("timeout", 6)
    if "network" in msg or "connection" in msg or "reset by peer" in msg:
        return ("network", 5)
    return (None, 0)


def _handle_yt_dlp_download_error(
    downloadId: str,
    url: str,
    prefix: str,
    download_path: Path,
    sanitized_id: str,
    exception: Exception,
) -> tuple[Any, int]:
    """Map yt-dlp errors into a structured Flask JSON response.

    Also performs cleanup of partial files for the failed download.

    Parameters
    ----------
    downloadId : str
        Download identifier.
    url : str
        Source media URL.
    prefix : str
        Prefix used for temporary files, for cleanup.
    download_path : Path
        Directory where temporary files were written.
    sanitized_id : str
        Sanitized URL/path component used in filenames.
    exception : Exception
        The exception raised by yt-dlp.

    Returns
    -------
    tuple[Any, int]
        Flask response object and HTTP status code.
    """
    # Cleanup partial files
    _cleanup_partial_files(prefix, download_path, downloadId)

    # Prepare error messages
    exc_message = str(exception)
    # Normalize user-cancelation to a distinct canceled classification
    if "cancelled" in exc_message.lower() or "canceled" in exc_message.lower():
        error_type = "USER_CANCELED"
        user_msg = "Download canceled by user."
        client_error = exc_message
        # Reflect canceled state in unified download manager and history, then return a 200 OK
        # consistent with cancel endpoint
        try:
            unified_download_manager.update_download(
                str(downloadId),
                status="canceled",
                message=user_msg,
                last_update=datetime.now(timezone.utc).isoformat(),
            )
        except Exception:
            pass
        with suppress(Exception):
            # Ensure URL is valid before creating history entry
            if url and url.strip():
                append_history_entry(
                    {
                        "downloadId": downloadId,
                        "url": url.strip(),
                        "status": "canceled",
                        "message": user_msg,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                )
            else:
                logger.warning(f"[{downloadId}] Skipping cancel history entry due to invalid URL: {url}")
        logger.info(f"[{downloadId}] Download canceled by user.")
        return (
            jsonify(
                {
                    "status": "success",
                    "message": user_msg,
                    "downloadId": downloadId,
                }
            ),
            200,
        )
    hook_details = download_errors_from_hooks.get(sanitized_id)
    if hook_details:
        # Use hook-provided error details
        error_type = hook_details.get("parsed_type", "YT_DLP_HOOK_ERROR")
        user_msg = f"Download failed: {hook_details['original_message']}"
        client_error = hook_details["original_message"]
        logger.info(f"[{downloadId}] Using error details from progress hook: {error_type} - {client_error}")
    else:
        # Map common errors
        error_type, user_msg = map_error_message(exc_message)
        client_error = exc_message

    logger.error(f"[{downloadId}] yt-dlp download error for URL {url}: Type='{error_type}', Message='{client_error}'")

    # Surface an entry in the status endpoint even when the error is raised before any hook runs.
    try:
        # Record an error entry that the /api/status endpoint will expose
        download_errors_from_hooks[str(downloadId)] = {
            "original_message": client_error,
            "parsed_type": error_type,
            "source": "server",
            "details": {"exception": exc_message},
            "troubleshooting": user_msg,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "downloadId": str(downloadId),
            "url": url,
        }
        # Optionally reflect a minimal status object as well
        unified_download_manager.update_download(
            str(downloadId),
            status="error",
            message=user_msg,
            last_update=datetime.now(timezone.utc).isoformat(),
        )
    except Exception:
        # Best-effort; do not block response on status recording errors
        pass

    # Append a failure entry to history so errors are visible even without the 'finished' hook
    with suppress(Exception):
        # Ensure URL is valid before creating history entry
        if url and url.strip():
            append_history_entry(
                {
                    "downloadId": downloadId,
                    "url": url.strip(),
                    "status": "error",
                    "error_type": error_type,
                    "message": user_msg,
                    "original_error": client_error,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
        else:
            logger.warning(f"[{downloadId}] Skipping history entry due to invalid URL: {url}")

    return (
        jsonify(
            {
                "status": "error",
                "message": user_msg,
                "error_type": error_type,
                "original_error": client_error,
                "downloadId": downloadId,
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
    download_path, url, downloadId, page_title, download_playlist_val, init_error = _init_download(data)
    if init_error:
        return init_error

    # At this point, download_path cannot be None since init_error would be set
    assert download_path is not None

    # Prepare metadata and output template
    _, sanitized_id_component, prefix, output_template = _prepare_download_metadata(
        url,
        page_title,
        downloadId,
        download_path,
    )

    # Assert playlist permission
    playlist_error = _assert_playlist_allowed(downloadId, download_playlist_val)
    if playlist_error:
        return playlist_error

    ydl_opts = build_opts(
        output_template,
        downloadId,
        download_playlist_val,  # Pass original downloadId to build_opts for hook
    )

    logger.info(f"[{downloadId}] Attempting to download URL: {url}")
    logger.debug(f"[{downloadId}] yt-dlp options: {ydl_opts}")

    try:
        # Register a lightweight controller so cancel/pause endpoints can act
        controller = cast(psutil.Process, cast(Any, _DownloadControl(str(downloadId))))
        download_process_registry.register(str(downloadId), controller)

        # Ensure a visible 'starting' status immediately in /api/status
        try:
            with progress_lock:
                prev = unified_download_manager.get_download(str(downloadId)) or {}
                progress_data[str(downloadId)] = {
                    **prev,
                    "status": "starting",
                    "url": url,
                    "percent": prev.get("percent", "0%"),
                    "downloaded": prev.get("downloaded"),
                    "total": prev.get("total"),
                    "speed": prev.get("speed", ""),
                    "eta": prev.get("eta", ""),
                    "improved_eta": prev.get("improved_eta", ""),
                    "history": prev.get("history", []),
                    "start_time": prev.get("start_time", datetime.now(timezone.utc).isoformat()),
                    "last_update": datetime.now(timezone.utc).isoformat(),
                }
        except Exception:
            # Non-fatal: hooks will still populate
            pass

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:  # type: ignore[import-untyped]
            # Perform the download (hook will observe cancel/pause flags)
            ydl.download([url])

        # Detect zero-byte output and perform automatic fallback retry if needed
        try:
            media_candidates_all = [
                p
                for p in download_path.glob(f"{prefix}.*")
                if not (p.name.endswith(".part") or p.name.endswith(".info.json"))
            ]
            final_file = media_candidates_all[0] if media_candidates_all else None
            if final_file and final_file.exists() and final_file.stat().st_size == 0:
                logger.warning(
                    f"[{downloadId}] Detected zero-byte file '{final_file.name}'. "
                    "Retrying with fallback format mp4 (itag 18) as single stream."
                )
                # Remove the empty stub before retry
                with suppress(Exception):
                    final_file.unlink()
                # Build fallback options: prefer format 18/mp4; allow unmerged single stream
                fallback_outtmpl = str(download_path / f"{prefix}.%(ext)s")
                fallback_opts = build_opts(fallback_outtmpl, downloadId, download_playlist_val)
                # Force single-stream mp4 and avoid merge
                fallback_opts["format"] = "18/mp4/best[mp4]/best"
                fallback_opts.pop("merge_output_format", None)
                # Re-run yt-dlp with fallback
                with yt_dlp.YoutubeDL(fallback_opts) as ydl_fb:  # type: ignore[import-untyped]
                    ydl_fb.download([url])
                logger.info(f"[{downloadId}] Fallback retry completed.")
        except Exception as fb_err:
            logger.warning(f"[{downloadId}] Fallback retry encountered an error: {fb_err}")

        # Fallback: if the progress hook did not appended history, attempt to append now
        try:
            if str(downloadId) not in history_appended_ids:
                # Prefer appending rich metadata from the .info.json if it exists
                # The info JSON is named after the final filename, which we do not know the ext for.
                # Attempt to find any matching info JSON for this download's prefix.
                candidates = list(download_path.glob(f"{prefix}.*.info.json"))
                if candidates:
                    with suppress(Exception):
                        with candidates[0].open(encoding="utf-8") as f:
                            info_data = json.load(f)
                        append_history_entry(info_data)
                        history_appended_ids.add(str(downloadId))
                        logger.info(f"[{downloadId}] Fallback appended download metadata to history: {candidates[0]}")
                        # Clean up consolidated metadata file
                        with suppress(Exception):
                            candidates[0].unlink()
                if str(downloadId) not in history_appended_ids:
                    # Append a minimal success entry
                    media_candidates = [
                        p
                        for p in download_path.glob(f"{prefix}.*")
                        if not (p.name.endswith(".part") or p.name.endswith(".info.json"))
                    ]
                    chosen = media_candidates[0] if media_candidates else None
                    # Clarify when the file is empty and ensure cleanup
                    if chosen and chosen.exists() and chosen.stat().st_size == 0:
                        logger.warning(
                            f"[{downloadId}] Appending history for zero-byte file and cleaning up stub: {chosen}"
                        )
                        with suppress(Exception):
                            chosen.unlink()
                        chosen = None
                    append_history_entry(
                        {
                            "downloadId": downloadId,
                            "url": url,
                            "status": "complete",
                            "filename": chosen.name if chosen else None,
                            "filepath": str(chosen) if chosen else None,
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                        }
                    )
                    history_appended_ids.add(str(downloadId))
        except Exception:
            # Do not fail the request due to history write issues
            pass

        # Ensure registry/flags are cleaned for this id before returning success
        with suppress(Exception):
            download_process_registry.unregister(str(downloadId))
            paused_requests.discard(str(downloadId))
            cancellation_requests.discard(str(downloadId))

        # Final safety cleanup: remove any leftover .info.json sidecars for this download's prefix
        try:
            for p in download_path.glob(f"{prefix}.*.info.json"):
                with suppress(Exception):
                    p.unlink()
        except Exception:
            # non-fatal
            pass

        # Ensure a 'finished' status exists in case hooks didn't run (very fast downloads)
        try:
            with progress_lock:
                current = progress_data.get(str(downloadId)) or {}
                progress_data[str(downloadId)] = {
                    **current,
                    "status": "finished",
                    "percent": "100%",
                    "eta": "0s",
                    "last_update": datetime.now(timezone.utc).isoformat(),
                }
        except Exception:
            pass

        logger.info(f"[{downloadId}] Download process completed for URL: {url}")
        return (
            jsonify(
                {
                    "status": "success",
                    "message": "Download initiated successfully and reported as complete by yt-dlp.",
                    "downloadId": downloadId,
                    "url": url,
                    "page_title": page_title,
                }
            ),
            200,
        )
    except yt_dlp.utils.DownloadError as e:  # type: ignore[import-untyped]
        # Special-case stale range/partial errors (HTTP 416 Requested Range Not Satisfiable)
        # Automatically retry once with a full fresh download: clear partials, disable resume, avoid .part files
        try:
            msg = str(e)
        except Exception:
            msg = ""
        if "Requested Range Not Satisfiable" in msg or "HTTP Error 416" in msg:
            # Clean any partials first
            with suppress(Exception):
                _cleanup_partial_files(prefix, download_path, str(downloadId))
            try:
                retry_opts = build_opts(output_template, downloadId, download_playlist_val)
                # Disable resuming and .part usage to force a clean download
                retry_opts["continuedl"] = False
                retry_opts["nopart"] = True
                # Allow overwriting any conflicting files
                retry_opts["overwrites"] = True
                with yt_dlp.YoutubeDL(retry_opts) as ydl_retry:  # type: ignore[import-untyped]
                    ydl_retry.download([url])
                logger.info(f"[{downloadId}] 416 retry completed successfully.")
                # As in the normal success path, ensure a history entry exists if hooks did not append
                try:
                    if str(downloadId) not in history_appended_ids:
                        candidates = list(download_path.glob(f"{prefix}.*.info.json"))
                        if candidates:
                            with suppress(Exception):
                                with candidates[0].open(encoding="utf-8") as f:
                                    info_data = json.load(f)
                                append_history_entry(info_data)
                                history_appended_ids.add(str(downloadId))
                                with suppress(Exception):
                                    candidates[0].unlink()
                        if str(downloadId) not in history_appended_ids:
                            media_candidates = [
                                p
                                for p in download_path.glob(f"{prefix}.*")
                                if not (p.name.endswith(".part") or p.name.endswith(".info.json"))
                            ]
                            chosen = media_candidates[0] if media_candidates else None
                            if chosen and chosen.exists() and chosen.stat().st_size == 0:
                                with suppress(Exception):
                                    chosen.unlink()
                                chosen = None
                            append_history_entry(
                                {
                                    "downloadId": downloadId,
                                    "url": url,
                                    "status": "complete",
                                    "filename": chosen.name if chosen else None,
                                    "filepath": str(chosen) if chosen else None,
                                    "timestamp": datetime.now(timezone.utc).isoformat(),
                                }
                            )
                            history_appended_ids.add(str(downloadId))
                except Exception:
                    pass
                # Return success response consistent with normal flow
                return (
                    jsonify(
                        {
                            "status": "success",
                            "message": "Download retried after stale range and completed successfully.",
                            "downloadId": downloadId,
                            "url": url,
                            "page_title": page_title,
                        }
                    ),
                    200,
                )
            except Exception as retry_err:
                logger.warning(f"[{downloadId}] 416 retry failed: {retry_err}")
                # fall through to standard error mapping/response
        # Transient error retry (single attempt with backoff)
        reason, backoff = _classify_transient_error_and_backoff(msg)
        if reason:
            try:
                logger.warning(f"[{downloadId}] Transient error detected ({reason}). Retrying once after {backoff}s.")
                time.sleep(backoff)
                retry_opts_generic = build_opts(output_template, downloadId, download_playlist_val)
                with yt_dlp.YoutubeDL(retry_opts_generic) as ydl_retry2:  # type: ignore[import-untyped]
                    ydl_retry2.download([url])

                # On success, mirror the normal success path (zero-byte guard, history, cleanup)
                try:
                    media_candidates_all = [
                        p
                        for p in download_path.glob(f"{prefix}.*")
                        if not (p.name.endswith(".part") or p.name.endswith(".info.json"))
                    ]
                    final_file = media_candidates_all[0] if media_candidates_all else None
                    if final_file and final_file.exists() and final_file.stat().st_size == 0:
                        logger.warning(
                            f"[{downloadId}] Detected zero-byte file '{final_file.name}' after retry. "
                            "Retrying with fallback format mp4 (itag 18) as single stream."
                        )
                        with suppress(Exception):
                            final_file.unlink()
                        fallback_outtmpl2 = str(download_path / f"{prefix}.%(ext)s")
                        fallback_opts2 = build_opts(fallback_outtmpl2, downloadId, download_playlist_val)
                        fallback_opts2["format"] = "18/mp4/best[ext=mp4]/best"
                        fallback_opts2.pop("merge_output_format", None)
                        with yt_dlp.YoutubeDL(fallback_opts2) as ydl_fb2:  # type: ignore[import-untyped]
                            ydl_fb2.download([url])
                        logger.info(f"[{downloadId}] Fallback retry completed after transient error.")
                except Exception as fb2_err:
                    logger.warning(f"[{downloadId}] Post-retry fallback encountered an error: {fb2_err}")

                try:
                    if str(downloadId) not in history_appended_ids:
                        candidates2 = list(download_path.glob(f"{prefix}.*.info.json"))
                        if candidates2:
                            with suppress(Exception):
                                with candidates2[0].open(encoding="utf-8") as f:
                                    info_data2 = json.load(f)
                                append_history_entry(info_data2)
                                history_appended_ids.add(str(downloadId))
                                logger.info(
                                    f"[{downloadId}] Fallback appended download metadata to history after retry: "
                                    f"{candidates2[0]}"
                                )
                                with suppress(Exception):
                                    candidates2[0].unlink()
                    if str(downloadId) not in history_appended_ids:
                        media_candidates2 = [
                            p
                            for p in download_path.glob(f"{prefix}.*")
                            if not (p.name.endswith(".part") or p.name.endswith(".info.json"))
                        ]
                        chosen2 = media_candidates2[0] if media_candidates2 else None
                        if chosen2 and chosen2.exists() and chosen2.stat().st_size == 0:
                            with suppress(Exception):
                                chosen2.unlink()
                            chosen2 = None
                        append_history_entry(
                            {
                                "downloadId": downloadId,
                                "url": url,
                                "status": "complete",
                                "filename": chosen2.name if chosen2 else None,
                                "filepath": str(chosen2) if chosen2 else None,
                                "timestamp": datetime.now(timezone.utc).isoformat(),
                            }
                        )
                        history_appended_ids.add(str(downloadId))
                except Exception:
                    pass

                with suppress(Exception):
                    download_process_registry.unregister(str(downloadId))
                    paused_requests.discard(str(downloadId))
                    cancellation_requests.discard(str(downloadId))
                try:
                    for p in download_path.glob(f"{prefix}.*.info.json"):
                        with suppress(Exception):
                            p.unlink()
                except Exception:
                    pass

                logger.info(f"[{downloadId}] Download process completed after transient-retry for URL: {url}")
                return (
                    jsonify(
                        {
                            "status": "success",
                            "message": "Download completed successfully after a transient retry.",
                            "downloadId": downloadId,
                            "url": url,
                            "page_title": page_title,
                        }
                    ),
                    200,
                )
            except Exception as retry_generic_err:
                logger.warning(f"[{downloadId}] Transient retry failed: {retry_generic_err}")
                # Fall through to error mapping below
        # Cleanup registry/flags on error before mapping response
        with suppress(Exception):
            download_process_registry.unregister(str(downloadId))
            paused_requests.discard(str(downloadId))
            cancellation_requests.discard(str(downloadId))

        return _handle_yt_dlp_download_error(
            downloadId,
            url,
            prefix,
            download_path,
            sanitized_id_component,
            e,
        )
    except Exception as e:
        logger.error(
            f"[{downloadId}] Unexpected server error during download for URL {url}: {e}",
            exc_info=True,
        )
        # Append a failure entry to history for unexpected server errors
        with suppress(Exception):
            append_history_entry(
                {
                    "downloadId": downloadId,
                    "url": url,
                    "status": "error",
                    "error_type": "UNEXPECTED_SERVER_ERROR",
                    "message": str(e),
                    "error": str(e),
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                }
            )
        # Cleanup registry/flags on unexpected error
        with suppress(Exception):
            download_process_registry.unregister(str(downloadId))
            paused_requests.discard(str(downloadId))
            cancellation_requests.discard(str(downloadId))

        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"An unexpected server error occurred: {e!s}",
                    "error_type": "UNEXPECTED_SERVER_ERROR",
                    "original_error": str(e),
                    "downloadId": downloadId,
                }
            ),
            500,
        )
