from pathlib import Path

import pytest

import server.cli_main as cli


def test_cli_assert_no_port_conflict_exits(monkeypatch: pytest.MonkeyPatch) -> None:
    called = {"code": None}

    def fake_exit(code: int) -> None:  # type: ignore[no-redef]
        called["code"] = code
        raise SystemExit(code)

    monkeypatch.setattr(cli, "sys", type("S", (), {"exit": staticmethod(fake_exit)}))
    with pytest.raises(SystemExit):
        cli._cli_assert_no_port_conflict(None, True, "127.0.0.1", 8080)
    assert called["code"] == 1


def test_cli_get_existing_server_status(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cli, "get_lock_pid_port_cli", lambda _: (123, 8080), raising=True)
    monkeypatch.setattr(cli, "is_port_in_use", lambda _p, _h: False, raising=True)
    pid_port, in_use = cli._cli_get_existing_server_status("127.0.0.1", 8080)
    assert pid_port == (123, 8080)
    assert in_use is False


def test_resolve_download_dir_cli_override(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    class DummyCfg:
        def get_value(self, key: str, default=None):  # type: ignore[no-redef]
            return None

    target = tmp_path / "dl"
    result = cli._resolve_download_dir(DummyCfg(), str(target))
    assert Path(result).exists()
    assert Path(result).samefile(target)


def test_resolve_download_dir_default(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    class DummyCfg:
        def get_value(self, key: str, default=None):  # type: ignore[no-redef]
            return None

    # Redirect PROJECT_ROOT to a temp dir
    monkeypatch.setattr(cli, "PROJECT_ROOT", tmp_path, raising=True)
    result = cli._resolve_download_dir(DummyCfg(), None)
    assert Path(result).exists()
    assert result.endswith("user_downloads")

