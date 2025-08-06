"""
Provide blueprint for server restart API endpoint.

This module defines an endpoint to restart the development server by shutting down
the Werkzeug server if available.
"""

import logging
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
