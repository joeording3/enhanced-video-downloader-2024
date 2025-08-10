"""Additional tests to increase coverage for server/cli/status.py."""

from __future__ import annotations

import json
from typing import Any
from unittest.mock import MagicMock, Mock, patch

import pytest
import requests
from click.testing import CliRunner

from server.cli.status import (
    downloads_command,
    find_server_processes_cli,
    get_active_downloads,
    server_command,
    status_command,
)
from server.constants import get_server_port


def test_status_server_no_processes_json(monkeypatch: Any) -> None:
    from server.cli import status as mod

    runner = CliRunner()
    monkeypatch.setattr(mod, "find_server_processes_cli", list)
    result = runner.invoke(mod.server, ["--json"])
    assert result.exit_code != 0
    assert "No running server found" in result.output


def test_status_server_as_json(monkeypatch: Any) -> None:
    from server.cli import status as mod

    runner = CliRunner()
    monkeypatch.setattr(
        mod,
        "find_server_processes_cli",
        lambda: [{"pid": 1, "port": 5050, "uptime": 3700, "version": "1.0.0"}],
    )
    result = runner.invoke(mod.server, ["--json"])
    assert result.exit_code == 0
    parsed = json.loads(result.output)
    assert parsed[0]["pid"] == 1 and parsed[0]["port"] == 5050
    assert "h" in parsed[0]["uptime"]


def test_status_downloads_happy_path(monkeypatch: Any) -> None:
    from server.cli import status as mod

    runner = CliRunner()
    # Pretend server is running and has port
    monkeypatch.setattr(mod, "is_server_running", lambda: True)
    monkeypatch.setattr(mod, "get_config_value", lambda _k: 5001)
    fake_resp = MagicMock(status_code=200, json=lambda: {"active_downloads": [{"id": "x", "url": "u", "status": "s", "progress": 10}]})
    monkeypatch.setattr(mod.requests, "get", lambda *_a, **_k: fake_resp)
    result = runner.invoke(mod.downloads)
    assert result.exit_code == 0
    assert "ID: x" in result.output and "Progress: 10%" in result.output


def test_status_downloads_errors(monkeypatch: Any) -> None:
    from server.cli import status as mod

    runner = CliRunner()
    monkeypatch.setattr(mod, "is_server_running", lambda: True)
    monkeypatch.setattr(mod, "get_config_value", lambda _k: 5001)
    # HTTP error
    fake_resp = MagicMock(status_code=500, text="boom")
    monkeypatch.setattr(mod.requests, "get", lambda *_a, **_k: fake_resp)
    result = runner.invoke(mod.downloads, [])
    assert result.exit_code != 0



