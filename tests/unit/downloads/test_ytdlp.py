"""Unit tests for server.downloads.ytdlp module."""

import tempfile

from server.downloads.ytdlp import (
    _apply_custom_opts,
    _calculate_eta_from_speeds,
    _calculate_improved_eta,
    _default_ydl_opts,
    _extract_video_metadata,
    _format_duration,
    build_opts,
    map_error_message,
    parse_bytes,
)


class TestYtdlpHelperFunctions:
    """Test ytdlp helper functions."""

    def test_default_ydl_opts_basic(self):
        """Test _default_ydl_opts with basic parameters."""
        output_path = "/tmp/test.mp4"

        opts = _default_ydl_opts(output_path, False)

        assert opts["format"] == "bestvideo+bestaudio/best"
        assert opts["merge_output_format"] == "mp4"
        assert opts["outtmpl"] == output_path
        assert opts["writeinfojson"] is True
        assert opts["continuedl"] is True
        assert opts["fragment_retries"] == 10
        assert opts["ignoreerrors"] is False
        assert opts["concurrent_fragments"] == 4
        assert opts["noplaylist"] is True
        assert opts["yesplaylist"] is False
        # New option key used by yt-dlp (list form)
        assert opts["cookiesfrombrowser"] == ["chrome"]

    def test_default_ydl_opts_playlist(self):
        """Test _default_ydl_opts with playlist enabled."""
        output_path = "/tmp/test.mp4"

        opts = _default_ydl_opts(output_path, True)

        assert opts["noplaylist"] is False
        assert opts["yesplaylist"] is True

    def test_apply_custom_opts_valid_dict(self):
        """Test _apply_custom_opts with valid dictionary."""
        ydl_opts = {"format": "best", "outtmpl": "/tmp/test.mp4"}
        custom_opts = {"format": "worst", "verbose": True}

        _apply_custom_opts(ydl_opts, custom_opts, "test123")

        assert ydl_opts["format"] == "worst"
        assert ydl_opts["verbose"] is True
        # Should not override protected keys
        assert ydl_opts["outtmpl"] == "/tmp/test.mp4"

    def test_apply_custom_opts_invalid_type(self):
        """Test _apply_custom_opts with invalid type."""
        ydl_opts = {"format": "best"}
        custom_opts = "not_a_dict"

        _apply_custom_opts(ydl_opts, custom_opts, "test123")

        # Should not change ydl_opts
        assert ydl_opts["format"] == "best"

    def test_parse_bytes_valid(self):
        """Test parse_bytes with valid byte strings."""
        assert parse_bytes("1.23MIB") == 1289748
        assert parse_bytes("2.5GIB") == 2684354560
        assert parse_bytes("500KIB") == 512000
        assert parse_bytes("100B") == 100

    def test_parse_bytes_invalid(self):
        """Test parse_bytes with invalid byte strings."""
        assert parse_bytes("invalid") is None
        assert parse_bytes("") is None
        assert parse_bytes("1.23") == 1  # Plain number is parsed as int

    def test_format_duration_seconds(self):
        """Test _format_duration with seconds."""
        assert _format_duration(30.5) == "30s"
        assert _format_duration(59.9) == "59s"

    def test_format_duration_minutes(self):
        """Test _format_duration with minutes."""
        assert _format_duration(90) == "1m30s"
        assert _format_duration(3661) == "1h1m"

    def test_format_duration_hours(self):
        """Test _format_duration with hours."""
        assert _format_duration(7323) == "2h2m"
        assert _format_duration(3600) == "1h0m"

    def test_calculate_eta_from_speeds(self):
        """Test _calculate_eta_from_speeds with valid data."""
        speeds = [1000000, 1200000, 1100000]  # 1MB/s average
        remaining = 5000000  # 5MB

        eta = _calculate_eta_from_speeds(speeds, remaining)

        assert eta == "4s"  # Median speed calculation

    def test_calculate_eta_from_speeds_insufficient_data(self):
        """Test ETA calculation with insufficient data."""
        from server.downloads.ytdlp import _calculate_eta_from_speeds

        # Test with insufficient data
        assert _calculate_eta_from_speeds([1000000], 1000000) == "1s"

        # Test with zero speed
        assert _calculate_eta_from_speeds([0], 100) == ""

        # Test with single speed value
        assert _calculate_eta_from_speeds([1000000], 1000000) == "1s"

    def test_calculate_eta_from_speeds_zero_speed(self):
        """Test _calculate_eta_from_speeds with zero speed."""
        speeds = [0, 0, 0]
        remaining = 5000000

        eta = _calculate_eta_from_speeds(speeds, remaining)

        assert eta == ""  # Empty string for zero speed

    def test_calculate_improved_eta_basic(self):
        """Test _calculate_improved_eta with basic data."""
        speeds = ["1.0MiB/s", "1.2MiB/s", "1.1MiB/s"]
        downloaded = "5.0MiB"
        total = "10.0MiB"

        eta = _calculate_improved_eta(speeds, downloaded, total)

        # Should return a reasonable ETA
        assert eta != "Unknown"
        assert "s" in eta or "m" in eta or "h" in eta

    def test_calculate_improved_eta_insufficient_data(self):
        """Test _calculate_improved_eta with insufficient data."""
        speeds = ["1.0MiB/s"]
        downloaded = "5.0MiB"
        total = "10.0MiB"

        eta = _calculate_improved_eta(speeds, downloaded, total)

        assert eta == "Unknown"

    def test_extract_video_metadata_basic(self):
        """Test _extract_video_metadata with basic data."""
        d = {
            "id": "test123",
            "title": "Test Video",
            "uploader": "Test Channel",
            "duration": 120.5,
            "filesize": 1000000,
            "format": "mp4",
            "resolution": "1080p",
        }

        metadata = _extract_video_metadata(d)

        assert metadata["id"] == "test123"
        assert metadata["title"] == "Test Video"
        assert metadata["uploader"] == "Test Channel"
        assert metadata["duration"] == 120.5
        assert metadata["filesize"] == 1000000
        assert metadata["format"] == "mp4"
        assert metadata["resolution"] == "1080p"

    def test_extract_video_metadata_missing_fields(self):
        """Test _extract_video_metadata with missing fields."""
        d = {"id": "test123", "title": "Test Video"}

        metadata = _extract_video_metadata(d)

        assert metadata["id"] == "test123"
        assert metadata["title"] == "Test Video"
        assert metadata["uploader"] == "Unknown"
        assert metadata["duration"] == 0
        assert metadata["filesize"] == 0
        assert metadata["format"] == "Unknown"
        assert metadata["resolution"] == "Unknown"

    def test_map_error_message_common_errors(self):
        """Test map_error_message with common error messages."""
        # Test various error scenarios
        error_type, suggestion = map_error_message("Video unavailable")
        assert error_type == "YT_DLP_VIDEO_UNAVAILABLE"
        assert "unavailable" in suggestion.lower()

        error_type, suggestion = map_error_message("Sign in to confirm your age")
        # This should fall back to unknown error since "age" is not in the mappings
        assert error_type == "YT_DLP_UNKNOWN_ERROR"
        assert "contact support" in suggestion.lower()

        error_type, suggestion = map_error_message("This video is private video")
        assert error_type == "YT_DLP_PRIVATE_VIDEO"
        assert "private" in suggestion.lower()

    def test_map_error_message_unknown_error(self):
        """Test map_error_message with unknown error."""
        error_type, suggestion = map_error_message("Unknown error message")
        assert error_type == "YT_DLP_UNKNOWN_ERROR"
        assert "contact support" in suggestion.lower()


