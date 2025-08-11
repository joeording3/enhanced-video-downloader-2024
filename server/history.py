"""
Manage download history for Enhanced Video Downloader server.

This module provides functions to load, save, append, and clear download history
entries stored in a JSON file.
"""

import contextlib
import json
from pathlib import Path
from typing import Any, cast  # Added cast

from server.utils import cache_result

# Update the history file path to use the data directory
DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
HISTORY_PATH = DATA_DIR / "history.json"


@cache_result(ttl_seconds=60)
def _load_history_cached(history_path_str: str) -> list[dict[str, Any]]:
    """Internal cached loader keyed by the history file path string."""
    path = Path(history_path_str)
    try:
        with path.open(encoding="utf-8") as f:
            data: Any = json.load(f)
            if isinstance(data, list):
                return cast(list[dict[str, Any]], data)
            return []
    except (OSError, json.JSONDecodeError):
        return []


def load_history() -> list[dict[str, Any]]:
    """Load download history from the current HISTORY_PATH with caching per-path."""
    return _load_history_cached(str(HISTORY_PATH))


def save_history(history: list[dict[str, Any]]) -> bool:
    """
    Save download history to the storage file atomically.

    Parameters
    ----------
    history : List[Dict[str, Any]]
        List of history entries to save.

    Returns
    -------
    bool
        True if history was saved successfully, False otherwise.
    """
    tmp = HISTORY_PATH.with_suffix(".json.tmp")
    try:
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
            f.flush()
        tmp.replace(HISTORY_PATH)
    except Exception:
        with contextlib.suppress(Exception):
            tmp.unlink()
        return False
    else:
        return True


def append_history_entry(entry: dict[str, Any]) -> None:
    """
    Append a new entry to the download history.

    Add the entry to the beginning of the history list and trim to a maximum of 100 entries.

    Parameters
    ----------
    entry : Dict[str, Any]
        The history entry to add.
    """
    history = load_history()
    # Prepend new entry
    history.insert(0, entry)
    # Trim to 100 max
    history = history[:100]
    save_history(history)


def clear_history() -> bool:
    """
    Clear all download history entries.

    Returns
    -------
    bool
        True if history was cleared successfully, False otherwise.
    """
    try:
        if HISTORY_PATH.exists():
            HISTORY_PATH.unlink()  # Deletes the file

    except OSError:
        return False
    else:
        return True
