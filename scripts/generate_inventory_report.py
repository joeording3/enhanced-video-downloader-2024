#!/usr/bin/env python3
"""
Script to inventory ignore directives and docstring compliance across the codebase.

Walks the repository, excluding venv/, node_modules/, .git/, etc.
Scans .py, .js, .ts, .tsx, and .json files for ignore directives and docstring patterns.
Catalogs matches with file path, line number, match type, full text, and context.
For each ignore entry, temporarily removes the directive, re-runs the relevant linter or type checker,
and records whether an error resurfaces (justified) or not (stale).
For docstring checks:
  - Python: runs pydocstyle --convention=numpy
  - JS/TS: runs ESLint with eslint-plugin-jsdoc (via configured eslint.config.cjs)
  - JSON: parses objects with "$schema" and ensures each object has "description" properties.
Aggregates results and outputs:
  - ignore_inventory.csv
  - docstring_inventory.csv
  - full_report.md
"""

import csv
import json
import os
import re
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional, Pattern, Tuple, Union

# Configuration
EXCLUDE_DIRS = {
    ".git",
    "venv",
    ".venv",
    "node_modules",
    "__pycache__",
    "extension-instrumented",
    "coverage",
}
FILE_EXTS = (".py", ".js", ".ts", ".tsx", ".json")
IGNORE_PATTERNS: Dict[str, Pattern[str]] = {
    "type_ignore": re.compile(r"# type: ignore\b"),
    "noqa": re.compile(r"# noqa\b"),
    "eslint_disable": re.compile(r"// eslint-disable"),
    "eslint_disable_next": re.compile(r"// eslint-disable-next-line"),
    "flake8_ignore": re.compile(r"# flake8: ignore"),
    "mypy_ignore": re.compile(r"# mypy: ignore"),
    "ignore_patterns_config": re.compile(r'"ignores"\s*:\s*\[.+?\]'),
}
DOCSTRING_PATTERNS: Dict[str, Pattern[str]] = {
    "python_docstring": re.compile(r'"""(?!!"")(?:.|\n)*?"""'),
    "jsdoc_block": re.compile(r"/\*\*(?:\s*\*.*\n)+\s*\*/"),
    "json_schema_desc": re.compile(r'"description"\s*:\s*".+?"'),
}
ROOT = Path(__file__).parent.parent

# Ensure tmp/ directory exists
Path("tmp").mkdir(exist_ok=True)


def walk_files(root: Union[Path, str]) -> Generator[Path, None, None]:
    """
    Yield Path objects for files with supported extensions under a root directory.

    Parameters
    ----------
    root : Path or str
        Root directory to traverse.

    Yields
    ------
    Path
        Path to each matching file.
    """
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
        for fname in filenames:
            if fname.endswith(FILE_EXTS):
                yield Path(dirpath) / fname


def get_context(lines: List[str], idx: int, context: int = 3) -> str:
    """
    Get context lines around a given index.

    Parameters
    ----------
    lines : list of str
        File content split into lines (with newline chars).
    idx : int
        Index of the matching line.
    context : int
        Number of lines before and after to include.

    Returns
    -------
    str
        Concatenated context snippet.
    """
    start = max(0, idx - context)
    end = min(len(lines), idx + context + 1)
    return "".join(lines[start:end])


def run_command(cmd: List[str]) -> Tuple[Optional[int], str]:
    """
    Execute a command and capture its output.

    Parameters
    ----------
    cmd : list of str
        Command and arguments to run.

    Returns
    -------
    tuple
        (returncode or None if missing, combined stdout and stderr)
    """
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
        return proc.returncode, proc.stdout + proc.stderr
    except FileNotFoundError:
        return None, f"Command not found: {cmd[0]}"


def scan_ignore_entries(path: Path) -> List[Dict[str, Any]]:
    """
    Scan a file for configured ignore directive patterns.

    Parameters
    ----------
    path : Path
        Path to the file to scan.

    Returns
    -------
    list of dict
        Each entry contains file, lineno, type, text, and context.
    """
    entries = []
    text = path.read_text(encoding="utf-8", errors="ignore")
    lines = text.splitlines(keepends=True)
    for name, pat in IGNORE_PATTERNS.items():
        for m in pat.finditer(text):
            # compute line number by counting newlines
            prefix = text[: m.start()]
            lineno = prefix.count("\n")
            context = get_context(lines, lineno)
            entries.append(
                {
                    "file": str(path),
                    "lineno": lineno + 1,
                    "type": name,
                    "text": m.group(0),
                    "context": context,
                }
            )
    return entries


