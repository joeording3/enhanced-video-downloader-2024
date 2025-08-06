#!/usr/bin/env python3
"""
Analyze Playwright coverage data and calculate coverage percentages.

This script reads the Playwright coverage JSON files and calculates
the overall coverage percentage across all tested files.
"""

import json
import sys
from pathlib import Path


def analyze_coverage(coverage_file):
    """Analyze coverage data from JSON file."""
    try:
        with Path(coverage_file).open() as f:
            coverage_data = json.load(f)

        total_files = 0
        total_lines = 0
        total_covered = 0

        for file_coverage in coverage_data.values():
            if isinstance(file_coverage, dict):
                # Handle Istanbul-style coverage format
                if "s" in file_coverage:  # Statement coverage
                    statements = file_coverage["s"]
                    total_statements = len(statements)
                    covered_statements = sum(1 for count in statements.values() if count > 0)

                    covered_statements / total_statements * 100

                    total_files += 1
                    total_lines += total_statements
                    total_covered += covered_statements

            elif isinstance(file_coverage, list):
                # Handle line-by-line coverage format
                total_lines_in_file = len(file_coverage)
                covered_lines = sum(1 for line in file_coverage if line > 0)

                if total_lines_in_file > 0:
                    (covered_lines / total_lines_in_file) * 100

                    total_files += 1
                    total_lines += total_lines_in_file
                    total_covered += covered_lines

        if total_lines > 0:
            return (total_covered / total_lines) * 100
        return 0  # noqa: TRY300

    except Exception:
        return 0


def main():
    """Analyze Playwright coverage data and display results."""
    coverage_dir = Path("coverage/frontend")

    if not coverage_dir.exists():
        sys.exit(1)

    coverage_files = list(coverage_dir.glob("playwright-coverage*.json"))

    if not coverage_files:
        sys.exit(1)

    for coverage_file in coverage_files:
        analyze_coverage(coverage_file)


if __name__ == "__main__":
    main()
