"""Unit tests for server.api.debug_bp helper functions."""

from pathlib import Path
from typing import Any

from server.api.debug_bp import _collect_log_paths, _get_project_root, _perform_test_write


def test_get_project_root() -> None:
    """Test that _get_project_root returns a valid project root directory.

    :returns: None.
    """
    root = _get_project_root()
    # Project root should contain server directory
    assert root.is_dir()
    assert (root / "server").is_dir()


def test_collect_log_paths_no_logs(tmp_path: Path) -> None:
    """Test _collect_log_paths when no log files exist.

    :param tmp_path: Temporary directory path for testing.
    :returns: None.
    """
    paths = _collect_log_paths(tmp_path)
    assert isinstance(paths, list)
    assert len(paths) == 2
    # Root log and server log only
    assert paths[0]["path"] == str(tmp_path / "server_output.log")
    assert paths[0]["exists"] is False
    assert paths[1]["path"] == str(tmp_path / "server" / "server_output.log")
    assert paths[1]["exists"] is False


def test_collect_log_paths_with_logs(tmp_path: Path) -> None:
    """Test _collect_log_paths when log files exist.

    :param tmp_path: Temporary directory path for testing.
    :returns: None.
    """
    # Create logs dir and files
    logs_dir = tmp_path / "logs"
    logs_dir.mkdir()
    log_file = logs_dir / "test.log"
    content = "hello"
    log_file.write_text(content)
    # Create server log file
    server_dir = tmp_path / "server"
    server_dir.mkdir()
    server_log = server_dir / "server_output.log"
    server_log.write_text("world")

    paths = _collect_log_paths(tmp_path)
    # Should include root log, logs/test.log, and server/server_output.log
    paths_by = {p["path"]: p for p in paths}
    assert len(paths) == 3
    # logs/test.log
    assert str(log_file) in paths_by
    assert paths_by[str(log_file)]["exists"] is True
    assert paths_by[str(log_file)]["size"] == len(content)
    # server/server_output.log
    assert str(server_log) in paths_by
    assert paths_by[str(server_log)]["exists"] is True


def test_perform_test_write_success(tmp_path: Path) -> None:
    """Test _perform_test_write when write operation succeeds.

    :param tmp_path: Temporary directory path for testing.
    :returns: None.
    """
    result = _perform_test_write(tmp_path)
    assert result["success"] is True
    path = Path(result["path"])
    assert path.exists()
    text = path.read_text(encoding="utf-8")
    assert "Test log file created by debug endpoint" in text


def test_perform_test_write_failure(tmp_path: Path, monkeypatch: Any) -> None:
    """Test _perform_test_write when write operation fails.

    :param tmp_path: Temporary directory path for testing.
    :param monkeypatch: pytest monkeypatch fixture for mocking.
    :returns: None.
    """

    # Simulate write error by patching Path.open
    def fake_open(*args: Any, **kwargs: Any) -> None:
        raise OSError("fail")

    monkeypatch.setattr(Path, "open", fake_open)
    result = _perform_test_write(tmp_path)
    assert result["success"] is False
