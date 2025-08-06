"""
Provide API endpoints for retrieving server logs.

This blueprint offers routes to retrieve server logs with options for
specifying the number of lines and the order (recent or oldest).
"""

# Blueprint for log retrieval endpoint: /logs
import logging
from pathlib import Path

from flask import Blueprint, Response, request

logs_bp = Blueprint("logs", __name__)
logger = logging.getLogger(__name__)


def _validate_lines(lines: int) -> None:
    """Validate lines parameter."""
    if lines < 1:
        raise ValueError("Invalid")


@logs_bp.route("/logs", methods=["GET", "OPTIONS"])
@logs_bp.route("/logs/", methods=["GET", "OPTIONS"])  # alias with trailing slash
def logs() -> Response:
    """Get recent log lines."""
    if request.method == "OPTIONS":
        return Response("", status=204)

    try:
        lines = int(request.args.get("lines", 100))
        _validate_lines(lines)
    except ValueError:
        return Response("Invalid 'lines' parameter", status=400, mimetype="text/plain")

    recent = request.args.get("recent", "false").lower() in ("1", "true", "yes")

    project_root = Path(__file__).parent.parent.parent
    log_path = project_root / "server_output.log"

    if not log_path.exists() or not log_path.is_file():
        logger.error(f"Log file not found: {log_path}")
        return Response(f"Log file not found: {log_path}", status=404, mimetype="text/plain")

    try:
        with Path(log_path).open(encoding="utf-8") as f:
            all_lines = f.readlines()
        selected = all_lines[-lines:] if recent else all_lines[:lines]
        return Response("".join(selected), mimetype="text/plain")
    except Exception as e:
        logger.error(f"Error reading log file: {e}", exc_info=True)
        return Response(f"Error reading log file: {e}", status=500, mimetype="text/plain")


def get_logs() -> Response:
    """
    Call the logs route handler for test import compatibility.

    :returns: Flask Response from logs handler
    :rtype: Response
    """
    return logs()
