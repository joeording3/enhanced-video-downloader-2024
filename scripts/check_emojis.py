#!/usr/bin/env python3
# ruff: noqa: T201
"""
Consolidated emoji detection script.

This script scans files for emoji usage and reports violations with detailed output.
It can check Python files, markdown files, and other text files.
"""

import re
import sys
from pathlib import Path


def _compile_allowed_pattern(allowed_sequences: "list[str] | None") -> "re.Pattern[str] | None":
    """
    Build a compiled regex pattern that matches any allowed (whitelisted) emoji sequences.

    Using a pattern lets us strip allowed sequences from the text before scanning so
    that combining marks like variation selectors do not get flagged independently.

    Args:
        allowed_sequences: List of exact sequences to allow (characters or multi-char sequences)

    Returns:
        Compiled regex pattern that matches allowed sequences, or None if no sequences provided
    """
    if not allowed_sequences:
        return None

    # Escape each sequence to ensure literal matching
    escaped_parts = [re.escape(seq) for seq in allowed_sequences if seq]
    if not escaped_parts:
        return None

    joined = "|".join(escaped_parts)
    return re.compile(joined)


def _load_whitelist(path: "str | None") -> "list[str] | None":
    """
    Load a whitelist (allowed sequences) from JSON or newline-delimited text.

    Supported formats:
      - JSON: {"allowed": ["check", "cross", "clock"]}
      - Text: one sequence per line

    Args:
        path: Path to the whitelist file

    Returns:
        List of allowed sequences, or None if path is None or file missing/unreadable
    """
    if not path:
        return None
    try:
        p = Path(path)
        if not p.exists():
            return None
        text = p.read_text(encoding="utf-8")
    except Exception:
        return None

    # Try JSON first
    try:
        import json

        data = json.loads(text)
        if isinstance(data, dict) and isinstance(data.get("allowed"), list):
            return [str(x) for x in data["allowed"]]
        # If it's a JSON list directly
        if isinstance(data, list):
            return [str(x) for x in data]
    except Exception:
        # Fallback to newline-delimited text
        pass

    # Treat as plain text, one sequence per line
    return [line.strip() for line in text.splitlines() if line.strip()]


def find_emojis_in_text(text: str, allowed_pattern: "re.Pattern[str] | None" = None) -> "list[tuple[int, str, str]]":
    """
    Find emoji usage in text.

    Args:
        text: The text to scan for emojis

    Returns:
        List of tuples containing (line_number, line_content, emoji_found)
    """
    # Comprehensive emoji pattern
    emoji_pattern = re.compile(
        r"[\U0001F600-\U0001F64F]"  # Emoticons
        r"|[\U0001F300-\U0001F5FF]"  # Misc Symbols and Pictographs
        r"|[\U0001F680-\U0001F6FF]"  # Transport and Map Symbols
        r"|[\U0001F1E0-\U0001F1FF]"  # Regional Indicator Symbols
        r"|[\U00002600-\U000027BF]"  # Misc Symbols
        r"|[\U0001F900-\U0001F9FF]"  # Supplemental Symbols and Pictographs
        r"|[\U0001F018-\U0001F270]"  # Various Symbols
        r"|[\U0001F600-\U0001F650]"  # Emoticons
        r"|[\U0001F004]"  # Mahjong Tile Red Dragon
        r"|[\U0001F0CF]"  # Playing Card Black Joker
        r"|[\U0001F170-\U0001F251]"  # Enclosed Alphanumeric Supplement
        r"|[\U0000238C-\U00002454]"  # Technical Symbols
        r"|[\U000020D0-\U000020FF]"  # Combining Diacritical Marks
        r"|[\U0000FE00-\U0000FE0F]"  # Variation Selectors
        r"|[\U0001F000-\U0001F02F]"  # Mahjong Tiles
        r"|[\U0001F0A0-\U0001F0FF]"  # Playing Cards
        r"|[\U0001F100-\U0001F64F]"  # Enclosed Alphanumeric Supplement
        r"|[\U0001F910-\U0001F96B]"  # Supplemental Symbols and Pictographs
        r"|[\U0001F980-\U0001F9E0]",  # Supplemental Symbols and Pictographs
        re.UNICODE,
    )

    emojis_found: list[tuple[int, str, str]] = []

    # Strip allowed sequences first so their components (e.g., variation selectors)
    # are not detected as violations.
    if allowed_pattern is not None:
        text = allowed_pattern.sub("", text)

    lines = text.split("\n")

    for line_num, line in enumerate(lines, 1):
        matches = emoji_pattern.findall(line)
        if matches:
            emojis_found.append((line_num, line.strip(), " ".join(matches)))

    return emojis_found


