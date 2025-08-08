#!/usr/bin/env python3
"""Entry point for the Enhanced Video Downloader Flask server."""

import atexit
import logging
import os
import signal
import socket
import sys
import threading
import time
import types  # For FrameType
from contextlib import closing
from pathlib import Path
from typing import TextIO

import psutil  # Requires pip installation if not already available
from flask import Flask

from server import create_app
from server.config import Config
from server.downloads import progress_data, progress_lock
from server.lock import cleanup_lock_file, create_lock_file, get_lock_file_path

# Import port-finding utility from legacy module
from server.utils import find_available_port

# Configure logging
logger = logging.getLogger(__name__)

# Flag to track graceful shutdown in progress
_shutdown_in_progress = False
# Track active download processes
_active_download_processes: "set[psutil.Process]" = set()
# Lock for modifying the active processes set
_process_lock = threading.Lock()


def register_download_process(process: psutil.Process) -> None:
    """
    Register an active download process for tracking.

    Parameters
    ----------
    process : psutil.Process
        Process object to register for tracking.

    Returns
    -------
    None
        This function does not return a value.
    """
    with _process_lock:
        _active_download_processes.add(process)


def unregister_download_process(process: psutil.Process) -> None:
    """
    Remove a completed download process from tracking.

    Parameters
    ----------
    process : psutil.Process
        Process object to remove from tracking.

    Returns
    -------
    None
        This function does not return a value.
    """
    with _process_lock:
        _active_download_processes.discard(process)


def graceful_shutdown(sig: int | None = None, _frame: types.FrameType | None = None) -> None:
    """
    Handle graceful shutdown when receiving termination signals.

    This function ensures:
    1. Active downloads are aborted properly
    2. State is saved
    3. Resources are cleaned up
    """
    global _shutdown_in_progress  # noqa: PLW0603

    if _shutdown_in_progress:
        # Prevent multiple shutdown handlers from running simultaneously
        sys.exit(0)

    _shutdown_in_progress = True

    signal_name = "UNKNOWN"
    if sig == signal.SIGINT:
        signal_name = "SIGINT (Ctrl+C)"
    elif sig == signal.SIGTERM:
        signal_name = "SIGTERM"

    logger.info(f"Received {signal_name}. Initiating graceful shutdown...")

    # Save current progress state
    save_download_state()

    # Terminate active downloads
    terminate_active_downloads()

    # Clean up any .part files from aborted downloads
    cleanup_part_files()

    # Let the process exit normally now that we've cleaned up
    logger.info("Graceful shutdown complete. Exiting.")
    sys.exit(0)


def save_download_state() -> None:
    """
    Save the current download progress state.

    Logs the status of all active downloads for debugging purposes.
    In a future implementation, this could persist state to disk.

    Returns
    -------
    None
        This function does not return a value.
    """
    try:
        with progress_lock:
            if progress_data:
                logger.info(f"Saving state for {len(progress_data)} active downloads")
                # Save the state - could write to a file for persistence if needed
                # For now we just log it, as the built-in history mechanism should capture completed downloads
                for download_id, data in progress_data.items():
                    logger.info(f"Download {download_id} status: {data.get('status', 'unknown')}")
    except Exception:
        logger.exception("Error saving download state")


def cleanup_part_files() -> None:
    """
    Clean up partial download files (.part) left by aborted downloads.

    Scans the configured download directory for .part files and removes them.
    This prevents accumulation of incomplete download artifacts.

    Returns
    -------
    None
        This function does not return a value.
    """
    try:
        # Get download directory from config
        cfg = Config.load()
        download_dir = cfg.get_value("download_dir")

        if not download_dir:
            logger.warning("No download directory configured, skipping .part file cleanup")
            return

        download_path = Path(download_dir)
        if not download_path.exists():
            logger.warning(f"Download directory {download_dir} does not exist, skipping .part file cleanup")
            return

        # Collect all .part files for cleanup
        part_files = list(download_path.glob("*.part"))
        if part_files:
            logger.info(f"Found {len(part_files)} .part files to clean up")
            _remove_part_files(part_files)
        else:
            logger.debug("No .part files found for cleanup")
    except Exception:
        logger.exception("Error during .part file cleanup")


