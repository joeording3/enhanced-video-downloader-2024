"""Unit tests for server.__main__ module."""

import signal
import threading
from pathlib import Path
from unittest.mock import Mock, patch

import psutil

from server.__main__ import (
    _active_download_processes,
    _cleanup_orphaned_processes,
    _prepare_server_lock,
    _register_signal_handlers,
    _run_flask_server,
    cleanup_part_files,
    find_orphaned_processes,
    graceful_shutdown,
    kill_process,
    main,
    register_download_process,
    save_download_state,
    terminate_active_downloads,
    unregister_download_process,
)
from server.constants import get_server_port


class TestProcessRegistration:
    """Test process registration and unregistration functions."""

    def test_register_download_process(self):
        """Test registering a download process."""
        mock_process = Mock(spec=psutil.Process)

        register_download_process(mock_process)

        # Verify process was added to tracking set

        assert mock_process in _active_download_processes

    def test_unregister_download_process(self):
        """Test unregistering a download process."""
        mock_process = Mock(spec=psutil.Process)

        # Register then unregister
        register_download_process(mock_process)
        unregister_download_process(mock_process)

        # Verify process was removed from tracking set

        assert mock_process not in _active_download_processes

    def test_unregister_nonexistent_process(self):
        """Test unregistering a process that was never registered."""
        mock_process = Mock(spec=psutil.Process)

        # Should not raise an exception
        unregister_download_process(mock_process)

    def test_process_registration_thread_safety(self):
        """Test that process registration is thread-safe."""
        mock_processes = [Mock(spec=psutil.Process) for _ in range(10)]

        def register_processes():
            for process in mock_processes:
                register_download_process(process)

        def unregister_processes():
            for process in mock_processes:
                unregister_download_process(process)

        # Run registration and unregistration in parallel
        threads = []
        for _ in range(5):
            threads.append(threading.Thread(target=register_processes))
            threads.append(threading.Thread(target=unregister_processes))

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join()

        # Verify final state is consistent
        from server.__main__ import _active_download_processes

        # Due to race conditions, we can't guarantee exact count
        # But we should have a reasonable number of processes
        assert len(_active_download_processes) <= 10


class TestGracefulShutdown:
    """Test graceful shutdown functionality."""

    def setup_method(self):
        """Reset global state before each test."""
        import server.__main__ as main_module

        main_module._shutdown_in_progress = False

    @patch("server.__main__.logger")
    @patch("server.__main__.terminate_active_downloads")
    @patch("server.__main__.save_download_state")
    @patch("server.__main__.cleanup_part_files")
    @patch("server.__main__.sys")
    def test_graceful_shutdown_sigint(self, mock_sys, mock_cleanup, mock_save, mock_terminate, mock_logger):
        """Test graceful shutdown with SIGINT signal."""
        graceful_shutdown(signal.SIGINT)

        # Check that the shutdown message was logged
        mock_logger.info.assert_any_call("Graceful shutdown complete. Exiting.")
        mock_terminate.assert_called_once()
        mock_save.assert_called_once()
        mock_cleanup.assert_called_once()
        mock_sys.exit.assert_called_with(0)

    @patch("server.__main__.logger")
    @patch("server.__main__.terminate_active_downloads")
    @patch("server.__main__.save_download_state")
    @patch("server.__main__.cleanup_part_files")
    @patch("server.__main__.sys")
    def test_graceful_shutdown_sigterm(self, mock_sys, mock_cleanup, mock_save, mock_terminate, mock_logger):
        """Test graceful shutdown with SIGTERM signal."""
        graceful_shutdown(signal.SIGTERM)

        # Check that the shutdown message was logged
        mock_logger.info.assert_any_call("Received SIGTERM. Initiating graceful shutdown...")
        mock_terminate.assert_called_once()
        mock_save.assert_called_once()
        mock_cleanup.assert_called_once()
        mock_sys.exit.assert_called_with(0)

    @patch("server.__main__.logger")
    @patch("server.__main__.terminate_active_downloads")
    @patch("server.__main__.save_download_state")
    @patch("server.__main__.cleanup_part_files")
    @patch("server.__main__.sys")
    def test_graceful_shutdown_unknown_signal(self, mock_sys, mock_cleanup, mock_save, mock_terminate, mock_logger):
        """Test graceful shutdown with unknown signal."""
        graceful_shutdown(999)

        # Check that the shutdown message was logged
        mock_logger.info.assert_any_call("Received UNKNOWN. Initiating graceful shutdown...")
        mock_terminate.assert_called_once()
        mock_save.assert_called_once()
        mock_cleanup.assert_called_once()
        mock_sys.exit.assert_called_with(0)

    @patch("server.__main__.sys")
    def test_graceful_shutdown_prevents_multiple_calls(self, mock_sys):
        """Test that graceful shutdown prevents multiple simultaneous calls."""
        # First call should work normally
        graceful_shutdown(signal.SIGINT)

        # Second call should exit immediately
        graceful_shutdown(signal.SIGTERM)

        mock_sys.exit.assert_called_with(0)


