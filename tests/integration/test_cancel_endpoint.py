import logging
from collections.abc import Generator
from pathlib import Path
from typing import Any

import pytest
from flask.testing import FlaskClient
from pytest import MonkeyPatch

from server.__main__ import create_app
from server.config import Config
from server.downloads.ytdlp import download_process_registry, download_tempfile_registry

pytestmark = pytest.mark.integration


def pytest_configure() -> None:
    """
    Configure pytest to suppress logging during tests.

    :returns: None
    """
    # Suppress logging during tests
    logging.getLogger("server").setLevel(logging.CRITICAL)


class DummyProcess:
    """Mock process for testing download cancellation."""

    def __init__(self) -> None:
        """Initialize dummy process with default state."""
        self.terminated = False
        self.killed = False

    def terminate(self) -> None:
        """Mark process as terminated."""
        self.terminated = True

    def wait(self, timeout: int | None = None) -> None:
        """Mock wait method."""
        return

    def kill(self) -> None:
        """Mark process as killed."""
        self.killed = True


@pytest.fixture(autouse=True)
def clear_registries() -> Generator[None, None, None]:
    """
    Clear download registries before and after each test.

    :returns: Generator that yields None.
    """
    download_process_registry.clear()
    download_tempfile_registry.clear()
    yield
    download_process_registry.clear()
    download_tempfile_registry.clear()


@pytest.fixture
def client(tmp_path: Path, monkeypatch: MonkeyPatch) -> FlaskClient:
    """
    Create test client with mocked configuration.

    :param tmp_path: temporary directory fixture.
    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: Flask test client.
    """

    # Monkeypatch Config.load to use tmp_path as download_dir
    class DummyConfig:
        def get_value(self, key: str, default: Any = None) -> Any:
            if key == "download_dir":
                return str(tmp_path)
            return default

    monkeypatch.setattr(Config, "load", staticmethod(lambda: DummyConfig()))
    app = create_app(Config.load())
    return app.test_client()


def test_cancel_nonexistent(client: FlaskClient) -> None:
    """
    Test canceling a non-existent download returns 404.

    :param client: Flask test client.
    :returns: None
    """
    resp = client.post("/api/download/nonexistent/cancel")
    assert resp.status_code == 404
    data = resp.get_json()
    assert data["status"] == "error"


def test_cancel_active_download(client: FlaskClient, tmp_path: Path) -> None:
    """
    Test canceling an active download terminates process and cleans up files.

    :param client: Flask test client.
    :param tmp_path: temporary directory fixture.
    :returns: None
    """
    download_id = "test123"
    # Register dummy process
    dummy = DummyProcess()
    download_process_registry[download_id] = dummy  # type: ignore[assignment]
    # Register tempfile prefix and create a .part file
    prefix = "prefix"
    download_tempfile_registry[download_id] = prefix
    tmp_part = tmp_path / f"{prefix}.mp4.part"
    tmp_part.write_text("partial")

    # Cancel
    resp = client.post(f"/api/download/{download_id}/cancel")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert dummy.terminated or dummy.killed
    # Partial file should be removed
    assert not tmp_part.exists()
    # Registries cleaned
    assert download_id not in download_process_registry
    assert download_id not in download_tempfile_registry
    assert download_id not in download_tempfile_registry
