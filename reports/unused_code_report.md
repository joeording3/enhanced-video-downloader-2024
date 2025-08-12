# Unused Code Report

Generated on: 2025-08-12 16:52:51 UTC

## TypeScript (ts-prune)

```
extension/src/popup.ts:133 - updateToggleButtonState
extension/src/popup.ts:457 - handleDragStart
extension/src/popup.ts:465 - handleDragOver
extension/src/popup.ts:472 - handleDragLeave
extension/src/popup.ts:477 - handleDrop
extension/src/popup.ts:494 - handleDragEnd
extension/src/popup.ts:707 - updatePopupServerStatus (used in module)
extension/src/popup.ts:27 - DownloadStatus
extension/src/core/constants.ts:399 - getTestServerPort (used in module)
extension/src/core/constants.ts:404 - getTestClientPort (used in module)
extension/src/core/constants.ts:409 - getTestPortRange (used in module)
extension/src/core/constants.ts:414 - getDockerPort (used in module)
extension/src/core/constants.ts:419 - isValidPort
extension/src/core/constants.ts:461 - getStorageKey
extension/src/core/constants.ts:469 - getCSSSelector
extension/src/core/constants.ts:477 - getMessageType
extension/src/core/constants.ts:369 - MIN_PORT (used in module)
extension/src/core/constants.ts:370 - MAX_PORT (used in module)
extension/src/core/constants.ts:426 - DEFAULT_SERVER_PORT
extension/src/core/constants.ts:427 - DEFAULT_CLIENT_PORT
extension/src/core/constants.ts:428 - DEFAULT_PORT_RANGE_START
extension/src/core/constants.ts:428 - DEFAULT_PORT_RANGE_END
extension/src/core/constants.ts:429 - DEFAULT_DOCKER_PORT
extension/src/core/constants.ts:430 - TEST_SERVER_PORT
extension/src/core/constants.ts:431 - TEST_CLIENT_PORT
extension/src/core/constants.ts:432 - TEST_PORT_RANGE_START
extension/src/core/constants.ts:432 - TEST_PORT_RANGE_END
extension/src/core/constants.ts:435 - PORT_CONFIG
extension/src/core/constants.ts:436 - CURRENT_ENV
extension/src/core/constants.ts:486 - StorageKey
extension/src/core/constants.ts:487 - UIConstant
extension/src/core/constants.ts:488 - NetworkConstant
extension/src/core/constants.ts:489 - ConfigConstant
extension/src/core/constants.ts:490 - DOMSelector
extension/src/core/constants.ts:491 - CSSClass
extension/src/core/constants.ts:492 - MessageType
extension/src/core/constants.ts:493 - ThemeConstant
extension/src/core/constants.ts:494 - StatusConstant
extension/src/core/constants.ts:495 - ErrorMessage
extension/src/core/constants.ts:496 - SuccessMessage
extension/src/core/constants.ts:497 - NotificationMessage
extension/src/core/dom-manager.ts:6 - DOMElement
extension/src/core/dom-manager.ts:12 - DOMCache (used in module)
extension/src/core/error-handler.ts:6 - ErrorInfo (used in module)
extension/src/core/error-handler.ts:13 - ErrorResult (used in module)
extension/src/core/error-handler.ts:20 - ErrorHandler (used in module)
extension/src/core/logger.ts:6 - LogLevel (used in module)
extension/src/core/logger.ts:8 - LogContext (used in module)
extension/src/core/logger.ts:14 - LogEntry (used in module)
extension/src/core/logger.ts:22 - Logger (used in module)
extension/src/core/state-manager.ts:10 - ServerState (used in module)
extension/src/core/state-manager.ts:18 - UIState (used in module)
extension/src/core/state-manager.ts:29 - DownloadState (used in module)
extension/src/core/state-manager.ts:35 - FormState (used in module)
extension/src/core/state-manager.ts:41 - DownloadStatus (used in module)
extension/src/core/state-manager.ts:52 - ExtensionState (used in module)
extension/src/core/state-manager.ts:60 - StateChangeEvent (used in module)
extension/src/core/validation-service.ts:6 - ValidationResult (used in module)
extension/src/core/validation-service.ts:12 - Validator (used in module)
extension/src/core/validation-service.ts:16 - FieldConfig (used in module)
extension/src/lib/event-manager.ts:6 - EventHandler (used in module)
extension/src/lib/event-manager.ts:48 - globalEventManager
extension/src/lib/performance-utils.ts:6 - PerformanceMetric
extension/src/types/index.ts:14 - DownloadOptions (used in module)
extension/src/types/index.ts:59 - MessageType (used in module)
extension/src/types/index.ts:71 - Message (used in module)
extension/src/types/index.ts:76 - DownloadMessage
extension/src/types/index.ts:83 - ServerResponse
extension/src/types/index.ts:93 - QueueMessage
extension/src/types/index.ts:112 - ReorderQueueMessage
tests/extension/shared/mock-chrome-api.ts:5 - ChromeAPIMock (used in module)
tests/extension/shared/mock-chrome-api.ts:49 - ChromeAPIMocker (used in module)
tests/extension/shared/mock-chrome-api.ts:202 - chromeAPIMocker (used in module)
tests/extension/shared/test-helpers.ts:23 - setupTestEnvironment
tests/extension/shared/test-helpers.ts:45 - teardownTestEnvironment
tests/extension/shared/test-helpers.ts:52 - setupDOM
tests/extension/shared/test-helpers.ts:75 - createMockEvent
tests/extension/shared/test-helpers.ts:88 - createMockFormEvent
tests/extension/shared/test-helpers.ts:98 - createMockClickEvent
tests/extension/shared/test-helpers.ts:111 - createMockInputEvent
tests/extension/shared/test-helpers.ts:121 - createMockChangeEvent
tests/extension/shared/test-helpers.ts:131 - waitForAsync
tests/extension/shared/test-helpers.ts:138 - waitForDOMUpdate
tests/extension/shared/test-helpers.ts:149 - mockFetch (used in module)
tests/extension/shared/test-helpers.ts:167 - mockFetchError
tests/extension/shared/test-helpers.ts:177 - createMockConsole
tests/extension/shared/test-helpers.ts:199 - createMockDownloadData
tests/extension/shared/test-helpers.ts:213 - createMockServerConfig
tests/extension/shared/test-helpers.ts:227 - createMockExtensionConfig
tests/extension/shared/test-helpers.ts:240 - expectAsyncError
tests/extension/shared/test-helpers.ts:257 - expectLogsContain
tests/extension/shared/test-helpers.ts:268 - expectLogsNotContain
tests/extension/shared/test-helpers.ts:279 - createMockStorage
tests/extension/shared/test-helpers.ts:318 - createMockRuntime
tests/extension/shared/test-helpers.ts:334 - createMockTabs
tests/extension/shared/test-helpers.ts:9 - TestSetup (used in module)
tests/extension/shared/test-helpers.ts:15 - DOMSetup (used in module)
tests/extension/shared/test-helpers.ts:347 - testUtils
```

