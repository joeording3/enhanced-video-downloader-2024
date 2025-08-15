import socket
from pathlib import Path

import psutil
import pytest

import server.cli_helpers as ch


def test_is_port_in_use_free_and_bound() -> None:
    # Find an ephemeral port that is free
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    free_port = s.getsockname()[1]
    s.close()
    assert ch.is_port_in_use(free_port, "127.0.0.1") is False

    # Bind a new socket to occupy a port
    s2 = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s2.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s2.bind(("127.0.0.1", 0))
    bound_port = s2.getsockname()[1]
    s2.listen(1)
    try:
        assert ch.is_port_in_use(bound_port, "127.0.0.1") is True
    finally:
        s2.close()


def test_read_lock_file_valid_and_invalid(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    lock = tmp_path / "lock"
    monkeypatch.setattr(ch, "LOCK_FILE", lock, raising=True)

    lock.write_text("123:456")
    data = ch.read_lock_file()
    assert data == {"pid": 123, "port": 456}

    lock.write_text("oops")
    data2 = ch.read_lock_file()
    assert data2 == {"pid": None, "port": None}


def test_is_server_running_patterns(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    lock = tmp_path / "lock"
    lock.write_text("7777:9999")
    monkeypatch.setenv("LOCK_FILE", str(lock))

    # Case: videodownloader-server
    monkeypatch.setattr(ch.psutil, "pid_exists", lambda pid: True, raising=True)

    class P:
        def __init__(self, pid: int):
            pass

        def cmdline(self):
            return ["videodownloader-server", "start"]

    monkeypatch.setattr(ch.psutil, "Process", P, raising=True)
    assert ch.is_server_running() is True


def test_is_server_running_python_module(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    lock = tmp_path / "lock"
    lock.write_text("5555:8888")
    monkeypatch.setenv("LOCK_FILE", str(lock))
    monkeypatch.setattr(ch.psutil, "pid_exists", lambda pid: True, raising=True)

    class P2:
        def __init__(self, pid: int):
            pass

        def cmdline(self):
            return ["python", "-m", "server.__main__"]

    monkeypatch.setattr(ch.psutil, "Process", P2, raising=True)
    assert ch.is_server_running() is True


def test_is_server_running_non_server(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    lock = tmp_path / "lock"
    lock.write_text("4444:7777")
    monkeypatch.setenv("LOCK_FILE", str(lock))
    monkeypatch.setattr(ch.psutil, "pid_exists", lambda pid: True, raising=True)

    class P3:
        def __init__(self, pid: int):
            pass

        def cmdline(self):
            return ["bash", "-c", "sleep 10"]

    monkeypatch.setattr(ch.psutil, "Process", P3, raising=True)
    assert ch.is_server_running() is False


def test_get_lock_pid_port_cli_wrapper(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ch, "_get_lock_pid_port", lambda _p: (1, 2), raising=True)
    assert ch.get_lock_pid_port_cli(Path("/tmp/x")) == (1, 2)


def test_find_video_downloader_agents_cli_wrapper(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ch, "find_video_downloader_agents", lambda: ["/a/b", "/c/d"], raising=True)
    res = ch.find_video_downloader_agents_cli()
    assert [str(p) for p in res] == ["/a/b", "/c/d"]


def test_find_available_port_invalid_range_raises() -> None:
    with pytest.raises(ch.InvalidPortRangeError):
        ch.find_available_port(1000, 999)


def test_find_available_port_valid(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(ch, "core_find_available_port", lambda start, count, host=None: start, raising=True)
    assert ch.find_available_port(1234, 1240) == 1234


def test_wait_for_server_start_cli_true(monkeypatch: pytest.MonkeyPatch) -> None:
    class _CM:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    import socket as _s

    monkeypatch.setattr(_s, "create_connection", lambda addr, timeout=1: _CM())
    # Patch module reference
    monkeypatch.setattr(ch, "socket", _s, raising=True)
    assert ch.wait_for_server_start_cli(9, host="127.0.0.1", timeout=1) is True


def test_tail_server_logs_no_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    path = tmp_path / "nope.log"
    monkeypatch.setattr(ch, "SERVER_LOG_PATH", path, raising=True)
    # Should simply return without error
    ch.tail_server_logs()


def test_handle_existing_instance_stale_lock(monkeypatch: pytest.MonkeyPatch) -> None:
    removed = {"called": False}
    monkeypatch.setattr(ch, "get_lock_pid_port_cli", lambda p: (111, 8080), raising=True)
    monkeypatch.setattr(ch, "is_port_in_use", lambda port, host: True, raising=True)

    class DummyProc:
        def __init__(self, pid: int):
            raise psutil.NoSuchProcess(pid)

    monkeypatch.setattr(ch.psutil, "Process", DummyProc, raising=True)
    monkeypatch.setattr(ch, "remove_lock_file_cli", lambda: removed.__setitem__("called", True), raising=True)

    ch.handle_existing_instance(Path("/tmp/lock"), "127.0.0.1", 8080, False, ch.helper_log)
    assert removed["called"] is True


def test_handle_existing_instance_force_stops(monkeypatch: pytest.MonkeyPatch) -> None:
    actions = {"killed": False, "removed": False}

    class P:
        def __init__(self, pid: int):
            self._running = True

        def is_running(self) -> bool:
            return True

    monkeypatch.setattr(ch, "get_lock_pid_port_cli", lambda p: (222, 9090), raising=True)
    # First check returns True; after kill/remove, return False to avoid sys.exit
    calls = {"n": 0}

    def in_use(port: int, host: str) -> bool:
        calls["n"] += 1
        return calls["n"] == 1

    monkeypatch.setattr(ch, "is_port_in_use", in_use, raising=True)
    monkeypatch.setattr(ch.psutil, "Process", P, raising=True)

    def fake_kill(procs):
        actions["killed"] = True

    def fake_remove():
        actions["removed"] = True

    monkeypatch.setattr(ch, "kill_processes_cli", fake_kill, raising=True)
    monkeypatch.setattr(ch, "remove_lock_file_cli", fake_remove, raising=True)

    ch.handle_existing_instance(Path("/tmp/lock"), "127.0.0.1", 9090, True, ch.helper_log)
    assert actions["killed"] is True
    assert actions["removed"] is True

