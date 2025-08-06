from pathlib import Path
from typing import Any

import pytest

from server.config import Config, _collect_env_data


def test_get_value_and_getattr() -> None:
    data = {"server_port": 1234, "log_level": "DEBUG"}
    cfg = Config(data)
    # get_value
    assert cfg.get_value("server_port") == 1234
    assert cfg.get_value("unknown_key", default="foo") == "foo"
    # getattr
    assert cfg.log_level == "debug"
    with pytest.raises(AttributeError, match="Missing"):
        _ = cfg.not_a_field


def test_valid_keys_and_as_dict() -> None:
    data = {"server_port": 8000, "download_dir": "/tmp"}
    cfg = Config(data)
    keys = Config.valid_keys()
    assert "server_port" in keys
    d = cfg.as_dict()
    assert isinstance(d, dict)
    assert d.get("server_port") == 8000
    # Path fields should be string in JSON mode
    assert isinstance(d.get("download_dir"), (str,))


def test_load_environment_only(monkeypatch: Any) -> None:
    # Test that Config.load() works with environment variables only
    monkeypatch.setenv("SERVER_PORT", "5555")
    cfg = Config.load()
    assert cfg.server_port == 5555


def test_collect_env_data_empty(monkeypatch: Any) -> None:
    # Remove known env vars (empty list means no vars to remove)
    # Should return a dict (possibly empty)
    data = _collect_env_data()
    assert isinstance(data, dict)


# Test fallback for invalid initial config data
def test_init_invalid_data_swallow(monkeypatch: Any, tmp_path: Path) -> None:
    # Provide invalid log_level to trigger validation error
    data = {"log_level": "INVALID_LEVEL"}
    # Ensure missing config.json
    original_cwd = Path.cwd()
    try:
        monkeypatch.chdir(tmp_path)
        cfg = Config(data)
        # log_level should fallback to default 'info'
        assert cfg.log_level == "info"
    finally:
        # Restore original working directory to prevent junk folder creation
        monkeypatch.chdir(original_cwd)


# Test update_config raises if .env not found
def test_update_config_no_dotenv(monkeypatch: Any) -> None:
    cfg = Config({})
    # Simulate dotenv present but no .env file
    monkeypatch.setenv("CONFIG_PATH", "")
    # Ensure find_dotenv returns empty
    monkeypatch.setattr("server.config.find_dotenv", lambda: "")
    monkeypatch.setattr("server.config.set_key", lambda p, k, v: None)
    with pytest.raises(FileNotFoundError, match="Missing"):
        cfg.update_config({"server_port": 9090})


# Test download_dir validator rejects file paths
def test_validate_download_dir_conflict(tmp_path: Path) -> None:
    # Create a file where download_dir should be
    conflict_file = tmp_path / "conflict"
    conflict_file.write_text("data")
    # Invalid download_dir should fallback to default without raising
    cfg = Config({"download_dir": str(conflict_file)})
    # The path should not be the conflict file
    assert cfg.download_dir != conflict_file
    # Default download_dir should exist or be a Path
    assert isinstance(cfg.download_dir, Path)
