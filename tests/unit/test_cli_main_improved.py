"""Improved unit tests for server.cli_main module to improve coverage."""

from unittest.mock import Mock, patch

import pytest
from click.testing import CliRunner

from server.cli_main import _cli_load_config, _cli_set_logging, cli, main


class TestCLIMainBasic:
    """Test basic CLI main functionality."""

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

    def test_cli_set_logging_verbose(self):
        """Test verbose logging setup."""
        with patch("logging.getLogger") as mock_get_logger:
            mock_logger = Mock()
            mock_get_logger.return_value = mock_logger

            _cli_set_logging(True)

            mock_logger.setLevel.assert_called_with(10)  # DEBUG level

    def test_cli_set_logging_normal(self):
        """Test normal logging setup."""
        with patch("logging.getLogger") as mock_get_logger:
            mock_logger = Mock()
            mock_get_logger.return_value = mock_logger

            _cli_set_logging(False)

            mock_logger.setLevel.assert_called_with(20)  # INFO level

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


class TestCLIMainCommands:
    """Test CLI main commands."""

    def test_start_server_command_help(self):
        """Test start server command help."""
        runner = CliRunner()
        result = runner.invoke(cli, ["start", "--help"])
        assert result.exit_code == 0
        assert "start" in result.output

    def test_stop_server_command_help(self):
        """Test stop server command help."""
        runner = CliRunner()
        result = runner.invoke(cli, ["stop", "--help"])
        assert result.exit_code == 0
        assert "stop" in result.output

    def test_restart_server_command_help(self):
        """Test restart server command help."""
        runner = CliRunner()
        result = runner.invoke(cli, ["restart", "--help"])
        assert result.exit_code == 0
        assert "restart" in result.output

    def test_status_server_command_help(self):
        """Test status server command help."""
        runner = CliRunner()
        result = runner.invoke(cli, ["status", "--help"])
        assert result.exit_code == 0
        assert "status" in result.output

    def test_system_group_command_help(self):
        """Test system group command help."""
        runner = CliRunner()
        result = runner.invoke(cli, ["system", "--help"])
        assert result.exit_code == 0
        assert "system" in result.output

    def test_disable_launchagents_command_help(self):
        """Test disable launchagents command help."""
        runner = CliRunner()
        result = runner.invoke(cli, ["system", "disable-launchagents", "--help"])
        assert result.exit_code == 0
        assert "disable-launchagents" in result.output


class TestCLIMainErrorHandling:
    """Test CLI main error handling."""

    def test_cli_with_invalid_command(self):
        """Test CLI with invalid command."""
        runner = CliRunner()
        result = runner.invoke(cli, ["invalid-command"])
        assert result.exit_code != 0

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


class TestCLIMainIntegration:
    """Test CLI main integration."""

    def test_cli_command_structure(self):
        """Test CLI command structure."""
        runner = CliRunner()
        result = runner.invoke(cli, ["--help"])

        assert result.exit_code == 0
        # Check for all major command groups
        assert "start" in result.output
        assert "stop" in result.output
        assert "restart" in result.output
        assert "status" in result.output
        assert "system" in result.output

    def test_cli_context_integration(self):
        """Test CLI context integration."""
        runner = CliRunner()
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        # Verify context is properly injected
        assert "Usage:" in result.output

    def test_cli_version_info(self):
        """Test CLI version information."""
        runner = CliRunner()
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        # Check for application name in help
        assert "Enhanced Video Downloader" in result.output or "server" in result.output


class TestCLIMainVerboseFlag:
    """Test CLI verbose flag functionality."""

    def test_cli_verbose_flag_integration(self):
        """Test CLI verbose flag integration."""
        runner = CliRunner()
        result = runner.invoke(cli, ["--verbose", "--help"])
        assert result.exit_code == 0
        # Should not raise any errors

    def test_cli_without_verbose_flag(self):
        """Test CLI without verbose flag."""
        runner = CliRunner()
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0
        # Should not raise any errors


class TestCLIMainCommandImports:
    """Test CLI command imports."""

    @patch("server.cli_main.get_cli_commands")
    def test_cli_commands_import(self, mock_get_commands):
        """Test that CLI commands are properly imported."""
        mock_commands = (Mock(), Mock(), Mock(), Mock(), Mock())
        mock_get_commands.return_value = mock_commands

        # This should not raise import errors
        runner = CliRunner()
        result = runner.invoke(cli, ["--help"])
        assert result.exit_code == 0

    def test_cli_invalid_command_handling(self):
        """Test CLI invalid command handling."""
        runner = CliRunner()
        # Test with invalid command
        result = runner.invoke(cli, ["invalid-command"])
        assert result.exit_code != 0  # Should fail gracefully


class TestCLIMainConfiguration:
    """Test CLI configuration handling."""

    def test_cli_config_loading(self):
        """Test CLI configuration loading."""
        with patch("server.cli_main.Config") as mock_config:
            mock_config.load.return_value = Mock()
            config = _cli_load_config(Mock())
            assert config is not None

    def test_cli_logging_setup(self):
        """Test CLI logging setup."""
        with patch("logging.getLogger") as mock_get_logger:
            mock_logger = Mock()
            mock_get_logger.return_value = mock_logger

            _cli_set_logging(True)
            mock_logger.setLevel.assert_called_with(10)  # DEBUG

            _cli_set_logging(False)
            mock_logger.setLevel.assert_called_with(20)  # INFO


class TestCLIMainCommandStructure:
    """Test CLI command structure."""

    def test_all_commands_present(self):
        """Test that all expected commands are present."""
        runner = CliRunner()
        result = runner.invoke(cli, ["--help"])

        assert result.exit_code == 0
        # Check for all major command groups
        assert "start" in result.output
        assert "stop" in result.output
        assert "restart" in result.output
        assert "status" in result.output
        assert "system" in result.output

    def test_command_help_text(self):
        """Test command help text."""
        runner = CliRunner()
        result = runner.invoke(cli, ["start", "--help"])
        assert result.exit_code == 0
        assert "Usage:" in result.output

    def test_system_subcommands(self):
        """Test system subcommands."""
        runner = CliRunner()
        result = runner.invoke(cli, ["system", "--help"])
        assert result.exit_code == 0
        assert "disable-launchagents" in result.output
