from typing import Any

import pytest

from server.downloads.resume import find_downloads_to_resume

pytestmark = pytest.mark.unit


def test_find_downloads_to_resume_filters_failed(monkeypatch: Any) -> None:
    """Should return only entries with status 'failed'."""
    history = [
        {"id": 1, "url": "http://a", "status": "failed"},
        {"id": 2, "url": "http://b", "status": "success"},
        {"id": 3, "url": "http://c", "status": "failed"},
    ]
    # Monkeypatch load_history in the module where it's imported
    monkeypatch.setattr("server.downloads.resume.load_history", lambda: history)
    result = find_downloads_to_resume()
    assert result == [history[0], history[2]]


def test_find_downloads_to_resume_handles_error(monkeypatch: Any, caplog: Any) -> None:
    """Should return empty list and log error when load_history fails."""

    # Monkeypatch load_history to raise exception
    def bad_load() -> None:
        raise Exception("fail to load")

    monkeypatch.setattr("server.downloads.resume.load_history", bad_load)
    caplog.set_level("ERROR")
    result = find_downloads_to_resume()
    assert result == []
    # Verify error log was recorded
    assert any("Error retrieving download history" in rec.message for rec in caplog.records)
