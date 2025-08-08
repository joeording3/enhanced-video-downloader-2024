# Enhanced Video Downloader Extension & Server

Enhanced Video Downloader is a Chrome extension paired with a local Python (Flask + yt-dlp) server.
It offers reliable, resumable downloads from a wide range of sites—directly via a draggable button
on video pages or through the extension popup.

---

## Features

- Download videos from YouTube, Vimeo, and any site supported by `yt-dlp`
- Optional fallback to `gallery-dl` for image galleries
- Resume interrupted downloads automatically
- Draggable "Download" button (position & visibility saved per-site)
- Popup UI: trigger downloads, view active/queued tasks with pause, resume, cancel, drag-and-drop
  reordering controls, collapsible Active/Queued sections, expandable error details with contextual
  help links; clear or toggle history
- Configurable download directory & server port (via CLI, popup or options page)
- Rolling port discovery (default <PORT_RANGE_START>–<PORT_RANGE_END> (see server/constants.py))
  with per-port timeouts, caching of the last successful port for faster reconnection, an orange
  '...' badge indicator during port scanning, network connectivity monitoring with online/offline
  notifications, and automatic server port rediscovery on network reconnects, and persistent
  download queue across sessions
- Download history & live progress updates (including speed, ETA, and total size)
- Debug & verbose log display in options page
- Download Error History view in options page listing past download errors
- Theme toggle functionality (light/dark mode) in options page
- Server connectivity status indicators in popup and options pages
- CLI (`videodownloader-server`) for comprehensive server management:
  - Start (foreground/daemon, dev/Gunicorn), stop, restart, status
  - Configuration viewing and editing (port, download directory, debug mode, history, log level)
  - Resume partial, incomplete, or failed downloads
  - View and clear server logs
  - Debugging utilities for paths and configuration
  - Batch download capabilities from file
  - Download priority management
  - System maintenance and cleanup operations

## Directory Structure

```text
Enhanced Video Downloader/
├── extension/
│   ├── dist/                  # Compiled JS files
│   ├── src/                   # TypeScript source files
│   │   ├── lib/              # Shared utility functions
│   │   ├── types/            # TypeScript definitions
│   │   ├── background.ts     # Background service worker
│   │   ├── background-logic.ts # Core message handling logic
│   │   ├── background-helpers.ts # Helper functions
│   │   ├── content.ts        # Content script for video detection
│   │   ├── popup.ts          # Popup UI
│   │   ├── options.ts        # Settings page
│   │   ├── history.ts        # History functionality
│   │   └── youtube_enhance.ts # YouTube-specific enhancements
│   ├── icons/
│   │   ├── darkicon16.png
│   │   ├── darkicon48.png
│   │   ├── darkicon128.png
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   └── ui/
│       ├── content.css
│       ├── options.css
│       ├── options-logs.css
│       ├── options.html
│       ├── popup.css
│       └── popup.html
├── server/
│   ├── __init__.py
│   ├── __main__.py
│   ├── cli.py                # Legacy Click entrypoint (transition)
│   ├── cli/                  # Modular CLI commands
│   │   ├── __init__.py       # Main CLI group
│   │   ├── serve.py          # Server lifecycle commands
│   │   ├── download.py       # Download management commands
│   │   ├── history.py        # History management commands
│   │   ├── status.py         # Status check commands
│   │   ├── utils.py          # Utility commands
│   │   └── resume.py         # Resume commands
│   ├── cli_commands/         # Legacy CLI subcommands
│   │   └── system_maintenance.py # System maintenance commands
│   ├── cli_helpers.py        # Shared helpers for CLI commands
│   ├── cli_resume_helpers.py # Resume-specific CLI helpers
│   ├── api/                  # Flask Blueprints
│   ├── config.py             # Config loader
│   ├── config/               # JSON config files
│   │   ├── config.json       # Server settings
│   │   └── extraction_rules.json
│   ├── data/                 # Persisted data files
│   │   ├── history.json
│   │   └── server.lock
│   ├── downloads/            # yt-dlp wrapper logic
│   ├── extraction_rules.py   # Extraction rule loader
│   ├── history.py            # History persistence logic
│   ├── lock.py               # Server lockfile management
│   ├── logging_setup.py      # Logging configuration
│   ├── schemas.py            # Pydantic schemas
│   ├── utils.py              # Shared helper functions
│   └── video_downloader_server.py  # Flask app entrypoint
├── tests/                    # Test files
│   ├── extension/            # Extension unit tests (Jest + Playwright)
│   ├── integration/          # Integration tests
│   ├── unit/                 # Server unit tests
│   └── jest/                 # Jest configuration
├── scripts/                  # Build and utility scripts
├── config/                   # Root configuration
├── bin/                      # Executable scripts
├── ci/                       # CI/CD configuration
├── logs/                     # Application logs
├── coverage/                 # Coverage reports (generated)
├── htmlcov/                  # HTML coverage reports (generated)
├── reports/                  # Test reports (generated)
├── mutants/                  # Mutation testing output (generated)
├── ARCHITECTURE.md           # System architecture documentation
├── CHANGELOG.md              # Release notes
├── DEVELOPER.md              # Developer guide
├── README.md                 # This file - user-facing documentation
├── TODO.md                   # Task tracking and project management
├── requirements.txt          # Python dependencies
├── package.json              # Node.js dependencies and scripts
├── pyproject.toml           # Python project configuration
├── setup.cfg                # Python tool configuration
├── eslint.config.cjs        # ESLint configuration
├── jest.config.js           # Jest configuration
├── stryker.conf.js          # Stryker mutation testing config
├── tsconfig.json            # TypeScript configuration
├── Makefile                 # Build and test automation
├── manifest.json            # Extension manifest
├── rules.json               # Project rules
└── .flake8                  # Flake8 configuration
```

