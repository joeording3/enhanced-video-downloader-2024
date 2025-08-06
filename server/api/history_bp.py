"""
Provide blueprint for history-related API endpoints.

This module defines a single endpoint to retrieve, sync, clear, or append history
entries via GET and POST requests.
"""

import logging
from typing import Any, Tuple, Union

from flask import Blueprint, jsonify, request
from flask.wrappers import Response

from server.history import append_history_entry, clear_history, load_history, save_history

logger = logging.getLogger(__name__)

history_bp = Blueprint("history", __name__)


# Helper functions for the /history endpoint
def _history_get() -> Union[Response, Tuple[Response, int]]:
    """Handle GET /history: load, filter, paginate, and return history."""
    try:
        history_data = load_history()
        status = request.args.get("status")
        domain = request.args.get("domain")
        page = int(request.args.get("page", 1))
        per_page = int(request.args.get("per_page", 0))  # 0 = no pagination
        if status:
            history_data = [h for h in history_data if h.get("status") == status]
        if domain:
            history_data = [h for h in history_data if domain in h.get("url", "")]
        total = len(history_data)
        if per_page > 0:
            start = (page - 1) * per_page
            history_data = history_data[start : start + per_page]
        return jsonify({"history": history_data, "total_items": total})
    except Exception as e:
        logger.error(f"Error GET /history: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


def _error_response(message: str, status_code: int) -> Tuple[Response, int]:
    """Create error response."""
    return jsonify({"success": False, "error": message}), status_code


def _success_response(message: str, status_code: int = 200) -> Tuple[Response, int]:
    """Create success response."""
    return jsonify({"success": True, "message": message}), status_code


def _handle_history_sync(data: list) -> Tuple[Response, int]:
    """Handle history synchronization."""
    try:
        success = save_history(data)
        if success:
            return _success_response("History synchronized successfully")
        return _error_response("Failed to save history.", 500)
    except Exception as e:
        return _error_response(f"Failed to sync history: {e}", 500)


def _handle_history_clear() -> Tuple[Response, int]:
    """Handle history clearing."""
    try:
        success = clear_history()
        if success:
            return _success_response("History cleared successfully")
        return _error_response("Clear failed.", 500)
    except Exception as e:
        return _error_response(f"Failed to clear history: {e}", 500)


def _handle_history_append(data: dict) -> Tuple[Response, int]:
    """Handle history entry append."""
    try:
        append_history_entry(data)
        return _success_response("Entry added successfully", 200)
    except Exception as e:
        return _error_response(str(e), 500)


def _history_post(data: Any) -> Tuple[Response, int]:
    """Handle POST /history: sync full history, clear, or append entry."""
    if isinstance(data, list):
        return _handle_history_sync(data)

    if isinstance(data, dict):
        action = data.get("action")
        if action == "clear":
            return _handle_history_clear()
        return _handle_history_append(data)

    return _error_response("Invalid payload.", 400)


@history_bp.route("/history", methods=["GET", "POST"])
@history_bp.route("/api/history", methods=["GET", "POST"])
def history_route() -> Any:
    """
    Handle history retrieval and modification.

    For GET requests, return paginated history with optional filters (status, domain,
    page, per_page). For POST requests, sync full history, clear history, or append
    a single entry based on the payload.

    Parameters
    ----------
    None

    Returns
    -------
    Any
        Flask JSON response with history data or operation result.
    """
    if request.method == "GET":
        return _history_get()
    data = request.get_json(force=True)
    return _history_post(data)
