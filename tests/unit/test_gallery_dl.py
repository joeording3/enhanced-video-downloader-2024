import subprocess
from pathlib import Path
from typing import Any

import pytest
from flask import Flask
from pytest import MonkeyPatch

import server.downloads.gallery_dl as gdllib


def setup_app() -> Flask:
    return Flask(__name__)


@pytest.fixture(autouse=True)
def app_ctx() -> Any:
    app = setup_app()
    with app.test_request_context():
        yield


class DummyConfig:
    def __init__(self, download_dir: str | None = None) -> None:
        self._dir = download_dir

    def get_value(self, key: str, default: Any = None) -> Any:
        if key == "download_dir":
            return self._dir
        return default


class DummyProcess:
    def __init__(self, returncode: int = 0, stdout: bytes = b"", stderr: bytes = b"") -> None:
        self.returncode = returncode
        self._stdout = stdout
        self._stderr = stderr

    def communicate(self) -> tuple[bytes, bytes]:
        return (self._stdout, self._stderr)


# Test cases


def test_no_url_provided() -> None:
    data = {"downloadId": "id1"}
    resp, status = gdllib.handle_gallery_dl_download(data)
    assert status == 400
    assert resp.get_json()["message"] == "No URL provided"
    assert resp.get_json()["downloadId"] == "id1"


def test_no_download_dir(monkeypatch: MonkeyPatch) -> None:
    data = {"url": "http://example.com", "downloadId": "id2"}
    monkeypatch.setattr(gdllib.Config, "load", staticmethod(lambda: DummyConfig(download_dir=None)))
    resp, status = gdllib.handle_gallery_dl_download(data)
    assert status == 500
    body = resp.get_json()
    assert body["message"] == "Download directory not configured."
    assert body["downloadId"] == "id2"


def test_directory_creation_error(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    data = {"url": "http://ex.com", "downloadId": "id3"}
    # Config returns a path that cannot be created
    bad_dir = tmp_path / "no_perm"
    monkeypatch.setattr(gdllib.Config, "load", staticmethod(lambda: DummyConfig(download_dir=str(bad_dir))))

    # Patch Path.mkdir to raise
    def fake_mkdir(*args, **kwargs):
        raise Exception("mk error")

    monkeypatch.setattr(Path, "mkdir", fake_mkdir)
    resp, status = gdllib.handle_gallery_dl_download(data)
    assert status == 500
    assert "Server error with download directory" in resp.get_json()["message"]


def test_successful_download(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    data = {"url": "http://img.com", "downloadId": "id4"}
    ddir = tmp_path / "downloads"
    ddir.mkdir()
    monkeypatch.setattr(gdllib.Config, "load", staticmethod(lambda: DummyConfig(download_dir=str(ddir))))
    # Capture Popen command and cwd
    captured = {}

    class FakePopen:
        def __init__(self, cmd: Any, stdout: Any, stderr: Any, cwd: str) -> None:
            captured["cmd"] = cmd
            captured["cwd"] = cwd
            self.returncode = 0

        def communicate(self) -> tuple[bytes, bytes]:
            return (b"out", b"")

    monkeypatch.setattr(subprocess, "Popen", FakePopen)
    resp, status = gdllib.handle_gallery_dl_download(data)
    assert status == 200
    assert resp.get_json()["status"] == "success"
    assert captured["cwd"] == str(ddir)
    # Command should start with gallery-dl and end with URL
    assert captured["cmd"][0] == "gallery-dl"
    assert captured["cmd"][-1] == data["url"]


def test_failed_download(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    data = {"url": "http://fail.com", "downloadId": "id5"}
    ddir = tmp_path / "d2"
    ddir.mkdir()
    monkeypatch.setattr(gdllib.Config, "load", staticmethod(lambda: DummyConfig(download_dir=str(ddir))))

    class FakePopen:
        def __init__(self, cmd: Any, stdout: Any, stderr: Any, cwd: str) -> None:
            self.returncode = 1

        def communicate(self) -> tuple[bytes, bytes]:
            return (b"", b"err msg")

    monkeypatch.setattr(subprocess, "Popen", FakePopen)
    resp, status = gdllib.handle_gallery_dl_download(data)
    assert status == 500
    body = resp.get_json()
    assert "Gallery download failed: err msg" in body["message"]


def test_command_not_found(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    data = {"url": "http://nf.com", "downloadId": "id6"}
    monkeypatch.setattr(gdllib.Config, "load", staticmethod(lambda: DummyConfig(download_dir=str(tmp_path))))
    monkeypatch.setattr(subprocess, "Popen", lambda *args, **kwargs: (_ for _ in ()).throw(FileNotFoundError()))
    resp, status = gdllib.handle_gallery_dl_download(data)
    assert status == 500
    body = resp.get_json()
    assert body["message"] == "gallery-dl command not found on server."


def test_unexpected_error(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    data = {"url": "http://ex.com", "downloadId": "id7"}
    monkeypatch.setattr(gdllib.Config, "load", staticmethod(lambda: DummyConfig(download_dir=str(tmp_path))))
    monkeypatch.setattr(subprocess, "Popen", lambda *args, **kwargs: (_ for _ in ()).throw(Exception("boom")))
    resp, status = gdllib.handle_gallery_dl_download(data)
    assert status == 500
    assert "Unexpected server error during gallery download: boom" in resp.get_json()["message"]
