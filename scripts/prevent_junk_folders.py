#!/usr/bin/env python3
"""
Prevent junk folders from being created in the root directory.

This script monitors the filesystem for the creation of folders with random
Unicode characters and immediately cleans them up to prevent accumulation.
"""

import logging
import re
import time
from pathlib import Path
from typing import Set

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("logs/junk_folder_prevention.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# Patterns for junk folder names
JUNK_PATTERNS = [
    r"^[^\w\-_\.]{1,10}$",  # Random Unicode characters
    r"^[a-f0-9]{8,}$",  # Hex strings
    r"^[A-Za-z0-9]{8,}$",  # Random alphanumeric
    r".*[^\w\-_\.].*",  # Contains non-word characters
    r"^[0-9]$",  # Single digit folders
]

# Known good folders that should not be removed
GOOD_FOLDERS = {
    ".git",
    ".venv",
    "node_modules",
    "logs",
    "tmp",
    "tests",
    "server",
    "extension",
    "scripts",
    "config",
    "ci",
    "bin",
    "coverage",
    "htmlcov",
    "reports",
    "mutants",
    "_metadata",
    ".benchmarks",
    ".cursor",
    ".husky",
    ".hypothesis",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    "test-results",
    "playwright-report",
    "videodownloader_server.egg-info",
}


def is_junk_folder(folder_name: str) -> bool:
    """
    Check if a folder name matches junk patterns.

    :param folder_name: Name of the folder to check
    :returns: True if the folder appears to be junk
    """
    # Skip known good folders
    if folder_name in GOOD_FOLDERS:
        return False

    # Check against junk patterns
    return any(re.match(pattern, folder_name) for pattern in JUNK_PATTERNS)


def get_current_folders() -> Set[str]:
    """
    Get the current list of folders in the root directory.

    :returns: Set of folder names
    """
    root = Path()
    return {item.name for item in root.iterdir() if item.is_dir()}


def cleanup_junk_folders() -> int:
    """
    Clean up any junk folders found in the root directory.

    :returns: Number of folders cleaned up
    """
    cleaned_count = 0
    root = Path()

    for item in root.iterdir():
        if not item.is_dir():
            continue

        if is_junk_folder(item.name):
            try:
                # Check if folder is empty
                if not any(item.iterdir()):
                    item.rmdir()
                    logger.info(f"Removed empty junk folder: {item.name}")
                    cleaned_count += 1
                else:
                    # If not empty, log but don't remove (might be important)
                    logger.warning(f"Found non-empty junk folder: {item.name}")
            except Exception:
                logger.exception(f"Failed to remove junk folder {item.name}")

    return cleaned_count


def monitor_and_prevent(check_interval: int = 30) -> None:
    """
    Continuously monitor for new junk folders and prevent their accumulation.

    :param check_interval: Seconds between checks
    """
    logger.info("Starting junk folder prevention monitor...")
    previous_folders = get_current_folders()

    try:
        while True:
            current_folders = get_current_folders()
            new_folders = current_folders - previous_folders

            if new_folders:
                logger.info(f"New folders detected: {new_folders}")
                junk_folders = [folder for folder in new_folders if is_junk_folder(folder)]

                if junk_folders:
                    logger.warning(f"Junk folders detected: {junk_folders}")
                    cleaned = cleanup_junk_folders()
                    if cleaned > 0:
                        logger.info(f"Cleaned up {cleaned} junk folders")

            previous_folders = get_current_folders()
            time.sleep(check_interval)

    except KeyboardInterrupt:
        logger.info("Junk folder prevention monitor stopped by user")
    except Exception:
        logger.exception("Error in folder monitor")


def main():
    """Run the junk folder prevention system."""
    import argparse

    parser = argparse.ArgumentParser(description="Monitor and prevent junk folders")
    parser.add_argument("--cleanup", action="store_true", help="Clean up existing junk folders and exit")
    parser.add_argument("--monitor", action="store_true", help="Start continuous monitoring")
    parser.add_argument("--interval", type=int, default=30, help="Check interval in seconds (default: 30)")

    args = parser.parse_args()

    # Ensure logs directory exists
    Path("logs").mkdir(exist_ok=True)

    if args.cleanup:
        cleaned = cleanup_junk_folders()
        if cleaned > 0:
            logger.info(f"Cleaned up {cleaned} junk folders")
        else:
            logger.info("No junk folders found to clean up")

    if args.monitor:
        monitor_and_prevent(args.interval)

    # If no specific action, just do a one-time cleanup
    if not args.cleanup and not args.monitor:
        cleaned = cleanup_junk_folders()
        if cleaned > 0:
            logger.info(f"Cleaned up {cleaned} junk folders")
        else:
            logger.info("No junk folders found to clean up")


if __name__ == "__main__":
    main()
