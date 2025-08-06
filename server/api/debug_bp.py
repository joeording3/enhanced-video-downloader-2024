"""
Provide debug endpoints for troubleshooting the server.

Only used in development/debug mode.
"""

import logging
import os
from pathlib import Path
from typing import Any, Dict, List

from flask import Blueprint, jsonify, request

from server.config import Config

debug_bp = Blueprint("debug_bp", __name__)
logger = logging.getLogger(__name__)


def _get_project_root() -> Path:
    """
    Get the project root directory.

    :returns: Path to the project root directory.
    :rtype: Path
    """
    return Path(__file__).parent.parent.parent


def _collect_log_paths(project_root: Path) -> List[Dict[str, Any]]:
    """
    Collect log file info from various locations.

    :param project_root: Path to project root directory.
    :type project_root: Path
    :returns: List of log file info dictionaries.
    :rtype: List[Dict[str, Any]]
    """
    paths: List[Dict[str, Any]] = []

    # Helper to append log info
    def _append(path: Path) -> None:
        if path.exists():
            paths.append(
                {
                    "path": str(path),
                    "exists": True,
                    "size": path.stat().st_size,
                    "readable": os.access(path, os.R_OK),
                    "writable": os.access(path, os.W_OK),
                }
            )
        else:
            paths.append({"path": str(path), "exists": False})

    # Root log
    _append(project_root / "server_output.log")
    # Logs directory
    logs_dir = project_root / "logs"
    if logs_dir.exists() and logs_dir.is_dir():
        for log in logs_dir.glob("*.log"):
            _append(log)
    # Server-specific log
    _append(project_root / "server" / "server_output.log")
    return paths


def _perform_test_write(project_root: Path) -> Dict[str, Any]:
    """
    Attempt to create a test log file and report success.

    :param project_root: Path to project root directory.
    :type project_root: Path
    :returns: Dict with path and success status.
    :rtype: Dict[str, Any]
    """
    test_path = project_root / "logs" / "test_log_access.log"
    success = False
    try:
        # Ensure logs directory exists
        test_path.parent.mkdir(parents=True, exist_ok=True)
        with test_path.open("w", encoding="utf-8") as f:
            f.write("Test log file created by debug endpoint")
        success = True
    except Exception:
        success = False
    return {"path": str(test_path), "success": success}


@debug_bp.route("/debug/paths", methods=["GET"])
def debug_paths() -> Any:
    """
    Return debug information about paths and environment.

    :returns: Flask JSON response with debugging data (paths, config, logs, etc.).
    :rtype: Any
    """
    project_root = _get_project_root()

    # Collect log information
    log_paths = _collect_log_paths(project_root)

    cwd = str(Path.cwd())

    # Configuration is now environment-only
    config_content = None
    try:
        config_content = Config.load().as_dict()
    except Exception as e:
        config_content = {"error": str(e)}

    logging_info: Dict[str, Any] = {"root_level": logging.getLogger().level}

    # Debug request info
    logger.debug(
        f"Request from {request.remote_addr} - Headers: {dict(request.headers)}, "
        f"Cookies: {request.cookies}, Params: {request.args}, Data: {request.get_data()!r}"
    )

    # Perform test write
    test_write = _perform_test_write(project_root)

    return jsonify(
        {
            "project_root": str(project_root),
            "current_working_dir": cwd,
            "config_path": "environment-only",
            "config_exists": True,
            "config_content": config_content,
            "log_files": log_paths,
            "logging_config": logging_info,
            "test_write": test_write,
        }
    )
