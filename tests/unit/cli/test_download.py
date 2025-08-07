from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest
from click.testing import CliRunner

from server.cli.download import (
    batch_command,
    cancel_command,
    download_group,
    list_command,
    priority_command,
    resume_command,
    url_command,
)
from server.constants import get_server_port


@pytest.mark.parametrize(
    "args, substrings",
    [
        (
            [],
            ["Usage:", "url", "resume", "cancel"],
        ),
        (
            ["--help"],
            ["Usage:", "url", "resume", "cancel"],
        ),
    ],
)
def test_download_group_help(args: list[str], substrings: list[str]) -> None:
    """Test that download group shows all subcommands."""
    runner = CliRunner()
    result = runner.invoke(download_group, args)
    assert result.exit_code == 0
    for substr in substrings:
        assert substr in result.output


def test_url_command_help():
    """Test url command help output."""
    runner = CliRunner()
    result = runner.invoke(url_command, ["--help"])
    assert result.exit_code == 0
    assert "url" in result.output
    assert "--format" in result.output
    assert "--output-dir" in result.output


def test_batch_command_help():
    """Test batch command help output."""
    runner = CliRunner()
    result = runner.invoke(batch_command, ["--help"])
    assert result.exit_code == 0
    assert "batch" in result.output
    assert "--format" in result.output
    assert "--concurrent" in result.output
    assert "--delay" in result.output


def test_resume_command_help():
    """Test resume command help output."""
    runner = CliRunner()
    result = runner.invoke(resume_command, ["--help"])
    assert result.exit_code == 0
    assert "resume" in result.output
    assert "partials" in result.output
    assert "incomplete" in result.output
    assert "failed" in result.output


def test_cancel_command_help():
    """Test cancel command help output."""
    runner = CliRunner()
    result = runner.invoke(cancel_command, ["--help"])
    assert result.exit_code == 0
    assert "cancel" in result.output


def test_priority_command_help():
    """Test priority command help output."""
    runner = CliRunner()
    result = runner.invoke(priority_command, ["--help"])
    assert result.exit_code == 0
    assert "priority" in result.output


def test_list_command_help():
    """Test list command help output."""
    runner = CliRunner()
    result = runner.invoke(list_command, ["--help"])
    assert result.exit_code == 0
    assert "list" in result.output
    assert "--active-only" in result.output
    assert "--failed-only" in result.output
    assert "--format" in result.output


@patch("server.cli.download.requests.post")
@patch("server.cli.download.is_server_running")
@patch("server.cli.download.get_config_value")
def test_url_command_calls_download_url(
    mock_get_config: Any, mock_is_running: Any, mock_post: Any, tmp_path: Path
) -> None:
    """Test that 'url' command calls download_url with correct args."""
    mock_is_running.return_value = True
    mock_get_config.return_value = get_server_port()

    # Mock the response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"title": "Test video", "downloadId": "abc123"}
    mock_post.return_value = mock_response

    test_url = "https://example.com/video.mp4"
    output_dir = str(tmp_path)

    runner = CliRunner()
    result = runner.invoke(url_command, [test_url, "--output-dir", output_dir])

    assert result.exit_code == 0
    mock_post.assert_called_once()
    # Check URL is passed correctly in the request
    assert mock_post.call_args[0][0] == f"http://127.0.0.1:{get_server_port()}/download"
    # Check request body contains the URL
    assert mock_post.call_args[1]["json"]["url"] == test_url


@patch("server.cli.download.requests.post")
@patch("server.cli.download.is_server_running")
@patch("server.cli.download.get_config_value")
def test_url_command_server_not_running(mock_get_config: Any, mock_is_running: Any, mock_post: Any) -> None:
    """Test that 'url' command fails when server is not running."""
    mock_is_running.return_value = False

    runner = CliRunner()
    result = runner.invoke(url_command, ["https://example.com/video.mp4"])

    assert result.exit_code == 1
    assert "Server is not running" in result.output
    mock_post.assert_not_called()


@patch("server.cli.download.requests.post")
@patch("server.cli.download.is_server_running")
@patch("server.cli.download.get_config_value")
def test_url_command_no_port_config(mock_get_config: Any, mock_is_running: Any, mock_post: Any) -> None:
    """Test that 'url' command fails when port is not configured."""
    mock_is_running.return_value = True
    mock_get_config.return_value = None

    runner = CliRunner()
    result = runner.invoke(url_command, ["https://example.com/video.mp4"])

    assert result.exit_code == 1
    assert "Could not determine server port" in result.output
    mock_post.assert_not_called()


