"""Log management API endpoints.

Exposes endpoints to manage server log files, including clearing and archiving.
"""

import datetime
import json
import logging
import os
from pathlib import Path

from flask import Blueprint, Response

logs_manage_bp = Blueprint("logs_manage_bp", __name__)
logger = logging.getLogger(__name__)


@logs_manage_bp.route("/logs/clear", methods=["POST"])
def clear_logs() -> Response:
    """
    Archive and clear the current server log file.

    Archive the existing log file by renaming it with a .bak extension,
    then create a fresh log file with an initialization entry.

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
    logger.info("Clear logs endpoint called")

    try:
        # Find the current log file - check both project root and logs directory
        project_root = Path(__file__).parent.parent.parent
        possible_log_paths = [
            project_root / "server_output.log",  # Main log file
            project_root / "logs" / "server_output.log",  # Alternative location
        ]

        # Also check environment variable if set
        env_log = os.getenv("LOG_PATH")
        if env_log:
            possible_log_paths.insert(0, Path(env_log))

        log_path = None
        for path in possible_log_paths:
            if path.exists() and os.access(path, os.W_OK):
                log_path = path
                break

        if not log_path:
            # If no existing log file found, create one in the project root
            log_path = project_root / "server_output.log"
            log_path.parent.mkdir(parents=True, exist_ok=True)

        # Generate backup filename - always use .bak (overwrite existing)
        backup_path = log_path.with_suffix(".bak")

        # If the log file exists, rename it to backup (overwriting any existing .bak)
        if log_path.exists():
            # Remove existing backup file if it exists
            if backup_path.exists():
                try:
                    backup_path.unlink()
                except FileNotFoundError:
                    # Backup file was already removed or doesn't exist
                    pass
            log_path.rename(backup_path)
            logger.info(f"Log file archived to {backup_path}")

        # Create a fresh log file with a structured initialization entry
        with log_path.open("w", encoding="utf-8") as f:
            now = datetime.datetime.now(datetime.timezone.utc)

            init_event = {
                "event": "log_file_cleared",
                "archived_to": backup_path.name if log_path.exists() else "none",
                "ts": now.isoformat(),
                "start_ts": int(now.timestamp() * 1000),
                "duration_ms": 0,
                "message": f"Log file cleared and restarted at {now.isoformat()}",
                "logger": "server.logs",
                "level": "INFO",
            }
            f.write(json.dumps(init_event, ensure_ascii=False) + "\n")

        return Response(
            f"Log file cleared and archived to {backup_path.name}",
            mimetype="text/plain",
        )

    except Exception as e:
        error_msg = f"Error clearing log file: {e}"
        logger.exception(error_msg)
        return Response(error_msg, status=500, mimetype="text/plain")