class TestSaveDownloadState:
    """Test save_download_state function."""

    @patch("server.__main__.progress_data")
    @patch("server.__main__.progress_lock")
    def test_save_download_state(self, mock_lock, mock_data):
        """Test saving download state."""
        # Mock progress_data to have some content so the if block is entered
        mock_data.__bool__.return_value = True
        mock_data.__len__.return_value = 1
        mock_data.items.return_value = [("test_id", {"status": "downloading"})]

        save_download_state()

        # The function uses 'with progress_lock:' so we check that the context manager was used
        mock_lock.__enter__.assert_called_once()
        mock_lock.__exit__.assert_called_once()


class TestCleanupPartFiles:
    """Test cleanup_part_files function with real file operations."""

    def test_cleanup_part_files(self, tmp_path):
        """Test cleanup of part files using real file operations."""
        # Create a temporary download directory
        download_dir = tmp_path / "downloads"
        download_dir.mkdir()

        # Create some .part files
        part_file1 = download_dir / "file1.mp4.part"
        part_file1.write_text("partial data")
        part_file2 = download_dir / "file2.mp4.part"
        part_file2.write_text("more partial data")

        # Mock the download directory path
        with patch("server.__main__.Path") as mock_path:
            mock_path.return_value = download_dir

            cleanup_part_files()

            # Verify that the part files were removed
            assert not part_file1.exists()
            assert not part_file2.exists()

    def test_cleanup_part_files_no_files(self, tmp_path):
        """Test cleanup when no part files exist using real file operations."""
        # Create a temporary download directory with no .part files
        download_dir = tmp_path / "downloads"
        download_dir.mkdir()

        # Create a regular file (not .part)
        regular_file = download_dir / "file.mp4"
        regular_file.write_text("complete data")

        # Mock the download directory path
        with patch("server.__main__.Path") as mock_path:
            mock_path.return_value = download_dir

            cleanup_part_files()

            # Verify that the regular file was not removed
            assert regular_file.exists()


class TestFindOrphanedProcesses:
    """Test find_orphaned_processes function."""

    @patch("psutil.process_iter")
    def test_find_orphaned_processes(self, mock_process_iter):
        """Test finding orphaned processes."""
        mock_process1 = Mock()
        mock_process1.pid = 12345
        mock_process1.info = {"pid": 12345, "name": "python", "cmdline": ["python", "server.py"]}

        mock_process2 = Mock()
        mock_process2.pid = 67890
        mock_process2.info = {"pid": 67890, "name": "python", "cmdline": ["python", "other.py"]}

        mock_process_iter.return_value = [mock_process1, mock_process2]

        # Mock the helper functions that are called internally
        with patch("server.__main__._is_potential_server_process") as mock_is_potential, patch(
            "server.__main__._process_uses_port"
        ) as mock_uses_port:
            mock_is_potential.side_effect = [True, False]
            mock_uses_port.side_effect = [True, False]

            result = find_orphaned_processes(get_server_port())

            # Verify the mocks were called
            assert mock_is_potential.call_count == 2
            assert mock_uses_port.call_count == 1
            assert result == [12345]

    @patch("psutil.process_iter")
    def test_find_orphaned_processes_no_matches(self, mock_process_iter):
        """Test finding orphaned processes when none match."""
        mock_process = Mock()
        mock_process.pid = 12345
        mock_process.info = {"pid": 12345, "name": "python", "cmdline": ["python", "other.py"]}

        mock_process_iter.return_value = [mock_process]

        with patch("server.__main__._is_potential_server_process") as mock_is_potential:
            mock_is_potential.return_value = False

            result = find_orphaned_processes(get_server_port())

            assert result == []