@patch("server.cli.download.requests.post")
@patch("server.cli.download.is_server_running")
@patch("server.cli.download.get_config_value")
def test_url_command_with_user_agent_and_referrer(
    mock_get_config: Any, mock_is_running: Any, mock_post: Any, tmp_path: Path
) -> None:
    """Test that 'url' command passes user_agent and referrer correctly."""
    mock_is_running.return_value = True
    mock_get_config.return_value = get_server_port()

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"title": "Test video", "downloadId": "abc123"}
    mock_post.return_value = mock_response

    test_url = "https://example.com/video.mp4"
    output_dir = str(tmp_path)

    runner = CliRunner()
    result = runner.invoke(
        url_command,
        [
            test_url,
            "--output-dir",
            output_dir,
            "--user-agent",
            "TestAgent/1.0",
            "--referrer",
            "https://example.com",
            "--is-playlist",
        ],
    )

    assert result.exit_code == 0
    mock_post.assert_called_once()
    request_json = mock_post.call_args[1]["json"]
    assert request_json["url"] == test_url
    assert request_json["user_agent"] == "TestAgent/1.0"
    assert request_json["referrer"] == "https://example.com"
    assert request_json["is_playlist"] is True


def test_batch_command_with_nonexistent_file():
    """Test batch command with nonexistent file."""
    runner = CliRunner()
    result = runner.invoke(batch_command, ["nonexistent.txt"])

    assert result.exit_code == 2  # Click error
    assert "does not exist" in result.output


@patch("server.cli.download.requests.post")
@patch("server.cli.download.is_server_running")
@patch("server.cli.download.get_config_value")
def test_batch_command_with_valid_file(
    mock_get_config: Any, mock_is_running: Any, mock_post: Any, tmp_path: Path
) -> None:
    """Test batch command with valid URLs file."""
    mock_is_running.return_value = True
    mock_get_config.return_value = get_server_port()

    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"title": "Test video", "downloadId": "abc123"}
    mock_post.return_value = mock_response

    # Create a temporary URLs file
    urls_file = tmp_path / "urls.txt"
    urls_file.write_text("https://example.com/video1.mp4\n# Comment line\nhttps://example.com/video2.mp4")

    runner = CliRunner()
    result = runner.invoke(batch_command, [str(urls_file), "--concurrent", "2", "--delay", "0.1"])

    assert result.exit_code == 0
    # Should be called twice (once for each URL, excluding comment)
    assert mock_post.call_count == 2


@patch("server.cli.download.requests.post")
@patch("server.cli.download.is_server_running")
@patch("server.cli.download.get_config_value")
def test_resume_partials_command(mock_get_config: Any, mock_is_running: Any, mock_post: Any) -> None:
    """Test that 'resume partials' command sends correct request."""
    mock_is_running.return_value = True
    mock_get_config.return_value = get_server_port()

    # Mock the response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"resumed": 3, "failed": 0}
    mock_post.return_value = mock_response

    runner = CliRunner()
    result = runner.invoke(resume_command, ["partials"])

    assert result.exit_code == 0
    mock_post.assert_called_once()
    # Check request body contains the correct type
    assert mock_post.call_args[1]["json"]["type"] == "partials"


@patch("server.cli.download.requests.post")
@patch("server.cli.download.is_server_running")
@patch("server.cli.download.get_config_value")
def test_resume_incomplete_command(mock_get_config: Any, mock_is_running: Any, mock_post: Any) -> None:
    """Test that 'resume incomplete' command sends correct request."""
    mock_is_running.return_value = True
    mock_get_config.return_value = get_server_port()

    # Mock the response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"resumed": 2, "failed": 1}
    mock_post.return_value = mock_response

    runner = CliRunner()
    result = runner.invoke(resume_command, ["incomplete"])

    assert result.exit_code == 0
    mock_post.assert_called_once()
    # Check request body contains the correct type
    assert mock_post.call_args[1]["json"]["type"] == "incomplete"


@patch("server.cli.download.requests.post")
@patch("server.cli.download.is_server_running")
@patch("server.cli.download.get_config_value")
def test_resume_failed_command(mock_get_config: Any, mock_is_running: Any, mock_post: Any) -> None:
    """Test that 'resume failed' command sends correct request."""
    mock_is_running.return_value = True
    mock_get_config.return_value = get_server_port()

    # Mock the response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"resumed": 1, "failed": 2}
    mock_post.return_value = mock_response

    runner = CliRunner()
    result = runner.invoke(resume_command, ["failed"])

    assert result.exit_code == 0
    mock_post.assert_called_once()
    # Check request body contains the correct type
    assert mock_post.call_args[1]["json"]["type"] == "failed"


