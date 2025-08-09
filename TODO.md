# Enhanced Video Downloader - TODO

Urgent Tasks:

- [/] log viewer on options page not working - no logs displayed
  <!-- working-on: options logs viewer wired to background API -->
- [/] 'choose' button to set download directory now wired (added id `settings-folder-picker` in
  `extension/ui/options.html`)
- [ ] nothing at all in browser console for options page or background service
- [/] Implement `run_cleanup()` in `server/cli/utils.py` and add tests
- [/] Replace silent `pass` blocks with logging/handling in:
  - `server/cli_helpers.py` (loops and maintenance utils)
  - `server/cli_main.py` (loop around verification)
  - `server/api/download_bp.py` (partial file cleanup)
  - `server/api/status_bp.py` (average speed computation)
  - `server/__main__.py` (process scanning and config save)
  - `server/lock.py` (unlink/parse/read errors)

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
- [ ] Consider unifying `find_available_port` usage (prefer `server/utils.py`) and remove duplicates
- [/] Removed deprecated `extension/ui/styles.css` (legacy styles) – project now uses
  `variables.css`, `components.css`, `base.css`, and `themes.css`

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
- [ ] Implement proper error message sanitization
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
      junk check to ignore `.benchmarks`

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
