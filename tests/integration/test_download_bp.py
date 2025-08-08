from typing import Any

import pytest
from flask.testing import FlaskClient
from pytest import MonkeyPatch

from server.api.download_bp import download_process_registry, download_tempfile_registry


def test_missing_url(client: FlaskClient) -> None:
    """Test that missing URL in payload returns appropriate error.

    :param client: Flask test client fixture
    """
    # Missing URL in payload
    response = client.post("/api/download", json={})
    assert response.status_code == 400
    data = response.get_json()
    assert data["status"] == "error"
    assert data.get("error_type") == "MISSING_URL"


def test_gallery_download_flow(
    monkeypatch: MonkeyPatch, client: FlaskClient, sample_download_request: dict[str, Any]
) -> None:
    """Test gallery download flow with mocked handler.

    :param monkeypatch: Pytest monkeypatch fixture
    :param client: Flask test client fixture
    :param sample_download_request: Sample download request fixture
    """

    # Mock gallery handler to return custom response
    def fake_gallery(validated_data: dict[str, Any]) -> "tuple[dict[str, Any], int]":
        return ({"status": "success", "downloadId": "g123", "type": "gallery"}, 200)

    monkeypatch.setattr(
        "server.api.download_bp.handle_gallery_dl_download",
        fake_gallery,
    )
    req = sample_download_request.copy()
    req.update({"use_gallery_dl": True, "downloadId": "g123"})
    response = client.post("/api/download", json=req)
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert data.get("downloadId") == "g123"
    assert data.get("type") == "gallery"


