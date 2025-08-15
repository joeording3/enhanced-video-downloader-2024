import contextlib
import threading
import time
from pathlib import Path

import pytest

from server.queue import DownloadQueueManager


def _setup_manager(tmp_path: Path, monkeypatch: pytest.MonkeyPatch, max_concurrent: int = 1) -> DownloadQueueManager:
    mgr = DownloadQueueManager()

    queue_file = tmp_path / "queue.json"

    def _fake_qpath(self: DownloadQueueManager) -> Path:  # type: ignore[override]
        return queue_file

    monkeypatch.setattr(DownloadQueueManager, "_get_queue_file_path", _fake_qpath, raising=True)

    class DummyCfg:
        def get_value(self, key: str, default: int) -> int:
            if key == "max_concurrent_downloads":
                return max_concurrent
            return default

    from server import queue as queue_module

    monkeypatch.setattr(queue_module.Config, "load", staticmethod(lambda: DummyCfg()), raising=True)

    class _DummyApp:
        def app_context(self):
            return contextlib.nullcontext()

    monkeypatch.setattr(queue_module, "current_app", _DummyApp(), raising=False)

    return mgr


def test_force_start_respects_capacity_and_later_runs(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    mgr = _setup_manager(tmp_path, monkeypatch, max_concurrent=1)

    # Occupy capacity with a dummy process
    import server.downloads.ytdlp as ymod
    import server.queue as qmod

    ymod.download_process_registry["busy"] = object()  # type: ignore[assignment]

    ran = threading.Event()

    def fake_handle(data: dict) -> None:
        if data.get("downloadId") == "cap1":
            ran.set()

    monkeypatch.setattr(ymod, "handle_ytdlp_download", fake_handle, raising=True)
    monkeypatch.setattr(qmod, "handle_ytdlp_download", fake_handle, raising=True)

    mgr.start()
    mgr.enqueue({"downloadId": "cap1", "url": "http://x/1"})

    # Attempt to force start without override; should requeue and not run yet
    assert mgr.force_start("cap1", override_capacity=False) is True

    # Give worker a moment; it should not have started due to capacity full
    time.sleep(0.1)
    assert not ran.is_set()

    # Free capacity and wait for worker to pick it up
    del ymod.download_process_registry["busy"]
    assert ran.wait(timeout=3.0)

    mgr.stop()
