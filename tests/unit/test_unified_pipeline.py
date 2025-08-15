"""Test unified pipeline system for single-worker mode."""


import pytest

from server.downloads import UnifiedDownloadManager
from server.pipeline_coordinator import PipelineCoordinator


class TestUnifiedDownloadManager:
    """Test the unified download manager functionality."""

    def test_add_download(self):
        """Test adding a new download."""
        manager = UnifiedDownloadManager()

        # Add a download
        download_info = manager.add_download("test1", "https://example.com/video1", title="Test Video")

        assert download_info["downloadId"] == "test1"
        assert download_info["url"] == "https://example.com/video1"
        assert download_info["status"] == "queued"
        assert download_info["title"] == "Test Video"
        assert manager.get_queue_size() == 1
        assert manager.is_queued("test1")

        manager.stop()

    def test_remove_download(self):
        """Test removing a download."""
        manager = UnifiedDownloadManager()

        # Add and then remove
        manager.add_download("test1", "https://example.com/video1")
        assert manager.get_queue_size() == 1

        success = manager.remove_download("test1")
        assert success
        assert manager.get_queue_size() == 0
        assert not manager.is_queued("test1")

        manager.stop()

    def test_update_download(self):
        """Test updating download information."""
        manager = UnifiedDownloadManager()

        # Add a download
        manager.add_download("test1", "https://example.com/video1")

        # Update it
        success = manager.update_download("test1", status="downloading", progress=50)
        assert success

        # Check the update
        download_info = manager.get_download("test1")
        assert download_info["status"] == "downloading"
        assert download_info["progress"] == 50

        manager.stop()

    def test_queue_operations(self):
        """Test queue management operations."""
        manager = UnifiedDownloadManager()

        # Add multiple downloads
        manager.add_download("test1", "https://example.com/video1")
        manager.add_download("test2", "https://example.com/video2")
        manager.add_download("test3", "https://example.com/video3")

        assert manager.get_queue_size() == 3

        # Test reordering
        success = manager.reorder_queue(["test3", "test1", "test2"])
        assert success

        queued = manager.get_queued_downloads()
        assert queued[0]["downloadId"] == "test3"
        assert queued[1]["downloadId"] == "test1"
        assert queued[2]["downloadId"] == "test2"

        # Test force start
        success = manager.force_start("test2")
        assert success

        # test2 should now be at the front
        queued = manager.get_queued_downloads()
        assert queued[0]["downloadId"] == "test2"

        manager.stop()

    def test_metrics_collection(self):
        """Test metrics collection."""
        manager = UnifiedDownloadManager()

        # Add some downloads
        manager.add_download("test1", "https://example.com/video1")
        manager.add_download("test2", "https://example.com/video2")
        manager.remove_download("test1")

        metrics = manager.get_metrics()

        assert metrics["enqueue_count"] == 2
        assert metrics["dequeue_count"] == 1
        assert metrics["queue_size"] == 1
        assert metrics["max_queue_size"] == 2
        assert "avg_enqueue_time_ms" in metrics
        assert "avg_dequeue_time_ms" in metrics
        assert metrics["total_downloads"] == 1
        assert metrics["queued_downloads"] == 1
        assert metrics["active_downloads"] == 0

        manager.stop()

    def test_cleanup_finished_downloads(self):
        """Test cleanup of finished downloads."""
        manager = UnifiedDownloadManager()

        # Add downloads with different statuses
        manager.add_download("test1", "https://example.com/video1")
        manager.add_download("test2", "https://example.com/video2")
        manager.add_download("test3", "https://example.com/video3")

        # Update some to finished status
        manager.update_download("test1", status="completed")
        manager.update_download("test2", status="error")

        # Clean up finished downloads
        cleaned = manager.cleanup_finished_downloads(max_age_seconds=0)  # Force cleanup
        assert cleaned == 2

        # Check remaining downloads
        assert manager.get_download("test1") is None
        assert manager.get_download("test2") is None
        assert manager.get_download("test3") is not None  # Still queued

        manager.stop()


