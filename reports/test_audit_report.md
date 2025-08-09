# Test Suite Redundancy Audit Report

## Summary
- Total Python test files: 82
- Total JavaScript test files: 3
- Total TypeScript test files: 23

## Test File Patterns
- **Regular**: 82 files
  - conftest.py
  - extension/test_extension_ui.py
  - integration/__init__.py
  - integration/test_api_error_handling.py
  - integration/test_api_integration.py
  - integration/test_cancel_endpoint.py
  - integration/test_clear_status_concurrency.py
  - integration/test_cli.py
  - integration/test_cli_integration.py
  - integration/test_concurrent_operations.py
  - integration/test_config_endpoint.py
  - integration/test_debug_paths.py
  - integration/test_download_bp.py
  - integration/test_download_bp_additional.py
  - integration/test_health_endpoint.py
  - integration/test_history_endpoint.py
  - integration/test_logs_endpoint.py
  - integration/test_pause_resume_endpoints.py
  - integration/test_priority_endpoint.py
  - integration/test_status_endpoint.py
  - unit/__init__.py
  - unit/cli/__init__.py
  - unit/cli/test_download.py
  - unit/cli/test_history.py
  - unit/cli/test_init.py
  - unit/cli/test_resume.py
  - unit/cli/test_serve.py
  - unit/cli/test_status.py
  - unit/cli/test_utils.py
  - unit/downloads/test_ytdlp.py
  - unit/test_api_config.py
  - unit/test_api_config_bp.py
  - unit/test_api_debug_bp.py
  - unit/test_api_download_bp.py
  - unit/test_api_health.py
  - unit/test_api_health_bp.py
  - unit/test_api_history_bp.py
  - unit/test_api_logs.py
  - unit/test_api_logs_bp.py
  - unit/test_api_logs_manage_bp.py
  - unit/test_api_restart.py
  - unit/test_api_restart_bp.py
  - unit/test_api_security.py
  - unit/test_api_status_bp.py
  - unit/test_cleanup.py
  - unit/test_cli_consolidated.py
  - unit/test_cli_helpers.py
  - unit/test_config_bp_routes.py
  - unit/test_config_class.py
  - unit/test_config_module.py
  - unit/test_debug_bp.py
  - unit/test_debug_bp_unit.py
  - unit/test_disable_launchagents.py
  - unit/test_download_api.py
  - unit/test_downloads_opts.py
  - unit/test_downloads_resume_logic.py
  - unit/test_extraction_rules.py
  - unit/test_find_downloads_to_resume.py
  - unit/test_gallery_dl.py
  - unit/test_handle_ytdlp_download.py
  - unit/test_history_bp.py
  - unit/test_history_module.py
  - unit/test_lock_module.py
  - unit/test_logging_setup.py
  - unit/test_logs_bp.py
  - unit/test_logs_manage_bp.py
  - unit/test_main_handlers.py
  - unit/test_main_helpers.py
  - unit/test_main_module.py
  - unit/test_mutation_cli.py
  - unit/test_property_based.py
  - unit/test_restart_bp.py
  - unit/test_resume_downloads.py
  - unit/test_schemas.py
  - unit/test_status_bp.py
  - unit/test_status_endpoints.py
  - unit/test_utils.py
  - unit/test_video_downloader_server.py
  - unit/test_ytdlp_build_opts.py
  - unit/test_ytdlp_helpers.py
  - unit/test_ytdlp_history_extension.py
  - unit/test_ytdlp_progress_hook.py
- **Js_Files**: 3 files
  - extension/playwright-e2e.spec.js
  - extension/test_extension_ui_e2e.js
  - jest/jest.setup.js
- **Ts_Files**: 23 files
  - extension/background-simple.test.ts
  - extension/background.test.ts
  - extension/background.util.test.ts
  - extension/content.behavior.test.ts
  - extension/content.extra.test.ts
  - extension/content.state.test.ts
  - extension/content.test.ts
  - extension/content.ui.test.ts
  - extension/content.util.test.ts
  - extension/history.render.test.ts
  - extension/history.script.test.ts
  - extension/history.util.test.ts
  - extension/options.errorHistory.test.ts
  - extension/options.ui.test.ts
  - extension/options.unit.test.ts
  - extension/popup-settings.test.ts
  - extension/popup.advanced.test.ts
  - extension/popup.queue.test.ts
  - extension/popup.test.ts
  - extension/popup.util.test.ts
  - extension/shared/mock-chrome-api.ts
  - extension/shared/test-helpers.ts
  - extension/test_extension_ui_e2e.spec.ts

## Recommendations

### High Priority Cleanup
1. **Consolidate Simple/Extended Pairs**: Merge simple test files into their extended counterparts
2. **Remove Coverage Files**: Coverage-specific files often duplicate regular test functionality
3. **Clean Up Failed Tests**: Failed test files should be fixed or removed
4. **Review Incomplete Tests**: Determine if incomplete tests are still needed

### Medium Priority Cleanup
1. **Deprecated JS Files**: Review JavaScript files in extension-instrumented/
2. **Duplicate Test Logic**: Identify and merge duplicate test functions across files
3. **Unused Test Files**: Remove tests for deprecated or removed functionality

### Estimated Impact
- Files that can be removed: ~0
- Files that can be consolidated: ~0
- Expected coverage impact: Minimal (tests are redundant)