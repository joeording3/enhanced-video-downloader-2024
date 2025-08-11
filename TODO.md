# Enhanced Video Downloader - TODO

Urgent Tasks:

- [/] log viewer on options page not working - no logs displayed
- [x] Options: Replace generic "Field is valid" for dropdowns with meaningful, contextual info. Add
      explanatory help for "Console Log Level" with per-option descriptions and validation.
- [x] Options UI: Consolidate "Runtime (requires restart)" settings into the "Server Configuration"
      section and relocate "Save Settings" and "Restart Server" buttons there for clarity
- [x] Remove outdated test audit reports (`reports/test_audit_report.md`,
      `reports/test_audit_summary.md`); migrated content into `tests/testing.md` and removed
      references in `README.md` and `ARCHITECTURE.md`.
- [x] Remove outdated `reports/test_audit_report.md`; migrate key notes into `tests/testing.md` and
      keep `reports/test_audit_summary.md`.
- [x] Remove outdated `reports/mutation_analysis_report.md`; migrate key actionable notes into
      `tests/testing.md` under Mutation Testing Status.
- [ ] Add unused-code checks to CI and local workflows
  <!-- working-on: unused-code checks (ts-prune, vulture) -->

  - [x] Add ts-prune scripts and Make targets
  - [x] Add vulture to dev deps and Make target scanning `server` and `tests`
  - [ ] Wire into `make all`/`check` gates and CI once noise baseline is reviewed

  <!-- working-on: options logs viewer wired to background API -->

- [x] Full pipeline health: lint, format-check, tests, coverage all green via `make all` (fixed ESLint/Prettier issues in Playwright E2E; auto-formatted JSON; no blocking lints remain)
- [/] Prevent stale lock file from affecting CLI status tests by removing `server/data/server.lock`
  before `make test-py`
- [x] Enhance CLI restart: reuse previous run mode/flags automatically when not provided (persisted
      in `server/data/server.lock.json`); normalize invalid hostnames and stabilize auto-port with
      SO_REUSEADDR-aware port checks to avoid transient false "in use" on restart.
- [x] Remove 'Choose' folder button from Options. The download directory field now only accepts a
      pathname typed/pasted by the user. Validation accepts absolute paths and `~`-prefixed paths
      (the server expands `~`).
- [/] Implement `run_cleanup()` in `server/cli/utils.py` and add tests
- [/] Align JSON error semantics across endpoints; document in README and CHANGELOG
  <!-- working-on: api-json-errors -->
- [/] Server log noise reductions and fixes: standardized JSON parsing errors in
  `server/api/download_bp.py`, completed error logging in `server/api/logs_bp.py`, ensured restart
  and resume modules log with appropriate levels; verified via tests.
  - [x] Honor `LOG_FILE` for file logging in app factory and redirect test logs to temp files.
  - [x] Autouse pytest fixture sets `ENVIRONMENT=testing` and defaults `SERVER_PORT=5006` to prevent
        conflicts and log noise in `server_output.log`.
  - [x] Add session-scoped autouse fixture to set `LOG_FILE` before any tests run, preventing early
        initializations or blueprint-only apps from writing to production `server_output.log`.
  - [x] Auto-port in tests: dynamically choose an available port in the test range and expose it via
        `test_server_port` fixture; avoid any hard-coded ports in tests. Added `TEST_SERVER_PORT` to
        `.env` as the documented default.
  - [x] Switch to structured JSON (NDJSON) logging with optional `start_ts` and `duration_ms` fields
        for easy sorting and analysis; standardized request logs include timing when available.
  - [x] Options Log Viewer: parse NDJSON, derive level from prefix, filter-first then limit display,
        suppress `werkzeug` and status 200 entries; iteratively fetch more lines until the filtered
        set reaches the UI limit. Added unit tests to verify filter + limit order and iterative
        fetch.
- [x] Add explicit startup INFO log line and wire Gunicorn access/error logs to the same log file by
      default via CLI helpers. Update README and CHANGELOG to document behavior.
- [x] Keep CLI output clean: use plain, minimal console formatter at WARNING by default; route all
      structured JSON to the log file; suppress server child stdout/stderr in foreground runs;
      ensure Gunicorn access/error logs go to `LOG_FILE`.
