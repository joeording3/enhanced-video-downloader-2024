from typing import Any

import pytest
from flask.testing import FlaskClient
from pytest import MonkeyPatch


def test_download_success(
    monkeypatch: MonkeyPatch, client: FlaskClient, sample_download_request: dict[str, Any]
) -> None:
    # Mock YTDLP download handler
    """
    Test that the download endpoint returns a successful response.

    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :param client: FlaskClient to send HTTP requests to the API.
    :param sample_download_request: sample payload for download.
    :returns: None
    """

    def fake_ytdlp(validated_data: dict[str, Any]) -> tuple[dict[str, Any], int]:
        return (
            {
                "status": "success",
                "message": "Download started",
                "downloadId": "d123",
                "title": "Test Title",
                "url": validated_data.get("url"),
            },
            200,
        )

    monkeypatch.setattr(
        "server.api.download_bp.handle_ytdlp_download",
        fake_ytdlp,
    )
    req = sample_download_request.copy()
    req.update({"downloadId": "d123"})
    response = client.post("/api/download", json=req)
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert data.get("downloadId") == "d123"
    assert data.get("title") == "Test Title"


def test_playlist_download_denied(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    # By default, allow_playlists is False in config
    """
    Test that playlist downloads are denied when disabled in config.

    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :param client: FlaskClient to send HTTP requests to the API.
    :returns: None
    """

    # Mock the config to disable playlists
    def mock_config():
        class MockConfig:
            def get_value(self, key: str, default: bool = False) -> bool:
                if key == "allow_playlists":
                    return False
                return default

        return MockConfig()

    monkeypatch.setattr("server.config.Config.load", mock_config)

    payload = {"url": "https://example.com/video", "download_playlist": True, "downloadId": "p1"}
    response = client.post("/api/download", json=payload)
    assert response.status_code == 403
    data = response.get_json()
    assert data["status"] == "error"
    assert data.get("error_type") == "PLAYLIST_DOWNLOADS_DISABLED"
    assert data.get("downloadId") == "p1"


@pytest.mark.parametrize(
    "endpoint",
    [
        "/api/download/x/cancel",
        "/api/download/x/pause",
        "/api/download/x/resume",
        "/api/download/x/priority",
    ],
)
def test_options_methods(endpoint: str, client: FlaskClient) -> None:
    # Ensure OPTIONS on control endpoints returns 204
    """
    Test that OPTIONS requests to control endpoints return HTTP 204.

    :param endpoint: API endpoint path to test.
    :param client: FlaskClient to send HTTP requests.
    :returns: None
    """
    response = client.options(endpoint)
    assert response.status_code == 204


def test_download_validation_error(client: FlaskClient) -> None:
    # Invalid payload types should trigger Pydantic validation error
    """
    Test that invalid payload types cause a validation error response.

    :param client: FlaskClient to send HTTP requests.
    :returns: None
    """
    payload = {"url": 123, "downloadId": "v1"}
    response = client.post("/api/download", json=payload)
    assert response.status_code == 400
    data = response.get_json()
    assert data["status"] == "error"
    assert data.get("error_type") == "VALIDATION_ERROR"


def test_playlist_download_allowed(
    monkeypatch: MonkeyPatch, client: FlaskClient, sample_download_request: dict[str, Any]
) -> None:
    # Allow playlist downloads when server config permits
    """
    Test that playlist downloads are allowed when configuration permits.

    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :param client: FlaskClient to send HTTP requests.
    :param sample_download_request: sample payload for download.
    :returns: None
    """

    # Monkeypatch Config.load to return config with allow_playlists=True
    class DummyConfig:
        def get_value(self, key: str, default: Any = None) -> Any:
            """
            Get configuration value by key, returning default if not set.

            :param key: configuration key to retrieve.
            :param default: default value if key is not present.
            :returns: configuration value or default.
            """
            return True if key == "allow_playlists" else default

    def stub_config() -> DummyConfig:
        """
        Stub for Config.load to return DummyConfig instance.

        :returns: DummyConfig instance.
        """
        return DummyConfig()

    monkeypatch.setattr("server.config.Config.load", stub_config)

    # Stub ytdlp download handler to return success
    def fake_ytdlp_playlist(validated: dict[str, Any]) -> tuple[dict[str, Any], int]:
        """
        Stub handler returning success status for playlist downloads.

        :param validated: validated request data.
        :returns: tuple of response dict and HTTP status code.
        """
        return ({"status": "success", "downloadId": "p2"}, 200)

    monkeypatch.setattr("server.api.download_bp.handle_ytdlp_download", fake_ytdlp_playlist)
    req = sample_download_request.copy()
    req.update({"download_playlist": True, "downloadId": "p2"})
    response = client.post("/api/download", json=req)
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert data.get("downloadId") == "p2"
    assert data.get("downloadId") == "p2"
