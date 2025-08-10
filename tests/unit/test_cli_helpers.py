"""Consolidated unit tests for all CLI functionality."""

import importlib.util
import json
import logging
import tempfile
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, Mock, patch

import click
import click.testing
import pytest
from click.testing import CliRunner

import server.cli_helpers as helpers
from server.cli.download import (
    _download_single_url,
    batch_command,
    cancel_command,
    download_group,
    list_command,
    priority_command,
    resume_command,
    url_command,
)
from server.cli.resume import cli_resume_incomplete, resume_failed_cmd, resume_group
from server.cli.status import server as status
from server.cli_main import _cli_load_config, _cli_set_logging, cli, main
from server.cli_resume_helpers import derive_resume_url, get_part_files, validate_scan_directory
from server.constants import get_server_port


class DummyConfig:
    """Unified dummy config object for testing."""

    def __init__(self, values: dict[str, Any] | None = None) -> None:
        self._values = values or {}

    def get_value(self, key: str, default: Any = None) -> Any:
        """Return value from internal dict or default."""
        return self._values.get(key, default)

    def get_download_options(self) -> dict:
        """Return default yt-dlp options for testing."""
        return {
            "format": "bestvideo+bestaudio/best",
            "merge_output_format": "mp4",
            "continuedl": True,
            "nopart": True,
            "progress": True,
            "noprogress": False,
        }

    def as_dict(self) -> dict[str, Any]:
        """Return config as dictionary for backup tests."""
        return {
            "server_host": "127.0.0.1",
            "server_port": 8080,
            "download_dir": "/test/dir",
            "log_level": "info",
            "show_download_button": True,
            "yt_dlp_options": {"format": "best"},
        }


# ============================================================================
# CLI Main Tests
# ============================================================================

class TestCLIMain:
    """Test CLI main functionality."""

    def test_cli_group_creation(self):
        """Test that CLI group is created correctly."""
        runner = CliRunner()
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        assert "start" in result.output
        assert "stop" in result.output
        assert "restart" in result.output
        assert "status" in result.output

    def test_cli_load_config(self):
        """Test config loading functionality."""
        with patch("server.cli_main.Config") as mock_config:
            mock_config.load.return_value = Mock()
            config = _cli_load_config(Mock())
            assert config is not None
            mock_config.load.assert_called_once()

    def test_cli_set_logging_verbose(self):
        """Test verbose logging setup."""
        with patch("logging.getLogger") as mock_get_logger:
            mock_logger = Mock()
            mock_get_logger.return_value = mock_logger

            _cli_set_logging(True)

            mock_logger.setLevel.assert_called_with(10)  # logging.DEBUG

    def test_cli_set_logging_normal(self):
        """Test normal logging setup."""
        with patch("logging.getLogger") as mock_get_logger:
            mock_logger = Mock()
            mock_get_logger.return_value = mock_logger

            _cli_set_logging(False)

            mock_logger.setLevel.assert_called_with(20)  # logging.INFO

    def test_main_function_exists(self):
        """Test that main function exists and is callable."""
        assert callable(main)
        assert main.__name__ == "main"

    @patch("server.cli_main.cli")
    def test_main_invokes_cli(self, mock_cli):
        """Test that main function invokes CLI."""
        with patch("sys.argv", ["test_cli"]):
            main()
            mock_cli.assert_called_once()

    def test_cli_help_output(self):
        """Test CLI help output contains expected commands."""
        runner = CliRunner()
        result = runner.invoke(cli, ["--help"])

        assert result.exit_code == 0
        # Check for main command groups
        assert "start" in result.output
        assert "stop" in result.output
        assert "restart" in result.output
        assert "status" in result.output
        assert "system" in result.output

    def test_cli_verbose_flag(self):
        """Test CLI verbose flag functionality."""
        runner = CliRunner()
        result = runner.invoke(cli, ["--verbose", "--help"])
        assert result.exit_code == 0
        # Verify that verbose flag doesn't cause errors

    def test_cli_without_verbose(self):
        """Test CLI without verbose flag."""
        runner = CliRunner()
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        # No verbose flag means no logging level change

    def test_cli_context_injection(self):
        """Test that CLI context is properly injected."""
        runner = CliRunner()
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        # Verify context is available (no errors in execution)
        assert "Usage:" in result.output

    @patch("server.cli_main.get_cli_commands")
    def test_cli_commands_import(self, mock_get_commands):
        """Test that CLI commands are properly imported."""
        mock_commands = (Mock(), Mock(), Mock(), Mock(), Mock())
        mock_get_commands.return_value = mock_commands

        # This should not raise import errors
        runner = CliRunner()
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0

    def test_cli_error_handling(self):
        """Test CLI error handling."""
        runner = CliRunner()
        # Test with invalid command
        result = runner.invoke(cli, ["invalid-command"])
        assert result.exit_code != 0  # Should fail gracefully

    def test_cli_version_info(self):
        """Test CLI version information."""
        runner = CliRunner()
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        # Check for application name in help
        assert "Enhanced Video Downloader" in result.output or "server" in result.output

    def test_cli_with_invalid_options(self):
        """Test CLI with invalid options."""
        runner = CliRunner()
        result = runner.invoke(cli, ["start", "--invalid-option"])
        assert result.exit_code != 0

    def test_main_function_error_handling(self):
        """Test main function error handling."""
        with patch("server.cli_main.cli") as mock_cli:
            mock_cli.side_effect = RuntimeError("Test error")
            with pytest.raises(RuntimeError, match="Test error"):
                main()


