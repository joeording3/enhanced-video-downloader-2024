"""Server-side download queue management.

This module provides a thread-safe queue for pending downloads and a background
worker that starts queued downloads when capacity is available, respecting the
`max_concurrent_downloads` value from the server configuration.
"""

from __future__ import annotations

import contextlib
import threading
from collections import deque
from typing import Any

from flask import Flask as _Flask
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
            self._worker_thread = threading.Thread(target=self._worker_loop, name="evd-queue-worker", daemon=True)
            self._worker_thread.start()

    def stop(self) -> None:
        """Signal the worker to stop (used on server shutdown)."""
        self._stop_event.set()
        with self._notifier:
            self._notifier.notify_all()

    # Queue operations
    def enqueue(self, item: dict[str, Any]) -> None:
        """Add a request to the queue and notify the worker."""
        with self._notifier:
            self._queue.append(item)
            self._notifier.notify_all()

    def remove(self, download_id: str) -> bool:
        """Remove the first queued item matching the given download ID."""
        with self._notifier:
            for i, it in enumerate(self._queue):
                if str(it.get("downloadId")) == str(download_id):
                    del self._queue[i]
                    self._notifier.notify_all()
                    return True
            return False

    def reorder(self, new_order: list[str]) -> None:
        """Reorder queue to match the given list of IDs; unknown IDs are ignored."""
        with self._notifier:
            id_to_item = {str(it.get("downloadId")): it for it in self._queue}
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
            self._notifier.notify_all()

    def list(self) -> list[dict[str, Any]]:
        """Return a shallow copy of queued items for status reporting."""
        with self._lock:
            return [dict(it) for it in self._queue]

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
        # Access the underlying Flask object when available
        app: _Flask | None = None
        # Avoid accessing private member; use current_app proxy directly when available
        if current_app:  # type: ignore[truthy-function]
            app = current_app  # type: ignore[assignment]

        if app is not None:
            # Run within app context for safety (jsonify/config/logging)
            try:
                with app.app_context():  # type: ignore[union-attr]
                    handle_ytdlp_download(task)
            except Exception:
                # Swallow exceptions; errors are logged by the handler
                pass
        else:
            import contextlib

            with contextlib.suppress(Exception):
                handle_ytdlp_download(task)


# Global singleton manager
queue_manager = DownloadQueueManager()
