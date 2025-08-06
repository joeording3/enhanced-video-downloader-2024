# Makefile for Enhanced Video Downloader

.PHONY: all all-continue check install-dev build-js test test-py test-js lint lint-py lint-js lint-md format format-py format-js format-md format-check format-check-py format-check-js format-check-md coverage coverage-py coverage-js clean test-fast test-js-fast test-integration test-js-slow test-slow generate-ignores test-audit audit-coverage audit-mutation audit-performance audit-docs mutation mutation-py mutation-js emoji-check markdown-check check-junk-folders cleanup-junk-folders monitor-junk-folders

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
	@echo "Tests passed"
	@echo "Running mutation testing..."
	@$(MAKE) mutation-fast || (echo "Mutation testing failed" && exit 1)
	@echo "Mutation testing passed"
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
	@echo "Running fast mutation testing..."
	@$(MAKE) mutation-fast || (echo "Mutation testing failed" && exit 1)
	@echo "Mutation testing passed"
	@echo "=== Quick Quality Checks Complete ==="

install-dev:
	uv venv .venv
	uv pip install -e .
	uv pip install -e ".[dev]"
	npm install

build-js:
	npm run build:ts

test: test-py test-js

test-py:
	pytest tests/unit --maxfail=1 --disable-warnings -q --cov=server --cov-report=term-missing --cov-report=xml --cov-report=html

test-js:
	npm test

lint: lint-py lint-js lint-md emoji-check

lint-py:
	ruff check .
	pyright server

lint-js:
	npm run lint

lint-md:
	@echo "=== Checking Markdown Files ==="
	@python scripts/check_emojis.py . --file-types .md || (echo "Markdown emoji check failed" && exit 1)
	@echo "Markdown linting passed"

# Check for emoji usage in code and documentation
emoji-check:
	@echo "=== Checking for Emoji Usage ==="
	@python scripts/check_emojis.py . || (echo "Emoji usage detected. Please remove all emojis from code and documentation." && exit 1)
	@echo "No emoji usage found"

# Check for emoji usage in markdown files specifically
markdown-check:
	@echo "=== Checking Markdown Files for Emojis ==="
	@python scripts/check_emojis.py . --file-types .md || (echo "Markdown emoji usage detected. Please remove all emojis from markdown files." && exit 1)
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
	npm run test:extension:coverage

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	rm -rf .pytest_cache coverage extension/dist node_modules

# Generate ignore files from centralized configuration
generate-ignores:
	python scripts/generate-ignore-files.py

# Fast JS unit tests (extension)
test-js-fast:
	npm run test:extension:ts

# Slow JS tests with coverage (extension E2E)
test-js-slow:
	npm run test:extension:coverage

# Python integration tests (API smoke tests)
test-integration:
	pytest -m integration --maxfail=1 --disable-warnings -q
	pytest tests/integration --maxfail=1 --disable-warnings -q

# Fast test suite: Python unit + JS unit
test-fast: test-py test-js-fast

# Slow test suite: integration + E2E JS coverage
test-slow: test-integration test-js-slow

# Test Audit Targets
test-audit: audit-coverage audit-mutation audit-performance audit-docs

audit-coverage:
	@echo "=== Coverage Analysis ==="
	pytest --cov=server --cov-report=term-missing --cov-report=html
	npm run test:extension:coverage
	@echo "Coverage reports generated in coverage/ and extension/coverage/"

audit-mutation:
	@echo "=== Mutation Testing ==="
	stryker run --mutate "server/**/*.py" --testRunner pytest
	@echo "Mutation testing complete. Check reports/mutation/ for results."

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

# Mutation Testing Targets
mutation: mutation-js mutation-py

mutation-fast:
	@echo "=== Running Fast Mutation Testing (Critical Modules Only) ==="
	@echo "Running JavaScript mutation testing on background-logic.ts..."
	npm run test:mutation:js:fast || (echo "JavaScript mutation testing failed" && exit 1)
	@echo "JavaScript mutation testing passed"
	@echo "Running Python mutation testing on critical modules..."
	npm run test:mutation:py:fast || (echo "Python mutation testing failed" && exit 1)
	@echo "Python mutation testing passed"
	@echo "Fast mutation testing complete"

mutation-js:
	@echo "=== Running Stryker Mutation Testing (JavaScript/TypeScript) ==="
	npm run test:mutation:js
	@echo "Stryker mutation testing complete"

mutation-py:
	@echo "=== Running Optimized Mutmut Mutation Testing (Python) ==="
	@echo "Running analysis and optimization..."
	python scripts/optimize_mutmut.py --analyze --optimize
	@echo "Running selective mutation testing on critical modules..."
	python scripts/optimize_mutmut.py --run
	@echo "Generating comprehensive mutation report..."
	python scripts/optimize_mutmut.py --report
	@echo "Optimized mutmut mutation testing complete"

mutation-py-fast:
	@echo "=== Running Fast Mutmut Testing (Critical Modules Only) ==="
	python scripts/fast_mutmut.py
	@echo "Fast mutation testing complete"

mutation-py-analyze:
	@echo "=== Analyzing Mutmut Results ==="
	python scripts/optimize_mutmut.py --analyze --report
	@echo "Analysis complete"

mutation-py-single:
	@echo "=== Running Single Module Mutation Testing ==="
	@if [ -z "$(MODULE)" ]; then \
		echo "Usage: make mutation-py-single MODULE=server/config.py"; \
		exit 1; \
	fi
	python scripts/fast_mutmut.py --single $(MODULE)

mutation-py-minimal:
	@echo "=== Running Minimal Mutation Testing (Fastest) ==="
	python scripts/minimal_mutmut.py --quick
	@echo "Minimal mutation testing complete"

mutation-py-quick:
	@echo "=== Running Quick Mutation Testing ==="
	python scripts/minimal_mutmut.py --quick
	@echo "Quick mutation testing complete" 

check-junk-folders:
	@echo "Checking for junk folders in root..."
	@junk_folders=$$(find . -maxdepth 1 -type d -empty ! -name . ! -name tmp ! -name .git ! -name node_modules ! -name extension ! -name server ! -name tests ! -name scripts ! -name coverage ! -name logs ! -name config ! -name reports ! -name bin ! -name mutants ! -name htmlcov ! -name _metadata ! -name trend ! -name true ! -name .venv ! -name .cursor ! -name .pytest_cache ! -name .mypy_cache ! -name .ruff_cache ! -name .hypothesis ! -name coverage); \
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