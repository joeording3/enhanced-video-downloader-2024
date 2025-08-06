#!/usr/bin/env python3
"""Script to remove all emojis from Python files identified in the emoji check."""

import re
from pathlib import Path


def remove_emojis(text):
    """Remove emojis and other non-ASCII characters from text."""
    # Pattern to match all emojis and non-ASCII characters
    emoji_pattern = re.compile(
        r"[\U0001F600-\U0001F64F]|[\U0001F300-\U0001F5FF]|[\U0001F680-\U0001F6FF]|"
        r"[\U0001F1E0-\U0001F1FF]|[\U00002600-\U000026FF]|[\U00002700-\U000027BF]|"
        r"[\U0001F900-\U0001F9FF]|[\U0001F018-\U0001F270]|[\U0000238C-\U00002454]|"
        r"[\U000020D0-\U000020FF]|[\U0000FE00-\U0000FE0F]|[\U0001F000-\U0001F02F]|"
        r"[\U0001F0A0-\U0001F0FF]|[\U0001F100-\U0001F64F]|[\U0001F680-\U0001F6FF]|"
        r"[\U0001F910-\U0001F96B]|[\U0001F980-\U0001F9E0]",
        re.UNICODE,
    )

    # Also remove common symbols that are often used as emojis (ASCII approximations only)
    symbol_pattern = re.compile(
        r"["
        r"\u2713\u2717\u26A0\u25B6\u25A0\u25CB\u25CF\u2605\u2606\u260E\u2611\u2612"
        r"\u2620\u2622\u2623\u262F\u263A\u263B\u2660\u2663\u2665\u2666\u2668\u267B"
        r"\u2699\u26A1\u26C4\u26C5\u26C8\u26CE\u26D4\u26EA\u26F2\u26F3\u26F5\u26FA"
        r"\u26FD\u2702\u2705\u2708\u2709\u270A\u270B\u270C\u270D\u270F\u2712\u2714"
        r"\u2716\u2728\u2733\u2734\u2744\u2747\u274C\u274E\u2753\u2754\u2755\u2757"
        r"\u2764\u2795\u2796\u2797\u27A1\u27B0\u27BF\u2B06\u2B07\u2B50\u2B55"
        r"]"
    )

    # Apply both patterns
    text = emoji_pattern.sub("", text)
    return symbol_pattern.sub("", text)


def process_file(filename):
    """Process a single file to remove emojis."""
    if not Path(filename).exists():
        return False

    try:
        with Path(filename).open(encoding="utf-8") as f:
            content = f.read()

        original_content = content
        content = remove_emojis(content)

        if content == original_content:
            return False

        with Path(filename).open("w", encoding="utf-8") as f:
            f.write(content)
    except Exception:
        return False

    return True


def main():
    """Process all files with emojis."""
    files = [
        "server/cli_helpers.py",
        "server/cli.py",
        "server/disable_launchagents.py",
        "scripts/generate-ignore-files.py",
        "scripts/test_mutation_simple.py",
        "server/cli/resume.py",
        "server/cli/download.py",
        "server/cli/utils.py",
        "tests/unit/test_disable_launchagents.py",
    ]

    processed_count = 0
    for file in files:
        if process_file(file):
            processed_count += 1


if __name__ == "__main__":
    main()