def _remove_part_files(part_files: "list[Path]") -> None:
    """
    Remove a list of partial download files.

    Parameters
    ----------
    part_files : List[Path]
        List of .part file paths to remove.

    Returns
    -------
    None
        This function does not return a value.
    """
    for part_file in part_files:
        try:
            logger.debug(f"Removing partial download file: {part_file}")
            part_file.unlink()
        except Exception as e:  # noqa: PERF203
            logger.warning(f"Failed to remove {part_file}: {e}")


def find_orphaned_processes(port: int) -> "list[int]":
    """
    Find any process that might be using our target port.

    Returns a list of process IDs (PIDs) using the specified port.
    """
    orphaned_pids: list[int] = []
    try:
        for proc in psutil.process_iter(["pid", "name", "cmdline"]):
            try:
                if _is_potential_server_process(proc) and _process_uses_port(proc, port):
                    orphaned_pids.append(proc.info["pid"])
            except (psutil.NoSuchProcess, psutil.AccessDenied):  # noqa: PERF203
                continue
    except Exception:
        logger.debug("Error while scanning processes for orphaned PIDs", exc_info=True)
    return orphaned_pids


# Helper functions for find_orphaned_processes
def _is_potential_server_process(proc: psutil.Process) -> bool:
    """
    Check if a process is likely to be our server process.

    Parameters
    ----------
    proc : psutil.Process
        Process to check.

    Returns
    -------
    bool
        True if the process appears to be our server, False otherwise.
    """
    proc_name = proc.info["name"].lower()
    if "python" not in proc_name:
        return False
    cmdlines = proc.info["cmdline"]
    return any("server" in cmd.lower() for cmd in cmdlines if cmd)


def _process_uses_port(proc: psutil.Process, port: int) -> bool:
    """
    Check if a process is using the specified port.

    Parameters
    ----------
    proc : psutil.Process
        Process to check.
    port : int
        Port number to check for.

    Returns
    -------
    bool
        True if the process is using the port, False otherwise.
    """
    return any(conn.laddr.port == port for conn in proc.net_connections(kind="inet"))


def kill_process(pid: int) -> bool:
    """
    Attempt to kill a process by PID, first gracefully then forcefully.

    Args:
        pid: Process ID to kill

    Returns:
        True if the kill was successful, False otherwise
    """
    try:
        proc = psutil.Process(pid)
        " ".join(proc.cmdline())

        # Try to terminate gracefully first
        proc.terminate()
        try:
            proc.wait(timeout=3)  # Wait up to 3 seconds for graceful termination
        except psutil.TimeoutExpired:
            # If still running after timeout, force kill
            proc.kill()
    except (psutil.NoSuchProcess, psutil.AccessDenied, PermissionError):
        return False
    else:
        return True


# Helpers to support terminate_active_downloads and reduce complexity
def _get_active_download_processes() -> "list[psutil.Process]":
    """Return a list of currently registered active download processes."""
    with _process_lock:
        return list(_active_download_processes)


def _terminate_download_processes_gracefully(procs: "list[psutil.Process]") -> None:
    """Send SIGTERM to active download processes."""
    for proc in procs:
        try:
            if proc.is_running():
                logger.debug(f"Sending SIGTERM to process {proc.pid}")
                proc.terminate()
        except Exception as e:  # noqa: PERF203
            logger.debug(f"Error terminating process {proc.pid}: {e}")


def _wait_for_processes_to_terminate(_procs: "list[psutil.Process]", interval: float = 0.1, retries: int = 20) -> None:
    """Wait for up to retries*interval seconds for processes to stop."""
    for _ in range(retries):
        # Check shared set under lock to account for unregistering
        with _process_lock:
            if not any(proc.is_running() for proc in _active_download_processes):
                return
        time.sleep(interval)


