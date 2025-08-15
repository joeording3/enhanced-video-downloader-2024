"""
Configuration file for pytest.

This file contains configuration for pytest, including fixtures and plugins.
"""

from __future__ import annotations

import os
import sys
from collections.abc import Generator
from pathlib import Path
from threading import Thread
from typing import Any

import pytest
from click.testing import CliRunner
from flask import Flask
from flask.testing import FlaskClient
from werkzeug.serving import make_server

from server import create_app
from server.api.download_bp import clear_rate_limit_storage
from server.config import Config
from server.constants import get_test_port_range
from server.schemas import ServerConfig
from server.utils import find_available_port

# Add the server directory to the path so tests can import modules
sys.path.insert(0, str(Path(__file__).parent.parent.resolve()))


# Ensure logging never writes to production log during tests, even for the
# earliest imports/initializations that might occur before function-scoped fixtures.
@pytest.fixture(scope="session", autouse=True)
def _session_logging_isolation() -> Generator[None, None, None]:
    """Set a session-wide default test log file before any tests run.

    This prevents accidental writes to the project-level ``server_output.log``
    if any test (or import side-effect) initializes logging before our
    function-scoped environment fixture can override ``LOG_PATH``.
    """
    prev_log = os.environ.get("LOG_PATH")
    # Use repo-local tmp directory which is ignored by junk folder checks
    session_log = Path(__file__).resolve().parent.parent / "tmp" / "server_output_test.session.log"
    session_log.parent.mkdir(parents=True, exist_ok=True)
    os.environ["LOG_PATH"] = str(session_log)
    try:
        yield
    finally:
        if prev_log is None:
            os.environ.pop("LOG_PATH", None)
        else:
            os.environ["LOG_PATH"] = prev_log


@pytest.fixture
def sample_download_request() -> dict[str, Any]:
    """Return a sample download request for testing."""
    return {
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "user_agent": "chrome",
        "is_playlist": False,
    }


@pytest.fixture(scope="session")
def test_server_port() -> int:
    """Dynamically choose an available port within the test range for this test session."""
    start, end = get_test_port_range()
    count = max(1, end - start + 1)
    return find_available_port(start, count)


@pytest.fixture
def sample_config(test_server_port: int) -> dict[str, Any]:
    """Return a sample configuration for testing using the dynamic test port."""
    return {
        "server_port": test_server_port,
        "download_dir": "/tmp/downloads",
        "debug_mode": True,
    }


@pytest.fixture
def app(sample_config: dict[str, Any]) -> Flask:
    """Create and return a Flask app using the sample config."""
    pydantic_config = ServerConfig.model_validate(sample_config)
    cfg = Config(pydantic_config)
    return create_app(cfg)


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    """Return a test client for the Flask app."""
    return app.test_client()


@pytest.fixture
def runner() -> CliRunner:
    """Return a Click CLI runner for testing CLI commands."""
    return CliRunner()


@pytest.fixture
def tmp_logs_dir(tmp_path: Path) -> Path:
    """Return a temporary directory for logs."""
    logs_dir: Path = tmp_path / "logs"
    logs_dir.mkdir()
    return logs_dir


@pytest.fixture
def filesystem_state(tmp_path: Path) -> Path:
    """Provide a temporary filesystem root for creating files and dirs."""
    return tmp_path


@pytest.fixture
def live_server(app: Flask) -> Generator[str, None, None]:
    """Start the Flask app in a background thread and yield its base URL."""
    server = make_server("127.0.0.1", 0, app)
    port = server.server_port
    thread = Thread(target=server.serve_forever)
    thread.daemon = True
    thread.start()
    yield f"http://127.0.0.1:{port}"
    server.shutdown()
    thread.join()


@pytest.fixture(autouse=True)
def enforce_cwd_isolation() -> Generator[None, None, None]:
    """
    Enforce working directory isolation to prevent junk folder creation.

    This fixture ensures that the working directory is restored after each test,
    preventing tests from accidentally creating directories in the project root.
    """
    original_cwd = Path.cwd()
    yield None
    # Restore original working directory after each test
    if Path.cwd() != original_cwd:
        os.chdir(original_cwd)


@pytest.fixture(autouse=True)
def _test_env_isolation(tmp_path: Path, test_server_port: int) -> Generator[None, None, None]:
    """Force test environment settings and redirect logs to a temp file.

    - ENVIRONMENT=testing selects testing port config in helpers
    - LOG_PATH points to a temp log file under pytest tmp_path
    - SERVER_PORT set to an available test port for the duration of each test
    """
    prev_env = os.environ.get("ENVIRONMENT")
    prev_log = os.environ.get("LOG_PATH")
    prev_port = os.environ.get("SERVER_PORT")

    # Temp log file
    test_log = tmp_path / "server_output_test.log"
    os.environ["ENVIRONMENT"] = "testing"
    os.environ["LOG_PATH"] = str(test_log)
    os.environ["SERVER_PORT"] = str(test_server_port)

    try:
        yield
    finally:
        # Restore prior env
        if prev_env is None:
            os.environ.pop("ENVIRONMENT", None)
        else:
            os.environ["ENVIRONMENT"] = prev_env
        if prev_log is None:
            os.environ.pop("LOG_PATH", None)
        else:
            os.environ["LOG_PATH"] = prev_log
        if prev_port is None:
            os.environ.pop("SERVER_PORT", None)
        else:
            os.environ["SERVER_PORT"] = prev_port


# Ensure rate limit storage does not leak across tests, which can cause
# unexpected 429 responses in otherwise independent test cases.
@pytest.fixture(autouse=True)
def _reset_rate_limits() -> Generator[None, None, None]:
    """Clear in-memory rate limit storage before and after each test."""
    clear_rate_limit_storage()
    yield
    clear_rate_limit_storage()


@pytest.fixture(autouse=True)
def _cleanup_download_registries() -> Generator[None, None, None]:
    """Clear download registries after each test to prevent test processes from creating real history entries."""
    # Clean up before each test to ensure clean state
    try:
        from server.downloads import unified_download_manager
        from server.downloads.ytdlp import download_process_registry

        # Clear any existing test downloads
        test_ids = [did for did in list(unified_download_manager._downloads.keys())
                    if did.startswith(("test", "cleanup", "pause_error", "resume_error", "priority_error"))]
        for test_id in test_ids:
            unified_download_manager.remove_download(test_id)

    except Exception as e:
        # Don't fail tests on cleanup errors
        print(f"Warning: Failed to cleanup download registries before test: {e}")

    yield

    # Clean up after each test
    try:
        # Clear the download process registry
        download_process_registry._processes.clear()
        download_process_registry._cleanup_count = 0

        # Clear the unified download manager
        unified_download_manager._downloads.clear()
        unified_download_manager._queue_order.clear()

        # Clear any test downloads from the unified manager
        test_ids = [did for did in list(unified_download_manager._downloads.keys())
                    if did.startswith(("test", "cleanup", "pause_error", "resume_error", "priority_error"))]
        for test_id in test_ids:
            unified_download_manager.remove_download(test_id)

    except Exception as e:
        # Don't fail tests on cleanup errors
        print(f"Warning: Failed to cleanup download registries after test: {e}")