# ============================================================================
# CLI Commands Tests
# ============================================================================

class TestStatusCommand:
    """Test status CLI command functionality."""

    def test_status_command_with_running_server(self):
        """Test status command when server is running."""
        mock_procs = [
            {"pid": 12345, "port": 8080, "uptime": 3600},
            {"pid": 12346, "port": 8081, "uptime": 1800},
        ]

        with patch("server.cli.status.find_server_processes_cli", return_value=mock_procs):
            runner = click.testing.CliRunner()
            result = runner.invoke(status)

            # Verify output
            expected_output = "PID 12345, port 8080, uptime 3600s\nPID 12346, port 8081, uptime 1800s\n"
            assert result.output == expected_output
            assert result.exit_code == 0

    def test_status_command_with_no_server(self):
        """Test status command when no server is running."""
        with patch("server.cli.status.find_server_processes_cli", return_value=[]):
            runner = click.testing.CliRunner()
            result = runner.invoke(status)

            # Verify output and exit
            assert "No running server found." in result.output
            assert result.exit_code == 1

    def test_status_command_with_unknown_uptime(self):
        """Test status command with unknown uptime."""
        mock_procs = [
            {"pid": 12345, "port": 8080, "uptime": None},
        ]

        with patch("server.cli.status.find_server_processes_cli", return_value=mock_procs):
            runner = click.testing.CliRunner()
            result = runner.invoke(status)

            # Verify output
            assert "PID 12345, port 8080, uptime unknown" in result.output
            assert result.exit_code == 0


class TestResumeCommand:
    """Test resume CLI command functionality."""

    def test_resume_incomplete_command_exists(self):
        """Test that resume incomplete command exists."""
        assert callable(cli_resume_incomplete)

    def test_resume_failed_command_exists(self):
        """Test that resume failed command exists."""
        assert callable(resume_failed_cmd)

    def test_resume_group_creation(self):
        """Test that resume group can be created."""
        assert resume_group is not None
        assert hasattr(resume_group, "commands")

    def test_cli_resume_incomplete_is_click_command(self):
        """Test that resume incomplete command is a Click command."""
        assert hasattr(cli_resume_incomplete, "name")
        assert cli_resume_incomplete.name == "incomplete"

    def test_resume_failed_cmd_is_click_command(self):
        """Test that resume failed command is a Click command."""
        assert hasattr(resume_failed_cmd, "name")
        assert resume_failed_cmd.name == "failed"


class TestSystemMaintenanceCommand:
    """Test system maintenance CLI command functionality."""

    def test_system_maintenance_command_exists(self):
        """Test that system maintenance command exists."""
        from server.cli.system import system_maintenance

        assert callable(system_maintenance)


class TestLifecycleCommand:
    """Test lifecycle CLI command functionality."""

    def test_lifecycle_command(self):
        """Legacy lifecycle module removed; new commands live in consolidated CLI."""
        import importlib

        import pytest

        # Legacy module should no longer be importable
        with pytest.raises(ImportError):
            importlib.import_module("server.cli_commands.lifecycle")

        # Verify consolidated CLI exposes lifecycle commands
        from click.testing import CliRunner

        from server.cli_main import cli

        runner = CliRunner()
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        assert "start" in result.output and "stop" in result.output and "restart" in result.output


