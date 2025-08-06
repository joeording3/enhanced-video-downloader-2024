import logging
import signal
from pathlib import Path
from typing import Any

import pytest
from pytest import LogCaptureFixture, MonkeyPatch

import server.__main__ as main_mod
from server.__main__ import (
    _remove_part_files,
    cleanup_part_files,
    graceful_shutdown,
    register_download_process,
    unregister_download_process,
)
from server.config import Config


def test_register_unregister_download_process() -> None:
    """
    Test registering and unregistering download processes.

    :returns: None
    """
    # Ensure the active processes set is clear
    main_mod._active_download_processes.clear()
    proc = object()
    register_download_process(proc)  # type: ignore[arg-type]
    assert proc in main_mod._active_download_processes
    unregister_download_process(proc)  # type: ignore[arg-type]
    assert proc not in main_mod._active_download_processes


def test_remove_part_files(tmp_path: Path) -> None:
    """
    Test removing part files from the filesystem.

    :param tmp_path: temporary directory fixture.
    :returns: None
    """
    # Create two files
    f1 = tmp_path / "c.part"
    f2 = tmp_path / "d.part"
    f1.write_text("1")
    f2.write_text("2")
    # Remove them
    _remove_part_files([f1, f2])
    assert not f1.exists() and not f2.exists()


def test_cleanup_part_files_no_config(monkeypatch: MonkeyPatch, caplog: LogCaptureFixture) -> None:
    """
    Test part cleanup when no download directory is configured.

    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :param caplog: pytest LogCaptureFixture for capturing log messages.
    :returns: None
    """
    caplog.set_level(logging.WARNING)

    # Config.load returns object without download_dir
    class DummyCfg:
        def get_value(self, key: str, default: Any = None) -> Any:
            return None

    monkeypatch.setattr(Config, "load", classmethod(lambda cls: DummyCfg()))
    # Should skip cleanup with warning
    cleanup_part_files()
    assert "skip" in caplog.text.lower()


def test_graceful_shutdown_exits() -> None:
    """
    Test graceful shutdown signal handling.

    :returns: None
    """
    # Reset shutdown flag
    main_mod._shutdown_in_progress = False
    # First signal exit
    with pytest.raises(SystemExit) as se:
        graceful_shutdown(signal.SIGINT, None)
    assert se.value.code == 0
    # Subsequent exit without error
    with pytest.raises(SystemExit) as se2:
        graceful_shutdown(signal.SIGTERM, None)
    assert se2.value.code == 0
