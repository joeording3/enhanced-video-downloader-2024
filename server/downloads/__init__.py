"""
Provide download functionality for the Enhanced Video Downloader server.

This package contains modules for downloading videos and galleries from various sources.
It manages download progress tracking, resumption, and other download-related functionality.
"""

import threading
from typing import Any

progress_data: "dict[str, Any]" = {}
progress_lock = threading.Lock()
