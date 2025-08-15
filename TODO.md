# Enhanced Video Downloader - TODO

Urgent Tasks:

- [ ] media detection - continued improvements

  - [ ] examine [yt-dlp](https://github.com/yt-dlp/yt-dlp) for detection improvements and patterns
  - [ ] examine [gallery-dl](https://github.com/mikf/gallery-dl) for detection improvements and
        patterns
  - [x] Add more player API hooks (Facebook, Wistia, VK) and dynamic media attachment polling
  - **Status**: ✅ COMPLETE - All major platforms supported with postMessage triggers and comprehensive media attachment polling

- [x] Client must not send URL-based dedupe token as `download_id`; omit field and let server
  generate ID
  - **Status**: ✅ COMPLETE - Server generates downloadId automatically
- [x] Add unused-code checks to CI and local workflows
  - **Status**: ✅ COMPLETE - `make lint-unused` target available

- [/] E2E Media Detection Matrix robustness

  - [x] Add iframe postMessage-based player API triggers (YouTube, Vimeo, Dailymotion, Twitch,
    Streamable)
    - **Status**: ✅ COMPLETE - All platforms supported with appropriate postMessage formats
  - [x] Invoke domain-specific selectors in frames; repeat autoplay attempts and direct media clicks
    - **Status**: ✅ COMPLETE - Per-domain selectors and autoplay logic implemented
  - [x] Support per-domain timeouts via `tests/extension/media-domains.json` and wait for
    `networkidle`
    - **Status**: ✅ COMPLETE - Domain-specific timeouts and networkidle waits implemented
  - [x] Optional: whitelist stable URLs for CI and gate broader list behind manual flag (defaults to
    stable set; full set with `EVD_MEDIA_SITES_WIDE=true`)
    - **Status**: ✅ COMPLETE - `EVD_MEDIA_SITES_WIDE=true` environment variable controls stable vs. wide matrix
  - [x] Global ad iframe ignore via `tests/extension/ad-origins.json`; skip ad frames in autoplay,
    detection, and iframe API triggers
    - **Status**: ✅ COMPLETE - Comprehensive ad origins list with frame filtering
  - [x] Add detailed `[MATRIX][DBG]` logs for selector clicks, iframe API triggers, media readiness,
    networkidle waits, and polling iterations
    - **Status**: ✅ COMPLETE - Extensive debug logging throughout matrix tests
  - [x] Honor per-domain `consent_selectors` during overlay cleanup (main frame and iframes)
    - **Status**: ✅ COMPLETE - Consent selector handling in both main frame and iframes
  - [x] JWPlayer programmatic play and jw postMessage triggers for JW-based sites; added targeted
    selectors
    - **Status**: ✅ COMPLETE - JWPlayer support with postMessage and selector-based triggers
  - [x] Hypnotube-specific container clicks and scroll-into-view; increase JW-site timeouts
    - **Status**: ✅ COMPLETE - HypnoTube-specific heuristics and extended timeouts
  - [x] Incremental runners: `EVD_MEDIA_URL`/`EVD_MEDIA_FILTER` and `scripts/run_matrix_seq.js` for
    sequential per-URL runs with summary
    - **Status**: ✅ COMPLETE - Environment variables and sequential runner script implemented
  - [x] Navigation skip-on-failure for present URLs to avoid aborting the wide matrix on transient
    network errors
    - **Status**: ✅ COMPLETE - Graceful handling of navigation failures
  - [x] Increase headful matrix timeout to 240s; bump Twitch and other JW-site timeouts
  - **Status**: ✅ COMPLETE - Jest timeout increased to 240s, Twitch timeouts increased to 60s
  - [x] Added more player API hooks (Facebook, Wistia, Brightcove, TikTok, Twitter/X, Reddit,
    SoundCloud); dynamic media attachment polling retained.
    - **Status**: ✅ COMPLETE - All major platforms supported
  - [x] Makefile targets: `test-media-wide` (wide run) and `matrix-seq` (sequential runner with
    logs).
    - **Status**: ✅ COMPLETE - Both targets implemented
  - [x] Extend ad-origins from uBlock Origin lists (script + Make target in place).
    - **Status**: ✅ COMPLETE - Ad origins list extended with uBlock Origin data
  - [x] Add VK player API hooks.
    - **Status**: ✅ COMPLETE - VK postMessage triggers implemented
  - [x] Add domain-specific scroll-and-click heuristics where needed.
    - **Status**: ✅ COMPLETE - Per-domain heuristics implemented
  - [x] Parameterized per-URL subtests for matrix (present/absent) with per-URL dynamic timeouts and
    domain-aware consent selectors applied inside iframes
    - **Status**: ✅ COMPLETE - Full parameterization with dynamic timeouts and consent handling
  - [x] Added detailed HypnoTube diagnostics and heuristics (player-area clicks, JW/video.js
    readiness probes, inline script/performance scans, embed fallback)
    - **Status**: ✅ COMPLETE - Cookie injection, embed-first detection, and inline script parsing implemented
  - [x] HypnoTube: watch pages often lack jwplayer/video.js when unauthenticated. Proceed with
        cookie-based auth for tests: inject cookies via `EVD_HYPNOTUBE_COOKIES_JSON`, attempt early
        embed-first detection, and parse inline `jwplayer.setup(...)` sources as a detection signal
        - **Status**: ✅ COMPLETE - Cookie injection, embed-first detection, and enhanced jwplayer.setup parsing implemented
  - [x] Keep CI on stable set and document wide runs policy in `tests/testing.md`.
    - **Status**: ✅ COMPLETE - Wide runs policy documented in tests/testing.md with CI guidelines

- [ ] Wire into `make all`/`check` gates and CI once noise baseline is reviewed
  - [/] Content: handle transient storage/messaging invalidation cleanly
    <!-- working-on: content storage/messaging guards -->
    - [x] `getButtonState()` treats "Extension context invalidated" as benign and falls back to
      defaults without noisy logs
      - **Status**: ✅ COMPLETE - Graceful handling of extension context invalidation
    - [x] Guard `chrome.runtime.sendMessage` when runtime is unavailable; emit concise error and
      exit gracefully
      - **Status**: ✅ COMPLETE - Runtime message guards implemented
    - [x] Monitor real-site logs for any remaining "undefined" messages and normalize
      - **Status**: ✅ COMPLETE - Added defensive validation to DOM manager methods to prevent undefined key logging
- [ ] Tighten ignore/exclude usage across tooling
    <!-- working-on: ignore-audit follow-ups -->
  - [x] Prune inline suppressions: add rationale or remove (tracked by `tmp/ignores_inline.csv`)
    - **Status**: ✅ COMPLETE - Inline suppressions tracked and documented
  - [x] Trim per-file ignores under tests once noise is addressed
    - **Status**: ✅ COMPLETE - Per-file ignores cleaned up
  <!-- working-on: api-json-errors -->
- [x] Reduce duplicate startup logs: add one-time guard in `server/__init__.py:create_app` to log
  "Server application initialized..." only once per process.
  - **Status**: ✅ COMPLETE - One-time startup logging implemented
- [x] Make yt-dlp options parsing robust: accept JSON strings and Pydantic models in
  `server/downloads/ytdlp.py` for `yt_dlp_options`; keep safe defaults when invalid.
  - **Status**: ✅ COMPLETE - Robust parsing with fallbacks implemented
- [ ] Replace silent `pass` blocks with logging/handling in:
  - [x] `server/cli_helpers.py` (loops and maintenance utils)
    - **Status**: ✅ COMPLETE - Added logging to silent exception handler for uptime calculation
  - [x] `server/cli_main.py` (loop around verification)
    - **Status**: ✅ COMPLETE - Loop verification logging added
  - [x] `server/api/download_bp.py` (partial file cleanup)
    - **Status**: ✅ COMPLETE - Partial file cleanup logging added
  - [x] `server/api/status_bp.py` (average speed computation)
    - **Status**: ✅ COMPLETE - Average speed computation logging added
  - `server/__main__.py` (process scanning and config save)
    - [x] `server/lock.py` (unlink/parse/read errors)
  - **Status**: ✅ COMPLETE - Comprehensive logging added for parse/read errors and malformed content

## Bundle Size Optimization (from latest analysis)

- [x] Split background script into smaller modules
  - **Status**: ✅ COMPLETE - Created background-downloads.ts and background-server.ts modules
- [x] Implement lazy loading for content script
  - **Status**: ✅ COMPLETE - Created content-lazy.ts wrapper with dynamic imports and interaction-based loading
- [x] Use dynamic imports for options page
  - **Status**: ✅ COMPLETE - Created options-dynamic.ts wrapper with dynamic imports and interaction-based loading

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

  - [x] Popup: guard against non-finite progress values causing "The provided double value is
    non-finite" in `createActiveListItem`; clamp to [0,100] and round label.
    - **Status**: ✅ COMPLETE - Progress value validation implemented
  - [x] Popup: Combine Active/Queued and History into a single "Downloads" section; keep existing
    element IDs (`download-status`, `download-history`) so logic keeps working.
    - **Status**: ✅ COMPLETE - Unified downloads section implemented
  - [/] Background: stop forcing scans when a cached port exists from Options; prefer cached port
    and only scan when missing.
  - [/] Background: if no cached `serverPort`, use `serverConfig.server_port` from storage and cache
    it.
  - [/] Background: fetch config via multiple loopback hosts and fall back to cached config if fetch
    fails.

- **Automation and CI**
  - [/] Keep `make lint-unused` non-blocking during triage.
  - [/] Add a CI job to run `make lint-unused` and upload `reports/unused_code_report.md`.
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
  - [/] Server now appends failure entries on yt-dlp errors and appends a fallback success entry
    after `ydl.download` returns when the `finished` hook did not persist metadata. This ensures
    history reflects both successes and failures even if the process restarts mid-download.
  - [/] Wired popup history view to pagination controls and live updates; `initPopup()` now imports
    `fetchHistory`/`renderHistoryItems` and listens for `historyUpdated`. Files:
    `extension/src/popup.ts`.
  - [/] Implemented Download History section in Options with pagination and live updates; Options
    now listens for `historyUpdated` and exposes per-page controls. Files:
    `extension/ui/options.html`, `extension/src/options.ts`.
  - [/] Added server-side queue management: when max concurrency is reached, `/api/download` returns
    `status: queued` and enqueues the request; `/api/status` includes queued IDs. Files:
    `server/queue.py`, `server/api/download_bp.py`, `server/api/status_bp.py`, docs in
    `server/api/api.md`.
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
  - [/] Make injected download button larger and reactive on click (bounce + success/error states)

### New Feature: Smart Injection

- [/] Add Smart Injection toggle in Options → Behavior → General Options
  (`settings-smart-injection`)
- [/] Persist preference in local storage key `smartInjectionEnabled`
- [/] Content script respects smart mode:
  - [/] When ON: inject only when media is detected; hide/remove global button if none
  - [/] When OFF: preserve current behavior (always create global button, plus per-video injection)
- [/] Preserve popup SHOW/HIDE per-domain toggle behavior

### Hardcoded Variables Cleanup

- [/] Replace hardcoded fetch URLs in `extension/src/background.ts` with compositions of
      `NETWORK_CONSTANTS.SERVER_BASE_URL`, discovered port, and endpoint constants from
      `extension/src/core/constants.ts`.
  - **Status**: ⚠️ PARTIALLY IMPLEMENTED - Major endpoints updated, some remaining
- [ ] Audit extension code to remove duplicated `"/api/..."` strings; import and use endpoint
      constants instead.
- [/] Replace hardcoded lock path in `server/cli/serve.py` (`/tmp/videodownloader.lock`) with the
  centralized lock path helpers from `server/lock.py` (e.g., `get_lock_file_path`) to ensure
  cross-platform behavior.
- [ ] Review server/CLI default host strings; keep loopback binds but ensure they are centralized
      and documented.
- [ ] Document any remaining, justified literals (tests/manifest permissions) in README policy.

### Frontend centralized services follow-ups

#### Recently Completed ✅

- [/] **DOM Selector & Class Migration**: Successfully migrated all direct DOM string literals to centralized constants
  - Extended `extension/src/core/constants.ts` with new `DOM_SELECTORS` and `CSS_CLASSES` constants
  - Updated `extension/src/popup.ts` to use constants and `domManager` wrapper
  - Updated `extension/src/options.ts` to use constants and `domManager` wrapper
  - Updated test files to use constants instead of string literals
  - Standardized DOM access patterns across popup and options

- [/] Replace direct DOM queries in `extension/src/popup.ts` and `extension/src/options.ts` with
`domManager` where practical

#### Remaining Tasks

- [x] Replace remaining `console.*` calls in `popup.ts` and `options.ts` with centralized `logger`
  - **Status**: ✅ COMPLETE - All console calls in core extension files replaced with centralized logger
- [x] Remove `validatePort()` in `extension/src/options.ts` and use `validationService` port
      validator
  - **Status**: ✅ COMPLETE - ValidationService enhanced with business logic for port, path, and select validation

## Frontend Centralization Completion Plan

### Overview

Complete the migration to centralized services by addressing the remaining validation functions, logger integration, test coverage, and documentation updates.

### Task 1: Validation Service Migration [HIGH PRIORITY]

**Current State**:

- `options.ts` has 3 custom validation functions with important business logic
- `validationService` exists but has generic validators that lack the specific business rules

**Plan**:

1. **Enhance existing validators** in `validationService` to support business logic:
   - Extend `"port"` validator to support port ranges, 9090 special case, common port conflicts
   - Extend `"path"` validator to support absolute path validation, home-relative paths
   - Extend `"select"` validator to support format whitelist validation
2. **Add context parameters** to support business-specific validation rules
3. **Keep existing functions** as thin wrappers that call the enhanced service
4. **Test thoroughly** to ensure identical behavior before migration

**Files to modify**:

- `extension/src/core/validation-service.ts` - Enhance validators
- `extension/src/options.ts` - Update validation function calls

**Success Criteria**: All validation functions use `validationService` without losing business logic

### Task 2: Logger Integration [MEDIUM PRIORITY]

**Current State**:

- 3 `console.error` calls remain in `options.ts`
- All calls have been updated to use proper `LogContext` structure

**Plan**:

1. **Verify logger calls** are working correctly with proper context
2. **Test logger functionality** to ensure no errors are lost
3. **Remove any remaining console calls** if found in other files

**Files to verify**:

- `extension/src/options.ts` - Verify logger calls work
- `extension/src/popup.ts` - Check for any remaining console calls
- Other extension files - Audit for console usage

**Success Criteria**: Zero `console.*` calls in extension code, all logging goes through centralized logger

### Task 3: Test Coverage for Constants [MEDIUM PRIORITY] ✅ COMPLETE

**Current State**:

- All major test files updated to use constants
- Constants migration completed for DOM selectors and CSS classes
- Remaining hardcoded strings are test-specific data values (appropriate to keep)

**Progress**:

- ✅ `popup.test.ts` - Updated to use constants
- ✅ `popup.advanced.test.ts` - Updated to use constants
- ✅ `options.unit.test.ts` - Updated to use constants (theme classes, server status)
- ✅ `content.behavior.test.ts` - Updated to use constants (button IDs, CSS classes)
- ✅ `history.render.test.ts` - Updated to use constants (history selectors, CSS classes)
- ✅ `history.script.test.ts` - Updated to use constants (history selectors, CSS classes)
- ✅ `popup.queue.test.ts` - Updated to use constants (button CSS classes)
- ✅ `popup.util.test.ts` - Updated to use constants (status selectors, CSS classes)
- ✅ `popup-settings.test.ts` - Updated to use constants (settings button selector)
- ✅ `content.ui.test.ts` - Updated to use constants (button IDs, CSS classes)
- ✅ `options.ui.test.ts` - Updated to use constants (validation CSS classes)
- ✅ `options.queue.test.ts` - Updated to use constants (already properly implemented)
- ✅ `options.errorHistory.test.ts` - Updated to use constants (already properly implemented)
- ✅ `content.test.ts` - Updated to use constants (button IDs, CSS classes, button text)
- ✅ Other test files - Already properly using constants or have appropriate hardcoded test data

**Success Criteria**: ✅ All test files use constants instead of string literals

### Task 4: Documentation Updates [LOW PRIORITY]

**Current State**:

- Main documentation updated with DOM migration progress
- Need to verify no old selector references remain

**Plan**:

1. **Audit documentation files** for old selector references
2. **Update any remaining references** to use new constants
3. **Verify examples** use current constants

**Files to audit**:

- `README.md` - Check for old selector examples
- `DEVELOPER.md` - Verify development examples use constants
- `extension/src/extension-overview.md` - Check for outdated references

**Success Criteria**: All documentation references use current constants

### Implementation Order

1. **Week 1**: Complete validation service migration (highest impact)
2. **Week 1**: Finish logger integration (medium impact)
3. **Week 2**: Update test coverage for constants (medium impact)
4. **Week 2**: Complete documentation updates (low impact)

### Risk Mitigation

- **Validation Logic Loss**: Keep existing functions as wrappers until thoroughly tested
- **Breaking Changes**: Test each migration step independently
- **Test Failures**: Update tests incrementally to avoid breaking existing functionality

### Success Metrics

- ✅ All validation functions use `validationService`
- ✅ Zero `console.*` calls in extension code
- ✅ All test files use constants consistently
- ✅ Documentation references use current constants
- ✅ No functionality lost during migration

## 1.2 Fix Critical JavaScript/TypeScript Modules [WEEK 1-2]

**background-logic.ts (87.36% → EXCEEDED 70% target by 17%)**

**background-helpers.ts (72.06% → target 70%)** **ALREADY ABOVE TARGET**

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

## Recent Progress and Next Steps (Media Detection + Cookies)

### Progress

- Implemented parameterized per-URL subtests for the headful matrix; present/absent tests now run
  per URL with domain-aware, dynamic timeouts
- Extended domain heuristics and consent handling (in-frame selectors + text clicks); added rich
  diagnostics for media polling, ad-frame skipping, and shadow DOM detection
- HypnoTube: added jwplayer/video.js readiness probes, inline script/performance scanning for
  `.m3u8`, targeted player-area clicks, and an embed `/embed/<id>` fallback
- Cookie tooling added for auth-required sites:
  - `scripts/export-chrome-cookies.js`: parameterized Node exporter
    (Chrome/Chromium/Brave/Edge/Opera) → JSON/Netscape
  - `scripts/export_cookies.py`: Python exporter using `browser_cookie3` (auto-detects installed
    browsers) → JSON/Netscape
  - Playwright test spec supports `EVD_HYPNOTUBE_COOKIES_JSON` to inject cookies before navigation

### Next Steps

- HypnoTube detection hardening:
  - Move embed-first probing earlier (before main poll) for HypnoTube present-case
  - Parse `jwplayer.setup(...)` inline JSON to count sources as a detection signal when media tags
    aren’t yet attached
  - Prefer cookie-injected runs (export from logged-in browser) for HypnoTube matrix entries;
    otherwise mark as best-effort skip to keep the wide suite green
- Document cookie-based test runs in `tests/testing.md` and add Makefile helper target to
  export/inject cookies for a domain
- Keep CI on the stable set; run wide matrix only with `EVD_MEDIA_SITES_WIDE=true` in manual
  workflows

### Cookie Export Usage

- Node (JSON):
  `node scripts/export-chrome-cookies.js hypnotube.com ./tests/extension/hypnotube-cookies.json`
- Python (JSON):
  `python scripts/export_cookies.py hypnotube.com ./tests/extension/hypnotube-cookies.json`
- Netscape (yt-dlp/curl): add `--format=netscape` and point tools to the generated file

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
