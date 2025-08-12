"""
Provide blueprint for configuration-related API endpoints.

This module defines endpoints to retrieve and update server configuration
via GET and POST requests with Pydantic validation.
"""

import logging
import os
from typing import Any, cast

from flask import Blueprint, jsonify, request
from flask.wrappers import Response

from server.config import Config

try:  # Prefer real dotenv if available
    from dotenv import find_dotenv, set_key
except Exception:  # Fallbacks

    def find_dotenv() -> str | None:
        """Return None when python-dotenv is unavailable (stub)."""
        return None

    def set_key(*_args: Any, **_kwargs: Any) -> tuple[bool | None, str, str]:
        """Stub set_key to satisfy type checkers when dotenv is missing."""
        return None, "", ""


config_bp = Blueprint("config_api", __name__, url_prefix="/api")
logger = logging.getLogger(__name__)


# Helper functions to simplify route logic
def _handle_preflight() -> tuple[Response, int]:
    """Handle CORS preflight requests."""
    response = jsonify(success=True)
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    return response, 200


def _handle_load_error(e: Exception) -> tuple[Response, int]:
    """Handle configuration loading errors."""
    logger.error(f"Failed to load configuration: {e}")
    return jsonify({"success": False, "error": "Failed to load server configuration."}), 500


def _handle_get_config(cfg: Config) -> tuple[Response, int]:
    """Handle GET config requests."""
    try:
        data = cfg.as_dict()
        # Overlay env-only runtime settings for UI visibility
        env_log = os.getenv("LOG_FILE")
        env_gunicorn = os.getenv("EVD_GUNICORN")
        env_workers = os.getenv("EVD_WORKERS")
        env_verbose = os.getenv("EVD_VERBOSE")
        env_ytdlp_conc = os.getenv("YTDLP_CONCURRENT_FRAGMENTS")

        def _truthy(v: str | None) -> bool | None:
            if v is None:
                return None
            return v.strip().lower() in ("1", "true", "yes", "on")

        def _int_or_none(v: str | None) -> int | None:
            try:
                return int(v) if v is not None else None
            except Exception:
                return None

        data.update(
            {
                "log_file": env_log,
                "evd_gunicorn": _truthy(env_gunicorn),
                "evd_workers": _int_or_none(env_workers),
                "evd_verbose": _truthy(env_verbose),
                "ytdlp_concurrent_fragments": _int_or_none(env_ytdlp_conc),
            }
        )
        return jsonify(data), 200
    except Exception as e:
        logger.error(f"Error retrieving config for GET request: {e}", exc_info=True)
        return jsonify({"success": False, "error": "Error retrieving configuration."}), 500


def _validate_post_data() -> tuple[dict[str, Any], tuple[Response, int] | None]:
    """Validate POST request data and return (data, error_response) or (data, None)."""
    if not request.is_json:
        return {}, (jsonify({"success": False, "error": "Content-Type must be application/json"}), 415)

    try:
        data: Any = request.get_json()
    except Exception:
        return {}, (jsonify({"success": False, "error": "Invalid JSON"}), 400)

    if not data:
        return {}, (jsonify({"success": False, "error": "No data provided"}), 400)

    if not isinstance(data, dict):
        return {}, (jsonify({"success": False, "error": "expected an object"}), 400)

    typed_data: dict[str, Any] = cast(dict[str, Any], data)
    return typed_data, None


def _handle_post_config(cfg: Config) -> tuple[Response, int]:
    """Handle POST config update requests."""
    data, error = _validate_post_data()
    if error:
        return error

    try:
        # Extract env-only runtime settings if present
        env_updates: dict[str, str] = {}
        if "log_file" in data:
            v = data.pop("log_file")
            if v is not None:
                env_updates["LOG_FILE"] = str(v)
        if "evd_gunicorn" in data:
            v = data.pop("evd_gunicorn")
            if v is not None:
                env_updates["EVD_GUNICORN"] = "true" if bool(v) else "false"
        if "evd_workers" in data:
            v = data.pop("evd_workers")
            if v is not None:
                env_updates["EVD_WORKERS"] = str(int(v))
        if "evd_verbose" in data:
            v = data.pop("evd_verbose")
            if v is not None:
                env_updates["EVD_VERBOSE"] = "true" if bool(v) else "false"
        if "ytdlp_concurrent_fragments" in data:
            v = data.pop("ytdlp_concurrent_fragments")
            if v is not None:
                env_updates["YTDLP_CONCURRENT_FRAGMENTS"] = str(int(v))

        # Apply standard config updates
        if data:
            cfg.update_config(data)

        # Persist env-only updates
        if env_updates:
            dotenv_path = find_dotenv()
            if not dotenv_path:
                # Still update process env for current runtime
                for k, v in env_updates.items():
                    os.environ[k] = v
            else:
                for k, v in env_updates.items():
                    set_key(dotenv_path, k, v)
                    os.environ[k] = v

        # Return merged view including env-only values
        merged = cfg.as_dict()
        merged.update(
            {
                "log_file": os.getenv("LOG_FILE"),
                "evd_gunicorn": os.getenv("EVD_GUNICORN"),
                "evd_workers": os.getenv("EVD_WORKERS"),
                "evd_verbose": os.getenv("EVD_VERBOSE"),
                "ytdlp_concurrent_fragments": os.getenv("YTDLP_CONCURRENT_FRAGMENTS"),
            }
        )
        return (
            jsonify({"success": True, "message": "Configuration updated successfully", "new_config": merged}),
            200,
        )
    except (ValueError, AttributeError) as e:
        return jsonify({"success": False, "error": str(e)}), 400
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to update configuration: {e}"}), 500


@config_bp.route("/config", methods=["GET", "POST", "OPTIONS"])
def manage_config_route() -> Any:
    """
    Handle retrieval and update of server configuration.

    For OPTIONS requests, return CORS preflight response.
    GET requests return current configuration as JSON.
    POST requests validate and apply configuration updates.

    :returns: Flask JSON response with configuration data, update confirmation, or error.
    :rtype: Any
    """
    if request.method == "OPTIONS":
        return _handle_preflight()

    try:
        cfg = Config.load()
    except Exception as e:
        return _handle_load_error(e)

    if request.method == "GET":
        return _handle_get_config(cfg)

    if request.method == "POST":
        return _handle_post_config(cfg)

    return jsonify({"success": False, "error": "Method not allowed."}), 405
