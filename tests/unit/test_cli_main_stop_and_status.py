import types

import click
import pytest

import server.cli_main as cli


class DummyProc:
    def __init__(self, pid: int, running: bool = True):
        self.pid = pid
        self._running = running

    def is_running(self) -> bool:
        return self._running

    def terminate(self) -> None:
        self._running = False

    def wait(self, timeout: float | None = None) -> None:
        self._running = False


def test_cli_stop_pre_checks_no_entities_removes_stale_lock(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    lock = tmp_path / "lock"
    monkeypatch.setattr(cli, "LOCK_PATH", lock, raising=True)
    # No processes found
    monkeypatch.setattr(cli, "find_server_processes_cli", list, raising=True)
    monkeypatch.setattr(cli, "find_server_processes", list, raising=True)
    # Prevent fallback psutil scan from discovering real processes
    monkeypatch.setattr(cli.psutil, "process_iter", lambda *_a, **_k: iter(()), raising=True)
    # Lock shows no pid/port
    monkeypatch.setattr(cli, "get_lock_pid_port_cli", lambda p: None, raising=True)
    removed = {"called": False}
    monkeypatch.setattr(
        cli,
        "remove_lock_file_cli",
        lambda: removed.__setitem__("called", True),
        raising=True,
    )
    # Create a stale lock to trigger removal branch
    lock.write_text("999:1234")
    entities = cli._cli_stop_pre_checks()
    assert entities == []
    assert removed["called"] is True


def test_cli_stop_pre_checks_collects_entities(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    lock = tmp_path / "lock"
    monkeypatch.setattr(cli, "LOCK_PATH", lock, raising=True)
    # Scanned processes include two, lock file adds a third
    p1 = DummyProc(100)
    p2 = DummyProc(200)
    monkeypatch.setattr(cli, "find_server_processes", lambda: [p1, p2], raising=True)
    monkeypatch.setattr(
        cli,
        "find_server_processes_cli",
        lambda: [{"pid": 300}],
        raising=True,
    )
    # psutil.Process should return a running proc for 300
    monkeypatch.setattr(cli.psutil, "Process", lambda pid: DummyProc(pid), raising=True)
    # No extra fallback
    monkeypatch.setattr(
        cli.Config,
        "load",
        staticmethod(lambda: types.SimpleNamespace(get_value=lambda k: None)),
        raising=True,
    )
    entities = cli._cli_stop_pre_checks()
    pids = sorted(p.pid for p in entities)
    assert pids == [100, 200, 300]


def test_run_stop_server_enhanced_invokes_helpers(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cli, "_cli_stop_pre_checks", lambda: [DummyProc(1)], raising=True)
    flags = {"term": False, "clean": False}
    monkeypatch.setattr(
        cli,
        "_cli_stop_terminate_enhanced",
        lambda procs, timeout, force: flags.__setitem__("term", True),
        raising=True,
    )
    monkeypatch.setattr(
        cli,
        "_cli_stop_cleanup_enhanced",
        lambda: flags.__setitem__("clean", True),
        raising=True,
    )
    # Capture click.echo
    echoed = {"count": 0}
    monkeypatch.setattr(
        click,
        "echo",
        lambda *a, **k: echoed.__setitem__("count", echoed["count"] + 1),
        raising=True,
    )
    cli._run_stop_server_enhanced(timeout=1, force=False)
    assert flags["term"] is True and flags["clean"] is True and echoed["count"] >= 1


def test_cli_stop_terminate_enhanced_graceful_flow(monkeypatch: pytest.MonkeyPatch) -> None:
    p1 = DummyProc(10)
    p2 = DummyProc(10)  # duplicate PID to test de-dupe
    p3 = DummyProc(20)
    flags = {"grace": False, "verify": False}
    monkeypatch.setattr(
        cli,
        "_graceful_terminate_processes",
        lambda procs, timeout: flags.__setitem__("grace", True),
        raising=True,
    )
    monkeypatch.setattr(
        cli,
        "_verify_processes_stopped",
        lambda procs: flags.__setitem__("verify", True),
        raising=True,
    )
    cli._cli_stop_terminate_enhanced([p1, p2, p3], timeout=0, force=False)
    assert flags["grace"] is True and flags["verify"] is True


def test_graceful_terminate_processes_kill_on_timeout(monkeypatch: pytest.MonkeyPatch) -> None:
    # terminate flips running to False but we keep timeout short to force kill path
    p1 = DummyProc(1)
    p2 = DummyProc(2)
    killed = {"called": False}
    monkeypatch.setattr(
        cli,
        "kill_processes_cli",
        lambda procs: killed.__setitem__("called", True),
        raising=True,
    )
    # Force timeout path
    cli._graceful_terminate_processes([p1, p2], timeout=0)
    assert killed["called"] is True


def test_cli_stop_cleanup_enhanced_variants(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    lock = tmp_path / "lock"
    meta = tmp_path / "meta.json"
    monkeypatch.setattr(cli, "LOCK_PATH", lock, raising=True)
    monkeypatch.setattr(cli, "LOCK_META_PATH", meta, raising=True)
    # Scenario 1: active pid in lock info -> echo warning path
    lock.write_text("123:8080")
    monkeypatch.setattr(cli, "get_lock_pid_port_cli", lambda p: (123, 8080), raising=True)
    monkeypatch.setattr(cli.psutil, "pid_exists", lambda pid: True, raising=True)
    cli._cli_stop_cleanup_enhanced()
    # Scenario 2: remove lock file and metadata
    lock.write_text("123:8080")
    meta.write_text("{}")
    monkeypatch.setattr(cli, "get_lock_pid_port_cli", lambda p: (None, None), raising=True)
    monkeypatch.setattr(cli.os.path, "exists", lambda p: True, raising=False)
    # pid None leads to removal if lock exists
    monkeypatch.setattr(cli, "remove_lock_file_cli", lambda: lock.unlink(missing_ok=True), raising=True)
    cli._cli_stop_cleanup_enhanced()
    assert not meta.exists()


def test_run_server_status_enhanced_json(monkeypatch: pytest.MonkeyPatch) -> None:
    # Provide lock pid/port and valid process
    monkeypatch.setattr(cli, "get_lock_pid_port_cli", lambda p: (111, 9090), raising=True)

    class P:
        def __init__(self, pid: int):
            pass

        def is_running(self) -> bool:
            return True

        def cmdline(self):
            return ["python", "-m", "server.__main__"]

        def status(self):
            return "running"

        def cpu_percent(self):
            return 0.0

        def memory_info(self):
            return types.SimpleNamespace(rss=12345)

        def io_counters(self):  # type: ignore[attr-defined]
            return types.SimpleNamespace(read_bytes=1, write_bytes=2)

    monkeypatch.setattr(cli.psutil, "Process", P, raising=True)
    # Capture echo output
    captured = {"text": None}
    monkeypatch.setattr(click, "echo", lambda t: captured.__setitem__("text", t), raising=True)
    # JSON mode
    ctx = types.SimpleNamespace(obj={"config_path": "<env>"})
    cli._run_server_status_enhanced(ctx, detailed=True, json_output=True)
    assert captured["text"] and '"pid": 111' in captured["text"]


def test_run_server_status_no_lock_orphaned_exits(monkeypatch: pytest.MonkeyPatch) -> None:
    # No lock info; orphaned list populated
    monkeypatch.setattr(cli, "get_lock_pid_port_cli", lambda p: None, raising=True)
    monkeypatch.setattr(
        cli,
        "find_server_processes_cli",
        lambda: [{"pid": 1, "port": 2, "uptime": 3}],
        raising=True,
    )
    # Capture echo and exit
    monkeypatch.setattr(click, "echo", lambda t: None, raising=True)
    exit_called = {"code": None}

    def fake_exit(code: int) -> None:  # type: ignore[no-redef]
        exit_called["code"] = code
        raise SystemExit(code)

    monkeypatch.setattr(cli, "sys", types.SimpleNamespace(exit=fake_exit))
    ctx = types.SimpleNamespace(obj={"config_path": "<env>"})
    with pytest.raises(SystemExit):
        cli._run_server_status_enhanced(ctx, detailed=False, json_output=False)
    assert exit_called["code"] == 0
