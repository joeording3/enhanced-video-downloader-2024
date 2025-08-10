# Testing Documentation

This document provides a comprehensive overview of testing setup, coverage metrics, quality
indicators, and improvement roadmap for the Enhanced Video Downloader project.

## Overview

This document combines:

- **Testing Setup**: Available fixtures, pytest markers, directory structure, and commands
- **Test Audit**: Coverage metrics, mutation scores, and quality indicators
- **Improvement Roadmap**: Structured approach to improving test quality and coverage

## Development & Code Quality

### Extension Development

The extension is built with TypeScript and compiled to JavaScript. To build the extension:

```bash
# Install dependencies
npm install

# Build TypeScript files
npm run build:ts

# Run TypeScript tests
npm run test:extension:ts

# Run tests with coverage
npm run test:extension:coverage
```

### Running Tests

Use Makefile targets for test execution:

- **Fast unit tests (Python + JS)**: `make test-fast`
- **Slow integration and E2E tests**: `make test-slow`

Unit tests for Python server and extension UI logic can be run with:

```bash
pytest tests/unit --maxfail=1 --disable-warnings -q --cov=server --cov-report=term-missing
```

We use `pytest` for Python server and API tests, and headless browser testing for the Chrome
extension UI (via Playwright).

## Directory Structure

- `tests/unit`: Unit tests for Python modules.
- `tests/integration`: Integration tests for Python API endpoints and CLI commands.
- `tests/extension`: UI tests and headless browser tests for the Chrome extension.

Note: Legacy CLI tests under `tests/unit/test_cli_commands.py` have been removed. CLI tests are
consolidated in `tests/unit/test_cli_consolidated.py`, and legacy imports under
`server/cli_commands/*` intentionally raise ImportError.

### CLI Output Modes (Status Command)

- The status CLI exposes two output styles used by different tests:
  - Multi-line detail (module command `server_command`): prints each process on separate lines:
    `PID <pid>`, `Port <port>`, and `Uptime: <Hh Mm Ss>`; supports `--json` for structured output.
  - Single-line summary (test alias `server`): prints concise summaries per process like
    `PID <pid>, port <port>, uptime <secs>s`; also supports `--json` by delegating to the module
    command.
- Purpose: unit tests verify both human-readable formats across different code paths; integration
  tests typically assert the single-line summaries when invoking the alias.

## Pytest Markers

- `unit`: for fast, isolated unit tests.
- `integration`: for tests involving API, CLI, or multiple components.
- `ui`: for tests verifying extension UI or headless browser flows.

## Available Fixtures (in `tests/conftest.py`)

- `sample_download_request`: A sample payload for download requests.
- `sample_config`: A sample server configuration mapping.
- `app`: A Flask application instance.
- `client`: A Flask test client.
- `runner`: A Click CLI runner (`CliRunner`) for invoking CLI commands.
- `tmp_logs_dir`: A temporary directory for log-related tests.
- `filesystem_state`: A `Path` object for creating temp files/directories.
- `live_server`: Launches the Flask app in a background thread, yielding its base URL.

## Running Tests

### Python Tests

```bash
pytest tests/unit --maxfail=1 --disable-warnings -q --cov=server --cov-report=term-missing
```

### Linting

```bash
ruff check .
npm run lint:all
```

### Extension UI (Headless Browser)

Tests for the Chrome extension UI (popup and options) using Jest with Playwright.

```bash
npm install
npm run test:extension:ts
npm run test:extension:coverage
```

### Generating JS Coverage for Extension

E2E tests now collect JavaScript coverage for extension scripts via Playwright. After running
`npm run test:extension:coverage`, a coverage report will be generated at
`coverage/frontend/playwright-coverage.json`. You can integrate this report with your Istanbul-based
coverage toolchain.

## Flask Server Live Testing

To run live server tests (using `live_server` fixture):

```bash
pytest tests/unit/test_<name>.py
```

## Test Audit & Coverage Metrics

Note: The detailed redundancy audit previously captured in `reports/test_audit_report.md` has been
consolidated into this living document. For a high-level snapshot, see
`reports/test_audit_summary.md`.

### Test Responsibility Matrix

