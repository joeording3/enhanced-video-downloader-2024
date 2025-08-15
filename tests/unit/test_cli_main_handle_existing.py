import types

import psutil
import pytest

import server.cli_main as cli


def test_handle_existing_stale_nosuchprocess(monkeypatch: pytest.MonkeyPatch) -> None:
    removed = {"called": False}

    class DummyProc:
        def __init__(self, pid: int):
            raise psutil.NoSuchProcess(pid)

    monkeypatch.setattr(cli.psutil, "Process", DummyProc, raising=True)
    monkeypatch.setattr(cli, "remove_lock_file_cli", lambda: removed.__setitem__("called", True), raising=True)

    cli._cli_handle_existing_server((123, 8080), True, "127.0.0.1", 8080, False)
    assert removed["called"] is True


def test_handle_existing_not_running_removes_lock(monkeypatch: pytest.MonkeyPatch) -> None:
    removed = {"called": False}

    class DummyProc:
        def __init__(self, pid: int):
            self._running = False

        def is_running(self) -> bool:
            return False

    monkeypatch.setattr(cli.psutil, "Process", DummyProc, raising=True)
    monkeypatch.setattr(cli, "remove_lock_file_cli", lambda: removed.__setitem__("called", True), raising=True)

    cli._cli_handle_existing_server((123, 8080), True, "127.0.0.1", 8080, False)
    assert removed["called"] is True


def test_handle_existing_same_port_no_force_exits(monkeypatch: pytest.MonkeyPatch) -> None:
    triggered = {"args": None}

    class DummyProc:
        def __init__(self, pid: int):
            self._running = True

        def is_running(self) -> bool:
            return True

    def fake_err(pid: int, host: str, port: int) -> None:
        triggered["args"] = (pid, host, port)
        raise SystemExit(1)

    monkeypatch.setattr(cli.psutil, "Process", DummyProc, raising=True)
    monkeypatch.setattr(cli, "_cli_error_already_running", fake_err, raising=True)

    with pytest.raises(SystemExit) as ei:
        cli._cli_handle_existing_server((222, 9090), True, "127.0.0.1", 9090, False)
    assert ei.value.code == 1
    assert triggered["args"] == (222, "127.0.0.1", 9090)


def test_handle_existing_same_port_force_calls_force_stop(monkeypatch: pytest.MonkeyPatch) -> None:
    called = {"force": False}

    class DummyProc:
        def __init__(self, pid: int):
            self.pid = 222

        def is_running(self) -> bool:
            return True

    def fake_force(proc, host: str, port: int) -> None:
        called["force"] = True

    monkeypatch.setattr(cli.psutil, "Process", DummyProc, raising=True)
    monkeypatch.setattr(cli, "_cli_force_stop", fake_force, raising=True)

    cli._cli_handle_existing_server((222, 8080), True, "127.0.0.1", 8080, True)
    assert called["force"] is True


def test_handle_existing_different_port_in_use_exits(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_exit(code: int) -> None:  # type: ignore[no-redef]
        raise SystemExit(code)

    class DummyProc:
        def __init__(self, pid: int):
            self.pid = 333

        def is_running(self) -> bool:
            return True

    monkeypatch.setattr(cli.psutil, "Process", DummyProc, raising=True)
    monkeypatch.setattr(cli, "sys", types.SimpleNamespace(exit=fake_exit))

    with pytest.raises(SystemExit) as ei:
        cli._cli_handle_existing_server((333, 7000), True, "127.0.0.1", 8000, False)
    assert ei.value.code == 1


def test_cli_force_stop_port_still_in_use_exits(monkeypatch: pytest.MonkeyPatch) -> None:
    called = {"killed": False, "removed": False, "exit": None}

    def fake_kill(procs):
        called["killed"] = True

    def fake_remove():
        called["removed"] = True

    def fake_in_use(port: int, host: str) -> bool:
        return True

    def fake_exit(code: int) -> None:  # type: ignore[no-redef]
        called["exit"] = code
        raise SystemExit(code)

    monkeypatch.setattr(cli, "kill_processes_cli", fake_kill, raising=True)
    monkeypatch.setattr(cli, "remove_lock_file_cli", fake_remove, raising=True)
    monkeypatch.setattr(cli, "is_port_in_use", fake_in_use, raising=True)
    monkeypatch.setattr(cli, "sys", types.SimpleNamespace(exit=fake_exit))
    with pytest.raises(SystemExit) as ei:
        cli._cli_force_stop(psutil.Process(), "127.0.0.1", 9999)
    assert ei.value.code == 1
    assert called["killed"] is True
    assert called["removed"] is True
