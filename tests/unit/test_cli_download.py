"""
Test the CLI download commands in server/cli/download.py.

This module tests the Click command-line interface functions for download operations,
including single URL downloads, batch downloads, resume, cancel, priority, and list commands.
"""

import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import requests
from click.testing import CliRunner

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
from server.constants import get_server_port


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

    @patch("server.cli.download._download_batch_from_file")
    def test_batch_command_with_options(self, mock_download: MagicMock, runner: CliRunner) -> None:
        """Test batch command with various options.

        :param mock_download: Mock for _download_batch_from_file function.
        :param runner: Click test runner fixture.
        :returns: None.
        """
        mock_download.return_value = None

        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("https://example.com/video1\nhttps://example.com/video2\n")
            urls_file = f.name

        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                result = runner.invoke(
                    batch_command,
                    [
                        urls_file,
                        "--format",
                        "720p",
                        "--output-dir",
                        tmpdir,
                        "--user-agent",
                        "CustomAgent",
                        "--referrer",
                        "https://example.com",
                        "--concurrent",
                        "5",
                        "--delay",
                        "2.0",
                        "--continue-on-error",
                    ],
                )

                assert result.exit_code == 0
                mock_download.assert_called_once()
                args, kwargs = mock_download.call_args
                assert args[0] == urls_file  # URLs file
                assert args[1] == "720p"  # Format
                assert Path(args[2]).samefile(tmpdir)  # Output dir
                assert args[3] == "CustomAgent"  # User agent
                assert args[4] == "https://example.com"  # Referrer
                assert args[5] == 5  # Concurrent
                assert args[6] == 2.0  # Delay
                assert args[7] is True  # Continue on error
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
            f"http://127.0.0.1:{get_server_port()}/resume", json={"type": "partials"}, timeout=30
        )

    @patch("server.cli.download.requests.post")
    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_resume_command_incomplete(
        self, mock_server_running: MagicMock, mock_get_config: MagicMock, mock_post: MagicMock, runner: CliRunner
    ) -> None:
        """Test resume command with incomplete type.

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
        mock_response.json.return_value = {"message": "Resumed incomplete downloads"}
        mock_post.return_value = mock_response

        result = runner.invoke(resume_command, ["incomplete"])

        assert result.exit_code == 0
        mock_post.assert_called_once_with(
            f"http://127.0.0.1:{get_server_port()}/resume", json={"type": "incomplete"}, timeout=30
        )

    @patch("server.cli.download.requests.post")
    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_resume_command_failed(
        self, mock_server_running: MagicMock, mock_get_config: MagicMock, mock_post: MagicMock, runner: CliRunner
    ) -> None:
        """Test resume command with failed type.

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
        mock_response.json.return_value = {"message": "Resumed failed downloads"}
        mock_post.return_value = mock_response

        result = runner.invoke(resume_command, ["failed"])

        assert result.exit_code == 0
        mock_post.assert_called_once_with(
            f"http://127.0.0.1:{get_server_port()}/resume", json={"type": "failed"}, timeout=30
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
            f"http://127.0.0.1:{get_server_port()}/download/download123/cancel", timeout=10
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
            f"http://127.0.0.1:{get_server_port()}/download/download123/priority", json={"priority": 5}, timeout=10
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
        mock_get.assert_called_once_with(f"http://127.0.0.1:{get_server_port()}/status", timeout=10)

    @patch("server.cli.download.requests.get")
    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_list_command_with_options(
        self, mock_server_running: MagicMock, mock_get_config: MagicMock, mock_get: MagicMock, runner: CliRunner
    ) -> None:
        """Test list command with various options.

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

        result = runner.invoke(
            list_command,
            ["--active-only", "--failed-only", "--format", "json"],
        )

        assert result.exit_code == 0
        mock_get.assert_called_once_with(f"http://127.0.0.1:{get_server_port()}/status", timeout=10)

    @patch("server.cli.download.requests.get")
    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_list_command_json_format(
        self, mock_server_running: MagicMock, mock_get_config: MagicMock, mock_get: MagicMock, runner: CliRunner
    ) -> None:
        """Test list command with JSON format.

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
        mock_response.json.return_value = {
            "downloads": [
                {"id": "download1", "title": "Video 1", "status": "active"},
                {"id": "download2", "title": "Video 2", "status": "completed"},
            ]
        }
        mock_get.return_value = mock_response

        result = runner.invoke(list_command, ["--format", "json"])

        assert result.exit_code == 0
        assert "download1" in result.output
        assert "download2" in result.output

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

    @patch("server.cli.download._download_batch_from_file")
    def test_download_group_batch_invocation(self, mock_download: MagicMock, runner: CliRunner) -> None:
        """Test download group batch subcommand invocation.

        :param mock_download: Mock for _download_batch_from_file function.
        :param runner: Click test runner fixture.
        :returns: None.
        """
        mock_download.return_value = None

        with tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False) as f:
            f.write("https://example.com/video1\nhttps://example.com/video2\n")
            urls_file = f.name

        try:
            result = runner.invoke(download_group, ["batch", urls_file])

            assert result.exit_code == 0
            mock_download.assert_called_once_with(urls_file, "best", None, None, None, 3, 1.0, False)
        finally:
            Path(urls_file).unlink()

    @patch("server.cli.download.requests.post")
    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_download_group_resume_invocation(
        self, mock_server_running: MagicMock, mock_get_config: MagicMock, mock_post: MagicMock, runner: CliRunner
    ) -> None:
        """Test download group resume subcommand invocation.

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
        mock_response.json.return_value = {"message": "Resumed downloads"}
        mock_post.return_value = mock_response

        result = runner.invoke(download_group, ["resume", "partials"])

        assert result.exit_code == 0
        mock_post.assert_called_once_with(
            f"http://127.0.0.1:{get_server_port()}/resume", json={"type": "partials"}, timeout=30
        )

    @patch("server.cli.download.requests.post")
    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_download_group_cancel_invocation(
        self, mock_server_running: MagicMock, mock_get_config: MagicMock, mock_post: MagicMock, runner: CliRunner
    ) -> None:
        """Test download group cancel subcommand invocation.

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

        result = runner.invoke(download_group, ["cancel", "download123"])

        assert result.exit_code == 0
        mock_post.assert_called_once_with(
            f"http://127.0.0.1:{get_server_port()}/download/download123/cancel", timeout=10
        )

    @patch("server.cli.download.requests.post")
    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_download_group_priority_invocation(
        self, mock_server_running: MagicMock, mock_get_config: MagicMock, mock_post: MagicMock, runner: CliRunner
    ) -> None:
        """Test download group priority subcommand invocation.

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

        result = runner.invoke(download_group, ["priority", "download123", "5"])

        assert result.exit_code == 0
        mock_post.assert_called_once_with(
            f"http://127.0.0.1:{get_server_port()}/download/download123/priority", json={"priority": 5}, timeout=10
        )

    @patch("server.cli.download.requests.get")
    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_download_group_list_invocation(
        self, mock_server_running: MagicMock, mock_get_config: MagicMock, mock_get: MagicMock, runner: CliRunner
    ) -> None:
        """Test download group list subcommand invocation.

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

        result = runner.invoke(download_group, ["list"])

        assert result.exit_code == 0
        mock_get.assert_called_once_with(f"http://127.0.0.1:{get_server_port()}/status", timeout=10)

    def test_download_group_no_command(self, runner: CliRunner) -> None:
        """Test download group when no subcommand is provided.

        :param runner: Click test runner fixture.
        :returns: None.
        """
        result = runner.invoke(download_group, [])
        assert result.exit_code == 0
        assert "url" in result.output
        assert "batch" in result.output
        assert "resume" in result.output
        assert "cancel" in result.output
        assert "priority" in result.output
        assert "list" in result.output


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
            f"http://127.0.0.1:{get_server_port()}/download",
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

    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_download_single_url_no_port(self, mock_server_running: MagicMock, mock_get_config: MagicMock) -> None:
        """Test single URL download when port cannot be determined.

        :param mock_server_running: Mock for is_server_running function.
        :param mock_get_config: Mock for get_config_value function.
        :returns: None.
        """
        mock_server_running.return_value = True
        mock_get_config.return_value = None

        with patch("click.echo"), patch("sys.exit") as mock_exit:
            _download_single_url("https://example.com/video", "best", "", "", "", False)

        # The function calls sys.exit(1) when port cannot be determined
        assert mock_exit.called

    @patch("server.cli.download.requests.post")
    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_download_single_url_connection_error(
        self, mock_server_running: MagicMock, mock_get_config: MagicMock, mock_post: MagicMock
    ) -> None:
        """Test single URL download with connection error.

        :param mock_server_running: Mock for is_server_running function.
        :param mock_get_config: Mock for get_config_value function.
        :param mock_post: Mock for requests.post function.
        :returns: None.
        """
        mock_server_running.return_value = True
        mock_get_config.return_value = get_server_port()
        mock_post.side_effect = requests.exceptions.ConnectionError()

        with patch("click.echo"), patch("sys.exit") as mock_exit:
            _download_single_url("https://example.com/video", "best", "", "", "", False)

        assert mock_exit.called

    @patch("server.cli.download.requests.post")
    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_download_single_url_http_error(
        self, mock_server_running: MagicMock, mock_get_config: MagicMock, mock_post: MagicMock
    ) -> None:
        """Test single URL download with HTTP error.

        :param mock_server_running: Mock for is_server_running function.
        :param mock_get_config: Mock for get_config_value function.
        :param mock_post: Mock for requests.post function.
        :returns: None.
        """
        mock_server_running.return_value = True
        mock_get_config.return_value = get_server_port()
        mock_response = MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_post.return_value = mock_response

        with patch("click.echo"), patch("sys.exit") as mock_exit:
            _download_single_url("https://example.com/video", "best", "", "", "", False)

        assert mock_exit.called

    @patch("server.cli.download.requests.post")
    @patch("server.cli.download.get_config_value")
    @patch("server.cli.download.is_server_running")
    def test_download_single_url_with_options(
        self, mock_server_running: MagicMock, mock_get_config: MagicMock, mock_post: MagicMock
    ) -> None:
        """Test single URL download with all options.

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
            _download_single_url(
                "https://example.com/video",
                "720p",
                "/tmp/downloads",
                "CustomAgent",
                "https://example.com",
                True,
            )

        mock_post.assert_called_once_with(
            f"http://127.0.0.1:{get_server_port()}/download",
            json={
                "url": "https://example.com/video",
                "format": "720p",
                "is_playlist": True,
                "user_agent": "CustomAgent",
                "referrer": "https://example.com",
                "download_dir": "/tmp/downloads",
            },
            timeout=10,
        )
