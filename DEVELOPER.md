# Developer Guide

## Current Project Status

### Test Quality Metrics

- **Overall Test Coverage**: 67% (target: 80%)
- **Python Server Coverage**: 67% (target: 80%)
- **Frontend Extension Coverage**: 76.68% (target: 80%)
- **JS/TS Mutation Score**: 89.47% (target: 80%, minimum: 70%)
- **Python Mutation Testing**: Baseline establishment in progress
- **Code Quality**: 100% lint compliance
- **Documentation**: Complete Sphinx-style docstrings across all modules

### Code Quality Standards

#### Type Safety

- **Pyright Status**: 0 errors, 143 warnings (excellent improvement from 368 errors)
- **Type Ignore Usage**: 32 instances across the codebase, all legitimate and necessary
- **Type Coverage**: Excellent with significant improvements since project inception
- **Configuration**: Python 3.13 compatibility with modern union syntax support

**Type Ignore Categories**:

- **Third-party libraries** (yt-dlp, browser_cookie3, gunicorn): 15 instances
- **Test-specific mocking**: 17 instances for legitimate test scenarios
- **Dynamic system access**: Process management and Click command access

#### Documentation Standards

- **Test Docstring Coverage**: 100% across all test categories
- **Format**: Sphinx/REST style for Python, JSDoc for TypeScript
- **Requirements**:
  - One-line summary starting with imperative verb
  - `:param:` entries with names and types
  - `:returns:` with type and description
  - No emojis in documentation (project rule)

**Documentation Compliance**:

- **Unit Tests**: All 15+ files have proper Sphinx-style docstrings
- **Integration Tests**: All 8 files have comprehensive docstrings
- **Extension Tests**: All TypeScript test files have standardized JSDoc format
- **New Files**: All new test files maintain excellent docstring coverage

### Recent Major Achievements

- **Documentation Standardization**: Completed standardization of documentation file naming
  convention
- **Server Test Coverage Milestone**: Comprehensive improvements across all server modules
- **Property-Based Testing**: Implemented 28 property-based tests using Hypothesis
- **Test Suite Consolidation**: Refactored repetitive test patterns using parameterized testing
- **CLI Modularization**: Restructured server CLI into modular components
- **CSS Consolidation**: Completed comprehensive CSS audit and cleanup with 15-20% size reduction
- **Type Safety Improvements**: Eliminated all pyright errors (0 errors, down from 368)
- **Documentation Excellence**: Achieved 100% docstring coverage across all test categories

## Development Environment Setup

### Prerequisites

