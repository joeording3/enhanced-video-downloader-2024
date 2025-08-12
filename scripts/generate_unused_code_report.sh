#!/usr/bin/env bash

set -euo pipefail

mkdir -p reports

report_md="reports/unused_code_report.md"
ts_out="reports/ts_prune.txt"
py_out="reports/vulture.txt"

{
  echo "# Unused Code Report"
  echo
  echo "Generated on: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
  echo
  echo "## TypeScript (ts-prune)"
} > "$report_md"

# Run ts-prune (non-blocking)
npx ts-prune -p tsconfig.json > "$ts_out" || true

{
  echo
  echo '```'
  cat "$ts_out" || true
  echo '```'
  echo
  echo "## Python (vulture)"
} >> "$report_md"

# Run vulture (non-blocking)
python -m vulture server tests --min-confidence 60 > "$py_out" || true

{
  echo
  echo '```'
  cat "$py_out" || true
  echo '```'
} >> "$report_md"

echo "Unused code report written to $report_md"


