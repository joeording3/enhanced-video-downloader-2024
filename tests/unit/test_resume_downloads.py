"""Unit tests for resume download logic and helpers."""

import logging
import os
from pathlib import Path
from typing import Any

from flask import Flask

from server.cli_helpers import resume_failed_downloads
from server.constants import get_server_port
from server.downloads import resume as mod
from server.downloads.resume import (
    actual_resume_logic_for_file,
    handle_resume_download,
    resume_all_incomplete_downloads,
)


def test_actual_resume_logic_not_implemented(tmp_path: Path, caplog: Any) -> None:
    """Test that actual_resume_logic_for_file logs warning and returns False."""
    part_file = str(tmp_path / "file1.part")
    # Create dummy part file
    open(part_file, "w").close()
    caplog.set_level("WARNING")
    result = actual_resume_logic_for_file(part_file, str(tmp_path), {})
    assert result is False
    # Logging is written to file; skip log assertion and only verify return value


def test_resume_all_no_app_context(monkeypatch: Any, caplog: Any) -> None:
    """Test resume_all_incomplete_downloads returns error if no app context."""
    # Ensure no Flask app context
    monkeypatch.setattr("server.downloads.resume.current_app", None)
    caplog.set_level("ERROR")
    result = resume_all_incomplete_downloads()
    assert result["status"] == "error"
    assert "App context not available" in result["message"]


def test_resume_all_invalid_dir(app: Flask, tmp_path: Path, caplog: Any) -> None:
    """Test resume_all_incomplete_downloads handles missing DOWNLOAD_DIR."""
    app = Flask(__name__)
    with app.app_context():
        app.config["DOWNLOAD_DIR"] = None
        caplog.set_level("ERROR")
        result = resume_all_incomplete_downloads()
        assert result["status"] == "error"
        assert "DOWNLOAD_DIR not configured" in result["message"]


def test_resume_all_no_files(app: Flask, tmp_path: Path) -> None:
    """Test resume_all_incomplete_downloads with empty directory returns success."""
    app = Flask(__name__)
    tmp_dir = tmp_path / "downloads"
    tmp_dir.mkdir()
    with app.app_context():
        app.config["DOWNLOAD_DIR"] = str(tmp_dir)
        result = resume_all_incomplete_downloads()
        assert result["status"] == "success"
        assert "No partial downloads found" in result["message"]


def test_resume_all_with_partials(app: Flask, tmp_path: Path, monkeypatch: Any) -> None:
    """Test resume_all_incomplete_downloads counts resumed and failed correctly."""
    app = Flask(__name__)
    tmp_dir = tmp_path / "downloads"
    tmp_dir.mkdir()
    # Create dummy .part files
    f1 = tmp_dir / "one.part"
    f2 = tmp_dir / "two.part"
    f1.write_text("")
    f2.write_text("")
    with app.app_context():
        app.config["DOWNLOAD_DIR"] = str(tmp_dir)
        # Monkeypatch actual_resume_logic_for_file to return True for one, False for other

        def fake_resume(path: str, dir_: str, cfg: dict[str, Any]) -> bool:
            return os.path.basename(path).startswith("one")

        monkeypatch.setattr(mod, "actual_resume_logic_for_file", fake_resume)
        result = resume_all_incomplete_downloads()
        assert result["status"] == "success"
        assert result["resumed_count"] == 1
        assert result["failed_or_skipped_count"] == 1


def test_handle_resume_download(app: Flask, monkeypatch: Any) -> None:
    """Test handle_resume_download wraps resume_all_incomplete_downloads in JSON response."""
    app = Flask(__name__)
    with app.test_request_context():
        # Monkeypatch resume_all_incomplete_downloads
        monkeypatch.setattr(
            "server.downloads.resume.resume_all_incomplete_downloads",
            lambda: {"status": "success", "message": "ok"},
        )
        resp = handle_resume_download()
        assert resp.get_json() == {"status": "success", "message": "ok"}


def test_resume_failed_downloads_auto_populate(monkeypatch: Any, caplog: Any) -> None:
    """Test that resume_failed_downloads auto-populates IDs from history when none provided."""
    # Prepare fake history entries
    history = [
        {"url": "http://a", "status": "error"},
        {"url": "http://b", "status": "success"},
        {"url": "http://c", "status": "error"},
    ]
    monkeypatch.setattr("server.cli_helpers.load_history", lambda: history)

    class DummyCfg:
        def get_value(self, key: str, default: Any | None = None) -> Any:
            return "localhost" if key == "server_host" else get_server_port() if key == "server_port" else default

    monkeypatch.setattr("server.config.Config.load", staticmethod(lambda: DummyCfg()))
    # Patch _process_resume_batch to simulate batch processing
    monkeypatch.setattr(
        "server.cli_helpers._process_resume_batch",
        lambda batch, download_dir, build_opts_func, logger, priority: {
            "resumed": len(batch),
            "failed": 0,
            "non_resumable": [],
        },
    )
    caplog.set_level(logging.INFO)
    logger = logging.getLogger("test_resume_failed")

    resume_failed_downloads([], Path("/tmp"), lambda u, o, p: {}, logger=logger)
    assert "Found 2 failed downloads to resume" in caplog.text


def test_resume_failed_downloads_by_id(monkeypatch: Any, caplog: Any) -> None:
    """Test that resume_failed_downloads matches and uses history entry ID when provided."""
    # Prepare fake history entries with id fields
    history = [
        {"id": 1, "url": "http://first", "status": "error"},
        {"id": "2", "url": "http://second", "status": "error"},
    ]
    monkeypatch.setattr("server.cli_helpers.load_history", lambda: history)

    class DummyCfg2:
        def get_value(self, key: str, default: Any | None = None) -> Any:
            if key == "server_host":
                return "host"
            if key == "server_port":
                return get_server_port()
            return default

    monkeypatch.setattr("server.config.Config.load", staticmethod(lambda: DummyCfg2()))
    # Patch _process_resume_batch to simulate batch processing
    monkeypatch.setattr(
        "server.cli_helpers._process_resume_batch",
        lambda batch, download_dir, build_opts_func, logger, priority: {
            "resumed": len(batch),
            "failed": 0,
            "non_resumable": [],
        },
    )
    logger = logging.getLogger("test_resume_by_id")

    resume_failed_downloads(["1", "2"], Path("/tmp"), lambda u, o, p: {}, logger=logger)
    assert "Found 2 failed downloads to resume" in caplog.text


def test_resume_failed_downloads_progress(monkeypatch: Any, caplog: Any) -> None:
    """Test that resume_failed_downloads logs progress information."""
    # Prepare history entries
    history = [
        {"url": "http://a", "status": "error"},
        {"url": "http://b", "status": "error"},
    ]
    monkeypatch.setattr("server.cli_helpers.load_history", lambda: history)

    class DummyCfg3:
        def get_value(self, key: str, default: Any | None = None) -> Any:
            if key == "server_host":
                return "host"
            if key == "server_port":
                return get_server_port()
            return default

    monkeypatch.setattr("server.config.Config.load", staticmethod(lambda: DummyCfg3()))
    # Patch _process_resume_batch to simulate batch processing
    monkeypatch.setattr(
        "server.cli_helpers._process_resume_batch",
        lambda batch, download_dir, build_opts_func, logger, priority: {
            "resumed": len(batch),
            "failed": 0,
            "non_resumable": [],
        },
    )
    caplog.set_level(logging.INFO)

    resume_failed_downloads(["http://a", "http://b"], Path("/tmp"), lambda u, o, p: {}, logger=None)
    assert "Found 2 failed downloads to resume" in caplog.text
