# Architecture

## Overview

Enhanced Video Downloader is a two-part system:

- Chrome Extension (Manifest V3): Injects a draggable DOWNLOAD button on video pages and provides
  popup/options UIs for manual controls, history, and settings.
- Local Server & CLI (Flask + yt-dlp): A Flask API that handles download requests, status, history,
  and configuration, plus a Click-based CLI (`videodownloader-server`) for managing the server
  lifecycle, downloads, and maintenance tasks.

These components communicate over HTTP (localhost) and via Chrome messaging APIs.

## Tech Stack

- **Python 3.x**: Flask, Click (CLI), Pydantic (validation), yt-dlp (download engine), gallery-dl
  (image galleries)
- **JavaScript / TypeScript**:
  - Chrome Extension APIs (runtime, storage, notifications, tabs)
  - TypeScript for type-safe extension code
  - ES Modules (built via esbuild)
  - Testing: Jest (unit), Playwright (E2E)
- **Tooling**:
  - ESLint / Prettier (JS/TS linting/formatting)
  - Ruff / Black / isort (Python linting/formatting) - Ruff is now the primary Python linter
  - Babel (coverage instrumentation)
  - Docker (optional containerization)
  - Stryker (JS/TS mutation testing)
  - Mutmut (Python mutation testing)

## Configuration & Constants

- Ports are centralized in `server/constants.py` and mirrored in `extension/src/core/constants.ts`.
  Use provided accessors (e.g., `get_server_port`, `get_port_range`) rather than literals.
- The extension defines `NETWORK_CONSTANTS` for base URL, timeouts, and endpoints. Code should build
  URLs using `SERVER_BASE_URL` plus the port and endpoint constants to avoid scattering string
  literals.
- Server bind addresses and CLI defaults are intentionally loopback-only for local operation. Any
  environment-specific overrides should be surfaced via configuration, not hardcoded.

## Code Quality Standards

### Type Safety

The project maintains excellent type safety with comprehensive static analysis:

- **Pyright Configuration**: Python 3.13 compatibility with modern union syntax support
- **Type Coverage**: 0 pyright errors, 143 warnings (down from 368 total issues)
- **Type Ignore Management**: 32 instances, all legitimate and well-documented
- **Type Stubs**: Automatic handling of third-party library limitations

**Type Ignore Categories**:

- **Third-party libraries** (yt-dlp, browser_cookie3, gunicorn): 15 instances
- **Test-specific mocking**: 17 instances for legitimate test scenarios
- **Dynamic system access**: Process management and Click command access

### Documentation Standards

The project enforces comprehensive documentation standards:

- **Test Docstring Coverage**: 100% across all test categories
- **Format Standards**:
  - Python: Sphinx/REST style with `:param:`, `:returns:` directives
  - TypeScript: JSDoc format with parameter and return documentation
- **Quality Requirements**:
  - One-line summary starting with imperative verb
  - Complete parameter documentation with types
  - Return value documentation
  - No emojis in documentation (project rule)

**Documentation Compliance**:

- **Unit Tests**: All 15+ files have proper Sphinx-style docstrings
- **Integration Tests**: All 8 files have comprehensive docstrings
- **Extension Tests**: All TypeScript test files have standardized JSDoc format
- **New Files**: All new test files maintain excellent docstring coverage

### Quality Assurance

- **Linting**: 100% compliance with ESLint (JS/TS) and Ruff (Python)
- **Formatting**: Automated with Prettier and Black
- **Testing**: Comprehensive unit, integration, and E2E test coverage
- **Mutation Testing**: Stryker for JS/TS (98.85% score), Mutmut for Python
- **Coverage**: Target 80% coverage across all modules

## Current Project Status

### Test Quality Metrics

