"""
Manage download history for Enhanced Video Downloader server.

This module provides functions to load, save, append, and clear download history
entries stored in a JSON file.
"""

import contextlib
import json
from collections.abc import Iterable  # Added cast
from pathlib import Path
from typing import Any, cast

from server.config import Config
from server.utils import cache_result

# Update the history file path to use the data directory
# Default path under server/data retained for safety if config is unavailable.
_FALLBACK_DATA_DIR = Path(__file__).parent / "data"
_FALLBACK_DATA_DIR.mkdir(parents=True, exist_ok=True)
_FALLBACK_HISTORY_PATH = _FALLBACK_DATA_DIR / "history.json"

# Backward-compatibility variable used by CLI/tests; can be monkeypatched.
# Default equals the fallback path; when changed, it overrides resolution.
HISTORY_PATH: Path = _FALLBACK_HISTORY_PATH


def _resolve_history_path() -> Path:
    """
    Determine the consolidated history file path.

    Priority:
    1) Explicit history_file in config/env
    2) <download_dir>/history.json
    3) Fallback to server/data/history.json
    """
    # If tests or tools have overridden HISTORY_PATH, honor it
    try:
        if HISTORY_PATH != _FALLBACK_HISTORY_PATH:
            return HISTORY_PATH
    except Exception:
        pass
    try:
        cfg = Config.load()
        # If history_file explicitly set, use it
        history_file = getattr(cfg, "history_file", None)
        if history_file:
            p = Path(history_file)
            with contextlib.suppress(Exception):
                p.parent.mkdir(parents=True, exist_ok=True)
            return p
        # Default to download_dir/history.json
        dl = getattr(cfg, "download_dir", None)
        if dl:
            p2 = Path(dl) / "history.json"
            with contextlib.suppress(Exception):
                p2.parent.mkdir(parents=True, exist_ok=True)
            return p2
    except Exception:
        # Config not available; fall back
        pass
    return _FALLBACK_HISTORY_PATH


def get_history_path() -> Path:
    """Public accessor for the current consolidated history file path."""
    return _resolve_history_path()


@cache_result(ttl_seconds=2)
def _load_history_cached(history_path_str: str) -> list[dict[str, Any]]:
    """Load history via a cached path-based helper."""
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
    """Load download history from the resolved history path with caching per-path."""
    return _load_history_cached(str(_resolve_history_path()))


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
    path = _resolve_history_path()
    tmp = path.with_suffix(".json.tmp")
    try:
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(history, f, indent=2)
            # Ensure Prettier-compliant newline at EOF
            f.write("\n")
            f.flush()
        tmp.replace(path)
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
    history_path = _resolve_history_path()
    # Import existing file contents if any; never overwrite
    history = _load_history_cached(str(history_path))
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
    path = _resolve_history_path()
    try:
        if path.exists():
            path.unlink()  # Deletes the file

    except OSError:
        return False
    else:
        return True


def consolidate_lingering_info_json(scan_dir: Path | None = None, recursive: bool = True) -> int:
    """
    Import lingering per-video metadata JSON files into consolidated history and remove them.

    Scans the configured download directory (or the provided scan_dir) for files
    matching "*.info.json". For each JSON file found, attempts to load its
    contents and append the entry to history (avoiding simple duplicates by id or url),
    then deletes the metadata JSON file. Returns the number of metadata files processed
    (regardless of whether they resulted in a new history entry).

    Parameters
    ----------
    scan_dir : Path | None
        Directory to scan. If None, uses the configured download_dir.
    recursive : bool
        Whether to scan subdirectories recursively.

    Returns
    -------
    int
        Count of metadata JSON files processed and removed.
    """
    try:
        # Resolve scan directory
        base_dir: Path | None = scan_dir
        if base_dir is None:
            try:
                cfg = Config.load()
                dl = getattr(cfg, "download_dir", None)
                if dl:
                    base_dir = Path(dl)
            except Exception:
                base_dir = None
        if base_dir is None or not base_dir.exists() or not base_dir.is_dir():
            return 0

        # Prepare deduplication sets from current history
        existing_history = load_history()

        def _iter(values: Iterable[dict[str, Any]]) -> Iterable[dict[str, Any]]:
            return values

        existing_ids: set[str] = set()
        existing_urls: set[str] = set()
        for h in _iter(existing_history):
            try:
                if "downloadId" in h and h.get("downloadId") is not None:
                    existing_ids.add(str(h.get("downloadId")))
                url_val = h.get("webpage_url") or h.get("url")
                if url_val is not None:
                    existing_urls.add(str(url_val))
            except Exception:
                # Best-effort; skip malformed entries
                continue

        # Find candidate files
        candidates = base_dir.rglob("*.info.json") if recursive else base_dir.glob("*.info.json")

        processed = 0
        for p in list(candidates):
            # Only handle regular files
            if not p.is_file():
                continue
            data: Any = None
            try:
                with p.open(encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                data = None

            # Append if dict-like and not a simple duplicate
            if isinstance(data, dict):
                try:
                    new_id = data.get("downloadId")
                    new_url = data.get("webpage_url") or data.get("url")
                    is_duplicate = False
                    if new_id is not None and str(new_id) in existing_ids:
                        is_duplicate = True
                    if not is_duplicate and new_url is not None and str(new_url) in existing_urls:
                        is_duplicate = True
                    if not is_duplicate:
                        append_history_entry(data)
                        if new_id is not None:
                            existing_ids.add(str(new_id))
                        if new_url is not None:
                            existing_urls.add(str(new_url))
                except Exception:
                    # Do not block cleanup on append errors
                    pass

            # Remove the metadata JSON regardless of append outcome
            with contextlib.suppress(Exception):
                p.unlink()
                processed += 1

        return processed
    except Exception:
        # Never raise from a maintenance helper
        return 0
