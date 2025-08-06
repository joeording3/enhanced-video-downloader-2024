"""
Tests for server.logging_setup module.

Tests the logging configuration functions for the Enhanced Video Downloader server.
"""

import logging
from pathlib import Path
from typing import Any

import pytest

from server import logging_setup as logsetup


class DummyConfig:
    """Dummy config object for testing logging setup functions."""

    def __init__(self, log_level: Any = None, console_log_level: Any = None, log_path: Any = None) -> None:
        """Initialize dummy config with test values."""
        self.log_level = log_level
        self.console_log_level = console_log_level
        self.log_path = log_path

    def get_value(self, key: str, default: Any = None) -> Any:
        """Return configured value or default."""
        if key == "log_level":
            return self.log_level
        if key == "console_log_level":
            return self.console_log_level
        if key == "log_path":
            return self.log_path
        return default


def test_ensure_log_file_creates_and_writable(tmp_path: Path) -> None:
    """Test ensure_log_file creates directory and file when they don't exist."""
    # Path does not exist initially
    log_file = tmp_path / "logs" / "app.log"
    path_str = str(log_file)
    # Should create directory and file even if header write fails
    _ = logsetup.ensure_log_file(path_str)
    assert log_file.exists()


def test_ensure_log_file_unwritable(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Test ensure_log_file returns False when file is not writable."""
    # Create file and then simulate not writable
    log_file = tmp_path / "logs2" / "bad.log"
    log_file.parent.mkdir(parents=True, exist_ok=True)
    log_file.write_text("")
    path_str = str(log_file)
    # Monkeypatch os.access in module to return False
    monkeypatch.setattr(logsetup.os, "access", lambda p, mode: False)
    result = logsetup.ensure_log_file(path_str)
    assert result is False


def test_setup_logging_default() -> None:
    """Test setup_logging with default parameters."""
    # This test verifies the function can be called without errors
    logsetup.setup_logging()
    # Verify root logger has handlers
    root_logger = logging.getLogger()
    assert len(root_logger.handlers) > 0


def test_setup_logging_custom_level() -> None:
    """Test setup_logging with custom log level."""
    logsetup.setup_logging(log_level="DEBUG")
    root_logger = logging.getLogger()
    assert root_logger.level == logging.DEBUG


def test_setup_logging_with_file(tmp_path: Path) -> None:
    """Test setup_logging with log file specified."""
    log_file = tmp_path / "test.log"
    logsetup.setup_logging(log_file=str(log_file))
    root_logger = logging.getLogger()
    # Should have both console and file handlers
    assert len(root_logger.handlers) >= 2
