"""
Provide download functionality for the Enhanced Video Downloader server.

This package contains modules for downloading videos and galleries from various sources.
It manages download progress tracking, resumption, and other download-related functionality.
"""

import json
import threading
import time
from collections import deque
from pathlib import Path
from typing import Any


class ProgressInfo:
    """Information about a download's progress."""

    def __init__(self, **kwargs):
        """Initialize progress info with keyword arguments."""
        self.downloadId = kwargs.get("downloadId")
        self.status = kwargs.get("status", "unknown")
        self.url = kwargs.get("url", "")
        self.progress = kwargs.get("progress", 0)
        self.filename = kwargs.get("filename", "")
        self.title = kwargs.get("title", "")
        self.timestamp = kwargs.get("timestamp", time.time())
        self.error = kwargs.get("error")
        self.message = kwargs.get("message")


class AsyncPersistence:
    """Asynchronous persistence for download state to avoid blocking I/O."""

    def __init__(self, flush_interval: float = 5.0):
        """Initialize async persistence with background thread.

        Parameters
        ----------
        flush_interval : float
            Interval in seconds between persistence checks.
        """
        self._dirty = False
        self._flush_interval = flush_interval
        self._stop_event = threading.Event()
        self._persistence_thread = threading.Thread(
            target=self._persistence_loop,
            name="evd-persistence",
            daemon=True
        )
        self._persistence_thread.start()

    def mark_dirty(self):
        """Mark the state as needing persistence."""
        self._dirty = True

    def stop(self):
        """Stop the persistence thread."""
        self._stop_event.set()
        self._persistence_thread.join(timeout=5.0)

    def _persistence_loop(self):
        """Background loop for persisting state changes."""
        while not self._stop_event.is_set():
            if self._dirty:
                self._flush_to_disk()
                self._dirty = False
            time.sleep(self._flush_interval)

    def _flush_to_disk(self):
        """Persist the current state to disk as JSON."""
        # This will be implemented by the unified manager


