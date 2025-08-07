"""Unit tests for server.cli_commands module."""

from unittest.mock import patch

import click
import click.testing

from server.cli_commands.status import status


class TestStatusCommand:
    """Test status CLI command functionality."""

    def test_status_command_with_running_server(self):
        """Test status command when server is running."""
        mock_procs = [
            {"pid": 12345, "port": 8080, "uptime": 3600},
            {"pid": 12346, "port": 8081, "uptime": 1800},
        ]

        with patch("server.cli_commands.status.find_server_processes_cli", return_value=mock_procs):
            runner = click.testing.CliRunner()
            result = runner.invoke(status)

            # Verify output
            expected_output = "PID 12345, port 8080, uptime 3600s\nPID 12346, port 8081, uptime 1800s\n"
            assert result.output == expected_output
            assert result.exit_code == 0

    def test_status_command_with_no_server(self):
        """Test status command when no server is running."""
        with patch("server.cli_commands.status.find_server_processes_cli", return_value=[]):
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

        with patch("server.cli_commands.status.find_server_processes_cli", return_value=mock_procs):
            runner = click.testing.CliRunner()
            result = runner.invoke(status)

            # Verify output
            assert "PID 12345, port 8080, uptime unknown" in result.output
            assert result.exit_code == 0


class TestResumeCommand:
    """Test resume CLI command functionality."""

    def test_resume_incomplete_command_exists(self):
        """Test that resume incomplete command exists."""
        from server.cli_commands.resume import incomplete

        assert callable(incomplete)

    def test_resume_failed_command_exists(self):
        """Test that resume failed command exists."""
        from server.cli_commands.resume import failed

        assert callable(failed)


class TestSystemMaintenanceCommand:
    """Test system maintenance CLI command functionality."""

    def test_system_maintenance_command_exists(self):
        """Test that system maintenance command exists."""
        from server.cli_commands.system_maintenance import system_maintenance

        assert callable(system_maintenance)


class TestLifecycleCommand:
    """Test lifecycle CLI command functionality."""

    def test_lifecycle_command(self):
        """Test lifecycle command functionality."""
        from server.cli_commands.lifecycle import restart_command, stop_command

        # Test legacy functions exist
        assert callable(stop_command)
        assert callable(restart_command)

        # These are legacy functions that don't take ctx
        stop_command()
        restart_command()
