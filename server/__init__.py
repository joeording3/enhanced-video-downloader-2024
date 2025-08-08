"""Enhanced Video Downloader Server Package.

Provides the application factory to create the Flask app.
"""

from pathlib import Path

from flask import Flask, jsonify
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


def create_app(config: Config) -> Flask:
    """Application factory for the server.

    Args:
        config: Config object with server settings.

    Returns:
        Flask app instance.
    """
    setup_logging(config.get_value("log_level", "INFO"))
    # Serve extension UI static files under /ui
    project_root = Path(__file__).resolve().parent.parent
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

    # Error handlers
    @app.errorhandler(413)
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

    # Register blueprints
    app.register_blueprint(download_bp)
    app.register_blueprint(config_bp)
    app.register_blueprint(status_bp)
    app.register_blueprint(health_bp)  # Register without prefix for /health
    app.register_blueprint(history_bp)
    app.register_blueprint(restart_bp)
    app.register_blueprint(logs_bp)
    app.register_blueprint(logs_manage_bp)
    app.register_blueprint(debug_bp)

    # Explicitly support integration path for history endpoint
    app.add_url_rule("/api/history", "history_api", history_route, methods=["GET", "POST"])

    return app