| Module                             | Test Files                                   | Coverage % | Mutation Score | Owner | Notes |
| ---------------------------------- | -------------------------------------------- | ---------- | -------------- | ----- | ----- |
| `server/api/download_bp.py`        | `tests/integration/test_download_bp.py`      | TBD        | TBD            | TBD   |       |
| `server/api/status_bp.py`          | `tests/integration/test_status_endpoint.py`  | TBD        | TBD            | TBD   |       |
| `server/api/history_bp.py`         | `tests/integration/test_history_endpoint.py` | TBD        | TBD            | TBD   |       |
| `server/api/config_bp.py`          | `tests/integration/test_config_endpoint.py`  | TBD        | TBD            | TBD   |       |
| `server/api/debug_bp.py`           | `tests/unit/test_debug_bp.py`                | TBD        | TBD            | TBD   |       |
| `server/api/logs_bp.py`            | `tests/integration/test_logs_endpoint.py`    | TBD        | TBD            | TBD   |       |
| `server/api/logs_manage_bp.py`     | `tests/integration/test_logs_manage_bp.py`   | TBD        | TBD            | TBD   |       |
| `server/api/restart_bp.py`         | `tests/unit/test_restart_bp.py`              | TBD        | TBD            | TBD   |       |
| `server/api/health_bp.py`          | `tests/integration/test_health_endpoint.py`  | TBD        | TBD            | TBD   |       |
| `extension/src/background.ts`      | `tests/extension/background-logic.test.ts`   | TBD        | TBD            | TBD   |       |
| `extension/src/content.ts`         | `tests/extension/content.behavior.test.js`   | TBD        | TBD            | TBD   |       |
| `extension/src/popup.ts`           | `tests/extension/popup.test.ts`              | TBD        | TBD            | TBD   |       |
| `extension/src/options.ts`         | `tests/extension/options.unit.test.ts`       | TBD        | TBD            | TBD   |       |
| `extension/src/history.ts`         | `tests/extension/history.util.test.ts`       | TBD        | TBD            | TBD   |       |
| `extension/src/lib/utils.ts`       | `tests/extension/utils.test.ts`              | TBD        | TBD            | TBD   |       |
| `extension/src/youtube_enhance.ts` | `tests/extension/youtube_enhance.test.ts`    | TBD        | TBD            | TBD   |       |

### Coverage Targets

- **Python Server**: 80% (current: 83.0%)
- **Frontend Extension**: 80% (current: 0.0%)
- **Overall**: 80% (current: 45.34%)

### Test Classification

#### Test Types

- **Unit**: Isolated function/module tests with mocked dependencies
- **Integration**: API endpoint tests with real Flask app
- **E2E**: Full browser automation with Playwright

#### Test Quality Indicators

- **Black-box**: Tests behavior without knowledge of implementation
- **White-box**: Tests internal logic and edge cases
- **Mock Usage**: Extent of dependency mocking
- **Brittle Tests**: Tests that fail due to implementation details rather than behavior

## Mutation Testing Status

### Python (Mutmut)

- **Status**: Configured and integrated in CI (`.github/workflows/mutmut.yml`)
- **Target Score**: 80%
- **Configuration**: `mutmut.ini`
- **How to run locally:**

  ```bash
  mutmut run --paths-to-mutate=server/
  mutmut results
  ```

- **CI Enforcement:**
  - Mutmut runs on every push and PR to `main` and `new` branches.
  - Fails CI if mutation score falls below 80% (to be enforced via CI script).
- **Latest Mutation Score:** TBD (run `mutmut results` after a full run)

### JavaScript/TypeScript (Stryker)

- **Status**: Configured and integrated in CI (`.github/workflows/mutation-js.yml`)
- **Target Score**: 80% (break threshold: 70%)
- **Configuration**: `stryker.conf.js`
- **How to run locally:**

  ```bash
  npm run test:mutation:js
  # or for all mutation tests (JS+Python):
  npm run test:mutation:all
  ```

- **CI Enforcement:**
  - Stryker runs on every push and PR to `main` and `new` branches.
  - Fails CI if mutation score falls below 70% (see `break` threshold in config).
- **Latest Mutation Score:** 38.24% (2025-01-27) - **BELOW THRESHOLD**

#### Background Logic Mutation Coverage Notes (supersedes older per-file report)

The prior standalone analysis for `extension/src/background-logic.ts` (now removed) identified five
gaps. Current tests address these areas:

