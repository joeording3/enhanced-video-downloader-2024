"""Queue management API endpoints.

Exposes lightweight endpoints to inspect and manage the server-side download
queue used when `max_concurrent_downloads` capacity is reached.
"""

from __future__ import annotations

from typing import Any, TypedDict, cast

from flask import Blueprint, jsonify, request

from server.queue import queue_manager

queue_bp = Blueprint("queue_api", __name__, url_prefix="/api")


class _QueueItem(TypedDict, total=False):
    downloadId: str
    download_id: str
    url: str
    page_title: str
    status: str


class _ReorderPayload(TypedDict, total=False):
    order: list[str]
    ids: list[str]


@queue_bp.route("/queue", methods=["GET"])
def get_queue() -> Any:
    """Return the current queued items.

    Response structure:
    {
      "queue": [ { "downloadId": "id", ...minimal fields... }, ... ]
    }
    """
    try:
        items = cast(list[_QueueItem], queue_manager.list())
        # Ensure each item has a downloadId string for clients
        for it in items:
            if "downloadId" not in it and "download_id" in it:
                did = it.get("download_id")
                if isinstance(did, str):
                    it["downloadId"] = did
        return jsonify({"queue": items})
    except Exception as e:
        return jsonify({"status": "error", "message": f"Failed to fetch queue: {e}"}), 500


@queue_bp.route("/queue/reorder", methods=["POST", "OPTIONS"])
def reorder_queue() -> Any:
    """Reorder pending items according to the provided list of IDs.

    Expected body JSON: { "order": ["id1", "id2", ...] }
    """
    if request.method == "OPTIONS":
        return "", 204

    raw: dict[str, Any] | Any = request.get_json(silent=True) or {}
    data = cast(_ReorderPayload, raw if isinstance(raw, dict) else {})
    order = data.get("order") or data.get("ids")
    if not isinstance(order, list):
        return (
            jsonify(
                {
                    "status": "error",
                    "message": "Invalid payload: 'order' must be a list of strings",
                    "error_type": "VALIDATION_ERROR",
                }
            ),
            400,
        )
    try:
        queue_manager.reorder(order)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": f"Failed to reorder queue: {e}"}), 500


@queue_bp.route("/queue/<download_id>/remove", methods=["POST", "OPTIONS"])
def remove_from_queue(download_id: str) -> Any:
    """Remove a pending item by its download ID."""
    if request.method == "OPTIONS":
        return "", 204

    try:
        removed = queue_manager.remove(download_id)
        if not removed:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Queued item not found",
                        "downloadId": download_id,
                    }
                ),
                404,
            )
        return jsonify({"status": "success", "downloadId": download_id})
    except Exception as e:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Failed to remove from queue: {e}",
                    "downloadId": download_id,
                }
            ),
            500,
        )
