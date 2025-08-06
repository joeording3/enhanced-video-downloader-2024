import os
import signal
import types
from pathlib import Path
from types import SimpleNamespace
from typing import Any, List

from pytest import MonkeyPatch

import server.__main__ as main_mod
from server.constants import get_server_port


def test_remove_part_files(tmp_path: Path) -> None:
    """Test removal of .part files from disk."""
    file = tmp_path / "file.part"
    file.write_text("")
    assert file.exists()
    main_mod._remove_part_files([file])
    assert not file.exists()


def test_is_potential_server_process_and_uses_port() -> None:
    """Test process identification and port usage logic for server processes."""

    # Dummy process with name, cmdline, and net_connections
    class DummyConn:
        def __init__(self, port: int) -> None:
            self.laddr = types.SimpleNamespace(port=port)

    class DummyProc:
        def __init__(self, name: str, cmdline: List[str], conns: List[DummyConn]) -> None:
            self.info = {"name": name, "cmdline": cmdline}
            self._conns = conns

        def net_connections(self, kind: str) -> List[DummyConn]:
            return self._conns

    # Not a python process
    p1 = DummyProc("bash", ["server"], [])
    assert not main_mod._is_potential_server_process(p1)  # type: ignore[arg-type]

    # Python but no 'server' in cmdline
    p2 = DummyProc("python", ["foo", "bar"], [])
    assert not main_mod._is_potential_server_process(p2)  # type: ignore[arg-type]

    # Python with 'server' in cmdline
    p3 = DummyProc("python", ["foo", "server", "bar"], [])
    assert main_mod._is_potential_server_process(p3)  # type: ignore[arg-type]

    # Test port usage
    conn_match = DummyConn(get_server_port())
    conn_nomatch = DummyConn(get_server_port() + 1)
    p4 = DummyProc("python", ["server"], [conn_nomatch, conn_match])
    assert main_mod._process_uses_port(p4, get_server_port())  # type: ignore[arg-type]
    assert not main_mod._process_uses_port(p4, get_server_port() - 1)  # type: ignore[arg-type]


def test_register_signal_handlers(monkeypatch: MonkeyPatch) -> None:
    """Test registration of signal handlers for graceful shutdown."""
    called = {}

    def fake_signal(sig: Any, handler: Any) -> None:
        called[sig] = handler

    monkeypatch.setattr(signal, "signal", fake_signal)
    main_mod._register_signal_handlers()
    assert called[signal.SIGINT] == main_mod.graceful_shutdown
    assert called[signal.SIGTERM] == main_mod.graceful_shutdown


def test_cleanup_orphaned_processes(monkeypatch: MonkeyPatch) -> None:
    """Test cleanup of orphaned processes by killing non-current PIDs."""
    fake_pids = [1, os.getpid(), 3]
    monkeypatch.setattr(main_mod, "find_orphaned_processes", lambda port: fake_pids)
    calls: List[int] = []

    def fake_kill_process(pid: int) -> bool:
        calls.append(pid)
        return True

    monkeypatch.setattr(main_mod, "kill_process", fake_kill_process)
    main_mod._cleanup_orphaned_processes(get_server_port())
    assert 1 in calls and 3 in calls
    assert os.getpid() not in calls


def test_prepare_server_lock(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Test server lock preparation and port assignment logic."""
    cfg = SimpleNamespace()
    cfg.set = lambda key, val: setattr(cfg, "server_port", val)
    cfg.save = lambda: None
    host = "127.0.0.1"
    port = get_server_port()

    class FakeSock:
        def setsockopt(self, *args: Any, **kwargs: Any) -> None:
            pass

        def connect_ex(self, addr: Any) -> int:
            return 0

        def __enter__(self) -> "FakeSock":
            return self

        def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
            pass

    monkeypatch.setattr(main_mod, "closing", lambda sock: sock)
    import socket as _socket

    monkeypatch.setattr(_socket, "socket", lambda *args, **kwargs: FakeSock())
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.setattr(main_mod, "get_lock_file_path", lambda: tmp_path / "lock")
    monkeypatch.setattr(main_mod, "create_lock_file", lambda path, p: "lh")
    monkeypatch.setattr(main_mod, "find_available_port", lambda start, count, host: port + 1)
    lock_handle, final_port = main_mod._prepare_server_lock(cfg, host, port)  # type: ignore[arg-type]
    assert lock_handle == "lh"
    assert final_port == port + 1
    assert cfg.server_port == port + 1


def test_run_flask_server(monkeypatch: MonkeyPatch) -> None:
    """Test running Flask server and lock cleanup logic."""
    calls: List[Any] = []

    class DummyApp:
        def run(self, host: str, port: int, debug: bool, use_reloader: bool) -> None:
            calls.append((host, port, debug, use_reloader))

    monkeypatch.setattr(main_mod, "create_app", lambda cfg: DummyApp())
    monkeypatch.setattr(main_mod, "cleanup_lock_file", lambda lh: calls.append(("cleanup", lh)))
    cfg = None
    host = "127.0.0.1"
    port = get_server_port()
    lh = "lockh"
    main_mod._run_flask_server(cfg, host, port, lh)  # type: ignore[arg-type]
    assert ("cleanup", lh) in calls
    assert (host, port, False, False) in calls
