from pathlib import Path

import pytest

import server.cli_main as cli


class DummyPopen:
    def __init__(self, *_args, **_kwargs):
        self.pid = 4321

    def wait(self):
        return 0


def test_cli_execute_daemon_success(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    lock_path = tmp_path / "lock.txt"
    monkeypatch.setattr(cli, "LOCK_PATH", lock_path, raising=True)

    called = {"caddy": False, "exited": None}

    monkeypatch.setattr(cli.subprocess, "Popen", lambda *a, **k: DummyPopen(), raising=True)
    monkeypatch.setattr(cli, "wait_for_server_start_cli", lambda port, host, timeout=20: True, raising=True)
    monkeypatch.setattr(cli, "ensure_caddy_proxy_running", lambda **_k: called.__setitem__("caddy", True), raising=True)

    def fake_exit(code: int) -> None:  # type: ignore[no-redef]
        called["exited"] = code
        raise SystemExit(code)

    monkeypatch.setattr(cli, "sys", type("S", (), {"exit": staticmethod(fake_exit)}))

    with pytest.raises(SystemExit) as ei:
        cli._cli_execute_daemon(["python", "-m", "server.__main__"], "127.0.0.1", 7777)

    assert ei.value.code == 0
    assert called["exited"] == 0
    assert called["caddy"] is True
    assert lock_path.read_text().strip() == "4321:7777"


def test_cli_execute_foreground(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    lock_path = tmp_path / "lock.txt"
    monkeypatch.setattr(cli, "LOCK_PATH", lock_path, raising=True)

    called = {"caddy": False}

    monkeypatch.setattr(cli.subprocess, "Popen", lambda *a, **k: DummyPopen(), raising=True)
    monkeypatch.setattr(cli, "ensure_caddy_proxy_running", lambda **_k: called.__setitem__("caddy", True), raising=True)

    cli._cli_execute_foreground(["python", "-m", "server.__main__"], "127.0.0.1", 5555)

    assert called["caddy"] is True
    assert lock_path.read_text().strip() == "4321:5555"