## Documentation

### Core Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture, tech stack, and design decisions
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

- **[reports/test_audit_summary.md](reports/test_audit_summary.md)** - Test suite audit results and
  cleanup summary
- **[reports/css_audit_summary.md](reports/css_audit_summary.md)** - CSS audit and optimization
  results
- **[reports/hardcoded_variables_summary.md](reports/hardcoded_variables_summary.md)** - Hardcoded
  variables audit summary
- **[reports/playwright_quality_audit_report.md](reports/playwright_quality_audit_report.md)** -
  Playwright E2E testing quality audit
- **[reports/legacy_modules_audit.md](reports/legacy_modules_audit.md)** - Legacy module
  identification and migration plan
- **[reports/test_docstring_audit_report.md](reports/test_docstring_audit_report.md)** - Test
  documentation audit results
- **[reports/type_ignore_audit_report.md](reports/type_ignore_audit_report.md)** - Type ignore usage
  audit and cleanup

### CI/CD Documentation

- **[ci/.github/copilot-instructions.md](ci/.github/copilot-instructions.md)** - GitHub Copilot
  instructions and coding standards
- **[rules.instructions.md](ci/.github/instructions/rules.instructions.md)** - AI agent
  collaboration rules and workflow guidelines

---

## Installation & Setup

### Prerequisite: Install uv

If you don't have uv, install it from <https://github.com/astral-sh/uv#installation>

### Option 1: Install from source

1. Clone the repository:

   ```bash
   git clone https://github.com/joeording3/Enhanced-Video-Downloader.git
   cd Enhanced-Video-Downloader
   ```

2. Create a virtual environment and install dependencies using uv:

   ```bash
   uv venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   uv pip install -e .
   ```

3. Install Node.js dependencies and build the TypeScript files:

   ```bash
   npm install
   npm run build:ts
   ```

### Option 2: Install with pip

```bash
uv pip install videodownloader-server
```

## Server Usage

The server can be run in several ways:

### As a command-line tool

After installation, the `videodownloader-server` command becomes available:

