import errno
import socket
import sys
import time
from pathlib import Path
from typing import Any

import pytest

from server.constants import get_server_port
from server.utils import (
    extract_domain,
    find_available_port,
    get_chrome_cookies_path,
    is_safe_path,
    newest_file,
    sanitize_filename,
)


def test_extract_domain_valid() -> None:
    """Test extract_domain returns correct hostnames for valid URLs."""
    assert extract_domain("https://example.com/path") == "example.com"
    assert extract_domain("http://sub.example.co.uk") == "sub.example.co.uk"


def test_extract_domain_empty_or_invalid() -> None:
    """Test extract_domain handles empty or invalid URLs."""
    assert extract_domain("") == ""
    assert extract_domain("not a url") == ""


def test_sanitize_filename_basic() -> None:
    """Test sanitize_filename basic sanitization of filenames."""
    assert sanitize_filename("normal_filename.mp4") == "normal_filename.mp4"
    # dangerous patterns
    assert sanitize_filename("..//bad\\path*?name") == "bad_path_name"


def test_sanitize_filename_empty() -> None:
    """Test sanitize_filename returns defaults for empty or underscore-only filenames."""
    # empty input
    assert sanitize_filename("") == "default_filename"
    # only underscores
    assert sanitize_filename("___") == "default_video_title"


def test_sanitize_filename_long() -> None:
    """Test sanitize_filename truncates long filenames appropriately."""
    long_name = "a" * 300 + ".ext"
    sanitized = sanitize_filename(long_name)
    assert len(sanitized) <= 200
    assert sanitized.endswith(".ext")


def test_is_safe_path(tmp_path: Path) -> None:
    """Test is_safe_path identifies safe and unsafe paths."""
    base = tmp_path / "base"
    base.mkdir()
    # safe inside
    safe = base / "subdir" / "file.txt"
    assert is_safe_path(base, safe)
    # unsafe outside
    unsafe = tmp_path / "other" / "file.txt"
    assert not is_safe_path(base, unsafe)


def test_get_chrome_cookies_path(monkeypatch: Any) -> None:
    """Test get_chrome_cookies_path returns correct paths per OS and logs warnings."""
    # macOS
    monkeypatch.setattr(sys, "platform", "darwin")
    path = get_chrome_cookies_path()
    assert path != ""
    assert "Google/Chrome" in path
    # Windows
    monkeypatch.setattr(sys, "platform", "win32")
    path = get_chrome_cookies_path()
    assert path != ""
    assert "Google/Chrome/User Data" in path
    # Linux
    monkeypatch.setattr(sys, "platform", "linux")
    path = get_chrome_cookies_path()
    assert path != ""
    assert ".config/google-chrome" in path
    # Unsupported
    monkeypatch.setattr(sys, "platform", "unknownOS")
    path = get_chrome_cookies_path()
    assert path == ""


def test_is_safe_path_and_newest_file(tmp_path: Path) -> None:
    """Test is_safe_path and newest_file functions behave correctly."""
    base = tmp_path / "base"
    base.mkdir()
    # Create safe file
    safe_file = base / "f1.txt"
    safe_file.write_text("data")
    time.sleep(0.01)
    safe_file2 = base / "f2.txt"
    safe_file2.write_text("more")
    # is_safe_path
    assert is_safe_path(base, safe_file2)
    # Outside path
    outside = tmp_path.parent / "other.txt"
    assert not is_safe_path(base, outside)
    # newest_file
    newest = newest_file(base)
    assert newest is not None
    assert newest.name == "f2.txt"
    # empty folder
    empty = tmp_path / "empty"
    empty.mkdir()
    assert newest_file(empty) is None


def test_find_available_port_basic() -> None:
    """Test that find_available_port returns a valid port in the given range."""
    start_port = get_server_port()
    count = 5
    port = find_available_port(start_port, count)
    assert isinstance(port, int)
    assert start_port <= port < start_port + count


def test_find_available_port_skips_used() -> None:
    """Test that find_available_port skips ports that are already bound."""
    host = "127.0.0.1"
    start_port = get_server_port()
    count = 2
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((host, start_port))
    try:
        port = find_available_port(start_port, count, host)
        assert port == start_port + 1
    finally:
        s.close()


def test_find_available_port_failure(monkeypatch: Any) -> None:
    """Test that find_available_port raises when no ports are available."""
    import socket as real_socket

    def dummy_bind(self: Any, addr: Any) -> None:
        raise OSError(errno.EADDRINUSE, "Address in use")

    monkeypatch.setattr(real_socket.socket, "bind", dummy_bind)
    with pytest.raises(RuntimeError):
        find_available_port(get_server_port(), 1, host="127.0.0.1")