# Unified Download State Manager
class UnifiedDownloadManager:
    """
    Unified manager for all download states (active, queued, completed, etc.).

    This consolidates the previously separate progress_data and queue_manager systems,
    including async persistence and comprehensive queue management.
    """

    def __init__(self):
        """Initialize the unified download manager."""
        self._downloads: dict[str, dict[str, Any]] = {}
        self._lock = threading.RLock()
        self._queue_order: deque[str] = deque()
        self._max_concurrent: int = 1  # Will be set from config
        self._persistence = AsyncPersistence()
        self._last_activity_time = time.time()
        self._metrics = {
            "enqueue_count": 0,
            "dequeue_count": 0,
            "total_enqueue_time": 0.0,
            "total_dequeue_time": 0.0,
            "max_queue_size": 0,
            "start_time": time.time()
        }

        # Connect persistence to actual persistence logic
        self._persistence._flush_to_disk = self._persist_state_to_disk

    def set_max_concurrent(self, max_concurrent: int):
        """Set the maximum number of concurrent downloads."""
        self._max_concurrent = max_concurrent

    def add_download(self, downloadId: str, url: str, **kwargs) -> dict[str, Any]:
        """Add a new download to the system."""
        start_time = time.time()

        # Validate URL - ensure it's not empty or None
        if not url or not url.strip():
            raise ValueError(f"Invalid URL for download {downloadId}: URL cannot be empty or None")

        with self._lock:
            download_info = {
                "downloadId": downloadId,
                "url": url.strip(),  # Ensure clean URL
                "status": "queued",
                "timestamp": time.time(),
                "progress": 0,
                **kwargs
            }

            self._downloads[downloadId] = download_info
            self._queue_order.append(downloadId)

            # Update metrics
            self._metrics["enqueue_count"] += 1
            self._metrics["total_enqueue_time"] += time.time() - start_time
            self._metrics["max_queue_size"] = max(self._metrics["max_queue_size"], len(self._queue_order))
            self._last_activity_time = time.time()

            # Mark for async persistence
            self._persistence.mark_dirty()

            # Don't auto-start - let external systems control when to start downloads
            # self._try_start_downloads()

            return download_info.copy()

    def remove_download(self, downloadId: str) -> bool:
        """Remove a download from the system."""
        start_time = time.time()
        with self._lock:
            if downloadId not in self._downloads:
                return False

            # Remove from queue order if present
            if downloadId in self._queue_order:
                self._queue_order.remove(downloadId)
                self._metrics["dequeue_count"] += 1
                self._metrics["total_dequeue_time"] += time.time() - start_time

            # Remove from downloads
            del self._downloads[downloadId]
            self._last_activity_time = time.time()

            # Mark for async persistence
            self._persistence.mark_dirty()

            return True

    def update_download(self, downloadId: str, **kwargs) -> bool:
        """Update download information."""
        with self._lock:
            if downloadId not in self._downloads:
                return False

            self._downloads[downloadId].update(kwargs)
            self._persistence.mark_dirty()
            return True

    def get_download(self, downloadId: str) -> dict[str, Any] | None:
        """Get download information by ID."""
        with self._lock:
            return self._downloads.get(downloadId)

    def get_all_downloads(self) -> dict[str, dict[str, Any]]:
        """Get all downloads in the system."""
        with self._lock:
            return self._downloads.copy()

    def get_queued_downloads(self) -> list[dict[str, Any]]:
        """Get all queued downloads."""
        with self._lock:
            queued = []
            for downloadId in self._queue_order:
                if downloadId in self._downloads:
                    download_info = self._downloads[downloadId]
                    if download_info.get("status") == "queued":
                        queued.append(download_info.copy())
            return queued

    def get_active_downloads(self) -> dict[str, dict[str, Any]]:
        """Get all active downloads."""
        with self._lock:
            active = {}
            for downloadId, download_info in self._downloads.items():
                if download_info.get("status") in ["downloading", "starting", "paused"]:
                    active[downloadId] = download_info.copy()
            return active

    def reorder_queue(self, new_order: list[str]) -> bool:
        """Reorder the queue."""
        with self._lock:
            # Validate that all IDs exist and are queued
            valid_ids = []
            for downloadId in new_order:
                if downloadId in self._downloads and self._downloads[downloadId].get("status") == "queued":
                    valid_ids.append(downloadId)

            # Update queue order
            self._queue_order = deque(valid_ids + [did for did in self._queue_order if did not in valid_ids])
            self._persistence.mark_dirty()
            return True

    def force_start(self, downloadId: str) -> bool:
        """Force start a queued download."""
        with self._lock:
            if downloadId not in self._downloads:
                return False

            download_info = self._downloads[downloadId]
            if download_info.get("status") != "queued":
                return False

            # Move to front of queue
            if downloadId in self._queue_order:
                self._queue_order.remove(downloadId)
            self._queue_order.appendleft(downloadId)

            # Mark for persistence
            self._persistence.mark_dirty()

            # Don't auto-start - let external systems control when to start downloads
            # self._try_start_downloads()
            return True

    def clear_queue(self) -> None:
        """Clear all queued downloads."""
        with self._lock:
            # Remove all queued downloads
            queued_ids = [did for did in self._queue_order if did in self._downloads]
            for downloadId in queued_ids:
                del self._downloads[downloadId]

            self._queue_order.clear()
            self._persistence.mark_dirty()

    def is_queued(self, downloadId: str) -> bool:
        """Check if a download ID is currently in the queue."""
        with self._lock:
            return downloadId in self._queue_order

    def get_queue_size(self) -> int:
        """Get the current queue size."""
        with self._lock:
            return len(self._queue_order)

    def _try_start_downloads(self):
        """Try to start queued downloads if under capacity."""
        with self._lock:
            active_count = len(self.get_active_downloads())
            available_slots = self._max_concurrent - active_count

            if available_slots <= 0:
                return

            # Start downloads from front of queue
            started = 0
            for downloadId in list(self._queue_order):
                if started >= available_slots:
                    break

                download_info = self._downloads[downloadId]
                if download_info.get("status") == "queued":
                    # Mark as starting - actual download will be handled by external system
                    download_info["status"] = "starting"
                    download_info["timestamp"] = time.time()
                    started += 1

    def get_status_summary(self) -> dict[str, Any]:
        """Get a summary of all download states for the status endpoint."""
        with self._lock:
            summary = {}

            # Add all downloads with their current state
            for downloadId, download_info in self._downloads.items():
                summary[downloadId] = download_info.copy()

            return summary

    def get_metrics(self) -> dict[str, Any]:
        """Get comprehensive metrics for monitoring."""
        with self._lock:
            current_time = time.time()
            uptime = current_time - self._metrics["start_time"]

            return {
                "queue_size": len(self._queue_order),
                "max_queue_size": self._metrics["max_queue_size"],
                "enqueue_count": self._metrics["enqueue_count"],
                "dequeue_count": self._metrics["dequeue_count"],
                "avg_enqueue_time_ms": (
                    self._metrics["total_enqueue_time"] / max(self._metrics["enqueue_count"], 1)
                ) * 1000,
                "avg_dequeue_time_ms": (
                    self._metrics["total_dequeue_time"] / max(self._metrics["dequeue_count"], 1)
                ) * 1000,
                "uptime_seconds": uptime,
                "enqueue_rate_per_min": (self._metrics["enqueue_count"] / max(uptime / 60, 1)),
                "dequeue_rate_per_min": (self._metrics["dequeue_count"] / max(uptime / 60, 1)),
                "last_activity_seconds_ago": current_time - self._last_activity_time,
                "total_downloads": len(self._downloads),
                "active_downloads": len(self.get_active_downloads()),
                "queued_downloads": len(self.get_queued_downloads())
            }

    def cleanup_finished_downloads(self, max_age_seconds: int = 120):
        """Clean up old finished downloads."""
        with self._lock:
            current_time = time.time()
            to_remove = []

            for downloadId, download_info in self._downloads.items():
                status = download_info.get("status")
                timestamp = download_info.get("timestamp", 0)

                # Remove old finished downloads
                if status in ["completed", "error", "canceled"]:
                    if current_time - timestamp > max_age_seconds:
                        to_remove.append(downloadId)

            for downloadId in to_remove:
                self.remove_download(downloadId)

            return len(to_remove)

    def stop(self):
        """Stop the manager and persistence."""
        self._persistence.stop()

    def _persist_state_to_disk(self):
        """Persist the current state to disk as JSON."""
        path = self._get_state_file_path()
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            # Write atomically: temp file then replace
            tmp_path = Path(str(path) + ".tmp")

            # Prepare data for persistence
            state_data = {
                "downloads": self._downloads,
                "queue_order": list(self._queue_order),
                "metrics": self._metrics,
                "last_activity": self._last_activity_time
            }

            with tmp_path.open("w", encoding="utf-8") as f:
                json.dump(state_data, f, ensure_ascii=False, indent=2)
            tmp_path.replace(path)
        except Exception:
            # Best-effort only; do not raise
            pass

    def _get_state_file_path(self) -> Path:
        """Return the path to the state persistence JSON file under server/data."""
        # server/downloads/__init__.py -> server/data/unified_state.json
        base_dir = Path(__file__).resolve().parent
        data_dir = base_dir / "data"
        return data_dir / "unified_state.json"

    def _load_state_from_disk(self):
        """Load state from disk if the JSON file exists."""
        path = self._get_state_file_path()
        try:
            if not path.exists():
                return
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)

            if isinstance(data, dict):
                # Restore downloads
                if "downloads" in data:
                    self._downloads = data["downloads"]

                # Restore queue order
                if "queue_order" in data:
                    self._queue_order = deque(data["queue_order"])

                # Restore metrics
                if "metrics" in data:
                    self._metrics.update(data["metrics"])

                # Restore last activity time
                if "last_activity" in data:
                    self._last_activity_time = data["last_activity"]
        except Exception:
            # Ignore corrupt files silently; leave state as-is
            pass


# Global instance
unified_download_manager = UnifiedDownloadManager()

# Legacy compatibility - these will be gradually replaced
progress_data = unified_download_manager._downloads  # Backward compatibility
progress_lock = unified_download_manager._lock      # Backward compatibility

# Initialize with default max concurrent
unified_download_manager.set_max_concurrent(1)

# Load any existing state from disk
unified_download_manager._load_state_from_disk()
