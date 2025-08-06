"""
Tests for the disable_launchagents module.

This module tests the functionality for disabling LaunchAgents on macOS
to prevent the video downloader server from auto-starting.
"""

import subprocess
from pathlib import Path
from unittest.mock import Mock, patch

from server.disable_launchagents import (
    disable_agents,
    find_video_downloader_agents,
    get_agent_label,
    main,
    rename_agent,
    stop_and_unload_agent,
)


class TestFindVideoDownloaderAgents:
    """Test the find_video_downloader_agents function."""

    def test_find_agents_with_video_downloader_files(self) -> None:
        """Test finding agents with video_downloader in filename."""
        mock_files = [
            Path("/test/LaunchAgents/com.example.video_downloader.plist"),
            Path("/test/LaunchAgents/com.example.other.plist"),
            Path("/test/LaunchAgents/com.example.VIDEO_DOWNLOADER.plist"),
        ]
        with patch("pathlib.Path.expanduser", return_value=Path("/test/LaunchAgents")), patch(
            "pathlib.Path.exists", return_value=True
        ), patch("pathlib.Path.iterdir", return_value=mock_files):
            agents = find_video_downloader_agents()
            assert len(agents) == 2
            assert any("video_downloader.plist" in agent for agent in agents)
            assert any("VIDEO_DOWNLOADER.plist" in agent for agent in agents)

    def test_find_agents_with_enhanced_files(self) -> None:
        """Test finding agents with 'enhanced' in filename."""
        mock_files = [
            Path("/test/LaunchAgents/com.example.enhanced_video.plist"),
            Path("/test/LaunchAgents/com.example.other.plist"),
        ]
        with patch("pathlib.Path.expanduser", return_value=Path("/test/LaunchAgents")), patch(
            "pathlib.Path.exists", return_value=True
        ), patch("pathlib.Path.iterdir", return_value=mock_files):
            agents = find_video_downloader_agents()
            assert len(agents) == 1
            assert "enhanced_video.plist" in agents[0]

    def test_find_agents_no_matching_files(self) -> None:
        """Test finding agents when no matching files exist."""
        mock_files = [
            Path("/test/LaunchAgents/com.example.other.plist"),
            Path("/test/LaunchAgents/com.test.app.plist"),
        ]
        with patch("pathlib.Path.expanduser", return_value=Path("/test/LaunchAgents")), patch(
            "pathlib.Path.exists", return_value=True
        ), patch("pathlib.Path.iterdir", return_value=mock_files):
            agents = find_video_downloader_agents()
            assert len(agents) == 0

    def test_find_agents_directory_not_exists(self) -> None:
        """Test finding agents when directory doesn't exist."""
        with patch("pathlib.Path.exists", return_value=False):
            agents = find_video_downloader_agents()
            assert len(agents) == 0


class TestGetAgentLabel:
    """Test the get_agent_label function."""

    def test_get_agent_label_success(self) -> None:
        """Test successfully getting agent label."""
        with patch("subprocess.check_output", return_value="com.example.video_downloader\n"):
            label = get_agent_label("/path/to/agent.plist")
            assert label == "com.example.video_downloader"

    def test_get_agent_label_called_process_error(self) -> None:
        """Test getting agent label with CalledProcessError."""
        with patch("subprocess.check_output", side_effect=subprocess.CalledProcessError(1, "defaults")):
            label = get_agent_label("/path/to/agent.plist")
            assert label is None

    def test_get_agent_label_general_exception(self) -> None:
        """Test getting agent label with general exception."""
        with patch("subprocess.check_output", side_effect=Exception("Unexpected error")):
            label = get_agent_label("/path/to/agent.plist")
            assert label is None


class TestStopAndUnloadAgent:
    """Test the stop_and_unload_agent function."""

    def test_stop_and_unload_agent_user_level(self) -> None:
        """Test stopping and unloading user-level agent."""
        with patch("subprocess.run") as mock_run:
            stop_and_unload_agent("com.example.video_downloader", "/path/to/agent.plist", False)
            assert mock_run.call_count == 2
            mock_run.assert_any_call(["launchctl", "stop", "com.example.video_downloader"], check=True)
            mock_run.assert_any_call(["launchctl", "unload", "/path/to/agent.plist"], check=False)

    def test_stop_and_unload_agent_root_level(self) -> None:
        """Test stopping and unloading root-level agent."""
        with patch("subprocess.run") as mock_run:
            stop_and_unload_agent("com.example.video_downloader", "/Library/LaunchDaemons/agent.plist", True)
            assert mock_run.call_count == 2
            mock_run.assert_any_call(["launchctl", "stop", "com.example.video_downloader"], check=True)
            mock_run.assert_any_call(["launchctl", "bootout", "system/com.example.video_downloader"], check=False)

    def test_stop_and_unload_agent_stop_failure(self) -> None:
        """Test stopping and unloading when stop fails."""
        with patch("subprocess.run") as mock_run:
            mock_run.side_effect = [
                subprocess.CalledProcessError(1, "launchctl"),
                Mock(),
            ]
            stop_and_unload_agent("com.example.video_downloader", "/path/to/agent.plist", False)


