#!/usr/bin/env python3
"""
Clean up junk folders and transient caches.

Capabilities:
- Remove empty, non-critical folders at the repository root ("junk folders").
- Clear transient temp/cache directories after test runs (opt-in flag).
- Remove Windows-reserved device-name paths (e.g., LPT1) that can break tools like Chrome.

Use cases:
- Post-test housekeeping: `python scripts/prevent_junk_folders.py --clear-temp`
- Continuous monitor (dev): `python scripts/prevent_junk_folders.py --monitor`

Notes:
- Respects a protected set of critical directories and the project's .gitignore patterns.
- By default, coverage and human-readable reports are NOT deleted. Use `--clear-reports` to include
  coverage HTML, Playwright reports, mutation outputs, etc.
"""

import logging
import re
import sys
import time
from pathlib import Path
from typing import Iterable


def setup_script_logging():
    """Set up logging for this script using central configuration."""
    # Add project root to path for imports
    sys.path.insert(0, str(Path(__file__).parent.parent))

    # Import and set up central logging
    from server.logging_setup import setup_logging

    setup_logging(log_level="INFO", log_file="logs/empty_folder_cleanup.log")
    return logging.getLogger(__name__)


# Set up logging
logger = setup_script_logging()

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

# Windows reserved device names (case-insensitive) that cannot be used as file/folder names
# on Windows and can cause Chrome extension load failures if present anywhere in the tree.
RESERVED_DEVICE_NAMES = (
    "CON",
    "PRN",
    "AUX",
    "NUL",
    # COM1..COM9
    *[f"COM{n}" for n in range(1, 10)],
    # LPT1..LPT9
    *[f"LPT{n}" for n in range(1, 10)],
)


def load_gitignore_patterns() -> list[str]:
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


def should_ignore_folder(folder_name: str, gitignore_patterns: list[str]) -> bool:
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


def get_current_folders() -> set[str]:
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


def _iter_paths(patterns: Iterable[str]) -> list[Path]:
    """Expand glob-like patterns into concrete `Path` objects relative to repo root."""
    expanded: list[Path] = []
    for pattern in patterns:
        # Support both exact paths and globs
        for p in Path().glob(pattern):
            expanded.append(p)
    return expanded


def _safe_rmtree(path: Path) -> None:
    """Remove a file or directory tree if it exists, logging errors but not raising."""
    try:
        if path.is_dir():
            for sub in path.iterdir():
                _safe_rmtree(sub)
            path.rmdir()
        elif path.exists():
            path.unlink()
    except Exception:
        logger.exception(f"Failed removing {path}")


def remove_reserved_device_name_paths(root: Path | None = None) -> int:
    """
    Remove any paths whose base name equals a Windows reserved device name.

    This focuses especially on transient directories created by tests (e.g., under `tmp/`).

    :param root: Base folder to scan; defaults to repo root
    :returns: Number of offending entries removed
    """
    base = root or Path.cwd()
    removed = 0
    # Walk select areas to avoid expensive full-tree recursion. Prioritize tmp and known transient roots.
    candidate_roots = [
        base / "tmp",
        base / "tmp" / "hypothesis_download_dirs",
        base,
    ]
    seen: set[Path] = set()
    for candidate_root in candidate_roots:
        if not candidate_root.exists() or not candidate_root.is_dir():
            continue
        for path in candidate_root.rglob("*"):
            try:
                if not path.exists():
                    continue
                name_upper = path.name.upper()
                if name_upper in RESERVED_DEVICE_NAMES and path not in seen:
                    _safe_rmtree(path)
                    removed += 1
                    seen.add(path)
            except Exception:
                logger.exception(f"Error while checking reserved-name path: {path}")
    if removed:
        logger.info(f"Removed {removed} reserved-name path(s)")
    return removed


def clear_temp_and_caches(include_reports: bool = False) -> int:
    """
    Clear transient temp/cache directories created by tests and tooling.

    By default, report and artifact directories (coverage HTML, mutation reports, etc.) are preserved.
    Pass `include_reports=True` to remove them as well.

    :param include_reports: Whether to also delete report/artifact directories
    :returns: Number of paths removed
    """
    # Core caches and ephemeral profiles
    patterns: list[str] = [
        ".pytest_cache",
        ".ruff_cache",
        ".mypy_cache",
        ".stryker-tmp",
        # Playwright/Chrome user-data dirs created during E2E runs
        "tmp/chrome-profile-real*",
        # Hypothesis generated dirs (keep container, clear inside)
        "tmp/hypothesis_download_dirs/*",
    ]

    if include_reports:
        patterns.extend(
            [
                "playwright-report",
                "test-results",
                "mutants",
                "coverage",
                "htmlcov",
                # Extension coverage folder (if present in some setups)
                "extension/coverage",
            ]
        )

    removed = 0
    for path in _iter_paths(patterns):
        # Do not remove the container dir for hypothesis root
        if path.match("tmp/hypothesis_download_dirs"):
            continue
        if not path.exists():
            continue
        _safe_rmtree(path)
        removed += 1
        logger.info(f"Removed: {path}")

    # Clean up any now-empty junk folders at the root
    removed += cleanup_empty_folders()
    return removed


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

    parser = argparse.ArgumentParser(description="Prevent junk folders and clear transient caches")
    parser.add_argument("--cleanup", action="store_true", help="Clean up existing empty folders and exit")
    parser.add_argument("--monitor", action="store_true", help="Start continuous monitoring for empty folders")
    parser.add_argument("--interval", type=int, default=30, help="Check interval in seconds (default: 30)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose logging")
    parser.add_argument(
        "--clear-temp",
        action="store_true",
        help="Clear transient temp/cache directories (keeps reports by default)",
    )
    parser.add_argument(
        "--clear-reports",
        action="store_true",
        help="When used with --clear-temp, also remove coverage, mutation, and test report folders",
    )
    parser.add_argument(
        "--remove-reserved-names",
        action="store_true",
        help="Remove Windows reserved-name paths (e.g., LPT1) anywhere under the repo",
    )

    args = parser.parse_args()

    # Set logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Ensure logs directory exists
    Path("logs").mkdir(exist_ok=True)

    did_work = False

    if args.clear_temp:
        did_work = True
        removed = clear_temp_and_caches(include_reports=args.clear_reports)
        logger.info(
            (
                f"Cleared transient temp/cache directories (removed {removed} path(s)); "
                + ("including reports" if args.clear_reports else "reports preserved")
            )
        )

    if args.remove_reserved_names:
        did_work = True
        removed_reserved = remove_reserved_device_name_paths()
        if removed_reserved == 0:
            logger.info("No Windows reserved-name paths found")

    if args.cleanup:
        did_work = True
        cleaned = cleanup_empty_folders()
        if cleaned > 0:
            logger.info(f"Cleaned up {cleaned} empty folders")
        else:
            logger.info("No empty folders found to clean up")

    if args.monitor:
        monitor_and_prevent(args.interval)

    # If no specific action, just do a one-time empty-folder cleanup (legacy default)
    if not did_work and not args.monitor:
        cleaned = cleanup_empty_folders()
        if cleaned > 0:
            logger.info(f"Cleaned up {cleaned} empty folders")
        else:
            logger.info("No empty folders found to clean up")


if __name__ == "__main__":
    main()
