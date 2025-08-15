import contextlib
import threading
from pathlib import Path

import pytest

from server.history import load_history
from server.queue import DownloadQueueManager


@pytest.fixture
def isolated_history(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    # Redirect history writes to a temp file
    hist = tmp_path / "history.json"
    monkeypatch.setattr("server.history.HISTORY_PATH", hist, raising=False)
    return hist


@pytest.fixture
def manager(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> DownloadQueueManager:
    mgr = DownloadQueueManager()

    # Redirect queue persistence to temp path
    queue_file = tmp_path / "queue.json"

    def _fake_qpath(self: DownloadQueueManager) -> Path:  # type: ignore[override]
        return queue_file

    monkeypatch.setattr(DownloadQueueManager, "_get_queue_file_path", _fake_qpath, raising=True)

    # Provide a simple Config.load for capacity lookups inside the worker
    class DummyCfg:
        def get_value(self, key: str, default: int) -> int:
            return 3

    from server import queue as queue_module

    monkeypatch.setattr(queue_module.Config, "load", staticmethod(lambda: DummyCfg()), raising=True)

    # Provide a dummy current_app with a no-op app_context
    class _DummyApp:
        def app_context(self):
            return contextlib.nullcontext()

    monkeypatch.setattr(queue_module, "current_app", _DummyApp(), raising=False)

    return mgr


def test_queue_to_download_to_history_happy_path(
    manager: DownloadQueueManager, isolated_history: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Signal when our stubbed download handler runs
    ran = threading.Event()

    # Stub download handler to append a minimal history entry and signal completion
    def fake_handle(data: dict) -> None:
        from server.history import append_history_entry

        append_history_entry(
            {
                "download_id": data.get("downloadId"),
                "url": data.get("url"),
                "status": "complete",
            }
        )
        ran.set()

    # Wire stub into queue's download runner path
    import server.downloads.ytdlp as ymod
    import server.queue as qmod

    monkeypatch.setattr(ymod, "handle_ytdlp_download", fake_handle, raising=True)
    monkeypatch.setattr(qmod, "handle_ytdlp_download", fake_handle, raising=True)

    # Start worker and enqueue an item
    manager.start()
    item = {"downloadId": "pipe1", "url": "https://example.com/v"}
    manager.enqueue(item)

    # Wait for handler invocation
    assert ran.wait(timeout=3.0)

    # Ensure history received the entry
    entries = load_history()
    assert any(e.get("download_id") == "pipe1" for e in entries)

    # Cleanup
    manager.stop()


def test_queue_pipeline_multiple_items(
    manager: DownloadQueueManager, isolated_history: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Track completed ids
    done: set[str] = set()
    done_evt = threading.Event()

    def fake_handle(data: dict) -> None:
        from server.history import append_history_entry

        did = str(data.get("downloadId"))
        append_history_entry({"download_id": did, "url": data.get("url"), "status": "complete"})
        done.add(did)
        if len(done) >= 3:
            done_evt.set()

    import server.downloads.ytdlp as ymod
    import server.queue as qmod

    monkeypatch.setattr(ymod, "handle_ytdlp_download", fake_handle, raising=True)
    monkeypatch.setattr(qmod, "handle_ytdlp_download", fake_handle, raising=True)

    manager.start()
    for idx in range(3):
        manager.enqueue({"downloadId": f"id{idx}", "url": f"https://example.com/{idx}"})

    assert done_evt.wait(timeout=5.0)
    hist = load_history()
    got = {e.get("download_id") for e in hist}
    assert {"id0", "id1", "id2"}.issubset(got)
    manager.stop()

