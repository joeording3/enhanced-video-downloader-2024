"""Queue management API endpoints.

Exposes lightweight endpoints to inspect and manage the server-side download
queue used when `max_concurrent_downloads` capacity is reached.
"""

from __future__ import annotations

from typing import Any, TypedDict, cast

from flask import Blueprint, jsonify, request

from server.downloads import unified_download_manager

queue_bp = Blueprint("queue_api", __name__, url_prefix="/api")

# Track previous queue count to only log when it changes
_previous_queue_count = 0


class _QueueItem(TypedDict, total=False):
    downloadId: str
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
    global _previous_queue_count

    try:
        items = cast(list[_QueueItem], unified_download_manager.get_queued_downloads())

        # Only log when the queue count changes
        current_count = len(items)
        if current_count != _previous_queue_count:
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"Queue endpoint: Got {current_count} items from unified manager")
            for item in items:
                logger.info(f"Queue item: {item}")
            logger.info(f"Queue endpoint: Returning {current_count} items")
            for item in items:
                logger.info(f"Returning item: {item}")
            _previous_queue_count = current_count

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
        unified_download_manager.reorder_queue(order)
        return jsonify({"status": "success"})
    except Exception as e:
        return jsonify({"status": "error", "message": f"Failed to reorder queue: {e}"}), 500


@queue_bp.route("/queue/<downloadId>/remove", methods=["POST", "OPTIONS"])
def remove_from_queue(downloadId: str) -> Any:
    """Remove a pending item by its download ID."""
    if request.method == "OPTIONS":
        return "", 204

    try:
        # Debug: Log what we're trying to remove
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Attempting to remove downloadId: {downloadId}")

        # Debug: Check what's currently in the unified manager
        all_downloads = unified_download_manager.get_all_downloads()
        logger.info(f"Current downloads in unified manager: {list(all_downloads.keys())}")

        removed = unified_download_manager.remove_download(downloadId)
        if not removed:
            logger.warning(f"Failed to remove downloadId {downloadId} - not found in unified manager")
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Queued item not found",
                        "downloadId": downloadId,
                    }
                ),
                404,
            )
        logger.info(f"Successfully removed downloadId: {downloadId}")
        return jsonify({"status": "success", "downloadId": downloadId})
    except Exception as e:
        logger.error(f"Exception during queue removal: {e}", exc_info=True)
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Failed to remove from queue: {e}",
                    "downloadId": downloadId,
                }
            ),
            500,
        )


@queue_bp.route("/queue/<downloadId>/force-start", methods=["POST", "OPTIONS"])
def force_start(downloadId: str) -> Any:
    """Force start a queued item immediately, ignoring capacity constraints."""
    if request.method == "OPTIONS":
        return "", 204

    try:
        ok = unified_download_manager.force_start(downloadId)
        if not ok:
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": "Queued item not found",
                        "downloadId": downloadId,
                    }
                ),
                404,
            )
        return jsonify({"status": "success", "downloadId": downloadId})
    except Exception as e:
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Failed to force start: {e}",
                    "downloadId": downloadId,
                }
            ),
            500,
        )
