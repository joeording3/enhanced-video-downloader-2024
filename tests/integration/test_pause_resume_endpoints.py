import logging
from collections.abc import Generator

import pytest
from flask.testing import FlaskClient

from server.downloads.ytdlp import download_process_registry

pytestmark = pytest.mark.integration


def pytest_configure() -> None:
    """Configure pytest to suppress logging during tests."""
    # Suppress logging during tests
    logging.getLogger("server").setLevel(logging.CRITICAL)


class DummyProcess:
    """Mock process for testing pause and resume operations."""

    def __init__(self, should_raise: bool = False) -> None:
        """Initialize dummy process with default state.

        :param should_raise: Whether the process should raise exceptions
        """
        self.suspended = False
        self.resumed = False
        self.should_raise = should_raise

    def suspend(self) -> None:
        """Mark process as suspended or raise exception if configured."""
        if self.should_raise:
            raise Exception("suspend error")
        self.suspended = True

    def resume(self) -> None:
        """Mark process as resumed or raise exception if configured."""
        if self.should_raise:
            raise Exception("resume error")
        self.resumed = True


@pytest.fixture(autouse=True)
def clear_registry() -> Generator[None, None, None]:
    """Clear download process registry before and after each test.

    :returns: Generator that yields None
    """
    download_process_registry.clear()
    yield
    download_process_registry.clear()


@pytest.mark.parametrize(
    "endpoint, expected_status",
    [
        ("/api/download/testid/pause", 204),
        ("/api/download/testid/resume", 204),
    ],
)
def test_options_methods(client: FlaskClient, endpoint: str, expected_status: int) -> None:
    """Test OPTIONS methods for pause and resume endpoints.

    :param client: Flask test client fixture
    :param endpoint: API endpoint to test
    :param expected_status: Expected HTTP status code
    """
    resp = client.options(endpoint)
    assert resp.status_code == expected_status
    assert resp.get_data(as_text=True) == ""


@pytest.mark.parametrize(
    "operation, downloadId, status_code, expected_error_message",
    [
        ("pause", "nonexistent", 404, "No active download with given ID."),
        ("resume", "nonexistent", 404, "No paused download with given ID."),
    ],
)
def test_nonexistent_operations(
    client: FlaskClient, operation: str, downloadId: str, status_code: int, expected_error_message: str
) -> None:
    """Test operations on nonexistent downloads return appropriate errors.

    :param client: Flask test client fixture
    :param operation: Operation to test (pause or resume)
    :param downloadId: Download ID being tested
    :param status_code: Expected HTTP status code
    :param expected_error_message: Expected error message
    """
    resp = client.post(f"/api/download/{downloadId}/{operation}")
    assert resp.status_code == status_code
    data = resp.get_json()
    assert data["status"] == "error"
    assert data.get("downloadId") == downloadId


@pytest.mark.parametrize(
    "operation, downloadId, expected_state_attr, expected_success_message",
    [
        ("pause", "pause1", "suspended", "Download paused."),
        ("resume", "resume1", "resumed", "Download resumed."),
    ],
)
def test_successful_operations(
    client: FlaskClient, operation: str, downloadId: str, expected_state_attr: str, expected_success_message: str
) -> None:
    """Test successful pause and resume operations.

    :param client: Flask test client fixture
    :param operation: Operation to test (pause or resume)
    :param downloadId: Download ID being tested
    :param expected_state_attr: Expected state attribute to be set
    :param expected_success_message: Expected success message
    """
    proc = DummyProcess()
    download_process_registry[downloadId] = proc  # type: ignore[assignment]
    resp = client.post(f"/api/download/{downloadId}/{operation}")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert getattr(proc, expected_state_attr) is True


@pytest.mark.parametrize(
    "operation, downloadId, expected_error_message",
    [
        ("pause", "pause2", "suspend error"),
        ("resume", "resume2", "resume error"),
    ],
)
def test_error_operations(client: FlaskClient, operation: str, downloadId: str, expected_error_message: str) -> None:
    """Test pause and resume operations that raise exceptions.

    :param client: Flask test client fixture
    :param operation: Operation to test (pause or resume)
    :param downloadId: Download ID being tested
    :param expected_error_message: Expected error message
    """
    proc = DummyProcess(should_raise=True)
    download_process_registry[downloadId] = proc  # type: ignore[assignment]
    resp = client.post(f"/api/download/{downloadId}/{operation}")
    assert resp.status_code == 500
    data = resp.get_json()
    assert data["status"] == "error"
    assert expected_error_message in data["message"]
