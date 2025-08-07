from pathlib import Path
from typing import Any
from unittest.mock import patch

import pytest
from click.testing import CliRunner

from server.cli.utils import cleanup, config, logs, utils_group
from server.config import Config
from server.constants import get_server_port


@pytest.mark.parametrize(
    "args, substrings",
    [
        (
            [],
            ["Usage:", "config", "logs", "cleanup"],
        ),
        (
            ["--help"],
            ["Usage:", "config", "logs", "cleanup"],
        ),
    ],
)
def test_utils_group_help(args: list[str], substrings: list[str]) -> None:
    """Test that utils group shows all subcommands."""
    runner = CliRunner()
    result = runner.invoke(utils_group, args)
    assert result.exit_code == 0
    for substr in substrings:
        assert substr in result.output


@pytest.mark.parametrize(
    "args, substrings",
    [
        (
            [],
            ["Usage:", "show", "set"],
        ),
        (
            ["--help"],
            ["Usage:", "show", "set"],
        ),
    ],
)
def test_config_group_help(args: list[str], substrings: list[str]) -> None:
    """Test that config group shows all subcommands."""
    runner = CliRunner()
    result = runner.invoke(config, args)
    assert result.exit_code == 0
    for substr in substrings:
        assert substr in result.output


@patch("server.cli.utils.load_config")
def test_config_show_command(mock_load_config: Any, tmp_path: Path) -> None:
    """Test that 'config show' command displays configuration."""
    mock_config_dict = {
        "server_port": get_server_port(),
        "download_dir": str(tmp_path),
        "debug_mode": False,
        "log_level": "info",
    }
    mock_load_config.return_value = Config(mock_config_dict)

    runner = CliRunner()
    result = runner.invoke(config, ["show"])

    assert result.exit_code == 0
    assert f"server_port               {get_server_port()}" in result.output
    assert "download_dir              " in result.output  # Check for the key, value may be truncated
    assert "debug_mode                False" in result.output
    assert "log_level                 info" in result.output


@patch("server.config.Config.update_config")
@patch("server.cli.utils.load_config")
def test_config_set_command(mock_load_config: Any, mock_update_config: Any, tmp_path: Path) -> None:
    """Test that 'config set' command updates configuration."""
    mock_config_dict = {
        "server_port": get_server_port(),
        "download_dir": str(tmp_path),
        "debug_mode": False,
        "log_level": "info",
    }
    mock_load_config.return_value = Config(mock_config_dict)

    runner = CliRunner()
    result = runner.invoke(config, ["set", "--port", str(get_server_port() + 1), "--debug-mode", "true"])

    assert result.exit_code == 0
    # Check that update_config was called with correct arguments
    mock_update_config.assert_called_once_with({"server_port": get_server_port() + 1, "debug_mode": True})


@pytest.mark.parametrize(
    "args, substrings",
    [
        (
            [],
            ["Usage:", "view", "clear"],
        ),
        (
            ["--help"],
            ["Usage:", "view", "clear"],
        ),
    ],
)
def test_logs_group_help(args: list[str], substrings: list[str]) -> None:
    """Test that logs group shows all subcommands."""
    runner = CliRunner()
    result = runner.invoke(logs, args)
    assert result.exit_code == 0
    for substr in substrings:
        assert substr in result.output


@patch("server.cli.utils.get_log_files")
@patch("server.cli.utils.read_log_file")
def test_logs_view_command(mock_read_log_file: Any, mock_get_log_files: Any) -> None:
    """Test that 'logs view' command displays log content."""
    mock_get_log_files.return_value = ["/path/to/log/server.log"]
    mock_read_log_file.return_value = ["Line 1", "Line 2", "Line 3"]

    runner = CliRunner()
    result = runner.invoke(logs, ["view"])

    assert result.exit_code == 0
    assert "Line 1" in result.output
    assert "Line 2" in result.output
    assert "Line 3" in result.output


@patch("server.cli.utils.clean_log_files")
def test_logs_clear_command(mock_clean_log_files: Any) -> None:
    """Test that 'logs clear' command cleans log files."""
    mock_clean_log_files.return_value = 3  # 3 files cleaned

    runner = CliRunner()
    result = runner.invoke(logs, ["clear", "--confirm"])

    assert result.exit_code == 0
    mock_clean_log_files.assert_called_once()
    assert "3 log files cleared" in result.output


@patch("server.cli.utils.run_cleanup")
def test_cleanup_command(mock_run_cleanup: Any) -> None:
    """Test that 'cleanup' command runs cleanup process."""
    mock_run_cleanup.return_value = {"temp_files": 5, "partial_downloads": 3}

    runner = CliRunner()
    result = runner.invoke(cleanup)

    assert result.exit_code == 0
    mock_run_cleanup.assert_called_once()
    assert "5 temporary files" in result.output
    assert "3 partial downloads" in result.output