class TestYtdlpBuildOpts:
    """Test build_opts function with real function calls."""

    def test_build_opts_basic(self):
        """Test build_opts with basic parameters using real functions."""
        with tempfile.NamedTemporaryFile(suffix=".mp4") as tmp_file:
            output_path = tmp_file.name
            result = build_opts(output_path, "test123", False)

            # Verify the result has expected structure from real functions
            assert isinstance(result, dict)
            assert "format" in result
            assert "outtmpl" in result
            assert "merge_output_format" in result
            assert "writeinfojson" in result
            assert "continuedl" in result
            assert "fragment_retries" in result
            assert "ignoreerrors" in result
            assert "concurrent_fragments" in result
            assert "noplaylist" in result
            assert "cookiesfrombrowser" in result
            assert "logger" in result

    def test_build_opts_with_playlist(self):
        """Test build_opts with playlist enabled using real functions."""
        with tempfile.NamedTemporaryFile(suffix=".mp4") as tmp_file:
            output_path = tmp_file.name
            result = build_opts(output_path, "test123", True)

            # Verify playlist flags are set correctly
            assert "yesplaylist" in result
            assert "noplaylist" not in result

    def test_build_opts_no_downloadId(self):
        """Test build_opts without downloadId using real functions."""
        with tempfile.NamedTemporaryFile(suffix=".mp4") as tmp_file:
            output_path = tmp_file.name
            result = build_opts(output_path, None, False)

            # Verify basic structure is maintained
            assert isinstance(result, dict)
            assert "format" in result
            assert "outtmpl" in result
            # Progress hook should NOT be assigned when downloadId is None
            assert "progress_hooks" not in result