class TestKillProcess:
    """Test kill_process function."""

    @patch("psutil.Process")
    def test_kill_process_success(self, mock_process_class):
        """Test successfully killing a process."""
        mock_process = Mock()
        mock_process_class.return_value = mock_process
        mock_process.terminate.return_value = None
        mock_process.wait.return_value = 0
        mock_process.cmdline.return_value = ["python", "server.py"]

        result = kill_process(12345)

        mock_process_class.assert_called_once_with(12345)
        mock_process.terminate.assert_called_once()
        mock_process.wait.assert_called_once_with(timeout=3)
        assert result is True

    @patch("psutil.Process")
    def test_kill_process_force_kill(self, mock_process_class):
        """Test force killing a process that doesn't terminate gracefully."""
        mock_process = Mock()
        mock_process_class.return_value = mock_process
        mock_process.terminate.return_value = None
        mock_process.wait.side_effect = psutil.TimeoutExpired(1, 12345)
        mock_process.kill.return_value = None
        mock_process.cmdline.return_value = ["python", "server.py"]

        result = kill_process(12345)

        mock_process_class.assert_called_once_with(12345)
        mock_process.terminate.assert_called_once()
        mock_process.wait.assert_called_with(timeout=3)
        mock_process.kill.assert_called_once()
        assert result is True

    @patch("psutil.Process")
    def test_kill_process_not_found(self, mock_process_class):
        """Test killing a process that doesn't exist."""
        mock_process_class.side_effect = psutil.NoSuchProcess(12345)

        result = kill_process(12345)

        assert result is False


class TestTerminateActiveDownloads:
    """Test terminate_active_downloads function."""

    @patch("server.__main__._get_active_download_processes")
    @patch("server.__main__._terminate_download_processes_gracefully")
    @patch("server.__main__._kill_download_processes")
    def test_terminate_active_downloads(self, mock_kill, mock_terminate, mock_get):
        """Test terminating active downloads."""
        mock_processes = [Mock(), Mock()]
        mock_get.return_value = mock_processes

        terminate_active_downloads()

        mock_get.assert_called_once()
        mock_terminate.assert_called_once_with(mock_processes)
        mock_kill.assert_called_once_with(mock_processes)

    @patch("server.__main__._get_active_download_processes")
    @patch("server.__main__._terminate_download_processes_gracefully")
    @patch("server.__main__._kill_download_processes")
    def test_terminate_active_downloads_no_processes(self, mock_kill, mock_terminate, mock_get):
        """Test terminating active downloads when none exist."""
        mock_get.return_value = []

        terminate_active_downloads()

        mock_get.assert_called_once()
        # When no processes exist, terminate and kill should not be called
        mock_terminate.assert_not_called()
        mock_kill.assert_not_called()


class TestRegisterSignalHandlers:
    """Test _register_signal_handlers function."""

    @patch("signal.signal")
    def test_register_signal_handlers(self, mock_signal):
        """Test registering signal handlers."""
        _register_signal_handlers()

        # Verify signal handlers were registered
        calls = mock_signal.call_args_list
        assert len(calls) >= 2

        # Check that SIGINT and SIGTERM handlers were registered
        signal_numbers = [call[0][0] for call in calls]
        assert signal.SIGINT in signal_numbers
        assert signal.SIGTERM in signal_numbers


