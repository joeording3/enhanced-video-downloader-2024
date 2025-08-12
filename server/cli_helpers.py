"""
Provide helper functions for the Enhanced Video Downloader CLI.

This module offers utility functions for process management, lock file operations,
port checking, and server control operations for the command-line interface.
"""

import concurrent.futures
import contextlib
import json
import logging
import os
import re
import signal
import socket
import subprocess
import sys
import tempfile
import threading
import time
from collections.abc import Callable  # Added Any, Callable, Tuple
from pathlib import Path
from typing import Any

import click
import gunicorn.app.base  # type: ignore[import-untyped]
import psutil
import yt_dlp  # type: ignore[import-untyped]

from server import create_app

# Import server.cli functions for restart command
# Removed to avoid circular import - these functions are not used in this module
from server.cli_resume_helpers import derive_resume_url, get_part_files, validate_scan_directory
from server.config import Config
from server.constants import DEFAULT_SERVER_PORT
from server.disable_launchagents import disable_agents as _disable_agents
from server.disable_launchagents import find_video_downloader_agents
from server.history import HISTORY_PATH, load_history  # assumes this returns List[Dict]
from server.lock import create_lock_file as _create_lock_file
from server.lock import get_lock_file_path
from server.lock import get_lock_pid as _get_lock_pid
from server.lock import get_lock_pid_port as _get_lock_pid_port
from server.lock import remove_lock_file as _remove_lock
from server.utils import find_available_port as core_find_available_port

# Alias derive_resume_url for backward compatibility and tests
_derive_resume_url = derive_resume_url

# Determine server lock file path, respect LOCK_FILE env var
_lock_file_env = os.getenv("LOCK_FILE")
LOCK_FILE = Path(_lock_file_env) if _lock_file_env else get_lock_file_path()
LOG_FILE = Path(os.getenv("LOG_FILE", Path(__file__).parent.parent / "server.log"))

# Default logger for helpers, can be overridden by CLI's logger
helper_log = logging.getLogger(__name__)


def get_lock_pid_port_cli(lock_file_path: Path) -> tuple[int, int] | None:
    """Get PID and port tuple from a lock file."""
    return _get_lock_pid_port(lock_file_path)


