import pytest

import server.cli_main as cli


def test_normalize_host_valid_and_invalid() -> None:
    assert cli._normalize_host("127.0.0.1") == "127.0.0.1"
    # An obviously invalid host should fallback
    assert cli._normalize_host("") == "127.0.0.1"


def test_resolve_start_params_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    class DummyCfg:
        def get_value(self, key: str, default=None):  # type: ignore[no-redef]
            if key == "server_host":
                return None
            if key == "server_port":
                return None
            if key == "download_dir":
                return None
            return default

    # Ensure constants.get_server_port returns fixed value
    import server.constants as consts

    monkeypatch.setattr(consts, "get_server_port", lambda: 9999, raising=True)

    h, p, d = cli._resolve_start_params(DummyCfg(), None, None, None)
    assert h == "127.0.0.1"
    assert p == 9999
    assert isinstance(d, str) and d.endswith("user_downloads")


def test_cli_build_command_development(monkeypatch: pytest.MonkeyPatch) -> None:
    class DummyCfg:
        def get_value(self, key: str, default=None):  # type: ignore[no-redef]
            return None

    cmd = cli._cli_build_command(DummyCfg(), "127.0.0.1", 8080, gunicorn=False, workers=1)
    # Expect python -m server.__main__ ...
    assert cmd[:4] == ["python", "-m", "server.__main__", "--host"]


def test_cli_build_command_gunicorn(monkeypatch: pytest.MonkeyPatch) -> None:
    class DummyCfg:
        def get_value(self, key: str, default=None):  # type: ignore[no-redef]
            return None

    # Stub resolve_log_path to avoid FS dependency
    import server.logging_setup as logs

    monkeypatch.setattr(
        logs,
        "resolve_log_path",
        lambda a, b, c, purpose="manage": a / "server_output.log",
        raising=True,
    )

    cmd = cli._cli_build_command(DummyCfg(), "127.0.0.1", 8080, gunicorn=True, workers=2)
    assert cmd[0] == "gunicorn"
    assert any("--bind=127.0.0.1:8080" in x for x in cmd)

