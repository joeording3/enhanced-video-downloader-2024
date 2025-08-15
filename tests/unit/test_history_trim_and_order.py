from pathlib import Path

import pytest

from server import utils
from server.history import append_history_entry, load_history


@pytest.fixture
def isolated_history(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    hist = tmp_path / "history.json"
    monkeypatch.setattr("server.history.HISTORY_PATH", hist, raising=False)
    return hist


def test_append_trim_and_order(isolated_history: Path) -> None:
    # Insert 105 entries; history should keep only 100 most recent
    for i in range(105):
        append_history_entry({"downloadId": f"d{i}", "url": f"u{i}"})

    # Bust cache so load_history reads latest file contents
    utils.clear_cache()
    hist = load_history()
    assert len(hist) == 100
    # Most recent first
    assert hist[0]["downloadId"] == "d104"
    assert hist[-1]["downloadId"] == "d5"