class TestPipelineCoordinator:
    """Test the pipeline coordinator functionality."""

    def test_start_download(self):
        """Test starting a download through the coordinator."""
        # Create a fresh unified manager for this test
        from server.downloads import UnifiedDownloadManager
        test_manager = UnifiedDownloadManager()

        coordinator = PipelineCoordinator()
        coordinator.unified_manager = test_manager  # Use test instance

        # Start a download (without auto-launching)
        download_info = coordinator.start_download("test1", "https://example.com/video1", auto_launch=False)

        assert download_info["downloadId"] == "test1"
        assert download_info["status"] == "queued"
        assert coordinator.get_queue_size() == 1

        coordinator.stop()
        test_manager.stop()

    def test_get_status(self):
        """Test getting unified status."""
        coordinator = PipelineCoordinator()

        # Add a download (without auto-launching)
        coordinator.start_download("test1", "https://example.com/video1", auto_launch=False)

        # Get status
        status = coordinator.get_status()

        assert "downloads" in status
        assert "processes" in status
        assert "queue" in status
        assert "test1" in status["downloads"]

        coordinator.stop()

    def test_queue_management(self):
        """Test queue management through coordinator."""
        # Create a fresh unified manager for this test
        from server.downloads import UnifiedDownloadManager
        test_manager = UnifiedDownloadManager()

        coordinator = PipelineCoordinator()
        coordinator.unified_manager = test_manager  # Use test instance

        # Add multiple downloads (without auto-launching)
        coordinator.start_download("test1", "https://example.com/video1", auto_launch=False)
        coordinator.start_download("test2", "https://example.com/video2", auto_launch=False)
        coordinator.start_download("test3", "https://example.com/video3", auto_launch=False)

        assert coordinator.get_queue_size() == 3

        # Test reordering
        success = coordinator.reorder_queue(["test3", "test1", "test2"])
        assert success

        # Test force start
        success = coordinator.force_start("test2")
        assert success

        # Test removal
        success = coordinator.remove_download("test1")
        assert success
        assert coordinator.get_queue_size() == 2

        coordinator.stop()
        test_manager.stop()

    def test_cleanup_operations(self):
        """Test cleanup operations."""
        # Create a fresh unified manager for this test
        from server.downloads import UnifiedDownloadManager
        test_manager = UnifiedDownloadManager()

        coordinator = PipelineCoordinator()
        coordinator.unified_manager = test_manager  # Use test instance

        # Add downloads (without auto-launching)
        coordinator.start_download("test1", "https://example.com/video1", auto_launch=False)
        coordinator.start_download("test2", "https://example.com/video2", auto_launch=False)

        # Mark one as completed
        coordinator.unified_manager.update_download("test1", status="completed")

        # Clean up
        cleaned = coordinator.cleanup_finished_downloads(max_age_seconds=0)
        assert cleaned == 1

        # Check remaining
        assert coordinator.get_queue_size() == 1
        assert coordinator.is_queued("test2")

        coordinator.stop()
        test_manager.stop()


class TestPipelineIntegration:
    """Test integration between pipeline components."""

    def test_unified_workflow(self):
        """Test complete download workflow through unified system."""
        # Create a fresh unified manager for this test
        from server.downloads import UnifiedDownloadManager
        test_manager = UnifiedDownloadManager()

        coordinator = PipelineCoordinator()
        coordinator.unified_manager = test_manager  # Use test instance

        # Start downloads (without auto-launching)
        coordinator.start_download("test1", "https://example.com/video1", title="Video 1", auto_launch=False)
        coordinator.start_download("test2", "https://example.com/video2", title="Video 2", auto_launch=False)

        # Check initial state
        assert coordinator.get_queue_size() == 2
        assert coordinator.is_queued("test1")
        assert coordinator.is_queued("test2")

        # Get status
        status = coordinator.get_status()
        assert len(status["downloads"]) == 2
        assert status["queue"]["queue_size"] == 2

        # Test queue operations
        coordinator.reorder_queue(["test2", "test1"])
        queued = coordinator.get_queue_status()["queued"]
        assert queued[0]["downloadId"] == "test2"
        assert queued[1]["downloadId"] == "test1"

        # Test force start
        coordinator.force_start("test1")
        queued = coordinator.get_queue_status()["queued"]
        assert queued[0]["downloadId"] == "test1"

        # Clean up
        coordinator.clear_queue()
        assert coordinator.get_queue_size() == 0

        coordinator.stop()
        test_manager.stop()


if __name__ == "__main__":
    pytest.main([__file__])
