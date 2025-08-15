"""Performance tests for pipeline optimizations."""

import threading
import time

import pytest

from server.downloads import unified_download_manager


class TestPipelinePerformance:
    """Test performance improvements from pipeline optimizations."""

    def test_queue_throughput(self):
        """Test queue operations per second for single worker."""
        manager = unified_download_manager

        start_time = time.time()
        for i in range(100):
            manager.add_download(f"test_{i}", f"https://example.com/video_{i}")
        end_time = time.time()

        result = end_time - start_time
        # Should complete in under 0.1 seconds with async persistence
        assert result < 0.1, f"Queue operations took {result:.3f}s, expected < 0.1s"

    def test_concurrent_queue_operations(self):
        """Test concurrent enqueue/dequeue operations."""
        manager = unified_download_manager

        def enqueue_worker():
            for i in range(50):
                manager.add_download(f"worker1_{i}", f"https://example.com/video_{i}")

        def dequeue_worker():
            for i in range(50):
                manager.remove_download(f"worker1_{i}")

        # Run operations concurrently
        t1 = threading.Thread(target=enqueue_worker)
        t2 = threading.Thread(target=dequeue_worker)

        start_time = time.time()
        t1.start()
        t2.start()
        t1.join()
        t2.join()
        end_time = time.time()

        # Should complete quickly without deadlocks
        assert end_time - start_time < 5.0

    def test_progress_tracking_performance(self):
        """Test progress tracking operations per second."""
        def progress_operations():
            for i in range(1000):
                unified_download_manager.update_download(f"progress_{i}",
                    percent=i % 100,
                    speed=1024.0,
                    eta=60.0
                )

        start_time = time.time()
        progress_operations()
        end_time = time.time()

        result = end_time - start_time
        # Should handle 1000 operations efficiently
        assert result < 2.0, f"Progress operations took {result:.3f}s, expected < 2.0s"

    def test_memory_usage_stability(self):
        """Test that memory usage remains stable during operations."""
        import gc

        import psutil

        initial_memory = psutil.Process().memory_info().rss

        # Perform many operations
        manager = unified_download_manager
        for i in range(1000):
            manager.add_download(f"memory_test_{i}", f"https://example.com/video_{i}")

        # Force garbage collection
        gc.collect()

        final_memory = psutil.Process().memory_info().rss
        memory_increase = (final_memory - initial_memory) / 1024 / 1024  # MB

        # Memory increase should be reasonable (< 50MB for 1000 operations)
        assert memory_increase < 50

    def test_metrics_collection_performance(self):
        """Test metrics collection performance."""
        manager = unified_download_manager

        # Add some items first
        for i in range(100):
            manager.add_download(f"metrics_test_{i}", f"https://example.com/video_{i}")

        def collect_metrics():
            for _ in range(100):
                metrics = manager._metrics
                assert "enqueue_count" in metrics
                assert "max_queue_size" in metrics

        start_time = time.time()
        collect_metrics()
        end_time = time.time()

        result = end_time - start_time
        # Metrics collection should be fast (< 0.1 seconds for 100 operations)
        assert result < 0.1, f"Metrics collection took {result:.3f}s, expected < 0.1s"

    def test_cleanup_efficiency(self):
        """Test that cleanup operations are efficient."""
        # Test cleanup of old downloads
        manager = unified_download_manager

        # Add some test downloads
        for i in range(100):
            manager.add_download(f"cleanup_test_{i}", f"https://example.com/video_{i}")

        # Simulate cleanup by removing old downloads
        start_time = time.time()
        for i in range(100):
            manager.remove_download(f"cleanup_test_{i}")
        end_time = time.time()

        cleanup_time = end_time - start_time
        # Cleanup should be fast (< 0.1 seconds for 100 operations)
        assert cleanup_time < 0.1, f"Cleanup took {cleanup_time:.3f}s, expected < 0.1s"


if __name__ == "__main__":
    pytest.main([__file__])
