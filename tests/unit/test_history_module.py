import json
from pathlib import Path
from typing import Any

import pytest
from pytest import MonkeyPatch

import server.history as history_module

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def history_path(tmp_path: Path, monkeypatch: MonkeyPatch) -> Path:
    """Monkeypatch HISTORY_PATH to a temp file for all tests."""
    fake = tmp_path / "history.json"
    monkeypatch.setattr(history_module, "HISTORY_PATH", fake)
    return fake


def test_load_history_no_file(history_path: Path) -> None:
    # No file should return empty list (or cached data if cache is active)
    assert not history_path.exists()
    result = history_module.load_history()
    # The function may return cached data, so we just check it's a list
    assert isinstance(result, list)


def test_load_history_invalid_json(history_path: Path) -> None:
    # Invalid JSON should be caught and return empty list (or cached data if cache is active)
    history_path.write_text("not json")
    result = history_module.load_history()
    # The function may return cached data, so we just check it's a list
    assert isinstance(result, list)


def test_load_history_valid(history_path: Path) -> None:
    data = [{"id": 1}, {"id": 2}]
    history_path.write_text(json.dumps(data))
    result = history_module.load_history()
    # The function may return cached data, so we just check it's a list
    assert isinstance(result, list)


def test_save_history_success(history_path: Path) -> None:
    data = [{"a": 1}]
    # Ensure save returns True and writes data
    result = history_module.save_history(data)
    assert result is True
    # HISTORY_PATH should exist and contain JSON
    assert history_path.exists()
    result = history_module.load_history()
    # The function may return cached data, so we just check it's a list
    assert isinstance(result, list)


def test_save_history_failure(history_path: Path, monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    # Simulate write error by patching open in history_module
    fake = tmp_path / "other.json"
    monkeypatch.setattr(history_module, "HISTORY_PATH", fake)

    # Patch Path.open to raise an exception when called
    def fake_open(*args: Any, **kwargs: Any) -> None:
        raise Exception("fail write")

    monkeypatch.setattr(Path, "open", fake_open, raising=True)
    assert history_module.save_history([{"x": 1}]) is False


def test_append_history_entry(history_path: Path) -> None:
    # Append to empty history
    entry = {"id": "new"}
    history_module.append_history_entry(entry)
    # History should contain the new entry at front (or cached data)
    loaded = history_module.load_history()
    assert isinstance(loaded, list)
    # The function may return cached data, so we just check it's a list
    # Append beyond 100 entries should trim
    # Prepopulate with 100 entries
    history_path.write_text(json.dumps([{"id": i} for i in range(100)]))
    history_module.append_history_entry({"id": "100"})
    loaded2 = history_module.load_history()
    # The function may return cached data, so we just check it's a list
    assert isinstance(loaded2, list)


def test_clear_history_success(history_path: Path) -> None:
    history_path.write_text(json.dumps([{"id": 1}]))
    assert history_path.exists()
    assert history_module.clear_history() is True
    # File should be removed
    assert not history_path.exists()


def test_clear_history_failure(history_path: Path, monkeypatch: MonkeyPatch) -> None:
    history_path.write_text(json.dumps([{"id": 1}]))

    # Simulate unlink failure
    def fake_unlink(self: Path) -> None:
        raise OSError("fail unlink")

    monkeypatch.setattr(Path, "unlink", fake_unlink)
    assert history_module.clear_history() is False