def _kill_download_processes(procs: "list[psutil.Process]") -> None:
    """Force kill any remaining active download processes."""
    for proc in procs:
        try:
            logger.debug(f"Sending SIGKILL to process {proc.pid}")
            proc.kill()
        except Exception as e:  # noqa: PERF203
            logger.debug(f"Error killing process {proc.pid}: {e}")


def terminate_active_downloads() -> None:
    """
    Terminate any active download processes.

    Attempts to do this gracefully first, then forcefully if needed.
    """
    try:
        procs = _get_active_download_processes()
        count = len(procs)
        if count == 0:
            logger.info("No active download processes to terminate")
            return
        logger.info(f"Terminating {count} active download processes")
        _terminate_download_processes_gracefully(procs)
        logger.debug("Waiting for processes to terminate gracefully...")
        _wait_for_processes_to_terminate(procs)
        _kill_download_processes(procs)
        logger.info("All download processes terminated")
    except Exception:
        logger.exception("Error terminating download processes")


# Helpers extracted from main() to reduce cyclomatic complexity


def _register_signal_handlers() -> None:
    """Register SIGINT and SIGTERM to trigger graceful shutdown."""
    signal.signal(signal.SIGINT, graceful_shutdown)
    signal.signal(signal.SIGTERM, graceful_shutdown)


def _cleanup_orphaned_processes(port: int) -> None:
    """Detect and kill orphaned server processes using the target port."""
    try:
        orphaned_pids = find_orphaned_processes(port)
        if orphaned_pids:
            for pid in orphaned_pids:
                if pid != os.getpid():
                    kill_process(pid)
    except Exception:
        logger.debug("Failed during orphaned process cleanup", exc_info=True)


def _prepare_server_lock(cfg: Config, host: str, port: int) -> "tuple[TextIO, int]":
    """
    Check port availability, update config if changed, create lock file.

    Returns tuple(lock_handle, final_port).
    """
    final_port = port
    try:
        with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            if sock.connect_ex((host, port)) == 0:
                final_port = find_available_port(port + 1, 99, host=host)
                if final_port != port:
                    cfg.set("server_port", final_port)
                    cfg.save()
                else:
                    logger.debug("No alternative port available despite conflict")
    except Exception:
        logger.debug("Error preparing server lock/port", exc_info=True)
    lock_path = get_lock_file_path()
    lock_handle = create_lock_file(lock_path, final_port)
    return lock_handle, final_port


def _run_flask_server(cfg: Config, host: str, port: int, lock_handle: TextIO) -> None:
    """Create app and run Flask server with lock cleanup registered."""
    # Clean up lock on startup (and register for cleanup at exit)
    cleanup_lock_file(lock_handle)
    atexit.register(cleanup_lock_file, lock_handle)
    app = create_app(cfg)
    app.run(host=host, port=port, debug=False, use_reloader=False)


# End of extracted helpers


def main(production: bool = False) -> Flask | None:
    """
    Run the Enhanced Video Downloader server.

    Args:
        production: If True, assume running under Gunicorn/WSGI server
                   If False, run using Flask's built-in server
    """
    # Register signal handlers for graceful shutdown
    if not production:
        _register_signal_handlers()

    # Load configuration
    cfg = Config.load()  # Corrected: load() takes no arguments, uses Config.CONFIG_PATH

    host = cfg.server_host
    port = cfg.server_port

    # When not in production mode, handle process management
    if not production:
        # Find and kill any orphaned server processes using our port
        _cleanup_orphaned_processes(port)

        # Acquire lock file
        lock_handle, final_port = _prepare_server_lock(cfg, host, port)

        # Start periodic cleanup of .part files
        # Automatic .part file cleanup has been disabled.
        # Use the 'resume incomplete' CLI or API command to scan and resume partial downloads instead.

        # Now create lock file with the final_port
        _run_flask_server(cfg, host, final_port, lock_handle)
        return None
    # In production mode (under Gunicorn/WSGI), just create and return the app
    return create_app(cfg)


# WSGI entry point for Gunicorn
application = main(production=True)

if __name__ == "__main__":
    main()
