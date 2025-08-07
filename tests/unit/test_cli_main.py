"""Unit tests for server.cli_main module."""

from unittest.mock import Mock, patch

from click.testing import CliRunner

from server.cli_main import _cli_load_config, _cli_set_logging, cli, main


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