- **Python**: 3.8+ (3.13 recommended)
- **Node.js**: 18+ (for TypeScript compilation and testing)
- **Chrome**: For extension testing and development
- **uv**: For Python virtual environment and dependency management
  ([Install instructions](https://github.com/astral-sh/uv#installation))

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/joeording3/Enhanced-Video-Downloader.git
cd Enhanced-Video-Downloader

# Create a virtual environment and install dependencies using uv
uv venv .venv
uv pip install -e .
uv pip install -e ".[dev]"

# Install Node.js dependencies
npm install

# Build TypeScript files
npm run build:ts

# Run quality checks
make all
```

### Package Management with uv

This project uses `uv` for Python package management, which provides:

- **Fast dependency resolution**: Significantly faster than pip
- **Reliable dependency locking**: Automatic lockfile generation
- **Virtual environment management**: Built-in venv creation and activation
- **Development dependencies**: Separate management of dev tools

#### uv Configuration

The project is configured to use `uv` through:

- `pyproject.toml`: Contains all dependencies with exact versions
- `uv.lock`: Auto-generated lockfile (created on first install)
- `Makefile`: Updated to use `uv` commands
- `.envrc`: Configured for automatic uv environment activation

#### Key uv Commands

```bash
# Create virtual environment
uv venv .venv

# Install project dependencies
uv pip install -e .

# Install development dependencies
uv pip install -e ".[dev]"

# Update dependencies
uv pip sync

# Add new dependency
uv add package-name

# Add development dependency
uv add --dev package-name
```

### Automatic Virtual Environment Activation (Recommended)

This project includes automatic virtual environment activation using `direnv`. When you enter the
project directory, the Python virtual environment will be automatically activated.

#### Setup direnv (one-time setup)

1. **Install direnv**:

   ```bash
   # macOS (using Homebrew)
   brew install direnv

   # Ubuntu/Debian
   sudo apt-get install direnv

   # Or install from source: https://direnv.net/#installation
   ```

2. **Add direnv hook to your shell**:

   For zsh (add to `~/.zshrc`):

   ```bash
   eval "$(direnv hook zsh)"
   ```

   For bash (add to `~/.bashrc` or `~/.bash_profile`):

   ```bash
   eval "$(direnv hook bash)"
   ```

3. **Allow the project's .envrc** (run this once in the project directory):

```bash
direnv allow
```

After setup, the virtual environment will automatically activate when you `cd` into the project
directory and deactivate when you leave it.

#### Manual Activation (Alternative)

If you prefer not to use direnv, you can manually activate the virtual environment:

```bash
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

### Development Tools

#### Python Tooling (Current)

- **Ruff**: Primary Python linter (replacing flake8)
- **Black**: Code formatting (120-character line length)
- **isort**: Import sorting
- **mypy**: Type checking (enhanced mode)
- **pytest**: Testing framework
- **mutmut**: Mutation testing

#### JavaScript/TypeScript Tooling (Current)

- **ESLint**: Linting with TypeScript support
- **Prettier**: Code formatting
- **Stylelint**: CSS linting
- **Jest**: Testing framework
- **Playwright**: E2E testing
- **Stryker**: Mutation testing
- **esbuild**: TypeScript compilation and bundling

#### Build Automation

- **Makefile**: Comprehensive build and test automation
- **npm scripts**: JavaScript/TypeScript build and test commands
- **CI/CD**: GitHub Actions with matrix testing across Chrome channels

## Quality Assurance Commands

### Unused Code Detection

```bash
# Detect unused TS exports (includes tests via root tsconfig)
make lint-unused-ts

# Detect unused Python code (server and tests)
make lint-unused-py

# Run both
make lint-unused
```

Notes:
- ts-prune scans according to `tsconfig.json` includes; tests are included in the root config.
- vulture is run with `--min-confidence 60` over `server` and `tests` to keep noise manageable; adjust as needed.

### Comprehensive Quality Checks

```bash
# Run all quality checks (stops on first failure)
make all

# Run all quality checks but continue even if some fail (shows summary)
make all-continue

# Quick quality checks without coverage (faster feedback)
make check
```

### Individual Quality Checks

```bash
# Linting
make lint          # Run linting for Python and JavaScript
make lint-py       # Python linting only
make lint-js       # JavaScript linting only

# Formatting
make format        # Auto-format code
make format-check  # Check code formatting without modifying files

# Testing
make test          # Run all tests (Python and JavaScript)
make test-py       # Python tests only
make test-js       # JavaScript tests only
make test-fast     # Fast unit tests only
make test-slow     # Slow integration and E2E tests

# Coverage
make coverage      # Generate test coverage reports
make coverage-py   # Python coverage only
make coverage-js   # JavaScript coverage only

# Mutation Testing
make mutation      # Run all mutation tests
make mutation-js   # JavaScript/TypeScript mutation testing
make mutation-py   # Python mutation testing
```

### Test Audit Commands

```bash
# Comprehensive test audit
make test-audit

# Individual audit components
make audit-coverage    # Coverage analysis
make audit-mutation    # Mutation testing
make audit-performance # Performance review
make audit-docs        # Documentation check
```

## Testing Infrastructure

### Test Quality Metrics (Current)

- **Overall Test Coverage**: 45.34% (target: 80%)
- **Python Server Coverage**: 67% (improved from 58%)
- **Frontend Extension Coverage**: 0% (target: 80%)
- **JS/TS Mutation Score**: 38.24% (target: 80%, minimum: 70%)

### Test Types

- **Unit Tests**: Isolated function/module tests with mocked dependencies
- **Integration Tests**: API endpoint tests with real Flask app
- **E2E Tests**: Full browser automation with Playwright
- **Property-Based Tests**: 28 Hypothesis-based tests for critical Python functions
- **Mutation Tests**: Stryker (JS/TS) and Mutmut (Python) for test quality validation

### Test Organization

- **tests/unit/**: Python server unit tests
- **tests/integration/**: API and CLI integration tests
- **tests/extension/**: Chrome extension tests (Jest + Playwright)
- **tests/jest/**: Jest configuration and setup

### Mutation Testing Status

#### JavaScript/TypeScript (Stryker)

- **Status**: Configured and integrated in CI
- **Target Score**: 80% (break threshold: 70%)
- **Current Score**: 38.24% (BELOW THRESHOLD)
- **Critical Modules**:
  - `background-logic.ts`: 48.21%
  - `popup.ts`: 48.76%
  - `content.ts`: 60.00%
  - `background.ts`: 53.19%

#### Python (Mutmut)

- **Status**: Baseline establishment in progress
- **Target Score**: 80%
- **Configuration**: Integrated in CI pipeline

### Running Tests

#### Python Tests

```bash
# Unit tests with coverage
pytest tests/unit --maxfail=1 --disable-warnings -q --cov=server --cov-report=term-missing

# Integration tests
pytest tests/integration --maxfail=1 --disable-warnings -q

# All tests
pytest --maxfail=1 --disable-warnings -q
```

#### JavaScript/TypeScript Tests

```bash
# Unit tests
npm run test:extension:ts

# Tests with coverage
npm run test:extension:coverage

# All tests
npm test
```

#### Mutation Testing

```bash
# JavaScript/TypeScript mutation testing
npm run test:mutation:js

# Python mutation testing
npm run test:mutation:py

# All mutation tests
npm run test:mutation:all

# Fast mutation testing (critical modules only)
npm run test:mutation:js:fast
npm run test:mutation:py:fast

# Pre-commit mutation testing
npm run test:mutation:pre-commit
```

## Mutation Testing Guide

This project uses **mutmut** for Python mutation testing and **Stryker** for JavaScript/TypeScript
mutation testing.

### Python Mutation Testing (mutmut)

#### Configuration

Mutation testing is configured in `setup.cfg`:

```ini
[mutmut]
paths_to_mutate=server/
backup=False
runner=python -m pytest
tests_dir=tests/
max_workers=8
timeout_factor=2.0
enable_speed_report=True
exclude=server/__pycache__/*,server/*.pyc,server/data/*,server/config/*.json,mutants/*
mutation_operators=operator,comparison,boolean
test_time_multiplier=1.5
test_time_base=30
coverage_analysis=True
```

#### Commands

**Direct mutmut commands (recommended):**

```bash
# Run mutation testing
mutmut run

# View results
mutmut results

# View specific mutant details
mutmut show <mutant_name>

# Apply a specific mutation
mutmut apply <mutant_name>
```

**Make targets (with timeouts):**

```bash
make mutation-py              # Full testing (10min timeout)
make mutation-py-fast         # Fast testing (5min timeout)
make mutation-py-minimal      # Minimal testing (3min timeout)
make mutation-py-quick        # Quick testing (3min timeout)
make mutation-py-analyze      # View results
```

#### Performance Optimizations

**Key Optimizations from Official Documentation:**

1. **Limit Stack Depth** (Most Critical):

   ```ini
   max_stack_depth=3  # For regular testing
   max_stack_depth=2  # For fast testing
   ```

   This can reduce test execution by 90%+ by only running tests that directly exercise the mutated
   function.

2. **Reduced Scope**:

   - **Before**: Testing all files in `server/` directory
   - **After**: Testing only critical files for fast testing

3. **Aggressive Performance Settings**:

   ```ini
   max_workers=8                    # Balanced for CPU cores
   timeout_factor=0.5              # Aggressive timeouts
   mutation_operators=operator     # Only most effective mutations
   test_time_multiplier=0.3       # Very fast test execution
   test_time_base=5               # Short base timeout
   ```

4. **Comprehensive Exclusions**:

   ```ini
   exclude=server/__pycache__/*,server/*.pyc,server/data/*,server/config/*.json,mutants/*,server/utils/*,server/integration/*,server/api/*,server/cli_commands/*.py,server/cli_helpers.py,server/cli_main.py,server/cli_resume_helpers.py,server/downloads/*,server/history.py,server/lock.py,server/logging_setup.py,server/utils.py,server/video_downloader_server.py,server/__init__.py,server/__main__.py,server/constants.py,server/extraction_rules.py,server/disable_launchagents.py,server/cli/*,server/schemas.py
   ```

5. **Disabled Expensive Features**:
   ```ini
   coverage_analysis=False  # Disable coverage analysis
   dict_synonyms=          # Disable expensive dict synonyms
   threshold=0             # No threshold checking
   ```

#### Performance Impact

**Expected Improvements:**

- **Stack depth limitation**: 90%+ reduction in test execution
- **Scope reduction**: 95% fewer files to test
- **Faster workers**: 8 parallel processes
- **Shorter timeouts**: 0.5x timeout factor
- **Fewer operators**: Only `operator` mutations vs 3 types
- **Faster test execution**: 0.3x multiplier vs 1.5x

**Estimated Speed Improvement:**

- **Before**: 5-10 minutes
- **After**: 30-60 seconds
- **Improvement**: 85-90% faster

#### Troubleshooting

**If mutation testing hangs:**

1. Use timeouts: `timeout 300 mutmut run`
2. Reduce workers: Set `max_workers=4` in setup.cfg
3. Increase timeouts: Set `timeout_factor=3.0` in setup.cfg

**If you get FileNotFoundError:**

- Check that `paths_to_mutate` points to existing directories/files
- Ensure exclude patterns don't exclude everything

### JavaScript/TypeScript Mutation Testing (Stryker)

#### Configuration

Stryker configuration is in `stryker.conf.js` with optimized settings:

```javascript
module.exports = {
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "jest",
  coverageAnalysis: "perTest",
  allowEmpty: true,
  inPlace: true,
  disableTypeChecks: true,
  jest: {
    configFile: "jest.config.js",
    projectType: "custom",
    enableFindRelatedTests: false,
  },
  mutate: [
    "extension/src/**/*.ts",
    "!extension/src/**/*.test.ts",
    "!extension/src/**/*.spec.ts",
    "!extension/src/**/__tests__/**",
    "!extension/src/types/**",
    "!extension/src/global.d.ts",
    "!extension/src/extension-overview.md",
  ],
  thresholds: {
    high: 80,
    low: 60,
    break: null, // Temporarily disabled to allow make all to pass
  },
  timeoutMS: 5000, // Increased timeout for better reliability
  concurrency: 8, // Increased concurrency for better performance
  maxTestRunnerReuse: 50, // More test runner reuse for better performance
  ignoreStatic: true,
  logLevel: "info",
  tempDirName: ".stryker-tmp",
  symlinkNodeModules: false,
  testRunnerNodeArgs: ["--max-old-space-size=4096"],
  disableBail: true,
};
```

#### Performance Optimizations

**Key Optimizations:**

1. **Concurrency and Test Runner Reuse**:

   - **Increased Concurrency**: From 6 to 8 concurrent test runners
   - **Max Test Runner Reuse**: Increased from 20 to 50 for better performance

2. **Memory and Timeout Settings**:

   - **Node.js Memory**: Increased to 4GB with `--max-old-space-size=4096`
   - **Timeout**: Increased from 3s to 5s for better reliability
   - **Disable Bail**: Prevents early termination for better coverage

3. **Configuration Files**:
   - **Main Configuration** (`stryker.conf.js`): Full scope testing on all TypeScript files
   - **Fast Configuration** (`stryker.fast.conf.js`): Minimal scope (3 critical files only)
   - **Ultra-Minimal Configuration** (`stryker.ultra-minimal.conf.js`): Single file testing for
     maximum speed

#### Commands

```bash
# Full mutation testing
npm run test:mutation:js

