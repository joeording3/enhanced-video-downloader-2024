from pathlib import Path

from server.logging_setup import resolve_log_path


def test_resolve_log_path_read_in_repo(tmp_path: Path, monkeypatch) -> None:
    # Simulate repo root by creating pyproject.toml
    (tmp_path / "pyproject.toml").write_text("[tool.poetry]\nname='x'\n")
    # When purpose=read and env set in real repo, env path is returned; else placeholder
    p = resolve_log_path(tmp_path, env_value=str(tmp_path / "env.log"), cfg_value=None, purpose="read")
    assert p == tmp_path / "env.log"
    p2 = resolve_log_path(tmp_path, env_value=None, cfg_value=None, purpose="read")
    assert p2 == tmp_path / "__no_such_log_file__.log"


def test_resolve_log_path_read_in_tests(tmp_path: Path) -> None:
    # No pyproject -> tests path
    p = resolve_log_path(tmp_path, env_value=str(tmp_path / "env.log"), cfg_value=None, purpose="read")
    assert p == tmp_path / "server_output.log"


def test_resolve_log_path_manage_precedence(tmp_path: Path) -> None:
    # manage: env > cfg > default improbable name
    p = resolve_log_path(
        tmp_path,
        env_value=str(tmp_path / "env.log"),
        cfg_value=str(tmp_path / "cfg.log"),
        purpose="manage",
    )
    assert p == tmp_path / "env.log"
    p2 = resolve_log_path(tmp_path, env_value=None, cfg_value=str(tmp_path / "cfg.log"), purpose="manage")
    assert p2 == tmp_path / "cfg.log"
    p3 = resolve_log_path(tmp_path, env_value=None, cfg_value=None, purpose="manage")
    assert p3.name == "NON_EXISTENT_LOG_DO_NOT_CREATE.log"