```bash
# Start the server (runs in daemon mode by default)
videodownloader-server start

# Run in foreground mode
videodownloader-server start --foreground
# Or use the shorter --fg flag
videodownloader-server start --fg

# Start with verbose output (shows all log messages instead of just warnings/errors)
videodownloader-server start --verbose

# Force start a new instance (stopping any existing instance)
videodownloader-server start --force

# Stop the server (terminates all running instances)
videodownloader-server stop

# Force stop (immediately kills processes if graceful stop times out)
videodownloader-server stop --force

# Restart the server
videodownloader-server restart

# Restart in foreground mode
videodownloader-server restart --fg

# Restart with force option (to handle cases where another instance might be running)
videodownloader-server restart --force

# Check server status
videodownloader-server status

# Check download status
videodownloader-server downloads

# Show server configuration
videodownloader-server config
videodownloader-server config set <key> <value>  # Set configuration
videodownloader-server setport 5020 setdownloaddir ~/Downloads/videos

# Download management
videodownloader-server download url <URL>  # Download a specific URL
videodownloader-server download resume incomplete  # Resume incomplete downloads
videodownloader-server download resume partials  # Resume partial downloads
videodownloader-server download resume failed  # Resume failed downloads
videodownloader-server download cancel <download_id>  # Cancel a specific download
videodownloader-server download batch <file>  # Batch download from file
videodownloader-server download priority <download_id> <priority>  # Set download priority
videodownloader-server download list  # List active downloads

# History management
videodownloader-server history list  # List download history
videodownloader-server history clear  # Clear download history

# System maintenance
videodownloader-server clear-cache  # Clear cache files

# Enhanced utility commands
videodownloader-server clear-logs  # Clear logs
videodownloader-server cleanup  # Clean up orphaned processes

# Advanced configuration examples
videodownloader-server config set server_port 5020
videodownloader-server config set download_dir ~/Downloads/videos
videodownloader-server config set debug_mode true
videodownloader-server config set log_level debug
videodownloader-server config set enable_history false

# Batch download example
echo "https://www.youtube.com/watch?v=example1" > urls.txt
echo "https://www.youtube.com/watch?v=example2" >> urls.txt
videodownloader-server download batch urls.txt

# Priority management examples
videodownloader-server download priority 123 high
videodownloader-server download priority 456 low
videodownloader-server download list --active-only
videodownloader-server download list --failed-only
```

### Using Gunicorn (Production)

For production deployments, it's recommended to use Gunicorn:

```bash
gunicorn --workers=4 --bind=0.0.0.0:<SERVER_PORT> server:create_app()
```

### Using Docker

1. Build the Docker image:

   ```bash
   docker build -t videodownloader-server .
   ```

2. Run the container:

   ```bash
   docker run -p <SERVER_PORT>:<SERVER_PORT> -v /path/to/downloads:/data/downloads videodownloader-server
   ```

### Using systemd (Linux)

1. Copy the systemd service file:

   ```bash
   sudo cp etc/videodownloader-server.service /etc/systemd/system/
   ```

2. Edit the service file if needed:

   ```bash
   sudo nano /etc/systemd/system/videodownloader-server.service
   ```

3. Enable and start the service:

   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable videodownloader-server
   sudo systemctl start videodownloader-server
   ```

## Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in the top-right corner)
3. Click "Load unpacked" and select the project directory
4. Click the extension icon in Chrome's toolbar to access settings and controls

## Extension Features

### Popup Interface

- **Download Button**: Trigger downloads directly from the popup
- **Active Downloads**: View and manage currently running downloads
  - Pause/Resume individual downloads
  - Cancel downloads
  - Drag-and-drop reordering of download queue
  - Real-time progress updates (speed, ETA, file size)
- **Queued Downloads**: View pending downloads with priority management
- **Server Status**: Visual indicator showing server connectivity
- **History Toggle**: Quick access to download history

### Options Page

- **Server Configuration**: Set download directory, server port, and other settings
- **Theme Toggle**: Switch between light and dark themes
- **Log Display**: View server logs with different verbosity levels
- **Error History**: Browse past download errors with detailed troubleshooting information
- **Server Status**: Real-time server connectivity status
- **Settings Persistence**: All settings are automatically saved and restored

### Content Script Features

- **Draggable Download Button**: Appears on video pages with customizable position
- **Per-Site Memory**: Button position and visibility saved per website
- **Visual Feedback**: Button changes appearance during download process
- **Error Handling**: Clear error messages with troubleshooting suggestions

### Background Features

- **Automatic Server Discovery**: Finds server on ports 5001-5099 with intelligent caching
- **Network Monitoring**: Detects network changes and reconnects automatically
- **Persistent Queue**: Download queue survives browser restarts
- **Notification System**: Desktop notifications for download completion and errors

---

## Usage

### Configure

In the popup or options page set your download directory, server port, debug & log level. Settings
write through the server API; config.json remains the source of truth.

### Download

On any video page, drag or click the injected DOWNLOAD button. Or use the Download Video button in
the popup. Watch progress live in the popup; completed downloads move to history.

### History & Resume

View past downloads in History (filter by status, domain). History entries now include full metadata
extracted from yt-dlp's .info.json for detailed insights. Use Resume partials in options to recover
interrupted tasks.

## Configuration

The server configuration is stored in `config.json` (located at the project root) and includes:

- `server_port`: The port the server listens on (default: 5001, but see port discovery).
- `download_dir`: Directory where downloaded videos are saved (e.g.,
  `/Users/username/Downloads/videos`).
- `debug_mode`: Boolean, whether to run the server in debug mode (provides more detailed logs,
  enables Werkzeug reloader). Default: `false`.
- `enable_history`: Boolean, whether to save download history. Default: `true`.
- `log_level`: String, controls server log verbosity. Can be `"debug"`, `"info"`, `"warning"`,
  `"error"`, or `"critical"`. Default: `"info"`.
- `console_log_level`: String, controls console output verbosity. Can be `"debug"`, `"info"`,
  `"warning"`, `"error"`, or `"critical"`. Default: `"warning"` (shows only warnings and errors).

You can configure these settings through:

- The Chrome extension popup
- The options page
- Command-line interface: `videodownloader-server config set`
- Enhanced CLI commands: `videodownloader-server utils config show/set`
- Editing `config.json` directly (not recommended while server is running)

---

## Development

### Quality Assurance

The project includes comprehensive quality check targets via Make:

```bash
# Run all quality checks (stops on first failure)
make all

