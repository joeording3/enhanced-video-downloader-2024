#!/usr/bin/env python3
"""
Automated mutation testing for new code changes.

This script integrates mutation testing into the development workflow by:
1. Detecting changed files since last commit
2. Running targeted mutation testing on changed files
3. Providing feedback on mutation score changes
4. Generating reports for CI/CD integration
"""

import argparse
import subprocess
import sys
from typing import Dict, List


def get_changed_files() -> List[str]:
    """Get list of files changed since last commit."""
    try:
        result = subprocess.run(["git", "diff", "--name-only", "HEAD~1"], capture_output=True, text=True, check=True)
        return result.stdout.strip().split("\n") if result.stdout.strip() else []
    except subprocess.CalledProcessError:
        # If no previous commit, check staged files
        result = subprocess.run(["git", "diff", "--cached", "--name-only"], capture_output=True, text=True, check=True)
        return result.stdout.strip().split("\n") if result.stdout.strip() else []


def get_critical_files() -> List[str]:
    """Get list of critical files that should always be mutation tested."""
    return [
        "extension/src/background-logic.ts",
        "server/config.py",
        "server/schemas.py",
        "extension/src/popup.ts",
        "extension/src/content.ts",
    ]


def run_js_mutation_testing(target_files: List[str]) -> Dict:
    """Run JavaScript mutation testing on specified files."""
    # For now, run on background-logic.ts as it's the most critical
    if any("background-logic.ts" in f for f in target_files):
        try:
            result = subprocess.run(["npm", "run", "test:mutation:js:fast"], capture_output=True, text=True, check=True)
        except subprocess.CalledProcessError as e:
            return {"status": "failed", "output": e.stderr}
        else:
            return {"status": "success", "output": result.stdout}

    return {"status": "skipped", "output": "No critical JS files changed"}


def run_py_mutation_testing(target_files: List[str]) -> Dict:
    """Run Python mutation testing on specified files."""
    # Check if any critical Python files changed
    critical_py_files = [f for f in target_files if f.startswith("server/") and f.endswith(".py")]

    if critical_py_files:
        try:
            result = subprocess.run(["npm", "run", "test:mutation:py:fast"], capture_output=True, text=True, check=True)
        except subprocess.CalledProcessError as e:
            return {"status": "failed", "output": e.stderr}
        else:
            return {"status": "success", "output": result.stdout}

    return {"status": "skipped", "output": "No critical Python files changed"}


def analyze_mutation_results(results: Dict) -> Dict:
    """Analyze mutation testing results and provide feedback."""
    analysis: Dict = {"total_tests": 0, "passed": 0, "failed": 0, "skipped": 0, "recommendations": []}

    for test_type, result in results.items():
        analysis["total_tests"] = analysis["total_tests"] + 1

        if result["status"] == "success":
            analysis["passed"] = analysis["passed"] + 1
            analysis["recommendations"].append(f"{test_type}: Mutation testing passed")
        elif result["status"] == "failed":
            analysis["failed"] = analysis["failed"] + 1
            analysis["recommendations"].append(f"{test_type}: Mutation testing failed - review results")
        else:
            analysis["skipped"] = analysis["skipped"] + 1
            analysis["recommendations"].append(f"{test_type}: No critical files changed")

    return analysis


def generate_report(analysis: Dict, changed_files: List[str]) -> str:
    """Generate a mutation testing report."""
    return f"""
=== Mutation Testing Report ===

Changed Files: {len(changed_files)} files
- {chr(10).join(changed_files) if changed_files else "None"}

Test Results:
- Total Tests: {analysis["total_tests"]}
- Passed: {analysis["passed"]}
- Failed: {analysis["failed"]}
- Skipped: {analysis["skipped"]}

Recommendations:
{chr(10).join(f"- {rec}" for rec in analysis["recommendations"])}

Status: {"PASSED" if analysis["failed"] == 0 else "FAILED"}
"""


def main():
    """Main function for automated mutation testing."""
    parser = argparse.ArgumentParser(description="Automated mutation testing for changed files")
    parser.add_argument("--changed-files", nargs="*", help="List of changed files")
    parser.add_argument("--report-only", action="store_true", help="Generate report only")
    parser.add_argument("--ci", action="store_true", help="CI mode - exit with error code on failure")

    args = parser.parse_args()

    # Get changed files
    changed_files = args.changed_files or get_changed_files()

    if args.report_only:
        return 0

    # Run mutation testing
    results = {}

    # JavaScript mutation testing
    js_result = run_js_mutation_testing(changed_files)
    results["JavaScript"] = js_result

    # Python mutation testing
    py_result = run_py_mutation_testing(changed_files)
    results["Python"] = py_result

    # Analyze results
    analysis = analyze_mutation_results(results)

    # Generate report
    generate_report(analysis, changed_files)

    # Exit with appropriate code
    if args.ci and analysis["failed"] > 0:
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
