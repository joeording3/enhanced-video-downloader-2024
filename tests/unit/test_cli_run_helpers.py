import importlib.util
from pathlib import Path
from typing import Any

# Dynamically load the server/cli_main.py module to access helper functions
_cli_file_path = str(Path(__file__).parent.parent.parent / "server" / "cli_main.py")
_spec = importlib.util.spec_from_file_location("server_cli_module", _cli_file_path)
if _spec is None or _spec.loader is None:
    raise ImportError(f"Could not load module from {_cli_file_path}")
cli_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(cli_module)


class DummyCtx:
    """Dummy context object for testing _run_start_server."""


def test_run_start_server_daemon(monkeypatch: Any) -> None:
    """Test server start in daemon mode with proper function calls and parameter passing."""
    calls: dict[str, Any] = {}
    monkeypatch.setattr(cli_module, "_cli_load_config", lambda ctx: "cfg_obj")
    monkeypatch.setattr(cli_module, "_cli_set_logging", lambda verbose: calls.setdefault("logging", verbose))
    monkeypatch.setattr(
        cli_module, "_resolve_start_params", lambda cfg, host, port, download_dir: ("hostX", 9999, "download_dirX")
    )
    monkeypatch.setattr(cli_module, "_cli_pre_start_checks", lambda h, p, f: calls.setdefault("pre_start", (h, p, f)))
    monkeypatch.setattr(cli_module, "_cli_build_command", lambda cfg, h, p, gunicorn, workers: ["cmd_arg"])
    monkeypatch.setattr(cli_module, "_cli_execute_daemon", lambda cmd, h, p: calls.setdefault("daemon", (cmd, h, p)))
    monkeypatch.setattr(
        cli_module, "_cli_execute_foreground", lambda cmd, h, p: calls.setdefault("foreground", (cmd, h, p))
    )

    # Call helper with daemon=True
    cli_module._run_start_server(
        ctx=DummyCtx(),
        daemon=True,
        host="h0",
        port=1234,
        download_dir="d0",
        gunicorn=False,
        workers=1,
        verbose=True,
        force=False,
    )

    assert "daemon" in calls
    assert calls["daemon"] == (["cmd_arg"], "hostX", 9999)
    assert "foreground" not in calls


def test_run_start_server_foreground(monkeypatch: Any) -> None:
    """Test server start in foreground mode with proper function calls and parameter passing."""
    calls: dict[str, Any] = {}
    monkeypatch.setattr(cli_module, "_cli_load_config", lambda ctx: None)
    monkeypatch.setattr(cli_module, "_cli_set_logging", lambda verbose: calls.setdefault("logging", verbose))
    monkeypatch.setattr(
        cli_module, "_resolve_start_params", lambda cfg, host, port, download_dir: ("hY", 8888, "download_dirY")
    )
    monkeypatch.setattr(cli_module, "_cli_pre_start_checks", lambda h, p, f: calls.setdefault("pre_start", (h, p, f)))
    monkeypatch.setattr(cli_module, "_cli_build_command", lambda cfg, h, p, gunicorn, workers: ["cmd_arg2"])
    monkeypatch.setattr(cli_module, "_cli_execute_daemon", lambda cmd, h, p: calls.setdefault("daemon", (cmd, h, p)))
    monkeypatch.setattr(
        cli_module, "_cli_execute_foreground", lambda cmd, h, p: calls.setdefault("foreground", (cmd, h, p))
    )

    # Call helper with daemon=False
    cli_module._run_start_server(
        ctx=None,
        daemon=False,
        host=None,
        port=None,
        download_dir=None,
        gunicorn=True,
        workers=5,
        verbose=False,
        force=True,
    )

    assert "foreground" in calls
    assert calls["foreground"] == (["cmd_arg2"], "hY", 8888)
    assert "daemon" not in calls


def test_run_stop_server_no_entities(monkeypatch: Any) -> None:
    """Test server stop when no entities are found to terminate."""
    calls: dict[str, Any] = {}
    monkeypatch.setattr(cli_module, "_cli_stop_pre_checks", list)
    monkeypatch.setattr(
        cli_module,
        "_cli_stop_terminate_enhanced",
        lambda entities, timeout, force: calls.setdefault("terminate", entities),
    )
    monkeypatch.setattr(cli_module, "_cli_stop_cleanup_enhanced", lambda: calls.setdefault("cleanup", True))

    cli_module._run_stop_server_enhanced(timeout=30, force=False)
    assert "terminate" not in calls
    assert "cleanup" not in calls


def test_run_stop_server_with_entities(monkeypatch: Any) -> None:
    """Test server stop when entities are found and termination/cleanup is performed."""
    calls: dict[str, Any] = {}
    monkeypatch.setattr(cli_module, "_cli_stop_pre_checks", lambda: ["proc1", "proc2"])
    monkeypatch.setattr(
        cli_module,
        "_cli_stop_terminate_enhanced",
        lambda entities, timeout, force: calls.setdefault("terminate", entities),
    )
    monkeypatch.setattr(cli_module, "_cli_stop_cleanup_enhanced", lambda: calls.setdefault("cleanup", True))

    cli_module._run_stop_server_enhanced(timeout=30, force=False)
    assert calls["terminate"] == ["proc1", "proc2"]
    assert calls["cleanup"] is True