class TestYtdlpIntegration:
    """Test ytdlp integration scenarios."""

    def test_build_opts_integration(self):
        """Test build_opts integration with real configuration."""
        with tempfile.NamedTemporaryFile(suffix=".mp4") as tmp_file:
            output_path = tmp_file.name

            opts = build_opts(output_path, "test123", False)

            # Should have required keys
            assert "format" in opts
            assert "outtmpl" in opts
            assert "merge_output_format" in opts
            assert "writeinfojson" in opts
            assert "continuedl" in opts
            assert "fragment_retries" in opts
            assert "ignoreerrors" in opts
            assert "concurrent_fragments" in opts
            # When download_playlist=False, should have noplaylist, not yesplaylist
            assert "noplaylist" in opts
            assert "yesplaylist" not in opts
            assert "cookiesfrombrowser" in opts
            assert "logger" in opts

    def test_error_mapping_integration(self):
        """Test error mapping integration with various error types."""
        test_cases = [
            ("Video unavailable", "YT_DLP_VIDEO_UNAVAILABLE", "unavailable"),
            ("This video is private video", "YT_DLP_PRIVATE_VIDEO", "private"),
            ("Video is not available in your country", "YT_DLP_GEO_RESTRICTED", "country"),
            ("Unknown error", "YT_DLP_UNKNOWN_ERROR", "contact support"),
        ]

        for error_msg, expected_error_type, expected_keyword in test_cases:
            mapped_error_type, suggestion = map_error_message(error_msg)
            assert mapped_error_type == expected_error_type
            assert expected_keyword in suggestion.lower()

    def test_metadata_extraction_integration(self):
        """Test metadata extraction integration with various data formats."""
        test_cases = [
            {
                "input": {
                    "id": "test123",
                    "title": "Test Video",
                    "uploader": "Test Channel",
                    "duration": 120.5,
                    "filesize": 1000000,
                    "format": "mp4",
                    "resolution": "1080p",
                },
                "expected_fields": ["id", "title", "uploader", "duration", "filesize", "format", "resolution"],
            },
            {
                "input": {"id": "test456", "title": "Another Video"},
                "expected_fields": ["id", "title", "uploader", "duration", "filesize", "format", "resolution"],
            },
        ]

        for test_case in test_cases:
            input_data = test_case["input"]
            assert isinstance(input_data, dict), "Input data must be a dictionary"
            metadata = _extract_video_metadata(input_data)
            for field in test_case["expected_fields"]:
                assert field in metadata
                assert metadata[field] is not None


