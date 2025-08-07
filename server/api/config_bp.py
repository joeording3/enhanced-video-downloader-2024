"""
Provide blueprint for configuration-related API endpoints.

This module defines endpoints to retrieve and update server configuration
via GET and POST requests with Pydantic validation.
"""

import logging
from typing import Any

from flask import Blueprint, jsonify, request
from flask.wrappers import Response

from server.config import Config

config_bp = Blueprint("config_api", __name__, url_prefix="/api")
logger = logging.getLogger(__name__)


# Helper functions to simplify route logic
def _handle_preflight() -> "tuple[Response, int]":
    """Handle CORS preflight requests."""
    response = jsonify(success=True)
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    return response, 200


def _handle_load_error(e: Exception) -> "tuple[Response, int]":
    """Handle configuration loading errors."""
    logger.error(f"Failed to load configuration: {e}")
    return jsonify({"success": False, "error": "Failed to load server configuration."}), 500


def _handle_get_config(cfg: Config) -> "tuple[Response, int]":
    """Handle GET config requests."""
    try:
        return jsonify(cfg.as_dict()), 200
    except Exception as e:
        logger.error(f"Error retrieving config for GET request: {e}", exc_info=True)
        return jsonify({"success": False, "error": "Error retrieving configuration."}), 500


def _validate_post_data() -> tuple[dict[str, Any], tuple[Response, int] | None]:  # type: ignore[return-value]
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

    return data, None


def _handle_post_config(cfg: Config) -> "tuple[Response, int]":
    """Handle POST config update requests."""
    data, error = _validate_post_data()
    if error:
        return error

    try:
        cfg.update_config(data)
        return (
            jsonify({"success": True, "message": "Configuration updated successfully", "new_config": cfg.as_dict()}),
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