# Fast mutation testing (critical files only)
npm run test:mutation:js:fast

# Ultra-minimal testing (single file)
npm run test:mutation:js:minimal

# Debug mode with detailed logging
npm run test:mutation:js:debug

# Analysis mode with HTML reports
npm run test:mutation:js:analyze
```

#### Makefile Targets

```bash
# Full mutation testing
make mutation-js

# Fast mutation testing
make mutation-js-fast

# Ultra-minimal testing
make mutation-js-minimal

# Debug mode
make mutation-js-debug

# Analysis mode
make mutation-js-analyze

# Combined fast testing (JS + Python)
make mutation-fast
```

#### Performance Impact

**Expected Improvements:**

- **Concurrency**: 33% more concurrent test runners
- **Memory**: 4GB allocation prevents OOM errors
- **Test Reuse**: 150% more test runner reuse
- **Timeout**: 67% longer timeout for reliability
- **Scope Reduction**: 85% fewer files in fast mode

**Estimated Speed Improvement:**

- **Full Testing**: 20-30% faster
- **Fast Testing**: 70-80% faster
- **Memory Usage**: More stable, fewer crashes

#### Troubleshooting

**Common Issues:**

1. **Out of Memory Errors**:

   - Solution: Increased Node.js memory to 4GB
   - Monitor: Use `npm run test:mutation:js:debug` for detailed logs

2. **Timeout Errors**:

   - Solution: Increased timeout from 3s to 5s
   - Alternative: Use fast configuration for quicker feedback

3. **Test Runner Crashes**:
   - Solution: Increased test runner reuse and concurrency
   - Monitor: Check logs for specific error patterns

**Debug Commands:**

```bash
# Run with debug logging
npm run test:mutation:js:debug

# Run with trace-level file logging
stryker run --logLevel debug --fileLogLevel trace

# Run with specific configuration
stryker run stryker.fast.conf.js
```

### Best Practices

#### Development Workflow

1. **Daily Development**: Use `make mutation-js-fast` for quick feedback
2. **Pre-commit**: Use `make mutation-fast` for comprehensive testing
3. **CI/CD**: Use `make mutation-js` for full testing
4. **Debugging**: Use `make mutation-js-debug` for detailed analysis

#### Configuration Management

1. **Fast Mode**: Use for development and quick feedback
2. **Full Mode**: Use for CI/CD and comprehensive testing
3. **Analysis Mode**: Use for detailed HTML reports
4. **Debug Mode**: Use for troubleshooting issues

#### Performance Monitoring

1. **Memory Usage**: Monitor for OOM errors
2. **Execution Time**: Track performance improvements
3. **Mutation Scores**: Monitor quality metrics
4. **Test Coverage**: Ensure comprehensive testing

### Why Direct Commands?

We removed the Python wrapper scripts (`optimize_mutmut.py`, etc.) because:

1. **Simplicity**: Direct `mutmut run` is simpler than wrapper scripts
2. **Reliability**: Fewer moving parts = fewer things to break
3. **Transparency**: Direct output from mutmut is clearer
4. **Maintenance**: No need to maintain wrapper scripts

The `setup.cfg` file handles all the configuration, making wrapper scripts unnecessary.

### Integration with CI/CD

#### GitHub Actions

The optimized Stryker configuration integrates with existing CI/CD:

```yaml
# Fast testing for PRs
- name: Fast Mutation Testing
  run: make mutation-js-fast

