"""
Provide utility functions for Enhanced Video Downloader server operations.

This module offers helper functions for cookie path detection, domain extraction,
filename sanitization, path safety checks, port discovery, and caching.
"""

import errno
import logging
import re
import socket
import sys
import time
from collections.abc import Callable
from contextlib import closing
from functools import wraps
from pathlib import Path
from typing import Any, ParamSpec, TypeVar
from urllib.parse import urlparse

# It's better to get the logger from the current Flask app context if used within
# request handlers, or pass it as an argument. For a utils module, a module-level
# logger is fine.
log = logging.getLogger(__name__)

P = ParamSpec("P")
T = TypeVar("T")

# Cache for frequently accessed data
_cache: dict[str, Any] = {}
_cache_timestamps: dict[str, float] = {}
_cache_ttl = 300  # 5 minutes default TTL


def cache_result(ttl_seconds: int = 300) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """
    Cache function results with TTL.

    Args:
        ttl_seconds: Time to live for cached results in seconds

    Returns:
        Decorated function with caching
    """

    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            # Create cache key from function name and arguments
            cache_key = f"{func.__name__}:{hash(str(args) + str(sorted(kwargs.items())))}"

            # Check if cached result exists and is still valid
            current_time = time.time()
            if (
                cache_key in _cache
                and cache_key in _cache_timestamps
                and current_time - _cache_timestamps[cache_key] < ttl_seconds
            ):
                log.debug(f"Cache hit for {func.__name__}")
                return _cache[cache_key]

            # Execute function and cache result
            result = func(*args, **kwargs)
            _cache[cache_key] = result
            _cache_timestamps[cache_key] = current_time

            log.debug(f"Cache miss for {func.__name__}, cached result")
            return result

        return wrapper

    return decorator


def clear_cache() -> None:
    """Clear all cached data."""
    _cache.clear()
    _cache_timestamps.clear()
    log.info("Cache cleared")


def get_cache_stats() -> dict[str, Any]:
    """Get cache statistics."""
    return {
        "cache_size": len(_cache),
        "cache_keys": list(_cache.keys()),
        "oldest_entry": min(_cache_timestamps.values()) if _cache_timestamps else None,
        "newest_entry": max(_cache_timestamps.values()) if _cache_timestamps else None,
    }


def cleanup_expired_cache() -> int:
    """
    Remove expired cache entries.

    Returns:
        Number of entries removed
    """
    current_time = time.time()
    expired_keys = [key for key, timestamp in _cache_timestamps.items() if current_time - timestamp > _cache_ttl]

    for key in expired_keys:
        del _cache[key]
        del _cache_timestamps[key]

    if expired_keys:
        log.debug(f"Cleaned up {len(expired_keys)} expired cache entries")

    return len(expired_keys)


def get_chrome_cookies_path() -> str:
    """
    Get Chrome cookies parent directory path based on OS.

    Determine the appropriate profile directory path containing the 'Cookies'
    database for Chrome on different operating systems.

    Returns
    -------
    str
        Path to Chrome's profile directory for cookies, or empty string if unsupported OS.
    """
    if sys.platform == "darwin":  # macOS
        # Common path is ~/Library/Application Support/Google/Chrome/
        # Profile is often 'Default' or 'Profile X' inside this.
        return str(Path("~/Library/Application Support/Google/Chrome/").expanduser())
    if sys.platform == "win32":  # Windows
        # Common path is ~/AppData/Local/Google/Chrome/User Data/
        return str(Path("~/AppData/Local/Google/Chrome/User Data/").expanduser())
    if sys.platform.startswith("linux"):  # Linux
        # Common path is ~/.config/google-chrome/
        return str(Path("~/.config/google-chrome/").expanduser())
    log.warning(f"Unsupported OS for Chrome cookie path detection: {sys.platform}")
    return ""