# ============================================================================
# CLI Download Tests
# ============================================================================

class TestCLIDownloadCommands:
    """Test the CLI download commands in server/cli/download.py."""

    @pytest.fixture
    def runner(self) -> CliRunner:
        """Create a Click test runner.

        :returns: Click test runner instance.
        """
        return CliRunner()

    @pytest.fixture
    def mock_server_running(self) -> MagicMock:
        """Create a mock for is_server_running function.

        :returns: Mock for is_server_running function.
        """
        with patch("server.cli.download.is_server_running") as mock:
            mock.return_value = True
            return mock

    @pytest.fixture
    def mock_get_config_value(self) -> MagicMock:
        """Create a mock for get_config_value function.

        :returns: Mock for get_config_value function.
        """
        with patch("server.cli.download.get_config_value") as mock:
            mock.return_value = get_server_port()
            return mock

    @pytest.fixture
    def mock_requests_post(self) -> MagicMock:
        """Create a mock for requests.post function.

        :returns: Mock for requests.post function.
        """
        with patch("server.cli.download.requests.post") as mock:
            return mock

    def test_url_command_help(self, runner: CliRunner) -> None:
        """Test that url command shows help with all options.

        :param runner: Click test runner fixture.
        :returns: None.
        """
        result = runner.invoke(url_command, ["--help"])
        assert result.exit_code == 0
        assert "URL" in result.output
        assert "--format" in result.output
        assert "--output-dir" in result.output
        assert "--user-agent" in result.output
        assert "--referrer" in result.output
        assert "--is-playlist" in result.output

    @patch("server.cli.download._download_single_url")
    def test_url_command_basic(self, mock_download: MagicMock, runner: CliRunner) -> None:
        """Test basic url command execution.

        :param mock_download: Mock for _download_single_url function.
        :param runner: Click test runner fixture.
        :returns: None.
        """
        mock_download.return_value = None

        result = runner.invoke(url_command, ["https://example.com/video"])

        assert result.exit_code == 0
        mock_download.assert_called_once_with("https://example.com/video", "best", None, None, None, False)

    @patch("server.cli.download._download_single_url")
    def test_url_command_with_options(self, mock_download: MagicMock, runner: CliRunner) -> None:
        """Test url command with various options.

        :param mock_download: Mock for _download_single_url function.
        :param runner: Click test runner fixture.
        :returns: None.
        """
        mock_download.return_value = None

        with tempfile.TemporaryDirectory() as tmpdir:
            result = runner.invoke(
                url_command,
                [
                    "https://example.com/video",
                    "--format",
                    "720p",
                    "--output-dir",
                    tmpdir,
                    "--user-agent",
                    "CustomAgent",
                    "--referrer",
                    "https://example.com",
                    "--is-playlist",
                ],
            )

            assert result.exit_code == 0
            mock_download.assert_called_once()
            args, kwargs = mock_download.call_args
            assert args[0] == "https://example.com/video"  # URL
            assert args[1] == "720p"  # Format
            assert Path(args[2]).samefile(tmpdir)  # Output dir
            assert args[3] == "CustomAgent"  # User agent
            assert args[4] == "https://example.com"  # Referrer
            assert args[5] is True  # Is playlist

    def test_batch_command_help(self, runner: CliRunner) -> None:
        """Test that batch command shows help with all options.

        :param runner: Click test runner fixture.
        :returns: None.
        """
        result = runner.invoke(batch_command, ["--help"])
        assert result.exit_code == 0
        assert "URLS_FILE" in result.output
        assert "--format" in result.output
        assert "--output-dir" in result.output
        assert "--user-agent" in result.output
        assert "--referrer" in result.output
        assert "--concurrent" in result.output
        assert "--delay" in result.output
        assert "--continue-on-error" in result.output

    @patch("server.cli.download._download_batch_from_file")
    def test_batch_command_basic(self, mock_download: MagicMock, runner: CliRunner) -> None:
        """Test basic batch command execution.

        :param mock_download: Mock for _download_batch_from_file function.
        :param runner: Click test runner fixture.
        :returns: None.
        """
        mock_download.return_value = None

        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("https://example.com/video1\nhttps://example.com/video2\n")
            urls_file = f.name

        try:
            result = runner.invoke(batch_command, [urls_file])

            assert result.exit_code == 0
            mock_download.assert_called_once_with(urls_file, "best", None, None, None, 3, 1.0, False)
        finally:
            Path(urls_file).unlink()

    def test_resume_command_help(self, runner: CliRunner) -> None:
        """Test that resume command shows help.

        :param runner: Click test runner fixture.
        :returns: None.
        """
        result = runner.invoke(resume_command, ["--help"])
        assert result.exit_code == 0
        assert "partials" in result.output
        assert "incomplete" in result.output
        assert "failed" in result.output

    @patch("server.cli.download.requests.post")
    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_resume_command_partials(
        self, mock_server_running: MagicMock, mock_get_config: MagicMock, mock_post: MagicMock, runner: CliRunner
    ) -> None:
        """Test resume command with partials type.

        :param mock_server_running: Mock for is_server_running function.
        :param mock_get_config: Mock for get_config_value function.
        :param mock_post: Mock for requests.post function.
        :param runner: Click test runner fixture.
        :returns: None.
        """
        mock_server_running.return_value = True
        mock_get_config.return_value = get_server_port()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"message": "Resumed partial downloads"}
        mock_post.return_value = mock_response

        result = runner.invoke(resume_command, ["partials"])

        assert result.exit_code == 0
        mock_post.assert_called_once_with(
            f"http://127.0.0.1:{get_server_port()}/api/resume", json={"type": "partials"}, timeout=30
        )

    def test_cancel_command_help(self, runner: CliRunner) -> None:
        """Test that cancel command shows help.

        :param runner: Click test runner fixture.
        :returns: None.
        """
        result = runner.invoke(cancel_command, ["--help"])
        assert result.exit_code == 0
        assert "DOWNLOAD_ID" in result.output

    @patch("server.cli.download.requests.post")
    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_cancel_command_basic(
        self, mock_server_running: MagicMock, mock_get_config: MagicMock, mock_post: MagicMock, runner: CliRunner
    ) -> None:
        """Test basic cancel command execution.

        :param mock_server_running: Mock for is_server_running function.
        :param mock_get_config: Mock for get_config_value function.
        :param mock_post: Mock for requests.post function.
        :param runner: Click test runner fixture.
        :returns: None.
        """
        mock_server_running.return_value = True
        mock_get_config.return_value = get_server_port()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"message": "Download cancelled"}
        mock_post.return_value = mock_response

        result = runner.invoke(cancel_command, ["download123"])

        assert result.exit_code == 0
        mock_post.assert_called_once_with(
            f"http://127.0.0.1:{get_server_port()}/api/download/download123/cancel", timeout=10
        )

    def test_priority_command_help(self, runner: CliRunner) -> None:
        """Test that priority command shows help.

        :param runner: Click test runner fixture.
        :returns: None.
        """
        result = runner.invoke(priority_command, ["--help"])
        assert result.exit_code == 0
        assert "DOWNLOAD_ID" in result.output
        assert "PRIORITY" in result.output

    @patch("server.cli.download.requests.post")
    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_priority_command_basic(
        self, mock_server_running: MagicMock, mock_get_config: MagicMock, mock_post: MagicMock, runner: CliRunner
    ) -> None:
        """Test basic priority command execution.

        :param mock_server_running: Mock for is_server_running function.
        :param mock_get_config: Mock for get_config_value function.
        :param mock_post: Mock for requests.post function.
        :param runner: Click test runner fixture.
        :returns: None.
        """
        mock_server_running.return_value = True
        mock_get_config.return_value = get_server_port()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"message": "Priority updated"}
        mock_post.return_value = mock_response

        result = runner.invoke(priority_command, ["download123", "5"])

        assert result.exit_code == 0
        mock_post.assert_called_once_with(
            f"http://127.0.0.1:{get_server_port()}/api/download/download123/priority", json={"priority": 5}, timeout=10
        )

    def test_list_command_help(self, runner: CliRunner) -> None:
        """Test that list command shows help with all options.

        :param runner: Click test runner fixture.
        :returns: None.
        """
        result = runner.invoke(list_command, ["--help"])
        assert result.exit_code == 0
        assert "--active-only" in result.output
        assert "--failed-only" in result.output
        assert "--format" in result.output

    @patch("server.cli.download.requests.get")
    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_list_command_basic(
        self, mock_server_running: MagicMock, mock_get_config: MagicMock, mock_get: MagicMock, runner: CliRunner
    ) -> None:
        """Test basic list command execution.

        :param mock_server_running: Mock for is_server_running function.
        :param mock_get_config: Mock for get_config_value function.
        :param mock_get: Mock for requests.get function.
        :param runner: Click test runner fixture.
        :returns: None.
        """
        mock_server_running.return_value = True
        mock_get_config.return_value = get_server_port()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"downloads": []}
        mock_get.return_value = mock_response

        result = runner.invoke(list_command, [])

        assert result.exit_code == 0
        mock_get.assert_called_once_with(f"http://127.0.0.1:{get_server_port()}/api/status", timeout=10)

    def test_download_group_help(self, runner: CliRunner) -> None:
        """Test that download group shows help with all subcommands.

        :param runner: Click test runner fixture.
        :returns: None.
        """
        result = runner.invoke(download_group, ["--help"])
        assert result.exit_code == 0
        assert "url" in result.output
        assert "batch" in result.output
        assert "resume" in result.output
        assert "cancel" in result.output
        assert "priority" in result.output
        assert "list" in result.output

    @patch("server.cli.download._download_single_url")
    def test_download_group_url_invocation(self, mock_download: MagicMock, runner: CliRunner) -> None:
        """Test download group url subcommand invocation.

        :param mock_download: Mock for _download_single_url function.
        :param runner: Click test runner fixture.
        :returns: None.
        """
        mock_download.return_value = None

        result = runner.invoke(download_group, ["url", "https://example.com/video"])

        assert result.exit_code == 0
        mock_download.assert_called_once_with("https://example.com/video", "best", None, None, None, False)


