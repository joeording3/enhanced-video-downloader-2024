from pathlib import Path
from typing import Any

import pytest
from flask import Flask
from pytest import LogCaptureFixture, MonkeyPatch

import server.api.debug_bp as dbg


@pytest.fixture
def app() -> Flask:
    """
    Flask application for testing endpoints.

    :returns: Flask application instance.
    """
    return Flask(__name__)


def test_debug_paths_with_files_and_config(
    app: Flask, tmp_path: Path, monkeypatch: MonkeyPatch, caplog: LogCaptureFixture
) -> None:
    """
    Test debug_paths returns expected JSON when logs and config exist.

    :param app: Flask application instance.
    :param tmp_path: temporary directory fixture.
    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :param caplog: pytest LogCaptureFixture for capturing log messages.
    :returns: None
    """
    # Setup fake project structure under tmp_path
    # Create nested folders for debug_bp module location
    fake_module_dir = tmp_path / "x" / "y" / "z"
    fake_module_dir.mkdir(parents=True)
    fake_module_file = fake_module_dir / "debug_bp.py"
    fake_module_file.write_text("")
    # Monkeypatch module __file__ to our fake path
    monkeypatch.setattr(dbg, "__file__", str(fake_module_file))
    # Determine project_root as three levels up from module file
    project_root = Path(fake_module_file).parent.parent.parent
    # Configuration is now environment-only, no config files needed
    # server_output.log at root
    root_log = project_root / "server_output.log"
    root_log.write_text("")
    # logs directory with one log file
    logs_dir = project_root / "logs"
    logs_dir.mkdir()
    log1 = logs_dir / "app.log"
    log1.write_text("log")
    # server/server_output.log
    server_dir = project_root / "server"
    server_dir.mkdir()
    server_log = server_dir / "server_output.log"
    server_log.write_text("")
    # Capture any warnings
    caplog.set_level("DEBUG")
    # Run endpoint under test_request_context
    with app.test_request_context():
        resp = dbg.debug_paths()
    assert resp.status_code == 200
    data = resp.get_json()
    # Validate keys
    assert data["project_root"] == str(project_root)
    assert data["current_working_dir"] == str(Path.cwd())
    assert data["config_path"] == "environment-only"
    assert data["config_exists"] is True
    # config_content should be a dict (from environment)
    assert isinstance(data["config_content"], dict)
    # log_files should list at least root and one log entry
    paths = [entry["path"] for entry in data["log_files"]]
    assert str(root_log) in paths
    assert str(log1) in paths
    assert str(server_log) in paths
    # test_write should indicate success and path under project_root/logs
    tw = data["test_write"]
    assert tw["success"] is True
    assert Path(tw["path"]).parent == project_root / "logs"


def test_debug_paths_with_env_config_path(
    app: Flask, tmp_path: Path, monkeypatch: MonkeyPatch, caplog: LogCaptureFixture
) -> None:
    """Test debug_paths with environment-only configuration."""
    # Setup fake project structure
    fake_module_dir = tmp_path / "x" / "y" / "z"
    fake_module_dir.mkdir(parents=True)
    fake_module_file = fake_module_dir / "debug_bp.py"
    fake_module_file.write_text("")
    monkeypatch.setattr(dbg, "__file__", str(fake_module_file))

    caplog.set_level("DEBUG")
    with app.test_request_context():
        resp = dbg.debug_paths()

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["config_path"] == "environment-only"
    assert data["config_exists"] is True
    assert isinstance(data["config_content"], dict)


def test_debug_paths_with_config_dir_path(
    app: Flask, tmp_path: Path, monkeypatch: MonkeyPatch, caplog: LogCaptureFixture
) -> None:
    """Test debug_paths with environment-only configuration."""
    # Setup fake project structure
    fake_module_dir = tmp_path / "x" / "y" / "z"
    fake_module_dir.mkdir(parents=True)
    fake_module_file = fake_module_dir / "debug_bp.py"
    fake_module_file.write_text("")
    monkeypatch.setattr(dbg, "__file__", str(fake_module_file))

    caplog.set_level("DEBUG")
    with app.test_request_context():
        resp = dbg.debug_paths()

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["config_path"] == "environment-only"
    assert data["config_exists"] is True
    assert isinstance(data["config_content"], dict)
    assert "from_root" not in data["config_content"]


def test_debug_paths_config_load_exception(
    app: Flask, tmp_path: Path, monkeypatch: MonkeyPatch, caplog: LogCaptureFixture
) -> None:
    """Test debug_paths when config file exists but both JSON and Config.load() fail."""
    # Setup fake project structure
    fake_module_dir = tmp_path / "x" / "y" / "z"
    fake_module_dir.mkdir(parents=True)
    fake_module_file = fake_module_dir / "debug_bp.py"
    fake_module_file.write_text("")
    monkeypatch.setattr(dbg, "__file__", str(fake_module_file))
    project_root = Path(fake_module_file).parent.parent.parent

    # Create invalid config file
    config_file = project_root / "config.json"
    config_file.write_text("invalid json")

    # Mock Config.load to raise exception
    def failing_load(cls: Any) -> None:
        raise Exception("Config load failed")

    monkeypatch.setattr("server.config.Config.load", classmethod(failing_load))

    caplog.set_level("DEBUG")
    with app.test_request_context():
        resp = dbg.debug_paths()

    assert resp.status_code == 200
    data = resp.get_json()
    assert data["config_exists"] is True
    assert data["config_content"]["error"] == "Config load failed"