- [/] Centralize log-path resolution via `server/logging_setup.resolve_log_path` and update
  `server/api/logs_bp.py` and `server/api/logs_manage_bp.py` to use it; document precedence in
  README. Tighten `_validate_lines` message while preserving client response text.
- [/] Replace silent `pass` blocks with logging/handling in:
  - `server/cli_helpers.py` (loops and maintenance utils)
  - `server/cli_main.py` (loop around verification)
  - `server/api/download_bp.py` (partial file cleanup)
  - `server/api/status_bp.py` (average speed computation)
  - `server/__main__.py` (process scanning and config save)
  - `server/lock.py` (unlink/parse/read errors)

## Bundle Size Optimization (from latest analysis)

- [ ] Split background script into smaller modules
- [ ] Implement lazy loading for content script
- [ ] Use dynamic imports for options page

## Unused Code Cleanup (from latest report)

- **TypeScript**

  - [ ] De-export internal-only symbols in `extension/src/core/constants.ts`.
  - [ ] De-export `updateToggleButtonState` in `extension/src/popup.ts` if not used externally.
  - [ ] Audit `extension/src/types/index.ts`; keep only the intended public API exported.
  - [ ] Document intentional public types in `extension/src/extension-overview.md`.
  - [ ] Add a ts-prune ignore list (`ts-prune.json`) for intentional public exports.

- **Python**

  - [ ] Add `reports/vulture_whitelist.py` listing Flask routes and Click commands to reduce false
        positives from decorators/dynamic registration.
  - [ ] Update Makefile unused-code target to use the whitelist and raise `--min-confidence 80`
        after initial cleanup.
  - [ ] Remove or deprecate unused CLI helpers in `server/cli_helpers.py` and `server/cli_main.py`
        once verified unused.
  - [ ] Collapse duplicate/migrated constants in `server/constants.py`.
  - [ ] Remove unreferenced validators/fields in `server/schemas.py`, or ensure they are referenced
        by pydantic models.

- **Automation and CI**
  - [ ] Keep `make lint-unused` non-blocking during triage.
  - [ ] Add a CI job to run `make lint-unused` and upload `reports/unused_code_report.md`.
  - [ ] After cleanup, gate CI on `make lint-unused` (warning first, then enforce).

### Wiring Audit Findings (Backend/UI/CLI integration)

- [ ] Options: `resumeDownloads` button sends
      `chrome.runtime.sendMessage({ type: "resumeDownloads" })` but background has no handler. Add
      background handler to POST `/api/resume` and return result. Files:
      `extension/src/background.ts`, tests in `extension/src/__tests__/`.
  - [/] Implemented background handler for `resumeDownloads` to POST `/api/resume`.
- [ ] Popup: `getConfig` response shape mismatch. `popup.ts` expects `response.serverConfig`,
      background returns `{ status, data }`. Normalize to `data` in `popup.ts` (`loadConfig`,
      `updateDownloadDirDisplay`, `updatePortDisplay`). Files: `extension/src/popup.ts`.
  - [/] Normalized popup config access to use `response.data || response.serverConfig`.
- [ ] Logs endpoints not standardized under `/api`. Server exposes `/logs` and `/logs/clear` (no
      `/api`), background tries `/api/logs` first. Either (prefer) mount `logs_bp` and
      `logs_manage_bp` under `/api` in `server/__init__.py` or (fallback) keep BG candidates but
      update README to reflect reality. Files: `server/__init__.py`, `server/api/logs_bp.py`,
      `server/api/logs_manage_bp.py`, `README.md`.
  - [/] Mounted `logs_bp` and `logs_manage_bp` under `/api` in `server/__init__.py`.
- [ ] CLI calls non-API paths. Update `server/cli/*.py` to use `/api/*` endpoints: `/api/download`,
      `/api/status`, `/api/resume`, `/api/download/<id>/{cancel,pause,resume,priority}`. Files:
      `server/cli/download.py`, `server/cli/status.py`, `server/cli/history.py`.
  - [/] Updated CLI endpoints to `/api/*` in `server/cli/download.py`, `server/cli/status.py`, and
    `server/cli/history.py`.