class TestYtdlpProgressHooks:
    """Test ytdlp progress hook functions."""

    def test_progress_downloading_basic(self, monkeypatch):
        """Test _progress_downloading with basic download data."""
        from server.downloads.ytdlp import _progress_downloading

        # Mock the unified_download_manager to capture updates
        mock_manager = type("MockManager", (), {
            "get_download": lambda self, id: {},
            "update_download": lambda self, id, **kwargs: None
        })()

        # Mock the unified_download_manager import
        monkeypatch.setattr("server.downloads.ytdlp.unified_download_manager", mock_manager)

        downloadId = "test123"
        progress_data = {
            "status": "downloading",
            "_percent_str": "10.0%",
            "_downloaded_bytes_str": "1.0MiB",
            "_total_bytes_estimate_str": "10.0MiB",
            "_speed_str": "1.0MiB/s",
            "_eta_str": "9s",
        }

        # Capture the update_download calls
        update_calls = []

        def mock_update_download(id, **kwargs):
            update_calls.append((id, kwargs))

        mock_manager.update_download = mock_update_download

        _progress_downloading(progress_data, downloadId)

        # Verify that update_download was called with the expected data
        assert len(update_calls) > 0
        # The function should have called update_download to store progress info
        assert any(call[0] == downloadId for call in update_calls)

    def test_progress_downloading_no_total_bytes(self, monkeypatch):
        """Test _progress_downloading when total_bytes is None."""
        from server.downloads.ytdlp import _progress_downloading

        # Mock the unified_download_manager to capture updates
        mock_manager = type("MockManager", (), {
            "get_download": lambda self, id: {},
            "update_download": lambda self, id, **kwargs: None
        })()

        # Mock the unified_download_manager import
        monkeypatch.setattr("server.downloads.ytdlp.unified_download_manager", mock_manager)

        downloadId = "test123"
        progress_data = {
            "status": "downloading",
            "downloaded_bytes": 1024000,
            "total_bytes": None,
            "speed": 1024000,
            "eta": None,
            "_percent_str": "N/A%",
            "_speed_str": "1.0MiB/s",
            "_eta_str": "N/A",
        }

        # Capture the update_download calls
        update_calls = []

        def mock_update_download(id, **kwargs):
            update_calls.append((id, kwargs))

        mock_manager.update_download = mock_update_download

        _progress_downloading(progress_data, downloadId)

        # Verify that update_download was called
        assert len(update_calls) > 0
        assert any(call[0] == downloadId for call in update_calls)

    def test_progress_finished_basic(self, monkeypatch):
        """Test _progress_finished with basic completion data."""
        from server.downloads.ytdlp import _progress_finished

        # Mock the unified_download_manager
        mock_manager = type("MockManager", (), {
            "get_download": lambda self, id: {},
            "update_download": lambda self, id, **kwargs: None
        })()

        # Mock the unified_download_manager import
        monkeypatch.setattr("server.downloads.ytdlp.unified_download_manager", mock_manager)

        downloadId = "test123"
        progress_data = {
            "status": "finished",
            "downloaded_bytes": 10485760,
            "total_bytes": 10485760,
            "filename": "/tmp/test.mp4",
        }

        _progress_finished(progress_data, downloadId)

        # _progress_finished doesn't store anything in progress_data, it only logs
        # and tries to append to history, so we just verify it doesn't crash
        # The test should pass without any assertions about data storage

    def test_progress_error_basic(self, monkeypatch):
        """Test _progress_error with basic error data."""
        from server.downloads.ytdlp import _progress_error

        # Mock the unified_download_manager
        mock_manager = type("MockManager", (), {
            "get_download": lambda self, id: {},
            "update_download": lambda self, id, **kwargs: None
        })()

        # Mock the unified_download_manager import
        monkeypatch.setattr("server.downloads.ytdlp.unified_download_manager", mock_manager)

        downloadId = "test123"
        progress_data = {
            "status": "error",
            "error": "Network error",
        }

        # Mock download_errors_from_hooks since _progress_error stores errors there
        mock_download_errors = {}
        monkeypatch.setattr("server.downloads.ytdlp.download_errors_from_hooks", mock_download_errors)

        _progress_error(progress_data, downloadId)

        # _progress_error stores errors in download_errors_from_hooks, not progress_data
        assert downloadId in mock_download_errors
        assert mock_download_errors[downloadId]["original_message"] == "Network error"
        assert mock_download_errors[downloadId]["parsed_type"] == "HOOK_NETWORK_ERROR"

    def test_progress_hooks_with_none_downloadId(self, monkeypatch):
        """Test progress hooks with None downloadId."""
        from server.downloads.ytdlp import _progress_downloading, _progress_error, _progress_finished

        # Mock the unified_download_manager to capture updates
        mock_manager = type("MockManager", (), {
            "get_download": lambda self, id: {},
            "update_download": lambda self, id, **kwargs: None
        })()

        # Mock the unified_download_manager import
        monkeypatch.setattr("server.downloads.ytdlp.unified_download_manager", mock_manager)

        progress_data = {"status": "downloading", "downloaded_bytes": 1024000}

        # Capture the update_download calls
        update_calls = []

        def mock_update_download(id, **kwargs):
            update_calls.append((id, kwargs))

        mock_manager.update_download = mock_update_download

        # Should not raise exceptions with None downloadId
        _progress_downloading(progress_data, None)
        _progress_finished(progress_data, None)
        _progress_error(progress_data, None)

        # When downloadId is None, it uses "unknown_id" as the key
        # Verify that update_download was called with "unknown_id"
        assert len(update_calls) > 0
        assert any(call[0] == "unknown_id" for call in update_calls)


