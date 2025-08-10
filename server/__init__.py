"""Enhanced Video Downloader Server Package.

Provides the application factory to create the Flask app.
"""

import logging
import os
from pathlib import Path

from flask import Flask, current_app, jsonify, request
from flask.wrappers import Response as FlaskResponse
from flask_cors import CORS

from .api.config_bp import config_bp
from .api.debug_bp import debug_bp
from .api.download_bp import download_bp
from .api.health_bp import health_bp
from .api.history_bp import history_bp, history_route
from .api.logs_bp import logs_bp
from .api.logs_manage_bp import logs_manage_bp
from .api.restart_bp import restart_bp
from .api.status_bp import status_bp
from .config import Config
from .logging_setup import setup_logging


def add_security_headers(response: FlaskResponse) -> FlaskResponse:
    """Add security headers to all responses."""
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
    )
    return response


def handle_request_entity_too_large(_error: Exception) -> tuple[FlaskResponse, int]:
    """Return JSON for request size limit violations (413)."""
    return (
        jsonify(
            {
                "status": "error",
                "message": "Request entity too large",
                "error_type": "REQUEST_ENTITY_TOO_LARGE",
            }
        ),
        413,
    )


def handle_bad_request(_error: Exception) -> tuple[FlaskResponse, int]:
    """Return sanitized JSON for bad requests on API routes (400)."""
    if request.path.startswith("/api"):
        return jsonify({"status": "error", "message": "Bad request", "error_type": "BAD_REQUEST"}), 400
    # Log and return minimal message for non-API paths
    current_app.logger.debug("Bad request on non-API path: %s", request.path)
    return jsonify({"status": "error", "message": "Bad request"}), 400


def handle_not_found(_error: Exception) -> tuple[FlaskResponse, int]:
    """Return JSON for not found errors on API routes (404)."""
    if request.path.startswith("/api"):
        return jsonify({"status": "error", "message": "Not found", "error_type": "NOT_FOUND"}), 404
    return jsonify({"status": "error", "message": "Not found"}), 404


def handle_method_not_allowed(_error: Exception) -> tuple[FlaskResponse, int]:
    """Return JSON for method not allowed on API routes (405)."""
    if request.path.startswith("/api"):
        return (
            jsonify({"status": "error", "message": "Method not allowed", "error_type": "METHOD_NOT_ALLOWED"}),
            405,
        )
    return jsonify({"status": "error", "message": "Method not allowed"}), 405


def handle_internal_error(error: Exception) -> tuple[FlaskResponse, int]:
    """Return sanitized JSON for internal server errors on API routes (500)."""
    current_app.logger.exception("Unhandled server error: %s", error)
    if request.path.startswith("/api"):
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Internal server error",
                    "error_type": "INTERNAL_SERVER_ERROR",
                }
            ),
            500,
        )
    return jsonify({"status": "error", "message": "Internal server error"}), 500


def create_app(config: Config) -> Flask:
    """Application factory for the server.

    Args:
        config: Config object with server settings.

    Returns:
        Flask app instance.
    """
    # Establish project root and default log file path
    project_root = Path(__file__).resolve().parent.parent
    default_log_path = str(project_root / "server_output.log")

    # Ensure environment reflects the active log file path so UI and APIs can report it
    # Only set when not explicitly provided by the environment
    os.environ.setdefault("LOG_FILE", default_log_path)

    # Initialize logging with file output to a stable, known path so /logs works
    setup_logging(config.get_value("log_level", "INFO"), default_log_path)

    # Ensure Werkzeug request logs flow into our file logger instead of stderr
    try:
        werk_log = logging.getLogger("werkzeug")
        werk_log.setLevel(logging.INFO)
        # Remove any existing stream handlers that write to stderr/stdout
        werk_log.handlers.clear()
        # Let messages propagate to root (which has our file handler)
        werk_log.propagate = True
    except Exception:
        pass

    # Log a clear startup/initialization message so the log file is never empty
    try:
        app_logger = logging.getLogger(__name__)
        # Best-effort host/port from config; binding may be controlled by WSGI server
        host_for_log = getattr(config, "server_host", "127.0.0.1")
        port_for_log = getattr(config, "server_port", None)
        if port_for_log is None:
            # Fallback to constants if needed
            try:
                from .constants import get_server_port

                port_for_log = get_server_port()
            except Exception:
                port_for_log = "unknown"
        active_log_path = os.getenv("LOG_FILE", default_log_path)
        app_logger.info(
            f"Server application initialized for {host_for_log}:{port_for_log} | log_file={active_log_path}"
        )
    except Exception:
        # Do not block startup on logging issues
        pass

    # Serve extension UI static files under /ui
    ui_dir = project_root / "extension" / "ui"
    app = Flask(__name__, static_folder=str(ui_dir), static_url_path="/ui")

    # Configure request size limits
    app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max request size

    # Configure CORS (local server usage); allow any origin for localhost usage scenarios
    CORS(
        app,
        origins="*",
        methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        max_age=3600,
        supports_credentials=False,
    )  # Cache preflight requests for 1 hour

    # Add security headers to all responses
    app.after_request(add_security_headers)

    # Log API requests (method, path, status) at INFO to ensure visibility in file logs
    @app.after_request  # type: ignore[misc]
    def _log_api_requests(response: FlaskResponse) -> FlaskResponse:
        try:
            if request.path.startswith("/api"):
                logging.getLogger("server.request").info(
                    "%s %s -> %s", request.method, request.path, response.status_code
                )
        except Exception:
            # Never block responses due to logging issues
            pass
        return response

    # Error handlers (registered at module scope for static analysis friendliness)
    app.register_error_handler(413, handle_request_entity_too_large)
    app.register_error_handler(400, handle_bad_request)
    app.register_error_handler(404, handle_not_found)
    app.register_error_handler(405, handle_method_not_allowed)
    app.register_error_handler(500, handle_internal_error)

    # Register blueprints
    app.register_blueprint(download_bp)
    app.register_blueprint(config_bp)
    app.register_blueprint(status_bp)
    # Register health under /api for a single, consistent API surface
    app.register_blueprint(health_bp, url_prefix="/api")
    app.register_blueprint(history_bp)
    app.register_blueprint(restart_bp)
    # Mount logs under /api for consistent client paths
    app.register_blueprint(logs_bp, url_prefix="/api")
    app.register_blueprint(logs_manage_bp, url_prefix="/api")

    # Backward-compatible aliases for legacy non-/api paths expected by tests and older clients
    from .api.logs_bp import logs as logs_route
    from .api.logs_manage_bp import clear_logs as clear_logs_route

    app.add_url_rule("/logs", view_func=logs_route, methods=["GET", "OPTIONS"])  # alias
    app.add_url_rule("/logs/", view_func=logs_route, methods=["GET", "OPTIONS"])  # alias with slash
    app.add_url_rule("/logs/clear", view_func=clear_logs_route, methods=["POST"])  # alias
    app.register_blueprint(debug_bp)

    # Explicitly support integration path for history endpoint
    app.add_url_rule("/api/history", "history_api", history_route, methods=["GET", "POST"])

    return app