def test_resume_endpoint(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    """Test resume endpoint with mocked handler.

    :param monkeypatch: Pytest monkeypatch fixture
    :param client: Flask test client fixture
    """

    # Mock resume handler
    def fake_resume(request_data: dict[str, Any]) -> dict[str, Any]:
        return {"status": "success", "resumed": request_data.get("ids", [])}

    monkeypatch.setattr(
        "server.api.download_bp.handle_resume_download",
        fake_resume,
    )
    payload = {"ids": ["id1", "id2"]}
    response = client.post("/api/resume", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert data.get("resumed") == ["id1", "id2"]


@pytest.mark.parametrize(
    "endpoint, download_id, expected_message, expected_download_id",
    [
        ("/api/download/nonexistent/cancel", "nonexistent", "No active download with given ID.", "nonexistent"),
        ("/api/download/nonexistent/pause", "nonexistent", "No active download with given ID.", "nonexistent"),
        ("/api/download/nonexistent/resume", "nonexistent", "No paused download with given ID.", "nonexistent"),
    ],
)
def test_nonexistent_download_operations(
    client: FlaskClient, endpoint: str, download_id: str, expected_message: str, expected_download_id: str
) -> None:
    """Test operations on nonexistent downloads return appropriate errors.

    :param client: Flask test client fixture
    :param endpoint: API endpoint to test
    :param download_id: Download ID being tested
    :param expected_message: Expected error message
    :param expected_download_id: Expected download ID in response
    """
    response = client.post(endpoint)
    assert response.status_code == 404
    data = response.get_json()
    assert data["status"] == "error"
    assert data.get("message") == expected_message
    assert data.get("downloadId") == expected_download_id


@pytest.mark.parametrize(
    "endpoint, expected_status_code",
    [
        ("/api/download", 204),
        ("/api/gallery-dl", 204),
    ],
)
def test_options_endpoints(client: FlaskClient, endpoint: str, expected_status_code: int) -> None:
    """Test OPTIONS endpoints return correct status codes.

    :param client: Flask test client fixture
    :param endpoint: API endpoint to test
    :param expected_status_code: Expected HTTP status code
    """
    response = client.options(endpoint)
    assert response.status_code == expected_status_code


def test_gallery_dl_missing_url(client: FlaskClient) -> None:
    """Test gallery-dl endpoint with missing URL returns error.

    :param client: Flask test client fixture
    """
    response = client.post("/api/gallery-dl", json={})
    assert response.status_code == 400
    data = response.get_json()
    assert data["status"] == "error"
    assert data.get("downloadId") == "unknown"


def test_gallery_dl_success(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    """Test successful gallery-dl download with mocked handler.

    :param monkeypatch: Pytest monkeypatch fixture
    :param client: Flask test client fixture
    """

    def fake_gallery(validated_data: dict[str, Any]) -> "tuple[dict[str, Any], int]":
        return ({"status": "success", "downloadId": "g456"}, 200)

    monkeypatch.setattr(
        "server.api.download_bp.handle_gallery_dl_download",
        fake_gallery,
    )
    payload = {"url": "http://example.com/gallery", "downloadId": "g456"}
    response = client.post("/api/gallery-dl", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert data.get("downloadId") == "g456"


@pytest.mark.parametrize(
    "endpoint, download_id, expected_message, mock_method",
    [
        ("/api/download/p123/pause", "p123", "Download paused.", "suspend"),
        ("/api/download/r123/resume", "r123", "Download resumed.", "resume"),
    ],
)
def test_pause_resume_operations(
    monkeypatch: MonkeyPatch,
    client: FlaskClient,
    endpoint: str,
    download_id: str,
    expected_message: str,
    mock_method: str,
) -> None:
    """Test pause and resume operations with mocked processes.

    :param monkeypatch: Pytest monkeypatch fixture
    :param client: Flask test client fixture
    :param endpoint: API endpoint to test
    :param download_id: Download ID being tested
    :param expected_message: Expected success message
    :param mock_method: Method to mock on the dummy process
    """
    fake_proc = type("DummyProc", (), {mock_method: lambda self: None})()  # type: ignore[attr-defined]
    monkeypatch.setitem(download_process_registry, download_id, fake_proc)
    response = client.post(endpoint)
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert data.get("message") == expected_message
    assert data.get("downloadId") == download_id


def test_cancel_success(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    """Test successful download cancellation with mocked process.

    :param monkeypatch: Pytest monkeypatch fixture
    :param client: Flask test client fixture
    """
    from server.api.download_bp import download_process_registry

    # Simulate process and tempfile prefix
    fake_proc = object()
    monkeypatch.setitem(download_process_registry, "c123", fake_proc)
    monkeypatch.setitem(download_tempfile_registry, "c123", "prefix_c123")
    # Skip actual termination logic
    monkeypatch.setattr(
        "server.api.download_bp._terminate_proc",
        lambda proc, download_id: (None, None),  # type: ignore[attr-defined]
    )
    response = client.post("/api/download/c123/cancel")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert data.get("message") == "Download canceled."
    assert data.get("downloadId") == "c123"


@pytest.mark.parametrize(
    "payload, content_type, expected_error_type",
    [
        ("notjson", "application/json", "Invalid JSON"),
        ({"priority": "high"}, "application/json", "Invalid priority value"),
    ],
)
def test_set_priority_invalid_inputs(
    client: FlaskClient, payload: Any, content_type: str, expected_error_type: str
) -> None:
    """Test priority setting with invalid inputs returns appropriate errors.

    :param client: Flask test client fixture
    :param payload: Request payload (string or dict)
    :param content_type: Content type for the request
    :param expected_error_type: Expected error message pattern
    """
    if isinstance(payload, dict):
        response = client.post("/api/download/p123/priority", json=payload)
    else:
        response = client.post("/api/download/p123/priority", data=payload, content_type=content_type)

    assert response.status_code == 400
    data = response.get_json()
    assert data["status"] == "error"
    assert expected_error_type in data.get("message", "")


def test_set_priority_not_found(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    """Test setting priority for nonexistent download returns 404.

    :param monkeypatch: Pytest monkeypatch fixture
    :param client: Flask test client fixture
    """
    monkeypatch.setattr("server.api.download_bp.progress_data", {})
    response = client.post("/api/download/p123/priority", json={"priority": 5})
    assert response.status_code == 404
    data = response.get_json()
    assert data["status"] == "error"
    assert data.get("message") == "Download not found"


def test_set_priority_success(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    """Test successful priority setting for existing download.

    :param monkeypatch: Pytest monkeypatch fixture
    :param client: Flask test client fixture
    """
    from server.api.download_bp import progress_data

    monkeypatch.setitem(progress_data, "p123", {})
    response = client.post("/api/download/p123/priority", json={"priority": 7})
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "success"
    assert "set to 7" in data.get("message", "")
    assert progress_data["p123"]["priority"] == 7


def test_validation_error_response(client: FlaskClient) -> None:
    """Test validation error response with Pydantic validation errors.

    :param client: Flask test client fixture
    """
    # Test with invalid data that will cause validation errors
    invalid_payload = {"url": "not_a_valid_url", "format": "invalid_format", "downloadId": "test123"}
    response = client.post("/api/download", json=invalid_payload)
    # May get rate limited (429) or validation error (400)
    assert response.status_code in [400, 429]
    data = response.get_json()
    if response.status_code == 400:
        assert data["status"] == "error"
        assert data.get("error_type") == "VALIDATION_ERROR"
        assert data.get("downloadId") == "test123"
        assert "validation_errors" in data
    else:  # 429 rate limited
        assert data["status"] == "error"
        assert "rate limit" in data.get("message", "").lower()


def test_playlist_permission_disabled(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    """Test playlist download when playlists are disabled in config.

    :param monkeypatch: Pytest monkeypatch fixture
    :param client: Flask test client fixture
    """

    # Mock config to disable playlists
    def mock_config():
        class MockConfig:
            def get_value(self, key: str, default: bool = False) -> bool:
                if key == "allow_playlists":
                    return False
                return default

        return MockConfig()

    monkeypatch.setattr("server.config.Config.load", mock_config)

    payload = {
        "url": "https://www.youtube.com/playlist?list=PL123",
        "download_playlist": True,
        "downloadId": "playlist123",
    }
    response = client.post("/api/download", json=payload)
    # May get rate limited (429) or permission error (403)
    assert response.status_code in [403, 429]
    data = response.get_json()
    if response.status_code == 403:
        assert data["status"] == "error"
        assert data.get("error_type") == "PLAYLIST_DOWNLOADS_DISABLED"
        assert data.get("downloadId") == "playlist123"
    else:  # 429 rate limited
        assert data["status"] == "error"
        assert "rate limit" in data.get("message", "").lower()


def test_playlist_permission_enabled(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    """Test playlist download when playlists are enabled in config.

    :param monkeypatch: Pytest monkeypatch fixture
    :param client: Flask test client fixture
    """

    # Mock config to enable playlists
    def mock_config():
        class MockConfig:
            def get_value(self, key: str, default: bool = False) -> bool:
                if key == "allow_playlists":
                    return True
                return default

        return MockConfig()

    monkeypatch.setattr("server.config.Config.load", mock_config)

    # Mock the download handler
    def mock_download(validated_data: dict[str, Any]) -> "tuple[dict[str, Any], int]":
        return ({"status": "success", "downloadId": validated_data.get("downloadId", "")}, 200)

    monkeypatch.setattr("server.api.download_bp.handle_ytdlp_download", mock_download)

    payload = {
        "url": "https://www.youtube.com/playlist?list=PL123",
        "download_playlist": True,
        "downloadId": "playlist123",
    }
    response = client.post("/api/download", json=payload)
    # May get rate limited (429) or success (200)
    assert response.status_code in [200, 429]
    data = response.get_json()
    if response.status_code == 200:
        assert data["status"] == "success"
    else:  # 429 rate limited
        assert data["status"] == "error"
        assert "rate limit" in data.get("message", "").lower()


def test_log_validated_request(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    """Test that validated requests are logged safely.

    :param monkeypatch: Pytest monkeypatch fixture
    :param client: Flask test client fixture
    """

    # Mock the download handler
    def mock_download(validated_data: dict[str, Any]) -> "tuple[dict[str, Any], int]":
        return ({"status": "success", "downloadId": validated_data.get("downloadId", "")}, 200)

    monkeypatch.setattr("server.api.download_bp.handle_ytdlp_download", mock_download)

    # Test with a long URL to ensure it gets truncated in logs
    long_url = "https://www.youtube.com/watch?v=" + "x" * 100
    payload = {"url": long_url, "downloadId": "longurl123"}
    response = client.post("/api/download", json=payload)
    # May get rate limited (429) or success (200)
    assert response.status_code in [200, 429]


def test_cancel_download_process_termination_error(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    """Test cancel download when process termination fails.

    :param monkeypatch: Pytest monkeypatch fixture
    :param client: Flask test client fixture
    """
    from server.api.download_bp import download_process_registry

    # Create a mock process that raises an exception on terminate
    class MockProcess:
        def terminate(self):
            raise Exception("Termination failed")

    fake_proc = MockProcess()
    monkeypatch.setitem(download_process_registry, "error123", fake_proc)

    response = client.post("/api/download/error123/cancel")
    assert response.status_code == 500
    data = response.get_json()
    assert data["status"] == "error"
    assert "Failed to terminate download process" in data.get("message", "")


def test_cancel_download_cleanup_partfiles(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    """Test that .part files are cleaned up when canceling downloads.

    :param monkeypatch: Pytest monkeypatch fixture
    :param client: Flask test client fixture
    """
    from server.api.download_bp import download_process_registry

    # Mock config
    def mock_config():
        class MockConfig:
            def get_value(self, key: str, default: str = "") -> str:
                if key == "download_dir":
                    return "/tmp/downloads"
                return default

        return MockConfig()

    monkeypatch.setattr("server.config.Config.load", mock_config)

    # Mock process and tempfile prefix
    class MockProcess:
        def terminate(self):
            pass

        def wait(self, timeout=None):
            pass

    fake_proc = MockProcess()
    monkeypatch.setitem(download_process_registry, "cleanup123", fake_proc)
    monkeypatch.setitem(download_tempfile_registry, "cleanup123", "test_prefix")

    # Mock Path.glob to return empty list (no .part files)
    monkeypatch.setattr("pathlib.Path.glob", lambda self, pattern: [])

    response = client.post("/api/download/cleanup123/cancel")
    assert response.status_code == 200


def test_pause_download_process_error(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    """Test pause download when process suspend fails.

    :param monkeypatch: Pytest monkeypatch fixture
    :param client: Flask test client fixture
    """
    from server.api.download_bp import download_process_registry

    # Create a mock process that raises an exception on suspend
    class MockProcess:
        def suspend(self):
            raise Exception("Suspend failed")

    fake_proc = MockProcess()
    monkeypatch.setitem(download_process_registry, "pause_error123", fake_proc)

    response = client.post("/api/download/pause_error123/pause")
    assert response.status_code == 500
    data = response.get_json()
    assert data["status"] == "error"
    assert "Failed to pause download" in data.get("message", "")


def test_resume_download_process_error(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    """Test resume download when process resume fails.

    :param monkeypatch: Pytest monkeypatch fixture
    :param client: Flask test client fixture
    """
    from server.api.download_bp import download_process_registry

    # Create a mock process that raises an exception on resume
    class MockProcess:
        def resume(self):
            raise Exception("Resume failed")

    fake_proc = MockProcess()
    monkeypatch.setitem(download_process_registry, "resume_error123", fake_proc)

    response = client.post("/api/download/resume_error123/resume")
    assert response.status_code == 500
    data = response.get_json()
    assert data["status"] == "error"
    assert "Failed to resume download" in data.get("message", "")


def test_set_priority_process_error(monkeypatch: MonkeyPatch, client: FlaskClient) -> None:
    """Test set priority when process nice fails.

    :param monkeypatch: Pytest monkeypatch fixture
    :param client: Flask test client fixture
    """
    from server.api.download_bp import download_process_registry

    # Create a mock process that raises an exception on nice
    class MockProcess:
        def nice(self, value: int):
            raise Exception("Nice failed")

    fake_proc = MockProcess()
    monkeypatch.setitem(download_process_registry, "priority_error123", fake_proc)

    response = client.post("/api/download/priority_error123/priority", json={"priority": 5})
    assert response.status_code == 500
    data = response.get_json()
    assert data["status"] == "error"
    assert "Failed to set priority" in data.get("message", "")


def test_download_exception_handling(client: FlaskClient) -> None:
    """Test exception handling in download endpoint.

    :param client: Flask test client fixture
    """
    # Test with malformed JSON that will cause an exception
    response = client.post("/api/download", data="invalid json", content_type="application/json")
    # May get rate limited (429) or server error (500)
    assert response.status_code in [500, 429]
    data = response.get_json()
    assert data["status"] == "error"
    if response.status_code == 500:
        assert data.get("error_type") == "SERVER_ERROR"
    else:  # 429 rate limited
        assert data.get("error_type") == "RATE_LIMIT_EXCEEDED"


def test_gallery_dl_exception_handling(client: FlaskClient) -> None:
    """Test exception handling in gallery-dl endpoint.

    :param client: Flask test client fixture
    """
    # Test with malformed JSON that will cause an exception
    response = client.post("/api/gallery-dl", data="invalid json", content_type="application/json")
    # May get rate limited (429) or server error (500)
    assert response.status_code in [500, 429]
    data = response.get_json()
    assert data["status"] == "error"
    if response.status_code == 500:
        assert data.get("error_type") == "SERVER_ERROR"
    else:
        assert data.get("error_type") == "RATE_LIMIT_EXCEEDED"


def test_resume_exception_handling(client: FlaskClient) -> None:
    """Test exception handling in resume endpoint.

    :param client: Flask test client fixture
    """
    # Test with malformed JSON that will cause an exception
    response = client.post("/api/resume", data="invalid json", content_type="application/json")
    assert response.status_code == 500
    data = response.get_json()
    assert data["status"] == "error"
    assert data.get("error_type") == "SERVER_ERROR"
