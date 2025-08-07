"""
Provide blueprint for health API endpoint.

This module defines a simple health check endpoint returning server identification.
"""

from typing import Any

from flask import Blueprint

health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET", "OPTIONS"])
def health() -> Any:
    """
    Perform health check.

    Returns
    -------
    Any
        Flask response with JSON containing server identification.
    """
    return {"app_name": "Enhanced Video Downloader", "status": "healthy"}, 200
