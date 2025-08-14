# Makefile for Enhanced Video Downloader

.PHONY: all all-continue check install-dev build-js test test-py test-js lint lint-py lint-js lint-md format format-py format-js format-md format-check format-check-py format-check-js format-check-md coverage coverage-py coverage-js clean test-fast test-js-fast test-integration test-js-slow test-slow generate-ignores test-audit audit-coverage audit-mutation audit-performance audit-docs mutation mutation-py mutation-js emoji-check markdown-check check-junk-folders cleanup-junk-folders monitor-junk-folders lint-unused lint-unused-ts lint-unused-py clean-temp clean-temp-reports clean-reserved-names coverage-update inventory-report audit-tests-redundancy setup-uv docstrings-audit docstrings-fix docstrings-report test-media-wide matrix-seq update-ad-origins

all:
	@echo "=== Running All Quality Checks ==="
	@echo "Running linting..."
	@$(MAKE) lint || (echo "Linting failed" && exit 1)
	@echo "Linting passed"
	@echo "Running format check..."
	@$(MAKE) format-check || (echo "Format check failed" && exit 1)
	@echo "Format check passed"
	@echo "Running tests..."
	@$(MAKE) test || (echo "Tests failed" && exit 1)
	@echo "Checking for opt-in real-site Playwright tests..."
	@if [ "$$EVD_REAL_SITES" = "true" ]; then \
	  echo "EVD_REAL_SITES=true detected. Running real-site Playwright tests..."; \
	  $(MAKE) test-real-sites || (echo "Real-site tests failed" && exit 1); \
	else \
	  echo "Skipping real-site Playwright tests (set EVD_REAL_SITES=true to enable)"; \
	fi
	@echo "Tests passed"
	@echo "Cleaning up junk folders..."
	@$(MAKE) cleanup-junk-folders || (echo "Junk folder cleanup failed" && exit 1)
	@echo "Junk folder cleanup completed"
	@echo "Generating coverage..."
	@$(MAKE) coverage || (echo "Coverage generation failed" && exit 1)
	@echo "Coverage generated"
	@echo "=== All Quality Checks Complete ==="

# Alternative target that continues even if some checks fail
all-continue:
	@echo "=== Running All Quality Checks (Continue on Failure) ==="
	@echo "Running linting..."
	@$(MAKE) lint && echo "Linting passed" || echo "Linting failed"
	@echo "Running format check..."
	@$(MAKE) format-check && echo "Format check passed" || echo "Format check failed"
	@echo "Running tests..."
	@$(MAKE) test && echo "Tests passed" || echo "Tests failed"
	@echo "Cleaning up junk folders..."
	@$(MAKE) cleanup-junk-folders && echo "Junk folder cleanup completed" || echo "Junk folder cleanup failed"
	@echo "Generating coverage..."
	@$(MAKE) coverage && echo "Coverage generated" || echo "Coverage generation failed"
	@echo "=== Quality Check Summary Complete ==="

# Quick check target (lint + format + test + mutation, no coverage)
check:
	@echo "=== Running Quick Quality Checks ==="
	@echo "Running linting..."
	@$(MAKE) lint || (echo "Linting failed" && exit 1)
	@echo "Linting passed"
	@echo "Running format check..."
	@$(MAKE) format-check || (echo "Format check failed" && exit 1)
	@echo "Format check passed"
	@echo "Running tests..."
	@$(MAKE) test || (echo "Tests failed" && exit 1)
	@echo "Tests passed"
	@echo "Cleaning up junk folders..."
	@$(MAKE) cleanup-junk-folders || (echo "Junk folder cleanup failed" && exit 1)
	@echo "Junk folder cleanup completed"
	@echo "=== Quick Quality Checks Complete ==="

install-dev:
	uv venv .venv
	uv pip install -e .
	uv pip install -e ".[dev]"
	npm install

build-js:
	npm run build:ts

test: test-py test-js test-playwright
	@$(MAKE) clean-temp

# Load .env automatically for all test invocations using python-dotenv's CLI
DOTENV_RUN=python -m dotenv -f .env run --

test-py:
	# Ensure no stale server lock interferes with tests
	rm -f server/data/server.lock
	$(DOTENV_RUN) pytest tests/unit tests/integration --maxfail=1 --disable-warnings -q --cov=server --cov-report=term-missing --cov-report=xml --cov-report=html

test-js:
	$(DOTENV_RUN) npm test

test-playwright:
	$(DOTENV_RUN) npm run test:playwright:install || true
	$(DOTENV_RUN) npm run test:playwright

# Opt-in: Real-site Playwright tests
test-real-sites:
	EVD_REAL_SITES=true $(MAKE) test-playwright