- **Overall Test Coverage**: 67% (target: 80%)
- **Python Server Coverage**: 67% (target: 80%)
- **Frontend Extension Coverage**: 76.68% (target: 80%)
- **JS/TS Mutation Score**: 98.85% (target: 80%, minimum: 70%)
- **Python Mutation Testing**: Baseline establishment in progress
- **Code Quality**: 100% lint compliance
- **Documentation**: Complete Sphinx-style docstrings across all modules

### Mutation Testing Analysis

Recent Stryker mutation testing on `extension/src/background-logic.ts` achieved a **mutation score
of 98.85%** (57 killed, 29 timeout, 0 survived out of 87 total mutants). This represents an
exceptional improvement from the initial 88.51% score through comprehensive test quality
enhancements and coverage improvements. quality insights:

- **Mutation Score**: 88.51% (73 killed, 4 timeout, 10 survived out of 87 mutants)
- **Key Findings**:
  - Error message validation gaps (4 string literal mutations survived)
  - Timeout handling test weaknesses (3 arrow function mutations survived)
  - Edge case coverage deficiencies (1 equality operator mutation survived)
  - Exception handling test gaps (1 block statement mutation survived)
  - Null/undefined scenario testing gaps (1 conditional expression mutation survived)

**Recommendations**:

- Add stronger assertions for error message content validation
- Improve timeout testing with proper promise rejection validation
- Add boundary condition tests for edge cases
- Enhance exception handling test coverage
- Add null/undefined input scenario testing

### Recent Major Achievements

- **Documentation Standardization**: Completed standardization of documentation file naming
  convention
- **Server Test Coverage Milestone**: Comprehensive improvements across all server modules
- **Property-Based Testing**: Implemented 28 property-based tests using Hypothesis
- **Test Suite Consolidation**: Refactored repetitive test patterns using parameterized testing
- **CLI Modularization**: Restructured server CLI into modular components
- **CSS Consolidation**: Completed comprehensive CSS audit and cleanup with 15-20% size reduction

## Folder Structure

