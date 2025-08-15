"""
Pipeline coordinator for unified download management.

This module provides a single interface for all pipeline operations,
consolidating queue management, progress tracking, and process management.
"""

import threading
import time
from typing import Any

from server.downloads import unified_download_manager
from server.downloads.ytdlp import download_process_registry


class PipelineCoordinator:
    """Single coordinator for all pipeline operations."""

    def __init__(self):
        """Initialize the pipeline coordinator."""
        self.unified_manager = unified_download_manager
        self.process_registry = download_process_registry

        # Set up unified manager with process registry
        self.unified_manager.set_max_concurrent(1)

        # Background cleanup thread
        self._cleanup_thread = threading.Thread(
            target=self._cleanup_loop,
            name="evd-pipeline-cleanup",
            daemon=True
        )
        self._stop_event = threading.Event()
        self._cleanup_thread.start()

    def start_download(self, downloadId: str, url: str, auto_launch: bool = True, **kwargs) -> dict[str, Any]:
        """Start a new download - single entry point."""
        # Add to unified manager
        download_info = self.unified_manager.add_download(downloadId, url, **kwargs)

        # If under capacity and auto_launch is enabled, start immediately
        if auto_launch and len(self.process_registry) < 1:
            self._launch_download(downloadId, url, **kwargs)

        return download_info

    def _launch_download(self, downloadId: str, url: str, **kwargs):
        """Launch actual download process."""
        # Update status to starting
        self.unified_manager.update_download(downloadId, status="starting")

        # Launch in background thread
        thread = threading.Thread(
            target=self._download_worker,
            args=(downloadId, url),
            daemon=True
        )
        thread.start()

    def _download_worker(self, downloadId: str, url: str):
        """Background worker for downloads."""
        try:
            # Update status to downloading
            self.unified_manager.update_download(downloadId, status="downloading")

            # Simulate download progress (replace with actual download logic)
            for i in range(0, 101, 10):
                self.unified_manager.update_download(
                    downloadId,
                    progress=i,
                    last_update=time.time()
                )
                time.sleep(0.1)  # Simulate work

            # Mark as completed
            self.unified_manager.update_download(downloadId, status="completed")

        except Exception as e:
            # Mark as error
            self.unified_manager.update_download(
                downloadId,
                status="error",
                error=str(e)
            )

    def get_status(self) -> dict[str, Any]:
        """Get unified status for all downloads."""
        return {
            "downloads": self.unified_manager.get_status_summary(),
            "processes": self.process_registry.get_health_metrics(),
            "queue": self.unified_manager.get_metrics()
        }

    def get_queue_status(self) -> dict[str, Any]:
        """Get queue-specific status."""
        return {
            "queued": self.unified_manager.get_queued_downloads(),
            "active": self.unified_manager.get_active_downloads(),
            "metrics": self.unified_manager.get_metrics()
        }

    def reorder_queue(self, new_order: list[str]) -> bool:
        """Reorder the download queue."""
        return self.unified_manager.reorder_queue(new_order)

    def force_start(self, downloadId: str) -> bool:
        """Force start a queued download."""
        return self.unified_manager.force_start(downloadId)

    def remove_download(self, downloadId: str) -> bool:
        """Remove a download from the system."""
        return self.unified_manager.remove_download(downloadId)

    def clear_queue(self) -> None:
        """Clear all queued downloads."""
        self.unified_manager.clear_queue()

    def is_queued(self, downloadId: str) -> bool:
        """Check if a download is queued."""
        return self.unified_manager.is_queued(downloadId)

    def get_queue_size(self) -> int:
        """Get current queue size."""
        return self.unified_manager.get_queue_size()

    def cleanup_finished_downloads(self, max_age_seconds: int = 120) -> int:
        """Clean up old finished downloads."""
        return self.unified_manager.cleanup_finished_downloads(max_age_seconds)

    def _cleanup_loop(self):
        """Background cleanup loop."""
        while not self._stop_event.is_set():
            try:
                # Clean up finished downloads
                cleaned = self.unified_manager.cleanup_finished_downloads()
                if cleaned > 0:
                    print(f"Cleaned up {cleaned} finished downloads")

                # Clean up orphaned progress data
                self._cleanup_orphaned_progress()

            except Exception as e:
                print(f"Error in cleanup loop: {e}")

            time.sleep(120)  # Check every 2 minutes

    def _cleanup_orphaned_progress(self):
        """Clean up progress data that doesn't correspond to actual downloads."""
        try:
            # Clean up any progress data that doesn't correspond to downloads
            # This is handled automatically by the unified manager now
            pass
        except Exception as e:
            print(f"Error cleaning up orphaned progress: {e}")

    def stop(self):
        """Stop the coordinator and cleanup threads."""
        self._stop_event.set()
        self._cleanup_thread.join(timeout=5.0)
        self.unified_manager.stop()


# Global instance
pipeline_coordinator = PipelineCoordinator()
