from typing import Any

import pytest

pytestmark = pytest.mark.integration


def test_config_options_method(client: Any) -> None:
    """Test that OPTIONS /api/config returns CORS headers and 200.

    :param client: Flask test client fixture
    """
    resp = client.options("/api/config")
    assert resp.status_code == 200
    assert resp.get_json()["success"] is True
    # CORS headers
    headers = resp.headers
    assert "Access-Control-Allow-Origin" in headers
    assert "Access-Control-Allow-Methods" in headers


def test_get_config_success(client: Any, monkeypatch: Any) -> None:
    """Test GET /api/config returns config.as_dict().

    :param client: Flask test client fixture
    :param monkeypatch: Pytest monkeypatch fixture
    """

    class DummyConfig:
        def as_dict(self) -> dict[str, str]:
            return {"k": "v"}

    monkeypatch.setattr("server.api.config_bp.Config.load", lambda: DummyConfig())
    resp = client.get("/api/config")
    assert resp.status_code == 200
    data = resp.get_json()
    # Environment overlays may add keys; ensure base config is present
    assert data["k"] == "v"


def test_get_config_load_failure(client: Any, monkeypatch: Any) -> None:
    """Test GET /api/config returns 500 when Config.load fails.

    :param client: Flask test client fixture
    :param monkeypatch: Pytest monkeypatch fixture
    """
    monkeypatch.setattr(
        "server.api.config_bp.Config.load",
        lambda: (_ for _ in ()).throw(Exception("load fail")),
    )
    resp = client.get("/api/config")
    assert resp.status_code == 500
    data = resp.get_json()
    assert data["success"] is False
    assert "Failed to load server configuration" in data["error"]


@pytest.mark.parametrize(
    "payload, content_type, expected_status, expected_error_pattern",
    [
        ("notjson", "text/plain", 415, "Content-Type"),
        ([1, 2, 3], "application/json", 400, "expected an object"),
        ({}, "application/json", 400, "No data provided"),
    ],
)
def test_post_config_invalid_payloads(
    client: Any, monkeypatch: Any, payload: Any, content_type: str, expected_status: int, expected_error_pattern: str
) -> None:
    """Test POST /api/config with various invalid payloads returns appropriate errors.

    :param client: Flask test client fixture
    :param monkeypatch: Pytest monkeypatch fixture
    :param payload: Request payload to test
    :param content_type: Content type for the request
    :param expected_status: Expected HTTP status code
    :param expected_error_pattern: Expected error message pattern
    """
    if content_type == "application/json":

        class DummyConfig:
            def as_dict(self) -> dict[str, Any]:
                return {}

        monkeypatch.setattr("server.api.config_bp.Config.load", lambda: DummyConfig())
        resp = client.post("/api/config", json=payload)
    else:
        resp = client.post("/api/config", data=payload, content_type=content_type)

    assert resp.status_code == expected_status
    data = resp.get_json()
    assert data["success"] is False
    assert expected_error_pattern in data["error"]


def test_post_config_validation_error(client: Any, monkeypatch: Any) -> None:
    """Test POST /api/config with invalid field type returns validation error.

    :param client: Flask test client fixture
    :param monkeypatch: Pytest monkeypatch fixture
    """

    class DummyConfig:
        def as_dict(self) -> dict[str, Any]:
            return {}

    monkeypatch.setattr("server.api.config_bp.Config.load", lambda: DummyConfig())
    # server_port expects int
    resp = client.post("/api/config", json={"server_port": "notint"})
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["success"] is False
    assert "error" in data


def test_post_config_success(client: Any, monkeypatch: Any) -> None:
    """Test POST /api/config with valid payload applies update and returns new config.

    :param client: Flask test client fixture
    :param monkeypatch: Pytest monkeypatch fixture
    """
    called = {}

    class DummyConfig:
        def __init__(self) -> None:
            self.updated = False

        def as_dict(self) -> dict[str, int]:
            return {"a": 1}

        def update_config(self, payload: dict[str, Any]) -> None:
            called["payload"] = payload

    monkeypatch.setattr("server.api.config_bp.Config.load", lambda: DummyConfig())
    resp = client.post("/api/config", json={"server_port": 6000})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True
    assert "new_config" in data and data["new_config"]["a"] == 1
    assert called["payload"] == {"server_port": 6000}


@pytest.mark.parametrize(
    "exception_type, exception_message, expected_status, expected_error_pattern",
    [
        (ValueError, "bad", 400, "bad"),
        (Exception, "oops", 500, "Failed to update configuration"),
    ],
)
def test_post_config_update_errors(
    client: Any,
    monkeypatch: Any,
    exception_type: type,
    exception_message: str,
    expected_status: int,
    expected_error_pattern: str,
) -> None:
    """Test POST /api/config when update_config raises various exceptions.

    :param client: Flask test client fixture
    :param monkeypatch: Pytest monkeypatch fixture
    :param exception_type: Type of exception to raise
    :param exception_message: Exception message
    :param expected_status: Expected HTTP status code
    :param expected_error_pattern: Expected error message pattern
    """

    class DummyConfig:
        def as_dict(self) -> dict[str, Any]:
            return {}

        def update_config(self, payload: dict[str, Any]) -> None:
            raise exception_type(exception_message)

    monkeypatch.setattr("server.api.config_bp.Config.load", lambda: DummyConfig())
    resp = client.post("/api/config", json={"server_port": 6000})
    assert resp.status_code == expected_status
    data = resp.get_json()
    assert data["success"] is False
    assert expected_error_pattern in data["error"]