- [ ] GalleryDL API not wired in UI. Backend supports `POST /api/gallery-dl` and `use_gallery_dl`
      flag, but extension never triggers it. Add UI toggle/logic or document as server-only. Files:
      `extension/src/popup.ts` (or options), `extension/src/background.ts`.
  - [/] Added optional Options UI hook (`settings-gallery-download`) wiring: sends `galleryDownload`
    to background; background posts to `/api/gallery-dl`.
- [ ] Priority API not surfaced in UI. Backend `POST /api/download/<id>/priority` exists; add
      control in popup active item UI or drop endpoint. Files: `extension/src/popup.ts`,
      `server/api/download_bp.py` (if dropping).
  - [/] Background added `setPriority` message case; popup UI control added in
    `createActiveListItem()`.
- [ ] Status API unused by extension. Popup listens for `downloadStatusUpdate` but no sender exists;
      BG does not poll `/api/status`. Either implement periodic polling and broadcast, or remove
      listener. Files: `extension/src/background.ts`, `extension/src/popup.ts`.
  - [/] Implemented background periodic polling of `/api/status` and broadcasting
    `downloadStatusUpdate`.
- [ ] History API unused by extension. Extension persists history only in `chrome.storage`; consider
      syncing with `/api/history` for enriched entries or document local-only behavior. Files:
      `extension/src/history.ts`, `server/api/history_bp.py`.
  - [/] Implemented best-effort history sync: append entries and clear via `/api/history` when
    `serverPort` is known.
  - [/] Wired popup history view to pagination controls and live updates; `initPopup()` now imports
    `fetchHistory`/`renderHistoryItems` and listens for `historyUpdated`. Files:
    `extension/src/popup.ts`.
  - [/] Added server-side queue management: when max concurrency is reached, `/api/download` returns
    `status: queued` and enqueues the request; `/api/status` includes queued IDs. Files:
    `server/queue.py`, `server/api/download_bp.py`, `server/api/status_bp.py`, docs in
    `server/api/api.md`.
  - [x] Consolidate Playwright E2E audit details into `tests/testing.md`; remove outdated
        `reports/playwright_quality_audit_report.md` and update references in `README.md` and
        `ARCHITECTURE.md`.
- [ ] Debug API (`GET /debug/paths`) is dev-only and unused in UI; optionally surface in Options
      “Debug” tab or leave as internal.

Legacy/Stub Cleanup:

- [/] Remove legacy priority stub path from `server/api/download_bp.py`; update tests to
  process-based priority
- [/] Remove gallery-dl resume placeholder log in `server/cli_helpers.py` or implement actual resume
  via gallery-dl API
- [/] Drop legacy PID-only lock format handling in `server/lock.py:get_lock_pid` once migration
  confirmed; update callers
- [/] Cleaned up "for now" comment in `server/__main__.py` to reflect current behavior
- [/] Remove legacy port compatibility helpers in `server/constants.py` if unused (`LEGACY_PORTS`,
  `normalize_legacy_port`, `get_port_config`)
- [/] Remove legacy frontend fallbacks for logs endpoints; standardize on `/api/logs` and
  `/api/logs/clear`
- [/] Audit `server/cli_commands/lifecycle.py` legacy shims; remove if not referenced
- [/] Review `server/video_downloader_server.py` compatibility shim; remove if WSGI entrypoints
  cover all use cases
- [/] Remove legacy `server/cli_commands/resume.py` (stubbed `failed` subcommand); use maintained
  `server/cli/resume.py` group instead
- [/] Unified `find_available_port` usage (prefer `server/utils.py`) and removed duplicates; CLI
  range-signature wrapper now delegates to `server.utils.find_available_port`
- [/] Removed deprecated `extension/ui/styles.css` (legacy styles) – project now uses
  `variables.css`, `components.css`, `base.css`, and `themes.css`
