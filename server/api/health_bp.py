"""
Provide blueprint for health API endpoint.

This module defines a comprehensive health check endpoint returning detailed server status.
"""

import logging
import time
from typing import Any

from flask import Blueprint, jsonify

from server.downloads import progress_data
from server.downloads.ytdlp import download_process_registry, download_tempfile_registry

logger = logging.getLogger(__name__)
health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET", "OPTIONS"])  # Will be mounted under /api via url_prefix
def health() -> Any:
    """
    Perform comprehensive health check.

    Returns
    -------
    Any
        Flask response with JSON containing detailed server status.
    """
    try:
        # Get download statistics
        active_downloads = len(download_process_registry)
        temp_files = sum(len(files) for files in download_tempfile_registry.values())
        progress_entries = len(progress_data)

        # Get system information
        import psutil

        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")

        # Check server status
        server_status = "healthy"
        if active_downloads > 10:  # Arbitrary threshold
            server_status = "busy"

        health_data: dict[str, Any] = {
            "app_name": "Enhanced Video Downloader",
            "status": server_status,
            "timestamp": time.time(),
            "downloads": {"active": active_downloads, "temp_files": temp_files, "progress_entries": progress_entries},
            "system": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "disk_percent": disk.percent,
                "disk_free_gb": round(disk.free / (1024**3), 2),
            },
            "version": "1.0.0",
        }

        return jsonify(health_data), 200

    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return jsonify(
            {"app_name": "Enhanced Video Downloader", "status": "unhealthy", "error": str(e), "timestamp": time.time()}
        ), 500
