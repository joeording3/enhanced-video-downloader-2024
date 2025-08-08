"""
Configuration file for pytest.

This file contains configuration for pytest, including fixtures and plugins.
"""

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
from server.schemas import ServerConfig

# Add the server directory to the path so tests can import modules
sys.path.insert(0, str(Path(__file__).parent.parent.resolve()))


@pytest.fixture
def sample_download_request() -> dict[str, Any]:
    """Return a sample download request for testing."""
    return {
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "user_agent": "chrome",
        "is_playlist": False,
    }


@pytest.fixture
def sample_config() -> dict[str, Any]:
    """Return a sample configuration for testing."""
    return {
        "server_port": 5050,
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


# Ensure rate limit storage does not leak across tests, which can cause
# unexpected 429 responses in otherwise independent test cases.
@pytest.fixture(autouse=True)
def _reset_rate_limits() -> Generator[None, None, None]:
    """Clear in-memory rate limit storage before and after each test."""
    clear_rate_limit_storage()
    yield
    clear_rate_limit_storage()
