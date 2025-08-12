#!/usr/bin/env python3
"""
Audit ignore/exclude usage across Python and JS/TS tooling and inline suppressions.

Goals:
- Detect global/broad rule ignores (e.g., many Ruff D/*, blanket ESLint disables)
- Detect per-file or glob-wide suppressions that skip entire files or folders
- Inventory inline suppressions (# noqa, # type: ignore, // eslint-disable...)
- Produce an actionable report with counts, locations, and suggested remediations

Outputs:
- reports/ignores_audit.md (human-readable summary)
- tmp/ignores_inline.csv (raw inline suppressions inventory)
"""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path
from typing import Any

try:
    import tomllib  # Python 3.11+
except Exception:  # pragma: no cover
    tomllib = None  # type: ignore[assignment]


ROOT = Path(__file__).resolve().parents[1]
REPORTS_DIR = ROOT / "reports"
TMP_DIR = ROOT / "tmp"


INLINE_PATTERNS = {
    "python_noqa": re.compile(r"#\s*noqa\b"),
    "python_type_ignore": re.compile(r"#\s*type:\s*ignore\b"),
    "eslint_disable": re.compile(r"//\s*eslint-disable(?!-next-line)\b"),
    "eslint_disable_next": re.compile(r"//\s*eslint-disable-next-line\b"),
}


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return ""


