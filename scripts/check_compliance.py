#!/usr/bin/env python3
"""Check compliance with linting and documentation rules."""

import csv
import json
import subprocess
import sys
from pathlib import Path

import jsonschema


def run_command(cmd: list[str]) -> tuple[int, str]:
    """Run a command and return its exit code and output.

    Args:
        cmd: Command to run as a list of strings.

    Returns:
        Tuple of (exit_code, output).
    """
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        return result.returncode, result.stdout + result.stderr
    except subprocess.CalledProcessError as e:
        return e.returncode, e.stdout + e.stderr


def check_ignore_directives() -> tuple[bool, list[str]]:
    """Check for stale ignore directives.

    Returns:
        Tuple of (success, list of issues).
    """
    issues = []
    success = True

    # Read ignore inventory
    with Path("ignore_inventory.csv").open() as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["status"] == "stale":
                issues.append(f"Stale ignore directive in {row['file']}:{row['lineno']}")
                success = False

    return success, issues


def check_docstrings() -> tuple[bool, list[str]]:
    """Check for missing or invalid docstrings.

    Returns:
        Tuple of (success, list of issues).
    """
    issues = []
    success = True

    # Run pydocstyle
    exit_code, output = run_command(["pydocstyle", ".", "--convention=google"])
    if exit_code != 0:
        issues.append("Python docstring issues found:")
        issues.extend(output.splitlines())
        success = False

    # Run JSDoc validation
    exit_code, output = run_command(["jsdoc", "-X", "-c", "jsdoc.json"])
    if exit_code != 0:
        issues.append("JavaScript documentation issues found:")
        issues.extend(output.splitlines())
        success = False

    return success, issues


def check_json_schemas() -> tuple[bool, list[str]]:
    """Check JSON schema validity.

    Returns:
        Tuple of (success, list of issues).
    """
    issues = []
    success = True

    # Find all schema files
    schema_files = list(Path().rglob("*.schema.json"))
    for schema_file in schema_files:
        try:
            with Path(schema_file).open() as f:
                schema = json.load(f)
            # Validate schema
            jsonschema.Draft7Validator.check_schema(schema)
        except Exception as e:  # noqa: PERF203
            issues.append(f"Invalid schema in {schema_file}: {e!s}")
            success = False

    return success, issues


def main() -> int:
    """Run compliance checks and return exit code.

    Returns:
        Exit code (0 for success, 1 for failure).
    """
    all_issues = []
    all_success = True

    # Check ignore directives
    success, issues = check_ignore_directives()
    if not success:
        all_issues.extend(issues)
        all_success = False

    # Check docstrings
    success, issues = check_docstrings()
    if not success:
        all_issues.extend(issues)
        all_success = False

    # Check JSON schemas
    success, issues = check_json_schemas()
    if not success:
        all_issues.extend(issues)
        all_success = False

    # Print results
    if all_issues:
        for _issue in all_issues:
            pass
        return 1 if not all_success else 0

    return 0


if __name__ == "__main__":
    sys.exit(main())