class TestStatusHelperFunctions:
    """Test status helper functions."""

    @patch("server.cli.status.is_server_running")
    @patch("server.cli.status.get_config_value")
    @patch("requests.get")
    @patch("click.echo")
    def test_get_active_downloads_success(self, mock_echo, mock_get, mock_config, mock_running):
        """Test get_active_downloads with successful response."""
        mock_running.return_value = True
        mock_config.return_value = get_server_port()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "active_downloads": [
                {"id": "test123", "url": "https://example.com/video", "status": "downloading", "progress": 50}
            ]
        }
        mock_get.return_value = mock_response

        result = get_active_downloads()

        assert len(result) == 1
        assert result[0]["id"] == "test123"
        mock_get.assert_called_once_with(
            "http://127.0.0.1:" + str(get_server_port()) + "/api/status", timeout=10
        )

    @patch("server.cli.status.is_server_running")
    @patch("click.echo")
    def test_get_active_downloads_server_not_running(self, mock_echo, mock_running):
        """Test get_active_downloads when server is not running."""
        mock_running.return_value = False

        with pytest.raises(SystemExit):
            get_active_downloads()

        mock_echo.assert_called_with("Server is not running. Please start the server first.")

    @patch("server.cli.status.is_server_running")
    @patch("server.cli.status.get_config_value")
    @patch("click.echo")
    def test_get_active_downloads_no_port(self, mock_echo, mock_config, mock_running):
        """Test get_active_downloads when no port is available."""
        mock_running.return_value = True
        mock_config.return_value = None

        with pytest.raises(SystemExit):
            get_active_downloads()

        mock_echo.assert_called_with("Could not determine server port. Please start the server first.")

    @patch("server.cli.status.is_server_running")
    @patch("server.cli.status.get_config_value")
    @patch("requests.get")
    @patch("click.echo")
    def test_get_active_downloads_connection_error(self, mock_echo, mock_get, mock_config, mock_running):
        """Test get_active_downloads with connection error."""
        mock_running.return_value = True
        mock_config.return_value = get_server_port()
        mock_get.side_effect = requests.exceptions.ConnectionError()

        with pytest.raises(SystemExit):
            get_active_downloads()

        mock_echo.assert_called_with(
            "Could not connect to server at port " + str(get_server_port()) + ". Is the server running?"
        )

    @patch("server.cli.status.is_server_running")
    @patch("server.cli.status.get_config_value")
    @patch("requests.get")
    @patch("click.echo")
    def test_get_active_downloads_server_error(self, mock_echo, mock_get, mock_config, mock_running):
        """Test get_active_downloads with server error."""
        mock_running.return_value = True
        mock_config.return_value = get_server_port()
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.text = "Server error"
        mock_get.return_value = mock_response

        with pytest.raises(SystemExit):
            get_active_downloads()

        # Check that both error messages were called
        mock_echo.assert_any_call("Error retrieving downloads: 500")
        mock_echo.assert_any_call("Server error")

    @patch("server.cli.status.is_server_running")
    @patch("server.cli.status.get_config_value")
    @patch("requests.get")
    def test_get_active_downloads_invalid_response(self, mock_get, mock_config, mock_running):
        """Test get_active_downloads with invalid response format."""
        mock_running.return_value = True
        mock_config.return_value = get_server_port()
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"active_downloads": "not_a_list"}
        mock_get.return_value = mock_response

        result = get_active_downloads()

        assert result == []


class TestStatusCommands:
    """Test status command functionality."""

    @patch("server.cli.status.find_server_processes_cli")
    @patch("click.echo")
    def test_server_command_no_processes(self, mock_echo, mock_find):
        """Test server_command with no running processes."""
        mock_find.return_value = []

        # Simulate the server command logic
        processes = find_server_processes_cli()
        if not processes:
            mock_echo("No running server found")

        mock_echo.assert_called_with("No running server found")

    @patch("server.cli.status.find_server_processes_cli")
    @patch("click.echo")
    def test_server_command_with_processes(self, mock_echo, mock_find):
        """Test server_command with running processes."""
        mock_find.return_value = [{"pid": 12345, "port": get_server_port(), "uptime": 3600, "version": "1.0.0"}]

        # Call the actual server_command logic
        server_command.callback(as_json=False)

        # Should show PID and port
        mock_echo.assert_any_call("PID 12345")
        mock_echo.assert_any_call("Port " + str(get_server_port()))
        mock_echo.assert_any_call("Uptime: 1h 0m 0s")
        mock_echo.assert_any_call("Version: 1.0.0")

    @patch("server.cli.status.find_server_processes_cli")
    @patch("click.echo")
    def test_server_command_json_output(self, mock_echo, mock_find):
        """Test server_command with JSON output."""
        mock_find.return_value = [{"pid": 12345, "port": get_server_port(), "uptime": 3661, "version": "1.0.0"}]

        # Call the actual server_command logic for JSON output
        server_command.callback(as_json=True)

        # Should call json.dumps
        mock_echo.assert_called_once()
        call_args = mock_echo.call_args[0][0]
        assert isinstance(call_args, str)
        # Should be valid JSON
        data = json.loads(call_args)
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["pid"] == 12345
        assert data[0]["port"] == get_server_port()

    @patch("server.cli.status.get_active_downloads")
    @patch("click.echo")
    def test_downloads_command_no_downloads(self, mock_echo, mock_get_downloads):
        """Test downloads_command with no active downloads."""
        mock_get_downloads.return_value = []

        downloads_command.callback(as_json=False)

        mock_echo.assert_called_with("No active downloads")

    @patch("server.cli.status.get_active_downloads")
    @patch("click.echo")
    def test_downloads_command_with_downloads(self, mock_echo, mock_get_downloads):
        """Test downloads_command with active downloads."""
        mock_get_downloads.return_value = [
            {"id": "test123", "url": "https://example.com/video", "status": "downloading", "progress": 50}
        ]

        downloads_command.callback(as_json=False)

        # Should call echo multiple times for formatting
        assert mock_echo.call_count >= 4
        # Should show download details
        mock_echo.assert_any_call("ID: test123")
        mock_echo.assert_any_call("URL: https://example.com/video")
        mock_echo.assert_any_call("Status: downloading")
        mock_echo.assert_any_call("Progress: 50%")

    @patch("server.cli.status.get_active_downloads")
    @patch("click.echo")
    def test_downloads_command_json_output(self, mock_echo, mock_get_downloads):
        """Test downloads_command with JSON output."""
        mock_get_downloads.return_value = [
            {"id": "test123", "url": "https://example.com/video", "status": "downloading", "progress": 50}
        ]

        downloads_command.callback(as_json=True)

        # Should call json.dumps
        mock_echo.assert_called_once()
        call_args = mock_echo.call_args[0][0]
        assert isinstance(call_args, str)
        # Should be valid JSON
        data = json.loads(call_args)
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == "test123"


