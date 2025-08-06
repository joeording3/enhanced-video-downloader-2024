# tests/unit/test_download_api.py
from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient
from pytest import MonkeyPatch

from server import create_app
from server.config import Config


class DummyConfig:
    server_host = "127.0.0.1"
    server_port = 5001
    download_dir = "/tmp"
    allow_playlists = False

    def get_value(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, default)


@pytest.fixture(autouse=True)
def app(monkeypatch: MonkeyPatch) -> Flask:
    # Monkeypatch Config.load to use DummyConfig
    monkeypatch.setattr(Config, "load", lambda: DummyConfig())
    return create_app(DummyConfig())  # type: ignore[arg-type]


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    return app.test_client()


def test_post_download_success(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    # Stub the download handler to avoid actual download
    monkeypatch.setattr(
        "server.api.download_bp.handle_ytdlp_download",
        lambda data: {"status": "success", "downloadId": "id", "message": "ok"},
    )
    payload = {"url": "https://example.com/video", "downloadId": "id"}
    resp = client.post("/api/download", json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["downloadId"] == "id"


def test_cancel_download_not_found(client: FlaskClient) -> None:
    # Cancel non-existent download
    resp = client.post("/api/download/nonexistent/cancel")
    assert resp.status_code == 404
    data = resp.get_json()
    assert data["status"] == "error"
    # Test successful cancellation
    from server.api.download_bp import download_process_registry

    # Create dummy process for cancellation
    class DummyProc:
        def terminate(self) -> None:
            pass

        def wait(self, timeout: Any) -> None:
            pass

    download_process_registry["id1"] = DummyProc()  # type: ignore[assignment]
    resp = client.post("/api/download/id1/cancel")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"


def test_post_download_missing_url(client: FlaskClient) -> None:
    # Missing URL in payload should return MISSING_URL error
    payload = {"downloadId": "no-url"}
    resp = client.post("/api/download", json=payload)
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["status"] == "error"
    assert data["error_type"] == "MISSING_URL"


def test_post_download_playlist_disabled(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    # Playlist downloads are disabled by default
    payload = {"url": "https://example.com/video", "downloadId": "pl1", "download_playlist": True}
    resp = client.post("/api/download", json=payload)
    assert resp.status_code == 403
    data = resp.get_json()
    assert data["status"] == "error"
    assert data["error_type"] == "PLAYLIST_DOWNLOADS_DISABLED"


def test_post_resume_endpoint(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    # Stub the resume handler to return a JSON tuple
    monkeypatch.setattr(
        "server.api.download_bp.handle_resume_download",
        lambda data=None: ({"status": "ok", "message": "resumed"}, 200),
    )
    resp = client.post("/api/resume", json={"ids": ["some_id"]})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "ok"
    assert data["message"] == "resumed"


def test_cancel_download_race_condition(client: FlaskClient) -> None:
    # Seed dummy process for cancellation
    from server.api.download_bp import download_process_registry

    class DummyProc:
        def terminate(self) -> None:
            pass

        def wait(self, timeout: Any) -> None:
            pass

    download_process_registry["race1"] = DummyProc()  # type: ignore[assignment]
    # First cancellation should succeed
    resp1 = client.post("/api/download/race1/cancel")
    assert resp1.status_code == 200
    data1 = resp1.get_json()
    assert data1["status"] == "success"
    # Second cancellation should return 404
    resp2 = client.post("/api/download/race1/cancel")
    assert resp2.status_code == 404
    data2 = resp2.get_json()
    assert data2["status"] == "error"
    assert "No active download" in data2["message"]
