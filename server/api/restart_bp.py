"""
Provide blueprint for server restart API endpoints.

This module defines endpoints to restart the server in two modes:
- Development restart: shuts down the Werkzeug server when available
- Managed restart: invokes an external supervisor/systemd/launchctl command
"""

import logging
import os
import platform
import shutil
import subprocess
import sys
from contextlib import suppress
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
        # Not running under Werkzeug dev server; graceful restart is not supported here
        log.warning("Server restart not supported: shutdown function not available (Werkzeug-only)")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Server restart not supported: shutdown function not available (Werkzeug-only)",
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

    # If a direct CLI is discoverable on PATH, prefer its absolute path to avoid PATH issues
    which_cli = shutil.which("videodownloader-server")
    if which_cli:
        commands.append([which_cli, "restart"])  # absolute path to CLI

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

    # Last-resort: invoke the CLI via the current Python interpreter/module path
    # Ensures restart works even when PATH lacks the console script
    with suppress(Exception):
        commands.append([sys.executable, "-m", "server.cli_main", "restart"])  # module entrypoint

    return commands


@restart_bp.route("/restart/managed", methods=["POST", "OPTIONS"])
def managed_restart_route() -> Any:
    """Attempt to restart the server via an external process manager.

    This endpoint returns immediately (202) after starting a restart command in a
    detached subprocess so the HTTP response is sent before the current process
    receives a termination signal. This avoids client-side 500/network errors.
    """
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
            # Start the command in a detached subprocess so we can return a response immediately
            # and avoid being killed before sending the HTTP response.
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
            log.info("Managed restart command started (pid=%s)", proc.pid)
            return jsonify({"success": True, "message": "Restart initiated."}), 202
        except Exception as e:
            last_error = str(e)
            # Try next candidate

    return (
        jsonify(
            {
                "status": "error",
                "message": f"All managed restart attempts failed: {last_error or 'unknown error'}",
            }
        ),
        500,
    )
