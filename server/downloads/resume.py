"""
Manage resumption of incomplete and legacy downloads.

This module provides functions to resume downloads for partial (.part) files
and to handle API requests for resumption of all incomplete or failed downloads.
"""

import logging
from pathlib import Path
from typing import Any, cast  # Added Dict, Any, List, cast

from flask import current_app, jsonify

from server.cli_resume_helpers import derive_resume_url
from server.downloads.ytdlp import handle_ytdlp_download
from server.history import load_history

logger = logging.getLogger(__name__)


def actual_resume_logic_for_file(part_file_path: str, _download_dir: str, _app_config: dict[str, Any]) -> bool:
    """
    Resume a single partial download file.

    Attempt to resume a download from a given .part file path by determining
    the original URL and invoking the appropriate download handler.

    Parameters
    ----------
    part_file_path : str
        Path to the partial download file (e.g., ending in .part).
    download_dir : str
        Directory where downloads are stored.
    app_config : Dict[str, Any]
        Application configuration for resumption logic.

    Returns
    -------
    bool
        True if resumption succeeded, False otherwise.
    """
    part_path = Path(part_file_path)
    # Determine original URL for this part file
    url = derive_resume_url(part_path, logger)
    if not url:
        logger.warning(f"Could not determine resume URL for {part_file_path}.")
        return False
    # Prepare data for downloader
    downloadId = part_path.stem
    data: dict[str, Any] = {
        "url": url,
        "downloadId": downloadId,
        "page_title": part_path.stem,
        "download_playlist": False,
    }
    try:
        # Invoke the yt-dlp download handler to resume the download
        handle_ytdlp_download(data)
        logger.info(f"Resumed download for {part_file_path} via {url}")
    except Exception:
        logger.error(f"Error resuming {part_file_path}", exc_info=True)
        return False
    else:
        return True


def resume_all_incomplete_downloads() -> dict[str, Any]:
    """
    Resume all incomplete downloads in the download directory.

    Scan for partial download files (*.part) and attempt to resume each using
    `actual_resume_logic_for_file`.

    Parameters
    ----------
    None

    Returns
    -------
    Dict[str, Any]
        Dictionary containing:
        - status : str
            'success' or 'error'.
        - message : str
            Summary message of the resumption operation.
        - resumed_count : int
            Number of successfully resumed downloads.
        - failed_or_skipped_count : int
            Number of downloads that failed or were skipped.
    """
    if not current_app:
        logger.error("Cannot resume downloads: Flask app context not available.")
        return {
            "status": "error",
            "message": "App context not available for resume_all_incomplete_downloads",
        }

    app_config: dict[str, Any] = cast(dict[str, Any], current_app.config)
    download_dir: str | None = cast(str | None, app_config.get("DOWNLOAD_DIR"))

    if not download_dir:  # This correctly checks for None or empty string
        logger.error("DOWNLOAD_DIR not configured. Cannot resume downloads.")
        return {"status": "error", "message": "DOWNLOAD_DIR not configured."}

    if not Path(download_dir).exists() or not Path(download_dir).is_dir():
        logger.info(f"Download directory {download_dir} does not exist or is not a directory. No downloads to resume.")
        return {
            "status": "success",
            "message": "Download directory invalid, nothing to resume.",
        }

    logger.info(f"Scanning {download_dir} (recursively) for partial downloads to resume...")
    # Common partial file extensions. Search recursively to catch nested structures.
    patterns = ("**/*.part", "**/*.ytdl")
    part_files: list[str] = []
    try:
        base = Path(download_dir)
        for pattern in patterns:
            part_files.extend(str(p) for p in base.glob(pattern))
    except Exception:
        logger.error("Error scanning for partial files", exc_info=True)

    resumed_count = 0
    failed_to_resume_count = 0

    if not part_files:
        logger.info("No partial download files (*.part, *.ytdl) found to resume.")
        return {"status": "success", "message": "No partial downloads found."}

    logger.info(f"Found {len(part_files)} potential partial files: {part_files}")

    for part_file_path in part_files:
        # Attempt to resume each partial file
        success = actual_resume_logic_for_file(part_file_path, download_dir, app_config)
        if success:
            resumed_count += 1
        else:
            failed_to_resume_count += 1

    summary_message = (
        f"Resumption scan complete. Found: {len(part_files)} partial files. "
        f"Successfully resumed: {resumed_count}. "
        f"Failed/Skipped: {failed_to_resume_count}."
    )
    logger.info(summary_message)
    return {
        "status": "success",
        "message": summary_message,
        "resumed_count": resumed_count,
        "failed_or_skipped_count": failed_to_resume_count,
    }


# This is the function imported by the Blueprint


def handle_resume_download(
    _data: dict[str, Any] | None = None,
) -> Any:
    """
    Process API request to resume downloads.

    Invoke `resume_all_incomplete_downloads` and return its result as a Flask JSON response.

    Parameters
    ----------
    data : Optional[Dict[str, Any]]
        Optional request data payload (currently unused).

    Returns
    -------
    Any
        Flask JSON response containing resumption results.
    """
    logger.info("API request received to resume downloads.")
    # This function is called within a request context, so current_app is available.
    result: dict[str, Any] = resume_all_incomplete_downloads()
    return jsonify(result)


def find_downloads_to_resume() -> list[dict[str, Any]]:
    """
    Find failed downloads in history eligible for resumption.

    Retrieve history entries with status 'failed' for potential resumption.

    Returns
    -------
    List[Dict[str, Any]]
        List of history entries for downloads eligible for resumption.
    """
    logger.info("Finding failed downloads that can be resumed")
    try:
        # Look in the history file for failed downloads
        # Get history and filter for failed entries
        history: list[dict[str, Any]] = []
        try:
            history = load_history()  # This now correctly typed
        except Exception:
            logger.exception("Error retrieving download history")
            return []

        # Filter for failed downloads
        failed_downloads: list[dict[str, Any]] = [entry for entry in history if entry.get("status") == "failed"]

        logger.info(f"Found {len(failed_downloads)} failed downloads in history")
    except Exception:
        logger.exception("Error finding downloads to resume")
        return []
    else:
        return failed_downloads