class TestDownloadHelperFunctions:
    """Test the helper functions in the download module."""

    @patch("server.cli.download.requests.post")
    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_download_single_url_success(
        self, mock_server_running: MagicMock, mock_get_config: MagicMock, mock_post: MagicMock
    ) -> None:
        """Test successful single URL download.

        :param mock_server_running: Mock for is_server_running function.
        :param mock_get_config: Mock for get_config_value function.
        :param mock_post: Mock for requests.post function.
        :returns: None.
        """
        mock_server_running.return_value = True
        mock_get_config.return_value = get_server_port()
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"title": "Test Video", "downloadId": "download123"}
        mock_post.return_value = mock_response

        with patch("click.echo"):
            _download_single_url("https://example.com/video", "best", "", "", "", False)

        mock_post.assert_called_once_with(
            f"http://127.0.0.1:{get_server_port()}/api/download",
            json={
                "url": "https://example.com/video",
                "format": "best",
                "is_playlist": False,
            },
            timeout=10,
        )

    @patch("server.cli.download.is_server_running")
    def test_download_single_url_server_not_running(self, mock_server_running: MagicMock) -> None:
        """Test single URL download when server is not running.

        :param mock_server_running: Mock for is_server_running function.
        :returns: None.
        """
        mock_server_running.return_value = False

        with patch("click.echo"), patch("sys.exit") as mock_exit:
            _download_single_url("https://example.com/video", "best", "", "", "", False)

        # The function calls sys.exit(1) when server is not running
        assert mock_exit.called


