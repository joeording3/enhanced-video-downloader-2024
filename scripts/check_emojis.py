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
from typing import List, Optional, Tuple


def find_emojis_in_text(text: str) -> List[Tuple[int, str, str]]:
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

    emojis_found: List[Tuple[int, str, str]] = []
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


def read_file_safely(file_path: Path) -> Optional[str]:
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
    directory: str = ".", file_types: Optional[List[str]] = None
) -> List[Tuple[Path, List[Tuple[int, str, str]]]]:
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

    files_with_emojis: List[Tuple[Path, List[Tuple[int, str, str]]]] = []

    for file_path in files_to_scan:
        content = read_file_safely(file_path)
        if content is not None:
            emojis = find_emojis_in_text(content)
            if emojis:
                files_with_emojis.append((file_path, emojis))

    return files_with_emojis


def print_results(files_with_emojis: List[Tuple[Path, List[Tuple[int, str, str]]]]) -> None:
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

    args = parser.parse_args()

    if not Path(args.directory).exists():
        sys.exit(1)

    files_with_emojis = scan_files(args.directory, args.file_types)

    if not args.quiet:
        print_results(files_with_emojis)

    # Exit with error code if emojis found
    sys.exit(1 if files_with_emojis else 0)


if __name__ == "__main__":
    main()