def should_skip_directory(path: Path) -> bool:
    """
    Check if a directory should be skipped during scanning.

    Args:
        path: Path to check

    Returns:
        True if directory should be skipped
    """
    skip_dirs = {
        "node_modules",
        ".git",
        ".venv",
        "venv",
        "scripts/venv",
        "__pycache__",
        ".pytest_cache",
        "coverage",
        "htmlcov",
        "mutants",
        "reports",
        "logs",
        "dist",
        "build",
        "target",
        ".next",
        ".nuxt",
        ".output",
        "out",
        "public",
        "static",
        "assets",
        "vendor",
        "bower_components",
        "jspm_packages",
        "typings",
        "types",
        ".idea",
        ".vscode",
        ".vs",
        "bin",
        "obj",
        "packages",
        "tmp",
        "temp",
        "cache",
        ".cache",
        "playwright-report",
    }

    return any(part in skip_dirs for part in path.parts)


def read_file_safely(file_path: Path) -> "str | None":
    """
    Safely read a file and return its content.

    Args:
        file_path: Path to the file to read

    Returns:
        File content as string, or None if file cannot be read
    """
    try:
        return file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        # Skip binary files
        return None
    except Exception:
        return None


def scan_files(
    directory: str = ".",
    file_types: "list[str] | None" = None,
    allowed_pattern: "re.Pattern[str] | None" = None,
    whitelist_path: "str | None" = None,
) -> "list[tuple[Path, list[tuple[int, str, str]]]]":
    """
    Scan files in the directory for emoji usage.

    Args:
        directory: Directory to scan (default: current directory)
        file_types: List of file extensions to scan
                   (default: ['.py', '.md', '.txt', '.js', '.ts', '.html', '.css'])

    Returns:
        List of tuples containing (file_path, violations)
    """
    if file_types is None:
        file_types = [".py", ".md", ".txt", ".js", ".ts", ".html", ".css", ".json", ".yaml", ".yml"]

    root_path = Path(directory)
    files_to_scan = []

    for file_type in file_types:
        files_to_scan.extend([f for f in root_path.rglob(f"*{file_type}") if not should_skip_directory(f)])

    if not files_to_scan:
        return []

    files_with_emojis: list[tuple[Path, list[tuple[int, str, str]]]] = []

    for file_path in files_to_scan:
        # Skip scanning the whitelist file itself if provided
        if whitelist_path and str(file_path) == str(whitelist_path):
            continue
        content = read_file_safely(file_path)
        if content is not None:
            emojis = find_emojis_in_text(content, allowed_pattern=allowed_pattern)
            if emojis:
                files_with_emojis.append((file_path, emojis))

    return files_with_emojis


def print_results(files_with_emojis: "list[tuple[Path, list[tuple[int, str, str]]]]") -> None:
    """
    Print emoji detection results in a readable format.

    Args:
        files_with_emojis: List of files with emoji violations
    """
    if not files_with_emojis:
        print("No emojis found in scanned files.")
        return

    print("Emojis found in the following files:")
    print("=" * 60)

    total_violations = 0

    for file_path, violations in files_with_emojis:
        print(f"\nFile: {file_path}")
        print("-" * 40)

        for line_num, line_content, emoji in violations:
            print(f"  Line {line_num}: {emoji}")
            print(f"    {line_content}")
            total_violations += 1

    print(f"\nSummary: {len(files_with_emojis)} files with {total_violations} emoji violations")
    print("\nTo fix these violations, run:")
    print("   python scripts/remove_all_emojis.py")


def main() -> None:
    """Execute the main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Check for emoji usage in files")
    parser.add_argument("directory", nargs="?", default=".", help="Directory to scan (default: current directory)")
    parser.add_argument(
        "--file-types",
        nargs="+",
        default=[".py", ".md", ".txt", ".js", ".ts", ".html", ".css", ".json", ".yaml", ".yml"],
        help="File types to scan",
    )
    parser.add_argument("--quiet", action="store_true", help="Suppress output, only return exit code")
    parser.add_argument(
        "--whitelist",
        dest="whitelist",
        default=None,
        help=(
            "Path to whitelist file (JSON with 'allowed' array or newline-delimited). "
            "If not provided, will look for config/emoji_whitelist.json if present."
        ),
    )

    args = parser.parse_args()

    if not Path(args.directory).exists():
        sys.exit(1)

    default_whitelist = Path("config/emoji_whitelist.json")
    whitelist_path = args.whitelist or (str(default_whitelist) if default_whitelist.exists() else None)
    allowed_sequences = _load_whitelist(whitelist_path)
    allowed_pattern = _compile_allowed_pattern(allowed_sequences)

    files_with_emojis = scan_files(
        args.directory,
        args.file_types,
        allowed_pattern=allowed_pattern,
        whitelist_path=whitelist_path,
    )

    if not args.quiet:
        print_results(files_with_emojis)

    # Exit with error code if emojis found
    sys.exit(1 if files_with_emojis else 0)


if __name__ == "__main__":
    main()