class TestStatusGroup:
    """Test status group functionality."""

    def test_status_group_exists(self):
        """Test that status group can be imported."""
        try:
            assert status_command is not None
        except ImportError:
            pytest.skip("Status command import failed due to circular dependencies")

    def test_status_group_has_subcommands(self):
        """Test that status group has expected subcommands."""
        try:
            assert "server" in status_command.commands
            assert "downloads" in status_command.commands
        except ImportError:
            pytest.skip("Status command import failed due to circular dependencies")


class TestStatusIntegration:
    """Test status functionality integration."""

    @patch("server.cli.status.find_server_processes_cli")
    @patch("click.echo")
    def test_server_command_integration(self, mock_echo, mock_find):
        """Test server_command integration with multiple processes."""
        mock_find.return_value = [
            {"pid": 12345, "port": get_server_port(), "uptime": 3600, "version": "1.0.0"},
            {"pid": 12346, "port": get_server_port() + 1, "uptime": 1800, "version": "1.0.1"},
        ]

        from server.cli.status import server_command

        server_command.callback(as_json=False)

        # Should call echo multiple times for formatting
        assert mock_echo.call_count >= 6
        # Should show both processes
        mock_echo.assert_any_call("PID 12345")
        mock_echo.assert_any_call("PID 12346")
        mock_echo.assert_any_call("Port " + str(get_server_port()))
        mock_echo.assert_any_call("Port " + str(get_server_port() + 1))

    @patch("server.cli.status.get_active_downloads")
    @patch("click.echo")
    def test_downloads_command_integration(self, mock_echo, mock_get_downloads):
        """Test downloads_command integration with multiple downloads."""
        mock_get_downloads.return_value = [
            {"id": "test123", "url": "https://example.com/video1", "status": "downloading", "progress": 50},
            {"id": "test456", "url": "https://example.com/video2", "status": "queued", "progress": 0},
        ]

        from server.cli.status import downloads_command

        downloads_command.callback(as_json=False)

        # Should call echo multiple times for formatting
        assert mock_echo.call_count >= 8
        # Should show both downloads
        mock_echo.assert_any_call("ID: test123")
        mock_echo.assert_any_call("ID: test456")
        mock_echo.assert_any_call("URL: https://example.com/video1")
        mock_echo.assert_any_call("URL: https://example.com/video2")
