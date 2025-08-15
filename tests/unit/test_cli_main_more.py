from pathlib import Path

import pytest

import server.cli_main as cli


def test_write_and_read_lock_metadata(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    # Point LOCK_META_PATH to temp file
    monkeypatch.setattr(cli, "LOCK_META_PATH", tmp_path / "lock.json", raising=True)

    data = {
        "host": "127.0.0.1",
        "port": 8080,
        "gunicorn": True,
        "daemon": False,
        "workers": 2,
        "verbose": True,
        "cmd": "x",
    }
    cli._write_lock_metadata(data)
    read = cli._read_lock_metadata()
    assert read is not None and read.get("port") == 8080


def test_wait_for_port_release(monkeypatch: pytest.MonkeyPatch) -> None:
    # Force is_port_in_use to return True once then False
    calls = {"n": 0}

    def fake_in_use(port: int, host: str) -> bool:  # type: ignore[no-redef]
        calls["n"] += 1
        return calls["n"] == 1

    monkeypatch.setattr(cli, "is_port_in_use", fake_in_use, raising=True)

    assert cli._wait_for_port_release("127.0.0.1", 9999, timeout=1) is True

