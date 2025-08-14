"""
Provide blueprint for log management API endpoints.

This module defines endpoints to archive, clear, and manage server log files.
"""

import datetime
import json
import logging
import os
from pathlib import Path
from typing import TypedDict

from flask import Blueprint, Response

from server.config import Config
from server.logging_setup import resolve_log_path

logs_manage_bp = Blueprint("logs_manage_bp", __name__)
logger = logging.getLogger(__name__)


@logs_manage_bp.route("/logs/clear", methods=["POST"])
def clear_logs() -> Response:
    """
    Archive and clear the current server log file.

    Archive the existing log file by moving it to an archive directory with a
    timestamped filename, then create a fresh log file with an initialization entry.

    Parameters
    ----------
    None

    Returns
    -------
    Response
        Flask Response with a success message or error details.

    Raises
    ------
    Exception
        If an error occurs during archiving or file operations.
    """
    # Config is imported at module level

    logger.info("Archive logs endpoint called")

    # Find the log file to archive
    try:
        # Configuration is now environment-only
        cfg = Config.load()
        # Resolve path centrally: env > config > improbable default
        env_log = os.getenv("LOG_PATH")
        cfg_log = cfg.get_value("log_path")
        project_root = Path(__file__).parent.parent.parent
        log_path = resolve_log_path(project_root, env_log, cfg_log, purpose="manage")

        if log_path.exists() and os.access(log_path, os.W_OK):
            # Generate timestamp for the archive filename
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            log_dirname = log_path.parent

            # Create logs directory if it doesn't exist
            logs_dir = log_dirname / "logs"
            logs_dir.mkdir(parents=True, exist_ok=True)

            # Construct the archive filename
            name_parts = (log_path.stem, log_path.suffix)
            archive_basename = f"{name_parts[0]}.{timestamp}{name_parts[1]}"
            archive_path = logs_dir / archive_basename

            # Move the current log file to the archive location
            log_path.rename(archive_path)

            # Create a fresh log file with a structured initialization entry
            with log_path.open("w", encoding="utf-8") as f:
                now = datetime.datetime.now(datetime.timezone.utc)

                class _InitEvent(TypedDict):
                    event: str
                    archived_to: str
                    ts: str
                    start_ts: int
                    duration_ms: int
                    message: str
                    logger: str
                    level: str

                init_event: _InitEvent = {
                    "event": "log_file_archived",
                    "archived_to": archive_basename,
                    "ts": now.isoformat(),
                    "start_ts": int(now.timestamp() * 1000),
                    "duration_ms": 0,
                    "message": f"Log file archived to {archive_basename}",
                    "logger": "server.logs",
                    "level": "INFO",
                }
                f.write(json.dumps(init_event, ensure_ascii=False) + "\n")
            return Response(
                f"Log file archived to {archive_basename} and cleared",
                mimetype="text/plain",
            )
        logger.error(f"Log file not found or not writable: {log_path}")
        # Return 404 when not found, 500 when path exists but not writable
        status = 404 if not log_path.exists() else 500
        return Response(
            f"Error: Log file not found or not writable: {log_path}",
            status=status,
            mimetype="text/plain",
        )
    except Exception as e:
        error_msg = f"Error archiving log file: {e}"
        logger.exception(error_msg)
        return Response(error_msg, status=500, mimetype="text/plain")
