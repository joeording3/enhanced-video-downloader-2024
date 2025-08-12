"""
Manage server lock files.

This module provides functions to create, release, and read lock files
containing process and port information.
"""

import fcntl
import os
from pathlib import Path
from typing import TextIO  # Add TextIO


# Update the default lock file path to use the data directory
def get_lock_file_path() -> Path:
    """
    Get the path to the server lock file.

    Returns
    -------
    Path
        Path to the server lock file.
    """
    data_dir = Path(__file__).parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / "server.lock"


def create_lock_file(lock_path: Path, port: int) -> TextIO:
    """
    Acquire exclusive lock and write PID and port.

    Write the current process PID and specified port to a lock file.

    Parameters
    ----------
    lock_path : Path
        Path to the lock file to create and lock.
    port : int
        Port number to record in the lock file.

    Returns
    -------
    TextIO
        File handle for the lock file, to be released later.

    Raises
    ------
    SystemExit
        If another process holds the lock.
    """
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    fh = lock_path.open("w")
    try:
        fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
        fh.write(f"{os.getpid()}:{port}")  # Write PID:PORT
        fh.flush()
    except OSError:
        fh.close()  # Ensure file handle is closed on error
        raise
    else:
        return fh


def cleanup_lock_file(fh: TextIO) -> None:
    """
    Release lock and remove the lock file.

    Parameters
    ----------
    fh : TextIO
        File handle of the locked lock file.

    Returns
    -------
    None
        This function does not return a value.
    """
    try:
        fcntl.flock(fh, fcntl.LOCK_UN)
        path = Path(fh.name)
        fh.close()
        path.unlink(missing_ok=True)
    except Exception:
        # Best-effort cleanup; nothing critical to do on failure
        try:
            import logging

            logging.getLogger(__name__).debug("Lock cleanup failed", exc_info=True)
        except Exception:
            # As a last resort, remain silent
            ...


def get_lock_pid(lock_path: Path) -> int | None:
    """
    Read PID from lock file.

    Parameters
    ----------
    lock_path : Path
        Path to the lock file.

    Returns
    -------
    Optional[int]
        PID extracted from the lock file, or None if unavailable.
    """
    if lock_path.exists():
        try:
            content = lock_path.read_text().strip()
            if ":" in content:
                pid_str, _ = content.split(":", 1)
                if pid_str.isdigit():
                    return int(pid_str)
        except Exception:
            # If parsing fails, return None gracefully
            return None
    return None


def get_lock_pid_port(lock_path: Path) -> tuple[int, int] | None:
    """
    Read PID and port from lock file.

    Parameters
    ----------
    lock_path : Path
        Path to the lock file.

    Returns
    -------
    Optional[Tuple[int, int]]
        Tuple of (PID, port) extracted from lock file, or None if unavailable.
    """
    if lock_path.exists():
        try:
            content = lock_path.read_text().strip()
            if ":" in content:
                pid_str, port_str = content.split(":", 1)
                if pid_str.isdigit() and port_str.isdigit():
                    return int(pid_str), int(port_str)
        except Exception:
            return None
    return None


def remove_lock_file(lock_path: Path | None = None) -> None:
    """
    Remove the lock file if it exists.

    Parameters
    ----------
    lock_path : Optional[Path]
        Path to the lock file. If None, a default path is used.

    Returns
    -------
    None
        This function does not return a value.
    """
    if lock_path is None:
        # Use the default path from get_lock_file_path
        lock_path = get_lock_file_path()

    try:
        if lock_path.exists():
            lock_path.unlink()
    except (PermissionError, FileNotFoundError):
        # Ignore missing or permission issues on removal
        return