def load_pyproject() -> dict[str, Any]:
    cfg_path = ROOT / "pyproject.toml"
    if not cfg_path.exists() or tomllib is None:
        return {}
    try:
        return tomllib.loads(cfg_path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def analyze_ruff(cfg: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {"global_ignores": [], "per_file_ignores": {}, "exclude": []}
    ruff = cfg.get("tool", {}).get("ruff", {})
    lint = ruff.get("lint", {})
    out["global_ignores"] = list(lint.get("ignore", []))
    pfi = lint.get("per-file-ignores", {})
    if isinstance(pfi, dict):
        out["per_file_ignores"] = {str(k): list(v) for k, v in pfi.items()}
    out["exclude"] = list(ruff.get("exclude", []))
    return out


def analyze_flake8(cfg: dict[str, Any]) -> dict[str, Any]:
    flake = cfg.get("tool", {}).get("flake8", {})
    return {
        "max_line_length": flake.get("max-line-length"),
        "exclude": list(flake.get("exclude", [])),
        "per_file_ignores": list(flake.get("per-file-ignores", [])),
    }


def analyze_pyright() -> dict[str, Any]:
    path = ROOT / "pyrightconfig.json"
    if not path.exists():
        return {}
    try:
        data = json.loads(_read_text(path) or "{}")
    except Exception:
        data = {}
    return {
        "exclude": data.get("exclude", []),
        "ignore": data.get("ignore", []),
        "reportSettings": {k: v for k, v in data.items() if k.startswith("report")},
    }


def analyze_eslint() -> dict[str, Any]:
    cfg_js = ROOT / "eslint.config.cjs"
    ignore_file = ROOT / ".eslintignore"
    text = _read_text(cfg_js)
    ignores: list[str] = []
    # Heuristic: capture ignorePatterns arrays if present
    m = re.search(r"ignorePatterns\s*:\s*\[(.*?)\]", text, flags=re.DOTALL)
    if m:
        items = m.group(1)
        ignores = [s.strip().strip("'\"") for s in re.split(r",\s*", items) if s.strip()]
    file_ignores = []
    if ignore_file.exists():
        file_ignores = [line.strip() for line in _read_text(ignore_file).splitlines() if line.strip() and not line.strip().startswith("#")]
    # Detect any global rule disables: e.g., rules: { 'no-console': 'off' } (not always bad but noteworthy)
    globally_disabled_rules = re.findall(r"['\"]([\w-]+)['\"]\s*:\s*['\"]off['\"]", text)
    return {"ignorePatterns": ignores, "eslintignore": file_ignores, "rules_off": globally_disabled_rules}


def walk_sources() -> list[Path]:
    ex_dirs = {".git", ".venv", "venv", "node_modules", "dist", "build", "coverage", "htmlcov", "mutants"}
    matched: list[Path] = []
    for dp, dns, fns in os_walk(ROOT):  # type: ignore[name-defined]
        dns[:] = [d for d in dns if d not in ex_dirs]
        matched.extend(
            Path(dp) / fn
            for fn in fns
            if fn.endswith((".py", ".ts", ".tsx", ".js"))
        )
    return matched


def os_walk(root: Path):  # small wrapper to help typing
    import os

    return os.walk(root)


def scan_inline_suppressions(files: list[Path]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for fp in files:
        text = _read_text(fp)
        lines = text.splitlines()
        for name, pat in INLINE_PATTERNS.items():
            for i, line in enumerate(lines, start=1):
                if pat.search(line):
                    rows.append({"file": str(fp.relative_to(ROOT)), "line": i, "type": name, "code": line.strip()})
    return rows


def main() -> int:
    REPORTS_DIR.mkdir(exist_ok=True)
    TMP_DIR.mkdir(exist_ok=True)

    pyproject = load_pyproject()
    ruff_info = analyze_ruff(pyproject)
    flake8_info = analyze_flake8(pyproject)
    pyright_info = analyze_pyright()
    eslint_info = analyze_eslint()

    files = walk_sources()
    inline_rows = scan_inline_suppressions(files)

    # Write CSV inventory
    with (TMP_DIR / "ignores_inline.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["file", "line", "type", "code"])
        w.writeheader()
        w.writerows(inline_rows)

    # Compose report
    lines: list[str] = []
    lines.append("# Ignores/Excludes Audit\n")
    lines.append("\n## Ruff (Python)\n")
    lines.append(f"- Global ignores: {len(ruff_info.get('global_ignores', []))} -> {ruff_info.get('global_ignores', [])}\n")
    if any(code in ruff_info.get("global_ignores", []) for code in ("D100", "ANN401")):
        lines.append("  - Warning: Global ignore contains documentation or typing rules. Prefer targeted fixes.\n")
    if ruff_info.get("per_file_ignores"):
        lines.append(f"- Per-file ignores entries: {len(ruff_info['per_file_ignores'])}\n")
        for pat, rules in sorted(ruff_info["per_file_ignores"].items()):
            lines.append(f"  - {pat}: {', '.join(rules)}\n")
    if ruff_info.get("exclude"):
        lines.append(f"- Excluded paths: {ruff_info['exclude']}\n")

    lines.append("\n## Flake8 (legacy)\n")
    lines.append(f"- Exclude: {flake8_info.get('exclude')}\n")
    if flake8_info.get("per_file_ignores"):
        lines.append(f"- Per-file-ignores: {flake8_info['per_file_ignores']}\n")

    lines.append("\n## Pyright\n")
    if pyright_info:
        lines.append(f"- Exclude: {pyright_info.get('exclude', [])}\n")
        lines.append(f"- Ignore: {pyright_info.get('ignore', [])}\n")
        # Show a couple of report settings turned off (value: 'none')
        turned_off = [k for k, v in pyright_info.get("reportSettings", {}).items() if str(v).lower() == "none"]
        if turned_off:
            lines.append(f"- Disabled diagnostics: {turned_off}\n")

    lines.append("\n## ESLint\n")
    lines.append(f"- ignorePatterns: {eslint_info.get('ignorePatterns', [])}\n")
    if eslint_info.get("eslintignore"):
        lines.append(f"- .eslintignore entries: {eslint_info['eslintignore']}\n")
    if eslint_info.get("rules_off"):
        lines.append(f"- Globally disabled rules (rules: 'off'): {sorted(set(eslint_info['rules_off']))}\n")

    # Inline suppressions summary
    lines.append("\n## Inline suppressions\n")
    lines.append(f"- Total inline suppressions: {len(inline_rows)}\n")
    by_type: dict[str, int] = {}
    for row in inline_rows:
        by_type[row["type"]] = by_type.get(row["type"], 0) + 1
    for t, c in sorted(by_type.items()):
        lines.append(f"  - {t}: {c}\n")

    # Recommendations
    lines.append("\n## Recommendations\n")
    lines.append("- Prefer targeted, line-level suppressions with a short rationale over global ignores.\n")
    lines.append("- Avoid skipping entire files/directories except generated or third-party code.\n")
    lines.append("- Review per-file ignores that use wide globs (e.g., tests/**/*.py) and narrow when possible.\n")
    lines.append("- Consider removing global D* docstring or typing rules from Ruff ignore; enforce via dedicated workflows.\n")

    (REPORTS_DIR / "ignores_audit.md").write_text("".join(lines), encoding="utf-8")

    sys.stdout.write("Ignore audit complete. See reports/ignores_audit.md and tmp/ignores_inline.csv\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())


