"""Unit tests for server.cli.serve module."""

from unittest.mock import Mock, patch

from click.testing import CliRunner

from server.cli.serve import restart_command, serve_group, start_command, stop_command
from server.constants import get_server_port


class TestServeStartCommand:
    """Test the start command functionality."""

    def test_start_command_help(self):
        """Test start command help output."""
        runner = CliRunner()
        result = runner.invoke(start_command, ["--help"])
        assert result.exit_code == 0
        assert "start" in result.output
        assert "--daemon" in result.output
        assert "--host" in result.output
        assert "--port" in result.output

    def test_start_command_with_port(self):
        """Test start command with specific port."""
        runner = CliRunner()

        # Mock only the system-level operations that can't be safely tested
        with patch("server.cli.serve.is_port_in_use", return_value=False), patch(
            "server.cli.serve.get_lock_pid_port_cli", return_value=None
        ), patch("server.cli.serve.start_server_process") as mock_start:
            result = runner.invoke(start_command, ["--port", str(get_server_port())])

            assert result.exit_code == 0
            mock_start.assert_called_once()

    def test_start_command_port_in_use_by_other_app(self):
        """Test start command when port is in use by another application."""
        runner = CliRunner()

        with patch("server.cli.serve.is_port_in_use", return_value=True), patch(
            "server.cli.serve.get_lock_pid_port_cli", return_value=None
        ):
            result = runner.invoke(start_command, ["--port", str(get_server_port())])

            assert result.exit_code == 1
            assert f"Port 127.0.0.1:{get_server_port()} is in use by another application" in result.output

    def test_start_command_server_already_running(self):
        """Test start command when server is already running."""
        runner = CliRunner()

        with patch("server.cli.serve.is_port_in_use", return_value=False), patch(
            "server.cli.serve.get_lock_pid_port_cli", return_value=(12345, get_server_port())
        ):
            result = runner.invoke(start_command, ["--port", str(get_server_port())])

            assert result.exit_code == 1
            assert f"Server is already running on 127.0.0.1:{get_server_port()} (PID: 12345)" in result.output

    def test_start_command_force_flag(self):
        """Test start command with force flag."""
        runner = CliRunner()

        with patch("server.cli.serve.is_port_in_use", return_value=False), patch(
            "server.cli.serve.get_lock_pid_port_cli", return_value=(12345, get_server_port())
        ), patch("server.cli.serve.start_server_process") as mock_start:
            result = runner.invoke(start_command, ["--port", str(get_server_port()), "--force"])

            assert result.exit_code == 0
            mock_start.assert_called_once()

    def test_start_command_default_port(self):
        """Test start command uses default port when not specified."""
        runner = CliRunner()

        with patch("server.cli.serve.is_port_in_use", return_value=False), patch(
            "server.cli.serve.get_lock_pid_port_cli", return_value=None
        ), patch("server.cli.serve.start_server_process") as mock_start, patch(
            "server.cli.serve.Config.load"
        ) as mock_config:
            mock_config_instance = Mock()
            mock_config_instance.get_value.return_value = get_server_port()
            mock_config.return_value = mock_config_instance

            result = runner.invoke(start_command, [])

            assert result.exit_code == 0
            mock_start.assert_called_once()


class TestServeStopCommand:
    """Test the stop command functionality."""

    def test_stop_command_help(self):
        """Test stop command help output."""
        runner = CliRunner()
        result = runner.invoke(stop_command, ["--help"])
        assert result.exit_code == 0
        assert "stop" in result.output

    def test_stop_command_no_server_running(self):
        """Test stop command when no server is running."""
        runner = CliRunner()

        with patch("server.cli.serve.is_server_running", return_value=False):
            result = runner.invoke(stop_command, [])

            assert result.exit_code == 0
            assert "No running server found." in result.output

    def test_stop_command_server_running(self):
        """Test stop command when server is running."""
        runner = CliRunner()

        mock_process = Mock()
        mock_process.pid = 12345

        with patch("server.cli.serve.is_server_running", return_value=True), patch(
            "server.cli.serve.find_server_processes", return_value=[mock_process]
        ), patch("server.cli.serve.remove_lock_file") as mock_remove:
            result = runner.invoke(stop_command, [])

            assert result.exit_code == 0
            assert "Terminated process 12345" in result.output
            assert "Server stopped." in result.output
            mock_remove.assert_called_once()

    def test_stop_command_process_termination_error(self):
        """Test stop command when process termination fails."""
        runner = CliRunner()

        mock_process = Mock()
        mock_process.pid = 12345
        mock_process.terminate.side_effect = Exception("Permission denied")

        with patch("server.cli.serve.is_server_running", return_value=True), patch(
            "server.cli.serve.find_server_processes", return_value=[mock_process]
        ), patch("server.cli.serve.remove_lock_file") as mock_remove:
            result = runner.invoke(stop_command, [])

            assert result.exit_code == 0
            assert "Error terminating process 12345: Permission denied" in result.output
            assert "Server stopped." in result.output
            mock_remove.assert_called_once()


class TestServeRestartCommand:
    """Test the restart command functionality."""

    def test_restart_command_help(self):
        """Test restart command help output."""
        runner = CliRunner()
        result = runner.invoke(restart_command, ["--help"])
        assert result.exit_code == 0
        assert "restart" in result.output
        assert "--force" in result.output

    def test_restart_command_no_server_running(self):
        """Test restart command when no server is running."""
        runner = CliRunner()

        with patch("server.cli.serve.is_server_running", return_value=False):
            result = runner.invoke(restart_command, [])

            assert result.exit_code == 0
            assert "No running server found. Use --force to start anyway." in result.output

    def test_restart_command_with_force(self):
        """Test restart command with force flag."""
        runner = CliRunner()

        with patch("server.cli.serve.is_server_running", return_value=False), patch(
            "server.cli.serve.Config.load"
        ) as mock_config, patch("server.cli.serve.is_port_in_use", return_value=False), patch(
            "server.cli.serve.get_lock_pid_port_cli", return_value=None
        ), patch(
            "server.cli.serve.start_server_process"
        ) as mock_start:
            mock_config_instance = Mock()
            mock_config_instance.get_value.return_value = get_server_port()
            mock_config.return_value = mock_config_instance

            result = runner.invoke(restart_command, ["--force"])

            assert result.exit_code == 0
            assert "Starting server..." in result.output
            mock_start.assert_called_once()


class TestServeGroup:
    """Test the serve group command."""

    def test_serve_group_help(self):
        """Test serve group help output."""
        runner = CliRunner()
        result = runner.invoke(serve_group, ["--help"])
        assert result.exit_code == 0
        assert "serve" in result.output
        assert "start" in result.output
        assert "stop" in result.output
        assert "restart" in result.output

    def test_serve_group_no_command(self):
        """Test serve group without subcommand."""
        runner = CliRunner()
        result = runner.invoke(serve_group, [])
        assert result.exit_code == 0
        assert "serve" in result.output