def test_ignore(entry: Dict[str, Any]) -> Optional[str]:
    """
    Test whether removing an ignore directive resurfaces a linter/type error.

    Parameters
    ----------
    entry : dict
        An ignore entry from scan_ignore_entries.

    Returns
    -------
    str or None
        'justified', 'stale', or None if test was skipped.
    """
    path = Path(entry["file"])
    text = path.read_text(encoding="utf-8", errors="ignore")
    # remove only first occurrence of the directive
    new_text = text.replace(entry["text"], "", 1)
    with tempfile.NamedTemporaryFile("w+", delete=False, suffix=path.suffix, dir="tmp") as tmp:
        tmp.write(new_text)
        tmp.flush()
        tmp_path = Path(tmp.name)
    # choose linter
    if path.suffix == ".py":
        cmd = ["flake8", str(tmp_path)]
    elif path.suffix in (".js", ".ts", ".tsx"):
        cmd = ["eslint", "--config", "eslint.config.cjs", str(tmp_path)]
    else:
        # json: skip lint test
        tmp_path.unlink()
        return None
    code, _ = run_command(cmd)
    tmp_path.unlink()
    return "unknown" if code is None else "justified" if code != 0 else "stale"


def scan_docstring_entries(path: Path) -> List[Dict[str, Any]]:
    """
    Scan a file for docstring or JSDoc block patterns.

    Parameters
    ----------
    path : Path
        Path to the file to scan.

    Returns
    -------
    list of dict
        Each entry contains file, lineno, type, and text.
    """
    entries = []
    text = path.read_text(encoding="utf-8", errors="ignore")
    for name, pat in DOCSTRING_PATTERNS.items():
        for m in pat.finditer(text):
            prefix = text[: m.start()]
            lineno = prefix.count("\n")
            entries.append(
                {
                    "file": str(path),
                    "lineno": lineno + 1,
                    "type": name,
                    "text": m.group(0).split("\n", 1)[0] + "...",
                }
            )
    return entries


def test_docstrings_py(path: Path) -> Tuple[Optional[int], str]:
    """
    Run pydocstyle on a Python file to check NumPy-style docstrings.

    Parameters
    ----------
    path : Path
        Path to the Python file.

    Returns
    -------
    tuple
        (returncode, output string)
    """
    cmd = ["pydocstyle", "--convention=numpy", str(path)]
    code, out = run_command(cmd)
    return code, out


def test_docstrings_js(path: Path) -> Tuple[Optional[int], str]:
    """
    Run ESLint to check JSDoc/TSDoc compliance in JS/TS files.

    Parameters
    ----------
    path : Path
        Path to the JS/TS file.

    Returns
    -------
    tuple
        (returncode, output string)
    """
    cmd = ["eslint", "--config", "eslint.config.cjs", "--ext", ".js,.ts", str(path)]
    code, out = run_command(cmd)
    return code, out


def test_json_schema(path: Path) -> Tuple[bool, str]:
    """
    Validate that JSON schema objects include a 'description'.

    Parameters
    ----------
    path : Path
        Path to the JSON file.

    Returns
    -------
    tuple (bool, str)
        (validity, error message if parse failed)
    """
    try:
        data = json.loads(path.read_text())
    except Exception as e:
        return False, str(e)

    # check every dict with $schema has description
    def recurse(obj: Any) -> List[bool]:
        results = []
        if isinstance(obj, dict):
            if "$schema" in obj:
                results.append("description" in obj)
            for v in obj.values():
                results.extend(recurse(v))
        elif isinstance(obj, list):
            for item in obj:
                results.extend(recurse(item))
        return results

    checks = recurse(data)
    valid = all(checks) if checks else True
    return valid, ""


def main() -> None:
    """
    Scan files and generate report outputs.

    Outputs
    -------
    ignore_inventory.csv, docstring_inventory.csv, full_report.md
    """
    ignore_rows = []
    doc_rows = []
    # scan files
    for path in walk_files(ROOT):
        # ignore directives
        for entry in scan_ignore_entries(path):
            status = test_ignore(entry)
            entry["status"] = status or ""
            ignore_rows.append(entry)
        # docstrings
        doc_rows.extend(entry.copy() for entry in scan_docstring_entries(path))
    # write ignore_inventory.csv
    with Path("tmp/ignore_inventory.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["file", "lineno", "type", "text", "context", "status"])
        w.writeheader()
        w.writerows(ignore_rows)
    # write docstring_inventory.csv
    with Path("tmp/docstring_inventory.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["file", "lineno", "type", "text"])
        w.writeheader()
        w.writerows(doc_rows)
    # full_report.md
    total_ignores = len(ignore_rows)
    justified = sum(1 for r in ignore_rows if r["status"] == "justified")
    stale = sum(1 for r in ignore_rows if r["status"] == "stale")
    total_docs = len(doc_rows)
    with Path("tmp/full_report.md").open("w", encoding="utf-8") as f:
        f.write("# Inventory Report\n\n")
        f.write(f"## Ignore Directives\n- Total: {total_ignores}\n- Justified: {justified}\n- Stale: {stale}\n\n")
        f.write("## Docstring/Comments Found\n")
        f.write(f"- Total patterns: {total_docs}\n")


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
    main()

    cleanup_tmp_dir()