# Wide Playwright media matrix (stable list disabled); use env EVD_MEDIA_FILTER or EVD_MEDIA_URL to narrow
test-media-wide:
	EVD_MEDIA_SITES_WIDE=true $(MAKE) test-playwright

# Sequential real-site runner with detailed [MATRIX] logs
matrix-seq:
	@node scripts/run_matrix_seq.js

# Refresh tests/extension/ad-origins.json from public uBO lists
update-ad-origins:
	@. ./.venv/bin/activate >/dev/null 2>&1 || true; python scripts/update_ad_origins.py

lint: lint-py lint-js lint-md emoji-check lint-unused

lint-py:
	ruff check .
	pyright --pythonversion 3.13 server

lint-js:
	npm run lint

# Unused code checks (TypeScript + Python)
lint-unused: lint-unused-ts lint-unused-py

lint-unused-ts:
	@echo "=== Checking unused TS exports with ts-prune (including tests) ==="
	npx ts-prune -p tsconfig.json --error || true
	@echo "ts-prune check complete"

lint-unused-py:
	@echo "=== Checking unused Python code with vulture (including tests) ==="
	@. ./.venv/bin/activate && vulture server tests --min-confidence 60 || true
	@echo "vulture check complete"

lint-md:
	@echo "=== Checking Markdown Files ==="
	@python scripts/check_emojis.py . --file-types .md --whitelist config/emoji_whitelist.json || (echo "Markdown emoji check failed" && exit 1)
	@echo "Markdown linting passed"

# Check for emoji usage in code and documentation
emoji-check:
	@echo "=== Checking for Emoji Usage ==="
	@python scripts/check_emojis.py . --whitelist config/emoji_whitelist.json || (echo "Emoji usage detected. Please remove all emojis from code and documentation (whitelist in config/emoji_whitelist.json)." && exit 1)
	@echo "No emoji usage found"

# Check for emoji usage in markdown files specifically
markdown-check:
	@echo "=== Checking Markdown Files for Emojis ==="
	@python scripts/check_emojis.py . --file-types .md --whitelist config/emoji_whitelist.json || (echo "Markdown emoji usage detected. Please remove emojis from markdown (whitelist in config/emoji_whitelist.json)." && exit 1)
	@echo "No emoji usage found in markdown files"

format: format-py format-js format-md

format-py:
	ruff format server
	ruff check --fix server

format-js:
	npm run format

format-md:
	@echo "=== Formatting Markdown Files ==="
	@npx prettier --write "**/*.md" || (echo "Markdown formatting failed" && exit 1)
	@echo "Markdown formatting complete"

format-check: format-check-py format-check-js format-check-md

format-check-py:
	ruff format --check server
	ruff check server

format-check-js:
	npm run format:check

format-check-md:
	@echo "=== Checking Markdown Format ==="
	@npx prettier --check "**/*.md" || (echo "Markdown format check failed" && exit 1)
	@echo "Markdown format check passed"

coverage: coverage-py coverage-js

coverage-py:
	@echo "Coverage reports already generated during test execution"

coverage-js:
	npm run test:coverage

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	rm -rf .pytest_cache coverage extension/dist node_modules

# Remove transient temp/cache artifacts created by tests and tooling (preserve reports)
clean-temp:
	@echo "Cleaning temp/cache artifacts (preserving reports)..."
	@python scripts/prevent_junk_folders.py --clear-temp --remove-reserved-names || (echo "Temp cleanup failed" && exit 1)
	@echo "Temp/cache cleanup complete"

# Remove temp/cache artifacts including coverage/mutation/test reports
clean-temp-reports:
	@echo "Cleaning temp/cache artifacts including reports..."
	@python scripts/prevent_junk_folders.py --clear-temp --clear-reports --remove-reserved-names || (echo "Temp+reports cleanup failed" && exit 1)
	@echo "Temp/cache+reports cleanup complete"

# Explicit target to scrub Windows reserved-name paths (e.g., LPT1)
clean-reserved-names:
	@echo "Removing Windows reserved-name paths (e.g., LPT1, CON, COM1)..."
	@python scripts/prevent_junk_folders.py --remove-reserved-names || (echo "Reserved-name cleanup failed" && exit 1)
	@echo "Reserved-name cleanup complete"

# Generate ignore files from centralized configuration
generate-ignores:
	python scripts/generate-ignore-files.py

# Optional/Manual Utilities (discoverable via Make)

# Generate combined coverage stats and update TODO.md
coverage-update:
	@echo "=== Updating coverage statistics (Python + Frontend) ==="
	@python scripts/update_coverage_stats.py || (echo "Coverage update failed" && exit 1)
	@echo "Coverage statistics updated"

