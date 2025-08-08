# tests/unit/test_status_endpoints.py
from pathlib import Path
from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient
from pytest import MonkeyPatch

from server import create_app
from server.config import Config
from server.downloads import progress_data, progress_lock
from server.downloads.ytdlp import download_errors_from_hooks


class DummyConfig:
    server_host = "127.0.0.1"
    server_port = 5001
    download_dir = "/tmp"
    allow_playlists = False

    def get_value(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, default)


@pytest.fixture(autouse=True)
def app(monkeypatch: MonkeyPatch, tmp_path: Path) -> Flask:
    # Ensure progress_data is reset for unit tests
    with progress_lock:
        progress_data.clear()

    # Use a real Config object with a temporary download directory
    test_config = Config({"download_dir": str(tmp_path)})
    monkeypatch.setattr(Config, "load", lambda: test_config)

    return create_app(test_config)


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    return app.test_client()


def test_get_status_success(client: FlaskClient) -> None:
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.get_json()
    # Should return progress data mapping (may contain test data from other tests)
    assert isinstance(data, dict)


def test_get_status_by_id_not_found(client: FlaskClient) -> None:
    response = client.get("/api/status/nonexistent")
    assert response.status_code == 404
    data = response.get_json()
    assert data["status"] == "error"
    assert data["message"] == "Download not found"


def test_get_status_by_id_success(client: FlaskClient) -> None:
    # Seed a progress entry
    with progress_lock:
        progress_data["did1"] = {"percent": "25%", "speed": "1MiB/s"}
    response = client.get("/api/status/did1")
    assert response.status_code == 200
    data = response.get_json()
    assert data == {"percent": "25%", "speed": "1MiB/s"}
    # Test that no error key is present for successful progress
    assert "error" not in data


def test_get_status_by_id_with_error(client: FlaskClient) -> None:
    # Seed a hook error without progress_data entry
    error_info = {"original_message": "fail", "parsed_type": "HOOK_ERROR", "source": "hook", "details": {}}
    download_errors_from_hooks["did_err"] = error_info
    response = client.get("/api/status/did_err")
    assert response.status_code == 200
    data = response.get_json()
    assert data.get("error") == error_info
    # Test clearing error-only entry
    response = client.delete("/api/status/did_err")
    assert response.status_code == 200
    assert response.get_json()["status"] == "success"
    # Now GET returns 404
    response = client.get("/api/status/did_err")
    assert response.status_code == 404


def test_clear_status_by_id_success(client: FlaskClient) -> None:
    # Seed a progress entry
    with progress_lock:
        progress_data["to_clear"] = {"status": "downloading"}
    # Clear via DELETE
    response = client.delete("/api/status/to_clear")
    assert response.status_code == 200
    assert response.get_json()["status"] == "success"
    # Ensure it's removed
    with progress_lock:
        assert "to_clear" not in progress_data


def test_clear_status_bulk(client: FlaskClient) -> None:
    # Seed multiple entries
    from server.downloads import progress_data, progress_lock

    with progress_lock:
        progress_data["a"] = {"status": "finished"}
        progress_data["b"] = {"status": "finished"}
        progress_data["c"] = {"status": "downloading"}
    # Bulk clear only 'finished'
    response = client.delete("/api/status?status=finished")
    data = response.get_json()
    assert response.status_code == 200
    assert set(data["cleared_ids"]) == {"a", "b"}
    # Remaining entries (may include test data from other tests)
    resp = client.get("/api/status")
    remaining = resp.get_json().keys()
    # Should contain "c" and may contain other test data
    assert "c" in remaining


def test_status_metadata_and_history(client: FlaskClient) -> None:
    # Seed metadata and history for a download
    from server.downloads import progress_data, progress_lock

    with progress_lock:
        progress_data["meta1"] = {
            "percent": "10%",
            "speed": "100KiB/s",
            "eta": "5s",
            "downloaded": "100KiB",
            "total": "1MiB",
            "history": [
                {"timestamp": 1600000000.0, "percent": "5%"},
                {"timestamp": 1600000001.0, "percent": "10%"},
            ],
            "title": "myvideo",
            "duration": 120,
        }
    response = client.get("/api/status/meta1")
    assert response.status_code == 200
    data = response.get_json()
    assert data.get("title") == "myvideo"
    assert data.get("duration") == 120
    assert isinstance(data.get("history"), list)
    assert data["history"][1]["percent"] == "10%"


def test_clear_status_race_condition(client: FlaskClient) -> None:
    # Seed status entry
    from server.downloads import progress_data, progress_lock

    with progress_lock:
        progress_data["race_status"] = {"status": "downloading"}
    # First clear should succeed
    resp1 = client.delete("/api/status/race_status")
    assert resp1.status_code == 200
    # Second clear should return 404
    resp2 = client.delete("/api/status/race_status")
    assert resp2.status_code == 404
    data2 = resp2.get_json()
    assert data2["status"] == "error"
    assert "Download not found" in data2["message"]
