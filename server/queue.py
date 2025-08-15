"""Server-side download queue management.

This module provides a thread-safe queue for pending downloads and a background
worker that starts queued downloads when capacity is available, respecting the
`max_concurrent_downloads` value from the server configuration.
"""

from __future__ import annotations

import contextlib
import json
import threading
from collections import deque
from pathlib import Path
from typing import Any

from flask import current_app

from .config import Config
from .downloads.ytdlp import download_process_registry, handle_ytdlp_download


class DownloadQueueManager:
    """Manage a FIFO queue and worker that launches downloads when possible."""

    def __init__(self) -> None:
        """Initialize internal queue, locks, and worker state."""
        self._queue: deque[dict[str, Any]] = deque()
        self._lock = threading.Lock()
        self._notifier = threading.Condition(self._lock)
        self._worker_thread: threading.Thread | None = None
        self._stop_event = threading.Event()

    def start(self) -> None:
        """Start the background worker if not already running."""
        with self._lock:
            if self._worker_thread and self._worker_thread.is_alive():
                return
            self._stop_event.clear()
            # Reload any persisted queued items from disk on startup
            with contextlib.suppress(Exception):
                self._load_queue_from_disk_unlocked()
            self._worker_thread = threading.Thread(target=self._worker_loop, name="evd-queue-worker", daemon=True)
            self._worker_thread.start()

    def stop(self) -> None:
        """Stop the background worker."""
        self._stop_event.set()
        with self._notifier:
            self._notifier.notify_all()

    # Queue operations
    def enqueue(self, item: dict[str, Any]) -> None:
        """Add a request to the queue and notify the worker."""
        with self._notifier:
            self._queue.append(item)
            # Persist updated queue to disk
            self._persist_queue_unlocked()
            self._notifier.notify_all()

    def remove(self, download_id: str) -> bool:
        """Remove the first queued item matching the given download ID."""
        with self._notifier:
            for i, it in enumerate(self._queue):
                # Normalize legacy key once on access
                if "download_id" in it and "downloadId" not in it:
                    it["downloadId"] = str(it.get("download_id"))
                    with contextlib.suppress(Exception):
                        del it["download_id"]
                it_id = str(it.get("downloadId"))
                if it_id == str(download_id):
                    del self._queue[i]
                    self._persist_queue_unlocked()
                    self._notifier.notify_all()
                    return True
            return False

    def reorder(self, new_order: list[str]) -> None:
        """Reorder queue to match the given list of IDs; unknown IDs are ignored."""
        with self._notifier:
            id_to_item = {}
            for it in self._queue:
                if "download_id" in it and "downloadId" not in it:
                    it["downloadId"] = str(it.get("download_id"))
                    with contextlib.suppress(Exception):
                        del it["download_id"]
                id_to_item[str(it.get("downloadId"))] = it
            reordered: deque[dict[str, Any]] = deque()
            for did in new_order:
                it = id_to_item.pop(str(did), None)
                if it is not None:
                    reordered.append(it)
            # Append any remaining items that were not specified
            for it in self._queue:
                did = str(it.get("downloadId"))
                if did in id_to_item:
                    reordered.append(it)
                    id_to_item.pop(did, None)
            self._queue = reordered
            self._persist_queue_unlocked()
            self._notifier.notify_all()

    def list(self) -> list[dict[str, Any]]:
        """Return a shallow copy of queued items for status reporting."""
        with self._lock:
            # Ensure camelCase in responses
            normalized: list[dict[str, Any]] = []
            for it in self._queue:
                if "download_id" in it and "downloadId" not in it:
                    it["downloadId"] = str(it.get("download_id"))
                    with contextlib.suppress(Exception):
                        del it["download_id"]
                normalized.append(dict(it))
            return normalized

    def clear(self) -> None:
        """Clear all queued items and persist an empty queue.

        This does not affect any already active downloads.
        """
        with self._notifier:
            self._queue.clear()
            self._persist_queue_unlocked()
            self._notifier.notify_all()

    def force_start(self, download_id: str, override_capacity: bool = True) -> bool:
        """Force start a specific queued item by ID.

        If ``override_capacity`` is True, the item starts immediately in its own thread
        regardless of current capacity. Otherwise, it will only start if a slot is free.

        Returns True if the item was found and action was taken; False if not found.
        """
        with self._notifier:
            # Find the item in the queue
            idx = None
            for i, it in enumerate(self._queue):
                it_id = str(it.get("downloadId") or it.get("download_id"))
                if it_id == str(download_id):
                    idx = i
                    break
            if idx is None:
                return False
            # Remove from queue and persist
            task = self._queue[idx]
            del self._queue[idx]
            self._persist_queue_unlocked()

            # Capacity check unless overriding
            if not override_capacity:
                try:
                    cfg = Config.load()
                    max_concurrent = int(cfg.get_value("max_concurrent_downloads", 3))
                except Exception:
                    max_concurrent = 3
                if len(download_process_registry) >= max_concurrent:
                    # Put task to front and notify; cannot start now
                    self._queue.appendleft(task)
                    self._notifier.notify_all()
                    self._persist_queue_unlocked()
                    return True

            # Start immediately in its own thread
            t = threading.Thread(
                target=self._run_download_task,
                args=(task,),
                name=("evd-task-" + str(task.get("downloadId") or "unknown")),
                daemon=True,
            )
            t.start()
            # Notify any waiters
            self._notifier.notify_all()
            return True

    # Internal worker
    def _worker_loop(self) -> None:
        """Schedule queued downloads when capacity allows."""
        # Run until stop event is set
        while not self._stop_event.is_set():
            with contextlib.suppress(Exception):
                # Determine capacity
                max_concurrent = 3
                try:
                    cfg = Config.load()
                    max_concurrent = int(cfg.get_value("max_concurrent_downloads", 3))
                except Exception:
                    max_concurrent = 3

                # Launch as many as we can
                launched_any = False
                with self._notifier:
                    while (
                        not self._stop_event.is_set()
                        and len(self._queue) > 0
                        and len(download_process_registry) < max_concurrent
                    ):
                        task = self._queue.popleft()
                        # Persist removal so disk state reflects items that are now launching
                        with contextlib.suppress(Exception):
                            self._persist_queue_unlocked()
                        # Run the download in its own thread so we can continue scheduling
                        t = threading.Thread(
                            target=self._run_download_task,
                            args=(task,),
                            name=("evd-task-" + str(task.get("downloadId") or "unknown")),
                            daemon=True,
                        )
                        t.start()
                        launched_any = True

                if not launched_any:
                    # Wait for a short period or until notified (enqueue/remove/reorder)
                    with self._notifier:
                        self._notifier.wait(timeout=1.0)
            # If an exception occurred above, it was suppressed; loop continues

    @staticmethod
    def _run_download_task(task: dict[str, Any]) -> None:
        """Execute a queued download using the existing handler."""
        # Ensure there's an app context if required by downstream code
        # Use a duck-typed check for an app_context callable to avoid type suppressions
        app_context_func = getattr(current_app, "app_context", None)
        if callable(app_context_func):
            try:
                with app_context_func():  # pyright: ignore[reportGeneralTypeIssues]
                    handle_ytdlp_download(task)
            except Exception:
                # Swallow exceptions; errors are logged by the handler
                pass
        else:
            import contextlib

            with contextlib.suppress(Exception):
                handle_ytdlp_download(task)

    # -----------------------------
    # Persistence helpers (private)
    # -----------------------------
    def _get_queue_file_path(self) -> Path:
        """Return the path to the queue persistence JSON file under server/data."""
        # server/queue.py -> server/data/queue.json
        base_dir = Path(__file__).resolve().parent
        data_dir = base_dir / "data"
        return data_dir / "queue.json"

    def _persist_queue_unlocked(self) -> None:
        """Persist the current queue to disk as JSON.

        Must be called with the manager lock held.
        """
        path = self._get_queue_file_path()
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            # Write atomically: temp file then replace
            tmp_path = Path(str(path) + ".tmp")
            serialized = [dict(it) for it in self._queue]
            with tmp_path.open("w", encoding="utf-8") as f:
                json.dump(serialized, f, ensure_ascii=False, indent=2)
            tmp_path.replace(path)
        except Exception:
            # Best-effort only; do not raise
            pass

    def _load_queue_from_disk_unlocked(self) -> None:
        """Load queued items from disk if the JSON file exists.

        Must be called with the manager lock held.
        """
        path = self._get_queue_file_path()
        try:
            if not path.exists():
                return
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
            if isinstance(data, list):
                restored: deque[dict[str, Any]] = deque()
                for it in data:
                    if isinstance(it, dict) and it.get("url"):
                        # Normalize key names for safety (support legacy 'download_id')
                        if "download_id" in it and "downloadId" not in it:
                            it["downloadId"] = it.get("download_id")
                        restored.append(dict(it))
                self._queue = restored
        except Exception:
            # Ignore corrupt files silently; leave queue as-is
            pass


# Global singleton manager
queue_manager = DownloadQueueManager()