# Run all quality checks but continue even if some fail (shows summary)
make all-continue

# Quick quality checks without coverage (faster feedback)
make check

# Individual checks
make lint          # Run linting for Python and JavaScript
make lint-py       # Python linting only (Ruff)
make lint-js       # JavaScript linting only (ESLint)
make format-check  # Check code formatting without modifying files
make format        # Auto-format code
make test          # Run all tests (Python and JavaScript)
make test-py       # Python tests only
make test-js       # JavaScript tests only
make test-fast     # Fast unit tests only
make test-slow     # Slow integration and E2E tests
make coverage      # Generate test coverage reports
make mutation      # Run all mutation tests
make mutation-js   # JavaScript/TypeScript mutation testing (Stryker)
make mutation-py   # Python mutation testing (Mutmut)

# Test audit
make test-audit    # Comprehensive test audit
make audit-coverage    # Coverage analysis
make audit-mutation    # Mutation testing
make audit-performance # Performance review
make audit-docs        # Documentation check

# Additional targets
make clean         # Clean build artifacts
make install-dev   # Install development dependencies
make build-js      # Build TypeScript files
make generate-ignores # Generate ignore files from centralized configuration
```

### Testing

```bash
# Fast tests (unit tests only)
make test-fast

# Slow tests (integration and E2E tests)
make test-slow

# Test audit (coverage, mutation testing, performance, docs)
make test-audit

# Python tests with coverage
pytest tests/unit --maxfail=1 --disable-warnings -q --cov=server --cov-report=term-missing

# JavaScript/TypeScript tests
npm run test:extension:ts
npm run test:extension:coverage

# Optimized mutation testing
make mutation-py              # Full mutation testing (timeout: 10min)
make mutation-py-fast         # Fast testing (timeout: 5min)
make mutation-py-minimal      # Minimal testing (timeout: 3min)
make mutation-py-quick        # Quick testing (timeout: 3min)
make mutation-py-analyze      # View results and analysis
mutmut run                    # Direct mutmut command
mutmut results                # View mutation results
mutmut show <mutant_name>     # View specific mutant details
```

#### Junk Folder Prevention (Hypothesis & Benchmarks)

- Property-based tests using Hypothesis are configured to:
  - Store examples in `.hypothesis/examples`.
  - Confine any generated path values (e.g., `download_dir`, `log_file`) to
    `tmp/hypothesis_download_dirs`.
- Benchmark outputs (from `pytest-benchmark`) may create `.benchmarks/` at the repo root; this is
  intentionally ignored by the junk-folder check.
- Makefile helpers:
  - `make check-junk-folders` – fails if unexpected empty directories are present at the repo root.
  - `make cleanup-junk-folders` – removes empty, non-critical directories at the repo root.
  - `make monitor-junk-folders` – background watcher to remove new empty junk directories.

### Building

```bash
# Build TypeScript files
make build-js

# Generate ignore files from centralized configuration
make generate-ignores
```

## Security & Request Limits

- Security headers: All responses include standard headers:

  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'`

- CORS: Enabled for local usage and extension contexts. By default, CORS is permissive (`*`) to
  accommodate Chrome/Firefox extension origins and localhost during development. For production,
  front a reverse proxy and restrict origins as needed.

- Request size limit: Requests are limited by `MAX_CONTENT_LENGTH` (default: 16 MB). Oversized
  requests return a JSON error with HTTP 413:

