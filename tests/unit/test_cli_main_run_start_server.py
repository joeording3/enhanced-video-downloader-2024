import click
import pytest

import server.cli_main as cli
import server.constants as consts


class DummyCfg:
    def __init__(self, host=None, port=None, download_dir=None):
        self._host = host
        self._port = port
        self._dl = download_dir

    def get_value(self, key: str, default=None):
        if key == "server_host":
            return self._host
        if key == "server_port":
            return self._port
        if key == "download_dir":
            return self._dl
        return default


class DummyCtx:
    def __init__(self, param_sources=None):
        self._param_sources = param_sources or {}
        self.obj = {"config_path": "<env>"}

    def get_parameter_source(self, name: str):
        # Return click.core.ParameterSource if provided, else raise to exercise fallback
        if name in self._param_sources:
            return self._param_sources[name]
        raise RuntimeError("no source")


def test_run_start_server_env_flags_auto_port_daemon(monkeypatch: pytest.MonkeyPatch) -> None:
    # Environment flags
    monkeypatch.setenv("EVD_GUNICORN", "1")
    monkeypatch.setenv("EVD_VERBOSE", "true")
    monkeypatch.setenv("EVD_WORKERS", "3")

    # Config returns no host/port/dl so defaults resolve, and constants path used
    monkeypatch.setattr(cli, "_cli_load_config", lambda ctx: DummyCfg(), raising=True)
    monkeypatch.setattr(consts, "get_server_port", lambda: 5000, raising=True)

    # Simulate port in use by other app so auto-port triggers
    monkeypatch.setattr(cli, "_cli_get_existing_server_status", lambda h, p: (None, True), raising=True)
    monkeypatch.setattr(cli, "find_available_port", lambda start, span, host=None: start + 5, raising=True)

    # Recorders for checks and execution
    seen = {"pre": None, "cmd": None, "daemon": None}
    monkeypatch.setattr(
        cli,
        "_cli_pre_start_checks",
        lambda host, port, force: seen.__setitem__("pre", (host, port, force)),
        raising=True,
    )
    monkeypatch.setattr(
        cli,
        "_cli_build_command",
        lambda cfg, host, port, gunicorn, workers: seen.__setitem__("cmd", (host, port, gunicorn, workers)) or ["ok"],
        raising=True,
    )
    monkeypatch.setattr(cli, "_write_lock_metadata", lambda data: None, raising=True)
    monkeypatch.setattr(
        cli,
        "_cli_execute_daemon",
        lambda cmd, host, port: seen.__setitem__("daemon", (tuple(cmd), host, port)),
        raising=True,
    )

    ctx = DummyCtx()
    cli._run_start_server(
        ctx,
        daemon=True,
        host=None,
        port=None,
        download_dir=None,
        gunicorn=False,
        workers=None,
        verbose=False,
        force=False,
        timeout=5,
        retry_attempts=1,
        auto_port=True,
    )

    # Auto-port should have adjusted to 5006 (start 5000 -> +1 -> find_available_port returns +5)
    assert seen["pre"] == ("127.0.0.1", 5006, False)
    # Env flags should set gunicorn True and workers 3
    assert seen["cmd"] == ("127.0.0.1", 5006, True, 3)
    assert seen["daemon"] == (("ok",), "127.0.0.1", 5006)


def test_run_start_server_cli_workers_override_foreground(monkeypatch: pytest.MonkeyPatch) -> None:
    # No env flags
    monkeypatch.delenv("EVD_GUNICORN", raising=False)
    monkeypatch.delenv("EVD_VERBOSE", raising=False)
    monkeypatch.setenv("EVD_WORKERS", "2")  # will be overridden by CLI workers when provided

    # Config resolves explicit host/port and download dir
    monkeypatch.setattr(
        cli,
        "_cli_load_config",
        lambda ctx: DummyCfg(host="0.0.0.0", port=5050, download_dir=None),
        raising=True,
    )

    # ParameterSource: simulate CLI provided workers
    param_src = click.core.ParameterSource.COMMANDLINE
    ctx = DummyCtx(param_sources={"workers": param_src})

    # No port conflict
    monkeypatch.setattr(cli, "_cli_pre_start_checks", lambda host, port, force: None, raising=True)

    seen = {"cmd": None, "fg": None}
    monkeypatch.setattr(
        cli,
        "_cli_build_command",
        lambda cfg, host, port, gunicorn, workers: seen.__setitem__("cmd", (host, port, gunicorn, workers)) or ["dev"],
        raising=True,
    )
    monkeypatch.setattr(cli, "_write_lock_metadata", lambda data: None, raising=True)
    monkeypatch.setattr(
        cli,
        "_cli_execute_foreground",
        lambda cmd, host, port: seen.__setitem__("fg", (tuple(cmd), host, port)),
        raising=True,
    )
    cli._run_start_server(
        ctx,
        daemon=False,
        host="0.0.0.0",
        port=5050,
        download_dir=None,
        gunicorn=False,
        workers=10,
        verbose=True,
        force=False,
        timeout=5,
        retry_attempts=1,
        auto_port=False,
    )

    # CLI workers should override env (10), gunicorn remains False
    assert seen["cmd"] == ("0.0.0.0", 5050, False, 10)
    assert seen["fg"] == (("dev",), "0.0.0.0", 5050)
