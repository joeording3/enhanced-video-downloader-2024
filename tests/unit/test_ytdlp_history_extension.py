import json
import os
from pathlib import Path
from typing import Any

from pytest import MonkeyPatch

from server.downloads.ytdlp import _progress_finished


def test_progress_finished_appends_history(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """
    Test that _progress_finished reads the .info.json file and appends history entry.

    :param tmp_path: temporary directory fixture.
    :param monkeypatch: MonkeyPatch fixture for stubbing history append.
    :returns: None
    """
    # Prepare dummy filename and corresponding info.json
    filename = tmp_path / "video123.mp4"
    info_json_path = tmp_path / "video123.mp4.info.json"
    info_data: dict[str, str] = {"id": "test-id", "url": "https://example.com"}

    # Ensure directory exists
    os.makedirs(tmp_path, exist_ok=True)
    with open(info_json_path, "w", encoding="utf-8") as f:
        json.dump(info_data, f)

    # Monkeypatch append_history_entry to capture call
    called = {}

    def fake_append_history(entry: Any) -> None:
        """
        Fake append_history_entry stub to capture history entry.

        :param entry: history entry dictionary.
        :returns: None
        """
        called["entry"] = entry

    monkeypatch.setattr("server.downloads.ytdlp.append_history_entry", fake_append_history)

    # Invoke the function
    _progress_finished({"filename": str(filename)}, download_id="download-id-123")

    # Verify that append_history_entry was called with correct data
    assert "entry" in called
    assert called["entry"] == info_data
    assert called["entry"] == info_data
