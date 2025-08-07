"""Unit tests for server.cli.resume module."""

from server.cli.resume import cli_resume_incomplete, resume_failed_cmd, resume_group


class TestResumeGroup:
    """Test resume group command functionality."""

    def test_resume_group_creation(self):
        """Test that resume group can be created."""
        assert resume_group is not None
        assert hasattr(resume_group, "commands")


class TestCliResumeIncomplete:
    """Test CLI resume incomplete command functionality."""

    def test_cli_resume_incomplete_exists(self):
        """Test that resume incomplete command exists."""
        assert callable(cli_resume_incomplete)

    def test_cli_resume_incomplete_is_click_command(self):
        """Test that resume incomplete command is a Click command."""
        assert hasattr(cli_resume_incomplete, "name")
        assert cli_resume_incomplete.name == "incomplete"


class TestResumeFailedCmd:
    """Test CLI resume failed command functionality."""

    def test_resume_failed_cmd_exists(self):
        """Test that resume failed command exists."""
        assert callable(resume_failed_cmd)

    def test_resume_failed_cmd_is_click_command(self):
        """Test that resume failed command is a Click command."""
        assert hasattr(resume_failed_cmd, "name")
        assert resume_failed_cmd.name == "failed"
