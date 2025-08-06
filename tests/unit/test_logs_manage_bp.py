import builtins
import os
from pathlib import Path
from typing import Any, Dict, Optional

import pytest
from flask.testing import FlaskClient
from pytest import MonkeyPatch

import server.api.logs_manage_bp as logs_manage_module

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def stub_logs_manage(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Stub file operations and Config for logs_manage."""
    # Monkeypatch module __file__ to tmp_dir
    monkeypatch.setattr(logs_manage_module, "__file__", str(tmp_path / "dummy.py"))

    # Stub Config to accept any path and provide no custom log_path
    class DummyConfig:
        @classmethod
        def load(cls):
            instance = cls()
            instance._data = {}
            return instance

        def __init__(self) -> None:
            self._data: Dict[str, Any] = {}

        def get_value(self, key: str) -> Any:
            return self._data.get(key)

    monkeypatch.setattr(logs_manage_module, "Config", DummyConfig)
    # Prepare fake log file
    fake_log = tmp_path / "server_output.log"
    fake_log.write_text("line1")

    # Stub Path.resolve logic
    def fake_exists(self: Path) -> bool:
        return True

    monkeypatch.setattr(Path, "exists", fake_exists)

    def fake_access(path: Any, mode: int) -> bool:
        return True

    monkeypatch.setattr(os, "access", fake_access)

    # Stub Path.rename
    def fake_rename(self: Path, target: Any) -> None:
        return None

    monkeypatch.setattr(Path, "rename", fake_rename)
    # Stub open to write new log
    orig_open = builtins.open

    def fake_open(path: Any, mode: str = "r", encoding: Any = None) -> Any:
        if str(path).endswith("server_output.log"):
            return orig_open(path, mode, encoding=encoding)
        return orig_open(path, mode, encoding=encoding)

    monkeypatch.setattr(builtins, "open", fake_open)


@pytest.mark.parametrize(
    "exists_missing,move_raises,custom_config,expected_status,expected_contains",
    [
        (False, False, False, 200, None),
        (True, False, False, 404, "not found"),
        (False, True, False, 500, "error"),
        (False, False, True, 200, None),
    ],
)
def test_clear_logs_endpoint_variants(
    client: FlaskClient,
    monkeypatch: MonkeyPatch,
    tmp_path: Path,
    exists_missing: bool,
    move_raises: bool,
    custom_config: bool,
    expected_status: int,
    expected_contains: Optional[str],
) -> None:
    """Test POST /logs/clear for various scenarios including missing file, exceptions, and custom paths."""

    # Stub file existence and create log file if needed
    orig_exists = Path.exists

    def fake_exists(self: Path) -> bool:
        if not exists_missing and str(self).endswith("server_output.log") and not orig_exists(self):
            # Create the log file if it doesn't exist
            self.write_text("line1")
        return not exists_missing

    monkeypatch.setattr(Path, "exists", fake_exists)

    def fake_access(path: Any, mode: int) -> bool:
        return True

    monkeypatch.setattr(os, "access", fake_access)

    # Stub rename behavior
    if move_raises:

        def fake_rename_raise(self: Path, target: Any) -> None:
            raise Exception("fail")

        monkeypatch.setattr(Path, "rename", fake_rename_raise)
    else:

        def fake_rename(self: Path, target: Any) -> None:
            return None

        monkeypatch.setattr(Path, "rename", fake_rename)

    # Custom config handling
    if custom_config:
        custom_log = tmp_path / "custom.log"
        custom_log.write_text("line1")

        class CustomConfig:
            @classmethod
            def load(cls):
                instance = cls()
                instance._data = {"log_path": str(custom_log)}
                return instance

            def __init__(self) -> None:
                self._data: Dict[str, Any] = {}

            def get_value(self, key: str) -> Any:
                return self._data.get(key)

        monkeypatch.setattr(logs_manage_module, "Config", CustomConfig)

    resp = client.post("/logs/clear")
    assert resp.status_code == expected_status
    text = resp.get_data(as_text=True).lower()
    if expected_contains:
        assert expected_contains in text
    else:
        assert "archived" in text or "cleared" in text
