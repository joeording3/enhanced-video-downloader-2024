from pathlib import Path
from typing import Any

import pytest
from pytest import MonkeyPatch

from server.__main__ import cleanup_part_files
from server.config import Config

pytestmark = pytest.mark.unit


def test_cleanup_part_files_removes_part_files(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """
    Test that cleanup_part_files removes .part files.

    :param tmp_path: temporary directory fixture.
    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    # Create temporary download directory
    download_dir = tmp_path / "downloads"
    download_dir.mkdir()
    # Create some .part files and other files
    part_files = [download_dir / f"file{i}.part" for i in range(3)]
    for pf in part_files:
        pf.write_text("partial data")
    other_file = download_dir / "file.txt"
    other_file.write_text("data")

    # Monkeypatch Config.load to return object with download_dir attribute
    class DummyConfig:
        def get_value(self, key: str, default: Any = None) -> Any:
            if key == "download_dir":
                return str(download_dir)
            return default

    monkeypatch.setattr(Config, "load", staticmethod(lambda: DummyConfig()))

    # Run cleanup
    cleanup_part_files()

    # Assert all .part files removed
    for pf in part_files:
        assert not pf.exists(), f"Expected {pf} to be removed"
    # Other file should remain
    assert other_file.exists(), "Non-.part file should not be removed"


def test_cleanup_part_files_no_directory(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """
    Test that cleanup_part_files handles non-existent directories gracefully.

    :param tmp_path: temporary directory fixture.
    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    # Setup Config.load to return a non-existent directory
    nonexist_dir = tmp_path / "no_such_dir"

    class DummyConfig2:
        def get_value(self, key: str, default: Any = None) -> Any:
            if key == "download_dir":
                return str(nonexist_dir)
            return default

    monkeypatch.setattr(Config, "load", staticmethod(lambda: DummyConfig2()))

    # Should not raise any exception
    cleanup_part_files()
    # Directory still does not exist
    assert not nonexist_dir.exists()
    assert not nonexist_dir.exists()
