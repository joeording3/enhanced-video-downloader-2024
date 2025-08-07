"""Tests for resume_incomplete_downloads function in cli_helpers module."""

import json
import logging
from pathlib import Path
from typing import Any, ClassVar

import pytest
from pytest import LogCaptureFixture, MonkeyPatch

import server.config
from server.cli_helpers import resume_incomplete_downloads


# Patch Config.load to return an object with get_value method
class DummyConfig:
    """Dummy config object to satisfy Config.load() in resume_incomplete_downloads."""

    def get_value(self, key: str, default: Any | None = None) -> Any | None:
        """Return default value for any key."""
        return default

    def get_download_options(self) -> dict:
        """Return default yt-dlp options for testing."""
        return {
            "format": "bestvideo+bestaudio/best",
            "merge_output_format": "mp4",
            "continuedl": True,
            "nopart": True,
            "progress": True,
            "noprogress": False,
        }


@pytest.fixture(autouse=True)
def _dummy_config(monkeypatch: MonkeyPatch) -> None:
    """
    Patch Config.load to return a dummy config object.

    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    monkeypatch.setattr(server.config.Config, "load", classmethod(lambda cls: DummyConfig()))


# Create a fake yt_dlp module with a dummy YoutubeDL
class DummyYoutubeDL:
    """Dummy YoutubeDL class for testing."""

    instances: ClassVar[list[Any]] = []
    downloads: ClassVar[list[Any]] = []

    def __init__(self, opts: Any) -> None:
        """Initialize dummy YoutubeDL with options."""
        self.opts = opts
        DummyYoutubeDL.instances.append(self)

    def __enter__(self) -> "DummyYoutubeDL":
        """Context manager entry."""
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        """Context manager exit."""
        return

    def download(self, urls: list[str]) -> None:
        """Record download URLs for testing."""
        DummyYoutubeDL.downloads.append(urls)


@pytest.fixture(autouse=True)
def _dummy_yt_dlp(monkeypatch: MonkeyPatch) -> None:
    """
    Patch yt_dlp module with dummy implementation.

    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    # Import the real yt_dlp module first
    import yt_dlp

    # Create a mock that wraps the real module but overrides YoutubeDL
    class MockYoutubeDL(DummyYoutubeDL):
        """Mock YoutubeDL that records calls but doesn't actually download."""

        def download(self, urls: list[str]) -> None:
            """Record download URLs for testing without actually downloading."""
            DummyYoutubeDL.downloads.append(urls)
            # Don't actually download anything to avoid network calls

    # Replace the YoutubeDL class with our mock
    monkeypatch.setattr(yt_dlp, "YoutubeDL", MockYoutubeDL)
    # Set DownloadError to Exception for error handling tests
    monkeypatch.setattr(yt_dlp, "DownloadError", Exception)


@pytest.fixture(autouse=True)
def _clear_dummy_downloads() -> None:
    """
    Clear DummyYoutubeDL downloads between tests to prevent interference.

    :returns: None
    """
    DummyYoutubeDL.downloads.clear()
    DummyYoutubeDL.instances.clear()


def test_invalid_directory(tmp_path: Path, caplog: LogCaptureFixture) -> None:
    """
    Test handling of invalid directory.

    :param tmp_path: temporary directory fixture.
    :param caplog: pytest LogCaptureFixture for capturing log messages.
    :returns: None
    """
    caplog.set_level(logging.ERROR)
    # Directory does not exist
    resume_incomplete_downloads(tmp_path / "nope")
    assert "Target directory for resuming incomplete downloads does not exist" in caplog.text


def test_resume_incomplete_downloads_success(tmp_path: Path) -> None:
    """
    Test successful resume of incomplete downloads.

    :param tmp_path: temporary directory fixture.
    :returns: None
    """
    # Setup: create directory with a .part file and matching info.json
    base = tmp_path / "downloads"
    base.mkdir()
    part_file = base / "video.mp4.part"
    # Non-zero part file for resume
    part_file.write_text("data")
    info_file = base / "video.mp4.info.json"
    info_data = {"webpage_url": "https://example.com/video"}
    info_file.write_text(json.dumps(info_data))

    # Call the function under test
    resume_incomplete_downloads(base)

    # Ensure our dummy downloader was used and URL passed correctly
    assert DummyYoutubeDL.downloads == [["https://example.com/video"]]


def test_skip_zero_size_part_file(tmp_path: Path, caplog: LogCaptureFixture) -> None:
    """
    Test that zero-size part files are skipped.

    :param tmp_path: temporary directory fixture.
    :param caplog: pytest LogCaptureFixture for capturing log messages.
    :returns: None
    """
    # Setup: create directory with zero-size .part files
    base = tmp_path / "downloads"
    base.mkdir()
    zero_file = base / "zero.mp4.part"
    zero_file.write_text("")  # Empty file
    one_file = base / "one.mp4.part"
    one_file.write_text("data")  # Non-empty file

    # Create info.json for the non-empty file
    info_file = base / "one.mp4.info.json"
    info_data = {"webpage_url": "https://example.com/one"}
    info_file.write_text(json.dumps(info_data))

    # Call the function under test
    resume_incomplete_downloads(base)

    # Only the non-empty file should be processed
    assert DummyYoutubeDL.downloads == [["https://example.com/one"]]


def test_resume_incomplete_progress_and_nonresumable(tmp_path: Path, caplog: LogCaptureFixture) -> None:
    """
    Test resume with progress callback and non-resumable files.

    :param tmp_path: temporary directory fixture.
    :param caplog: pytest LogCaptureFixture for capturing log messages.
    :returns: None
    """
    # Setup: create directory with .part files
    base = tmp_path / "downloads"
    base.mkdir()
    first_file = base / "first.part"
    first_file.write_text("data")
    second_file = base / "second.mp4.part"
    second_file.write_text("data")

    # Create info.json for the second file only
    info_file = base / "second.mp4.info.json"
    info_data = {"webpage_url": "https://example.com/second"}
    info_file.write_text(json.dumps(info_data))

    # Call the function under test
    resume_incomplete_downloads(base)

    # Only the file with info.json should be processed
    assert DummyYoutubeDL.downloads == [["https://example.com/second"]]
