#!/usr/bin/env python3
"""
Clean up empty folders in the root directory.

This script removes empty folders from the root directory, using .gitignore
patterns to limit scope and respect important directories.
"""

import logging
import re
import time
from pathlib import Path
from typing import List, Set

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("logs/empty_folder_cleanup.log"), logging.StreamHandler()],
)
logger = logging.getLogger(__name__)

# Critical folders that should never be removed
CRITICAL_FOLDERS = {
    ".git",
    ".venv",
    "node_modules",
    "server",
    "extension",
    "scripts",
    "config",
    "tests",
    "docs",
    "ci",
    "bin",
    "coverage",
    "htmlcov",
    "reports",
    "logs",
    "tmp",
    "mutants",
    "_metadata",
    "extension-instrumented",
    "test-results",
    "playwright-report",
    "videodownloader_server.egg-info",
    ".hypothesis",
    ".pytest_cache",
    ".ruff_cache",
    ".stryker-tmp",
    ".mypy_cache",
    ".cursor",
    ".husky",
    ".benchmarks",
}


def load_gitignore_patterns() -> List[str]:
    """
    Load patterns from .gitignore file.

    :returns: List of gitignore patterns
    """
    gitignore_path = Path(".gitignore")
    if not gitignore_path.exists():
        logger.warning(".gitignore not found, using default patterns")
        return []

    patterns = []
    with gitignore_path.open() as f:
        for line in f:
            stripped_line = line.strip()
            if stripped_line and not stripped_line.startswith("#"):
                # Convert gitignore patterns to regex patterns
                pattern = stripped_line.replace(".", r"\.").replace("*", r".*").replace("?", r".")
                if stripped_line.endswith("/"):
                    pattern = pattern[:-1] + r"$"
                patterns.append(pattern)

    return patterns


def should_ignore_folder(folder_name: str, gitignore_patterns: List[str]) -> bool:
    """
    Check if a folder should be ignored based on .gitignore patterns.

    :param folder_name: Name of the folder to check
    :param gitignore_patterns: List of gitignore patterns
    :returns: True if the folder should be ignored
    """
    # Always protect critical folders
    if folder_name in CRITICAL_FOLDERS:
        return True

    # Check against gitignore patterns
    return any(re.match(pattern, folder_name) for pattern in gitignore_patterns)


def get_current_folders() -> Set[str]:
    """
    Get the current list of folders in the root directory.

    :returns: Set of folder names
    """
    root = Path()
    return {item.name for item in root.iterdir() if item.is_dir()}


def cleanup_empty_folders() -> int:
    """
    Clean up any empty folders found in the root directory.

    :returns: Number of folders cleaned up
    """
    cleaned_count = 0
    root = Path()
    gitignore_patterns = load_gitignore_patterns()

    for item in root.iterdir():
        if not item.is_dir():
            continue

        # Skip folders that should be ignored
        if should_ignore_folder(item.name, gitignore_patterns):
            logger.debug(f"Skipping protected folder: {item.name}")
            continue

        try:
            # Check if folder is empty
            if not any(item.iterdir()):
                item.rmdir()
                logger.info(f"Removed empty folder: {item.name}")
                cleaned_count += 1
            else:
                logger.debug(f"Folder not empty, skipping: {item.name}")
        except Exception:
            logger.exception(f"Failed to remove folder {item.name}")

    return cleaned_count


def monitor_and_prevent(check_interval: int = 30) -> None:
    """
    Continuously monitor for new empty folders and clean them up.

    :param check_interval: Seconds between checks
    """
    logger.info("Starting empty folder cleanup monitor...")
    previous_folders = get_current_folders()

    try:
        while True:
            current_folders = get_current_folders()
            new_folders = current_folders - previous_folders

            if new_folders:
                logger.info(f"New folders detected: {new_folders}")
                cleaned = cleanup_empty_folders()
                if cleaned > 0:
                    logger.info(f"Cleaned up {cleaned} empty folders")

            previous_folders = get_current_folders()
            time.sleep(check_interval)

    except KeyboardInterrupt:
        logger.info("Empty folder cleanup monitor stopped by user")
    except Exception:
        logger.exception("Error in folder monitor")


def main():
    """Run the empty folder cleanup system."""
    import argparse

    parser = argparse.ArgumentParser(description="Monitor and clean up empty folders")
    parser.add_argument("--cleanup", action="store_true", help="Clean up existing empty folders and exit")
    parser.add_argument("--monitor", action="store_true", help="Start continuous monitoring")
    parser.add_argument("--interval", type=int, default=30, help="Check interval in seconds (default: 30)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")

    args = parser.parse_args()

    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Ensure logs directory exists
    Path("logs").mkdir(exist_ok=True)

    if args.cleanup:
        cleaned = cleanup_empty_folders()
        if cleaned > 0:
            logger.info(f"Cleaned up {cleaned} empty folders")
        else:
            logger.info("No empty folders found to clean up")

    if args.monitor:
        monitor_and_prevent(args.interval)

    # If no specific action, just do a one-time cleanup
    if not args.cleanup and not args.monitor:
        cleaned = cleanup_empty_folders()
        if cleaned > 0:
            logger.info(f"Cleaned up {cleaned} empty folders")
        else:
            logger.info("No empty folders found to clean up")


if __name__ == "__main__":
    main()