- Error message validation: Tests assert exact console prefix and error messages in
  `handleSetConfig` failures (see `extension/src/__tests__/background-logic.test.ts` "handles API
  service error", "handles storage service error", and "handles unknown error type").
- Timeout handling: Cached-port timeout path is exercised and results verified ("handles timeout
  during cached port check").
- Boundary conditions: Batch scanning over a widened range validates loop boundaries and progress
  callback ("handles batch processing and progress callback").
- Exception handling: Rejected `checkStatus` calls are handled and return `null` ("handles error
  during port checking").
- Null/undefined checks: No-port-found path (undefined intermediate, null return) and successful
  paths covered ("returns null if no port found").

Note: These notes replace the removed `reports/mutation_analysis_report.md`. All ongoing mutation
metrics live in this document.

### Current Mutation Scores (2025-01-27)

#### JavaScript/TypeScript Files

| File                  | Mutation Score | Covered % | Killed | Survived | No Coverage |
| --------------------- | -------------- | --------- | ------ | -------- | ----------- |
| All files             | 38.24%         | 58.97%    | 733    | 519      | 686         |
| lib/utils.ts          | 68.09%         | 74.42%    | 32     | 11       | 4           |
| background-helpers.ts | 100.00%        | 100.00%   | 32     | 0        | 0           |
| background-logic.ts   | 48.21%         | 69.23%    | 26     | 12       | 17          |
| background.ts         | 53.19%         | 53.19%    | 25     | 22       | 0           |
| content.ts            | 60.00%         | 60.00%    | 164    | 118      | 119         |
| history.ts            | 55.93%         | 66.81%    | 151    | 75       | 44          |
| options.ts            | 53.23%         | 63.77%    | 132    | 75       | 41          |
| popup.ts              | 48.76%         | 67.35%    | 196    | 95       | 111         |
| youtube_enhance.ts    | 100.00%        | 100.00%   | 28     | 0        | 0           |

#### Python Files

- **Status**: Not yet run - need to execute `mutmut run --paths-to-mutate=server/`

### Mutation Score Thresholds

- **Python (Mutmut):** 80% minimum required (CI will fail below this)
- **JS/TS (Stryker):** 80% target, 70% minimum required (CI will fail below this)

### How to interpret mutation scores

- **Mutation Score**: Percentage of mutants killed by the test suite. Low scores indicate weak or
  missing tests.
- **Improvement**: Add or strengthen tests for code that survives mutation.

## Test Improvement Roadmap

### Executive Summary

The test audit revealed significant gaps in test quality and coverage, particularly in frontend
JavaScript/TypeScript modules. The overall mutation score of 38.24% for JS/TS files is well below
the 80% target threshold, indicating weak tests that need immediate attention.

### Critical Findings

- **Frontend Mutation Score**: 38.24% (target: 80%, minimum: 70%)
- **Python Mutation Testing**: Not yet executed - needs baseline establishment
- **Coverage Gaps**: Several key modules have low coverage and poor mutation scores
- **Test Quality**: Many tests rely on stub verification rather than behavior verification

## Priority 1: Critical Low Mutation Score Files (Immediate Action Required)

### 1.1 `background.ts` - Mutation Score: 53.19% (IMPROVED)

**Current State**: Significant improvement from 1.38% to 53.19%, but still below 70% target.

**Action Plan**:

- [ ] **Week 1**: Continue improving tests for remaining uncovered functions
- [ ] **Week 1**: Add tests for Chrome API interactions (storage, messaging, tabs)
- [ ] **Week 2**: Implement integration tests for background script lifecycle
- [ ] **Week 2**: Add tests for error handling and edge cases
- [ ] **Target**: Achieve ≥80% coverage and ≥70% mutation score

**Success Criteria**:

- All public functions have unit tests
- Chrome API interactions are properly mocked and tested
- Error conditions are exercised
- Background script startup/shutdown is tested

### 1.2 `youtube_enhance.ts` - Mutation Score: 100.00% (COMPLETED)

**Current State**: Perfect coverage achieved - no further action needed.

### 1.3 `background-helpers.ts` - Mutation Score: 100.00% (COMPLETED)

**Current State**: Perfect coverage achieved - no further action needed.

### 1.4 `background-logic.ts` - Mutation Score: 48.21% (HIGH PRIORITY)

**Current State**: Moderate coverage (69.23%) but poor mutation score indicates weak test
assertions.

**Action Plan**:

- [ ] **Week 1**: Strengthen existing tests with better assertions
- [ ] **Week 1**: Add tests for edge cases and error conditions
- [ ] **Week 2**: Test utility functions with various input combinations
- [ ] **Week 2**: Add integration tests for helper function usage
- [ ] **Target**: Achieve ≥80% coverage and ≥70% mutation score

**Success Criteria**:

- All helper functions have strong behavioral tests
- Edge cases and error conditions are covered
- Tests verify actual behavior, not just function calls
- Integration with background script is tested

### 1.5 `content.ts` - Mutation Score: 60.00% (HIGH PRIORITY)

**Current State**: Moderate coverage but poor mutation score indicates weak test quality.

**Action Plan**:

- [ ] **Week 1**: Expand unit tests for all enhancement functions
- [ ] **Week 1**: Add tests for YouTube-specific DOM manipulation
- [ ] **Week 2**: Test integration with content script messaging
- [ ] **Week 2**: Add tests for different YouTube page layouts
- [ ] **Target**: Achieve ≥80% coverage and ≥70% mutation score

### 1.6 `popup.ts` - Mutation Score: 48.76% (HIGH PRIORITY)

**Current State**: Moderate coverage (67.35%) but poor mutation score indicates weak test
assertions.

**Action Plan**:

- [ ] **Week 1**: Strengthen existing tests with better assertions
- [ ] **Week 1**: Add tests for edge cases and error conditions
- [ ] **Week 2**: Test utility functions with various input combinations
- [ ] **Week 2**: Add integration tests for helper function usage
- [ ] **Target**: Achieve ≥80% coverage and ≥70% mutation score

## Priority 2: Python Mutation Testing Baseline (Week 1-2)

### 2.1 Establish Python Mutation Testing Baseline

**Current State**: Python mutation testing not yet executed.

**Action Plan**:

- [ ] **Week 1**: Run initial `mutmut run --paths-to-mutate=server/`
- [ ] **Week 1**: Analyze results and identify low-scoring modules
- [ ] **Week 2**: Create targeted improvement plan for Python modules
- [ ] **Week 2**: Set up CI enforcement for 80% mutation score threshold

**Success Criteria**:

- Baseline mutation scores established for all Python modules
- CI pipeline enforces 80% mutation score threshold
- Low-scoring modules identified and prioritized

## Priority 3: Test Quality Improvements (Week 2-4)

### 3.1 Refactor Brittle Tests

**Current State**: Many tests rely on stub verification rather than behavior verification.

**Action Plan**:

- [ ] **Week 2**: Audit CLI unit tests for stub-only assertions
- [ ] **Week 3**: Replace stub verification with behavior verification
- [ ] **Week 3**: Remove tests that only verify function calls
- [ ] **Week 4**: Implement realistic in-memory shims for file I/O and network calls

**Success Criteria**:

- No tests rely solely on stub verification
- All tests verify actual behavior or side effects
- File I/O and network calls use realistic shims
- Test maintainability improved

### 3.2 Standardize Test Patterns

**Current State**: Inconsistent test patterns across different modules.

**Action Plan**:

- [ ] **Week 2**: Create test pattern documentation
- [ ] **Week 3**: Standardize test structure and naming conventions
- [ ] **Week 4**: Implement consistent mock usage patterns
- [ ] **Week 4**: Create test utility functions for common patterns

**Success Criteria**:

- Consistent test structure across all modules
- Standardized naming conventions
- Reusable test utilities for common patterns
- Clear documentation of test patterns

## Priority 4: Coverage Expansion (Week 3-6)

### 4.1 Edge Case Testing

**Current State**: Limited edge case coverage in many modules.

**Action Plan**:

- [ ] **Week 3**: Identify critical edge cases in core modules
- [ ] **Week 4**: Add tests for error conditions and boundary values
- [ ] **Week 5**: Test concurrent operations and race conditions
- [ ] **Week 6**: Add stress tests for high-load scenarios

**Success Criteria**:

- All critical edge cases are tested
- Error conditions are comprehensively covered
- Concurrent operations are tested
- Performance under load is verified

### 4.2 Integration Test Expansion

**Current State**: Good integration test coverage but room for improvement.

**Action Plan**:

- [ ] **Week 4**: Add integration tests for complex workflows
- [ ] **Week 5**: Test API endpoint combinations and sequences
- [ ] **Week 6**: Add end-to-end tests for complete user journeys
- [ ] **Week 6**: Test cross-module interactions

**Success Criteria**:

- Complex workflows are tested end-to-end
- API endpoint combinations are verified
- Complete user journeys are covered
- Cross-module interactions are tested

## Priority 5: Ongoing Maintenance (Continuous)

### 5.1 Mutation Score Monitoring

**Action Plan**:

- [ ] **Weekly**: Monitor mutation scores in CI
- [ ] **Bi-weekly**: Review low-scoring modules
- [ ] **Monthly**: Update improvement priorities
- [ ] **Quarterly**: Comprehensive mutation testing audit

### 5.2 Test Maintenance

**Action Plan**:

- [ ] **Weekly**: Review test failures and flaky tests
- [ ] **Bi-weekly**: Update test documentation
- [ ] **Monthly**: Refactor tests as needed
- [ ] **Quarterly**: Comprehensive test quality review

## Implementation Timeline

### Phase 1: Critical Fixes (Weeks 1-2)

- Focus on `background-logic.ts`, `content.ts`, and `popup.ts`
- Establish Python mutation testing baseline
- Set up CI enforcement

### Phase 2: Quality Improvements (Weeks 3-4)

- Refactor brittle tests
- Standardize test patterns
- Improve test maintainability

### Phase 3: Coverage Expansion (Weeks 5-6)

- Add edge case testing
- Expand integration tests
- Implement comprehensive test coverage

### Phase 4: Ongoing Maintenance (Continuous)

- Monitor mutation scores
- Maintain test quality
- Regular audits and improvements

## Success Metrics

### Quantitative Goals

- **Frontend Mutation Score**: 38.24% → 80% (target)
- **Python Mutation Score**: TBD → 80% (target)
- **Overall Test Coverage**: 45.34% → 80% (target)
- **Test Execution Time**: <60 seconds for unit tests

### Qualitative Goals

- No brittle tests in codebase
- Consistent test patterns across modules
- Comprehensive edge case coverage
- Strong integration test coverage

## Risk Mitigation

### Technical Risks

- **Risk**: Mutation testing reveals extensive test gaps
  - **Mitigation**: Prioritize critical modules first, implement incrementally
- **Risk**: Test refactoring breaks existing functionality
  - **Mitigation**: Maintain comprehensive test suites, use feature flags

### Timeline Risks

- **Risk**: Critical fixes take longer than expected
  - **Mitigation**: Focus on highest-impact modules first, adjust timeline as needed
- **Risk**: Resource constraints limit progress
  - **Mitigation**: Prioritize by business impact, implement incrementally

## Test Inventory and Classification

This table inventories and classifies all test files by confidence and maintainability. Use this as
a living reference for test quality and future improvements.

| Test File                                          | Type        | Target Module/Component | Test Style | Mocks/Stubs | Confidence | Maintainability | Brittle Markers |
| -------------------------------------------------- | ----------- | ----------------------- | ---------- | ----------- | ---------- | --------------- | --------------- |
| **Python Unit Tests**                              |             |                         |            |             |            |                 |                 |
| tests/unit/test_cli_error_cases.py                 | Unit        | CLI error handling      | White-box  | Y           | High       | High            | None            |
| tests/unit/test_download_api_priority.py           | Unit        | Download API            | White-box  | Y           | High       | High            | None            |
| tests/unit/test_cli_helpers_additional.py          | Unit        | CLI helpers             | White-box  | Y           | High       | High            | None            |
| tests/unit/test_cli.py                             | Unit        | CLI                     | White-box  | Y           | High       | High            | None            |
| tests/unit/test_cli_group.py                       | Unit        | CLI group               | White-box  | Y           | High       | High            | None            |
| tests/unit/test_cleanup.py                         | Unit        | Cleanup logic           | White-box  | Y           | High       | High            | None            |
| tests/unit/test_cli_helpers_resume_incomplete.py   | Unit        | CLI helpers             | White-box  | Y           | High       | High            | None            |
| tests/unit/test_cli_helpers_incomplete.py          | Unit        | CLI helpers             | White-box  | Y           | High       | High            | None            |
| tests/unit/test_debug_bp.py                        | Unit        | Debug API               | White-box  | Y           | High       | High            | None            |
| tests/unit/test_downloads_opts.py                  | Unit        | Download options        | White-box  | Y           | High       | High            | None            |
| tests/unit/test_extraction_rules.py                | Unit        | Extraction rules        | White-box  | Y           | High       | High            | None            |
| tests/unit/test_lock_module.py                     | Unit        | Locking                 | White-box  | Y           | High       | High            | None            |
| tests/unit/test_logs_manage_bp.py                  | Unit        | Logs management         | White-box  | Y           | High       | High            | None            |
| tests/unit/test_cli_helpers_extended.py            | Unit        | CLI helpers             | White-box  | Y           | High       | High            | None            |
| tests/unit/test_utils_extended.py                  | Unit        | Utils                   | White-box  | Y           | High       | High            | None            |
| tests/unit/test_find_downloads_to_resume.py        | Unit        | Resume logic            | White-box  | Y           | High       | High            | None            |
| tests/unit/test_config_env.py                      | Unit        | Config                  | White-box  | Y           | High       | High            | None            |
| tests/unit/test_cli_run_helpers.py                 | Unit        | CLI helpers             | White-box  | Y           | High       | High            | None            |
| tests/unit/test_restart_bp.py                      | Unit        | Restart API             | White-box  | Y           | High       | High            | None            |
| tests/unit/test_cli_commands.py                    | Unit        | CLI commands            | White-box  | Y           | High       | High            | None            |
| tests/unit/test_logging_setup.py                   | Unit        | Logging                 | White-box  | Y           | High       | High            | None            |
| tests/unit/test_main_helpers.py                    | Unit        | Main helpers            | White-box  | Y           | High       | High            | None            |
| tests/unit/test_ytdlp_build_opts.py                | Unit        | YTDLP options           | White-box  | Y           | High       | High            | None            |
| tests/unit/test_schemas.py                         | Unit        | Schemas                 | White-box  | Y           | High       | High            | None            |
| tests/unit/test_cli_resume_helpers.py              | Unit        | CLI helpers             | White-box  | Y           | High       | High            | None            |
| tests/unit/test_ytdlp_helpers.py                   | Unit        | YTDLP helpers           | White-box  | Y           | High       | High            | None            |
| tests/unit/test_history_bp.py                      | Unit        | History API             | White-box  | Y           | High       | High            | None            |
| tests/unit/test_ytdlp_progress_hook.py             | Unit        | YTDLP progress          | White-box  | Y           | High       | High            | None            |
| tests/unit/test_config_bp_routes.py                | Unit        | Config API              | White-box  | Y           | High       | High            | None            |
| tests/unit/test_gallery_dl.py                      | Unit        | Gallery-dl              | White-box  | Y           | High       | High            | None            |
| tests/unit/test_cli_helpers_fixtures.py            | Unit        | CLI helpers             | White-box  | Y           | High       | High            | None            |
| tests/unit/test_downloads_resume_logic.py          | Unit        | Resume logic            | White-box  | Y           | High       | High            | None            |
| tests/unit/test_main_handlers.py                   | Unit        | Main handlers           | White-box  | Y           | High       | High            | None            |
| tests/unit/test_download_api.py                    | Unit        | Download API            | White-box  | Y           | High       | High            | None            |
| tests/unit/test_config_module.py                   | Unit        | Config                  | White-box  | Y           | High       | High            | None            |
| tests/unit/test_cli_helpers_failed.py              | Unit        | CLI helpers             | White-box  | Y           | High       | High            | None            |
| tests/unit/test_status_endpoints.py                | Unit        | Status API              | White-box  | Y           | High       | High            | None            |
| tests/unit/test_cli_helpers.py                     | Unit        | CLI helpers             | White-box  | Y           | High       | High            | None            |
| tests/unit/test_config_additional.py               | Unit        | Config                  | White-box  | Y           | High       | High            | None            |
| tests/unit/test_video_downloader_server.py         | Unit        | Server                  | White-box  | Y           | High       | High            | None            |
| tests/unit/test_history_module.py                  | Unit        | History                 | White-box  | Y           | High       | High            | None            |
| tests/unit/test_utils.py                           | Unit        | Utils                   | White-box  | Y           | High       | High            | None            |
| tests/unit/test_ytdlp_history_extension.py         | Unit        | YTDLP history           | White-box  | Y           | High       | High            | None            |
| tests/unit/test_logs_bp.py                         | Unit        | Logs API                | White-box  | Y           | High       | High            | None            |
| tests/unit/test_handle_ytdlp_download.py           | Unit        | YTDLP handler           | White-box  | Y           | High       | High            | None            |
| tests/unit/test_debug_bp_unit.py                   | Unit        | Debug API               | White-box  | Y           | High       | High            | None            |
| tests/unit/test_config_class.py                    | Unit        | Config                  | White-box  | Y           | High       | High            | None            |
| tests/unit/test_resume_downloads.py                | Unit        | Resume logic            | White-box  | Y           | High       | High            | None            |
| tests/unit/cli/test_resume.py                      | Unit        | CLI resume              | White-box  | Y           | High       | High            | None            |
| tests/unit/cli/test_init.py                        | Unit        | CLI init                | White-box  | Y           | High       | High            | None            |
| tests/unit/cli/test_serve.py                       | Unit        | CLI serve               | White-box  | Y           | High       | High            | None            |
| tests/unit/cli/test_history.py                     | Unit        | CLI history             | White-box  | Y           | High       | High            | None            |
| tests/unit/cli/test_status.py                      | Unit        | CLI status              | White-box  | Y           | High       | High            | None            |
| tests/unit/cli/test_download.py                    | Unit        | CLI download            | White-box  | Y           | High       | High            | None            |
| tests/unit/cli/test_utils.py                       | Unit        | CLI utils               | White-box  | Y           | High       | High            | None            |
| **Python Integration Tests**                       |             |                         |            |             |            |                 |                 |
| tests/integration/test_cli.py                      | Integration | CLI                     | Black-box  | N           | High       | High            | None            |
| tests/integration/test_status_endpoint.py          | Integration | Status API              | Black-box  | N           | High       | High            | None            |
| tests/integration/test_priority_endpoint.py        | Integration | Priority API            | Black-box  | N           | High       | High            | None            |
| tests/integration/test_logs_endpoint.py            | Integration | Logs API                | Black-box  | N           | High       | High            | None            |
| tests/integration/test_download_bp_additional.py   | Integration | Download API            | Black-box  | N           | High       | High            | None            |
| tests/integration/test_api_error_handling.py       | Integration | API                     | Black-box  | N           | High       | High            | None            |
| tests/integration/test_cli_integration.py          | Integration | CLI                     | Black-box  | N           | High       | High            | None            |
| tests/integration/test_history_endpoint.py         | Integration | History API             | Black-box  | N           | High       | High            | None            |
| tests/integration/test_api_integration.py          | Integration | API                     | Black-box  | N           | High       | High            | None            |
| tests/integration/test_concurrent_operations.py    | Integration | Concurrency             | Black-box  | N           | High       | High            | None            |
| tests/integration/test_download_bp.py              | Integration | Download API            | Black-box  | N           | High       | High            | None            |
| tests/integration/test_health_endpoint.py          | Integration | Health API              | Black-box  | N           | High       | High            | None            |
| tests/integration/test_config_endpoint.py          | Integration | Config API              | Black-box  | N           | High       | High            | None            |
| tests/integration/test_debug_paths.py              | Integration | Debug API               | Black-box  | N           | High       | High            | None            |
| tests/integration/test_clear_status_concurrency.py | Integration | Status concurrency      | Black-box  | N           | High       | High            | None            |
| tests/integration/test_cancel_endpoint.py          | Integration | Cancel API              | Black-box  | N           | High       | High            | None            |
| tests/integration/test_pause_resume_endpoints.py   | Integration | Pause/Resume API        | Black-box  | N           | High       | High            | None            |
| **Frontend JS/TS Unit Tests**                      |             |                         |            |             |            |                 |                 |
| extension/src/**tests**/background-queue.test.ts   | Unit        | Background queue        | White-box  | Y           | High       | High            | None            |
| extension/src/**tests**/background-logic.test.ts   | Unit        | Background logic        | White-box  | Y           | High       | High            | None            |
| tests/extension/popup.queue.test.ts                | Unit        | Popup queue             | White-box  | Y           | High       | High            | None            |
| tests/extension/options.unit.test.ts               | Unit        | Options                 | White-box  | Y           | High       | High            | None            |
| tests/extension/history.script.test.ts             | Unit        | History script          | White-box  | Y           | High       | High            | None            |
| tests/extension/content.ui.test.ts                 | Unit        | Content UI              | White-box  | Y           | High       | High            | None            |
| tests/extension/background-helpers.test.ts         | Unit        | Background helpers      | White-box  | Y           | High       | High            | None            |
| tests/extension/history.util.test.ts               | Unit        | History utils           | White-box  | Y           | High       | High            | None            |
| tests/extension/popup.advanced.test.js             | Unit        | Popup advanced          | White-box  | Y           | High       | High            | None            |
| tests/extension/content.test.ts                    | Unit        | Content                 | White-box  | Y           | High       | High            | None            |
| tests/extension/popup.util.test.ts                 | Unit        | Popup utils             | White-box  | Y           | High       | High            | None            |
| tests/extension/popup-settings.test.ts             | Unit        | Popup settings          | White-box  | Y           | High       | High            | None            |
| tests/extension/options.errorHistory.test.ts       | Unit        | Options error history   | White-box  | Y           | High       | High            | None            |
| tests/extension/content-logic.test.ts              | Unit        | Content logic           | White-box  | Y           | High       | High            | None            |
| tests/extension/background-logic.test.ts           | Unit        | Background logic        | White-box  | Y           | High       | High            | None            |
| tests/extension/popup.test.ts                      | Unit        | Popup                   | White-box  | Y           | High       | High            | None            |
| tests/extension/history.render.test.js             | Unit        | History render          | White-box  | Y           | High       | High            | None            |
| tests/extension/content.behavior.test.ts           | Unit        | Content behavior        | White-box  | Y           | High       | High            | None            |
| tests/extension/youtube_enhance.test.ts            | Unit        | YouTube enhance         | White-box  | Y           | High       | High            | None            |
| tests/extension/utils.test.ts                      | Unit        | Utils                   | White-box  | Y           | High       | High            | None            |
| tests/extension/test_extension_ui_e2e.spec.ts      | E2E         | Extension UI            | Black-box  | N           | High       | High            | None            |
| tests/extension/content.util.test.ts               | Unit        | Content utils           | White-box  | Y           | High       | High            | None            |
| tests/extension/content.extra.test.ts              | Unit        | Content extra           | White-box  | Y           | High       | High            | None            |
| tests/extension/background.util.test.js            | Unit        | Background utils        | White-box  | Y           | High       | High            | None            |
| tests/extension/content.state.test.js              | Unit        | Content state           | White-box  | Y           | High       | High            | None            |

**Summary:**

- All core modules and features are covered by unit and integration tests.
- Confidence and maintainability are generally high for current (non-legacy) tests.
- No brittle markers (skips, console, storage, timing) found in current tests.
- Focus on improving mutation scores for frontend modules.

## Test Refactoring Plan

### Findings

- Many CLI unit tests (e.g., in `tests/unit/cli/`) use mocks and only assert that stubs were called
  (e.g., `mock_post.assert_called_once()`).
- Integration tests and some unit tests use `monkeypatch` or `patch` to replace functions, which can
  mask real behavior if not paired with output/state assertions.
- Some Jest/TS tests rely on global mocks for Chrome APIs and may not fully verify UI or logic
  changes.
- No direct use of `console.log`/`console.assert` in test assertions was found, but some tests may
  still rely on console output or log inspection.

### Next Steps

- Refactor CLI unit tests to verify side effects, outputs, or state changes in addition to stub
  calls. Remove tests that only assert stub calls and do not verify real behavior.
- Replace broad mocks/monkeypatching with more targeted or in-memory shims where possible,
  especially for file I/O, network, or process management.
- For UI/JS tests, prefer DOM/response assertions over console or log-based checks.
- Track progress in this section and update as tests are refactored or removed.

## CI Job Configuration

### Test Quality Workflow

The project includes a dedicated workflow (`.github/workflows/test-quality.yml`) that enforces test
quality standards:

#### Checks Performed

1. **Skipped Test Detection**:

   - Scans for `@pytest.mark.skip` and `@pytest.mark.xfail` in Python tests
   - Scans for `.skip` and `.only` in JavaScript/TypeScript tests
   - Fails CI if unjustified skips are found (allows `# TODO: Remove skip` comments)

2. **Coverage Threshold Enforcement**:

   - Runs `npm run test:coverage:check` to verify coverage meets 80% threshold
   - Fails CI if coverage drops below required levels

3. **Mutation Testing Thresholds**:
   - Mutation testing workflows (`.github/workflows/mutation-js.yml` and
     `.github/workflows/mutmut.yml`) run on every PR
   - JS/TS: Fails if mutation score < 70%
   - Python: Fails if mutation score < 80%

#### Workflow Triggers

- Runs on all pushes to `main` and `new` branches
- Runs on all pull requests to `main` and `new` branches

#### Integration with PR Process

- PRs with public API changes require completion of the Test Audit section
- CI failures block merging until resolved
- Manual review required for any new skip markers

## Manual Mutation Testing for High-Risk Python Modules

For modules where automated mutation testing is impractical, we implement manual mutation tests (see
`tests/unit/test_mutation_cli.py`). These simulate common mutation types (logic inversion,
string/return value changes, etc.) and verify that the suite would catch them. This complements
property-based and coverage-driven testing for critical CLI and helper logic.

## Test Maintenance

### Last Updated

- **Coverage Report**: 2025-01-27
- **Mutation Scores**: 2025-01-27
- **Test Classification**: 2025-01-27

### Next Review

- **Coverage**: Monthly
- **Mutation Testing**: Weekly
- **Test Classification**: Quarterly

## Notes

- Tests marked as "brittle" should be refactored to use realistic in-memory shims
- Console-based tests should be converted to DOM/response assertions where possible
- Coverage gaps below 80% require immediate attention
- Mutation scores below 80% indicate weak tests that need strengthening

---

_Last updated: 2025-01-27_