```text
Enhanced Video Downloader/
├── extension/                    # Chrome extension source
│   ├── dist/                    # Bundled JS (build output)
│   ├── icons/                   # Extension icons
│   ├── src/                     # TypeScript source files
│   │   ├── lib/                # Shared utility functions
│   │   ├── types/              # TypeScript type definitions
│   │   ├── __tests__/          # Extension test files
│   │   ├── background.ts       # Service worker background script
│   │   ├── background-helpers.ts # Helper functions for background
│   │   ├── background-logic.ts # Core message handling logic (testable)
│   │   ├── content.ts          # Content script for video detection
│   │   ├── history.ts          # History page functionality
│   │   ├── options.ts          # Settings page functionality
│   │   ├── popup.ts            # Popup UI functionality
│   │   └── youtube_enhance.ts  # YouTube specific enhancements
│   └── ui/                      # HTML/CSS for popup & options
├── server/                       # Python Flask server & CLI
│   ├── __main__.py              # Flask entrypoint
│   ├── video_downloader_server.py  # Deprecated legacy entrypoint (raises ImportError)
│   ├── api/                     # Flask Blueprints for endpoints
│   ├── cli.py                   # Click group entrypoint (legacy)
│   ├── cli/                     # Modular CLI commands
│   │   ├── __init__.py          # Main CLI entry point
│   │   ├── serve.py             # Server lifecycle commands (start, stop, restart)
│   │   ├── download.py          # Download management commands (url, resume, cancel)
│   │   ├── history.py           # History management commands (list, clear)
│   │   ├── status.py            # Status check commands (server, downloads)
│   │   ├── utils.py             # Utility commands (config, logs, cleanup)
│   │   └── resume.py            # Resume commands (incomplete, failed)
│   ├── cli_commands/            # Legacy CLI subcommands (compat imports only)
│   │   └── system_maintenance.py  # System maintenance commands (legacy path retained)
│   ├── cli_helpers.py           # Shared helpers for CLI commands
│   ├── cli_resume_helpers.py    # Resume-specific CLI helpers
│   ├── downloads/               # yt-dlp wrapper logic
│   ├── history.py               # History persistence
│   ├── config.py                # Load/save config.json
│   ├── schemas.py               # Pydantic schemas for validation
│   ├── utils.py                 # Shared helpers
│   ├── lock.py                  # Lock file management
│   ├── logging_setup.py         # Logging configuration
│   ├── extraction_rules.py      # Extraction rules loader
│   ├── disable_launchagents.py  # Launch agent management
│   ├── data/                    # Persistent data files
│   │   ├── history.json         # Download history
│   │   └── server.lock          # Server lock file
│   └── config/                  # Configuration files
│       └── extraction_rules.json # Gallery extraction rules
├── tests/                        # Test files
│   ├── extension/               # Extension unit tests (Jest)
│   ├── integration/             # Integration tests
│   ├── unit/                    # Server unit tests
│   └── jest/                    # Jest configuration
├── scripts/                      # Build and utility scripts
│   ├── build-ts.sh              # TypeScript build script
│   ├── parse_coverage.py        # Coverage parsing script
│   ├── update_coverage_stats.py # Coverage statistics updater
│   ├── generate-ignore-files.py # Generate ignore files from config
│   ├── check_compliance.py      # Compliance checking script
│   ├── generate_inventory_report.py # Inventory report generation
│   ├── run_checks.sh            # Run quality checks
│   ├── setup_dev.py             # Development environment setup
│   └── test_mutation_simple.py  # Simple mutation testing
├── mutants/                      # Mutation testing output (generated)
├── coverage/                     # Coverage reports (generated)
├── htmlcov/                      # HTML coverage reports (generated)
├── reports/                      # Test reports (generated)
│   └── mutation/                 # Mutation testing reports
├── config/                       # Root configuration
├── bin/                          # Executable scripts
├── ci/                           # CI/CD configuration
├── logs/                         # Application logs
├── ARCHITECTURE.md               # This file - system architecture documentation
├── CHANGELOG.md                  # Release notes
├── DEVELOPER.md                  # Developer guide
├── README.md                     # User-facing documentation
├── TODO.md                       # Task tracking and project management
├── requirements.txt              # Python dependencies
├── package.json                  # Node.js dependencies and scripts
├── pyproject.toml               # Python project configuration
├── setup.cfg                    # Python tool configuration
├── eslint.config.cjs            # ESLint configuration
├── jest.config.js               # Jest configuration
├── stryker.conf.js              # Stryker mutation testing config
├── tsconfig.json                # TypeScript configuration
├── Makefile                     # Build and test automation
├── manifest.json                # Extension manifest
├── rules.json                   # Project rules
├── .flake8                      # Flake8 configuration
├── .prettierrc                  # Prettier configuration
├── .stylelintrc.json            # Stylelint configuration
└── .stylelintignore             # Stylelint ignore patterns
```

## Documentation

The project maintains comprehensive documentation across multiple files:

### Core Documentation (Root Level)

- **README.md** (13KB, 369 lines): User-facing documentation with installation, usage, configuration
  examples, and CLI command reference
- **ARCHITECTURE.md** (15KB, 239 lines): This file - system architecture, tech stack, data flow, and
  deployment documentation
- **DEVELOPER.md** (18KB, 645 lines): Developer guide with coding standards, testing practices,
  workflow procedures, and unified ignore patterns management
- **CHANGELOG.md** (79KB, 948 lines): Comprehensive release notes and version history with detailed
  feature additions and fixes
- **TODO.md** (11KB, 181 lines): Active task tracking and project management with priority levels
  and completion status

### API & Technical Documentation

- **server/api/api.md** (9.4KB, 551 lines): Complete REST API reference with endpoint
  specifications, request/response examples, and error handling for all server endpoints