class TestRenameAgent:
    """Test the rename_agent function."""

    def test_rename_agent_success(self, tmp_path: Path) -> None:
        """Test successfully renaming agent."""
        agent_file = tmp_path / "test_agent.plist"
        agent_file.touch()
        rename_agent(str(agent_file))
        assert not agent_file.exists()
        assert (tmp_path / "test_agent.plist.DISABLED").exists()

    def test_rename_agent_permission_error(self, tmp_path: Path) -> None:
        """Test renaming agent with permission error."""
        agent_file = tmp_path / "test_agent.plist"
        agent_file.touch()
        with patch("os.rename", side_effect=PermissionError("Permission denied")):
            rename_agent(str(agent_file))
            assert agent_file.exists()

    def test_rename_agent_general_exception(self, tmp_path: Path) -> None:
        """Test renaming agent with general exception."""
        agent_file = tmp_path / "test_agent.plist"
        agent_file.touch()
        with patch("os.rename", side_effect=Exception("Unexpected error")):
            rename_agent(str(agent_file))
            assert agent_file.exists()


class TestDisableAgents:
    """Test the disable_agents function."""

    def test_disable_agents_empty_list(self) -> None:
        """Test disabling agents with empty list."""
        with patch("server.disable_launchagents.log") as mock_log:
            disable_agents([])
            mock_log.info.assert_called_with("No LaunchAgents found to disable.")

    def test_disable_agents_success(self, tmp_path: Path) -> None:
        """Test successfully disabling agents."""
        agent_file = tmp_path / "test_agent.plist"
        agent_file.touch()

        with patch("server.disable_launchagents.get_agent_label", return_value="com.test.agent"), patch(
            "server.disable_launchagents.stop_and_unload_agent"
        ), patch("server.disable_launchagents.rename_agent"), patch("os.path.exists", return_value=True), patch(
            "os.geteuid", return_value=1000
        ):
            disable_agents([str(agent_file)])

            # Should call all the helper functions
            assert agent_file.exists()  # File still exists since we mocked rename

    def test_disable_agents_path_not_exists(self) -> None:
        """Test disabling agents when path doesn't exist."""
        with patch("server.disable_launchagents.log") as mock_log:
            disable_agents(["/nonexistent/path.plist"])
            mock_log.error.assert_called_with("Path does not exist: /nonexistent/path.plist")

    def test_disable_agents_no_label(self, tmp_path: Path) -> None:
        """Test disabling agents when label cannot be determined."""
        agent_file = tmp_path / "test_agent.plist"
        agent_file.touch()

        with patch("server.disable_launchagents.get_agent_label", return_value=None), patch(
            "server.disable_launchagents.rename_agent"
        ), patch("os.path.exists", return_value=True), patch("server.disable_launchagents.log") as mock_log:
            disable_agents([str(agent_file)])
            mock_log.error.assert_called_with(f"  Could not determine agent label for {agent_file}")


class TestMain:
    """Test the main function."""

    def test_main_no_agents_found(self) -> None:
        """Test main when no agents are found."""
        with patch("server.disable_launchagents.find_video_downloader_agents", return_value=[]):
            # Should not print anything, just return
            main()

    def test_main_with_user_agents(self, tmp_path: Path) -> None:
        """Test main function with user-level agents."""
        agent_file = tmp_path / "test_agent.plist"
        agent_file.touch()

        with patch("server.disable_launchagents.find_video_downloader_agents", return_value=[str(agent_file)]), patch(
            "server.disable_launchagents.disable_agents"
        ) as mock_disable, patch("os.geteuid", return_value=1000):
            main()

            # Should call disable_agents
            mock_disable.assert_called_once_with([str(agent_file)])

    def test_main_with_system_agents_requires_root(self, tmp_path: Path) -> None:
        """Test main function with system agents requiring root."""
        system_agent = "/Library/LaunchDaemons/test_agent.plist"

        with patch("server.disable_launchagents.find_video_downloader_agents", return_value=[system_agent]), patch(
            "server.disable_launchagents.disable_agents"
        ) as mock_disable, patch("builtins.input", return_value="y"), patch("os.geteuid", return_value=1000):
            main()

            # Should call disable_agents after user confirms
            mock_disable.assert_called_once_with([system_agent])

    def test_main_with_system_agents_user_cancels(self, tmp_path: Path) -> None:
        """Test main function when user cancels after root warning."""
        system_agent = "/Library/LaunchDaemons/test_agent.plist"

        with patch("server.disable_launchagents.find_video_downloader_agents", return_value=[system_agent]), patch(
            "server.disable_launchagents.disable_agents"
        ) as mock_disable, patch("builtins.input", return_value="n"), patch("os.geteuid", return_value=1000):
            main()

            # Should not call disable_agents
            mock_disable.assert_not_called()

    def test_main_with_system_agents_as_root(self, tmp_path: Path) -> None:
        """Test main function with system agents when running as root."""
        system_agent = "/Library/LaunchDaemons/test_agent.plist"

        with patch("server.disable_launchagents.find_video_downloader_agents", return_value=[system_agent]), patch(
            "server.disable_launchagents.disable_agents"
        ) as mock_disable, patch("os.geteuid", return_value=0):
            main()

            # Should call disable_agents directly when running as root
            mock_disable.assert_called_once_with([system_agent])