def extract_domain(url: str) -> str:
    """
    Extract hostname from a URL.

    Parameters
    ----------
    url : str
        URL string to extract hostname from.

    Returns
    -------
    str
        Extracted hostname or empty string if extraction fails.
    """
    if not url:
        return ""
    try:
        parsed = urlparse(url)
    except Exception:
        return ""
    else:
        return parsed.hostname or ""


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to remove or replace harmful characters.

    Parameters
    ----------
    filename : str
        The filename string to sanitize.

    Returns
    -------
    str
        A sanitized filename safe for filesystem use.
    """
    if not filename:
        return "default_filename"  # Return a default for None or empty input

    # Normalize unicode characters (e.g., accents, special symbols) to their

    # Replace path components and directory traversal attempts first
    filename = filename.replace("..", "_")  # Replace with underscore, not remove, to avoid merging parts
    # Replace forward slash and single backslash characters
    filename = filename.replace("/", "_").replace("\\", "_")

    # Remove leading/trailing slashes, backslashes, and a wider range of
    # whitespace
    # (already handled by replacing / and \\\\ above, but strip keeps general
    # whitespace clean)
    whitespace_chars = "\t\n\r\x0b\x0c "
    filename = filename.strip(whitespace_chars)  # POSIX whitespace

    # Define a set of invalid characters for Windows and a more minimal set for
    # Unix-like.

    # \\ is problematic on Windows (already replaced).
    invalid_chars_pattern = r'[<>:"|?*\x00-\x1F]'  # Removed / and \\ as they are handled
    filename = re.sub(invalid_chars_pattern, "_", filename)

    # Replace multiple consecutive underscores (or other replacement characters)
    # with a single one.
    filename = re.sub(r"_+", "_", filename)

    # Remove leading/trailing underscores that might result from replacements
    # or original input.
    filename = filename.strip("_")

    # Limit overall length to prevent issues with filesystem limits
    # (e.g., 200 characters is a safe bet).
    # This should be applied *after* major transformations to avoid cutting
    # off important parts.
    # However, if the original title is extremely long, sanitizing it first
    # and then truncating is better.
    max_len = 200
    if len(filename) > max_len:
        # Try to preserve extension if present, though yt-dlp adds its own via %(ext)s
        base, dot, ext = filename.rpartition(".")
        if dot and len(ext) < 10:  # Simple check for a plausible extension
            available_len_for_base = max_len - len(ext) - 1  # -1 for the dot
            filename = filename[:max_len] if available_len_for_base < 1 else base[:available_len_for_base] + dot + ext
        else:
            filename = filename[:max_len]

        # After truncation, it might end with an underscore again
        filename = filename.strip("_")

    # Ensure filename is not empty or just underscores after all sanitization.
    # If it is, provide a sensible default.
    if not filename or re.fullmatch(r"_*", filename):
        return "default_video_title"  # More descriptive than "sanitized_empty_filename"

    return filename


def is_safe_path(base_path: Path, target_path: Path) -> bool:
    """
    Check if a target path is within a base path without traversal.

    Parameters
    ----------
    base_path : Path
        The root directory that should contain the target path.
    target_path : Path
        The path to check for containment within the base path.

    Returns
    -------
    bool
        True if the target path is safely within the base path, False otherwise.
    """
    try:
        # Ensure base_path is an absolute path and exists
        resolved_base = base_path.resolve(strict=True)

        # Resolve target_path. It might not exist yet (e.g., an output file).
        # We are checking if its intended location is within the base path.
        resolved_target = target_path.resolve()

        # Check if resolved_target is relative to resolved_base
        # For Python 3.8 compatibility, use try/except instead of is_relative_to
        try:
            resolved_target.relative_to(resolved_base)
        except ValueError:
            return False
        else:
            return True
    except FileNotFoundError:
        # This can happen if base_path does not exist (strict=True)
        log.warning(f"Path safety check failed: Base path {base_path} not found.")
        return False
    except Exception as e:
        error_msg = f"Path safety check failed: {e}. Base: {base_path}, Target: {target_path}"
        log.warning(error_msg)
        return False


def newest_file(folder: Path) -> Path | None:
    """
    Get the newest file in a directory.

    Parameters
    ----------
    folder : Path
        Directory to search for files.

    Returns
    -------
    Optional[Path]
        The most recently modified file in the directory, or None if the folder
        is empty or not a directory.
    """
    if not folder.is_dir():  # folder is already known to be Path from type hint
        return None

    # Ensure we only consider files
    files = [p for p in folder.iterdir() if p.is_file()]

    if not files:
        return None

    return max(files, key=lambda p: p.stat().st_mtime)


def find_available_port(start_port: int, count: int, host: str = "127.0.0.1") -> int:
    """
    Find an available TCP port within a range on a given host.

    Parameters
    ----------
    start_port : int
        The first port to check.
    count : int
        The number of ports to check from start_port.
    host : str, optional
        Host address for checking port availability, by default '127.0.0.1'.

    Returns
    -------
    int
        An available port number within the specified range.

    Raises
    ------
    RuntimeError
        If no available port is found in the given range.
    """
    for port_offset in range(count):
        port = start_port + port_offset
        try:
            with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
                # Set SO_REUSEADDR to allow quick restarts of the server
                sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                sock.bind((host, port))
                # If bind is successful, the port is available
                return port
        except OSError as e:
            # If error is EADDRINUSE (Address already in use), try next port
            if e.errno == errno.EADDRINUSE:
                log.debug(f"Port {port} on host {host} is already in use.")
                continue
            # For other socket errors, re-raise the exception
            error_msg = f"Socket error when checking port {port} on host {host}: {e}"
            log.exception(error_msg)
            raise  # Or handle more gracefully depending on requirements

    # If loop completes, no port was found
    msg = f"No available port found in range {start_port}-{start_port + count - 1} on host {host}."
    log.error(msg)
    raise RuntimeError(msg)
