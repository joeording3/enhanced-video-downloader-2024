"""
Provide gallery-dl download functionality.

This module defines functions to handle image and gallery downloads using the
gallery-dl command-line tool, integrating with the server configuration.
"""

import logging
import subprocess
from pathlib import Path
from typing import Any

from flask import jsonify

from server.config import Config

# Get a logger instance
logger = logging.getLogger(__name__)


def handle_gallery_dl_download(data: dict[str, Any]) -> Any:
    """
    Handle gallery download requests.

    Parse and validate input data, determine the download path from server config,
    construct and execute the gallery-dl command, and return the result.

    Parameters
    ----------
    data : Dict[str, Any]
        Dictionary containing 'url', 'downloadId', and optional 'options'.

    Returns
    -------
    Any
        Flask JSON response tuple (response, status code) indicating success or error.
    """
    # Initialize and validate
    download_path, url, downloadId, options, init_err = _init_gallery_dl(data)
    if init_err:
        return init_err
    # Build command and execute
    cmd = _build_gallery_command(options, url)
    return _execute_gallery_download(cmd, download_path, downloadId, url)


# Helper to initialize gallery-dl download and prepare directory
def _init_gallery_dl(data: dict[str, Any]) -> tuple[str | None, str, str, dict[str, Any], tuple[Any, int] | None]:
    """
    Validate URL and prepare download directory for gallery-dl or return error.

    Returns (download_path, url, downloadId, options, error_tuple).
    """
    url = data.get("url", "").strip()
    downloadId = data.get("downloadId", "N/A")
    options = data.get("options", {})
    if not url:
        logger.warning(f"[{downloadId}] No URL provided for gallery-dl download.")
        return (
            None,
            url,
            downloadId,
            options,
            (
                jsonify({"status": "error", "message": "No URL provided", "downloadId": downloadId}),
                400,
            ),
        )
    try:
        config = Config.load()
        download_path = config.get_value("download_dir")
        if not download_path:
            logger.error(f"[{downloadId}] Download directory not configured for gallery-dl.")
            return (
                None,
                url,
                downloadId,
                options,
                (
                    jsonify(
                        {"status": "error", "message": "Download directory not configured.", "downloadId": downloadId}
                    ),
                    500,
                ),
            )
        Path(download_path).mkdir(parents=True, exist_ok=True)
    except Exception as e:
        dir_msg = download_path if download_path else "an unconfigured path"
        logger.error(
            f"[{downloadId}] Error accessing or creating download directory {dir_msg} for gallery-dl: {e}",
            exc_info=True,
        )
        return (
            None,
            url,
            downloadId,
            options,
            (
                jsonify(
                    {
                        "status": "error",
                        "message": f"Server error with download directory: {e!s}",
                        "downloadId": downloadId,
                    }
                ),
                500,
            ),
        )
    return download_path, url, downloadId, options, None


# Helper to build the gallery-dl command based on options and URL
def _build_gallery_command(options: dict[str, Any], url: str) -> list[str]:
    """Construct the gallery-dl command list from options and URL."""
    cmd: list[str] = ["gallery-dl"]
    for key, value in options.items():
        key_str = str(key)
        if isinstance(value, bool):
            if value:
                cmd.append(f"--{key_str}")
        elif isinstance(value, str | int | float):
            cmd.extend([f"--{key_str}", str(value)])
        else:
            for item in value:
                cmd.extend([f"--{key_str}", str(item)])
    cmd.append(url)
    return cmd


# Helper to execute gallery-dl and return Flask JSON response
def _execute_gallery_download(cmd: list[str], download_path: str | None, downloadId: str, url: str) -> tuple[Any, int]:
    """Run gallery-dl subprocess and handle its output and errors."""
    if download_path is None:
        logger.error(f"[{downloadId}] Download path is None")
        return (
            jsonify({"status": "error", "message": "Download path not configured", "downloadId": downloadId}),
            500,
        )
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=download_path)
        stdout, stderr = proc.communicate()
        if proc.returncode == 0:
            logger.info(f"[{downloadId}] gallery-dl succeeded for URL: {url}")
            if stdout:
                logger.debug(stdout.decode("utf-8", "ignore"))
            return (
                jsonify(
                    {
                        "status": "success",
                        "message": "Gallery download initiated successfully.",
                        "downloadId": downloadId,
                    }
                ),
                200,
            )
        error_msg = stderr.decode("utf-8", "ignore").strip()
        logger.error(f"[{downloadId}] gallery-dl failed (code {proc.returncode}): {error_msg}")
        return (
            jsonify({"status": "error", "message": f"Gallery download failed: {error_msg}", "downloadId": downloadId}),
            500,
        )
    except FileNotFoundError:
        logger.exception(f"[{downloadId}] gallery-dl not found.")
        return (
            jsonify(
                {"status": "error", "message": "gallery-dl command not found on server.", "downloadId": downloadId}
            ),
            500,
        )
    except Exception as e:
        logger.error(f"[{downloadId}] Unexpected error: {e}", exc_info=True)
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Unexpected server error during gallery download: {e!s}",
                    "downloadId": downloadId,
                }
            ),
            500,
        )
