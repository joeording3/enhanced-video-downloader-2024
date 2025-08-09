"""Additional high-yield unit tests for server.cli_helpers to raise coverage."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

import pytest


class TestProcessAndLockHelpers:
    def test_find_server_processes_cli_happy_path(self, tmp_path: Path, monkeypatch: Any) -> None:
        import server.cli_helpers as h

        # Create a fake lock file and point module to it
        fake_lock = tmp_path / "server.lock"
        fake_lock.write_text("pidport")
        monkeypatch.setattr(h, "LOCK_FILE", fake_lock)

        # Mock underlying lock parsing and psutil
        monkeypatch.setattr(h, "_get_lock_pid_port", lambda _p: (12345, 5050))

        class Proc:
            def __init__(self, _pid: int) -> None:
                self._pid = _pid

            def create_time(self) -> float:  # pragma: no cover - simple shim
                return 1.0

        monkeypatch.setattr(h, "psutil", MagicMock(Process=lambda pid: Proc(pid)))

        procs = h.find_server_processes_cli()
        assert procs == [{"pid": 12345, "port": 5050, "uptime": pytest.approx(procs[0]["uptime"], rel=1)}]

    def test_find_server_processes_cli_no_lock(self, tmp_path: Path, monkeypatch: Any) -> None:
        import server.cli_helpers as h

        fake_lock = tmp_path / "missing.lock"  # does not exist
        monkeypatch.setattr(h, "LOCK_FILE", fake_lock)
        assert h.find_server_processes_cli() == []

    def test_create_get_remove_lock_file_wrappers(self, tmp_path: Path, monkeypatch: Any) -> None:
        import server.cli_helpers as h

        fake_lock = tmp_path / "server.lock"
        fake_lock.write_text("")
        monkeypatch.setattr(h, "LOCK_FILE", fake_lock)

        called: dict[str, Any] = {}
        monkeypatch.setattr(h, "_create_lock_file", lambda p, port: called.setdefault("create", (p, port)))
        monkeypatch.setattr(h, "_get_lock_pid", lambda p: 321)

        def fake_remove(_p: Path) -> None:
            called["remove"] = True

        monkeypatch.setattr(h, "_remove_lock", fake_remove)

        h.create_lock_file(9090)
        assert called["create"][1] == 9090
        assert h.get_lock_pid() == 321
        assert h.remove_lock_file() is True


class TestSystemHelpers:
    @patch("server.cli_helpers.subprocess.Popen")
    def test_start_server_process_invokes_python_module(self, mock_popen: Any, monkeypatch: Any) -> None:
        import server.cli_helpers as h

        monkeypatch.setenv("SERVER_PORT", "")
        h.start_server_process(6001)
        args, kwargs = mock_popen.call_args
        assert args[0][0] == os.sys.executable
        assert "-m" in args[0] and "server" in args[0]
        assert kwargs["env"]["SERVER_PORT"] == "6001"

    @patch("server.cli_helpers.os.kill")
    def test_stop_process_by_pid_calls_os_kill(self, mock_kill: Any) -> None:
        import server.cli_helpers as h

        h.stop_process_by_pid(777)
        mock_kill.assert_called_once()

    def test_kill_processes_cli_terminates_and_kills(self) -> None:
        import server.cli_helpers as h

        proc1 = MagicMock()
        proc1.pid = 1
        proc1.is_running.side_effect = [True, False]
        proc2 = MagicMock()
        proc2.pid = 2
        proc2.is_running.return_value = False
        h.kill_processes_cli([proc1, proc2])
        assert proc1.terminate.called
        assert proc1.kill.called  # was running after first wait
        assert proc2.terminate.called

    @patch("server.cli_helpers.subprocess.run")
    def test_disable_launchagents_calls_launchctl_then_fallback(self, mock_run: Any, monkeypatch: Any) -> None:
        import server.cli_helpers as h

        fake_os = MagicMock()
        fake_os.name = "posix"
        monkeypatch.setattr(h, "os", fake_os)

        # First call raises, triggering fallback to systemctl
        mock_run.side_effect = [Exception("no launchctl"), None]
        h.disable_launchagents()
        assert mock_run.call_count == 2

    @patch("server.cli_helpers.subprocess.run")
    def test_tail_server_logs_spawns_tail_when_exists(self, mock_run: Any, tmp_path: Path, monkeypatch: Any) -> None:
        import server.cli_helpers as h

        fake_log = tmp_path / "server.log"
        fake_log.write_text("")
        monkeypatch.setattr(h, "LOG_FILE", fake_log)
        h.tail_server_logs()
        mock_run.assert_called()

    def test_wait_for_server_start_cli_success(self, monkeypatch: Any) -> None:
        import server.cli_helpers as h

        class DummySock:
            def __enter__(self) -> DummySock:  # pragma: no cover - trivial
                return self

            def __exit__(self, *_args: Any) -> None:  # pragma: no cover - trivial
                return None

        monkeypatch.setattr(h, "socket", MagicMock(create_connection=lambda *_a, **_k: DummySock()))
        assert h.wait_for_server_start_cli(12345, timeout=1) is True


class TestDownloaderHelpers:
    def test_extract_url_from_file_info_and_description(self, tmp_path: Path, caplog: Any) -> None:
        import server.cli_helpers as h

        info = tmp_path / "v.info.json"
        info.write_text('{"webpage_url": "https://example.com/v"}')
        assert h._extract_url_from_file(info, caplog) == "https://example.com/v"

        desc = tmp_path / "v.description"
        desc.write_text("some text https://example.org/x more")
        # For .description, pass a logger-like object
        import logging
        logger = logging.getLogger(__name__)
        assert h._extract_url_from_file(desc, logger) == "https://example.org/x"

    def test_determine_downloader_and_url_from_metadata(self, tmp_path: Path, caplog: Any) -> None:
        import server.cli_helpers as h

        part = tmp_path / "movie.mp4.part"
        part.write_text("")
        info = tmp_path / "movie.mp4.info.json"
        info.write_text('{"webpage_url": "https://example.com/movie"}')
        import logging
        logger = logging.getLogger(__name__)
        dtype, url = h._determine_downloader_and_url(part, logger)
        assert dtype == "yt-dlp" and url == "https://example.com/movie"

        # gallery-dl style
        part2 = tmp_path / "gallery.mp4.part"
        part2.write_text("")
        gjson = tmp_path / "gallery.mp4.json"
        gjson.write_text('{"url": "https://gallery.example/g"}')
        dtype2, url2 = h._determine_downloader_and_url(part2, logger)
        assert dtype2 == "gallery-dl" and url2 == "https://gallery.example/g"

    def test_build_resume_options_for_both_downloaders(self, tmp_path: Path) -> None:
        import server.cli_helpers as h

        opts_y = h._build_resume_options("yt-dlp", "https://ex", tmp_path, priority=5)
        assert opts_y.get("continuedl") is True and opts_y.get("nice") == 5

        opts_g = h._build_resume_options("gallery-dl", "https://ex", tmp_path, priority=7)
        assert opts_g.get("directory") == str(tmp_path)
        assert opts_g.get("continue") is True and opts_g.get("nice") == "7"


