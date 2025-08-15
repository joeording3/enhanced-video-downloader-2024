from pathlib import Path
from typing import Any

import pytest
from flask import Flask
from pytest import MonkeyPatch

from server.config import Config
from server.downloads.ytdlp import handle_ytdlp_download


class DummyConfigNoDir:
    """Config stub without download_dir set."""

    def get_value(self, key: str, default: Any = None) -> Any:
        """Return None for download_dir, False for playlists, default otherwise."""

        if key == "download_dir":
            return None
        if key == "allow_playlists":
            return False
        return default


class DummyConfigWithDir:
    """Config stub with download_dir set."""

    def __init__(self, path: str) -> None:
        """Initialize with provided download directory path."""
        self._path = path

    def get_value(self, key: str, default: Any = None) -> Any:
        """Return configured download_dir, False for playlists, default otherwise."""

        if key == "download_dir":
            return self._path
        if key == "allow_playlists":
            return False
        return default


@pytest.fixture
def app() -> Flask:
    """Provide a Flask app context for jsonify."""
    return Flask(__name__)


def test_handle_missing_url(app: Flask, monkeypatch: MonkeyPatch) -> None:
    """Ensure missing URL returns 400 with MISSING_URL error."""
    # No need to patch Config.load since URL check is first
    data = {"url": "", "downloadId": "test1"}
    with app.test_request_context():
        resp, status = handle_ytdlp_download(data)
        assert status == 400
        json_data = resp.get_json()
        assert json_data["error_type"] == "MISSING_URL"
        assert json_data["message"] == "No URL provided or invalid URL format"
        assert json_data["downloadId"] == "test1"


def test_handle_missing_download_dir(app: Flask, monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Ensure missing download_dir in config returns 500 with SERVER_CONFIG_ERROR_NO_DOWNLOAD_DIR."""
    monkeypatch.setattr(Config, "load", lambda *args, **kwargs: DummyConfigNoDir())
    data = {"url": "http://example.com/video", "downloadId": "test2"}
    with app.test_request_context():
        resp, status = handle_ytdlp_download(data)
        assert status == 500
        json_data = resp.get_json()
        assert json_data["error_type"] == "SERVER_CONFIG_ERROR_NO_DOWNLOAD_DIR"
        assert "not configured" in json_data["message"]
        assert json_data["downloadId"] == "test2"


def test_handle_os_makedirs_error(app: Flask, monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Ensure Path.mkdir errors are caught and return SERVER_CONFIG_DOWNLOAD_DIR_ERROR."""
    # Patch Config.load to return a path and patch Path.mkdir to throw
    test_dir = str(tmp_path / "downloads")
    monkeypatch.setattr(Config, "load", lambda *args, **kwargs: DummyConfigWithDir(test_dir))

    def fake_mkdir(*args, **kwargs):
        raise OSError("fail create")

    monkeypatch.setattr(Path, "mkdir", fake_mkdir)
    data = {"url": "http://example.com/video", "downloadId": "test3"}
    with app.test_request_context():
        resp, status = handle_ytdlp_download(data)
        assert status == 500
        json_data = resp.get_json()
        assert json_data["error_type"] == "SERVER_CONFIG_DOWNLOAD_DIR_ERROR"
        assert "fail create" in json_data["message"]
        assert json_data["downloadId"] == "test3"


def test_handle_download_success(app: Flask, monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Test that a successful download returns 200 and stores tempfile prefix."""

    # Stub config to provide download_dir and disable playlists
    class DummyConfigSuccess:
        def get_value(self, key: str, default: Any = None) -> Any:
            if key == "download_dir":
                return str(tmp_path)
            if key == "allow_playlists":
                return False
            return default

    monkeypatch.setattr(Config, "load", lambda *args, **kwargs: DummyConfigSuccess())
    # Import ytdlp module attributes
    from server.downloads.ytdlp import download_tempfile_registry, yt_dlp

    # Stub YoutubeDL to simulate download without error
    class DummyYDL:
        def __init__(self, opts: Any) -> None:
            pass

        def __enter__(self) -> "DummyYDL":
            return self

        def download(self, urls: Any) -> None:
            pass

        def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
            pass

    monkeypatch.setattr(yt_dlp, "YoutubeDL", DummyYDL)
    # Clear any previous registry entries
    download_tempfile_registry.clear()
    data = {
        "url": "http://example.com/path/video1",
        "downloadId": "id1",
        "page_title": "MyTitle",
        "download_playlist": False,
    }
    with app.test_request_context():
        resp, status = handle_ytdlp_download(data)
        assert status == 200
        json_data = resp.get_json()
        assert json_data["status"] == "success"
        # Verify tempfile prefix stored correctly
        prefix = download_tempfile_registry.get("id1")
        assert prefix is not None
        assert prefix.startswith("MyTitle_video1")


def test_handle_download_error_cleanup(app: Flask, monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Test that DownloadError triggers cleanup of partial files and returns error response."""

    # Stub config to provide download_dir and disable playlists
    class DummyConfigError:
        def get_value(self, key: str, default: Any = None) -> Any:
            if key == "download_dir":
                return str(tmp_path)
            if key == "allow_playlists":
                return False
            return default

    monkeypatch.setattr(Config, "load", lambda *args, **kwargs: DummyConfigError())
    # Import ytdlp module attributes
    from server.downloads.ytdlp import download_tempfile_registry, yt_dlp

    # Create dummy partial file matching the expected prefix
    data = {
        "url": "http://example.com/path/video2",
        "downloadId": "id2",
        "page_title": "TestTitle",
        "download_playlist": False,
    }
    # Compute prefix as handle will
    safe_title = "TestTitle"
    sanitized_id = "video2"
    prefix = f"{safe_title}_{sanitized_id}"
    # Create partial file in tmp_path
    part_file = tmp_path / f"{prefix}.123.part"
    part_file.write_text("partial content")
    assert part_file.exists()

    # Stub YoutubeDL to raise DownloadError
    class DummyYDLError:
        def __init__(self, opts: Any) -> None:
            pass

        def __enter__(self) -> "DummyYDLError":
            return self

        def download(self, urls: Any) -> None:
            raise yt_dlp.utils.DownloadError("fail download")

        def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
            pass

    monkeypatch.setattr(yt_dlp, "YoutubeDL", DummyYDLError)
    # Clear registry
    download_tempfile_registry.clear()
    # Call handle
    with app.test_request_context():
        resp, status = handle_ytdlp_download(data)
    # Check response
    assert status == 500
    json_data = resp.get_json()
    assert json_data["error_type"].startswith("YT_DLP_")
    assert "fail download" in json_data.get("original_error", json_data.get("message", ""))
    # Partial file should be removed
    assert not part_file.exists()
    # Prefix should still be in registry
    assert download_tempfile_registry.get("id2") == prefix
