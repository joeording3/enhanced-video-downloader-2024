"""Helper functions for resuming incomplete downloads."""

import json
import logging
from pathlib import Path


def validate_scan_directory(scan_dir: Path, log: logging.Logger) -> bool:
    """Check that scan directory exists and is a directory; log error if not."""
    if not scan_dir.exists() or not scan_dir.is_dir():
        log.error(
            f"Target directory for resuming incomplete downloads does not exist or is not a directory: {scan_dir}"
        )
        return False
    return True


def get_part_files(scan_dir: Path) -> list[Path]:
    """Return a list of partial download files (e.g., .part, .ytdl, .download) found under scan_dir recursively."""
    patterns = ["*.part", "*.ytdl", "*.download"]
    files: list[Path] = []
    for pattern in patterns:
        files.extend(scan_dir.rglob(pattern))
    # Remove duplicates and return
    return list({f.resolve(): f for f in files}.values())


def derive_resume_url(part_file: Path, log: logging.Logger) -> str | None:
    """Extract URL to resume from .info.json or fallback, or return None."""
    base_stem = part_file.stem
    info_file = part_file.parent / f"{base_stem}.info.json"
    simple_stem = part_file.name.split(".")[0]
    fallback_file = part_file.parent / f"{simple_stem}.info.json"
    used = info_file if info_file.exists() else (fallback_file if fallback_file.exists() else None)
    if not used:
        log.warning(f"No .info.json found for {part_file} (tried {info_file} and {fallback_file}); skipping")
        return None
    try:
        data = json.loads(used.read_text())
        url = data.get("webpage_url")
        # Ensure the URL is a string or None
        if isinstance(url, str):
            if used == info_file:
                log.debug(f"Found URL '{url}' in {used}")
            else:
                log.warning(f"Found URL '{url}' in {used}")
            return url
        log.warning(f"Invalid URL type in {used}: expected string, got {type(url)}")
    except Exception:
        log.warning(f"Failed to parse {used} for {part_file}")
        return None
    else:
        return None