- [/] CSS audit: migrated inline styles to classes, unified visibility helpers.
  <!-- working-on: css refactor - visibility classes and contrast variants -->

  - [/] Add missing CSS variables and aliases to unify color/spacing across Options and Popup
  - [/] Remove non-standard `composes:` usage; replace with explicit component styles
  - [/] Align backgrounds to `--container-bg` and headers to `--header-bg`
  - [/] Normalize history/logs styles; use variables for dark-mode notification colors
  - [x] Popup: Clean up dark/light theme rules by relying on variable aliases only; removed
        `body.dark-theme` overrides from `extension/ui/popup.css` and added theme aliases to
        `extension/ui/themes.css` (`--row-alt-bg`, `--bg-elevated`, `--error-bg-tint-light` → dark
        tint)

- [x] Remove obsolete `server/data/server.json` (unused; superseded by env config and lock metadata
      JSON)

### Hardcoded Variables Cleanup

- [ ] Replace hardcoded fetch URLs in `extension/src/background.ts` with compositions of
      `NETWORK_CONSTANTS.SERVER_BASE_URL`, discovered port, and endpoint constants from
      `extension/src/core/constants.ts`.
- [ ] Audit extension code to remove duplicated `"/api/..."` strings; import and use endpoint
      constants instead.
- [ ] Replace hardcoded lock path in `server/cli/serve.py` (`/tmp/videodownloader.lock`) with the
      centralized lock path helpers from `server/lock.py` (e.g., `get_lock_file_path`) to ensure
      cross-platform behavior.
- [ ] Review server/CLI default host strings; keep loopback binds but ensure they are centralized
      and documented.
- [ ] Document any remaining, justified literals (tests/manifest permissions) in README policy.

### Frontend centralized services follow-ups

- [ ] Replace direct DOM queries in `extension/src/popup.ts` and `extension/src/options.ts` with
      `domManager` where practical
- [ ] Replace remaining `console.*` calls in `popup.ts` and `options.ts` with centralized `logger`
- [ ] Remove `validatePort()` in `extension/src/options.ts` and use `validationService` port
      validator
- [x] Recreate and finish CSS design system consolidation (variables, themes, components, base) and
      ensure imports in `popup.css`, `options.css`, and `content.css` (documented in
      Architecture/README)

## 1.2 Fix Critical JavaScript/TypeScript Modules [WEEK 1-2]

**background-logic.ts (87.36% → EXCEEDED 70% target by 17%)**

- [x] Strengthen existing tests with better behavioral assertions
- [x] Add tests for edge cases and error conditions (handleSetConfig, handleGetHistory,
      handleClearHistory)
- [x] Test utility functions with various input combinations (timeout handling, batch processing)
- [x] Add integration tests for helper function usage (progress callbacks, storage service
      integration)
- [x] Verify Chrome API interactions are properly mocked and tested

**background-helpers.ts (72.06% → target 70%)** **ALREADY ABOVE TARGET**

- [x] Module already exceeds target score
- [ ] Consider additional edge case tests for robustness
- [ ] Monitor for any score regressions

**background.ts (53.19% → target 70%)**

- [ ] Add tests for Chrome API interactions (storage, messaging, tabs)
- [ ] Implement integration tests for background script lifecycle
- [ ] Add tests for error handling and edge cases
- [ ] Test startup/shutdown procedures
- [ ] Verify message passing between components

### 1.3 Improve Test Quality Patterns [WEEK 2-3]

- [ ] Replace stub-only assertions with behavior verification
- [ ] Add realistic in-memory shims for file I/O and network calls
- [ ] Implement comprehensive error condition testing
- [ ] Add boundary value and edge case testing
- [ ] Create shared test utilities for common patterns

### 1.4 Set Up Continuous Monitoring [WEEK 1]

- [ ] Configure CI to fail on mutation score drops below 70% (JS/TS) and 80% (Python)
- [ ] Set up weekly mutation testing reports
- [ ] Create automated alerts for score regressions
- [ ] Implement pre-commit hooks for critical files
  - [/] Add fast Stryker script `test:mutation:js:fast` and wire to lint-staged

### Priority 2: Consolidate Test Organization [HIGH]

**Current State**: 121 test files scattered across multiple directories with duplication

#### 2.1 **Eliminate Test Duplication** [WEEK 1]

- [ ] Audit all test files for duplicate test logic
- [ ] Remove duplicate tests from integration directories
- [ ] Consolidate similar test cases into shared utilities
- [ ] Update import paths and references
- [ ] Verify no test logic is duplicated across directories

