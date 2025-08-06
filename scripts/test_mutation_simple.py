#!/usr/bin/env python3
"""
Simple mutation testing script to test if we can get basic mutation testing working.

This is a fallback approach when mutmut hangs on large codebases.
"""

import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict

# Ensure tmp/ directory exists
Path("tmp").mkdir(exist_ok=True)


def run_simple_mutation_test() -> Dict[str, str]:
    """Run a simple mutation test on a small subset of files."""
    # Test files to try mutation testing on
    test_files = ["server/downloads/ytdlp.py", "server/utils.py", "server/config.py"]

    results: Dict[str, str] = {}

    for test_file in test_files:
        if not Path(test_file).exists():
            continue

        # Try running mutmut with timeout
        try:
            # Create a temporary config for this file
            config_content = f"""[mutmut]
paths_to_mutate={test_file}
backup=False
runner=python -m pytest
tests_dir=tests/
timeout_factor=1.0
max_workers=1
threshold=80
"""

            # Use tmp/ for temp_mutmut.ini
            with Path("tmp/temp_mutmut.ini").open("w") as f:
                f.write(config_content)

            # Run mutmut with timeout
            time.time()
            result = subprocess.run(
                ["mutmut", "run", "--max-children", "1"],
                capture_output=True,
                text=True,
                timeout=60,
                check=False,  # 60 second timeout
            )
            time.time()

            if result.returncode == 0:
                results[test_file] = "success"
            else:
                results[test_file] = "failed"

        except subprocess.TimeoutExpired:
            results[test_file] = "timeout"
        except Exception:
            results[test_file] = "error"

    # Clean up
    if Path("tmp/temp_mutmut.ini").exists():
        Path("tmp/temp_mutmut.ini").unlink()

    # Print summary
    for _file, _status in results.items():
        pass

    return results


def suggest_alternatives() -> None:
    """Suggest alternative approaches for mutation testing."""
    alternatives = [
        {
            "name": "Manual Mutation Testing",
            "description": "Create a simple script that manually applies common mutations and runs tests",
            "pros": "Full control, no hanging issues",
            "cons": "More work to implement",
        },
        {
            "name": "Coverage-Based Testing",
            "description": "Focus on improving test coverage and edge case testing instead of mutation testing",
            "pros": "More reliable, easier to implement",
            "cons": "Less comprehensive than mutation testing",
        },
        {
            "name": "Property-Based Testing",
            "description": "Use hypothesis or similar tools for property-based testing",
            "pros": "Can find edge cases automatically",
            "cons": "Requires different test design",
        },
        {
            "name": "Static Analysis",
            "description": "Use tools like mypy, bandit, or pylint for code quality",
            "pros": "Fast, reliable",
            "cons": "Different from mutation testing",
        },
        {
            "name": "Simplified Mutation Testing",
            "description": "Create a custom mutation testing tool for specific code patterns",
            "pros": "Tailored to the codebase",
            "cons": "Significant development effort",
        },
    ]

    for _i, _alt in enumerate(alternatives, 1):
        pass


def cleanup_tmp_dir():
    """Clean up temporary files in tmp directory after script execution."""
    tmp_dir = Path("tmp")
    if tmp_dir.exists() and tmp_dir.is_dir():
        try:
            # Remove all files in tmp directory but keep the directory
            for item in tmp_dir.iterdir():
                if item.is_file():
                    item.unlink()
                elif item.is_dir():
                    shutil.rmtree(item)
            # Don't remove tmp directory itself - keep it for future use
        except Exception:
            pass


if __name__ == "__main__":
    results = run_simple_mutation_test()

    # If all failed, suggest alternatives
    if all(status in ["timeout", "error", "failed"] for status in results.values()):
        suggest_alternatives()

    cleanup_tmp_dir()
    sys.exit(0)