# Produce ignore/docstring inventories and a consolidated report under tmp/
inventory-report:
	@echo "=== Generating inventory report (ignores + docstrings) ==="
	@python scripts/generate_inventory_report.py || (echo "Inventory report generation failed" && exit 1)
	@echo "Inventory report written to tmp/ and reports/ (if applicable)"

# Focused audit for ignore/exclude usage across configs and inline suppressions
audit-ignores:
	@echo "=== Auditing ignore/exclude usage (Python + ESLint + inline) ==="
	@python scripts/audit_ignores.py || (echo "Ignore audit failed" && exit 1)
	@echo "Ignore audit written to reports/ignores_audit.md"

# Analyze test suite redundancy and write report under reports/
audit-tests-redundancy:
	@echo "=== Auditing test suite for redundancy ==="
	@python scripts/audit_test_redundancy.py || (echo "Test redundancy audit failed" && exit 1)
	@echo "Test redundancy audit complete (see reports/test_audit_report.md)"

# One-time developer environment setup using uv
setup-uv:
	@echo "=== Running uv-based developer setup ==="
	@python scripts/setup_uv.py || (echo "uv setup failed" && exit 1)
	@echo "uv setup complete"

# Fast JS unit tests (extension)
test-js-fast:
	$(DOTENV_RUN) npm test

# Slow JS tests with coverage (extension E2E)
test-js-slow:
	$(DOTENV_RUN) npm run test:coverage

# Python integration tests (API smoke tests)
test-integration:
	$(DOTENV_RUN) pytest -m integration --maxfail=1 --disable-warnings -q
	$(DOTENV_RUN) pytest tests/integration --maxfail=1 --disable-warnings -q

# Fast test suite: Python unit + JS unit
test-fast: test-py test-js-fast

# Slow test suite: integration + E2E JS coverage
test-slow: test-integration test-js-slow

# Test Audit Targets
test-audit: audit-coverage audit-mutation audit-performance audit-docs


audit-coverage:
	@echo "=== Coverage Analysis ==="
	$(DOTENV_RUN) pytest --cov=server --cov-report=term-missing --cov-report=html
	$(DOTENV_RUN) npm run test:extension:coverage
	@echo "Coverage reports generated in coverage/ and extension/coverage/"

audit-mutation:
	@echo "=== Mutation Testing (JS/TS + Python) ==="
	@echo "Running Stryker (JS/TS)..."
	npm run test:mutation:js:analyze || (echo "Stryker failed" && exit 1)
	@echo "Stryker complete. HTML report in mutants/ or reports/mutation/."
	@echo "Running mutmut (Python)..."
	timeout 600 mutmut run || (echo "mutmut run failed" && exit 1)
	mutmut results || true
	@echo "Mutation testing complete. Check reports/mutation/ and mutmut output."

audit-performance:
	@echo "=== Performance Review ==="
	pytest --durations=10 --durations-min=1.0
	npm test -- --verbose --testTimeout=5000
	@echo "Performance review complete. Check for slow tests above."

audit-docs:
	@echo "=== Documentation Audit ==="
	@echo "Checking test docstrings..."
	python -c "import ast; [print(f'Missing docstring: {f}') for f in __import__('pathlib').Path('tests').rglob('*.py') if not ast.parse(f.read_text()).body[0].docstring]" 2>/dev/null || echo "Docstring check complete"
	@echo "Checking for TODO/FIXME in tests..."
	grep -r "TODO\|FIXME" tests/ || echo "No TODO/FIXME found in tests"
	@echo "Documentation audit complete."

# Docstring audit (Python): enforce NumPy/Sphinx-style via Ruff (pydocstyle + RST)
docstrings-audit:
	@echo "=== Running Python docstring audit (Ruff: D rules, NumPy/Sphinx via napoleon) ==="
	@mkdir -p reports
	# Full text report (override project ignores to include D100; keep D212/D401 relaxed for now)
	@ruff check server --select D --ignore D212,D401 --output-format=full > reports/docstrings_report.txt || true
	# JSON report for tooling
	@ruff check server --select D --ignore D212,D401 --output-format=json > reports/docstrings_report.json || true
	@echo "Docstring audit complete. See reports/docstrings_report.{txt,json}"

# Attempt autofixes for simple issues (summary-line punctuation, spacing, etc.)
docstrings-fix:
	@echo "=== Attempting auto-fixes for docstrings (safe subset) ==="
	# Use Ruff to apply safe fixes; manual follow-up will still be required for missing/incorrect docs
	@ruff check server --select D --ignore D212,D401 --fix || true
	@echo "Auto-fix pass complete. Re-run 'make docstrings-audit' to review remaining issues."

