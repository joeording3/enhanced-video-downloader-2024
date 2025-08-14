# Enhanced Video Downloader Server - API Reference

Note: All endpoints are prefixed with the `/api` base path (e.g., `/api/download`, `/api/status`).

This document describes the API routes available in the Enhanced Video Downloader server.

## Current Project Status

### Test Quality Crisis (Critical Priority)

- **Overall JS/TS Mutation Score**: 38.24% (target: 80%, minimum: 70%)
- **Python Server Coverage**: 67% (improved from 58%)
- **API Module Coverage**: Excellent coverage achieved across all API modules (90-100%)

### Recent Major Achievements

- **Documentation Standardization**: Completed standardization of documentation file naming
  convention
- **Server Test Coverage Milestone**: Improved server coverage from ~58% to 67% with excellent API
  module coverage
- **Property-Based Testing**: Implemented 28 property-based tests using Hypothesis for critical
  Python functions
- **Test Suite Consolidation**: Refactored repetitive test patterns using parameterized testing
  across 14 test files
- **CLI Modularization**: Restructured server CLI into modular components with improved organization

## Table of Contents

- [Download API](#download-api)
- [Status API](#status-api)
- [History API](#history-api)
- [Configuration API](#configuration-api)
- [Debug API](#debug-api)
- [Health & Maintenance API](#health--maintenance-api)
- [Logs API](#logs-api)
- [Error Handling](#error-handling)
- [Testing & Quality](#testing--quality)

## Download API

### POST /download

Downloads a video from a URL using yt-dlp.

**Request Body:**

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "user_agent": "chrome",
  "referrer": "https://www.youtube.com",
  "format": "bestvideo+bestaudio/best",
  "is_playlist": false,
  "downloadId": "unique-id-123"
}
```

**Response (200):**

```json
{
  "status": "success",
  "message": "Download started",
  "downloadId": "unique-id-123",
  "title": "Video Title",
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

**Response (400):**

```json
{
  "status": "error",
  "message": "Missing required field: url",
  "error_type": "VALIDATION_ERROR"
}
```

**Response (500):**

```json
{
  "status": "error",
  "message": "Failed to start download: <error details>",
  "error_type": "SERVER_ERROR"
}
```

Common error types include:

- `YT_DLP_UNSUPPORTED_URL`: The provided URL is not supported or is invalid.
- `YT_DLP_NO_FORMATS`: No downloadable media was found on the page (e.g., you clicked Download on a non-video page). Open the actual video URL and try again.
- `YT_DLP_VIDEO_UNAVAILABLE`, `YT_DLP_PRIVATE_VIDEO`, `YT_DLP_GEO_RESTRICTED`, `YT_DLP_DRM_PROTECTED`.

Note: The server now writes yt-dlp's info JSON using `writeinfojson`, storing metadata in
the consolidated history file upon download completion. By default the history file is
`<download_dir>/history.json`, overrideable via the `history_file` config or `HISTORY_FILE` env var.
Use `GET /api/history` to retrieve enriched
entries.

### POST /gallery-dl

Downloads a gallery or image using gallery-dl.

**Request Body:**

```json
{
  "url": "https://imgur.com/gallery/abcdef",
  "download_type": "gallery",
  "downloadId": "unique-id-123"
}
```

**Response (200):**

```json
{
  "status": "success",
  "message": "Gallery download started",
  "downloadId": "unique-id-123"
}
```

**Response (400):**

```json
{
  "status": "error",
  "message": "Missing required field: url",
  "error_type": "VALIDATION_ERROR"
}
```

**Response (500):**

```json
{
  "status": "error",
  "message": "Failed to start gallery download: <error details>",
  "error_type": "SERVER_ERROR"
}
```

### POST /resume

Resumes failed or incomplete downloads.

**Request Body:**

```json
{
  "ids": ["download-id-1", "download-id-2"]
}
```

**Response (200):**

```json
{
  "status": "success",
  "resumed": 2,
  "failed": 0
}
```

**Response (400):**

```json
{
  "status": "error",
  "message": "Invalid request: missing ids array",
  "error_type": "VALIDATION_ERROR"
}
```

### POST /download/{download_id}/cancel

Cancel an active download and remove any partial files.

**Path Parameters:**

- `download_id` (string): Unique identifier of the download to cancel.

**Response (200):**

```json
{
  "status": "success",
  "message": "Download canceled.",
  "downloadId": "download-id-123"
}
```

**Response (404):**

```json
{
  "status": "error",
  "message": "No active download with given ID.",
  "downloadId": "download-id-123",
  "error_type": "NOT_FOUND"
}
```

### POST /download/{download_id}/pause

Pause an active download by suspending its process.

**Path Parameters:**

- `download_id` (string): Unique identifier of the download to pause.

**Response (200):**

```json
{
  "status": "success",
  "message": "Download paused.",
  "downloadId": "download-id-123"
}
```

**Response (404):**

```json
{
  "status": "error",
  "message": "No active download with given ID.",
  "downloadId": "download-id-123",
  "error_type": "NOT_FOUND"
}
```

**Response (500):**

```json
{
  "status": "error",
  "message": "Failed to pause download: <error message>",
  "downloadId": "download-id-123",
  "error_type": "SERVER_ERROR"
}
```

### POST /download/{download_id}/resume

Resume a paused download by continuing its process.

**Path Parameters:**

- `download_id` (string): Unique identifier of the download to resume.

**Response (200):**

```json
{
  "status": "success",
  "message": "Download resumed.",
  "downloadId": "download-id-123"
}
```

**Response (404):**

```json
{
  "status": "error",
  "message": "No paused download with given ID.",
  "downloadId": "download-id-123",
  "error_type": "NOT_FOUND"
}
```

**Response (500):**

```json
{
  "status": "error",
  "message": "Failed to resume download: <error message>",
  "downloadId": "download-id-123",
  "error_type": "SERVER_ERROR"
}
```

### POST /download/{download_id}/priority

Set the OS process priority (nice value) for an active download.

**Request Body:**

```json
{ "priority": 5 }
```

**Response (200):**

```json
{
  "status": "success",
  "downloadId": "unique-id-123",
  "priority": 5
}
```

**Response (400):**

```json
{
  "status": "error",
  "message": "Invalid priority value: ['must be integer']",
  "error_type": "VALIDATION_ERROR"
}
```

**Response (404):**

```json
{
  "status": "error",
  "message": "No active download with given ID.",
  "downloadId": "unique-id-123",
  "error_type": "NOT_FOUND"
}
```

**Response (500):**

```json
{
  "status": "error",
  "message": "Failed to set priority: <error message>",
  "downloadId": "unique-id-123",
  "error_type": "SERVER_ERROR"
}
```

## Status API

### GET /status

Return current download progress, full progress history, and any error details for all downloads.

**Response (200):**

```json
{
  "<downloadId>": {
    "status": "downloading",
    "percent": "25.0%",
    "downloaded": "2MiB",
    "total": "8MiB",
    "speed": "256KiB/s",
    "eta": "30s",
    "history": [
      {
        "timestamp": "2025-01-27T12:34:56Z",
        "percent": "25.0%",
        "downloaded": "2MiB",
        "total": "8MiB",
        "speed": "256KiB/s",
        "eta": "30s"
      }
    ],
    "speeds": [
      {
        "timestamp": "2025-01-27T12:34:56Z",
        "speed": "256KiB/s"
      }
    ]
  }
}
```

### GET /status/{download_id}

Return detailed progress information for a specific download.

**Response (200):**

```json
{
  "status": "downloading",
  "percent": "25.0%",
  "downloaded": "2MiB",
  "total": "8MiB",
  "speed": "256KiB/s",
  "eta": "30s",
  "history": [
    {
      "timestamp": "2025-01-27T12:34:56Z",
      "percent": "25.0%",
      "downloaded": "2MiB",
      "total": "8MiB",
      "speed": "256KiB/s",
      "eta": "30s"
    }
  ],
  "speeds": [
    {
      "timestamp": "2025-01-27T12:34:56Z",
      "speed": "256KiB/s"
    }
  ]
}
```

**Response (404):**

```json
{
  "status": "error",
  "message": "Download not found",
  "error_type": "NOT_FOUND"
}
```

### GET /status/{download_id} Error Case

Return error details and user-friendly troubleshooting suggestions when a download hook error has
occurred.

**Response (200):**

```json
{
  "error": {
    "original_message": "fail",
    "parsed_type": "HOOK_ERROR",
    "source": "hook",
    "details": {}
  },
  "troubleshooting": "A download error occurred: fail"
}
```

### DELETE /status/{download_id}

Clear progress and error information for a specific download.

**Response (200):**

```json
{ "status": "success", "message": "Status cleared" }
```

**Response (404):**

```json
{
  "status": "error",
  "message": "Download not found",
  "error_type": "NOT_FOUND"
}
```

### DELETE /status?status={state}&age={seconds}

Bulk clear progress entries matching the given state (e.g., "downloading") and/or those older than
the given age (in seconds).

You can use query parameters `status` and `age` together or separately, e.g.,
`/status?status=downloading&age=60`.

**Response (200):**

```json
{
  "status": "success",
  "cleared_count": 2,
  "cleared_ids": ["id1", "id2"]
}
```

## History API

## Queue API (Server-side)

### Behavior

- The server enforces `max_concurrent_downloads` from config. When the limit is reached, POST
  `/api/download` will enqueue the request and return:

```json
{
  "status": "queued",
  "message": "Server at capacity. Request added to queue.",
  "downloadId": "<id>"
}
```

- The queue is processed in the background; when a slot frees up, queued items are started
  automatically.

### Status visibility

- `GET /api/status` now includes queued items as entries with:

```json
"<downloadId>": { "status": "queued", "url": "..." }
```

### GET /api/queue

Returns the current queue contents.

Response:

```json
{ "queue": [{ "downloadId": "id1", "url": "https://..." }, { "downloadId": "id2" }] }
```

### POST /api/queue/reorder

Reorder the queue by specifying a new list of IDs.

Request body:

```json
{ "order": ["id2", "id1", "id3"] }
```

Response: `{ "status": "success" }`

### POST /api/queue/<id>/remove

Remove a queued item by ID.

Response:

```json
{ "status": "success", "downloadId": "id1" }
```

### GET /history

Retrieves download history with optional filters and pagination.

**Query Parameters:**

- `status` (optional): Filter by download status (e.g., `completed`, `failed`).
- `domain` (optional): Filter by URL domain substring.
- `page` (optional, int): Page number (1-based). Default: 1.
- `per_page` (optional, int): Items per page. Default: all items.

**Response (200):**

```json
{
  "history": [
    {
      "id": "download-id-1",
      "page_title": "Video Title",
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "timestamp": "2025-01-27T12:34:56Z",
      "status": "completed",
      "filename": "Video Title-dQw4w9WgXcQ.mp4",
      "detail": [
        {
          "title": "Video Title",
          "duration": 180,
          "uploader": "Channel Name",
          "view_count": 1000000,
          "description": "Video description..."
        }
      ],
      "error": null
    }
  ],
  "total_items": 42
}
```

### POST /history

Sync or append history entries.

- Send a JSON array to replace the full history.
- Send a JSON object with `action: "clear"` to clear history.
- Send a JSON object representing a single history entry to append it.

**Examples:**

Replace all history:

```json
[
  {
    "id": "download-id-1",
    "url": "https://...",
    "filename": "...",
    "page_title": "...",
    "timestamp": "...",
    "status": "completed",
    "detail": [],
    "error": null
  }
]
```

Clear history:

```json
{ "action": "clear" }
```

Append entry:

```json
{
  "id": "download-id-123",
  "url": "https://...",
  "filename": "...",
  "page_title": "...",
  "timestamp": "2025-01-27T12:34:56Z",
  "status": "queued",
  "detail": [],
  "error": null
}
```

## Configuration API

### GET /config

Retrieves server configuration, including yt-dlp options.

**Response (200):**

```json
{
  "server_port": <SERVER_PORT>,
  "download_dir": "/Users/username/Downloads/videos",
  "enable_history": true,
  "log_level": "info",
  "console_log_level": "warning",
  "debug_mode": false,
  "max_concurrent_downloads": 3,
  "download_history_limit": 1000,
  "allowed_domains": [],
  "ffmpeg_path": null,
  "scan_interval_ms": 1000,
  "allow_playlists": false,
  "yt_dlp_options": {
    "format": "bestvideo+bestaudio/best",
    "merge_output_format": "mp4",
    "concurrent_fragments": 4,
    "fragment_retries": 10,
    "continuedl": true,
    "writeinfojson": true,
    "cookiesfrombrowser": ["chrome"]
  }
}
```

### POST /config

Updates server configuration. Available keys:

- `server_port`, `download_dir`, `debug_mode`, `enable_history`,
- `log_level`, `console_log_level`, `max_concurrent_downloads`,
- `download_history_limit`, `allowed_domains`, `ffmpeg_path`,
- `scan_interval_ms`, `allow_playlists`, `yt_dlp_options` (dictionary).

**Examples with yt-dlp options:**

```json
{
  "yt_dlp_options": {
    "format": "mp4",
    "merge_output_format": "mp4",
    "concurrent_fragments": 6,
    "fragment_retries": 8,
    "continuedl": true,
    "cookiesfrombrowser": ["firefox"]
  }
}
```

**Response (200):**

```json
{ "success": true }
```

**Response (400):**

```json
{
  "status": "error",
  "message": "Invalid configuration: <validation error>",
  "error_type": "VALIDATION_ERROR"
}
```

## Debug API

### GET /debug/paths

Returns server path information for debugging.

**Response (200):**

```json
{
  "app_root": "/path/to/app",
  "config_path": "/path/to/app/config.json",
  "download_dir": "/Users/username/Downloads/videos",
  "log_path": "/path/to/app/server_output.log",
  "current_working_dir": "/path/to/current/dir",
  "config_exists": true,
  "config_content": { ... },
  "log_files": ["server_output.log", "error.log"],
  "logging_config": { ... },
  "test_write": "success"
}
```

## Health & Maintenance API

### GET /api/health

Returns server health status.

**Response (200):**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T12:34:56Z"
}
```

### POST /restart

Restarts the server. This endpoint will initiate a graceful shutdown and restart of the server
process.

**Response (200):**

```json
{
  "status": "success",
  "message": "Server restart initiated"
}
```

## Logs API

### GET /logs

### GET /logs/

Retrieves server logs. The endpoint supports an optional trailing slash.

**Query Parameters:**

- `lines` (optional, int): Number of lines to retrieve. Default: 100.
- `recent` (optional, bool): If true, returns most recent lines first. Default: true.

**Response (200):**

Plain text log output.

**Response (500):**

```json
{
  "status": "error",
  "message": "Failed to read logs: <error details>",
  "error_type": "SERVER_ERROR"
}
```

### POST /logs/clear

Clears all server logs.

**Response (200):**

```json
{
  "success": true,
  "message": "Logs cleared successfully."
}
```

## Error Handling

### Error Response Format

All error responses follow a consistent format:

```json
{
  "status": "error",
  "message": "Human-readable error description",
  "error_type": "ERROR_CATEGORY"
}
```

### Error Types

- **VALIDATION_ERROR**: Invalid request data or missing required fields
- **NOT_FOUND**: Requested resource not found
- **SERVER_ERROR**: Internal server error or processing failure
- **HOOK_ERROR**: Download process hook error (specific to status endpoints)

### Error Handling Features

- **Consistent Format**: All error responses use the same structure
- **Error Type Classification**: Categorized error types for client handling
- **Troubleshooting Suggestions**: User-friendly error messages with contextual help
- **Detailed Error Information**: Comprehensive error details for debugging

## Testing & Quality

### API Test Coverage

The API endpoints have excellent test coverage:

- **server/api/logs_bp.py**: 100% coverage (0 missing lines)
- **server/api/status_bp.py**: 92% coverage (13 missing lines)
- **server/api/download_bp.py**: 91% coverage (18 missing lines)
- **server/api/config_bp.py**: 98% coverage (1 missing line)
- **All other API modules**: 100% coverage

### Test Types

- **Unit Tests**: Isolated function/module tests with mocked dependencies
- **Integration Tests**: API endpoint tests with real Flask app
- **Concurrent Operations**: Tests for race conditions and thread safety
- **Error Handling**: Comprehensive error scenario testing

### Quality Assurance

- **Mutation Testing**: Stryker (JS/TS) and Mutmut (Python) for test quality validation
- **Property-Based Testing**: 28 Hypothesis-based tests for critical Python functions
- **Parameterized Testing**: Consolidated repetitive test patterns across 14 test files
- **CI Enforcement**: Automated quality checks on every commit and PR

### Test Infrastructure

- **Comprehensive Test Suite**: 820+ passing tests (Python + JavaScript/TypeScript)
- **Test Documentation**: Sphinx-style docstrings (Python) and JSDoc comments (JS/TS)
- **Test Maintenance**: Regular audits and quality improvements
- **Coverage Thresholds**: 80% minimum coverage requirement

---

**Last Updated**: 2025-01-27 **API Version**: 1.0 **Test Coverage**: Excellent (90-100% for API
modules) **Quality Status**: High (comprehensive testing and error handling)