```json
{
  "status": "error",
  "message": "Request entity too large",
  "error_type": "REQUEST_ENTITY_TOO_LARGE"
}
```

- Rate limiting: Download endpoints include an in-memory rate limiter (10 req/min per IP) to reduce
  abuse.

### Development Tools

#### Python Tooling

- **Ruff**: Primary Python linter (replacing flake8)
- **Black**: Code formatting (120-character line length)
- **isort**: Import sorting
- **mypy**: Type checking (enhanced mode)
- **pytest**: Testing framework
- **mutmut**: Mutation testing

#### JavaScript/TypeScript Tooling

- **ESLint**: Linting with TypeScript support
- **Prettier**: Code formatting
- **Stylelint**: CSS linting
- **Jest**: Testing framework
- **Playwright**: E2E testing
- **Stryker**: Mutation testing
- **esbuild**: TypeScript compilation and bundling

## Code Quality

This project maintains high standards for code quality, type safety, and documentation:

### Type Safety

- **Python**: Pyright static analysis with 0 errors, 143 warnings (down from 368 total issues)
- **TypeScript**: Comprehensive type coverage with strict ESLint rules
- **Type Ignore Management**: 32 instances, all legitimate and well-documented
- **Configuration**: Python 3.13 compatibility with modern union syntax support

### Documentation Standards

- **Test Docstring Coverage**: 100% across all test categories
- **Python**: Sphinx/REST style with `:param:`, `:returns:` directives
- **TypeScript**: JSDoc format with parameter and return documentation
- **Quality Requirements**: One-line summaries, complete parameter documentation, no emojis

### Quality Assurance

- **Linting**: 100% compliance with ESLint (JS/TS) and Ruff (Python)
- **Formatting**: Automated with Prettier and Black
- **Testing**: Comprehensive unit, integration, and E2E test coverage
- **Mutation Testing**: Stryker for JS/TS (98.85% score), Mutmut for Python
- **Coverage**: Target 80% coverage across all modules

### Recent Achievements

- **Type Safety**: Eliminated all pyright errors (0 errors, down from 368)
- **Documentation**: Achieved 100% docstring coverage across all test categories
- **Test Quality**: All test files follow Sphinx/REST standards properly
- **Code Quality**: 100% lint compliance with comprehensive error handling

## API Reference

The server provides a comprehensive REST API for download management:

- `POST /api/download`: Download videos using yt-dlp
- `POST /api/gallery-dl`: Download galleries using gallery-dl
- `GET /api/status`: Get download progress and status
- `GET /api/history`: Get download history
- `GET /api/config`: Get server configuration
- `POST /api/config`: Update server configuration
- `GET /api/logs`: Get server logs
- `GET /api/health`: Health check endpoint
- `POST /api/restart`: Restart server
- `POST /api/download/{id}/pause`: Pause a download
- `POST /api/download/{id}/resume`: Resume a download
- `POST /api/download/{id}/cancel`: Cancel a download
- `POST /api/download/{id}/priority`: Set download priority

For complete API documentation, see `server/api/api.md`.

## Reliability Improvements

- ID generation now uses cryptographically strong randomness for uniqueness, improving reliability
  in rapid operations.
- Theme handling tests for the popup UI now accurately reflect the implementation logic.
- Enhanced error handling with detailed troubleshooting suggestions.
- Comprehensive progress tracking with speed, ETA, and historical data.
- Robust port discovery with caching and network connectivity monitoring.

## CI/CD Pipeline

- Comprehensive CI pipeline includes unit tests, coverage checks, and mutation testing.
- Mutation testing enforces 70% threshold to ensure test quality and code robustness.
- Automated test result reporting with detailed coverage and mutation score summaries.
- Matrix testing across Chrome channels (stable, beta, unstable) for extension compatibility.
- Quality gates enforce code formatting, linting, and test coverage thresholds.

## Project Documentation

- **README.md**: This file - user-facing documentation and quickstart guide
- **ARCHITECTURE.md**: System architecture, tech stack, and data flow documentation
- **DEVELOPER.md**: Developer guide with coding standards, testing practices, and workflow
  procedures
- **CHANGELOG.md**: Comprehensive release notes and version history
- **TODO.md**: Active task tracking and project management
- **server/api/api.md**: Complete REST API reference
- **tests/testing.md**: Comprehensive testing documentation and quality metrics

---

_Last updated: 2025-01-27_
