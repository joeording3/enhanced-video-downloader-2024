"""Unit tests for server.cli_helpers functions."""

import json
import logging
import os
import socket
import time
from pathlib import Path

import pytest
from _pytest.capture import CaptureFixture
from pytest import LogCaptureFixture, MonkeyPatch

import server.cli_helpers as helpers
from server.cli.utils import (
    _create_config_backup,
    _filter_by_section,
    _requires_restart,
    _show_changes,
    _validate_and_convert_value,
    _validate_updates,
)
from server.config import Config
from server.constants import get_server_port


def test_check_port_available_and_unavailable() -> None:
    """Test check_port_available returns correct availability status."""
    # Choose a random high port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))  # let OS pick free port
        port = s.getsockname()[1]
        # While bound, port should be unavailable
        assert helpers.check_port_available(port) is False
    # After closing, port should be available
    assert helpers.check_port_available(port) is True


@pytest.mark.parametrize(
    "lock_content, expected_pid, description",
    [
        (None, None, "No lock file present should return None"),
        ("", None, "Empty lock file should return None"),
        ("abc:def", None, "Malformed lock file should return None"),
        ("12345:60000", 12345, "Valid lock file should return correct PID"),
    ],
)
def test_get_lock_pid_various_cases(
    tmp_path: Path, monkeypatch: MonkeyPatch, lock_content: str | None, expected_pid: int | None, description: str
) -> None:
    """
    Test get_lock_pid for various lock file contents using parameterization.

    :param tmp_path: Temporary directory for test files
    :param monkeypatch: Pytest monkeypatch fixture
    :param lock_content: Content to write to the lock file (or None for no file)
    :param expected_pid: Expected PID result (or None)
    :param description: Test case description for clarity
    """
    lock_file = tmp_path / "server.lock"
    monkeypatch.setattr(helpers, "LOCK_FILE", lock_file)
    if lock_content is not None:
        lock_file.write_text(lock_content)
    result = helpers.get_lock_pid()
    assert result == expected_pid


@pytest.mark.parametrize(
    "lock_content, expected_result, description",
    [
        ("12345:61000", True, "Valid lock file and process should be found"),
        ("not_a_pid:xyz_port", False, "Malformed lock file should return empty list"),
        (None, False, "No lock file should return empty list"),
    ],
)
def test_find_server_processes_various_cases(
    tmp_path: Path, monkeypatch: MonkeyPatch, lock_content: str | None, expected_result: bool, description: str
) -> None:
    """
    Test find_server_processes_cli for various lock file scenarios using parameterization.

    :param tmp_path: Temporary directory for test files
    :param monkeypatch: Pytest monkeypatch fixture
    :param lock_content: Content to write to the lock file (or None for no file)
    :param expected_result: Whether a process should be found
    :param description: Test case description for clarity
    """

    class FakeProc:
        def __init__(self, pid: int) -> None:
            self.pid = pid
            self._create_time = time.time() - 5

        def is_running(self) -> bool:
            return True

        def create_time(self) -> float:
            return self._create_time

    lock_file = tmp_path / "server.lock"
    monkeypatch.setattr(helpers, "LOCK_FILE", lock_file)
    monkeypatch.setattr(helpers.psutil, "Process", FakeProc)
    if lock_content is not None:
        lock_file.write_text(lock_content)
    procs = helpers.find_server_processes_cli()
    if expected_result:
        assert isinstance(procs, list) and len(procs) == 1
        entry = procs[0]
        assert "pid" in entry and "port" in entry and "uptime" in entry
    else:
        assert procs == []