class TestCleanupOrphanedProcesses:
    """Test _cleanup_orphaned_processes function."""

    @patch("server.__main__.find_orphaned_processes")
    @patch("server.__main__.kill_process")
    def test_cleanup_orphaned_processes(self, mock_kill, mock_find):
        """Test cleaning up orphaned processes."""
        mock_find.return_value = [12345, 67890]
        mock_kill.side_effect = [True, False]

        _cleanup_orphaned_processes(get_server_port())

        mock_find.assert_called_once_with(get_server_port())
        assert mock_kill.call_count == 2
        mock_kill.assert_any_call(12345)
        mock_kill.assert_any_call(67890)

    @patch("server.__main__.find_orphaned_processes")
    @patch("server.__main__.kill_process")
    def test_cleanup_orphaned_processes_none_found(self, mock_kill, mock_find):
        """Test cleaning up orphaned processes when none found."""
        mock_find.return_value = []

        _cleanup_orphaned_processes(get_server_port())

        mock_find.assert_called_once_with(get_server_port())
        mock_kill.assert_not_called()


class TestPrepareServerLock:
    """Test _prepare_server_lock function."""

    @patch("server.__main__.create_lock_file")
    @patch("server.__main__.get_lock_file_path")
    @patch("server.__main__.socket")
    def test_prepare_server_lock(self, mock_socket, mock_get_path, mock_create):
        """Test preparing server lock."""
        mock_config = Mock()
        mock_lock_path = Path("/tmp/test.lock")
        mock_get_path.return_value = mock_lock_path
        mock_lock_handle = Mock()
        mock_create.return_value = mock_lock_handle

        # Mock socket to simulate port is available
        mock_sock = Mock()
        mock_socket.socket.return_value.__enter__.return_value = mock_sock
        mock_sock.connect_ex.return_value = 1  # Port not in use

        host = "localhost"
        port = get_server_port()

        result = _prepare_server_lock(mock_config, host, port)

        assert result == (mock_lock_handle, port)
        mock_get_path.assert_called_once()
        mock_create.assert_called_once_with(mock_lock_path, port)


class TestRunFlaskServer:
    """Test _run_flask_server function."""

    @patch("server.__main__.create_app")
    @patch("server.__main__.cleanup_lock_file")
    def test_run_flask_server(self, mock_cleanup, mock_create_app):
        """Test running Flask server."""
        mock_config = Mock()
        mock_app = Mock()
        mock_create_app.return_value = mock_app
        mock_lock_handle = Mock()

        host = "localhost"
        port = get_server_port()

        # Mock the Flask app run method to avoid actually starting the server
        with patch.object(mock_app, "run") as mock_run:
            _run_flask_server(mock_config, host, port, mock_lock_handle)

            mock_create_app.assert_called_once_with(mock_config)
            mock_run.assert_called_once_with(host=host, port=port, debug=False, use_reloader=False)
            mock_cleanup.assert_called_once_with(mock_lock_handle)


class TestMain:
    """Test main function."""

    @patch("server.__main__._register_signal_handlers")
    @patch("server.__main__._cleanup_orphaned_processes")
    @patch("server.__main__._prepare_server_lock")
    @patch("server.__main__._run_flask_server")
    @patch("server.__main__.create_app")
    def test_main_production_mode(self, mock_create_app, mock_run, mock_prepare, mock_cleanup, mock_register):
        """Test main function in production mode."""
        mock_app = Mock()
        mock_create_app.return_value = mock_app

        result = main(production=True)

        # In production mode, should return the Flask app
        assert result == mock_app
        # In production mode, signal handlers are not registered
        mock_register.assert_not_called()
        # In production mode, no cleanup or preparation needed
        mock_cleanup.assert_not_called()
        mock_prepare.assert_not_called()
        mock_run.assert_not_called()

    @patch("server.__main__._register_signal_handlers")
    @patch("server.__main__._cleanup_orphaned_processes")
    @patch("server.__main__._prepare_server_lock")
    @patch("server.__main__._run_flask_server")
    @patch("server.__main__.create_app")
    def test_main_development_mode(self, mock_create_app, mock_run, mock_prepare, mock_cleanup, mock_register):
        """Test main function in development mode."""
        mock_app = Mock()
        mock_create_app.return_value = mock_app
        mock_lock_handle = Mock()
        mock_prepare.return_value = (mock_lock_handle, get_server_port())

        result = main(production=False)

        # In development mode, should return None (runs the server)
        assert result is None
