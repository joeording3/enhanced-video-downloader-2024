import json
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


def test_run_download_task_without_app_context(monkeypatch: pytest.MonkeyPatch) -> None:
    # Ensure else-branch (no app_context) is executed
    import server.queue as qmod

    called = {"n": 0}

    def fake_handle(task: dict) -> None:
        called["n"] += 1

    class DummyApp:
        pass  # no app_context attribute

    monkeypatch.setattr(qmod, "current_app", DummyApp(), raising=False)
    monkeypatch.setattr(qmod, "handle_ytdlp_download", fake_handle, raising=True)

    DownloadQueueManager._run_download_task({"downloadId": "x", "url": "u"})
    assert called["n"] == 1


def test_load_queue_from_disk_normalizes_and_persists(manager: DownloadQueueManager) -> None:
    # Seed disk with mixed keys, then start manager to load
    qpath = manager._get_queue_file_path()  # type: ignore[attr-defined]
    qpath.parent.mkdir(parents=True, exist_ok=True)
    payload = [{"download_id": "legacy", "url": "u1"}, {"downloadId": "new", "url": "u2"}]
    qpath.write_text(json.dumps(payload))

    manager.start()
    manager.stop()

    items = manager.list()
    ids = [it.get("downloadId") for it in items]
    assert ids == ["legacy", "new"]


def test_clear_persists_empty_file(manager: DownloadQueueManager) -> None:
    manager.enqueue({"downloadId": "c1", "url": "u"})
    manager.clear()
    # After clear, disk JSON should be an empty list
    data = json.loads(manager._get_queue_file_path().read_text())  # type: ignore[attr-defined]
    assert data == []

