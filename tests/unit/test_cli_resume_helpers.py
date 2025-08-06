import json
import logging
from pathlib import Path
from typing import Any

from server.cli_resume_helpers import derive_resume_url, get_part_files, validate_scan_directory


def test_validate_scan_directory(tmp_path: Path, caplog: Any) -> None:
    # Nonexistent directory
    caplog.set_level(logging.ERROR)
    logger = logging.getLogger("test")
    missing = tmp_path / "nope"
    assert not validate_scan_directory(missing, logger)
    assert "does not exist" in caplog.text

    # Existing directory
    caplog.clear()
    dir_path = tmp_path / "exists"
    dir_path.mkdir()
    assert validate_scan_directory(dir_path, logger)
    assert caplog.text == ""


def test_get_part_files(tmp_path: Path) -> None:
    # Create some .part files
    f1 = tmp_path / "video1.mp4.part"
    f1.write_text("")
    sub = tmp_path / "subdir"
    sub.mkdir()
    f2 = sub / "video2.mkv.part"
    f2.write_text("")

    parts = get_part_files(tmp_path)
    assert set(parts) == {f1, f2}

    # Create additional partial file types
    f3 = tmp_path / "video3.mp4.ytdl"
    f4 = tmp_path / "video4.mkv.download"
    f3.write_text("")
    f4.write_text("")
    # Create nested directory with download file
    nested = tmp_path / "nested"
    nested.mkdir()
    f5 = nested / "video5.flv.part"
    f5.write_text("")
    all_parts = set(get_part_files(tmp_path))
    expected = {f1, f2, f3, f4, f5}
    assert all_parts == expected


def test_derive_resume_url_primary_info(tmp_path: Path, caplog: Any) -> None:
    # Primary info JSON candidate
    part_file = tmp_path / "movie.mp4.part"
    part_file.write_text("")
    info_file = tmp_path / "movie.mp4.info.json"
    data = {"webpage_url": "https://example.com/movie"}
    info_file.write_text(json.dumps(data))

    caplog.set_level(logging.DEBUG)
    logger = logging.getLogger("test")
    url = derive_resume_url(part_file, logger)
    assert url == data["webpage_url"]
    assert f"Found URL '{url}' in" in caplog.text


def test_derive_resume_url_fallback_info(tmp_path: Path, caplog: Any) -> None:
    # Only fallback JSON candidate
    part_file = tmp_path / "clip.mov.part"
    part_file.write_text("")
    fallback = tmp_path / "clip.info.json"
    data = {"webpage_url": "https://fallback.example/clip"}
    fallback.write_text(json.dumps(data))

    caplog.set_level(logging.DEBUG)
    logger = logging.getLogger("test")
    url = derive_resume_url(part_file, logger)
    assert url == data["webpage_url"]
    assert "Found URL" in caplog.text


def test_derive_resume_url_no_info(tmp_path: Path, caplog: Any) -> None:
    # No info file present
    part_file = tmp_path / "none.part"
    part_file.write_text("")

    caplog.set_level(logging.WARNING)
    logger = logging.getLogger("test")
    url = derive_resume_url(part_file, logger)
    assert url is None
    assert "No .info.json found" in caplog.text


def test_derive_resume_url_malformed_json(tmp_path: Path, caplog: Any) -> None:
    # Info file is not valid JSON
    part_file = tmp_path / "bad.part"
    part_file.write_text("")
    info_file = tmp_path / "bad.info.json"
    info_file.write_text("{not:valid}")

    caplog.set_level(logging.WARNING)
    logger = logging.getLogger("test")
    url = derive_resume_url(part_file, logger)
    assert url is None
    assert "Failed to parse" in caplog.text