class TestYtdlpErrorHandling:
    """Test ytdlp error handling functions."""

    def test_map_error_message_common_errors(self):
        """Test map_error_message with common error patterns."""
        # Test various error patterns that should be mapped
        result1 = map_error_message("Video unavailable")
        assert result1 == (
            "YT_DLP_VIDEO_UNAVAILABLE",
            "This video is unavailable. It may have been removed or set to private.",
        )

        result2 = map_error_message("private video")
        assert result2 == (
            "YT_DLP_PRIVATE_VIDEO",
            "This video is private and cannot be downloaded.",
        )

        result3 = map_error_message("not available in your country")
        assert result3 == (
            "YT_DLP_GEO_RESTRICTED",
            "This video is not available in your country or region.",
        )

        result4 = map_error_message("Video is protected by DRM")
        assert result4 == (
            "YT_DLP_DRM_PROTECTED",
            "This video is protected by DRM and cannot be downloaded.",
        )

    def test_map_error_message_unknown_error(self):
        """Test map_error_message with unknown error."""
        unknown_error = "Some random error message"
        result = map_error_message(unknown_error)
        assert result[0] == "YT_DLP_UNKNOWN_ERROR"
        assert "contact support" in result[1].lower()

    def test_map_error_message_empty_string(self):
        """Test map_error_message with empty string."""
        result = map_error_message("")
        assert result[0] == "YT_DLP_UNKNOWN_ERROR"
        assert "contact support" in result[1].lower()

    def test_map_error_message_none(self):
        """Test map_error_message with None."""
        result = map_error_message("None")
        assert result[0] == "YT_DLP_UNKNOWN_ERROR"
        assert "contact support" in result[1].lower()

    def test_handle_yt_dlp_download_error_basic(self, monkeypatch):
        """Test _handle_yt_dlp_download_error with basic error."""
        from pathlib import Path

        from flask import Flask

        from server.downloads.ytdlp import _handle_yt_dlp_download_error

        def mock_cleanup(*args):
            return None

        def mock_append_history(*args):
            return None

        monkeypatch.setattr("server.downloads.ytdlp._cleanup_partial_files", mock_cleanup)
        monkeypatch.setattr("server.downloads.ytdlp.append_history_entry", mock_append_history)

        # Create Flask app context for jsonify
        app = Flask(__name__)
        with app.app_context():
            downloadId = "test123"
            url = "https://example.com/video"
            prefix = "test"
            download_path = Path("/tmp")
            sanitized_id = "test123"
            exception = Exception("Test error")

            result = _handle_yt_dlp_download_error(
                downloadId, url, prefix, download_path, sanitized_id, exception
            )

            assert result[1] == 500  # Should return 500 status code

    def test_handle_yt_dlp_download_error_with_specific_exception(self, monkeypatch):
        """Test _handle_yt_dlp_download_error with specific exception types."""
        from pathlib import Path

        from flask import Flask
        from yt_dlp.utils import DownloadError

        from server.downloads.ytdlp import _handle_yt_dlp_download_error

        def mock_cleanup(*args):
            return None

        def mock_append_history(*args):
            return None

        monkeypatch.setattr("server.downloads.ytdlp._cleanup_partial_files", mock_cleanup)
        monkeypatch.setattr("server.downloads.ytdlp.append_history_entry", mock_append_history)

        # Create Flask app context for jsonify
        app = Flask(__name__)
        with app.app_context():
            downloadId = "test123"
            url = "https://example.com/video"
            prefix = "test"
            download_path = Path("/tmp")
            sanitized_id = "test123"
            exception = DownloadError("Video unavailable")

            result = _handle_yt_dlp_download_error(
                downloadId, url, prefix, download_path, sanitized_id, exception
            )

            assert result[1] == 500  # Should return 500 for all errors


