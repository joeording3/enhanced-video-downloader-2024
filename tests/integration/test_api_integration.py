from typing import Any

import pytest
from flask import Response, jsonify
from flask.testing import FlaskClient
from pytest import MonkeyPatch

pytestmark = pytest.mark.integration

# existing code follows


def test_download_options_method(client: FlaskClient) -> None:
    """
    Test that OPTIONS /api/download returns HTTP 204.

    :param client: FlaskClient to send HTTP requests.
    :returns: None
    """
    resp = client.options("/api/download")
    assert resp.status_code == 204


def test_download_missing_url(client: FlaskClient) -> None:
    """
    Test that POST /api/download with missing URL returns MISSING_URL error.

    :param client: FlaskClient to send HTTP requests.
    :returns: None
    """
    resp = client.post("/api/download", json={"download_id": "id1"})
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["error_type"] == "MISSING_URL"


def test_download_success(client: FlaskClient, monkeypatch: MonkeyPatch) -> None:
    """
    Test that POST /api/download delegates to handle_ytdlp_download.

    :param client: FlaskClient to send HTTP requests.
    :param monkeypatch: pytest MonkeyPatch fixture for stubbing handlers.
    :returns: None
    """

    def fake_handle(data: dict[str, Any]) -> "tuple[Response, int]":
        """
        Stub handler to simulate successful download response.

        :param data: validated request data.
        :returns: tuple of JSON response and HTTP status code.
        """
        return jsonify({"status": "success", "downloadId": data.get("download_id")}), 200

    monkeypatch.setattr("server.api.download_bp.handle_ytdlp_download", fake_handle)
    resp = client.post("/api/download", json={"url": "http://example.com", "download_id": "id2"})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["downloadId"] == "id2"
    assert data["downloadId"] == "id2"
