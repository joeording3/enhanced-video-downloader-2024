"""
Provide blueprint for log management API endpoints.

This module defines endpoints to archive, clear, and manage server log files.
"""

import datetime
import logging
import os
from pathlib import Path

from flask import Blueprint, Response

from server.config import Config

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
        # Determine project root (2 levels up from this file)
        project_root = Path(__file__).parent.parent.parent
        config_path = project_root / "config.json"

        cfg = Config(config_path)  # type: ignore[arg-type]
        # Get log path from config or fallback
        log_path = cfg.get_value("log_path")
        log_path = project_root / "server_output.log" if not log_path else Path(log_path)

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

            # Create a fresh log file
            with log_path.open("w", encoding="utf-8") as f:
                f.write(
                    f"Log file cleared and archived to {archive_basename} on {
                        datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                    }\n"
                )

            logger.info(f"New log file created: {log_path}")
            return Response(
                f"Log file archived to {archive_basename} and cleared",
                mimetype="text/plain",
            )
        logger.error(f"Log file not found or not writable: {log_path}")
        return Response(
            f"Error: Log file not found or not writable: {log_path}",
            status=404,
            mimetype="text/plain",
        )
    except Exception as e:
        error_msg = f"Error archiving log file: {e}"
        logger.exception(error_msg)
        return Response(error_msg, status=500, mimetype="text/plain")
