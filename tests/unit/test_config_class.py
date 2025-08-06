"""Unit tests for server.config.Config class."""

import json
import os
from pathlib import Path
from typing import Any

import pytest

from server.config import Config
from server.constants import get_server_port

pytestmark = pytest.mark.unit


def test_load_json_override(tmp_path: Path, monkeypatch: Any) -> None:
    """Test Config.load with JSON file override.

    :param tmp_path: Temporary directory path for testing.
    :param monkeypatch: pytest monkeypatch fixture for mocking.
    :returns: None.
    """
    # Create a JSON config file with overrides
    config_data = {"server_port": 9999, "debug_mode": True}
    config_file = tmp_path / "test_config.json"
    config_file.write_text(json.dumps(config_data))
    monkeypatch.setenv("CONFIG_PATH", str(config_file))
    # Ensure no env override
    monkeypatch.delenv("SERVER_PORT", raising=False)
    monkeypatch.delenv("DEBUG_MODE", raising=False)
    cfg = Config.load()
    assert cfg.server_port == 9999
    assert cfg.debug_mode is True


def test_load_json_invalid(tmp_path: Path, monkeypatch: Any) -> None:
    """Test Config.load with invalid JSON file content.

    :param tmp_path: Temporary directory path for testing.
    :param monkeypatch: pytest monkeypatch fixture for mocking.
    :returns: None.
    """
    # Create a JSON config file with invalid content
    config_file = tmp_path / "test_config.json"
    config_file.write_text("not a valid json")
    monkeypatch.setenv("CONFIG_PATH", str(config_file))
    monkeypatch.delenv("SERVER_PORT", raising=False)
    cfg = Config.load()
    # Should fallback to default values
    assert cfg.server_port == get_server_port()
    assert cfg.debug_mode is False


def test_update_config_persistence(monkeypatch: Any, tmp_path: Path) -> None:
    """Test Config.update_config persistence to .env file.

    :param monkeypatch: pytest monkeypatch fixture for mocking.
    :param tmp_path: Temporary directory path for testing.
    :returns: None.
    """
    # Prepare a Config instance with defaults
    cfg = Config({})
    # Fake dotenv functions
    fake_dotenv = tmp_path / ".env"
    # Create the fake .env file
    fake_dotenv.write_text("")
    # Ensure the fake .env path is used
    find_calls = []
    set_key_calls = []
    # Mock the imported functions directly
    monkeypatch.setattr("server.config.find_dotenv", lambda: (find_calls.append("called") or str(fake_dotenv)))
    monkeypatch.setattr("server.config.set_key", lambda path, key, value: set_key_calls.append((path, key, value)))
    # Remove any existing env var
    os.environ.pop("SERVER_PORT", None)
    # Perform update
    cfg.update_config({"server_port": 1234})
    # Verify that the attribute and environment were updated
    assert cfg.server_port == 1234
    assert os.environ.get("SERVER_PORT") == "1234"
    # Verify persistence call
    assert set_key_calls == [(str(fake_dotenv), "SERVER_PORT", "1234")]


def test_update_config_no_dotenv_file(monkeypatch: Any) -> None:
    """Test Config.update_config when .env file is missing.

    :param monkeypatch: pytest monkeypatch fixture for mocking.
    :returns: None.
    """
    cfg = Config({})

    # Simulate missing .env file
    monkeypatch.setattr("server.config.find_dotenv", lambda: "")
    with pytest.raises(FileNotFoundError):
        cfg.update_config({"server_port": get_server_port()})


def test_valid_keys_and_as_dict(tmp_path: Path, monkeypatch: Any) -> None:
    """Test Config.valid_keys and Config.as_dict methods.

    :param tmp_path: Temporary directory path for testing.
    :param monkeypatch: pytest monkeypatch fixture for mocking.
    :returns: None.
    """
    # Use JSON override to get predictable values
    config_data = {"server_port": 3333, "debug_mode": True}
    config_file = tmp_path / "test_config.json"
    config_file.write_text(json.dumps(config_data))
    monkeypatch.setenv("CONFIG_PATH", str(config_file))
    monkeypatch.delenv("DEBUG_MODE", raising=False)
    monkeypatch.delenv("SERVER_PORT", raising=False)
    cfg = Config.load()
    # valid_keys should include known fields
    keys = Config.valid_keys()
    assert "server_port" in keys
    assert "debug_mode" in keys
    # as_dict should reflect the overrides
    cfg_dict = cfg.as_dict()
    assert isinstance(cfg_dict, dict)
    assert cfg_dict.get("server_port") == 3333
    assert cfg_dict.get("debug_mode") is True
