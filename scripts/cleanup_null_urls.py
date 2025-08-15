#!/usr/bin/env python3
"""
Clean up history entries with null URLs.

This script removes or fixes history entries that have null/empty URLs,
which cause the "Original URL unavailable for retry" error in the frontend.
"""

import json
import logging
from pathlib import Path
from typing import Any

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def load_history_file(history_path: Path) -> list[dict[str, Any]]:
    """Load history from JSON file."""
    try:
        with history_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return data
        logger.warning(f"History file {history_path} does not contain a list")
        return []
    except Exception as e:
        logger.error(f"Failed to load history file {history_path}: {e}")
        return []


def save_history_file(history_path: Path, history: list[dict[str, Any]]) -> bool:
    """Save history to JSON file."""
    try:
        with history_path.open("w", encoding="utf-8") as f:
            json.dump(history, f, indent=2, ensure_ascii=False)
            f.write("\n")  # Ensure newline at end
        return True
    except Exception as e:
        logger.error(f"Failed to save history file {history_path}: {e}")
        return False


def cleanup_null_urls(history: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    """Clean up history entries with null/empty URLs.

    Returns:
        tuple: (cleaned_history, removed_count)
    """
    cleaned_history = []
    removed_count = 0

    for entry in history:
        url = entry.get("url")

        # Check if URL is null, empty, or whitespace-only
        if not url or (isinstance(url, str) and not url.strip()):
            logger.info(f"Removing entry with invalid URL: {entry.get('downloadId', 'unknown')} - URL: {url!r}")
            removed_count += 1
            continue

        # Keep valid entries
        cleaned_history.append(entry)

    return cleaned_history, removed_count


def main():
    """Execute the main cleanup function."""
    # Find history file
    possible_paths = [
        Path("server/data/history.json"),
        Path("data/history.json"),
        Path.home() / "Downloads" / "VideoDownloader" / "history.json"
    ]

    history_path = None
    for path in possible_paths:
        if path.exists():
            history_path = path
            break

    if not history_path:
        logger.error("Could not find history.json file")
        logger.info("Searched in:")
        for path in possible_paths:
            logger.info(f"  - {path}")
        return

    logger.info(f"Found history file: {history_path}")

    # Load history
    history = load_history_file(history_path)
    if not history:
        logger.info("History file is empty or could not be loaded")
        return

    logger.info(f"Loaded {len(history)} history entries")

    # Count entries with null URLs before cleanup
    null_url_count = sum(1 for entry in history if not entry.get("url") or
                         (isinstance(entry.get("url"), str) and not entry.get("url").strip()))

    if null_url_count == 0:
        logger.info("No entries with null URLs found - no cleanup needed")
        return

    logger.info(f"Found {null_url_count} entries with null/empty URLs")

    # Clean up
    cleaned_history, removed_count = cleanup_null_urls(history)

    logger.info(f"Removed {removed_count} entries with invalid URLs")
    logger.info(f"Remaining entries: {len(cleaned_history)}")

    # Create backup
    backup_path = history_path.with_suffix(".json.backup")
    if save_history_file(backup_path, history):
        logger.info(f"Created backup: {backup_path}")

    # Save cleaned history
    if save_history_file(history_path, cleaned_history):
        logger.info(f"Saved cleaned history to: {history_path}")
    else:
        logger.error("Failed to save cleaned history")
        return

    logger.info("Cleanup completed successfully!")


if __name__ == "__main__":
    main()
