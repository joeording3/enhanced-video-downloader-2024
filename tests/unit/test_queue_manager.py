import json
import threading
import time
from pathlib import Path

import pytest

from server.downloads.ytdlp import download_process_registry
from server.queue import DownloadQueueManager


@pytest.fixture(autouse=True)
def clear_registry() -> None:
    download_process_registry.clear()
    yield
    download_process_registry.clear()


@pytest.fixture
def manager(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> DownloadQueueManager:
    mgr = DownloadQueueManager()

    # Redirect persistence to a temp file to avoid touching real repo files
    queue_file = tmp_path / "queue.json"

    def _fake_path(self: DownloadQueueManager) -> Path:  # type: ignore[override]
        return queue_file

    monkeypatch.setattr(DownloadQueueManager, "_get_queue_file_path", _fake_path, raising=True)
    return mgr


def read_persisted(path: Path) -> list[dict]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def test_enqueue_and_list_persists(manager: DownloadQueueManager) -> None:
    item = {"downloadId": "a1", "url": "http://example.com/a"}
    manager.enqueue(item)

    listed = manager.list()
    assert len(listed) == 1
    assert listed[0]["downloadId"] == "a1"

    persisted = read_persisted(manager._get_queue_file_path())
    assert persisted and persisted[0]["downloadId"] == "a1"


def test_remove_accepts_legacy_key(manager: DownloadQueueManager) -> None:
    manager.enqueue({"download_id": "legacy", "url": "u"})
    assert manager.remove("legacy") is True
    assert manager.list() == []

    persisted = read_persisted(manager._get_queue_file_path())
    assert persisted == []


def test_reorder_and_unknown_ids_preserved(manager: DownloadQueueManager) -> None:
    a = {"downloadId": "A", "url": "u1"}
    b = {"downloadId": "B", "url": "u2"}
    c = {"downloadId": "C", "url": "u3"}
    manager.enqueue(a)
    manager.enqueue(b)
    manager.enqueue(c)

    manager.reorder(["C", "A"])  # B not mentioned -> appended
    order = [it["downloadId"] for it in manager.list()]
    assert order == ["C", "A", "B"]


def test_clear_empties_queue_and_disk(manager: DownloadQueueManager) -> None:
    manager.enqueue({"downloadId": "1", "url": "u"})
    manager.enqueue({"downloadId": "2", "url": "u"})
    manager.clear()
    assert manager.list() == []
    assert read_persisted(manager._get_queue_file_path()) == []


def test_force_start_respects_capacity_when_not_overridden(
    manager: DownloadQueueManager, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Fill registry to capacity 2
    download_process_registry["x1"] = object()  # type: ignore[assignment]
    download_process_registry["x2"] = object()  # type: ignore[assignment]

    class DummyCfg:
        def get_value(self, key: str, default: int) -> int:
            assert key == "max_concurrent_downloads"
            return 2

    class DummyLoader:
        @staticmethod
        def load() -> DummyCfg:  # type: ignore[return-type]
            return DummyCfg()

    # Patch Config.load used inside queue module
    from server import config as config_module

    monkeypatch.setattr(config_module.Config, "load", DummyLoader.load, raising=True)

    manager.enqueue({"downloadId": "startme", "url": "u"})
    assert manager.force_start("startme", override_capacity=False) is True

    # Item should be placed back at the front since capacity is full
    assert [it["downloadId"] for it in manager.list()] == ["startme"]


def test_force_start_launches_thread_when_overridden(
    manager: DownloadQueueManager, monkeypatch: pytest.MonkeyPatch
) -> None:
    launched = threading.Event()

    def fake_run(task: dict) -> None:
        if task.get("downloadId") == "go":
            launched.set()

    monkeypatch.setattr(DownloadQueueManager, "_run_download_task", staticmethod(fake_run), raising=True)

    manager.enqueue({"downloadId": "go", "url": "u"})
    assert manager.force_start("go", override_capacity=True) is True

    assert launched.wait(timeout=2.0)
    assert manager.list() == []


def test_worker_loop_schedules_when_capacity_available(
    manager: DownloadQueueManager, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Ensure capacity is high and registry empty
    class DummyCfg:
        def get_value(self, key: str, default: int) -> int:
            return 3

    class DummyLoader:
        @staticmethod
        def load() -> DummyCfg:  # type: ignore[return-type]
            return DummyCfg()

    from server import config as config_module

    monkeypatch.setattr(config_module.Config, "load", DummyLoader.load, raising=True)

    calls: list[str] = []
    done1 = threading.Event()
    done2 = threading.Event()

    def fake_run(task: dict) -> None:
        calls.append(task["downloadId"])  # type: ignore[arg-type]
        if task["downloadId"] == "t1":
            done1.set()
        if task["downloadId"] == "t2":
            done2.set()

    monkeypatch.setattr(DownloadQueueManager, "_run_download_task", staticmethod(fake_run), raising=True)

    # Start worker and enqueue tasks
    manager.start()
    manager.enqueue({"downloadId": "t1", "url": "u"})
    manager.enqueue({"downloadId": "t2", "url": "u"})

    assert done1.wait(timeout=3.0)
    assert done2.wait(timeout=3.0)
    # Allow worker loop to persist removal
    time.sleep(0.05)
    assert manager.list() == []

    # Stop worker to clean up
    manager.stop()