# Full testing for main branch
- name: Full Mutation Testing
  run: make mutation-js
```

#### Quality Gates

- **Fast Mode**: No quality gates (development only)
- **Full Mode**: 80% mutation score target
- **Break Threshold**: 70% minimum score

### Future Improvements

#### Planned Optimizations

1. **Incremental Testing**: Implement incremental mutation testing
2. **Parallel Workers**: Optimize for multi-core systems
3. **Caching**: Implement test result caching
4. **Selective Mutation**: Focus on high-impact mutations

#### Monitoring and Metrics

1. **Performance Tracking**: Monitor execution times
2. **Quality Metrics**: Track mutation scores over time
3. **Resource Usage**: Monitor memory and CPU usage
4. **Error Rates**: Track and reduce test failures

### References

- [StrykerJS Documentation](https://stryker-mutator.io/docs/stryker-js/introduction/)
- [Performance Optimization Guide](https://stryker-mutator.io/docs/stryker-js/guides/performance)
- [Configuration Reference](https://stryker-mutator.io/docs/stryker-js/config-file/)
- [Troubleshooting Guide](https://stryker-mutator.io/docs/stryker-js/troubleshooting/)
- [Official mutmut documentation](https://mutmut.readthedocs.io/en/latest/)

### Mutation Testing Workflow

#### Development Workflow Integration

Mutation testing is now integrated into the standard development workflow:

1. **Pre-commit Hooks**: Critical files trigger mutation testing automatically

   - `extension/src/background-logic.ts` → JavaScript mutation testing
   - `server/config.py` → Python mutation testing

2. **CI/CD Pipeline**: Full mutation testing runs on all commits

   - JavaScript: Stryker mutation testing on all TypeScript files
   - Python: Optimized mutmut testing on critical modules

3. **Quality Gates**: Mutation testing is part of the main quality checks
   - `make all` includes fast mutation testing
   - `make check` includes fast mutation testing
   - Pre-commit hooks run targeted mutation testing

#### Mutation Testing Guidelines

**For Developers:**

1. **Before Committing**: Run `make check` to include mutation testing
2. **Critical Changes**: Run full mutation testing with `make mutation`
3. **New Features**: Ensure mutation score doesn't decrease
4. **Bug Fixes**: Add tests that kill the specific mutation

**Target Scores:**

- **JavaScript/TypeScript**: 80% (break threshold: 70%)
- **Python**: 80% (break threshold: 70%)

**Current Status:**

- **JavaScript**: 38.24% (BELOW THRESHOLD - needs improvement)
- **Python**: Baseline establishment in progress

#### Mutation Testing Commands

```bash
# Fast mutation testing (development workflow)
make mutation-fast

# Full mutation testing (CI/CD)
make mutation

# JavaScript mutation testing only
make mutation-js

# Python mutation testing only
make mutation-py

# Single module mutation testing
make mutation-py-single MODULE=server/config.py

# Quick mutation testing (fastest)
make mutation-py-quick
```

#### Interpreting Mutation Results

1. **Survived Mutations**: Tests didn't catch the mutation

   - Add more specific test cases
   - Improve test assertions
   - Add boundary condition tests

2. **Killed Mutations**: Tests successfully caught the mutation

   - Good test coverage for that code path
   - No action needed

3. **Timeout Mutations**: Tests took too long to run

   - Optimize test performance
   - Reduce test complexity

4. **Error Mutations**: Tests failed due to mutation
   - May indicate brittle tests
   - Review test design

## Build & Development Process

### TypeScript Development

```bash
# Build TypeScript files
npm run build:ts

# Watch mode for development
npm run build:ts -- --watch

# Bundle extension for distribution
npm run bundle:extension
```

### Python Development

```bash
# Install in development mode
uv pip install -e .

# Run server directly
python -m server

# Run CLI commands
videodownloader-server --help
```

### Chrome Extension Development

```bash
# Load extension in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked" and select the project directory
# 4. The extension will be available in the toolbar
```

## Configuration Management

### Server Configuration

The server configuration is stored in `config.json` and includes:

- `server_port`: The port the server listens on (default: <DEFAULT_PORT> (see server/constants.py))
- `download_dir`: Directory where downloaded videos are saved
- `debug_mode`: Boolean, whether to run the server in debug mode
- `enable_history`: Boolean, whether to save download history
- `log_level`: String, controls server log verbosity
- `console_log_level`: String, controls console output verbosity

### Configuration via CLI

```bash
# Show current configuration
videodownloader-server config show

# Set configuration values
videodownloader-server config set --port 5020 --download-dir ~/Downloads/videos

# Enhanced configuration commands
videodownloader-server utils config show --format json
videodownloader-server utils config set <key> <value>
```

## API Development

### Flask API Structure

- **server/api/**: Flask Blueprints for endpoints
- **server/schemas.py**: Pydantic schemas for validation
- **server/config.py**: Configuration management
- **server/utils.py**: Shared helper functions

### API Endpoints

- `POST /api/download`: Download videos using yt-dlp
- `POST /api/gallery-dl`: Download galleries using gallery-dl
- `GET /api/status`: Get download progress and status
- `GET /api/history`: Get download history
- `GET /api/config`: Get server configuration
- `POST /api/config`: Update server configuration
- `GET /api/logs`: Get server logs
- `GET /api/health`: Health check endpoint
- `POST /api/restart`: Restart server

### Adding New API Endpoints

1. Create a new blueprint in `server/api/`
2. Add Pydantic schemas in `server/schemas.py`
3. Add integration tests in `tests/integration/`
4. Update API documentation in `server/api/api.md`

## CLI Development

### CLI Structure

- **server/cli/**: Modular CLI commands
  - `serve.py`: Server lifecycle commands
  - `download.py`: Download management commands
  - `history.py`: History management commands
  - `status.py`: Status check commands
  - `utils.py`: Utility commands
  - `resume.py`: Resume commands
- **server/cli_helpers.py**: Shared helpers for CLI commands

### Adding New CLI Commands

1. Create a new command module in `server/cli/`
2. Register the command in `server/cli/__init__.py`
3. Add unit tests in `tests/unit/cli/`
4. Add integration tests in `tests/integration/`
5. Update documentation in `README.md`

## Extension Development

### Extension Structure

- **extension/src/**: TypeScript source files
  - `background.ts`: Service worker background script
  - `content.ts`: Content script for video detection
  - `popup.ts`: Popup UI functionality
  - `options.ts`: Settings page functionality
  - `history.ts`: History page functionality
  - `lib/utils.ts`: Shared utility functions
  - `types/`: TypeScript type definitions

### Adding New Extension Features

1. Add TypeScript code in `extension/src/`
2. Add unit tests in `tests/extension/`
3. Add E2E tests if UI-related
4. Update type definitions in `extension/src/types/`
5. Build with `npm run build:ts`

## Unified Ignore Patterns Management

This project uses a centralized approach to manage ignore patterns across all development tools.
This ensures consistency and reduces redundancy.

### Before: Redundant and Inconsistent Patterns

Previously, each tool had its own ignore file with redundant patterns:

#### .gitignore

```gitignore
# Python
__pycache__/
*.py[cod]
.venv/