# Convenience target: run audit and show a brief summary to console
docstrings-report: docstrings-audit
	@echo "=== Docstring issues summary (top 50) ==="
	@cat reports/docstrings_report.txt | head -n 200 || true

# Mutation Testing Targets
mutation: mutation-js mutation-py

mutation-fast:
	@echo "=== Running Fast Mutation Testing (Critical Modules Only) ==="
	@echo "Running JavaScript mutation testing..."
	npm run test:mutation:js || (echo "JavaScript mutation testing failed" && exit 1)
	@echo "JavaScript mutation testing passed"
	@echo "Running Python mutation testing on critical modules..."
	timeout 600 python -m mutmut run || (echo "Python mutation testing failed" && exit 1)
	@echo "Python mutation testing passed"
	@echo "Fast mutation testing complete"

mutation-js:
	@echo "=== Running Stryker Mutation Testing (JavaScript/TypeScript) ==="
	npm run test:mutation:js
	@echo "Stryker mutation testing complete"


mutation-js-fast:
	@echo "=== Running Fast Stryker Mutation Testing (critical files) ==="
	npm run test:mutation:js:fast
	@echo "Fast Stryker mutation testing complete"


mutation-js-minimal:
	@echo "=== Running Minimal Stryker Mutation Testing (single file) ==="
	npm run test:mutation:js:minimal
	@echo "Minimal Stryker mutation testing complete"



mutation-js-debug:
	@echo "=== Running Stryker Mutation Testing with Debug Output ==="
	npm run test:mutation:js:debug
	@echo "Stryker debug testing complete"

mutation-js-analyze:
	@echo "=== Running Stryker Mutation Testing with Analysis ==="
	npm run test:mutation:js:analyze
	@echo "Stryker analysis complete"

mutation-py:
	@echo "=== Running Mutmut Mutation Testing (Python) ==="
	@echo "Running mutation testing on critical modules..."
	timeout 600 mutmut run
	@echo "Generating mutation report..."
	mutmut results
	@echo "Mutmut mutation testing complete"

mutation-py-fast:
	@echo "=== Running Fast Mutmut Testing (Critical Modules Only) ==="
	timeout 300 mutmut run
	@echo "Fast mutation testing complete"

mutation-py-analyze:
	@echo "=== Analyzing Mutmut Results ==="
	mutmut results
	@echo "Analysis complete"

mutation-py-single:
	@echo "=== Running Single Module Mutation Testing ==="
	@if [ -z "$(MODULE)" ]; then \
		echo "Usage: make mutation-py-single MODULE=server/config.py"; \
		exit 1; \
	fi
	@echo "Testing single module: $(MODULE)"
	@echo "Note: Use setup.cfg to configure which modules to test"

mutation-py-minimal:
	@echo "=== Running Minimal Mutation Testing (Fastest) ==="
	timeout 180 mutmut run
	@echo "Minimal mutation testing complete"

mutation-py-quick:
	@echo "=== Running Quick Mutation Testing ==="
	timeout 180 mutmut run
	@echo "Quick mutation testing complete"

mutmut-quick:
	@echo "=== Running Quick Mutmut Testing (Critical Modules Only) ==="
	timeout 300 mutmut run
	@echo "Quick mutmut testing complete"

mutmut: mutmut-quick
	@echo "=== Running Full Mutmut Testing ==="
	timeout 600 mutmut run
	mutmut results
	@echo "Full mutmut mutation testing complete"

check-junk-folders:
	@echo "Checking for junk folders in root..."
	@junk_folders=$$(find . -maxdepth 1 -type d -empty ! -name . ! -name tmp ! -name .git ! -name node_modules ! -name extension ! -name server ! -name tests ! -name scripts ! -name coverage ! -name logs ! -name config ! -name reports ! -name bin ! -name mutants ! -name htmlcov ! -name _metadata ! -name trend ! -name true ! -name .venv ! -name .cursor ! -name .pytest_cache ! -name .mypy_cache ! -name .ruff_cache ! -name .hypothesis ! -name .benchmarks ! -name coverage); \
	if [ -n "$$junk_folders" ]; then \
	  echo "Junk folders found in root:"; \
	  echo "$$junk_folders"; \
	  exit 1; \
	else \
	  echo "No junk folders found."; \
	fi

cleanup-junk-folders:
	@echo "Cleaning up empty junk directories..."
	@python scripts/prevent_junk_folders.py --cleanup

monitor-junk-folders:
	@echo "Starting junk folder monitor..."
	@python scripts/prevent_junk_folders.py --monitor
