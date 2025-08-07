"""
Pytest configuration file for Enhanced Video Downloader.

This file contains fixtures and configuration for pytest.
"""

import sys
from pathlib import Path

import pytest

# Add the parent directory to sys.path to allow importing from the server directory
sys.path.insert(0, str(Path(__file__).parent.parent.resolve()))


@pytest.fixture
def sample_video_url():
    """Return a sample video URL for testing."""
    return "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