def test_create_get_and_remove_lock_file(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """Test creation, retrieval, and removal of lock file functionality."""
    # Monkeypatch LOCK_FILE to temporary path
    lock_file = tmp_path / "server.lock"
    monkeypatch.setattr(helpers, "LOCK_FILE", lock_file)

    # Initially, get_lock_pid should return None
    assert helpers.get_lock_pid() is None

    # Create lock file with current pid and port
    pid = os.getpid()
    port = get_server_port()
    helpers.create_lock_file(port)
    # File should exist
    assert lock_file.exists()
    # Content should match "pid:port"
    content = lock_file.read_text()
    assert content == f"{pid}:{port}"

    # get_lock_pid should return pid
    assert helpers.get_lock_pid() == pid

    # Removing lock file
    helpers.remove_lock_file()
    assert not lock_file.exists()
    # get_lock_pid returns None again
    assert helpers.get_lock_pid() is None


def _setup_resume_url_scenario(tmp_path: Path, scenario: str) -> Path:
    """Helper to set up the .part and .info.json files for resume URL tests."""
    if scenario == "primary_info":
        part_file = tmp_path / "video.mp4.part"
        part_file.write_text("")
        info_file = tmp_path / "video.mp4.info.json"
        data = {"webpage_url": "https://example.com/video"}
        info_file.write_text(json.dumps(data))
        return part_file
    if scenario == "fallback_info":
        part_file = tmp_path / "video.mp4.part"
        part_file.write_text("")
        fallback_file = tmp_path / "video.info.json"
        data = {"webpage_url": "https://fallback.example/video"}
        fallback_file.write_text(json.dumps(data))
        return part_file
    if scenario == "no_info":
        part_file = tmp_path / "missing.part"
        part_file.write_text("")
        return part_file
    if scenario == "malformed_json":
        part_file = tmp_path / "video.part"
        part_file.write_text("")
        info_file = tmp_path / "video.info.json"
        info_file.write_text("{not valid json}")
        return part_file
    raise ValueError(f"Unknown scenario: {scenario}")


@pytest.mark.parametrize(
    "scenario, expected_url, expected_log, log_level",
    [
        ("primary_info", "https://example.com/video", "Found URL", logging.DEBUG),
        ("fallback_info", "https://fallback.example/video", "Found URL", logging.WARNING),
        ("no_info", None, "No .info.json found for", logging.WARNING),
        ("malformed_json", None, "Failed to parse", logging.WARNING),
    ],
)
def test_derive_resume_url_scenarios(
    tmp_path: Path, caplog: LogCaptureFixture, scenario: str, expected_url: str, expected_log: str, log_level: int
):
    """
    Test _derive_resume_url for various info.json scenarios using parameterization.

    :param tmp_path: Temporary directory for test files
    :param caplog: Pytest log capture fixture
    :param scenario: Scenario type (primary_info, fallback_info, no_info, malformed_json)
    :param expected_url: Expected URL result (or None)
    :param expected_log: Expected log message substring
    :param log_level: Log level to set for the test
    """
    part_file = _setup_resume_url_scenario(tmp_path, scenario)
    caplog.set_level(log_level)
    logger = logging.getLogger("test")
    url = helpers._derive_resume_url(part_file, logger)
    assert url == expected_url
    assert expected_log in caplog.text


# Configuration command tests
@pytest.mark.parametrize(
    "section, expected_keys, unexpected_keys, description",
    [
        ("server", ["server_host", "server_port"], ["download_dir"], "Server section should only contain server keys"),
        ("download", ["download_dir"], ["server_host"], "Download section should only contain download keys"),
        ("unknown", ["server_host", "server_port", "download_dir"], [], "Unknown section should return all keys"),
    ],
)
def test_filter_by_section_various_cases(
    section: str, expected_keys: list, unexpected_keys: list, description: str
) -> None:
    """
    Test _filter_by_section for various section types using parameterization.

    :param section: Section name to filter by
    :param expected_keys: Keys that should be present in filtered result
    :param unexpected_keys: Keys that should not be present in filtered result
    :param description: Test case description for clarity
    """
    config_dict = {
        "server_host": "127.0.0.1",
        "server_port": get_server_port(),
        "download_dir": "/test/dir",
        "log_level": "info",
        "show_download_button": True,
        "yt_dlp_options": {"format": "best"},
    }
    filtered_config = _filter_by_section(config_dict, section)
    for key in expected_keys:
        assert key in filtered_config
    for key in unexpected_keys:
        assert key not in filtered_config


@pytest.mark.parametrize(
    "key, value, expected_result, description",
    [
        ("server_port", "8080", 8080, "Valid integer conversion"),
        ("max_concurrent_downloads", "5", 5, "Valid integer conversion"),
        ("debug_mode", "true", True, "Boolean true conversion"),
        ("debug_mode", "1", True, "Boolean one conversion"),
        ("debug_mode", "false", False, "Boolean false conversion"),
        ("log_level", "debug", "debug", "String value unchanged"),
        ("server_port", "invalid", None, "Invalid integer conversion"),
        ("max_concurrent_downloads", "abc", None, "Invalid integer conversion"),
    ],
)
def test_validate_and_convert_value_various_cases(key: str, value: str, expected_result, description: str) -> None:
    """
    Test _validate_and_convert_value for various input combinations using parameterization.

    :param key: Configuration key to test
    :param value: String value to convert
    :param expected_result: Expected conversion result
    :param description: Test case description for clarity
    """
    result = _validate_and_convert_value(key, value)
    assert result == expected_result


@pytest.mark.parametrize(
    "updates, expected_errors, description",
    [
        ({"server_port": 8080, "log_level": "debug"}, [], "Valid updates should have no errors"),
        ({"server_port": 70000}, ["Server port must be between 1 and 65535"], "Invalid port should have error"),
        ({"log_level": "invalid"}, ["Log level must be one of"], "Invalid log level should have error"),
        ({"unknown_key": "value"}, ["Unknown configuration key"], "Unknown key should have error"),
    ],
)
def test_validate_updates_various_cases(updates: dict, expected_errors: list, description: str) -> None:
    """
    Test _validate_updates for various update scenarios using parameterization.

    :param updates: Configuration updates to validate
    :param expected_errors: Expected error messages
    :param description: Test case description for clarity
    """
    config_data = Config.load()
    errors = _validate_updates(updates, config_data)
    if expected_errors:
        for expected_error in expected_errors:
            assert any(expected_error in error for error in errors)
    else:
        assert len(errors) == 0


@pytest.mark.parametrize(
    "updates, requires_restart, description",
    [
        ({"server_port": 8080, "log_level": "debug"}, True, "Server settings require restart"),
        ({"debug_mode": True, "enable_history": False}, False, "UI settings don't require restart"),
        ({"server_port": 8080, "debug_mode": True}, True, "Mixed settings require restart"),
    ],
)
def test_requires_restart_various_cases(updates: dict, requires_restart: bool, description: str) -> None:
    """
    Test _requires_restart for various update combinations using parameterization.

    :param updates: Configuration updates to check
    :param requires_restart: Whether restart is required
    :param description: Test case description for clarity
    """

    result = _requires_restart(updates)
    assert result is requires_restart


def test_show_changes(capsys: CaptureFixture[str]) -> None:
    """Test change display functionality."""
    from server.config import Config

    config_data = Config.load()
    updates = {"server_port": 8080, "log_level": "debug"}

    _show_changes(config_data, updates)
    captured = capsys.readouterr()

    assert "Configuration changes:" in captured.out
    assert "server_port:" in captured.out
    assert "log_level:" in captured.out


def test_create_config_backup(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """Test configuration backup creation."""

    from server.config import Config

    # Mock the backup directory
    backup_dir = tmp_path / "config" / "backups"
    backup_dir.mkdir(parents=True)
    monkeypatch.setattr("server.cli.utils.Path", lambda x: backup_dir if "backups" in str(x) else Path(x))

    config_data = Config.load()

    # Test backup creation
    _create_config_backup(config_data)

    # Check that backup file was created
    backup_files = list(backup_dir.glob("config_backup_*.json"))
    assert len(backup_files) == 1

    # Verify backup content
    with open(backup_files[0]) as f:
        backup_data = json.load(f)

    assert isinstance(backup_data, dict)
    assert "server_port" in backup_data
    assert "server_port" in backup_data