#### 2.2 **Standardize Test Structure** [WEEK 2]

- [ ] Create consistent test file naming conventions
- [ ] Standardize test organization patterns (setup, test, teardown)
- [ ] Implement consistent mock usage patterns
- [ ] Create shared test utilities for common operations
- [ ] Document test patterns and best practices

#### 2.3 **Optimize Test Locations** [WEEK 2]

- [ ] Move all unit tests to co-located `__tests__` directories
- [ ] Keep integration tests in main `tests/` directory
- [ ] Organize tests by module and functionality
- [ ] Update Jest and pytest configurations
- [ ] Verify all test discovery works correctly

#### 2.4 **Improve Test Maintainability** [WEEK 3]

- [ ] Create comprehensive test documentation
- [ ] Implement consistent test data management
- [ ] Add test categorization and tagging
- [ ] Create test maintenance guidelines
- [ ] Set up test quality metrics tracking

### Priority 3: Expand Integration and E2E Coverage [MEDIUM]

**Current State**: 45.34% overall coverage, limited E2E tests (117 vs 1,669 unit tests)

#### 3.1 **Add Chrome Extension E2E Tests** [WEEK 2-3]

- [ ] Add E2E tests for complete user workflows
- [ ] Test extension popup functionality end-to-end
- [ ] Test options page configuration flows
- [ ] Test content script integration with YouTube
- [ ] Test background script message handling

#### 3.2 **Expand Cross-Module Integration Tests** [WEEK 3-4]

- [ ] Add tests for API endpoint combinations
- [ ] Test CLI command sequences and workflows
- [ ] Add tests for server-client communication
- [ ] Test concurrent operations and race conditions
- [ ] Add stress tests for high-load scenarios

#### 3.3 **Improve Error Handling Coverage** [WEEK 3]

- [ ] Add tests for all error conditions and edge cases
- [ ] Test network failure scenarios
- [ ] Test file system error conditions
- [ ] Test invalid input handling
- [ ] Test timeout and retry mechanisms

#### 3.4 **Add Performance and Load Testing** [WEEK 4]

- [ ] Add performance benchmarks for critical operations
- [ ] Test memory usage under load
- [ ] Add concurrent download testing
- [ ] Test extension performance with large datasets
- [ ] Add resource usage monitoring tests

#### Week 1: Foundation

- Establish Python mutation testing baseline
- Fix critical JavaScript/TypeScript modules (background-logic.ts, popup.ts)
- Set up continuous monitoring

#### Week 2: Organization

- Eliminate test duplication
- Standardize test structure
- Add Chrome extension E2E tests

#### Week 3: Quality

- Improve test quality patterns
- Expand cross-module integration tests
- Add comprehensive error handling tests

#### Week 4: Completion

- Add performance and load testing
- Finalize test organization
- Achieve all target metrics

### Risk Mitigation

#### Technical Risks

- **Risk**: Mutation testing reveals extensive gaps
  - **Mitigation**: Focus on critical modules first, implement incrementally
- **Risk**: Test refactoring breaks existing functionality
  - **Mitigation**: Maintain comprehensive test suites, use feature flags

#### Timeline Risks

- **Risk**: Critical fixes take longer than expected
  - **Mitigation**: Focus on highest-impact modules first, adjust timeline as needed
- **Risk**: Resource constraints limit progress
  - **Mitigation**: Prioritize by business impact, implement incrementally

---

## NEXT STEPS - PRODUCTION READINESS

### High Priority Tasks

#### 1. **Security Enhancements** [CRITICAL]

- [ ] Add input sanitization for all user inputs
- [/] Implement proper CORS configuration
- [/] Add request size limits
- [/] Implement proper error message sanitization
- [/] Add security headers
- [/] Implement rate limiting for download endpoints
- [ ] Add comprehensive logging for debugging

#### 2. **Backend API Error Handling** [HIGH]

- [ ] Implement comprehensive error handling for all API endpoints
- [ ] Add request validation middleware
- [ ] Add proper cleanup for failed downloads
- [ ] Add health check endpoint with detailed status
- [ ] Implement proper error message sanitization

