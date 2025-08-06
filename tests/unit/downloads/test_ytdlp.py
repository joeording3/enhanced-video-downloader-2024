"""Unit tests for server.downloads.ytdlp module."""

import tempfile

from server.downloads.ytdlp import (
    _apply_custom_opts,
    _calculate_eta_from_speeds,
    _calculate_improved_eta,
    _default_ydl_opts,
    _extract_video_metadata,
    _format_duration,
    _map_error_message,
    _parse_bytes,
    build_opts,
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
        assert opts["cookies_from_browser"] == "chrome"

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
        """Test _parse_bytes with valid byte strings."""
        assert _parse_bytes("1.23MIB") == 1289748
        assert _parse_bytes("2.5GIB") == 2684354560
        assert _parse_bytes("500KIB") == 512000
        assert _parse_bytes("100B") == 100

    def test_parse_bytes_invalid(self):
        """Test _parse_bytes with invalid byte strings."""
        assert _parse_bytes("invalid") is None
        assert _parse_bytes("") is None
        assert _parse_bytes("1.23") == 1  # Plain number is parsed as int

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
        """Test _calculate_eta_from_speeds with insufficient data."""
        speeds = [1000000]  # Only one data point
        remaining = 5000000

        eta = _calculate_eta_from_speeds(speeds, remaining)

        assert eta == "5s"  # Single speed value is used

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
        """Test _map_error_message with common error messages."""
        # Test various error scenarios
        error_type, suggestion = _map_error_message("Video unavailable")
        assert error_type == "YT_DLP_VIDEO_UNAVAILABLE"
        assert "unavailable" in suggestion.lower()

        error_type, suggestion = _map_error_message("Sign in to confirm your age")
        # This should fall back to unknown error since "age" is not in the mappings
        assert error_type == "YT_DLP_UNKNOWN_ERROR"
        assert "contact support" in suggestion.lower()

        error_type, suggestion = _map_error_message("This video is private video")
        assert error_type == "YT_DLP_PRIVATE_VIDEO"
        assert "private" in suggestion.lower()

    def test_map_error_message_unknown_error(self):
        """Test _map_error_message with unknown error."""
        error_type, suggestion = _map_error_message("Unknown error message")
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
            assert "cookies_from_browser" in result
            assert "logger" in result

    def test_build_opts_with_playlist(self):
        """Test build_opts with playlist enabled using real functions."""
        with tempfile.NamedTemporaryFile(suffix=".mp4") as tmp_file:
            output_path = tmp_file.name
            result = build_opts(output_path, "test123", True)

            # Verify playlist flags are set correctly
            assert "yesplaylist" in result
            assert "noplaylist" not in result

    def test_build_opts_no_download_id(self):
        """Test build_opts without download_id using real functions."""
        with tempfile.NamedTemporaryFile(suffix=".mp4") as tmp_file:
            output_path = tmp_file.name
            result = build_opts(output_path, None, False)

            # Verify basic structure is maintained
            assert isinstance(result, dict)
            assert "format" in result
            assert "outtmpl" in result
            # Progress hook should NOT be assigned when download_id is None
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
            assert "cookies_from_browser" in opts
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
            mapped_error_type, suggestion = _map_error_message(error_msg)
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
