#!/usr/bin/env python3
"""
Update tests/extension/ad-origins.json from a few public uBO lists.

Extracts host-like tokens and adds a few common ad path markers; writes a
deduplicated, sorted JSON array suitable for substring filtering in E2E tests.
"""

import json
import re
import sys
from collections.abc import Iterable
from pathlib import Path

# Candidate lists (safe, public). Avoids heavy/huge lists to keep maintenance simple.
LIST_URLS = [
    "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt",
    "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt",
]

TRY_IMPORT_REQUESTS = True
try:
    import requests  # type: ignore[import-not-found]
except Exception:  # pragma: no cover
    TRY_IMPORT_REQUESTS = False

AD_HINT_PATTERNS = [
    re.compile(r"(^|\.)doubleclick\.net$", re.IGNORECASE),
    re.compile(r"(^|\.)googlesyndication\.com$", re.IGNORECASE),
    re.compile(r"(^|\.)googletagservices\.com$", re.IGNORECASE),
    re.compile(r"(^|\.)adservice\.google$", re.IGNORECASE),
    re.compile(r"(^|\.)adnxs\.com$", re.IGNORECASE),
    re.compile(r"(^|\.)rubiconproject\.com$", re.IGNORECASE),
    re.compile(r"(^|\.)criteo\.com$", re.IGNORECASE),
    re.compile(r"(^|\.)pubmatic\.com$", re.IGNORECASE),
    re.compile(r"(^|\.)openx\.net$", re.IGNORECASE),
    re.compile(r"(^|\.)taboola\.com$", re.IGNORECASE),
    re.compile(r"(^|\.)outbrain\.com$", re.IGNORECASE),
    re.compile(r"(^|\.)scorecardresearch\.com$", re.IGNORECASE),
    re.compile(r"(^|\.)exoclick\.com$", re.IGNORECASE),
    re.compile(r"(^|\.)juicyads\.com$", re.IGNORECASE),
    re.compile(r"(^|\.)magsrv\.com$", re.IGNORECASE),
    re.compile(r"(^|\.)trafficjunky\.com$", re.IGNORECASE),
    re.compile(r"(^|\.)trafficfactory\.biz$", re.IGNORECASE),
    re.compile(r"(^|\.)onclasrv\.com$", re.IGNORECASE),
    re.compile(r"(^|\.)spotxchange\.com$", re.IGNORECASE),
    re.compile(r"(^|\.)servedbyadbutler\.com$", re.IGNORECASE),
    re.compile(r"(^|\.)adform\.net$", re.IGNORECASE),
    re.compile(r"(^|\.)media\.net$", re.IGNORECASE),
    re.compile(r"(^|\.)revcontent\.com$", re.IGNORECASE),
]

# Accept plain hostnames and also a few obvious path hints like "/ads" for substring matching in E2E
EXTRA_PATH_HINTS = ["/ads", "/advert", "/adserver", "/adunit"]


def fetch_lines(url: str) -> Iterable[str]:
    """Fetch list content and return lines; return empty on failure."""
    if not TRY_IMPORT_REQUESTS:
        return []
    try:
        r = requests.get(url, timeout=15)
        r.raise_for_status()
        return r.text.splitlines()
    except Exception:
        return []


def extract_hosts(lines: Iterable[str]) -> set[str]:
    """Extract plain host names from uBO-style filter lines."""
    out: set[str] = set()
    for raw_line in lines:
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        # EasyList style domain blocks: ||domain^ or ||domain.com^$third-party
        m = re.match(r"\|\|([a-z0-9\.-]+)\^", line, re.IGNORECASE)
        if m:
            out.add(m.group(1).lower())
            continue
        # Plain host block lines
        m2 = re.match(r"^([a-z0-9][a-z0-9\.-]+\.[a-z]{2,})$", line, re.IGNORECASE)
        if m2:
            out.add(m2.group(1).lower())
    return out


def main() -> int:
    """Entry point to merge fetched hosts with current ad-origins.json."""
    root = Path(__file__).resolve().parents[1]
    target = root / "tests/extension/ad-origins.json"
    acc: set[str] = set()
    for url in LIST_URLS:
        acc |= extract_hosts(fetch_lines(url))
    # Seed with known ad hint hosts
    for pat in AD_HINT_PATTERNS:
        acc.add(pat.pattern.replace("(^|\\.)", "").replace("$", "").replace("\\", ""))
    # Add extra path hints
    acc |= set(EXTRA_PATH_HINTS)
    cur = []
    try:
        cur = json.loads(target.read_text("utf-8"))
    except Exception:
        cur = []
    merged = sorted(set(cur) | acc)
    target.write_text(json.dumps(merged, indent=2) + "\n", encoding="utf-8")
    sys.stdout.write(f"Updated {target} with {len(merged)} entries\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