- **tests/testing.md** (41KB, 669 lines): Comprehensive testing documentation including:
  - Test setup and configuration
  - Coverage metrics and quality indicators
  - Test responsibility matrix
  - Mutation testing status (Python: Mutmut, JS/TS: Stryker)
  - Test classification and quality indicators
  - Improvement roadmap
- **extension/src/extension-overview.md** (2.9KB, 84 lines): Chrome extension architecture and
  functionality overview, TypeScript refactoring status, and build process documentation

## Key Modules & Responsibilities

- **extension/src/background.ts**: Discovers server port (<PORT_RANGE_START>–<PORT_RANGE_END>) with
  efficient scanning, per-port timeouts, caching, an orange badge indicator during scanning, network
  connectivity monitoring with notifications, automatic server port rediscovery on network
  reconnects, and persistent download queue across sessions; proxies API requests (download, status,
  gallery, history) and controls (pause, resume, cancel); handles Chrome runtime messages and
  updates icons and notifications.
- **extension/src/background-logic.ts**: Contains core message handling logic extracted from
  `background.ts`, decoupled from Chrome APIs for unit testing and improved maintainability.
- **extension/src/background-helpers.ts**: Helper functions for background script operations.
- **extension/src/content.ts**: Discovers video elements, injects buttons, handles drag/click and
  state persistence.
- **extension/src/popup.ts & options.ts**: Provide user interfaces for on-demand downloads,
  settings, and log display, including dynamic download queue management with pause, resume, cancel,
  drag-and-drop reordering, collapsible Active/Queued sections, and semantic error details via
  `<details>` elements with contextual help links, and an Error History view listing past download
  errors.
