import logging
import threading
import time
from collections.abc import Generator

import pytest
import requests
from pytest import MonkeyPatch

from server.api import download_bp
from server.downloads.ytdlp import download_process_registry, download_tempfile_registry

pytestmark = pytest.mark.integration


def pytest_configure() -> None:
    """Configure pytest to suppress logging during tests."""
    # Suppress logging during tests
    logging.getLogger("server").setLevel(logging.CRITICAL)


@pytest.fixture(autouse=True)
def clear_registries() -> Generator[None, None, None]:
    """Clear download registries before and after each test.

    :returns: Generator that yields None
    """
    download_process_registry.clear()
    download_tempfile_registry.clear()
    yield
    download_process_registry.clear()
    download_tempfile_registry.clear()


class DummyProc:
    """Mock process for testing concurrent operations."""

    def __init__(self, operation: str) -> None:
        """Initialize dummy process with operation-specific behavior.

        :param operation: Operation type ('pause', 'resume', or 'cancel')
        """
        self.lock = threading.Lock()
        self.count = 0
        self.operation = operation

    def suspend(self) -> None:
        """Simulate suspend operation with race window."""
        if self.operation == "pause":
            time.sleep(0.01)
            with self.lock:
                self.count += 1

    def resume(self) -> None:
        """Simulate resume operation with race window."""
        if self.operation == "resume":
            time.sleep(0.01)
            with self.lock:
                self.count += 1


@pytest.mark.parametrize(
    "operation, downloadId, expected_results, expected_count",
    [
        ("pause", "con_pause", [200, 200], 2),
        ("resume", "con_resume", [200, 200], 2),
    ],
)
def test_concurrent_operations(
    live_server: str, operation: str, downloadId: str, expected_results: list[int], expected_count: int
) -> None:
    """Test concurrent pause and resume operations.

    :param live_server: Live server fixture
    :param operation: Operation to test (pause or resume)
    :param downloadId: Download ID for testing
    :param expected_results: Expected HTTP status codes
    :param expected_count: Expected operation count
    """
    # Register dummy process
    download_process_registry[downloadId] = DummyProc(operation)  # type: ignore[assignment]

    # Perform two concurrent requests
    results: list[int] = []

    def call_operation() -> None:
        resp = requests.post(f"{live_server}/api/download/{downloadId}/{operation}")
        results.append(resp.status_code)

    threads = [threading.Thread(target=call_operation) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # Both should succeed
    assert results == expected_results
    proc = download_process_registry[downloadId]
    assert proc.count == expected_count  # type: ignore[attr-defined]


def test_concurrent_cancel(monkeypatch: MonkeyPatch, live_server: str) -> None:
    """Test concurrent cancel operations.

    :param monkeypatch: Pytest monkeypatch fixture
    :param live_server: Live server fixture
    """
    downloadId = "con_cancel"

    # Setup registries
    download_process_registry[downloadId] = object()  # type: ignore[assignment]
    download_tempfile_registry[downloadId] = f"prefix_{downloadId}"

    # Stub termination and cleanup to avoid real process/file ops
    monkeypatch.setattr(download_bp, "_terminate_proc", lambda proc, id: (None, None))  # type: ignore[attr-defined]
    monkeypatch.setattr(download_bp, "_cleanup_cancel_partfiles", lambda id: None)  # type: ignore[attr-defined]

    results: list[int] = []

    def call_cancel() -> None:
        resp = requests.post(f"{live_server}/api/download/{downloadId}/cancel")
        results.append(resp.status_code)

    threads = [threading.Thread(target=call_cancel) for _ in range(2)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # One success and one 404 error
    assert sorted(results) == [200, 404]
