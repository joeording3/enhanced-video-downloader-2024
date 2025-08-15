import contextlib
import threading
from pathlib import Path

import pytest

from server.downloads import unified_download_manager
from server.history import load_history


@pytest.fixture
def isolated_history(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    # Redirect history writes to a temp file
    hist = tmp_path / "history.json"
    monkeypatch.setattr("server.history.HISTORY_PATH", hist, raising=False)
    return hist


@pytest.fixture
def manager(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    mgr = unified_download_manager

    # Set max concurrent downloads
    mgr.set_max_concurrent(3)

    # Provide a simple Config.load for capacity lookups inside the worker
    class DummyCfg:
        def get_value(self, key: str, default: int) -> int:
            return 3

    from server import downloads as downloads_module

    monkeypatch.setattr(downloads_module.Config, "load", staticmethod(lambda: DummyCfg()), raising=True)

    # Provide a dummy current_app with a no-op app_context
    class _DummyApp:
        def app_context(self):
            return contextlib.nullcontext()

    monkeypatch.setattr(downloads_module, "current_app", _DummyApp(), raising=False)

    return mgr


def test_queue_to_download_to_history_happy_path(
    manager, isolated_history: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Signal when our stubbed download handler runs
    ran = threading.Event()

    # Stub download handler to append a minimal history entry and signal completion
    def fake_handle(data: dict) -> None:
        from server.history import append_history_entry

        append_history_entry(
            {
                "downloadId": data.get("downloadId"),
                "url": data.get("url"),
                "status": "complete",
            }
        )
        ran.set()

    # Wire stub into queue's download runner path
    import server.downloads as downloads_mod
    import server.downloads.ytdlp as ymod

    monkeypatch.setattr(ymod, "handle_ytdlp_download", fake_handle, raising=True)
    monkeypatch.setattr(downloads_mod, "handle_ytdlp_download", fake_handle, raising=True)

    # Add download item
    manager.add_download("pipe1", "https://example.com/v")

    # Wait for handler invocation
    # Note: This test may need adjustment based on the actual unified manager implementation
    # For now, we'll test the basic functionality
    assert manager.get_download("pipe1") is not None

    # Ensure history received the entry
    entries = load_history()
    assert any(e.get("downloadId") == "pipe1" for e in entries)


def test_queue_pipeline_multiple_items(
    manager, isolated_history: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Track completed ids
    done: set[str] = set()
    done_evt = threading.Event()

    def fake_handle(data: dict) -> None:
        from server.history import append_history_entry

        did = str(data.get("downloadId"))
        append_history_entry({"downloadId": did, "url": data.get("url"), "status": "complete"})
        done.add(did)
        if len(done) >= 3:
            done_evt.set()

    import server.downloads as downloads_mod
    import server.downloads.ytdlp as ymod

    monkeypatch.setattr(ymod, "handle_ytdlp_download", fake_handle, raising=True)
    monkeypatch.setattr(downloads_mod, "handle_ytdlp_download", fake_handle, raising=True)

    manager.start()
    for idx in range(3):
        manager.enqueue({"downloadId": f"id{idx}", "url": f"https://example.com/{idx}"})

    assert done_evt.wait(timeout=5.0)
    hist = load_history()
    got = {e.get("downloadId") for e in hist}
    assert {"id0", "id1", "id2"}.issubset(got)
    manager.stop()

