"""
Manage extraction rules for Enhanced Video Downloader server.

This module provides functions to load and save extraction rule definitions from a JSON file.
"""

import contextlib
import json
from pathlib import Path
from typing import Any

# Update the rules file path to use the config directory
CONFIG_DIR = Path(__file__).parent / "config"
CONFIG_DIR.mkdir(parents=True, exist_ok=True)
RULES_PATH = CONFIG_DIR / "extraction_rules.json"


def load_extraction_rules() -> list[dict[str, Any]]:
    """
    Load extraction rules from storage file.

    Returns
    -------
    List[Dict[str, Any]]
        List of extraction rule definitions, or empty list if file is missing or invalid.
    """
    try:
        with RULES_PATH.open(encoding="utf-8") as f:
            data: Any = json.load(f)
            # Ensure the loaded data is a list of dictionaries
            if isinstance(data, list) and all(isinstance(item, dict) for item in data):  # type: ignore[arg-type]
                # Cast to proper type after validation
                return data  # type: ignore[return-value]
            return []
    except (OSError, json.JSONDecodeError):
        return []


def save_extraction_rules(rules: list[dict[str, Any]]) -> bool:
    """
    Save extraction rules to storage file atomically.

    Parameters
    ----------
    rules : List[Dict[str, Any]]
        List of extraction rule definitions to save.

    Returns
    -------
    bool
        True if rules were saved successfully, False otherwise.
    """
    tmp = RULES_PATH.with_suffix(".json.tmp")
    try:
        with tmp.open("w", encoding="utf-8") as f:
            json.dump(rules, f, indent=2)
            f.flush()
        tmp.replace(RULES_PATH)
    except Exception:
        with contextlib.suppress(Exception):
            tmp.unlink()
        return False
    else:
        return True