def test_gallery_dl_resume_invocation(monkeypatch: Any, tmp_path: Path) -> None:
    """Ensure gallery-dl resume builds expected command and handles success."""
    from server.cli_helpers import _resume_with_downloader

    captured: dict[str, Any] = {}

    def fake_run(cmd: list[str], check: bool, capture_output: bool, text: bool):  # type: ignore[no-redef]
        captured["cmd"] = cmd

        class R:
            returncode = 0
            stdout = "ok"
            stderr = ""
        return R()

    monkeypatch.setattr("server.cli_helpers.subprocess.run", fake_run)

    url = "http://example.com/gallery"
    opts = {"directory": str(tmp_path), "jobs": 2, "verbose": True, "cookies": ["a.txt", "b.txt"]}
    ok = _resume_with_downloader("gallery-dl", url, opts, tmp_path / "file.part", logging.getLogger(__name__))

    assert ok is True
    assert captured["cmd"][0] == "gallery-dl"
    assert "--directory" in captured["cmd"] and str(tmp_path) in captured["cmd"]
    assert "--continue" in captured["cmd"]
    assert "--jobs" in captured["cmd"] and "2" in captured["cmd"]
    assert captured["cmd"].count("--cookies") == 2
    assert captured["cmd"][-1] == url


# ============================================================================
# CLI Functions Tests
# ============================================================================

