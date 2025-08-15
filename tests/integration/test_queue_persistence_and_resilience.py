import contextlib
import threading
from pathlib import Path

import pytest

from server.queue import DownloadQueueManager


def _setup_manager(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> DownloadQueueManager:
    mgr = DownloadQueueManager()

    queue_file = tmp_path / "queue.json"

    def _fake_qpath(self: DownloadQueueManager) -> Path:  # type: ignore[override]
        return queue_file

    monkeypatch.setattr(DownloadQueueManager, "_get_queue_file_path", _fake_qpath, raising=True)

    class DummyCfg:
        def get_value(self, key: str, default: int) -> int:
            return 3

    from server import queue as queue_module

    monkeypatch.setattr(queue_module.Config, "load", staticmethod(lambda: DummyCfg()), raising=True)

    class _DummyApp:
        def app_context(self):
            return contextlib.nullcontext()

    monkeypatch.setattr(queue_module, "current_app", _DummyApp(), raising=False)

    return mgr


def test_queue_persistence_reload_starts_items(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    # First manager enqueues and persists without starting worker
    mgr1 = _setup_manager(tmp_path, monkeypatch)
    mgr1.enqueue({"downloadId": "persist1", "url": "http://x/1"})

    # Second manager should load and run the persisted task
    mgr2 = _setup_manager(tmp_path, monkeypatch)

    fired = threading.Event()

    def fake_handle(data: dict) -> None:
        if data.get("downloadId") == "persist1":
            fired.set()

    import server.downloads.ytdlp as ymod
    import server.queue as qmod

    monkeypatch.setattr(ymod, "handle_ytdlp_download", fake_handle, raising=True)
    monkeypatch.setattr(qmod, "handle_ytdlp_download", fake_handle, raising=True)

    mgr2.start()
    assert fired.wait(timeout=3.0)
    mgr2.stop()


def test_worker_resilient_on_handler_error(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    mgr = _setup_manager(tmp_path, monkeypatch)

    calls = {"count": 0}
    done = threading.Event()

    def flaky_handle(data: dict) -> None:
        calls["count"] += 1
        # First item raises, second succeeds
        if calls["count"] == 1:
            raise RuntimeError("boom")
        if data.get("downloadId") == "ok2":
            done.set()

    import server.downloads.ytdlp as ymod
    import server.queue as qmod

    monkeypatch.setattr(ymod, "handle_ytdlp_download", flaky_handle, raising=True)
    monkeypatch.setattr(qmod, "handle_ytdlp_download", flaky_handle, raising=True)

    mgr.start()
    mgr.enqueue({"downloadId": "err1", "url": "http://x/err"})
    mgr.enqueue({"downloadId": "ok2", "url": "http://x/ok"})

    assert done.wait(timeout=4.0)
    # Queue should be empty after processing
    assert mgr.list() == []
    mgr.stop()