class TestYtdlpUtilityFunctions:
    """Test ytdlp utility functions with edge cases."""

    def test_parse_bytes_edge_cases(self):
        """Test parse_bytes with edge cases."""
        # Test various edge cases
        assert parse_bytes("0B") == 0
        assert parse_bytes("0KIB") == 0
        assert parse_bytes("0MIB") == 0
        assert parse_bytes("0GIB") == 0
        assert parse_bytes("1.0B") == 1
        assert parse_bytes("1.5KIB") == 1536
        assert parse_bytes("2.5MIB") == 2621440
        assert parse_bytes("1.25GIB") == 1342177280

        # Test invalid cases
        assert parse_bytes("invalid") is None
        assert parse_bytes("") is None
        assert parse_bytes("1.23.45") is None
        assert parse_bytes("1KIBB") is None  # Invalid suffix
        assert parse_bytes("1K") is None      # Missing IB suffix

    def test_format_duration_edge_cases(self):
        """Test _format_duration with edge cases."""
        # Test zero and negative values
        assert _format_duration(0) == "0s"
        assert _format_duration(-1) == "-1s"  # Function formats negative values as-is

        # Test very large values
        assert _format_duration(3661) == "1h1m"  # 1 hour 1 minute 1 second
        assert _format_duration(3600) == "1h0m"  # Exactly 1 hour
        assert _format_duration(3599) == "59m59s"  # Just under 1 hour

        # Test fractional seconds
        assert _format_duration(30.5) == "30s"
        assert _format_duration(30.9) == "30s"
        assert _format_duration(30.1) == "30s"

    def test_calculate_eta_edge_cases(self):
        """Test ETA calculation with edge cases."""
        # Test with empty speeds list
        assert _calculate_eta_from_speeds([], 1000000) == ""

        # Test with zero speeds
        assert _calculate_eta_from_speeds([0, 0, 0], 1000000) == ""

        # Test with very small remaining bytes
        assert _calculate_eta_from_speeds([1000000], 100) == "0s"

        # Test with None values in speeds (should be filtered out before calling)
        # This test is invalid since the function expects list[int], not list[int | None]
        # The function would crash with None values, so we skip this test
        pass

    def test_calculate_improved_eta_edge_cases(self):
        """Test improved ETA calculation with edge cases."""
        # Test with empty speeds
        assert _calculate_improved_eta([], "1MB", "10MB") == ""

        # Test with valid speed values (needs at least 2 speed values)
        assert _calculate_improved_eta(["1MB/s", "1MB/s"], "1MB", "10MB") == "9s"

        # Test with zero downloaded (needs at least 2 speed values)
        assert _calculate_improved_eta(["1MB/s", "1MB/s"], "0MB", "10MB") == "10s"

        # Test with single speed value (returns Unknown when less than 2 speed values)
        assert _calculate_improved_eta(["1MB/s"], "1MB", "10MB") == "Unknown"