## Python (vulture)

```
server/__init__.py:181: unused function '_log_api_requests' (60% confidence)
server/__init__.py:218: unused function '_record_start_time' (60% confidence)
server/api/download_bp.py:42: unused function '_add_cors_headers' (60% confidence)
server/api/download_bp.py:58: unused variable 'downloadId' (60% confidence)
server/api/download_bp.py:59: unused variable 'use_gallery_dl' (60% confidence)
server/api/download_bp.py:70: unused variable 'downloadId' (60% confidence)
server/api/download_bp.py:144: unused function 'cleanup_failed_download' (60% confidence)
server/api/download_bp.py:512: unused function 'gallery_dl' (60% confidence)
server/api/download_bp.py:633: unused function 'cancel_download' (60% confidence)
server/api/download_bp.py:680: unused function 'pause_download' (60% confidence)
server/api/download_bp.py:735: unused function 'resume_download' (60% confidence)
server/api/download_bp.py:811: unused function 'set_priority' (60% confidence)
server/api/queue_bp.py:18: unused function 'get_queue' (60% confidence)
server/api/queue_bp.py:38: unused function 'reorder_queue' (60% confidence)
server/api/queue_bp.py:67: unused function 'remove_from_queue' (60% confidence)
server/api/restart_bp.py:98: unused function 'managed_restart_route' (60% confidence)
server/cli/history.py:104: unused variable 'list_history' (60% confidence)
server/cli/queue.py:45: unused function 'reorder_command' (60% confidence)
server/cli/queue.py:72: unused function 'remove_command' (60% confidence)
server/cli_helpers.py:112: unused function 'create_lock_file_cli' (60% confidence)
server/cli_helpers.py:1084: unused function 'read_lock_file' (60% confidence)
server/cli_helpers.py:1201: unused function 'run_gunicorn_server' (60% confidence)
server/cli_helpers.py:1283: unused function 'set_config_value' (60% confidence)
server/cli_helpers.py:1355: unused function 'build_extension_scripts' (60% confidence)
server/cli_helpers.py:1371: unused function 'configure_console_logging' (60% confidence)
server/cli_helpers.py:1389: unused function 'derive_server_settings' (60% confidence)
server/cli_helpers.py:1458: unused function 'handle_existing_instance' (60% confidence)
server/cli_main.py:77: unused variable 'SERVER_MAIN_SCRIPT' (60% confidence)
server/cli_main.py:396: unused function 'start_server' (60% confidence)
server/cli_main.py:523: unused function 'stop_server' (60% confidence)
server/cli_main.py:559: unused function 'restart_server_command' (60% confidence)
server/cli_main.py:729: unused function 'disable_launchagents_cmd' (60% confidence)
server/cli_main.py:911: unsatisfiable 'if' condition (100% confidence)
server/config.py:166: unused variable 'writable' (60% confidence)
server/constants.py:153: unused function 'is_valid_port' (60% confidence)
server/constants.py:168: unused variable 'DEFAULT_CLIENT_PORT' (60% confidence)
server/constants.py:169: unused variable 'DEFAULT_PORT_RANGE_END' (60% confidence)
server/constants.py:169: unused variable 'DEFAULT_PORT_RANGE_START' (60% confidence)
server/constants.py:170: unused variable 'DEFAULT_DOCKER_PORT' (60% confidence)
server/constants.py:171: unused variable 'TEST_SERVER_PORT' (60% confidence)
server/constants.py:172: unused variable 'TEST_CLIENT_PORT' (60% confidence)
server/constants.py:173: unused variable 'TEST_PORT_RANGE_END' (60% confidence)
server/constants.py:173: unused variable 'TEST_PORT_RANGE_START' (60% confidence)
server/queue.py:41: unused method 'stop' (60% confidence)
server/schemas.py:50: unused variable 'model_config' (60% confidence)
server/schemas.py:56: unused variable 'merge_output_format' (60% confidence)
server/schemas.py:60: unused variable 'concurrent_fragments' (60% confidence)
server/schemas.py:67: unused variable 'quiet' (60% confidence)
server/schemas.py:72: unused variable 'noprogress' (60% confidence)
server/schemas.py:73: unused variable 'outtmpl' (60% confidence)
server/schemas.py:77: unused variable 'continuedl' (60% confidence)
server/schemas.py:78: unused variable 'nopart' (60% confidence)
server/schemas.py:92: unused variable 'model_config' (60% confidence)
server/schemas.py:121: unused variable 'download_history_limit' (60% confidence)
server/schemas.py:126: unused variable 'allowed_domains' (60% confidence)
server/schemas.py:130: unused variable 'ffmpeg_path' (60% confidence)
server/schemas.py:144: unused variable 'scan_interval_ms' (60% confidence)
server/schemas.py:149: unused variable 'show_download_button' (60% confidence)
server/schemas.py:150: unused variable 'button_position_memory' (60% confidence)
server/schemas.py:160: unused method 'validate_log_level' (60% confidence)
server/schemas.py:178: unused method 'ensure_download_dir_is_path_obj' (60% confidence)
server/schemas.py:196: unused method 'validate_download_dir_writable_and_absolute' (60% confidence)
server/schemas.py:243: unused method 'validate_url' (60% confidence)
server/schemas.py:293: unused method 'validate_download_id' (60% confidence)
server/schemas.py:313: unused method 'validate_page_title' (60% confidence)
server/schemas.py:355: unused variable 'download_history_limit' (60% confidence)
server/schemas.py:356: unused variable 'allowed_domains' (60% confidence)
server/schemas.py:359: unused variable 'ffmpeg_path' (60% confidence)
server/schemas.py:360: unused variable 'scan_interval_ms' (60% confidence)
server/schemas.py:368: unused method 'validate_download_dir_format' (60% confidence)
server/schemas.py:397: unused variable 'model_config' (60% confidence)
server/schemas.py:412: unused variable 'download_type' (60% confidence)
server/schemas.py:437: unused class 'HistoryClearRequest' (60% confidence)
server/schemas.py:449: unused class 'HistoryQuery' (60% confidence)
server/schemas.py:461: unused class 'LogsQuery' (60% confidence)
server/utils.py:85: unused function 'get_cache_stats' (60% confidence)
tests/conftest.py:35: unused function '_session_logging_isolation' (60% confidence)
tests/conftest.py:105: unused function 'tmp_logs_dir' (60% confidence)
tests/conftest.py:113: unused function 'filesystem_state' (60% confidence)
tests/conftest.py:132: unused function 'enforce_cwd_isolation' (60% confidence)
tests/conftest.py:147: unused function '_test_env_isolation' (60% confidence)
tests/conftest.py:185: unused function '_reset_rate_limits' (60% confidence)
tests/extension/test_extension_ui.py:5: unused variable 'pytestmark' (60% confidence)
tests/integration/test_api_error_handling.py:7: unused variable 'pytestmark' (60% confidence)
tests/integration/test_api_integration.py:8: unused variable 'pytestmark' (60% confidence)
tests/integration/test_cancel_endpoint.py:14: unused variable 'pytestmark' (60% confidence)
tests/integration/test_cancel_endpoint.py:17: unused function 'pytest_configure' (60% confidence)
tests/integration/test_cancel_endpoint.py:48: unused function 'clear_registries' (60% confidence)
tests/integration/test_clear_status_concurrency.py:9: unused variable 'pytestmark' (60% confidence)
tests/integration/test_concurrent_operations.py:13: unused variable 'pytestmark' (60% confidence)
tests/integration/test_concurrent_operations.py:16: unused function 'pytest_configure' (60% confidence)
tests/integration/test_concurrent_operations.py:22: unused function 'clear_registries' (60% confidence)
tests/integration/test_concurrent_operations.py:115: unused variable 'id' (100% confidence)
tests/integration/test_concurrent_operations.py:116: unused variable 'id' (100% confidence)
tests/integration/test_config_endpoint.py:5: unused variable 'pytestmark' (60% confidence)
tests/integration/test_health_endpoint.py:5: unused variable 'pytestmark' (60% confidence)
tests/integration/test_history_endpoint.py:5: unused variable 'pytestmark' (60% confidence)
tests/integration/test_logs_endpoint.py:9: unused variable 'pytestmark' (60% confidence)
tests/integration/test_pause_resume_endpoints.py:9: unused variable 'pytestmark' (60% confidence)
tests/integration/test_pause_resume_endpoints.py:12: unused function 'pytest_configure' (60% confidence)
tests/integration/test_pause_resume_endpoints.py:26: unused attribute 'suspended' (60% confidence)
tests/integration/test_pause_resume_endpoints.py:34: unused attribute 'suspended' (60% confidence)
tests/integration/test_pause_resume_endpoints.py:43: unused function 'clear_registry' (60% confidence)
tests/integration/test_pause_resume_endpoints.py:106: unused variable 'expected_success_message' (100% confidence)
tests/integration/test_priority_endpoint.py:12: unused variable 'pytestmark' (60% confidence)
tests/integration/test_priority_endpoint.py:15: unused function 'pytest_configure' (60% confidence)
tests/integration/test_priority_endpoint.py:24: unused function 'clear_registry' (60% confidence)
tests/integration/test_status_endpoint.py:9: unused variable 'pytestmark' (60% confidence)
tests/unit/cli/test_download.py:514: unused attribute 'side_effect' (60% confidence)
tests/unit/cli/test_history.py:107: unused attribute 'side_effect' (60% confidence)
tests/unit/cli/test_serve.py:135: unused attribute 'side_effect' (60% confidence)
tests/unit/cli/test_status.py:136: unused attribute 'side_effect' (60% confidence)
tests/unit/test_api_config.py:69: unused attribute 'side_effect' (60% confidence)
tests/unit/test_api_config.py:127: unused attribute 'side_effect' (60% confidence)
tests/unit/test_api_config.py:139: unused attribute 'side_effect' (60% confidence)
tests/unit/test_api_config.py:151: unused attribute 'side_effect' (60% confidence)
tests/unit/test_api_config_bp.py:86: unused attribute 'side_effect' (60% confidence)
tests/unit/test_api_config_bp.py:195: unused attribute 'side_effect' (60% confidence)
tests/unit/test_api_config_bp.py:211: unused attribute 'side_effect' (60% confidence)
tests/unit/test_api_config_bp.py:227: unused attribute 'side_effect' (60% confidence)
tests/unit/test_api_download_bp.py:320: unused attribute 'side_effect' (60% confidence)
tests/unit/test_api_download_bp.py:386: unused attribute 'side_effect' (60% confidence)
tests/unit/test_api_download_bp.py:488: unused attribute 'side_effect' (60% confidence)
tests/unit/test_api_history_bp.py:111: unused attribute 'side_effect' (60% confidence)
tests/unit/test_api_history_bp.py:148: unused attribute 'side_effect' (60% confidence)
tests/unit/test_api_history_bp.py:175: unused attribute 'side_effect' (60% confidence)
tests/unit/test_api_logs.py:14: unused variable 'pytestmark' (60% confidence)
tests/unit/test_api_queue_bp.py:10: unused variable 'pytestmark' (60% confidence)
tests/unit/test_cleanup.py:10: unused variable 'pytestmark' (60% confidence)
tests/unit/test_cli_consolidated.py:195: unused attribute 'side_effect' (60% confidence)
tests/unit/test_cli_consolidated.py:334: unused method 'mock_get_config_value' (60% confidence)
tests/unit/test_cli_consolidated.py:344: unused method 'mock_requests_post' (60% confidence)
tests/unit/test_cli_consolidated.py:752: unused attribute 'side_effect' (60% confidence)
tests/unit/test_cli_helpers.py:195: unused attribute 'side_effect' (60% confidence)
tests/unit/test_cli_helpers.py:334: unused method 'mock_get_config_value' (60% confidence)
tests/unit/test_cli_helpers.py:344: unused method 'mock_requests_post' (60% confidence)
tests/unit/test_cli_helpers.py:703: unused variable 'capture_output' (100% confidence)
tests/unit/test_cli_helpers.py:703: unused variable 'check' (100% confidence)
tests/unit/test_cli_helpers.py:782: unused attribute 'side_effect' (60% confidence)
tests/unit/test_cli_helpers_more.py:86: unused attribute 'side_effect' (60% confidence)
tests/unit/test_cli_helpers_more.py:103: unused attribute 'side_effect' (60% confidence)
tests/unit/test_config_bp_routes.py:58: unused attribute 'side_effect' (60% confidence)
tests/unit/test_config_bp_routes.py:71: unused attribute 'side_effect' (60% confidence)
tests/unit/test_config_bp_routes.py:107: unused attribute 'side_effect' (60% confidence)
tests/unit/test_config_bp_routes.py:124: unused attribute 'side_effect' (60% confidence)
tests/unit/test_config_bp_routes.py:155: unused attribute 'side_effect' (60% confidence)
tests/unit/test_config_bp_routes.py:170: unused attribute 'side_effect' (60% confidence)
tests/unit/test_config_bp_routes.py:185: unused attribute 'side_effect' (60% confidence)
tests/unit/test_config_class.py:12: unused variable 'pytestmark' (60% confidence)
tests/unit/test_disable_launchagents.py:116: unused attribute 'side_effect' (60% confidence)
tests/unit/test_downloads_opts.py:32: unused function 'patch_config' (60% confidence)
tests/unit/test_downloads_resume_logic.py:12: unused variable 'pytestmark' (60% confidence)
tests/unit/test_downloads_resume_logic.py:56: unused variable 'log_message' (100% confidence)
tests/unit/test_extraction_rules.py:9: unused variable 'pytestmark' (60% confidence)
tests/unit/test_find_downloads_to_resume.py:7: unused variable 'pytestmark' (60% confidence)
tests/unit/test_gallery_dl.py:16: unused function 'app_ctx' (60% confidence)
tests/unit/test_handle_ytdlp_download.py:121: unused variable 'exc' (100% confidence)
tests/unit/test_handle_ytdlp_download.py:121: unused variable 'exc_type' (100% confidence)
tests/unit/test_handle_ytdlp_download.py:121: unused variable 'tb' (100% confidence)
tests/unit/test_handle_ytdlp_download.py:187: unused variable 'exc' (100% confidence)
tests/unit/test_handle_ytdlp_download.py:187: unused variable 'exc_type' (100% confidence)
tests/unit/test_handle_ytdlp_download.py:187: unused variable 'tb' (100% confidence)
tests/unit/test_history_bp.py:8: unused variable 'pytestmark' (60% confidence)
tests/unit/test_history_bp.py:11: unused function 'stub_history' (60% confidence)
tests/unit/test_history_module.py:10: unused variable 'pytestmark' (60% confidence)
tests/unit/test_lock_module.py:9: unused variable 'pytestmark' (60% confidence)
tests/unit/test_logs_bp.py:10: unused variable 'pytestmark' (60% confidence)
tests/unit/test_logs_bp.py:13: unused function 'stub_log_open' (60% confidence)
tests/unit/test_logs_manage_bp.py:12: unused variable 'pytestmark' (60% confidence)
tests/unit/test_logs_manage_bp.py:15: unused function 'stub_logs_manage' (60% confidence)
tests/unit/test_logs_manage_bp.py:52: unused variable 'target' (100% confidence)
tests/unit/test_logs_manage_bp.py:107: unused variable 'target' (100% confidence)
tests/unit/test_logs_manage_bp.py:113: unused variable 'target' (100% confidence)
tests/unit/test_main_helpers.py:36: unused variable 'kind' (100% confidence)
tests/unit/test_main_helpers.py:100: unused variable 'addr' (100% confidence)
tests/unit/test_main_helpers.py:106: unused variable 'exc' (100% confidence)
tests/unit/test_main_helpers.py:106: unused variable 'exc_type' (100% confidence)
tests/unit/test_main_helpers.py:106: unused variable 'tb' (100% confidence)
tests/unit/test_main_module.py:246: unused attribute 'side_effect' (60% confidence)
tests/unit/test_main_module.py:247: unused attribute 'side_effect' (60% confidence)
tests/unit/test_main_module.py:298: unused attribute 'side_effect' (60% confidence)
tests/unit/test_main_module.py:313: unused attribute 'side_effect' (60% confidence)
tests/unit/test_main_module.py:378: unused attribute 'side_effect' (60% confidence)
tests/unit/test_restart_bp.py:7: unused variable 'pytestmark' (60% confidence)
tests/unit/test_restart_bp.py:10: unused function 'stub_restart' (60% confidence)
tests/unit/test_resume_downloads.py:110: unused variable 'dir_' (100% confidence)
tests/unit/test_resume_downloads.py:160: unused variable 'o' (100% confidence)
tests/unit/test_resume_downloads.py:160: unused variable 'u' (100% confidence)
tests/unit/test_resume_downloads.py:193: unused variable 'o' (100% confidence)
tests/unit/test_resume_downloads.py:193: unused variable 'u' (100% confidence)
tests/unit/test_resume_downloads.py:226: unused variable 'o' (100% confidence)
tests/unit/test_resume_downloads.py:226: unused variable 'u' (100% confidence)
tests/unit/test_schemas.py:14: unused variable 'pytestmark' (60% confidence)
tests/unit/test_utils.py:150: unused variable 'addr' (100% confidence)
```
