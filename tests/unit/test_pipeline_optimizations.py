"""Test pipeline optimizations for single-worker mode."""

import time
from unittest.mock import Mock

import pytest

from server.downloads import ProgressInfo, UnifiedDownloadManager


class TestAsyncPersistence:
    """Test async persistence functionality."""

    def test_mark_dirty(self):
        """Test that mark_dirty sets the dirty flag."""
        from server.downloads import AsyncPersistence
        persistence = AsyncPersistence(flush_interval=0.1)
        assert not persistence._dirty
        persistence.mark_dirty()
        assert persistence._dirty

    def test_persistence_loop(self):
        """Test that persistence loop calls flush when dirty."""
        from server.downloads import AsyncPersistence
        persistence = AsyncPersistence(flush_interval=0.1)
        persistence._flush_to_disk = Mock()

        # Mark as dirty and wait for flush
        persistence.mark_dirty()
        time.sleep(0.2)  # Allow one flush cycle

        # Stop and verify flush was called
        persistence.stop()
        assert persistence._flush_to_disk.called

    def test_stop(self):
        """Test that stop properly terminates the thread."""
        from server.downloads import AsyncPersistence
        persistence = AsyncPersistence(flush_interval=0.1)
        thread = persistence._persistence_thread

        assert thread.is_alive()
        persistence.stop()

        # Thread should be stopped
        assert not thread.is_alive()


class TestUnifiedDownloadManager:
    """Test unified download manager optimizations."""

    def test_async_persistence_integration(self):
        """Test that download operations use async persistence."""
        manager = UnifiedDownloadManager()

        # Test add_download
        manager.add_download("test1", "url1")
        assert manager._persistence._dirty

        # Test remove_download
        manager.remove_download("test1")
        assert manager._persistence._dirty

        # Test clear_queue
        manager.add_download("test2", "url2")
        manager.clear_queue()
        assert manager._persistence._dirty

        manager.stop()

    def test_metrics_collection(self):
        """Test that metrics are properly collected."""
        manager = UnifiedDownloadManager()

        # Perform operations
        manager.add_download("test1", "url1")
        manager.add_download("test2", "url2")
        manager.remove_download("test1")

        # Get metrics
        metrics = manager._metrics

        assert metrics["enqueue_count"] == 2
        assert metrics["dequeue_count"] == 1
        assert len(manager._queue_order) == 1
        assert metrics["max_queue_size"] == 2

        manager.stop()

    def test_single_worker_behavior(self):
        """Test basic single worker queue behavior."""
        manager = UnifiedDownloadManager()

        # Test basic add_download/remove_download
        manager.add_download("test1", "url1")
        assert len(manager._queue_order) == 1

        # Test metrics
        metrics = manager._metrics
        assert metrics["enqueue_count"] == 1
        assert len(manager._queue_order) == 1

        manager.stop()


class TestProgressInfo:
    """Test enhanced progress info functionality."""

    def test_progress_info_creation(self):
        """Test ProgressInfo creation and updates."""
        info = ProgressInfo(downloadId="test_id")

        assert info.downloadId == "test_id"
        assert info.status == "unknown"
        assert info.url == ""
        assert info.progress == 0
        assert info.filename == ""

        # Test custom values
        info = ProgressInfo(
            downloadId="test_id",
            status="downloading",
            url="http://example.com",
            progress=50,
            filename="video.mp4"
        )
        assert info.status == "downloading"
        assert info.url == "http://example.com"
        assert info.progress == 50
        assert info.filename == "video.mp4"

    def test_progress_info_validation(self):
        """Test ProgressInfo validation."""
        # Test with minimal required fields
        info = ProgressInfo(downloadId="test_id")
        assert info.downloadId == "test_id"
        assert info.status == "unknown"

        # Test with all fields
        info = ProgressInfo(
            downloadId="test_id",
            status="complete",
            url="http://example.com",
            progress=100,
            filename="video.mp4",
            title="Test Video",
            timestamp=time.time(),
            error=None,
            message="Download completed"
        )
        assert info.downloadId == "test_id"
        assert info.status == "complete"
        assert info.url == "http://example.com"
        assert info.progress == 100
        assert info.filename == "video.mp4"
        assert info.title == "Test Video"
        assert info.error is None
        assert info.message == "Download completed"

    def test_progress_info_edge_cases(self):
        """Test ProgressInfo edge cases."""
        # Test with empty string values
        info = ProgressInfo(downloadId="", url="", filename="")
        assert info.downloadId == ""
        assert info.url == ""
        assert info.filename == ""

        # Test with None values
        info = ProgressInfo(downloadId="test_id", error=None, message=None)
        assert info.error is None
        assert info.message is None

    def test_progress_info_timestamp(self):
        """Test ProgressInfo timestamp handling."""
        current_time = time.time()
        info = ProgressInfo(downloadId="test_id", timestamp=current_time)
        assert info.timestamp == current_time

        # Test default timestamp
        info = ProgressInfo(downloadId="test_id")
        assert info.timestamp > 0
        assert abs(info.timestamp - time.time()) < 1  # Should be within 1 second


class TestPipelineIntegration:
    """Test integration between pipeline components."""

    def test_unified_manager_integration(self):
        """Test that unified download manager works properly."""
        manager = UnifiedDownloadManager()

        # Simulate download workflow
        downloadId = "test_integration"

        # Add to queue
        manager.add_download(downloadId, "test_url")
        assert len(manager._queue_order) == 1

        # Update download status
        manager.update_download(downloadId, status="downloading", progress=30)
        download_info = manager.get_download(downloadId)
        assert download_info["status"] == "downloading"
        assert download_info["progress"] == 30

        # Get metrics
        metrics = manager._metrics
        assert metrics["enqueue_count"] == 1
        assert len(manager._queue_order) == 1

        # Cleanup
        manager.stop()


if __name__ == "__main__":
    pytest.main([__file__])
