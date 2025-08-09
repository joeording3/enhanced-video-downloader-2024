"""
Provide blueprint for server restart API endpoints.

This module defines endpoints to restart the server in two modes:
- Development restart: shuts down the Werkzeug server when available
- Managed restart: invokes an external supervisor/systemd/launchctl command
"""

import logging
import os
import platform
import subprocess
from typing import Any

from flask import Blueprint, jsonify, request

restart_bp = Blueprint("restart", __name__)
log = logging.getLogger(__name__)


@restart_bp.route("/restart", methods=["POST", "OPTIONS"])
def restart_server_route() -> Any:
    """
    Restart the development server.

    For OPTIONS requests, return a 204 No Content response for CORS preflight.
    For POST requests, attempt to shut down the Werkzeug development server.

    Returns
    -------
    Any
        Flask JSON response indicating the restart operation result or error.
    """
    if request.method == "OPTIONS":
        return "", 204

    log.info("Received /restart request")
    # This is a development-only feature and relies on Werkzeug.
    # It will not work with production servers like Gunicorn/Uvicorn.
    shutdown_func = request.environ.get("werkzeug.server.shutdown")
    if shutdown_func is None:
        log.error("Server restart failed - could not initialize RestartManager")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Server restart failed - could not initialize RestartManager",
                }
            ),
            500,
        )

    log.info("Attempting to shut down Werkzeug server for restart...")
    try:
        shutdown_func()
        log.info("Werkzeug server shutdown initiated.")
        # The actual restart must be handled by an external process manager (e.g.,
        # a script that launched this)
        return (
            jsonify({"success": True, "message": "Server shutting down for restart."}),
            200,
        )
    except Exception as e:
        log.error(f"Error during server shutdown for restart: {e}", exc_info=True)
        return jsonify({"success": False, "error": f"Error during shutdown: {e}"}), 500


def _build_managed_restart_commands() -> list[list[str]]:
    """Construct candidate restart commands based on environment and platform."""
    commands: list[list[str]] = []
    # Highest priority: explicit command
    explicit = os.getenv("EVD_RESTART_COMMAND")
    if explicit:
        # Use shell execution for complex commands
        commands.append(["/bin/sh", "-c", explicit])

    system = platform.system().lower()
    # systemd (user) service
    systemd_service = os.getenv("EVD_SYSTEMD_SERVICE")
    if systemd_service:
        commands.append(["systemctl", "--user", "restart", systemd_service])

    # supervisor program
    supervisor_program = os.getenv("EVD_SUPERVISOR_PROGRAM")
    if supervisor_program:
        commands.append(["supervisorctl", "restart", supervisor_program])

    # macOS launchctl
    launchctl_label = os.getenv("EVD_LAUNCHCTL_LABEL")
    if system == "darwin" and launchctl_label:
        uid = str(os.getuid())
        commands.append(["launchctl", "kickstart", "-k", f"gui/{uid}/{launchctl_label}"])

    return commands


@restart_bp.route("/restart/managed", methods=["POST", "OPTIONS"])
def managed_restart_route() -> Any:
    """Attempt to restart the server via an external process manager."""
    if request.method == "OPTIONS":
        return "", 204

    log.info("Received /restart/managed request")
    candidates = _build_managed_restart_commands()
    if not candidates:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "No managed restart command configured. Set EVD_RESTART_COMMAND or a supported service env var.",
                }
            ),
            400,
        )

    last_error: str | None = None
    for cmd in candidates:
        try:
            log.info("Attempting managed restart command: %s", " ".join(cmd))
            proc = subprocess.run(cmd, capture_output=True, text=True, timeout=10, check=False)
            if proc.returncode == 0:
                return (
                    jsonify({"success": True, "message": "Managed restart command executed."}),
                    200,
                )
            last_error = f"exit {proc.returncode}: {(proc.stderr or proc.stdout).strip()}"
        except Exception as e:  # noqa: PERF203
            last_error = str(e)

    return (
        jsonify(
            {
                "status": "error",
                "message": f"All managed restart attempts failed: {last_error or 'unknown error'}",
            }
        ),
        500,
    )