# Node.js
node_modules/

# Build artifacts
build/
dist/

# System files
.DS_Store
```

#### .prettierignore

```gitignore
# Similar patterns, but different format
.git/
.venv/
venv/
node_modules/
build/
dist/
__pycache__/
.mypy_cache/
.pytest_cache/
.ruff_cache/
# ... many more patterns
```

#### jest.config.js

```javascript
testPathIgnorePatterns: [
  "/node_modules/",
  "/.git/",
  "/.venv/",
  "/venv/",
  "/build/",
  "/dist/",
  // ... same patterns repeated
],
```

#### .flake8

```ini
exclude =
    .git,
    .venv,
    venv,
    node_modules,
    build,
    dist,
    __pycache__,
    # ... same patterns repeated
```

### After: Single Source of Truth

#### config/ignore-patterns.json (Source of Truth)

```json
{
  "patterns": {
    "common": [
      ".git/",
      ".venv/",
      "venv/",
      "node_modules/",
      "build/",
      "dist/",
      "__pycache__/",
      ".mypy_cache/",
      ".pytest_cache/",
      ".ruff_cache/",
      "etc/",
      ".github/",
      ".husky/",
      "logs/",
      "coverage/",
      "htmlcov/",
      "*.egg-info/",
      ".eggs/",
      "server.lock",
      "mutants/",
      ".stryker-tmp/"
    ],
    "system_files": [".DS_Store", "Thumbs.db", "ehthumbs.db", "Desktop.ini"],
    "compiled_files": ["*.py[cod]", "*$py.class", "*.min.css", "*.css.map", "*.js.map", "*.d.ts"]
  },
  "tool_specific": {
    "git": {
      "patterns": ["common", "system_files", "logs_and_temp", "test_artifacts"]
    },
    "prettier": {
      "patterns": [
        "common",
        "system_files",
        "compiled_files",
        "logs_and_temp",
        "test_artifacts",
        "extension_specific"
      ]
    },
    "jest": {
      "patterns": ["common", "extension_specific"]
    },
    "flake8": {
      "patterns": ["common", "compiled_files"]
    }
  }
}
```

#### Generated Files (Automatically Created)

All ignore files are now generated from the central configuration:

```bash
# Generate all ignore files
python scripts/generate-ignore-files.py

# Or use the Makefile target
make generate-ignores
```

### Pattern Categories

The configuration organizes patterns into logical categories:

- **common**: Standard directories and files (node_modules, build, cache, etc.)
- **system_files**: OS-specific files (.DS_Store, Thumbs.db, etc.)
- **compiled_files**: Generated files (_.pyc,_.min.css, etc.)
- **logs_and_temp**: Temporary and log files
- **test_artifacts**: Test coverage and cache files
- **extension_specific**: Chrome extension build artifacts
- **config_files**: Tool configuration files

### Tool-Specific Patterns

Each tool uses a subset of patterns appropriate for its purpose:

- **Git**: Common + system + logs + test artifacts
- **Prettier**: All patterns except config files
- **ESLint**: Common + extension specific + config files
- **Stylelint**: Common + compiled CSS files
- **Jest**: Common + extension specific
- **Python tools**: Common + compiled Python files

This ensures each tool is optimized for its specific use case while maintaining consistency.

### Updating Ignore Patterns

**Never edit ignore files directly.** Instead:

1. **Edit the source**: Modify `config/ignore-patterns.json`
2. **Regenerate all files**: Run `python scripts/generate-ignore-files.py`
3. **Verify changes**: Run lint/format tools to ensure they work correctly
4. **Commit**: Include both the config change and generated files

### Example: Adding a New Pattern

#### Step 1: Edit the Source

```json
{
  "patterns": {
    "common": [
      ".git/",
      ".venv/",
      "venv/",
      "node_modules/",
      "build/",
      "dist/",
      "__pycache__/",
      ".mypy_cache/",
      ".pytest_cache/",
      ".ruff_cache/",
      "etc/",
      ".github/",
      ".husky/",
      "logs/",
      "coverage/",
      "htmlcov/",
      "*.egg-info/",
      ".eggs/",
      "server.lock",
      "mutants/",
      ".stryker-tmp/",
      "new-temp-dir/" // ← Add new pattern here
    ]
  }
}
```

#### Step 2: Regenerate All Files

```bash
make generate-ignores
```

#### Step 3: Verify Changes

The new pattern is automatically added to:

- `.gitignore`
- `.prettierignore`
- `.stylelintignore`
- `jest.config.js`
- `eslint.config.cjs`
- `.flake8`
- `pyproject.toml` (for all Python tools)

### Benefits

- **No Redundancy**: Each pattern is defined once in the source
- **Consistency**: All tools use the same base patterns
- **Tool-Specific**: Each tool gets only relevant patterns
- **Maintainable**: Single place to update ignore rules
- **Automated**: Script handles format conversion for each tool

### Troubleshooting

If ignore patterns aren't working as expected:

1. **Check the source**: Verify patterns exist in `config/ignore-patterns.json`
2. **Regenerate**: Run the generation script to update all files
3. **Tool-specific issues**: Some tools have different pattern syntax requirements
4. **Cache issues**: Clear tool caches (e.g., `npm run lint -- --cache-location .eslintcache`)

## Docstring Conversion to reStructuredText (PEP 287)

When converting docstrings to reStructuredText (reST) per PEP 287, follow these rules:

1. Always start with a concise, one-line summary ending with a period.
2. Separate summary and body with a blank line.
3. Use the following field directives:
   - `:param <name>: Description of the parameter.`
   - `:type <name>: Type of the parameter (optional if using type hints).`
   - `:returns: Description of the return value.`
   - `:rtype: Type of the return value (optional if using type hints).`
   - `:raises <ExceptionType>: Description of conditions that raise this exception.`
   - `:example:` Block for usage examples (indented code block).

### Function Example

```python
 def add(a: int, b: int) -> int:
     """
     Add two integers.

     :param a: First integer to add.
     :type a: int
     :param b: Second integer to add.
     :type b: int
     :returns: Sum of a and b.
     :rtype: int
     :raises ValueError: If a or b is negative.
     :example:

         >>> add(2, 3)
         5
     """
     if a < 0 or b < 0:
         raise ValueError("Arguments must be non-negative")
     return a + b