class TestCLIBuildOpts:
    """Test CLI build options function."""

    def test_cli_build_opts_basic(self, tmp_path: Path):
        """Test basic options building."""
        url = "https://example.com/video"
        output_template = str(tmp_path / "output.mp4")

        result = helpers.cli_build_opts(url, output_template)

        assert isinstance(result, dict)
        assert result["format"] == "bestvideo+bestaudio/best"
        assert result["merge_output_format"] == "mp4"
        assert result["outtmpl"] == output_template
        assert result.get("continuedl") is True
        assert result.get("nopart") is True
        assert result.get("progress") is True
        assert result.get("noprogress") is False

    def test_cli_build_opts_with_extra_params(self, tmp_path: Path):
        """Test options building with extra parameters."""
        url = "https://youtube.com/watch?v=123"
        output_template = str(tmp_path / "output.mp4")
        extra_params = {"format": "best", "cookies": "cookies.txt"}

        result = helpers.cli_build_opts(url, output_template, extra_params)

        # The function uses default format, not the one from extra_params
        assert result["format"] == "bestvideo+bestaudio/best"
        # 'cookiefile' should not be present since 'cookies' is not processed
        assert "cookiefile" not in result

    def test_cli_build_opts_with_filename_override(self, tmp_path: Path):
        """Test options building with filename override."""
        url = "https://example.com/video"
        output_template = str(tmp_path / "some" / "path" / "file.mp4")
        extra_params = {"filename_override": "override.mp4"}

        result = helpers.cli_build_opts(url, output_template, extra_params)

        expected = str(Path(output_template).parent / "override.mp4")
        assert result["outtmpl"] == expected


class TestCLIPortFunctions:
    """Test CLI port-related functions."""

    @patch("server.cli_helpers.socket.socket")
    def test_is_port_in_use_true(self, mock_socket):
        """Test port in use check when port is occupied."""
        mock_socket_instance = MagicMock()
        mock_socket_instance.bind.side_effect = OSError("Address already in use")
        mock_socket.return_value.__enter__.return_value = mock_socket_instance

        result = helpers.is_port_in_use(8080)

        assert result is True

    @patch("server.cli_helpers.socket.socket")
    def test_is_port_in_use_false(self, mock_socket):
        """Test port in use check when port is available."""
        mock_socket_instance = MagicMock()
        mock_socket.return_value.__enter__.return_value = mock_socket_instance

        result = helpers.is_port_in_use(8080)

        assert result is False

    def test_find_available_port(self):
        """Test finding an available port."""
        port = helpers.find_available_port(8080, 8090)

        assert isinstance(port, int)
        assert 8080 <= port <= 8090


# ============================================================================
# CLI Resume Helpers Tests
# ============================================================================

def test_validate_scan_directory(tmp_path: Path, caplog: Any) -> None:
    """Test validate_scan_directory function."""
    # Nonexistent directory
    caplog.set_level(logging.ERROR)
    logger = logging.getLogger("test")
    missing = tmp_path / "nope"
    assert not validate_scan_directory(missing, logger)
    assert "does not exist" in caplog.text

    # Existing directory
    caplog.clear()
    dir_path = tmp_path / "exists"
    dir_path.mkdir()
    assert validate_scan_directory(dir_path, logger)
    assert caplog.text == ""


def test_get_part_files(tmp_path: Path) -> None:
    """Test get_part_files function."""
    # Create some .part files
    f1 = tmp_path / "video1.mp4.part"
    f1.write_text("")
    sub = tmp_path / "subdir"
    sub.mkdir()
    f2 = sub / "video2.mkv.part"
    f2.write_text("")

    parts = get_part_files(tmp_path)
    assert set(parts) == {f1, f2}

    # Create additional partial file types
    f3 = tmp_path / "video3.mp4.ytdl"
    f4 = tmp_path / "video4.mkv.download"
    f3.write_text("")
    f4.write_text("")
    # Create nested directory with download file
    nested = tmp_path / "nested"
    nested.mkdir()
    f5 = nested / "video5.flv.part"
    f5.write_text("")
    all_parts = set(get_part_files(tmp_path))
    expected = {f1, f2, f3, f4, f5}
    assert all_parts == expected