def is_port_in_use(port: int, host: str = "127.0.0.1") -> bool:
    """Check if a TCP port is in use on a host by attempting bind and listen."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            # Allow immediate reuse to avoid false positives from TIME_WAIT sockets
            s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            # Try binding to the port
            s.bind((host, port))
            try:
                # After bind, attempt to listen to catch non-listening binds
                s.listen(1)
            except OSError:
                return True  # Port is bound but not available for listen
            else:
                return False  # Port not in use
        except OSError:
            return True  # Port is in use


def find_video_downloader_agents_cli() -> list[Path]:
    """Find video downloader LaunchAgents on the system."""
    agents = find_video_downloader_agents()
    return [Path(agent) for agent in agents]


# Alias the underlying disable_agents function to simplify implementation and reduce complexity
disable_agents_cli = _disable_agents


def kill_processes_cli(processes: list[psutil.Process]) -> None:
    """Terminate and forcefully kill processes if they do not exit gracefully."""
    for proc in processes:
        try:
            helper_log.info(f"Sending SIGTERM to process {proc.pid}")
            proc.terminate()
        except Exception as e:  # noqa: PERF203
            helper_log.warning(f"Failed to terminate process {proc.pid}: {e}")
    time.sleep(2)
    for proc in processes:
        if proc.is_running():
            try:
                helper_log.info(f"Sending SIGKILL to process {proc.pid}")
                proc.kill()
            except Exception as e:
                helper_log.warning(f"Failed to kill process {proc.pid}: {e}")


# Integrate lock file helper wrappers
def create_lock_file_cli(port: int) -> None:
    """Create a lock file recording PID and port."""
    create_lock_file(port)


def remove_lock_file_cli() -> None:
    """Remove the lock file if it exists."""
    remove_lock_file()


def _range_count(start_port: int, end_port: int) -> int:
    """Compute inclusive port count from start to end."""
    return max(0, (end_port - start_port) + 1)


class InvalidPortRangeError(RuntimeError):
    """Raised when an invalid port range is provided to discovery helpers."""


def create_lock_file(port: int) -> None:
    """
    Create a lock file with current PID and port.

    Parameters
    ----------
    port : int
        Port number to record in the lock file.

    Returns
    -------
    None
        This function does not return a value.
    """
    # Delegate to server.lock.create_lock_file to write PID:PORT
    # This acquires a lock and writes the PID and port in 'pid:port' format
    _create_lock_file(LOCK_FILE, port)


def get_lock_pid() -> int | None:
    """
    Read PID from lock file.

    Returns
    -------
    Optional[int]
        Process ID from the lock file, or None if missing or invalid.
    """
    # Delegate to server.lock.get_lock_pid for parsing 'pid:port' format
    return _get_lock_pid(LOCK_FILE)


def remove_lock_file() -> bool:
    """Remove the server lock file if it exists.

    Returns
    -------
    bool
        True if lock file was removed or didn't exist, False otherwise.
    """
    # Delegate to server.lock.remove_lock_file for proper removal
    try:
        # server.lock.remove_lock_file accepts optional path, but use default
        _remove_lock(LOCK_FILE)
    except Exception:
        helper_log.error(f"Error removing lock file at {LOCK_FILE}")
        return False
    else:
        return True


def start_server_process(port: int) -> None:
    """
    Start the server in a background detached process.

    Parameters
    ----------
    port : int
        Port number to start the server on.

    Returns
    -------
    None
        This function does not return a value.
    """
    # Set environment variable for the port
    env = os.environ.copy()
    env["SERVER_PORT"] = str(port)

    # Start the server in a background process
    subprocess.Popen(
        [sys.executable, "-m", "server"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True,
        env=env,
    )


def stop_process_by_pid(pid: int) -> None:
    """
    Terminate a process by PID.

    Parameters
    ----------
    pid : int
        Process ID to terminate.

    Returns
    -------
    None
        This function does not return a value.

    Raises
    ------
    OSError
        If the process cannot be terminated.
    """
    os.kill(pid, signal.SIGTERM)


def find_server_processes_cli() -> list[dict[str, int | str | None]]:
    """
    List running server processes using the lock file only.

    This helper is intended for CLI status output and stop/restart flows where the lock file is the
    source of truth for the actively managed instance. It does not perform a full process-table scan
    (use `find_server_processes()` for that broader discovery).

    Returns
    -------
    list[dict[str, int | str | None]]
        Each entry includes `pid`, `port`, and `uptime` when available. Empty list if no lock.
    """
    if not LOCK_FILE.exists():
        return []

    entities: list[dict[str, int | str | None]] = []
    try:
        pid_port = _get_lock_pid_port(LOCK_FILE)
        if not pid_port:
            return []
        pid, port = pid_port
        if not psutil.pid_exists(pid):
            return []
        try:
            proc = psutil.Process(pid)
            uptime = int(time.time() - proc.create_time())
        except Exception:
            uptime = None
        entities.append({"pid": pid, "port": port, "uptime": uptime})
    except Exception:
        helper_log.debug("Failed to read lock-referenced process", exc_info=True)
    return entities


def resume_failed_downloads(
    download_ids: list[str],
    download_dir: Path,
    build_opts_func: Callable[[str, str, dict[str, Any] | None], dict[str, Any]],
    logger: logging.Logger | None = None,
    order: str = "oldest",
    priority: int | None = None,
    max_concurrent: int = 3,
    progress_callback: Callable[[int, int, str], None] | None = None,
) -> None:
    """
    Resume failed downloads with enhanced prioritization and progress reporting.

    Parameters
    ----------
    download_ids : List[str]
        List of download IDs or URLs to resume.
    download_dir : Path
        Base download directory.
    build_opts_func : Callable
        Function to build yt-dlp options.
    logger : Optional[logging.Logger]
        Logger instance for output.
    order : str
        Processing order: 'oldest', 'newest', 'priority'.
    priority : Optional[int]
        OS process priority (nice value) for resumed downloads.
    max_concurrent : int
        Maximum number of concurrent downloads.
    progress_callback : Optional[Callable]
        Callback function for progress updates (current, total, status).

    Returns
    -------
    None
        This function does not return a value.
    """
    if logger is None:
        logger = helper_log

    # Load history to get failed downloads
    history_items = load_history()
    if not history_items:
        logger.info("No download history found.")
        return

    # Compute failed download IDs
    failed_ids = _compute_failed_download_ids(download_ids, history_items, logger)
    if not failed_ids:
        logger.info("No failed downloads found to resume.")
        return

    # Reorder based on priority
    if order == "priority":
        failed_ids = _reorder_by_priority(failed_ids, history_items)
    else:
        failed_ids = _reorder_download_ids(failed_ids, order)

    logger.info(f"Found {len(failed_ids)} failed downloads to resume")

    # Process downloads with progress reporting
    total = len(failed_ids)
    resumed = 0
    failed = 0
    non_resumable = []

    if progress_callback:
        progress_callback(0, total, "Starting resume operation")

    # Process in batches for concurrent downloads
    for i in range(0, len(failed_ids), max_concurrent):
        batch = failed_ids[i : i + max_concurrent]
        batch_results = _process_resume_batch(batch, download_dir, build_opts_func, logger, priority)

        resumed += batch_results["resumed"]
        failed += batch_results["failed"]
        non_resumable.extend(batch_results["non_resumable"])

        if progress_callback:
            progress_callback(i + len(batch), total, f"Processed batch {i // max_concurrent + 1}")

    # Report summary
    _report_failed_summary(resumed, failed, non_resumable, logger)


def _reorder_by_priority(download_ids: list[str], history_items: list[dict[str, Any]]) -> list[str]:
    """Reorder downloads by priority (highest priority first)."""
    # Create a mapping of download_id to priority
    priority_map = {}
    for item in history_items:
        download_id = item.get("download_id")
        if download_id in download_ids:
            # Use file size as priority indicator (larger files = higher priority)
            file_size = item.get("file_size", 0)
            priority_map[download_id] = file_size

    # Sort by priority (descending)
    return sorted(download_ids, key=lambda x: priority_map.get(x, 0), reverse=True)


def _process_resume_batch(
    batch: list[str],
    download_dir: Path,
    build_opts_func: Callable[[str, str, dict[str, Any] | None], dict[str, Any]],
    logger: logging.Logger,
    priority: int | None,
) -> dict[str, Any]:
    """Process a batch of downloads concurrently."""
    results: dict[str, Any] = {"resumed": 0, "failed": 0, "non_resumable": []}
    results_lock = threading.Lock()

    def process_single_download(download_id: str) -> dict[str, Any]:
        try:
            # Find the download in history
            history_items = load_history()
            download_info = None
            for item in history_items:
                if item.get("download_id") == download_id:
                    download_info = item
                    break

            if not download_info:
                return {"status": "failed", "reason": "not_found"}

            url = download_info.get("url")
            if not url:
                return {"status": "failed", "reason": "no_url"}

            # Build options
            output_template = str(download_dir / "%(title)s.%(ext)s")
            opts = build_opts_func(url, output_template, None)

            # Set priority if specified
            if priority is not None:
                opts["nice"] = priority

            # Attempt resume
            with yt_dlp.YoutubeDL(opts) as ydl:  # type: ignore[import-untyped]
                ydl.download([url])
        except Exception as e:
            logger.exception(f"Failed to resume {download_id}")
            return {"status": "failed", "reason": str(e)}
        else:
            return {"status": "success"}

    # Process batch concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(batch)) as executor:
        future_to_id = {executor.submit(process_single_download, did): did for did in batch}

        for future in concurrent.futures.as_completed(future_to_id):
            download_id = future_to_id[future]
            try:
                result = future.result()
                with results_lock:
                    if result["status"] == "success":
                        results["resumed"] += 1
                        logger.info(f" Successfully resumed: {download_id}")
                    else:
                        results["failed"] += 1
                        results["non_resumable"].append(download_id)
                        logger.warning(f" Failed to resume {download_id}: {result['reason']}")
            except Exception:
                with results_lock:
                    results["failed"] += 1
                    results["non_resumable"].append(download_id)
                    logger.exception(" Exception resuming {download_id}")

    return results


def resume_incomplete_downloads(
    download_dir: Path,  # Base download directory from config
    scan_dir_override: Path | None = None,  # Specific directory to scan if different from download_dir
    logger: logging.Logger | None = None,
    priority: int | None = None,
    max_concurrent: int = 3,
    verify_integrity: bool = True,
    progress_callback: Callable[[int, int, str], None] | None = None,
) -> None:
    """
    Resume incomplete downloads with enhanced detection and verification.

    Parameters
    ----------
    download_dir : Path
        Base download directory from config.
    scan_dir_override : Optional[Path]
        Specific directory to scan if different from download_dir.
    logger : Optional[logging.Logger]
        Logger instance for output.
    priority : Optional[int]
        OS process priority (nice value) for resumed downloads.
    max_concurrent : int
        Maximum number of concurrent downloads.
    verify_integrity : bool
        Verify file integrity before resuming.
    progress_callback : Optional[Callable]
        Callback function for progress updates (current, total, status).

    Returns
    -------
    None
        This function does not return a value.
    """
    if logger is None:
        logger = helper_log

    # Determine scan target
    scan_dir = _determine_scan_target(download_dir, scan_dir_override)
    logger.info(f"Scanning for incomplete downloads in: {scan_dir}")

    # Find incomplete files
    incomplete_files = _filter_incomplete_files(scan_dir, logger)
    if not incomplete_files:
        logger.info("No incomplete downloads found.")
        return

    logger.info(f"Found {len(incomplete_files)} incomplete downloads to resume")

    # Process files with progress reporting
    total = len(incomplete_files)
    resumed = 0
    errors = 0
    non_resumable = []

    if progress_callback:
        progress_callback(0, total, "Starting resume operation")

    # Process in batches for concurrent downloads
    for i in range(0, len(incomplete_files), max_concurrent):
        batch = incomplete_files[i : i + max_concurrent]
        batch_results = _process_incomplete_batch(batch, download_dir, logger, priority, verify_integrity)

        resumed += batch_results["resumed"]
        errors += batch_results["errors"]
        non_resumable.extend(batch_results["non_resumable"])

        if progress_callback:
            progress_callback(i + len(batch), total, f"Processed batch {i // max_concurrent + 1}")

    # Report summary
    _report_incomplete_summary(resumed, errors, non_resumable, logger)


def _process_incomplete_batch(
    batch: list[Path], download_dir: Path, logger: logging.Logger, priority: int | None, verify_integrity: bool
) -> dict[str, Any]:
    """Process a batch of incomplete files concurrently."""
    results: dict[str, Any] = {"resumed": 0, "errors": 0, "non_resumable": []}
    results_lock = threading.Lock()

    def process_single_file(part_file: Path) -> dict[str, Any]:
        try:
            # Verify file integrity if requested
            if verify_integrity and not _verify_file_integrity(part_file, logger):
                return {"status": "failed", "reason": "integrity_check_failed"}

            # Determine downloader type and recover URL
            downloader_type, url = _determine_downloader_and_url(part_file, logger)
            if not url:
                return {"status": "failed", "reason": "no_url_found"}

            # Build appropriate options for the downloader
            opts = _build_resume_options(downloader_type, url, download_dir, priority)

            # Attempt resume
            success = _resume_with_downloader(downloader_type, url, opts, part_file, logger)
            if success:
                return {"status": "success"}
        except Exception as e:
            logger.exception("Failed to resume {part_file}")
            return {"status": "failed", "reason": str(e)}
        else:
            return {"status": "failed", "reason": "resume_failed"}

    # Process batch concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(batch)) as executor:
        future_to_file = {executor.submit(process_single_file, f): f for f in batch}

        for future in concurrent.futures.as_completed(future_to_file):
            part_file = future_to_file[future]
            try:
                result = future.result()
                with results_lock:
                    if result["status"] == "success":
                        results["resumed"] += 1
                        logger.info(f" Successfully resumed: {part_file.name}")
                    else:
                        results["errors"] += 1
                        results["non_resumable"].append(str(part_file))
                        logger.warning(f" Failed to resume {part_file.name}: {result['reason']}")
            except Exception:
                with results_lock:
                    results["errors"] += 1
                    results["non_resumable"].append(str(part_file))
                    logger.exception(" Exception resuming {part_file.name}")

    return results


def _verify_file_integrity(part_file: Path, logger: logging.Logger) -> bool:
    """Verify the integrity of a partial file before resuming."""
    try:
        # Check if file exists and is readable
        if not part_file.exists() or not part_file.is_file():
            logger.warning(f"File does not exist or is not a file: {part_file}")
            return False

        # Check file size (should be > 0)
        file_size = part_file.stat().st_size
        if file_size == 0:
            logger.warning(f"File is empty: {part_file}")
            return False

        # Check if file is corrupted (basic check)
        try:
            with part_file.open("rb") as f:
                # Read first few bytes to check basic integrity
                f.seek(0)
                header = f.read(min(1024, file_size))

                # Only try to read footer if file is large enough
                if file_size > 1024:
                    f.seek(-1024, 2)  # From end
                    footer = f.read(1024)
                else:
                    # For small files, just use the header as both header and footer
                    footer = header

                # Basic integrity check (can be enhanced based on file type)
                if len(header) == 0 or len(footer) == 0:
                    logger.warning(f"File appears corrupted: {part_file}")
                    return False

        except Exception:
            logger.warning(f"Error reading file for integrity check: {part_file}")
            return False
        else:
            logger.debug(f"File integrity check passed: {part_file} ({file_size} bytes)")
            return True
    except Exception:
        logger.exception("Error during integrity check: {part_file}")
        return False


def _determine_downloader_and_url(part_file: Path, logger: logging.Logger) -> tuple[str, str | None]:
    """Determine downloader type and recover original URL from partial file."""
    try:
        # Check for yt-dlp metadata files
        metadata_file = part_file.with_suffix(".info.json")
        if metadata_file.exists():
            with metadata_file.open() as f:
                metadata = json.load(f)
                url = metadata.get("webpage_url") or metadata.get("url")
                if url:
                    logger.debug(f"Found URL in metadata: {url}")
                    return "yt-dlp", url

        # Check for gallery-dl metadata
        gallery_metadata = part_file.with_suffix(".json")
        if gallery_metadata.exists():
            with gallery_metadata.open() as f:
                metadata = json.load(f)
                url = metadata.get("url")
                if url:
                    logger.debug(f"Found URL in gallery metadata: {url}")
                    return "gallery-dl", url

        # Try to extract URL from filename patterns
        filename = part_file.name
        if ".part" in filename:
            # Common yt-dlp pattern
            base_name = filename.replace(".part", "")
            # Look for associated files that might contain URL
            for sibling in part_file.parent.glob(f"{base_name}*"):
                if sibling.suffix in [".info.json", ".description", ".webp"]:
                    # Try to extract URL from these files
                    url = _extract_url_from_file(sibling, logger)
                    if url:
                        return "yt-dlp", url

        # Check history for matching files
        history_items = load_history()
        for item in history_items:
            if item.get("filename") and part_file.name.startswith(item["filename"]):
                url = item.get("url")
                if url:
                    logger.debug(f"Found URL in history: {url}")
                    return "yt-dlp", url

        logger.warning(f"Could not determine downloader or URL for: {part_file}")
    except Exception:
        logger.exception("Error determining downloader and URL: {part_file}")
        return "unknown", None
    else:
        return "unknown", None


def _extract_url_from_file(file_path: Path, logger: logging.Logger) -> str | None:
    """Extract URL from various file types."""
    try:
        # Path.suffix returns only the last extension; use name check for compound suffixes
        if file_path.name.endswith(".info.json"):
            with file_path.open() as f:
                metadata = json.load(f)
                result = metadata.get("webpage_url") or metadata.get("url")
                return result if isinstance(result, str) else None
        if file_path.suffix == ".description":
            with file_path.open() as f:
                content = f.read()
                # Look for URL patterns in description
                url_match = re.search(r"https?://[^\s]+", content)
                if url_match:
                    return url_match.group(0)
    except Exception:
        logger.debug(f"Error extracting URL from {file_path}")
    return None


def _build_resume_options(downloader_type: str, url: str, download_dir: Path, priority: int | None) -> dict[str, Any]:
    """Build appropriate options for resuming with the specified downloader."""
    if downloader_type == "yt-dlp":
        output_template = str(download_dir / "%(title)s.%(ext)s")
        opts = cli_build_opts(url, output_template, None)

        # Add resume-specific options
        opts.update(
            {
                "continuedl": True,  # Continue partial downloads
                "ignoreerrors": False,
            }
        )

        if priority is not None:
            opts["nice"] = priority

        return opts
    if downloader_type == "gallery-dl":
        # Basic gallery-dl options
        opts = {
            "directory": str(download_dir),
            "continue": True,
        }

        if priority is not None:
            opts["nice"] = str(priority)

        return opts
    # Fallback to yt-dlp
    output_template = str(download_dir / "%(title)s.%(ext)s")
    return cli_build_opts(url, output_template, None)


def _resume_with_downloader(
    downloader_type: str, url: str, opts: dict[str, Any], _part_file: Path, logger: logging.Logger
) -> bool:
    """Resume download using the specified downloader."""
    try:
        if downloader_type == "yt-dlp":
            with yt_dlp.YoutubeDL(opts) as ydl:  # type: ignore[import-untyped]
                ydl.download([url])
            return True
        if downloader_type == "gallery-dl":
            # Build gallery-dl command from options
            cmd: list[str] = ["gallery-dl"]
            # Map opts to flags: bool -> --key, scalar -> --key value, list -> repeated

            def _append_option(k: str, v: Any) -> None:
                key = f"--{k}"
                if isinstance(v, bool):
                    if v:
                        cmd.append(key)
                elif isinstance(v, str | int | float):
                    cmd.extend([key, str(v)])
                elif isinstance(v, list | tuple):
                    for item in v:
                        cmd.extend([key, str(item)])
                # ignore None/unknown types silently

            # Ensure continuation is enabled by default
            if not isinstance(opts.get("continue"), bool) or opts.get("continue") is not True:
                opts = {**opts, "continue": True}

            # Apply known options first for stable ordering
            if "directory" in opts and opts["directory"] is not None:
                _append_option("directory", opts["directory"])  # type: ignore[arg-type]
            if "continue" in opts:
                _append_option("continue", opts["continue"])  # type: ignore[arg-type]

            # Append remaining options (excluding ones we already handled)
            for k, v in opts.items():
                if k in {"directory", "continue"}:
                    continue
                _append_option(str(k), v)

            # Finally, the URL
            cmd.append(url)

            logger.info(f"Attempting gallery-dl resume for: {url}")
            proc = subprocess.run(cmd, check=False, capture_output=True, text=True)
            if proc.returncode == 0:
                logger.debug(proc.stdout)
                return True
            logger.warning(f"gallery-dl resume failed (code {proc.returncode}): {proc.stderr.strip()}")
            return False
    except Exception:
        logger.exception("Error resuming with {downloader_type}: {url}")
        return False
    else:
        return False


def tail_server_logs() -> None:
    """
    Display and follow the server log file in real time.

    Use the 'tail -f' command if available; otherwise, provide a Python-based follow.

    Returns
    -------
    None
        This function does not return a value.
    """
    if not LOG_FILE.exists():
        return
    try:
        subprocess.run(["tail", "-f", str(LOG_FILE)], check=True)
    except FileNotFoundError:
        with LOG_FILE.open() as f:
            f.seek(0, os.SEEK_END)
            try:
                while True:
                    line = f.readline()
                    if line:
                        click.echo(line.rstrip("\n"))
                    else:
                        time.sleep(0.5)
            except KeyboardInterrupt:
                helper_log.info("Stopped following server logs (KeyboardInterrupt)")


def disable_launchagents() -> None:
    """
    Disable auto-start launch agents and services.

    Attempt to unload macOS LaunchAgents or disable systemd user services
    configured to start the server automatically.

    Returns
    -------
    None
        This function does not return a value.
    """
    if os.name == "posix":
        try:
            subprocess.run(
                [
                    "launchctl",
                    "unload",
                    str(Path.home() / "Library/LaunchAgents/com.evd.plist"),
                ],
                check=True,
            )
        except Exception:
            with contextlib.suppress(Exception):
                subprocess.run(["systemctl", "--user", "disable", "evd.service"], check=True)
    else:
        helper_log.info("Launch agent management is not supported on this OS; skipping")


def wait_for_server_start_cli(port: int, host: str = "127.0.0.1", timeout: int = 15) -> bool:
    """
    Wait for server to accept TCP connections.

    Attempt to connect to specified host and port until timeout.

    Parameters
    ----------
    port : int
        TCP port to connect to.
    host : str, optional
        Hostname or IP address, by default '127.0.0.1'.
    timeout : int, optional
        Maximum seconds to wait, by default 15.

    Returns
    -------
    bool
        True if connection succeeds, False on timeout.
    """
    start_ts = time.time()
    while time.time() - start_ts < timeout:
        try:
            with socket.create_connection((host, port), timeout=1):
                return True
        except OSError:  # noqa: PERF203
            time.sleep(0.5)
    return False


def ensure_caddy_proxy_running(
    project_root: Path,
    upstream_host: str,
    upstream_port: int,
    proxy_port: int = 9443,
    caddyfile_path: Path | None = None,
    log: logging.Logger | None = None,
) -> None:
    """Ensure a local Caddy HTTPS proxy is running and targeting the upstream server.

    - Updates the Caddyfile reverse_proxy target to the provided upstream.
    - If the proxy port is not listening, starts Caddy with that Caddyfile.
    - If Caddy appears to be running, triggers a reload to pick up any changes.

    This function is best-effort and will not raise on failure; it logs warnings instead.
    """
    logger = log or helper_log
    try:
        # Resolve Caddyfile path
        caddyfile = caddyfile_path or (project_root / "Caddyfile")
        # Determine server log file path to mirror Caddy logs
        log_file = Path(os.getenv("LOG_FILE") or (project_root / "server_output.log"))

        # Prepare desired reverse_proxy line
        desired_upstream = f"{upstream_host}:{upstream_port}"
        desired_proxy_line = f"  reverse_proxy {desired_upstream}\n"

        # Ensure a Caddyfile exists; if missing, create a minimal one pointing to known cert path
        if not caddyfile.exists():
            try:
                cert_dir = Path("/opt/homebrew/var/lib/caddy/certs/evd")
                cert_file = cert_dir / "127.0.0.1+1.pem"
                key_file = cert_dir / "127.0.0.1+1-key.pem"
                # Build minimal Caddyfile with access log to server log file
                minimal_cfg = (
                    ":9443 {\n\n"
                    "  log {\n"
                    f"    output file {log_file}\n"
                    "    format json\n"
                    "  }\n\n"
                    f"{desired_proxy_line}"
                    f"  tls {cert_file} {key_file}\n"
                    "}\n"
                )
                caddyfile.write_text(minimal_cfg)
                logger.info(f"Created minimal Caddyfile at {caddyfile}")
            except Exception:
                logger.warning("Failed to create Caddyfile; HTTPS proxy may not be available.", exc_info=True)

        # If Caddyfile exists, ensure reverse_proxy line targets the current upstream
        if caddyfile.exists():
            try:
                content = caddyfile.read_text()
                lines = content.splitlines(keepends=True)
                updated = False
                new_lines: list[str] = []

                def _line_has_log_block(text: str) -> bool:
                    stripped = text.strip()
                    return (
                        stripped.startswith(("log ", "log{"))
                        or stripped == "log {"
                    )
                have_log_block = any(_line_has_log_block(line_text) for line_text in lines)

                inserted_log = False
                for line in lines:
                    # Insert log block after site line if missing
                    if (not have_log_block) and (not inserted_log) and line.strip().startswith(":") and "{" in line:
                        new_lines.append(line)
                        new_lines.append("  log {\n")
                        new_lines.append(f"    output file {log_file}\n")
                        new_lines.append("    format json\n")
                        new_lines.append("  }\n")
                        inserted_log = True
                        continue
                    if line.strip().startswith("reverse_proxy "):
                        if desired_upstream not in line:
                            new_lines.append(desired_proxy_line)
                            updated = True
                        else:
                            new_lines.append(line)
                    else:
                        new_lines.append(line)
                if updated:
                    caddyfile.write_text("".join(new_lines))
                    logger.info(f"Updated Caddyfile reverse_proxy to {desired_upstream}")
            except Exception:
                logger.warning("Failed to update Caddyfile; continuing without proxy update.", exc_info=True)

        # Detect whether proxy port is already in use
        proxy_listening = is_port_in_use(proxy_port, host="127.0.0.1")

        # Determine caddy binary
        caddy_bin = os.getenv("EVD_CADDY_BIN", "caddy")

        # Decide verbosity based on logger level
        verbose_mode = (log or helper_log).isEnabledFor(logging.DEBUG)
        run_kwargs: dict[str, Any] = {}
        if not verbose_mode:
            run_kwargs = {"stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL}

        # Best-effort: format the Caddyfile to avoid warnings
        try:
            subprocess.run([caddy_bin, "fmt", "--overwrite", str(caddyfile)], check=False, **run_kwargs)
        except Exception:
            logger.debug("Caddy fmt failed; continuing.", exc_info=True)

        if proxy_listening:
            # Best effort reload to pick up any config changes
            try:
                subprocess.run([caddy_bin, "reload", "--config", str(caddyfile)], check=False, **run_kwargs)
                logger.info(f"Caddy proxy appears to be running on :{proxy_port}; reload attempted.")
            except Exception:
                logger.debug("Caddy reload failed; ignoring.", exc_info=True)
            return

        # Start Caddy in background (managed by Caddy itself)
        try:
            subprocess.run([caddy_bin, "start", "--config", str(caddyfile)], check=False, **run_kwargs)
            # Wait for port to open
            if wait_for_server_start_cli(proxy_port, host="127.0.0.1", timeout=10):
                logger.info(f"Caddy proxy started and listening on :{proxy_port}")
            else:
                logger.warning(f"Caddy proxy did not become ready on :{proxy_port} within timeout")
        except FileNotFoundError:
            logger.warning("Caddy binary not found. Install with 'brew install caddy' to enable HTTPS proxy.")
        except Exception:
            logger.warning("Failed to start Caddy proxy.", exc_info=True)
    except Exception:
        # Never break CLI start/restart due to proxy management
        logger.debug("ensure_caddy_proxy_running encountered an error", exc_info=True)


# CLI entry point removed - consolidated into server/cli.py
# Helper functions remain for use by the main CLI


def cli_build_opts(url: str, output_template: str, extra_params: dict[str, Any] | None = None) -> dict[str, Any]:
    """
    Build download options for CLI operations.

    :param url: The URL to download.
    :param output_template: The output filename template.
    :param extra_params: Optional extra yt-dlp options.
    :return: yt-dlp options dictionary.
    """
    try:
        cfg = Config.load()

        # Robust to test mocks: use get_download_options if available, else fallback
        def _get_config_options(cfg: Any) -> dict[str, Any]:
            """Get download options from config."""

            def _raise_invalid_config():
                raise AttributeError("Invalid configuration format")  # noqa: TRY003, TRY301

            if hasattr(cfg, "get_download_options"):
                return cfg.get_download_options()
            if hasattr(cfg, "as_dict"):
                return cfg.as_dict().get("yt_dlp_options", {}).copy()
            if isinstance(cfg, dict):
                return cfg.get("yt_dlp_options", {}).copy()
            _raise_invalid_config()
            return {}  # Unreachable but satisfies type checker

        opts = _get_config_options(cfg)
        opts["outtmpl"] = output_template
        opts["urls"] = [url]
        protected_keys = {"format", "merge_output_format", "continuedl", "nopart", "progress", "noprogress"}
        if extra_params:
            # Handle filename_override special case
            if "filename_override" in extra_params:
                override_filename = extra_params.pop("filename_override")
                opts["outtmpl"] = str(Path(output_template).parent / override_filename)
            # Only add extra_params keys if not in protected_keys
            for k, v in extra_params.items():
                if k not in protected_keys:
                    opts[k] = v
    except Exception as e:
        helper_log.error(f"Failed to build download options: {e}")
        return {}
    else:
        return opts


# New function needed by serve.py
def is_server_running() -> bool:
    """Check if the server is currently running, respecting $LOCK_FILE override."""
    # Determine lock file path from environment or default
    lock_path_env = os.getenv("LOCK_FILE")
    lock_path = Path(lock_path_env) if lock_path_env else LOCK_FILE
    if not lock_path.exists():
        return False
    try:
        # Read the lock file to get the PID
        content = lock_path.read_text().strip()
        pid_str, _ = content.split(":", 1)
        pid = int(pid_str)
        # Check if the process exists
        if not psutil.pid_exists(pid):
            return False
        # Check if it's actually our server process
        proc = psutil.Process(pid)
        cmdline = proc.cmdline()
        # Determine if the process is our server
        if any("videodownloader-server" in arg for arg in cmdline):
            return True
        if any("server.__main__" in arg for arg in cmdline):
            return True
        # Detect python -m server invocation
        return bool("-m" in cmdline and "server" in cmdline and any("python" in arg.lower() for arg in cmdline))
    except Exception:
        return False


# New function needed by serve.py
def read_lock_file() -> dict[str, Any]:
    """
    Read and parse the lock file contents.

    Returns
    -------
    Dict[str, Any]
        Dictionary containing pid and port information.
    """
    if not LOCK_FILE.exists():
        return {"pid": None, "port": None}

    try:
        content = LOCK_FILE.read_text().strip()
        parts = content.split(":", 1)

        pid = int(parts[0]) if parts[0].isdigit() else None
        port = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None

    except Exception:
        return {"pid": None, "port": None}
    else:
        return {"pid": pid, "port": port}


def _match_server_process(proc: psutil.Process) -> bool:
    """Return True if process matches server invocation patterns."""
    try:
        cmdline = proc.cmdline()
    except Exception:
        return False
    return (
        any("videodownloader-server" in arg for arg in cmdline)
        or any("server.__main__" in arg for arg in cmdline)
        or ("-m" in cmdline and "server" in cmdline and any("python" in arg.lower() for arg in cmdline))
    )


def _read_locked_processes() -> list[psutil.Process]:
    """Read the lock file and return any matching server process."""
    procs: list[psutil.Process] = []
    if LOCK_FILE.exists():
        try:
            pid_str, _ = LOCK_FILE.read_text().split(":", 1)
            pid = int(pid_str)
            if psutil.pid_exists(pid):
                proc = psutil.Process(pid)
                if _match_server_process(proc):
                    procs.append(proc)
        except Exception:
            helper_log.debug("Failed reading locked process info from lock file", exc_info=True)
    return procs


def _scan_server_processes() -> list[psutil.Process]:
    """Scan all processes and return those matching server invocation patterns."""
    procs: list[psutil.Process] = []
    for proc in psutil.process_iter(["pid", "cmdline"]):
        try:
            if _match_server_process(proc):
                procs.append(proc)
        except (psutil.NoSuchProcess, psutil.AccessDenied):  # noqa: PERF203
            continue
    return procs


def find_server_processes() -> list[psutil.Process]:
    """
    Find all running server processes.

    Returns
    -------
    List of Process objects for the server.
    """
    # Orchestrate reading locked and scanning live processes
    locked = _read_locked_processes()
    scanned = _scan_server_processes()
    # Combine, avoiding duplicates
    proc_dict = {p.pid: p for p in locked}
    for p in scanned:
        proc_dict.setdefault(p.pid, p)
    # Exclude the current process
    current_pid = os.getpid()
    return [p for pid, p in proc_dict.items() if pid != current_pid]


# New function needed by serve.py
def find_available_port(start_port: int, end_port: int) -> int:
    """
    Find an available port in the specified range.

    Parameters
    ----------
    start_port : int
        The first port to check.
    end_port : int
        The last port to check.

    Returns
    -------
    int
        An available port number.

    Raises
    ------
    RuntimeError
        If no available port is found in the range.
    """
    count = _range_count(start_port, end_port)
    if count <= 0:
        # Invalid range, end must be >= start
        raise InvalidPortRangeError
    # Delegate to centralized implementation in server.utils for single source of truth
    return core_find_available_port(start_port, count, host="127.0.0.1")


# New function needed by serve.py
def run_gunicorn_server(port: int, workers: int, daemon: bool) -> None:
    """
    Run the server using Gunicorn WSGI server.

    Parameters
    ----------
    port : int
        Port to listen on.
    workers : int
        Number of worker processes.
    daemon : bool
        Whether to run in daemon mode.

    Returns
    -------
    None
    """
    try:

        class GunicornApp(gunicorn.app.base.BaseApplication):
            def __init__(self, app: Any, options: dict[str, Any] | None = None) -> None:
                self.options = options or {}
                self.application = app
                super().__init__()

            def load_config(self) -> None:
                if self.cfg is not None and hasattr(self.cfg, "settings"):
                    for key, value in self.options.items():
                        if key in self.cfg.settings and value is not None and hasattr(self.cfg, "set"):
                            self.cfg.set(key.lower(), value)

            def load(self) -> Any:
                return self.application

        config = Config.load()
        app = create_app(config)

        # Resolve a single log file path and wire Gunicorn to it by default
        from .logging_setup import resolve_log_path

        project_root = Path(__file__).parent.parent
        env_log = os.getenv("LOG_FILE")
        cfg_log = config.get_value("log_path")
        log_path = resolve_log_path(project_root, env_log, cfg_log, purpose="manage")

        options = {
            "bind": f"127.0.0.1:{port}",
            "workers": workers,
            "daemon": daemon,
            "accesslog": str(log_path),
            "errorlog": str(log_path),
            "loglevel": "info",
        }

        GunicornApp(app, options).run()
    except ImportError:
        click.echo("Gunicorn is not installed. Please install it with: pip install gunicorn")
        sys.exit(1)


# New function needed by serve.py
def get_config_value(key: str, default: Any = None) -> Any:
    """
    Get a value from the configuration.

    Parameters
    ----------
    key : str
        The configuration key to retrieve.
    default : Any, optional
        Default value if the key is not found.

    Returns
    -------
    Any
        The configuration value or default.
    """
    config = Config.load()
    return config.get_value(key, default)


# New function needed by serve.py
def set_config_value(key: str, value: Any) -> None:
    """
    Set a value in the configuration and save it.

    Parameters
    ----------
    key : str
        The configuration key to set.
    value : Any
        The value to set.

    Returns
    -------
    None
    """
    config = Config.load()
    config.update_config({key: value})


# Helpers extracted from resume_failed_downloads to reduce cyclomatic complexity


def _compute_failed_download_ids(
    download_ids: list[str],
    history_items: list[dict[str, Any]],
    log: logging.Logger,
) -> list[str]:
    """Compute list of failed download IDs to resume."""
    if not download_ids:
        computed = [
            url for item in history_items if item.get("status") == "error" and (url := item.get("url")) is not None
        ]
        if not computed:
            log.info("No failed downloads found in history to resume.")
        return computed
    return download_ids


def _reorder_download_ids(download_ids: list[str], order: str) -> list[str]:
    """Reorder download IDs based on the specified order."""
    return list(download_ids)[::-1] if order == "newest" else download_ids


def _report_failed_summary(resumed: int, failed: int, non_resumable: list[str], log: logging.Logger) -> None:
    """Log a summary of resumed vs failed downloads."""
    log.info(f"Finished attempting to resume failed downloads. Resumed: {resumed}, Failed: {failed}.")
    if non_resumable:
        log.warning(f"Non-resumable downloads: {non_resumable}")


# Helpers extracted from resume_incomplete_downloads to reduce cyclomatic complexity


def _determine_scan_target(download_dir: Path, scan_dir_override: Path | None) -> Path:
    """Return the directory to scan for incomplete downloads."""
    return scan_dir_override if scan_dir_override else download_dir


def _filter_incomplete_files(scan_dir: Path, log: logging.Logger) -> list[Path]:
    """Validate scan directory and return list of part files to process."""
    if not validate_scan_directory(scan_dir, log):
        return []
    return get_part_files(scan_dir)


def _report_incomplete_summary(resumed: int, errors: int, non_resumable: list[str], log: logging.Logger) -> None:
    """Log summary of resume operations for incomplete downloads."""
    log.info(f"Finished scanning for incomplete downloads. Resumed: {resumed}, Errors/Skipped: {errors}.")
    if non_resumable:
        log.warning(f"Non-resumable part files: {non_resumable}")


def build_extension_scripts(project_root: Path, log: logging.Logger) -> None:
    """
    Build the Chrome extension assets before server start.

    Runs 'npm run build:extension' in the project root.
    Exits on failure.
    """
    log.info("Building extension scripts...")
    try:
        subprocess.run(["npm", "run", "build:extension"], cwd=str(project_root), check=True)
        log.info("Extension build complete.")
    except subprocess.CalledProcessError as e:
        log.exception(f"Extension build failed with exit code {e.returncode}. Aborting server start.")
        sys.exit(e.returncode)


def configure_console_logging(verbose: bool, log: logging.Logger) -> None:
    """
    Configure root and helper logger levels based on verbose flag.

    Sets DEBUG if verbose, INFO otherwise.
    """
    from server.logging_setup import setup_logging

    if verbose:
        setup_logging(log_level="DEBUG")
        log.setLevel(logging.DEBUG)
        log.info("Verbose logging enabled")
    else:
        setup_logging(log_level="INFO")
        log.setLevel(logging.INFO)
        log.info("Console logging set to warnings and errors only")


def derive_server_settings(
    cfg: Config,
    host: str | None,
    port: int | None,
    download_dir: str | None,
    project_root: Path,
    log: logging.Logger,
) -> tuple[str, int, str]:
    """
    Derive effective server settings from config and CLI arguments.

    Parameters
    ----------
    cfg : Config
        Configuration object.
    host : Optional[str]
        Host override from CLI.
    port : Optional[int]
        Port override from CLI.
    download_dir : Optional[str]
        Download directory override from CLI.
    project_root : Path
        Project root directory.
    log : logging.Logger
        Logger instance.

    Returns
    -------
    Tuple[str, int, str]
        effective_host, effective_port, effective_download_dir
    """
    # Determine host
    current_host = cfg.get_value("server_host") or "127.0.0.1"
    effective_host = host or current_host
    # Determine port
    current_port = cfg.get_value("server_port") or DEFAULT_SERVER_PORT
    effective_port = port or current_port
    # Determine download directory
    current_dl = cfg.get_value("download_dir")
    if download_dir:
        path = Path(download_dir).expanduser().resolve()
        path.mkdir(parents=True, exist_ok=True)
        effective_dl = str(path)
    elif current_dl:
        effective_dl = current_dl
    else:
        # Check if we're in a test environment to prevent junk folder creation
        # Only use temp dir for actual test runs, not for unit tests that expect default behavior
        is_test_environment = (
            any("pytest" in arg for arg in sys.argv)
            and "PYTEST_CURRENT_TEST" in os.environ
            and not any("test_" in arg for arg in sys.argv)  # Don't use temp for unit tests
        )

        if is_test_environment:
            # Use a temporary directory for tests to prevent junk folders
            # Explicitly specify the system temp directory to avoid creating folders in project root
            temp_dir = Path(tempfile.gettempdir())
            default_dl = Path(tempfile.mkdtemp(prefix="test_downloads_", dir=temp_dir))
            log.info(f"Test environment detected, using temporary download directory: '{default_dl}'")
        else:
            default_dl = project_root / "user_downloads"
            default_dl.mkdir(parents=True, exist_ok=True)
            log.info(f"Download directory not specified, defaulting to '{default_dl}'")

        effective_dl = str(default_dl)
    return effective_host, effective_port, effective_dl


def handle_existing_instance(
    lock_file_path: Path,
    host: str,
    port: int,
    force: bool,
    log: logging.Logger,
) -> None:
    """
    Check for an existing server instance and handle it.

    If an instance is running on the same host and port, stops it if force=True,
    otherwise exits the program.
    """
    pid_port = get_lock_pid_port_cli(lock_file_path)
    in_use = is_port_in_use(port, host)
    if not pid_port:
        return
    existing_pid, existing_port = pid_port
    try:
        proc = psutil.Process(existing_pid)
        running = proc.is_running()
    except psutil.NoSuchProcess:
        running = False
        log.warning(f"Found stale lock file for PID {existing_pid}")
        remove_lock_file_cli()
    if running and existing_port == port and in_use:
        if force:
            log.warning(f"Stopping existing server on {host}:{port} (PID {existing_pid})")
            kill_processes_cli([proc])
            time.sleep(2)
            remove_lock_file_cli()
            if is_port_in_use(port, host):
                log.error("Failed to free port after stopping existing process.")
                sys.exit(1)
        else:
            log.error(f"Server already running on {host}:{port} (PID {existing_pid})")
            sys.exit(1)


# Maintenance subtask helpers
def _maintenance_resume_incomplete(download_dir: Path | None, log: logging.Logger) -> None:
    """Attempt to resume incomplete downloads as part of maintenance."""
    log.info("Attempting to resume incomplete downloads as part of maintenance...")
    if download_dir is None:
        log.warning("Download directory not configured, skipping incomplete downloads resume")
        return
    try:
        resume_incomplete_downloads(download_dir, download_dir, log)
    except Exception:
        log.exception("Maintenance Error: Could not resume incomplete downloads")


def _maintenance_resume_failed(download_dir: Path | None, log: logging.Logger) -> None:
    """Attempt to resume failed downloads from history as part of maintenance."""
    log.info("Attempting to resume failed downloads from history as part of maintenance...")
    if download_dir is None:
        log.warning("Download directory not configured, skipping failed downloads resume")
        return
    try:
        resume_failed_downloads([], download_dir, cli_build_opts, log)
    except Exception:
        log.exception("Maintenance Error: Could not resume failed downloads")


def _maintenance_clear_history(log: logging.Logger) -> None:
    """Clear the download history file."""
    log.info("Attempting to clear download history...")
    try:
        if HISTORY_PATH.exists():
            HISTORY_PATH.write_text("[]")
            log.info(f"Download history cleared from {HISTORY_PATH}")
        else:
            log.info(f"History file {HISTORY_PATH} not found. Nothing to clear.")
    except Exception:
        log.exception("Error clearing download history")


def _maintenance_clear_cache(download_dir: Path | None, log: logging.Logger) -> None:
    """Clear temporary cache files (.part and .ytdl) from download directory."""
    log.info("Attempting to clear temporary cache files...")
    count_part, count_ytdl = 0, 0
    if download_dir:
        for part_file in download_dir.rglob("*.part"):
            try:
                part_file.unlink()
                count_part += 1
            except Exception:  # noqa: PERF203
                log.debug(f"Failed to remove part file: {part_file}", exc_info=True)
        for ytdl_file in download_dir.rglob("*.ytdl"):
            try:
                ytdl_file.unlink()
                count_ytdl += 1
            except Exception:  # noqa: PERF203
                log.debug(f"Failed to remove ytdlp temp file: {ytdl_file}", exc_info=True)
    log.info(f"Cleared {count_part} .part files and {count_ytdl} .ytdl files from {download_dir}.")


def perform_system_maintenance(
    download_dir: Path | None,
    resume_incomplete: bool,
    resume_failed: bool,
    clear_history_flag: bool,
    clear_cache_flag: bool,
    log: logging.Logger,
) -> None:
    """
    Perform system maintenance tasks based on flags.

    Parameters
    ----------
    download_dir : Optional[Path]
        Directory where downloads are stored.
    resume_incomplete : bool
        Whether to resume incomplete downloads.
    resume_failed : bool
        Whether to resume failed downloads from history.
    clear_history_flag : bool
        Whether to clear download history.
    clear_cache_flag : bool
        Whether to clear temporary cache files.
    log : logging.Logger
        Logger for informational and error messages.
    """
    # Resume incomplete downloads
    if resume_incomplete and download_dir:
        _maintenance_resume_incomplete(download_dir, log)

    # Resume failed downloads
    if resume_failed and download_dir:
        _maintenance_resume_failed(download_dir, log)

    # Clear download history
    if clear_history_flag:
        _maintenance_clear_history(log)

    # Clear temporary cache files
    if clear_cache_flag and download_dir:
        _maintenance_clear_cache(download_dir, log)

    log.info("System maintenance finished.")


# CLI entry point removed - consolidated into server/cli.py