- **extension/src/history.ts**: Manages download history storage and display.
- **extension/src/lib/utils.ts**: Shared utility functions for debouncing, logging, etc.
- **extension/src/types/**: TypeScript interfaces for messages, history entries, and configuration.
- **server/cli.py**: Legacy monolithic Click command group with all CLI functions.
- **server/cli/**: Modularized CLI commands:
  - `__init__.py`: Registers all subcommands via Click group.
  - **serve.py**: Server lifecycle commands (`start`, `stop`, `restart`).
  - **download.py**: Download management (`url`, `resume`, `cancel`).
  - **history.py**: History management (`list`, `clear`).
  - **status.py**: Status check commands (`server`, `downloads`).
  - **utils.py**: Utility commands (`config show/set`, `logs view/clear`, `cleanup`).
  - **resume.py**: Resume commands (`incomplete`, `failed`).
  - **system_maintenance.py**: System maintenance commands (`--resume-incomplete`,
    `--resume-failed`, `--clear-history`, `--clear-cache`).
- **server/api/**: Implements REST endpoints:
  - `POST /api/download`
  - `GET /api/status` and `/api/status/{id}` (returns combined progress, full history snapshots,
    error details, and troubleshooting suggestions)
  - `DELETE /api/status` and `DELETE /api/status/{download_id}` (thread-safe status clearing with
    optional `status` and `age` filters)
  - `GET/POST /api/history`
  - `GET/POST /api/config`
  - `GET /api/logs`
  - `POST /api/download/{download_id}/cancel`
  - `POST /api/download/{download_id}/pause`
  - `POST /api/download/{download_id}/resume`
  - `POST /api/download/{download_id}/priority`
  - `POST /api/gallery-dl` (gallery downloads)
  - `POST /api/resume` (bulk resume)
  - `GET /api/debug/paths` (debugging)
  - `POST /api/logs/clear` (log management)
  - `POST /api/restart` (server restart)
  - `GET /api/health` (health check)

### Frontend centralized services

The extension codebase uses centralized, shared services to reduce duplication and improve
maintainability:

- Centralized state: `extension/src/core/state-manager.ts` — single source of truth with
  event-driven updates
- Centralized validation: `extension/src/core/validation-service.ts` — declarative validators by
  field type
- Centralized DOM operations: `extension/src/core/dom-manager.ts` — cached queries and named
  selectors
- Centralized error handling: `extension/src/core/error-handler.ts` — uniform async/sync handling
- Centralized logging: `extension/src/core/logger.ts` — context-aware log levels

Adoption status:

- Background and content scripts are fully integrated with the centralized services.
- Popup and options scripts are largely migrated, but a few items remain and are tracked in
  `TODO.md`:
  - Replace `validatePort()` in `extension/src/options.ts` with `validationService`
  - Adopt `domManager` for remaining direct DOM queries in `popup.ts` and `options.ts`
  - Replace remaining `console.*` calls with the centralized `logger`

## CSS design system

- Modular styles under `extension/ui/`:
  - `variables.css`: tokens for colors, spacing, typography, shadows, z-index
  - `base.css`: resets/base rules and small utilities (visibility/contrast helpers)
  - `components.css`: reusable UI components (buttons, inputs, status tags)
  - `themes.css`: light/dark theme surfaces layered on tokens
- Guidelines:
  - Prefer `var(--*)` variables; avoid hardcoded hex/spacing in components
  - Keep `@keyframes` defined once (in `components.css`)
  - Scrollbar styling defined once; do not duplicate across files
  - Use `btn btn--primary` and other component classes; legacy `styles.css` is removed

## Data Flow

1. **User Action**: Click or drag the DOWNLOAD button in page context (`content.ts`).
2. **Message Passing**: `content.ts` or `popup.ts` → `background.ts` via
   `chrome.runtime.sendMessage`.
3. **API Request**: `background.ts` → Flask server (`fetch http://127.0.0.1:<port>/…`).
4. **Server Processing**: Flask endpoint validates input, invokes `yt-dlp` or `gallery-dl`, returns
   JSON status or logs.
5. **Response**: `background.ts` sends results back to UI (popup or content), updates storage and
   notifications.
6. **History**: `server/history.py` persists entries to `server/data/history.json` and serves via
   `/api/history`.
7. **Advanced History**: After download completion (`_progress_finished`), the server reads yt-dlp's
   `.info.json` file (enabled via `writeinfojson`) and appends rich metadata to
   `server/data/history.json` for detailed history.
8. **Extraction Rules**: `server/extraction_rules.py` loads rules from
   `server/config/extraction_rules.json`.
9. **Lock File**: `server/lock.py` manages lock file at `server/data/server.lock`.
   - Supplementary metadata (`server/data/server.lock.json`) persists last run parameters (host, port, gunicorn, daemon/foreground, workers, verbose) so `videodownloader-server restart` can reuse prior mode/flags when not explicitly provided.
10. **Client Polling**: Popup or background polls `/api/status` for progress updates.
11. **Cleanup**: Periodic `.part` file cleanup via background thread.

## Testing Infrastructure

### Test Quality Metrics

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

## External Dependencies

- **Python**: `Flask`, `Flask-Cors`, `yt-dlp`, `gallery-dl`, `click`, `pydantic`, `gunicorn`,
  `psutil`
- **JS/TS**: `typescript`, `esbuild`, `jest`, `ts-jest`, `@types/chrome`, `@types/jest`,
  `babel-plugin-istanbul`, `eslint`, `prettier`, `@stryker-mutator/*`
- **Chrome APIs**: `chrome.runtime`, `chrome.storage`, `chrome.notifications`, `chrome.tabs`

## Build & Development Tools

### Python Tooling

- **Ruff**: Primary Python linter (replacing flake8)
- **Black**: Code formatting (120-character line length)
- **isort**: Import sorting
- **mypy**: Type checking
- **pytest**: Testing framework
- **mutmut**: Mutation testing
- **Vulture**: Dead-code detection (run over `server` and `tests`)

### JavaScript/TypeScript Tooling

- **ESLint**: Linting with TypeScript support
- **Prettier**: Code formatting
- **Stylelint**: CSS linting
- **Jest**: Testing framework
- **Playwright**: E2E testing
- **Stryker**: Mutation testing
- **esbuild**: TypeScript compilation and bundling
- **ts-prune**: Detect unused TS exports (configured via root `tsconfig.json` which includes tests)

### Build Automation

- **Makefile**: Comprehensive build and test automation
- **npm scripts**: JavaScript/TypeScript build and test commands
- **CI/CD**: GitHub Actions with matrix testing across Chrome channels

## Deployment & Topology

- **Local Extension**: Loaded in Chrome (Developer Mode or packaged).
- **Local Server**: Runs on localhost, auto-scan ports <PORT_RANGE_START>–<PORT_RANGE_END>.
- **CLI**: Installed via `pip install -e .`, exposes `videodownloader-server` commands.
- **Build Process**:
  - TypeScript compilation using esbuild (`npm run build:ts`)
  - Jest testing (`npm run test:extension:ts`)
  - Coverage reporting (`npm run test:extension:coverage`)
  - Mutation testing (`npm run test:mutation:js`, `npm run test:mutation:py`)
- **CI/CD**: GitHub Actions instrument extension, runs Jest & Playwright tests, merges coverage with
  `update_coverage_stats.py`

## CI/CD: E2E Matrix Testing

- The E2E Coverage job uses a **matrix** strategy to install and test the Chrome extension under
  multiple Chrome channels: `stable`, `beta`, and `unstable`, leveraging Playwright for automated
  validation of Manifest V3 compliance across releases.

## Test Audit Infrastructure

- **Living Documentation**: `tests/testing.md` provides a comprehensive overview of test
  responsibilities, coverage metrics, and quality indicators across the codebase.
- **Coverage Reporting**: `scripts/parse_coverage.py` automatically updates the Test Responsibility
  Matrix table with current coverage data, ensuring accurate tracking of test coverage across all
  modules.
- **Quality Metrics**: The audit system tracks mutation scores, test classification, and maintenance
  schedules to ensure robust test quality.
- **Mutation Testing**: Stryker for JS/TS and Mutmut for Python provide mutation testing to detect
  weak tests.

## Linting & Code Quality

- **Python**: Ruff is now the primary linter (replacing flake8), configured with 120-character line
  length, Black formatting, and isort import sorting.
- **JavaScript/TypeScript**: ESLint with TypeScript support, Prettier formatting, and Stylelint for
  CSS.
- **Pre-commit**: Husky and lint-staged enforce code quality on commit.
- **Coverage Targets**: 80% coverage for both Python and frontend code.

## CI Chrome Dependencies

- **Chrome**: CI installs Google Chrome versions via apt (`google-chrome-stable`,
  `google-chrome-beta`, `google-chrome-unstable`) to support matrix testing.

## Current Development Priorities

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

---

## Documentation Files

### Core Documentation

- **[README.md](README.md)** - User-facing documentation and quickstart guide
- **[DEVELOPER.md](DEVELOPER.md)** - Development setup, coding standards, and testing guidelines
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

- Consolidated: Playwright E2E audit details now live in `tests/testing.md` (removed standalone report)
- **[reports/test_docstring_audit_report.md](reports/test_docstring_audit_report.md)** - Test
  documentation audit results
- **[reports/type_ignore_audit_report.md](reports/type_ignore_audit_report.md)** - Type ignore usage
  audit and cleanup

### CI/CD Documentation

- **[ci/.github/copilot-instructions.md](ci/.github/copilot-instructions.md)** - GitHub Copilot
  instructions and coding standards
- **[rules.instructions.md](ci/.github/instructions/rules.instructions.md)** - AI agent
  collaboration rules and workflow guidelines

## Last Updated

_Last updated: 2025-01-27_

## Temporary Files and Outputs

- All temporary files and outputs generated by scripts, tests, or tools must be placed in the `tmp/`
  directory at the project root.
- The Makefile's `check-junk-folders` target enforces this by failing if any unexpected folders are
  created in the root.
