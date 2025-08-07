#!/usr/bin/env python3
"""
Test Redundancy Audit Script.

This script analyzes the test suite for redundant and deprecated test files,
identifying patterns that can be consolidated or removed.
"""

import re
from pathlib import Path
from typing import Any


def find_test_files(test_dir: Path) -> dict[str, list[Path]]:
    """Find all test files and categorize them by pattern."""
    patterns = {
        "simple": [],
        "extended": [],
        "incomplete": [],
        "coverage": [],
        "failed": [],
        "regular": [],
        "js_files": [],
        "ts_files": [],
    }

    for file_path in test_dir.rglob("*.py"):
        filename = file_path.name
        if "simple" in filename:
            patterns["simple"].append(file_path)
        elif "extended" in filename:
            patterns["extended"].append(file_path)
        elif "incomplete" in filename:
            patterns["incomplete"].append(file_path)
        elif "coverage" in filename:
            patterns["coverage"].append(file_path)
        elif "failed" in filename:
            patterns["failed"].append(file_path)
        else:
            patterns["regular"].append(file_path)

    # Find JS/TS files
    for file_path in test_dir.rglob("*.js"):
        patterns["js_files"].append(file_path)
    for file_path in test_dir.rglob("*.ts"):
        patterns["ts_files"].append(file_path)

    return patterns


def analyze_test_content(file_path: Path) -> dict[str, Any]:
    """Analyze the content of a test file to understand its purpose."""
    try:
        content = file_path.read_text()
        lines = content.split("\n")

        return {
            "line_count": len(lines),
            "test_classes": len(re.findall(r"class Test", content)),
            "test_functions": len(re.findall(r"def test_", content)),
            "imports": len(
                [line for line in lines if line.strip().startswith("import") or line.strip().startswith("from")]
            ),
            "has_docstring": bool(re.search(r'""".*"""', content, re.DOTALL)),
            "has_parametrize": "parametrize" in content,
            "has_fixtures": "fixture" in content,
        }
    except Exception as e:
        return {"error": str(e)}


def find_potential_duplicates(patterns: dict[str, list[Path]]) -> list[tuple[Path, Path]]:
    """Find potential duplicate test files based on naming patterns."""
    duplicates = []

    # Look for simple/extended pairs
    simple_files = {f.name.replace("_simple", ""): f for f in patterns["simple"]}
    extended_files = {f.name.replace("_extended", ""): f for f in patterns["extended"]}

    for base_name, simple_file in simple_files.items():
        if base_name in extended_files:
            duplicates.append((simple_file, extended_files[base_name]))

    # Look for coverage files that might duplicate regular files
    coverage_files = {f.name.replace("_coverage", ""): f for f in patterns["coverage"]}
    regular_files = {f.name: f for f in patterns["regular"]}

    for base_name, coverage_file in coverage_files.items():
        if base_name in regular_files:
            duplicates.append((coverage_file, regular_files[base_name]))

    return duplicates


def generate_audit_report(patterns: dict[str, list[Path]], duplicates: list[tuple[Path, Path]]) -> str:
    """Generate a comprehensive audit report."""
    report_lines = [
        "# Test Suite Redundancy Audit Report",
        "",
    ]

    # Summary statistics
    total_python = sum(len(files) for key, files in patterns.items() if key not in ["js_files", "ts_files"])
    total_js = len(patterns["js_files"])
    total_ts = len(patterns["ts_files"])

    report_lines.extend(
        [
            "## Summary",
            f"- Total Python test files: {total_python}",
            f"- Total JavaScript test files: {total_js}",
            f"- Total TypeScript test files: {total_ts}",
            "",
        ]
    )

    # Pattern analysis
    report_lines.append("## Test File Patterns")
    for pattern, files in patterns.items():
        if files:
            report_lines.append(f"- **{pattern.title()}**: {len(files)} files")
            file_lines = [f"  - {file.relative_to(Path('tests'))}" for file in sorted(files)]
            report_lines.extend(file_lines)
    report_lines.append("")

    # Duplicate analysis
    if duplicates:
        report_lines.append("## Potential Duplicates")
        for file1, file2 in duplicates:
            report_lines.append(f"- {file1.relative_to(Path('tests'))} ↔ {file2.relative_to(Path('tests'))}")
        report_lines.append("")

    # Recommendations
    report_lines.extend(
        [
            "## Recommendations",
            "",
            "### High Priority Cleanup",
            "1. **Consolidate Simple/Extended Pairs**: Merge simple test files into their extended counterparts",
            "2. **Remove Coverage Files**: Coverage-specific files often duplicate regular test functionality",
            "3. **Clean Up Failed Tests**: Failed test files should be fixed or removed",
            "4. **Review Incomplete Tests**: Determine if incomplete tests are still needed",
            "",
            "### Medium Priority Cleanup",
            "1. **Deprecated JS Files**: Review JavaScript files in extension-instrumented/",
            "2. **Duplicate Test Logic**: Identify and merge duplicate test functions across files",
            "3. **Unused Test Files**: Remove tests for deprecated or removed functionality",
            "",
            "### Estimated Impact",
            f"- Files that can be removed: ~{len(patterns['simple']) + len(patterns['coverage']) + len(patterns['failed'])}",
            f"- Files that can be consolidated: ~{len(duplicates)}",
            "- Expected coverage impact: Minimal (tests are redundant)",
        ]
    )

    return "\n".join(report_lines)


def main():
    """Execute the main audit function."""
    test_dir = Path("tests")

    if not test_dir.exists():
        return

    # Find and categorize test files
    patterns = find_test_files(test_dir)

    # Find potential duplicates
    duplicates = find_potential_duplicates(patterns)

    # Generate report
    report = generate_audit_report(patterns, duplicates)

    # Write report to file
    report_path = Path("reports/test_audit_report.md")
    report_path.parent.mkdir(exist_ok=True)
    report_path.write_text(report)


if __name__ == "__main__":
    main()