```

Apply the same structure when documenting classes and modules:

- For classes, document constructor parameters with `:param:` and relevant `:raises:`.
- For modules, provide a high-level overview and any usage examples.

### Class Example

```python
class MyClass:
    """
    A sample class demonstrating reST docstrings.

    :param name: The name of the object.
    :type name: str
    :raises ValueError: If name is empty.
    """
    def __init__(self, name: str):
        """
        Initialize the MyClass instance.

        :param name: The name for this instance.
        :type name: str
        """
        if not name:
            raise ValueError("name must be provided")
        self.name = name
```

### Module Example

```python
"""
Module for processing payments.

Provides utilities for handling transactions and recording them.

:example:

    from server.utils import process_transaction
    result = process_transaction(order_id=1234)
"""
```

## Rollout Schedule

Follow this folder-by-folder conversion order:

1. **server/config.py** and associated utilities (`_load_json_config`, `_collect_env_data`).
2. **server/schemas.py** (Pydantic models: `DownloadRequest`, `ConfigUpdate`, etc.).
3. **server/api/**: all blueprint modules (`config_bp.py`, `download_bp.py`, `history_bp.py`,
   `status_bp.py`, `debug_bp.py`, `logs_bp.py`, `logs_manage_bp.py`, `restart_bp.py`).
4. **server/cli_helpers.py**.
5. **server/cli/** subcommands (`serve.py`, `download.py`, `history.py`, `status.py`, `utils.py`,
   `resume.py`, `system_maintenance.py`).
6. **server/downloads/** (`ytdlp.py`, `gallery_dl.py`).
7. **server/history.py** and **server/utils.py**.
8. **extension/src/lib/utils.ts**.
9. **extension/src/content.ts**, **history.ts**, **options.ts**, **popup.ts**.
10. **extension/src/background-helpers.ts** and **background.ts**.
11. **extension/src/youtube_enhance.ts**.
12. **Tests**: update docstrings in Python tests and JSDoc in JS/TS tests to match the new
    guidelines.

## Common Pitfalls & Mitigations

- Incomplete Parameter Documentation

  - Pitfall: Missing or generic descriptions for parameters.
  - Mitigation: Ensure every `:param` directive includes name, description, and type; leverage type
    hints where available.

- Missing Return & Exception Directives

  - Pitfall: Forgetting `:returns:` or `:raises:` directives.
  - Mitigation: Always document return values and exceptions; include error-path tests to validate
    documentation.

- Overzealous Ignores

  - Pitfall: Suppressing lint errors globally or using ignores without justification.
  - Mitigation: Fix root causes of lint violations; use inline ignores sparingly with clear
    justification.

- Inconsistent Formatting

  - Pitfall: Varied quoting, indentation, or field directive formatting.
  - Mitigation: Use Prettier/Black auto-formatting; run `make lint` on docs; adhere to style
    guidelines.

- Automated Tool Limitations
  - Pitfall: AI or scripts editing docstrings may miss context or edge cases.
  - Mitigation: Manually review generated docstrings; write unit tests to verify docstring presence
    and structure; integrate docstring linting in CI.

Proceed to draft template examples and sample pull request in next steps.

## Sample Pull Request Example

**Title:** Refactor `server/config.py` docstrings to reStructuredText (PEP 287)

**Description:**

- Convert existing docstrings in `server/config.py` from bare or NumPy style to reST format.
- Apply `:param`, `:type`, `:returns`, and `:raises` directives per guidelines.
- Update unit tests to cover exception cases and verify docstring presence.

**Diff Example:**

````diff
--- a/server/config.py
++++ b/server/config.py
@@ -9,7 +9,15 @@ class Config:
-    """Load configuration from JSON file"""
++    """
++    Load configuration from JSON file.
++
++    :returns: A `Config` instance with merged default and environment settings.
++    :rtype: Config
++    :raises FileNotFoundError: If the configuration file is not found.
++    """
+```

*Ensure all lint checks, tests, and documentation updates are included before merging.*

## Test Maintenance & Evolution Process

### 1. Code Change = Test Change
**Rule**: Any change to public APIs, endpoints, or core logic must include corresponding test updates or additions in the same commit/PR.

**Checklist for PR authors**:
- [ ] Did I change or remove any function/class/method signature?
- [ ] Did I add, remove, or change any endpoint or CLI command?
- [ ] Did I change the expected output, error, or side effect of any function?
- [ ] If yes to any: update or add tests to match the new behavior.

### 2. Test Review is Code Review
**Rule**: Reviewers must check that all relevant tests are updated and that old, now-irrelevant tests are removed.

