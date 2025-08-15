import threading
from pathlib import Path

import pytest

from server.queue import DownloadQueueManager


@pytest.fixture
def manager(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> DownloadQueueManager:
    mgr = DownloadQueueManager()

    queue_file = tmp_path / "queue.json"

    def _fake_path(self: DownloadQueueManager) -> Path:  # type: ignore[override]
        return queue_file

    monkeypatch.setattr(DownloadQueueManager, "_get_queue_file_path", _fake_path, raising=True)
    return mgr


def test_persist_queue_errors_are_suppressed(manager: DownloadQueueManager, monkeypatch: pytest.MonkeyPatch) -> None:
    # Force file operations to fail to exercise exception path in _persist_queue_unlocked
    calls = {"n": 0}

    def fake_mkdir(*args, **kwargs):
        calls["n"] += 1
        raise OSError("boom")

    # Mock the mkdir operation to fail
    monkeypatch.setattr(Path, "mkdir", fake_mkdir)

    # Enqueue should not raise even if persistence fails
    manager.enqueue({"downloadId": "e1", "url": "u"})
    # Ensure item is in memory queue
    assert any(it.get("downloadId") == "e1" for it in manager.list())
    assert calls["n"] >= 1


def test_load_queue_handles_corrupt_json(manager: DownloadQueueManager, tmp_path: Path) -> None:
    # Write corrupt JSON and start manager; it should not raise and queue remains empty
    queue_file = manager._get_queue_file_path()  # type: ignore[attr-defined]
    queue_file.write_text("{ not: json ")
    manager.start()
    # Give worker a tick and stop immediately
    manager.stop()
    assert manager.list() == []


def test_remove_not_found_returns_false(manager: DownloadQueueManager) -> None:
    assert manager.remove("nope") is False


def test_reorder_unknown_ids_no_crash_and_preserve(manager: DownloadQueueManager) -> None:
    manager.enqueue({"downloadId": "A", "url": "u"})
    manager.reorder(["X", "Y"])  # unknown ids
    ids = [it["downloadId"] for it in manager.list()]
    assert ids == ["A"]


def test_start_idempotent_and_worker_waits(manager: DownloadQueueManager, monkeypatch: pytest.MonkeyPatch) -> None:
    # Start twice should be fine
    manager.start()
    manager.start()

    # Enqueue one item and patch run to set event
    ran = threading.Event()

    def fake_run(task: dict) -> None:
        ran.set()

    monkeypatch.setattr(DownloadQueueManager, "_run_download_task", staticmethod(fake_run), raising=True)
    manager.enqueue({"downloadId": "w1", "url": "u"})
    assert ran.wait(timeout=2.0)
    manager.stop()