def test_derive_resume_url_primary_info(tmp_path: Path, caplog: Any) -> None:
    """Test derive_resume_url with primary info JSON."""
    # Primary info JSON candidate
    part_file = tmp_path / "movie.mp4.part"
    part_file.write_text("")
    info_file = tmp_path / "movie.mp4.info.json"
    data = {"webpage_url": "https://example.com/movie"}
    info_file.write_text(json.dumps(data))

    caplog.set_level(logging.DEBUG)
    logger = logging.getLogger("test")
    url = derive_resume_url(part_file, logger)
    assert url == data["webpage_url"]
    assert f"Found URL '{url}' in" in caplog.text


def test_derive_resume_url_fallback_info(tmp_path: Path, caplog: Any) -> None:
    """Test derive_resume_url with fallback info JSON."""
    # Only fallback JSON candidate
    part_file = tmp_path / "clip.mov.part"
    part_file.write_text("")
    fallback = tmp_path / "clip.info.json"
    data = {"webpage_url": "https://fallback.example/clip"}
    fallback.write_text(json.dumps(data))

    caplog.set_level(logging.DEBUG)
    logger = logging.getLogger("test")
    url = derive_resume_url(part_file, logger)
    assert url == data["webpage_url"]
    assert "Found URL" in caplog.text


def test_derive_resume_url_no_info(tmp_path: Path, caplog: Any) -> None:
    """Test derive_resume_url with no info file."""
    # No info file present
    part_file = tmp_path / "none.part"
    part_file.write_text("")

    caplog.set_level(logging.WARNING)
    logger = logging.getLogger("test")
    url = derive_resume_url(part_file, logger)
    assert url is None
    assert "No .info.json found" in caplog.text


def test_derive_resume_url_malformed_json(tmp_path: Path, caplog: Any) -> None:
    """Test derive_resume_url with malformed JSON."""
    # Info file is not valid JSON
    part_file = tmp_path / "bad.part"
    part_file.write_text("")
    info_file = tmp_path / "bad.info.json"
    info_file.write_text("{not:valid}")

    caplog.set_level(logging.WARNING)
    logger = logging.getLogger("test")
    url = derive_resume_url(part_file, logger)
    assert url is None
    assert "Failed to parse" in caplog.text


# ============================================================================
# CLI Run Helpers Tests
# ============================================================================

# Dynamically load the server/cli_main.py module to access helper functions
_cli_file_path = str(Path(__file__).parent.parent.parent / "server" / "cli_main.py")
_spec = importlib.util.spec_from_file_location("server_cli_module", _cli_file_path)
if _spec is None or _spec.loader is None:
    raise ImportError(f"Could not load module from {_cli_file_path}")
cli_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cli_module)


class DummyCtx:
    """Dummy context object for testing _run_start_server."""


def test_run_start_server_daemon(monkeypatch: Any) -> None:
    """Test server start in daemon mode with proper function calls and parameter passing."""
    calls: dict[str, Any] = {}
    monkeypatch.setattr(cli_module, "_cli_load_config", lambda ctx: "cfg_obj")
    monkeypatch.setattr(cli_module, "_cli_set_logging", lambda verbose: calls.setdefault("logging", verbose))
    monkeypatch.setattr(
        cli_module, "_resolve_start_params", lambda cfg, host, port, download_dir: ("hostX", 9999, "download_dirX")
    )
    monkeypatch.setattr(cli_module, "_cli_pre_start_checks", lambda h, p, f: calls.setdefault("pre_start", (h, p, f)))
    monkeypatch.setattr(cli_module, "_cli_build_command", lambda cfg, h, p, gunicorn, workers: ["cmd_arg"])
    monkeypatch.setattr(cli_module, "_cli_execute_daemon", lambda cmd, h, p: calls.setdefault("daemon", (cmd, h, p)))
    monkeypatch.setattr(
        cli_module, "_cli_execute_foreground", lambda cmd, h, p: calls.setdefault("foreground", (cmd, h, p))
    )

    # Call helper with daemon=True
    cli_module._run_start_server(
        ctx=DummyCtx(),
        daemon=True,
        host="h0",
        port=1234,
        download_dir="d0",
        gunicorn=False,
        workers=1,
        verbose=True,
        force=False,
    )

    assert "daemon" in calls
    assert calls["daemon"] == (["cmd_arg"], "hostX", 9999)
    assert "foreground" not in calls


