import json
import logging
from pathlib import Path
from typing import Any

import pytest
from pytest import LogCaptureFixture, MonkeyPatch

import server.cli_helpers as ch
from server.cli_helpers import Config, _derive_resume_url, resume_incomplete_downloads


class DummyConfig:
    """Dummy config object to satisfy Config.load() in resume_incomplete_downloads."""


@pytest.fixture(autouse=True)
def patch_config(monkeypatch: MonkeyPatch) -> None:
    """
    Patch Config.load to return DummyConfig.

    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    # Patch Config.load to return DummyConfig
    monkeypatch.setattr(Config, "load", classmethod(lambda cls: DummyConfig()))


@pytest.fixture(autouse=True)
def silence_helper_logs(caplog: LogCaptureFixture) -> LogCaptureFixture:
    """
    Set log level to INFO to reduce noise.

    :param caplog: pytest LogCaptureFixture for capturing log messages.
    :returns: LogCaptureFixture instance.
    """
    caplog.set_level(logging.INFO)
    return caplog


def test_resume_incomplete_no_files(tmp_path: Path, caplog: LogCaptureFixture, monkeypatch: MonkeyPatch) -> None:
    """
    Test that when no incomplete files exist, function exits quietly.

    :param tmp_path: temporary directory fixture.
    :param caplog: pytest LogCaptureFixture for capturing log messages.
    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    # When no incomplete files, function should exit quietly
    monkeypatch.setattr(ch, "_determine_scan_target", lambda download_dir, scan_override: tmp_path)
    monkeypatch.setattr(ch, "_filter_incomplete_files", lambda scan_target, log: [])

    resume_incomplete_downloads(tmp_path, None, logger=logging.getLogger("test"))
    # Should not log 'Found'
    assert "Found" not in caplog.text


def test_resume_incomplete_with_files(tmp_path: Path, caplog: LogCaptureFixture, monkeypatch: MonkeyPatch) -> None:
    """
    Test resume functionality with incomplete files.

    :param tmp_path: temporary directory fixture.
    :param caplog: pytest LogCaptureFixture for capturing log messages.
    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    # Simulate one partial file
    part_file = tmp_path / "video.mp4.part"
    part_file.write_text("data")  # Non-empty file to pass integrity check
    files = [part_file]

    monkeypatch.setattr(ch, "_determine_scan_target", lambda download_dir, scan_override: tmp_path)
    monkeypatch.setattr(ch, "_filter_incomplete_files", lambda scan_target, log: files)

    called: dict[str, Any] = {}

    def fake_process_batch(
        batch_arg: Any, download_dir_arg: Any, logger_arg: Any, priority_arg: Any, verify_integrity_arg: Any
    ) -> dict[str, Any]:
        called["batch"] = batch_arg
        return {"resumed": 1, "errors": 0, "non_resumable": []}

    monkeypatch.setattr(ch, "_process_incomplete_batch", fake_process_batch)
    monkeypatch.setattr(
        ch,
        "_report_incomplete_summary",
        lambda resumed, errors, non_resumable, log: called.setdefault("summary", (resumed, errors, non_resumable)),
    )

    logger = logging.getLogger("test_resume")
    caplog.clear()
    resume_incomplete_downloads(tmp_path, None, logger=logger)

    # Should log finding and processing messages
    assert "Found 1 incomplete downloads to resume" in caplog.text
    # Summary should be recorded
    assert called["batch"] == files
    assert called["summary"] == (1, 0, [])


def test_derive_resume_url_alias(tmp_path: Path, caplog: LogCaptureFixture) -> None:
    """
    Test that _derive_resume_url alias works as derive_resume_url.

    :param tmp_path: temporary directory fixture.
    :param caplog: pytest LogCaptureFixture for capturing log messages.
    :returns: None
    """
    # Test that _derive_resume_url alias works as derive_resume_url
    part_file = tmp_path / "testvideo.mp4.part"
    part_file.write_text("")
    info_file = tmp_path / "testvideo.mp4.info.json"
    data = {"webpage_url": "https://example.com/testvideo"}
    info_file.write_text(json.dumps(data))

    logger = logging.getLogger("test_alias")
    caplog.set_level(logging.DEBUG)
    url = _derive_resume_url(part_file, logger)
    assert url == data["webpage_url"]
    assert "Found URL" in caplog.text