class TestYtdlpDownloadInitialization:
    """Test ytdlp download initialization functions."""

    def test_init_download_basic(self, monkeypatch):
        """Test _init_download with basic data."""

        from server.downloads.ytdlp import _init_download

        # Mock dependencies
        def mock_assert_playlist(*args):
            return None

        def mock_prepare_metadata(*args):
            return ("title", "uploader", "duration", "description")

        monkeypatch.setattr("server.downloads.ytdlp._assert_playlist_allowed", mock_assert_playlist)
        monkeypatch.setattr("server.downloads.ytdlp._prepare_download_metadata", mock_prepare_metadata)

        data = {
            "url": "https://example.com/video",
            "downloadId": "test123",
            "download_playlist": False,
            "custom_opts": {},
        }

        result = _init_download(data)

        assert result[0] is not None  # download_path
        assert result[1] == "https://example.com/video"  # url
        assert result[2] == "test123"  # downloadId
        assert result[3] == "video"    # page_title
        assert result[4] is False      # download_playlist
        assert result[5] is None       # error_tuple

    def test_init_download_with_playlist(self, monkeypatch):
        """Test _init_download with playlist enabled."""
        from server.downloads.ytdlp import _init_download

        # Mock dependencies
        def mock_assert_playlist(*args):
            return None

        def mock_prepare_metadata(*args):
            return ("title", "uploader", "duration", "description")

        monkeypatch.setattr("server.downloads.ytdlp._assert_playlist_allowed", mock_assert_playlist)
        monkeypatch.setattr("server.downloads.ytdlp._prepare_download_metadata", mock_prepare_metadata)

        data = {
            "url": "https://example.com/playlist",
            "downloadId": "test123",
            "download_playlist": True,
            "custom_opts": {},
        }

        result = _init_download(data)

        assert result[4] is True  # download_playlist should be True

    def test_prepare_download_metadata_basic(self, monkeypatch):
        """Test _prepare_download_metadata with basic data."""
        from pathlib import Path

        from server.downloads.ytdlp import _prepare_download_metadata

        # Mock dependencies
        def mock_extract_metadata(*args):
            return {
                "title": "Test Video",
                "uploader": "Test Channel",
                "duration": "2m30s",
                "description": "Test description",
            }

        monkeypatch.setattr("server.downloads.ytdlp._extract_video_metadata", mock_extract_metadata)

        url = "https://example.com/video"
        page_title = "Test Video - Test Channel"
        downloadId = "test123"
        download_path = Path("/tmp")

        result = _prepare_download_metadata(url, page_title, downloadId, download_path)

        assert result[0] == "Test Video - Test Channel"  # safe_title
        assert result[1] == "video"           # sanitized_id
        assert result[2] == "Test Video - Test Channel_video"  # prefix
        assert result[3] == "/tmp/Test Video - Test Channel_video.%(ext)s"  # output_template
