import logging
from typing import Generator, Optional

import pytest
from flask.testing import FlaskClient

from server.__main__ import create_app
from server.config import Config
from server.downloads.ytdlp import download_process_registry
from server.schemas import ServerConfig

pytestmark = pytest.mark.integration


def pytest_configure() -> None:
    """
    Configure pytest to suppress logging during tests.

    :returns: None
    """
    logging.getLogger("server").setLevel(logging.CRITICAL)


@pytest.fixture(autouse=True)
def clear_registry() -> Generator[None, None, None]:
    """
    Clear download process registry before and after each test.

    :returns: Generator that yields None.
    """
    download_process_registry.clear()
    yield
    download_process_registry.clear()


@pytest.fixture
def client() -> FlaskClient:
    """
    Create test client with default sample configuration.

    :returns: Flask test client.
    """
    # Use default sample config
    cfg = Config(ServerConfig())
    app = create_app(cfg)
    return app.test_client()


def test_priority_options(client: FlaskClient) -> None:
    """
    Test that OPTIONS /api/download/{id}/priority returns HTTP 204.

    :param client: Flask test client.
    :returns: None
    """
    resp = client.options("/api/download/testid/priority")
    assert resp.status_code == 204
    assert resp.get_data(as_text=True) == ""


def test_priority_nonexistent(client: FlaskClient) -> None:
    """
    Test that setting priority for non-existent download returns HTTP 404.

    :param client: Flask test client.
    :returns: None
    """
    resp = client.post("/api/download/nonexistent/priority", json={"priority": 1})
    assert resp.status_code == 404
    data = resp.get_json()
    assert data["status"] == "error"
    assert data.get("downloadId") == "nonexistent"


def test_priority_invalid_payload(client: FlaskClient) -> None:
    """
    Test that invalid priority payload returns HTTP 400.

    :param client: Flask test client.
    :returns: None
    """
    resp = client.post("/api/download/testid/priority", json={})
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["status"] == "error"


def test_priority_success(client: FlaskClient) -> None:
    """
    Test successful priority setting for a download.

    :param client: Flask test client.
    :returns: None
    """
    download_id = "prio1"

    class DummyProc:
        def __init__(self) -> None:
            self.priority: Optional[int] = None

        def nice(self, value: int) -> None:
            self.priority = value

    dummy = DummyProc()
    download_process_registry[download_id] = dummy  # type: ignore[assignment]
    resp = client.post(f"/api/download/{download_id}/priority", json={"priority": 42})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["priority"] == 42
    assert dummy.priority == 42


def test_priority_error(client: FlaskClient) -> None:
    """
    Test priority setting error handling.

    :param client: Flask test client.
    :returns: None
    """
    download_id = "prio2"

    class DummyProc:
        def nice(self, value: int) -> None:
            raise Exception("nice error")

    dummy = DummyProc()
    download_process_registry[download_id] = dummy  # type: ignore[assignment]
    resp = client.post(f"/api/download/{download_id}/priority", json={"priority": 3})
    assert resp.status_code == 500
    data = resp.get_json()
    assert data["status"] == "error"
    assert "nice error" in data["message"]
    assert "nice error" in data["message"]
