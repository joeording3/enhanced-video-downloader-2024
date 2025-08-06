from typing import Any

import pytest
from flask.testing import FlaskClient
from pytest import MonkeyPatch

pytestmark = pytest.mark.integration


def test_download_server_error(client: FlaskClient, monkeypatch: MonkeyPatch) -> None:
    """
    Test that server errors in download handler return SERVER_ERROR with status code 500.

    :param client: FlaskClient to send HTTP requests.
    :param monkeypatch: MonkeyPatch fixture for stubbing functions.
    :returns: None
    """

    # Simulate an unexpected exception in handle_ytdlp_download
    def stub_handle_error(data: Any) -> Any:
        """
        Stub to raise a download handler exception.

        :param data: validated request data.
        :returns: None
        """
        raise Exception("boom")

    monkeypatch.setattr(
        "server.api.download_bp.handle_ytdlp_download",
        stub_handle_error,
    )
    resp = client.post("/api/download", json={"url": "http://example.com", "downloadId": "err1"})
    assert resp.status_code == 500
    data = resp.get_json()
    assert data["error_type"] == "SERVER_ERROR"
    assert "boom" in data["message"]


def test_history_get_server_error(client: FlaskClient, monkeypatch: MonkeyPatch) -> None:
    """
    Test that GET /api/history returns 500 when load_history raises exception.

    :param client: FlaskClient to send HTTP requests.
    :param monkeypatch: MonkeyPatch fixture for stubbing functions.
    :returns: None
    """

    def stub_load_history() -> Any:
        """
        Stub to raise exception from load_history.

        :returns: None
        """
        raise Exception("hist fail")

    monkeypatch.setattr(
        "server.api.history_bp.load_history",
        stub_load_history,
    )
    resp = client.get("/api/history")
    assert resp.status_code == 500
    data = resp.get_json()
    assert "error" in data
    assert "hist fail" in data["error"]


def test_history_post_append_error(client: FlaskClient, monkeypatch: MonkeyPatch) -> None:
    """
    Test that POST /api/history append errors return success False and HTTP 500.

    :param client: FlaskClient to send HTTP requests.
    :param monkeypatch: MonkeyPatch fixture for stubbing functions.
    :returns: None
    """

    def stub_append_history_entry(entry: Any) -> Any:
        """
        Stub to raise exception from append_history_entry.

        :param entry: history entry data.
        :returns: None
        """
        raise Exception("append fail")

    monkeypatch.setattr(
        "server.api.history_bp.append_history_entry",
        stub_append_history_entry,
    )
    resp = client.post("/api/history", json={"id": "x"})
    assert resp.status_code == 500
    data = resp.get_json()
    assert data["success"] is False
    assert "append fail" in data["error"]
    assert "append fail" in data["error"]