#### 3. **Performance Optimization** [HIGH]

- [ ] Optimize database queries for large history datasets
- [ ] Implement caching for frequently accessed data
- [ ] Add connection pooling for database operations
- [ ] Optimize file system operations for download management
- [ ] Implement background cleanup tasks

### Medium Priority Tasks

#### 4. **Deployment & Infrastructure** [MEDIUM]

- [ ] Docker containerization
- [ ] CI/CD pipeline setup
- [ ] Production deployment configuration
- [ ] Monitoring and logging setup
- [ ] Environment-specific configuration management

#### 5. **Documentation Improvements** [MEDIUM]

- [ ] Update API documentation
- [ ] Add comprehensive README for development setup
- [ ] Document testing procedures
- [ ] Add deployment guides
- [ ] Create troubleshooting documentation

#### 6. **Testing Expansion** [MEDIUM]

- [ ] Backend API testing
- [ ] Integration testing
- [ ] Performance testing
- [ ] Security testing
- [ ] Load testing for concurrent downloads

### Maintenance & Monitoring

#### 7. **Quality Assurance** [ONGOING]

- [ ] Quarterly Reviews: Maintain excellent standards achieved in docstrings and type safety
- [ ] Continuous Monitoring: Track new additions to ensure quality maintenance
- [ ] Coverage Expansion: Continue expanding test coverage to reach 80% target
- [ ] Monitor for new type ignore patterns
- [ ] Ensure new test files maintain docstring standards
- [ ] Track third-party library type stub availability
- [x] Prevent Hypothesis tests from creating junk folders in repo root by confining generated paths
      to `tmp/hypothesis_download_dirs` and loading a local Hypothesis profile; updated `Makefile`
      junk check to ignore `.benchmarks`; fixed `Makefile` recipe indentation in
      `check-junk-folders` to avoid make parsing errors

### Success Metrics to Track

- **Security**: Zero security vulnerabilities in dependency scans
- **Performance**: API response times under 200ms for standard operations
- **Reliability**: 99.9% uptime in production
- **Coverage**: Maintain 80%+ test coverage
- **Quality**: Keep pyright errors at 0 and warnings under 150

### Recommended Priority Order

1. **Security First**: Implement security enhancements (input sanitization, CORS, etc.)
2. **Error Handling**: Add comprehensive error handling for API endpoints
3. **Performance**: Optimize database and file system operations
4. **Deployment**: Set up production-ready infrastructure
5. **Documentation**: Complete API and deployment documentation
6. **Testing**: Expand test coverage and add performance/security tests

---

## ORIGINAL TODO ITEMS

### Frontend Development

- [/] Eliminate redundancy and improve coverage in frontend test suite to 80%
- [/] Fix older test files that need updates to align with the current implementation
- [/] Create comprehensive test coverage for core modules
- [/] Implement shared test utilities to reduce redundancy

### Backend Development

- [ ] Implement comprehensive error handling for all API endpoints
- [ ] Add request validation middleware
- [ ] Implement rate limiting for download endpoints
- [ ] Add comprehensive logging for debugging
- [ ] Implement proper cleanup for failed downloads
- [ ] Add health check endpoint with detailed status

### Performance Optimization

- [ ] Optimize database queries for large history datasets
- [ ] Implement caching for frequently accessed data
- [ ] Add connection pooling for database operations
- [ ] Optimize file system operations for download management
- [ ] Implement background cleanup tasks

### Security Enhancements

- [ ] Add input sanitization for all user inputs
- [ ] Implement proper CORS configuration
- [ ] Add request size limits
- [ ] Implement proper error message sanitization
- [ ] Add security headers

### Documentation

- [ ] Update API documentation
- [ ] Add comprehensive README for development setup
- [ ] Document testing procedures
- [ ] Add deployment guides

### Testing

- [/] Frontend test suite optimization
- [/] E2E test fixes and updates
- [ ] Backend API testing
- [ ] Integration testing
- [ ] Performance testing
- [ ] Security testing

### Deployment

- [ ] Docker containerization
- [ ] CI/CD pipeline setup
- [ ] Production deployment configuration
- [ ] Monitoring and logging setup
