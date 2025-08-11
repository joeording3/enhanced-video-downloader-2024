"""
CLI command module for Enhanced Video Downloader server.

This module provides subcommand modules for the main CLI interface,
organizing commands into logical groups for server control, download management,
configuration, and utility operations.
"""

# Import subcommand modules for use by the main CLI
from server.cli.download import download_command
from server.cli.history import history_command
from server.cli.queue import queue_group
from server.cli.resume import resume_group
from server.cli.status import status_command
from server.cli.utils import utils_command

# Export subcommands for registration by main CLI
__all__ = [
    "download_command",
    "history_command",
    "queue_group",
    "resume_group",
    "status_command",
    "utils_command",
]
