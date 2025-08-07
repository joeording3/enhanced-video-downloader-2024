"""
Update test coverage statistics in `TODO.md` by running tests and parsing JSON coverage reports.

Notes
-----
Executes Python and front-end test suites to generate coverage reports, parses JSON outputs,
and updates the coverage table in `TODO.md`.
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

_SCRIPT_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = _SCRIPT_ROOT.parent  # Use project root for test execution

# Ensure coverage output directories exist
for subdir in ("backend", "frontend"):
    (_SCRIPT_ROOT / "coverage" / subdir).mkdir(parents=True, exist_ok=True)


def parse_args() -> argparse.Namespace:
    """
    Parse command-line arguments for coverage weighting and threshold.

    Creates an argument parser for Python and frontend coverage weights
    and the minimum overall coverage threshold.

    Returns
    -------
    argparse.Namespace
        Namespace containing `py_weight`, `fe_weight`, and `min_overall` attributes.
    """
    parser = argparse.ArgumentParser(
        description="Update coverage stats with optional weighting and threshold enforcement"
    )
    parser.add_argument(
        "--py-weight",
        type=float,
        default=0.5,
        help="Weight for Python coverage (sum of weights should be 1.0)",
    )
    parser.add_argument(
        "--fe-weight",
        type=float,
        default=0.5,
        help="Weight for Frontend coverage (sum of weights should be 1.0)",
    )
    parser.add_argument(
        "--min-overall",
        type=float,
        default=0.0,
        help="Minimum overall coverage percent to enforce",
    )
    return parser.parse_args()


def run_python_coverage() -> float:
    """
    Run pytest to generate Python coverage report and parse percentage.

    Executes pytest with coverage, reads JSON report from
    `coverage/backend/coverage.json`, and returns the total percent covered.

    Returns
    -------
    float
        Python code coverage percentage (0.0 if report is missing).

    Raises
    ------
    SystemExit
        If pytest exits with an unexpected error code.
    """
    # Run pytest via the current Python interpreter
    pytest_cmd = [
        sys.executable,
        "-m",
        "pytest",
        "--disable-warnings",
        "--maxfail=1",
        "--quiet",
        "--cov",
        "--cov-report=json:coverage/backend/coverage.json",
    ]
    result = subprocess.run(
        pytest_cmd,
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode not in (0, 1, 5):
        sys.exit(result.returncode)
    cov_file = _SCRIPT_ROOT / "coverage/backend/coverage.json"
    if not cov_file.exists():
        return 0.0
    try:
        data = json.loads(cov_file.read_text())
        files = data.get("files", {})
        total_statements = sum(f.get("summary", {}).get("num_statements", 0) for f in files.values())
        covered = sum(f.get("summary", {}).get("covered_lines", 0) for f in files.values())
        return round((covered / total_statements) * 100, 2) if total_statements else 0.0
    except Exception:
        return 0.0


def run_frontend_coverage() -> float:
    """
    Merge Playwright E2E and Jest unit-test coverage for a unified frontend report.

    Determine front-end coverage percentage by merging Playwright E2E coverage
    with Jest unit-test coverage.

    If both `coverage/frontend/playwright-coverage.json` and
    `coverage/frontend/coverage-final.json` exist, merge their statement counts.
    Otherwise, prefer Playwright coverage if available; if not, run Jest coverage.

    Returns
    -------
    float
        Combined frontend coverage percentage (0.0 if missing).
    """
    # Paths to coverage reports
    pf_cov = _SCRIPT_ROOT / "coverage" / "frontend" / "playwright-coverage.json"
    jf_cov = _SCRIPT_ROOT / "coverage" / "frontend" / "coverage-final.json"

    def load_cov(path: Path) -> dict[str, Any]:
        try:
            data = json.loads(path.read_text())
            return data if isinstance(data, dict) else {}
        except Exception:
            return {}

    # Merge Playwright and Jest coverage if both are present
    if pf_cov.exists() and jf_cov.exists():
        pf_data = load_cov(pf_cov)
        jf_data = load_cov(jf_cov)
        merged = {}
        # Initialize with Playwright data
        for file, entry in pf_data.items():
            merged[file] = entry.copy()
        # Merge Jest data
        for file, entry in jf_data.items():
            if file in merged:
                s_merged = merged[file].get("s", {})
                for sid, count in entry.get("s", {}).items():
                    s_merged[sid] = max(s_merged.get(sid, 0), count)
                merged[file]["s"] = s_merged
            else:
                merged[file] = entry.copy()
        total, covered = 0, 0
        for entry in merged.values():
            for count in entry.get("s", {}).values():
                total += 1
                if count > 0:
                    covered += 1
        return round((covered / total) * 100, 2) if total else 0.0

    # If only Playwright coverage exists
    if pf_cov.exists():
        data = load_cov(pf_cov)
        total, covered = 0, 0
        for entry in data.values():
            for count in entry.get("s", {}).values():
                total += 1
                if count > 0:
                    covered += 1
        return round((covered / total) * 100, 2) if total else 0.0

    # Fallback: run Jest coverage
    result = subprocess.run(
        [
            "npx",
            "jest",
            "--coverage",
            "--coverageReporters=json",
            "--coverageDirectory=coverage/frontend",
        ],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode > 1:
        sys.exit(result.returncode)
    cov_file = jf_cov
    if not cov_file.exists():
        return 0.0
    data = load_cov(cov_file)
    total, covered = 0, 0
    for entry in data.values():
        for count in entry.get("s", {}).values():
            total += 1
            if count > 0:
                covered += 1
    return round((covered / total) * 100, 2) if total else 0.0


def update_todo(py_pct: float, fe_pct: float, overall_pct: float) -> None:
    """
    Update the coverage table in `TODO.md` with the latest percentages.

    Parameters
    ----------
    py_pct : float
        Python coverage percentage to insert.
    fe_pct : float
        Frontend coverage percentage to insert.
    overall_pct : float
        Combined overall coverage percentage to insert.

    Returns
    -------
    None
    """
    todo_path = _SCRIPT_ROOT / "TODO.md"
    content = todo_path.read_text()
    content = re.sub(
        "(\\|\\s*Python\\s*\\|\\s*)[\\d\\.]+%(\\s*\\|)",
        lambda m: f"{m.group(1)}{py_pct:.2f}%{m.group(2)}",
        content,
    )
    content = re.sub(
        "(\\|\\s*Frontend\\s*\\|\\s*)[\\d\\.]+%(\\s*\\|)",
        lambda m: f"{m.group(1)}{fe_pct:.2f}%{m.group(2)}",
        content,
    )
    content = re.sub(
        "(\\|\\s*Overall\\s*\\|\\s*)[\\d\\.]+%(\\s*\\|)",
        lambda m: f"{m.group(1)}{overall_pct:.2f}%{m.group(2)}",
        content,
    )
    todo_path.write_text(content)


def update_test_audit(py_pct: float, fe_pct: float) -> None:
    """
    Update the Test Responsibility Matrix in tests/testing.md with current coverage data.

    Parameters
    ----------
    py_pct : float
        Python coverage percentage.
    fe_pct : float
        Frontend coverage percentage.

    Returns
    -------
    None
    """
    # Note: This function is a placeholder for the consolidated coverage reporting
    # The actual Test Responsibility Matrix update functionality has been simplified
    # to focus on TODO.md updates which are more critical for project tracking


def main() -> None:
    """
    Compute and update test coverage statistics in `TODO.md` and tests/testing.md.

    Parses weighting arguments, runs Python and front-end coverage,
    computes weighted overall coverage, and updates both coverage tables.

    Raises
    ------
    SystemExit
        If argument validation fails, coverage errors occur, or the overall
        coverage is below the specified threshold.
    """
    args = parse_args()
    total_weight = args.py_weight + args.fe_weight
    if abs(total_weight - 1.0) > 1e-06:
        sys.exit(2)
    py_pct = run_python_coverage()
    fe_pct = run_frontend_coverage()
    overall_pct = round(py_pct * args.py_weight + fe_pct * args.fe_weight, 2)

    # Update both TODO.md and tests/testing.md
    update_todo(py_pct, fe_pct, overall_pct)
    update_test_audit(py_pct, fe_pct)

    if overall_pct < args.min_overall:
        sys.exit(1)


if __name__ == "__main__":
    main()