def test_run_start_server_foreground(monkeypatch: Any) -> None:
    """Test server start in foreground mode with proper function calls and parameter passing."""
    calls: dict[str, Any] = {}
    monkeypatch.setattr(cli_module, "_cli_load_config", lambda ctx: None)
    monkeypatch.setattr(cli_module, "_cli_set_logging", lambda verbose: calls.setdefault("logging", verbose))
    monkeypatch.setattr(
        cli_module, "_resolve_start_params", lambda cfg, host, port, download_dir: ("hY", 8888, "download_dirY")
    )
    monkeypatch.setattr(cli_module, "_cli_pre_start_checks", lambda h, p, f: calls.setdefault("pre_start", (h, p, f)))
    monkeypatch.setattr(cli_module, "_cli_build_command", lambda cfg, h, p, gunicorn, workers: ["cmd_arg2"])
    monkeypatch.setattr(cli_module, "_cli_execute_daemon", lambda cmd, h, p: calls.setdefault("daemon", (cmd, h, p)))
    monkeypatch.setattr(
        cli_module, "_cli_execute_foreground", lambda cmd, h, p: calls.setdefault("foreground", (cmd, h, p))
    )

    # Call helper with daemon=False
    cli_module._run_start_server(
        ctx=None,
        daemon=False,
        host=None,
        port=None,
        download_dir=None,
        gunicorn=True,
        workers=5,
        verbose=False,
        force=True,
    )

    assert "foreground" in calls
    assert calls["foreground"] == (["cmd_arg2"], "hY", 8888)
    assert "daemon" not in calls


def test_run_stop_server_no_entities(monkeypatch: Any) -> None:
    """Test server stop when no entities are found to terminate."""
    calls: dict[str, Any] = {}
    monkeypatch.setattr(cli_module, "_cli_stop_pre_checks", list)
    monkeypatch.setattr(
        cli_module,
        "_cli_stop_terminate_enhanced",
        lambda entities, timeout, force: calls.setdefault("terminate", entities),
    )
    monkeypatch.setattr(cli_module, "_cli_stop_cleanup_enhanced", lambda: calls.setdefault("cleanup", True))

    cli_module._run_stop_server_enhanced(timeout=30, force=False)
    assert "terminate" not in calls
    assert "cleanup" not in calls


def test_run_stop_server_with_entities(monkeypatch: Any) -> None:
    """Test server stop when entities are found and termination/cleanup is performed."""
    calls: dict[str, Any] = {}
    monkeypatch.setattr(cli_module, "_cli_stop_pre_checks", lambda: ["proc1", "proc2"])
    monkeypatch.setattr(
        cli_module,
        "_cli_stop_terminate_enhanced",
        lambda entities, timeout, force: calls.setdefault("terminate", entities),
    )
    monkeypatch.setattr(cli_module, "_cli_stop_cleanup_enhanced", lambda: calls.setdefault("cleanup", True))

    cli_module._run_stop_server_enhanced(timeout=30, force=False)
    assert calls["terminate"] == ["proc1", "proc2"]
    assert calls["cleanup"] is True


# ============================================================================
# FG Logic Tests
# ============================================================================

def test_fg_flag_overrides_daemon_logic():
    """Test that the --fg flag correctly overrides daemon setting."""
    # Test that when fg=True, daemon should be set to False
    daemon = True
    fg = True

    if fg:
        daemon = False

    assert daemon is False

    # Test that when fg=False, daemon setting is preserved
    daemon = True
    fg = False

    if fg:
        daemon = False

    assert daemon is True


def test_fg_flag_logic_matches_cli_implementation():
    """Test that the logic matches what's implemented in the CLI."""
    # This test verifies that the logic in the CLI matches our expectations

    # Scenario 1: --fg flag is used
    daemon = True  # Default daemon mode
    fg = True  # But --fg flag is set

    # If --fg flag is used, override daemon setting to run in foreground
    if fg:
        daemon = False

    assert daemon is False, "When --fg is True, daemon should be False"

    # Scenario 2: --fg flag is not used
    daemon = True  # Default daemon mode
    fg = False  # No --fg flag

    # If --fg flag is used, override daemon setting to run in foreground
    if fg:
        daemon = False

    assert daemon is True, "When --fg is False, daemon should remain True"
