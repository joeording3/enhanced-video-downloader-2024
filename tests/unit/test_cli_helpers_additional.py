import logging
import subprocess
from pathlib import Path
from typing import Any

import pytest
from pytest import LogCaptureFixture, MonkeyPatch

import server.cli_helpers as helpers
from server.constants import get_server_port


class DummyConfig:
    """Simple stub for Config.get_value."""

    def __init__(self, values: dict[str, Any]) -> None:
        self._values = values

    def get_value(self, key: str, default: Any = None) -> Any:
        return self._values.get(key, default)


def test_derive_server_settings_overrides(tmp_path: Path, caplog: LogCaptureFixture) -> None:
    """
    Test that CLI overrides and defaults are applied correctly.

    :param tmp_path: temporary directory fixture.
    :param caplog: pytest LogCaptureFixture for capturing log messages.
    :returns: None
    """
    values: dict[str, Any] = {
        "server_host": "0.0.0.0",
        "server_port": get_server_port(),
        "download_dir": str(tmp_path / "dl"),
    }
    cfg = DummyConfig(values)
    project_root = tmp_path
    logger = logging.getLogger("test")
    # Override host, port, and download_dir
    host, port, dl = helpers.derive_server_settings(cfg, "1.2.3.4", get_server_port(), "~/custom", project_root, logger)  # type: ignore[arg-type]
    assert host == "1.2.3.4"
    assert port == get_server_port()
    # Ensure download_dir is expanded and created
    assert Path(dl).expanduser().exists()


def test_derive_server_settings_defaults(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """
    Test that defaults are used when no CLI overrides provided.

    :param tmp_path: temporary directory fixture.
    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    # Mock test environment detection to return False
    monkeypatch.setattr("sys.argv", ["python", "test_script.py"])
    monkeypatch.delenv("PYTEST_CURRENT_TEST", raising=False)

    values: dict[str, Any] = {}
    cfg = DummyConfig(values)
    project_root = tmp_path
    logger = logging.getLogger("test")
    host, port, dl = helpers.derive_server_settings(cfg, None, None, None, project_root, logger)  # type: ignore[arg-type]
    assert host == "127.0.0.1"
    assert port == get_server_port()
    # Default download_dir under project_root/user_downloads
    expected = project_root / "user_downloads"
    assert Path(dl) == expected


def test_build_extension_scripts_success(monkeypatch: MonkeyPatch, tmp_path: Path, caplog: LogCaptureFixture) -> None:
    """
    Test that extension build logs on success.

    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :param tmp_path: temporary directory fixture.
    :param caplog: pytest LogCaptureFixture for capturing log messages.
    :returns: None
    """
    project_root = tmp_path
    logger = logging.getLogger("test")
    caplog.set_level(logging.INFO)
    # Stub subprocess.run to succeed
    monkeypatch.setattr(subprocess, "run", lambda *args, **kwargs: None)
    helpers.build_extension_scripts(project_root, logger)
    assert "Building extension scripts" in caplog.text
    assert "Extension build complete." in caplog.text


def test_build_extension_scripts_failure(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """
    Test that a CalledProcessError causes SystemExit with the return code.

    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :param tmp_path: temporary directory fixture.
    :returns: None
    """
    project_root = tmp_path
    logger = logging.getLogger("test")

    # Stub subprocess.run to raise CalledProcessError
    def fake_run(*args: Any, **kwargs: Any) -> None:
        raise subprocess.CalledProcessError(returncode=42, cmd="test")

    monkeypatch.setattr(subprocess, "run", fake_run)
    with pytest.raises(SystemExit) as exc:
        helpers.build_extension_scripts(project_root, logger)
    assert exc.value.code == 42