**Checklist for reviewers**:
- [ ] Do the tests reflect the new/changed behavior?
- [ ] Are any tests now obsolete or misleading? If so, are they removed?
- [ ] Are new edge cases or error conditions covered?
- [ ] Are tests not brittle (don't depend on implementation details)?

### 3. Fail Fast, Fix Fast
**Rule**: If a test fails after a code change, fix the test (if the code is correct) or fix the code (if the test is still valid). Never patch code just to appease a deprecated test.

**Process for handling test failures**:

1. **Investigate the failure**:
   - Check CI logs for specific error messages
   - Run tests locally to reproduce the failure
   - Identify whether the test or the code is at fault

2. **If the test is outdated**:
   - Update the test to match the new behavior
   - Remove the test if the functionality is deprecated
   - Document the change in the commit message

3. **If the code is wrong**:
   - Fix the code to match the expected behavior
   - Ensure the fix doesn't break other functionality
   - Add additional tests if needed

4. **CI Integration**:
   - Fast tests run on every PR and push
   - Slow tests run on merge to main
   - Test failures block merging
   - Coverage thresholds must be maintained

**Commands for local testing**:
```bash
# Fast tests (unit tests only)
make test-fast

# All tests including integration and E2E
make test

# Python tests only
make test-py

# JavaScript tests only
make test-js

# Run specific test file
pytest tests/unit/test_specific.py -v
npm test -- --testPathPattern="specific.test.ts"
```

### 4. Test Documentation

**Rule**: Every test should have a clear docstring explaining what it tests and why.

**Checklist**:

- [ ] Does each test have a Sphinx-style docstring (Python) or JSDoc comment (JS/TS)?
- [ ] Is the intent of the test clear to future maintainers?
- [ ] Are complex test scenarios documented with block comments?

### 5. Deprecation and Removal

**Rule**: When code is removed or deprecated, remove or update the corresponding tests in the same PR.

**Process for handling deprecated code and tests**:

1. **When deprecating code**:

   - Mark the function/class with `@deprecated` decorator or add deprecation warnings
   - Update tests to expect deprecation warnings
   - Add `pytest.mark.filterwarnings` to suppress deprecation warnings in tests
   - Document the deprecation timeline and migration path

2. **When removing deprecated code**:

   - Remove all tests for the deprecated functionality in the same PR
   - Update any remaining code that depends on the removed functionality
   - Ensure no references to removed code remain in the codebase

3. **Test deprecation patterns**:

   ```python
   # Python: Test deprecated function
   import pytest
   import warnings

   @pytest.mark.filterwarnings("ignore::DeprecationWarning")
   def test_deprecated_function():
       """Test deprecated function still works but warns."""
       with pytest.warns(DeprecationWarning, match="will be removed"):
           result = deprecated_function()
       assert result == expected_value
   ```

   ```javascript
   // JavaScript: Test deprecated function
   it("should warn when using deprecated function", () => {
     const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
     const result = deprecatedFunction();
     expect(consoleSpy).toHaveBeenCalledWith(
       expect.stringContaining("deprecated")
     );
     expect(result).toBe(expectedValue);
     consoleSpy.mockRestore();
   });
   ```

**Checklist**:

- [ ] Did I remove a feature or endpoint? Remove its tests.
- [ ] Did I deprecate a function? Mark its tests as expected to fail or remove them.
- [ ] Are deprecation warnings properly tested?
- [ ] Is the migration path documented?
- [ ] Are all references to deprecated code removed?

### 6. CI Enforcement

**Rule**: All tests must pass in CI before merging. Coverage thresholds must be maintained.

**Checklist**:

- [ ] Did the PR pass all tests in CI?
- [ ] Is coverage above the required threshold (80% for new code)?
- [ ] Are mutation testing scores maintained?

### 7. Regular Test Audits

**Rule**: Schedule periodic audits (monthly/quarterly) to review for:

- Stale or redundant tests
- Gaps in coverage
- Tests that encode outdated assumptions

**Audit Process**:

1. **Coverage Analysis**:

   - Review coverage reports for uncovered code paths
   - Identify critical functions with low coverage
   - Check for dead code that should be removed
   - Tools: `pytest --cov`, `npm run test -- --coverage`

2. **Test Quality Assessment**:

   - Run mutation testing to identify weak tests
   - Review tests with low mutation scores
   - Check for tests that don't actually test anything
   - Tools: `stryker run`, `mutmut run`

3. **Deprecation Cleanup**:

   - Identify tests for deprecated or removed functionality
   - Remove obsolete test files and fixtures
   - Update tests that reference removed imports
   - Search for TODO/FIXME comments in tests

4. **Performance Review**:

   - Identify slow tests that could be optimized
   - Check for tests that create unnecessary resources
   - Review test data setup and teardown efficiency
   - Tools: `pytest --durations=10`, `npm test -- --verbose`

5. **Documentation Audit**:
   - Ensure all tests have proper docstrings
   - Check that test descriptions are accurate
   - Verify README examples match current behavior
   - Update test documentation as needed

**Automated Audit Script**:

```bash
# Run comprehensive test audit
make test-audit

# Individual audit components
make audit-coverage    # Coverage analysis
make audit-mutation    # Mutation testing
make audit-performance # Performance review
make audit-docs        # Documentation check
```

**Audit Checklist**:

- [ ] Coverage is above 80% for all critical modules
- [ ] No tests are testing deprecated functionality
- [ ] All tests have proper docstrings
- [ ] Slow tests (>1s) are identified and optimized
- [ ] Mutation testing scores are maintained
- [ ] Test data is properly cleaned up
- [ ] No TODO/FIXME comments remain in tests
- [ ] README examples are current and working

**Audit Report Template**:

```markdown
# Test Audit Report - [Date]

## Coverage Summary

- Overall coverage: X%
- Critical modules: [list with coverage %]
- Uncovered code paths: [list]

## Test Quality

- Mutation testing score: X%
- Tests needing improvement: [list]
- Slow tests identified: [list]

## Cleanup Required

- Deprecated tests to remove: [list]
- Documentation updates needed: [list]
- Performance optimizations: [list]

## Action Items

- [ ] Task 1 with assignee and deadline
- [ ] Task 2 with assignee and deadline
```

## Current Priorities

### Critical (Week 1-2)
1. **Test Quality Crisis Resolution**: Improve JS/TS mutation scores from 38.24% to 80%
2. **Python Mutation Testing Baseline**: Establish baseline and improvement plan
3. **Server Test Coverage**: Continue improving remaining modules to 80%

### High Priority (Week 2-4)
1. **TypeScript Migration**: Complete conversion of remaining extension modules
2. **Docstring Standardization**: Convert all Python docstrings to reStructuredText format
3. **Test Pattern Documentation**: Create comprehensive test pattern documentation

### Medium Priority (Week 3-6)
1. **Coverage Expansion**: Add tests for critical edge cases and error conditions
2. **Integration Test Enhancement**: Improve complex workflow testing
3. **Performance Optimization**: Optimize slow tests and improve CI pipeline efficiency

## Troubleshooting

### Common Issues

#### Test Failures
```bash
# Clear test caches
pytest --cache-clear
npm test -- --clearCache

# Run tests with verbose output
pytest -v
npm test -- --verbose
```

#### Linting Issues
```bash
# Auto-fix linting issues
make lint:fix

# Check specific files
ruff check server/specific_file.py
npm run lint -- extension/src/specific_file.ts
```

#### Build Issues
```bash
# Clean build artifacts
make clean

# Rebuild TypeScript
npm run build:ts

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
npm install --force
```

#### Coverage Issues
```bash
# Regenerate coverage reports
make coverage

# Check specific coverage
pytest --cov=server.specific_module
npm run test:extension:coverage -- --coverageReporters=text
```

### Performance Issues

#### Slow Tests
```bash
# Identify slow tests
pytest --durations=10
npm test -- --verbose --testTimeout=5000

# Run only fast tests
make test-fast
```

#### Memory Issues
```bash
# Monitor memory usage
python -m memory_profiler script.py
node --max-old-space-size=4096 npm test
```

## Contributing Guidelines

### Code Style
- **Never use emojis**: Do not use emojis in any project documentation, code, comments, commit messages, or PR descriptions. Use clear, descriptive language instead.
- Follow PEP 8 for Python code
- Use TypeScript for all new JavaScript code
- Follow ESLint and Prettier configurations
- Use Sphinx-style docstrings for Python
- Use JSDoc comments for JavaScript/TypeScript

### Commit Messages
- Use present-tense, imperative mood
- Reference issue IDs when applicable
- Follow conventional commit format: `type(scope): description`

### Pull Request Process
1. Create a feature branch from `main`
2. Make changes with appropriate tests
3. Ensure all quality checks pass
4. Update documentation as needed
5. Submit PR with clear description
6. Address review feedback
7. Merge only after approval and CI passing

### Testing Requirements
- All new code must have corresponding tests
- Maintain 80% coverage threshold
- Ensure mutation testing scores are maintained
- Include integration tests for API changes
- Include E2E tests for UI changes

---

_Last updated: 2025-01-27_
````

## Maintenance Scripts

### Development Setup

- `scripts/setup_uv.py` - Migrate from requirements.txt to uv package manager
  - Creates virtual environment with uv
  - Installs project and development dependencies
  - Sets up Node.js dependencies and TypeScript build
- `scripts/setup_dev.py` - Initialize development environment
  - Creates necessary directories and files
  - Sets up initial configuration
  - Prepares test environment

### Code Quality & Testing

- `scripts/check_compliance.py` - Run comprehensive code quality checks
  - Validates linting, formatting, and test compliance
  - Generates compliance reports
- `scripts/generate_inventory_report.py` - Generate comprehensive project inventory
  - Analyzes ignore patterns and docstrings
  - Creates detailed project structure reports
- `scripts/audit_test_redundancy.py` - Audit test suite for redundant files
  - Identifies duplicate test patterns
  - Suggests consolidation opportunities
- `scripts/test_mutation_simple.py` - Simple mutation testing framework
  - Provides basic mutation testing capabilities
  - Helps identify weak test coverage

### Coverage & Metrics

- `scripts/update_coverage_stats.py` - Update coverage statistics in TODO.md and tests/testing.md
  - Runs tests and generates coverage reports
  - Updates coverage percentages with optional weighting
  - Enforces minimum coverage thresholds
  - Updates both TODO.md and Test Responsibility Matrix
  - Consolidates all coverage reporting functionality

### Junk Folder Management

- `scripts/prevent_junk_folders.py` - Comprehensive junk folder prevention and cleanup
  - Monitors filesystem for new junk folders in real-time
  - Automatically cleans up detected junk folders
  - Provides continuous monitoring capabilities
  - Respects .gitignore patterns and excludes third-party directories
  - Handles nested empty directories recursively
  - Replaces all previous junk folder management scripts

### Emoji Management

- `scripts/check_emojis.py` - Check for emojis in markdown files
  - Scans all markdown files for emoji usage
  - Reports emoji locations for removal
- `scripts/remove_all_emojis.py` - Remove emojis from all project files
  - Batch removes emojis from all markdown files
  - Updates project documentation consistently

### Build & Automation

- `scripts/build-ts.sh` - Build TypeScript files with esbuild
  - Compiles TypeScript to JavaScript
  - Bundles extension files for distribution
  - Copies static HTML and CSS files
- `scripts/run_checks.sh` - Run comprehensive quality checks
  - Executes Python tests, JavaScript tests, and linting
  - Updates coverage stats and enforces thresholds
  - Provides one-command quality validation

### Configuration Management

- `scripts/generate-ignore-files.py` - Generate ignore files from central configuration
  - Creates .gitignore, .prettierignore, and other ignore files
  - Ensures consistency across all development tools
  - Maintains single source of truth for ignore patterns

## Documentation

### Core Documentation

- **[README.md](README.md)** - User-facing documentation and quickstart guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture, tech stack, and design decisions
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes
- **[TODO.md](TODO.md)** - Active development tasks and roadmap

### API Documentation

- **[server/api/api.md](server/api/api.md)** - Complete API reference with endpoints,
  request/response examples, and error handling

### Extension Documentation

- **[extension/src/extension-overview.md](extension/src/extension-overview.md)** - TypeScript
  refactoring overview, build process, and testing setup

### Testing Documentation

- **[tests/testing.md](tests/testing.md)** - Comprehensive testing guide, coverage metrics, mutation
  testing, and improvement roadmap

### Audit Reports

- **[reports/test_audit_summary.md](reports/test_audit_summary.md)** - Test suite audit results and
  cleanup summary
- **[reports/css_audit_summary.md](reports/css_audit_summary.md)** - CSS audit and optimization
  results
- **[reports/hardcoded_variables_summary.md](reports/hardcoded_variables_summary.md)** - Hardcoded
  variables audit summary
- **[reports/playwright_quality_audit_report.md](reports/playwright_quality_audit_report.md)** -
  Playwright E2E testing quality audit

  Note: The legacy modules audit report has been retired. Key actions and outcomes are tracked in
  `CHANGELOG.md` and `TODO.md`.
- **[reports/test_docstring_audit_report.md](reports/test_docstring_audit_report.md)** - Test
  documentation audit results
- **[reports/type_ignore_audit_report.md](reports/type_ignore_audit_report.md)** - Type ignore usage
  audit and cleanup

### CI/CD Documentation

- **[ci/.github/copilot-instructions.md](ci/.github/copilot-instructions.md)** - GitHub Copilot
  instructions and coding standards
- **[rules.instructions.md](ci/.github/instructions/rules.instructions.md)** - AI agent
  collaboration rules and workflow guidelines
