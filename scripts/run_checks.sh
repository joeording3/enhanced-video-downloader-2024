#!/usr/bin/env bash
set -euo pipefail

# Activate Python virtual environment if available
if [ -f .venv/bin/activate ]; then
  source .venv/bin/activate
fi

# Script to run all linting and Python tests in one go.

echo "Running Python tests..."
pytest --maxfail=1 --disable-warnings -q

# Add extension tests and generate coverage
echo "Running JavaScript extension tests with coverage..."
npm run test:extension:coverage

# Update coverage stats and enforce threshold
echo "Updating coverage stats and enforcing coverage threshold..."
python update_coverage_stats.py --min-overall 80

echo "Running ruff linter..."
ruff check .

echo "Running ESLint and Flake8..."
npm run lint:all

echo "All checks passed!" 

# Post-check cleanup: clear transient temp/cache folders and reserved-name paths
echo "Cleaning temp/cache artifacts (preserving reports)..."
python scripts/prevent_junk_folders.py --clear-temp --remove-reserved-names || true
echo "Cleanup complete."