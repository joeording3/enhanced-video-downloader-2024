"""
Provide blueprint for status API endpoint.

This module defines the `/status` route for retrieving current download progress data as JSON via a Flask blueprint.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Any

from flask import Blueprint, jsonify, request
from flask.wrappers import Response

from server.downloads import unified_download_manager
from server.downloads.ytdlp import download_errors_from_hooks, map_error_message, parse_bytes

status_bp = Blueprint("status", __name__, url_prefix="/api")

# Auto-expire finished entries from the in-memory status after a grace period
_FINISHED_TTL_SECONDS = int(os.getenv("STATUS_FINISHED_TTL", "120"))

# Track previous download count to only log when it changes
_previous_download_count = 0


def _format_duration(seconds: float) -> str:
    """Format duration in seconds to human-readable string."""
    if seconds < 60:
        return f"{int(seconds)}s"
    if seconds < 3600:
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes}m{secs}s"
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    return f"{hours}h{minutes}m"


def _format_bytes(bytes_value: float) -> str:
    """Format bytes to human-readable string."""
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if bytes_value < 1024.0:
            return f"{bytes_value:.1f}{unit}"
        bytes_value /= 1024.0
    return f"{bytes_value:.1f}PB"


def _analyze_progress_trend(history: list[dict[str, Any]]) -> dict[str, Any]:
    """Analyze progress trend from history data."""
    if len(history) < 2:
        return {"trend": "insufficient_data"}

    try:
        # Extract percent values
        percents: list[float] = []
        for entry in history:
            percent_str = entry.get("percent", "0%")
            if percent_str and percent_str.endswith("%"):
                try:
                    percent = float(percent_str[:-1])
                    percents.append(percent)
                except ValueError:
                    continue

        if len(percents) < 2:
            return {"trend": "insufficient_data"}

        # Calculate trend
        recent_percent: float = percents[-1]
        earlier_percent: float = percents[0]
        progress_made: float = recent_percent - earlier_percent

        if progress_made > 5:
            trend = "improving"
        elif progress_made > 0:
            trend = "slow_progress"
        elif progress_made == 0:
            trend = "stalled"
        else:
            trend = "regressing"

        return {
            "trend": trend,
            "progress_made": progress_made,
            "recent_percent": recent_percent,
            "earlier_percent": earlier_percent,
            "data_points": len(percents),
        }

    except Exception:
        return {"trend": "error_analyzing"}


def _enhance_status_data(status: dict[str, Any]) -> dict[str, Any]:
    """Enhance status data with computed fields and analysis."""
    enhanced_status = dict(status)

    # Add computed fields for better UX
    if "start_time" in enhanced_status and "last_update" in enhanced_status:
        try:
            start_time = datetime.fromisoformat(enhanced_status["start_time"])
            last_update = datetime.fromisoformat(enhanced_status["last_update"])
            elapsed_seconds = (last_update - start_time).total_seconds()
            enhanced_status["elapsed_time"] = _format_duration(elapsed_seconds)
        except Exception:
            enhanced_status["elapsed_time"] = "unknown"

    # Add download speed analysis
    if enhanced_status.get("speeds"):
        recent_speeds = enhanced_status["speeds"][-5:]  # Last 5 speed measurements
        enhanced_status["recent_speeds"] = recent_speeds
        enhanced_status["speed_count"] = len(enhanced_status["speeds"])

        # Calculate average speed
        try:
            speed_values: list[float] = []
            for speed_str in enhanced_status["speeds"]:
                speed_bytes = parse_bytes(speed_str)
                if speed_bytes is not None:
                    speed_values.append(speed_bytes)

            if speed_values:
                avg_speed = sum(speed_values) / len(speed_values)
                enhanced_status["average_speed_bytes"] = avg_speed
                enhanced_status["average_speed_human"] = _format_bytes(avg_speed)
        except Exception:
            # If parsing or averaging fails, keep status enhancement graceful
            enhanced_status["average_speed_bytes"] = None

    # Add progress history summary
    if enhanced_status.get("history"):
        history = enhanced_status["history"]
        enhanced_status["history_count"] = len(history)
        enhanced_status["last_progress_update"] = history[-1]["timestamp"] if history else None

        # Add progress trend analysis
        if len(history) >= 2:
            recent_history = history[-10:]  # Last 10 updates
            enhanced_status["progress_trend"] = _analyze_progress_trend(recent_history)

    # Ensure a top-level URL is available when possible
    try:
        if not enhanced_status.get("url"):
            # Prefer explicit url, then metadata.webpage_url/original_url/url
            meta = enhanced_status.get("metadata") or {}
            if isinstance(meta, dict):
                for key in ("webpage_url", "original_url", "url"):
                    val = meta.get(key)
                    if isinstance(val, str) and val:
                        enhanced_status["url"] = val
                        break
    except Exception:
        # Best effort only
        ...

    # Ensure a top-level title if present in metadata (for UI labels)
    try:
        if not enhanced_status.get("title") and not enhanced_status.get("page_title"):
            meta = enhanced_status.get("metadata") or {}
            if isinstance(meta, dict):
                for key in ("title", "fulltitle", "webpage_title", "page_title"):
                    val = meta.get(key)
                    if isinstance(val, str) and val:
                        enhanced_status["title"] = val
                        break
    except Exception:
        ...

    return enhanced_status


@status_bp.route("/status", methods=["GET"])
def get_all_status() -> Response:
    """Return current download progress data with enhanced details."""
    global _previous_download_count

    # Get all downloads from the unified manager
    all_downloads = unified_download_manager.get_status_summary()

    # Only log when the download count changes
    current_count = len(all_downloads)
    if current_count != _previous_download_count:
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Status endpoint returning {current_count} downloads: {list(all_downloads.keys())}")
        _previous_download_count = current_count

    # Include errors and troubleshooting suggestions
    for downloadId, error in download_errors_from_hooks.items():
        # Determine user-friendly suggestion
        _, suggestion = map_error_message(error.get("original_message", ""))
        if downloadId in all_downloads:
            all_downloads[downloadId]["error"] = error
            all_downloads[downloadId]["troubleshooting"] = error.get("troubleshooting", suggestion)
            # Surface top-level url from error if not already present
            try:
                if not all_downloads[downloadId].get("url") and isinstance(error, dict):
                    err_url = error.get("url") or error.get("original_url")
                    if isinstance(err_url, str) and err_url:
                        all_downloads[downloadId]["url"] = err_url
            except Exception:
                pass
        else:
            all_downloads[downloadId] = {
                "error": error,
                "troubleshooting": error.get("troubleshooting", suggestion),
                "status": "error",
            }
            # Also include url if present on error object
            try:
                if isinstance(error, dict):
                    err_url = error.get("url") or error.get("original_url")
                    if isinstance(err_url, str) and err_url:
                        all_downloads[downloadId]["url"] = err_url
            except Exception:
                pass

    # Enhance status data for all downloads
    enhanced_downloads = {}
    for downloadId, status in all_downloads.items():
        enhanced_status = _enhance_status_data(status)
        enhanced_downloads[downloadId] = enhanced_status

    # Auto-cleanup old finished downloads
    unified_download_manager.cleanup_finished_downloads(_FINISHED_TTL_SECONDS)

    return jsonify(enhanced_downloads)


@status_bp.route("/status/<downloadId>", methods=["GET"])
def get_status_by_id(downloadId: str) -> Response | tuple[Response, int]:
    """Return detailed status for a specific download."""
    status = unified_download_manager.get_download(downloadId)
    error = download_errors_from_hooks.get(downloadId)
    if not status and not error:
        return jsonify({"status": "error", "message": "Download not found"}), 404

    response_data: dict[str, Any] = {}

    if status:
        response_data = _enhance_status_data(status)

    if error:
        response_data["error"] = error
        # Add troubleshooting suggestion
        _, suggestion = map_error_message(error.get("original_message", ""))
        response_data["troubleshooting"] = error.get("troubleshooting", suggestion)

    return jsonify(response_data)


@status_bp.route("/status/<downloadId>", methods=["DELETE"])
def clear_status_by_id(downloadId: str) -> Response | tuple[Response, int]:
    """Clear status for a specific download."""
    cleared = False
    if unified_download_manager.remove_download(downloadId):
        cleared = True
    if downloadId in download_errors_from_hooks:
        del download_errors_from_hooks[downloadId]
        cleared = True
    if cleared:
        return jsonify({"status": "success", "message": "Status cleared"})
    return jsonify({"status": "error", "message": "Download not found"}), 404


@status_bp.route("/status", methods=["DELETE"])
def clear_status_bulk() -> Response | tuple[Response, int]:
    """Clear statuses in bulk based on a filter."""
    # Bulk clear based on status and/or age (in seconds)
    status_filter = request.args.get("status")
    age_param = request.args.get("age")
    cutoff = None
    if age_param:
        try:
            age_sec = int(age_param)
            cutoff = datetime.now(timezone.utc) - timedelta(seconds=age_sec)
        except ValueError:
            return jsonify({"status": "error", "message": f"Invalid age value: {age_param}"}), 400

    cleared_ids: list[str] = []
    all_downloads = unified_download_manager.get_all_downloads()
    ids_to_remove: list[str] = []
    for downloadId, v in all_downloads.items():
        # Apply status filter if provided
        if status_filter and v.get("status") != status_filter:
            continue
        # Apply age filter if provided
        if cutoff:
            hist = v.get("history")
            if not hist:
                continue
            try:
                last_ts = datetime.fromisoformat(hist[-1]["timestamp"])
            except Exception:
                continue
            if last_ts > cutoff:
                continue
        ids_to_remove.append(downloadId)
    for downloadId in ids_to_remove:
        if unified_download_manager.remove_download(downloadId):
            cleared_ids.append(downloadId)

    return jsonify({"status": "success", "cleared_count": len(cleared_ids), "cleared_ids": cleared_ids})