@patch("server.cli.download.requests.post")
@patch("server.cli.download.is_server_running")
@patch("server.cli.download.get_config_value")
def test_cancel_command(mock_get_config: Any, mock_is_running: Any, mock_post: Any) -> None:
    """Test that 'cancel' command sends correct request."""
    mock_is_running.return_value = True
    mock_get_config.return_value = get_server_port()

    # Mock the response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"message": "Download canceled"}
    mock_post.return_value = mock_response

    runner = CliRunner()
    result = runner.invoke(cancel_command, ["download123"])

    assert result.exit_code == 0
    mock_post.assert_called_once()
    # Check URL contains the download ID
    assert mock_post.call_args[0][0] == f"http://127.0.0.1:{get_server_port()}/download/download123/cancel"


@patch("server.cli.download.requests.post")
@patch("server.cli.download.is_server_running")
@patch("server.cli.download.get_config_value")
def test_priority_command(mock_get_config: Any, mock_is_running: Any, mock_post: Any) -> None:
    """Test that 'priority' command sends correct request."""
    mock_is_running.return_value = True
    mock_get_config.return_value = get_server_port()

    # Mock the response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"message": "Priority updated"}
    mock_post.return_value = mock_response

    runner = CliRunner()
    result = runner.invoke(priority_command, ["download123", "5"])

    assert result.exit_code == 0
    mock_post.assert_called_once()
    # Check URL contains the download ID
    assert mock_post.call_args[0][0] == f"http://127.0.0.1:{get_server_port()}/download/download123/priority"
    # Check request body contains the priority
    request_json = mock_post.call_args[1]["json"]
    assert request_json["priority"] == 5


@patch("server.cli.download.requests.get")
@patch("server.cli.download.is_server_running")
@patch("server.cli.download.get_config_value")
def test_list_command_table_format(mock_get_config: Any, mock_is_running: Any, mock_get: Any) -> None:
    """Test that 'list' command displays downloads in table format."""
    mock_is_running.return_value = True
    mock_get_config.return_value = get_server_port()

    # Mock the response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "downloads": [
            {
                "downloadId": "download123",
                "url": "https://example.com/video.mp4",
                "title": "Test Video",
                "status": "downloading",
                "progress": 50.0,
                "priority": 1,
            }
        ]
    }
    mock_get.return_value = mock_response

    runner = CliRunner()
    result = runner.invoke(list_command, ["--format", "table"])

    assert result.exit_code == 0
    mock_get.assert_called_once()
    assert "Test Video" in result.output
    assert "downloading" in result.output


@patch("server.cli.download.requests.get")
@patch("server.cli.download.is_server_running")
@patch("server.cli.download.get_config_value")
def test_list_command_json_format(mock_get_config: Any, mock_is_running: Any, mock_get: Any) -> None:
    """Test that 'list' command displays downloads in JSON format."""
    mock_is_running.return_value = True
    mock_get_config.return_value = get_server_port()

    # Mock the response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "downloads": [
            {
                "downloadId": "download123",
                "url": "https://example.com/video.mp4",
                "title": "Test Video",
                "status": "downloading",
                "progress": 50.0,
                "priority": 1,
            }
        ]
    }
    mock_get.return_value = mock_response

    runner = CliRunner()
    result = runner.invoke(list_command, ["--format", "json"])

    assert result.exit_code == 0
    mock_get.assert_called_once()
    assert "download123" in result.output
    assert "Test Video" in result.output
    assert "downloading" in result.output


@patch("server.cli.download.requests.get")
@patch("server.cli.download.is_server_running")
@patch("server.cli.download.get_config_value")
def test_list_command_active_only(mock_get_config: Any, mock_is_running: Any, mock_get: Any) -> None:
    """Test that 'list' command with --active-only flag."""
    mock_is_running.return_value = True
    mock_get_config.return_value = get_server_port()

    # Mock the response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"downloads": []}
    mock_get.return_value = mock_response

    runner = CliRunner()
    result = runner.invoke(list_command, ["--active-only"])

    assert result.exit_code == 0
    mock_get.assert_called_once()
    # The filtering is done in the code, not in the URL
    assert mock_get.call_args[0][0] == f"http://127.0.0.1:{get_server_port()}/status"


@patch("server.cli.download.requests.get")
@patch("server.cli.download.is_server_running")
@patch("server.cli.download.get_config_value")
def test_list_command_failed_only(mock_get_config: Any, mock_is_running: Any, mock_get: Any) -> None:
    """Test that 'list' command with --failed-only flag."""
    mock_is_running.return_value = True
    mock_get_config.return_value = get_server_port()

    # Mock the response
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"downloads": []}
    mock_get.return_value = mock_response

    runner = CliRunner()
    result = runner.invoke(list_command, ["--failed-only"])

    assert result.exit_code == 0
    mock_get.assert_called_once()
    # The filtering is done in the code, not in the URL
    assert mock_get.call_args[0][0] == f"http://127.0.0.1:{get_server_port()}/status"
