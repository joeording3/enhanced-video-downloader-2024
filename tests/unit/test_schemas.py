"""
Tests for the schemas module.

These tests verify that the Pydantic models and validators are working correctly.
"""

from typing import Any, Dict

import pytest
from pydantic import ValidationError

from server.schemas import ConfigUpdate, DownloadRequest

pytestmark = pytest.mark.unit


class TestDownloadRequestValidation:
    """Test DownloadRequest model validation with parameterized test cases."""

    @pytest.mark.parametrize(
        "url, user_agent, expected_playlist, description",
        [
            (
                "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "chrome",
                False,
                "Valid YouTube URL with default playlist setting",
            ),
            (
                "https://vimeo.com/123456789",
                "firefox",
                True,
                "Valid Vimeo URL with playlist enabled",
            ),
        ],
    )
    def test_download_request_valid_urls(
        self, url: str, user_agent: str, expected_playlist: bool, description: str
    ) -> None:
        """Test that DownloadRequest accepts valid URLs with various configurations.

        :param url: The URL to test
        :param user_agent: The user agent string
        :param expected_playlist: Expected download_playlist value
        :param description: Test case description for clarity
        """
        request = DownloadRequest(
            url=url, user_agent=user_agent, download_playlist=expected_playlist
        )  # type: ignore[call-arg]
        assert request.url == url
        assert request.user_agent == user_agent
        assert request.download_playlist == expected_playlist

    @pytest.mark.parametrize(
        "url, user_agent, expected_error",
        [
            ("http://a", "chrome", "Short"),
            ("file:///etc/passwd", "chrome", "Unsafe"),
            ("ftp://example.com", "chrome", "Invalid"),
            ("not-a-url", "chrome", "Short"),
            ("", "chrome", "Short"),
        ],
    )
    def test_download_request_invalid_urls(self, url: str, user_agent: str, expected_error: str) -> None:
        """Test that DownloadRequest rejects invalid URLs with appropriate error messages.

        :param url: The invalid URL to test
        :param user_agent: The user agent string
        :param expected_error: Expected error message pattern
        """
        with pytest.raises(ValidationError, match=expected_error):
            DownloadRequest(url=url, user_agent=user_agent)  # type: ignore[call-arg]


class TestConfigUpdateValidation:
    """Test ConfigUpdate model validation with parameterized test cases."""

    @pytest.mark.parametrize(
        "config_data, description",
        [
            (
                {"server_port": 5050, "download_dir": "/tmp/downloads", "debug_mode": True},
                "Valid config with all fields",
            ),
            (
                {"server_port": 1024, "download_dir": "/var/logs"},
                "Valid config with minimum port value",
            ),
            (
                {"server_port": 65535, "download_dir": "/home/user/downloads"},
                "Valid config with maximum port value",
            ),
        ],
    )
    def test_config_update_valid_configs(self, config_data: Dict[str, Any], description: str) -> None:
        """Test that ConfigUpdate accepts valid configuration data.

        :param config_data: Configuration data to test
        :param description: Test case description for clarity
        """
        config = ConfigUpdate(**config_data)  # type: ignore[call-arg]
        for key, value in config_data.items():
            assert getattr(config, key) == value

    @pytest.mark.parametrize(
        "config_data, expected_error",
        [
            ({"server_port": 80}, "greater than or equal to 1024"),
            ({"server_port": 70000}, "less than or equal to 65535"),
            ({"download_dir": "downloads"}, "Invalid"),
            ({"download_dir": "relative/path"}, "Invalid"),
            ({"server_port": 0}, "greater than or equal to 1024"),
            ({"server_port": -1}, "greater than or equal to 1024"),
        ],
    )
    def test_config_update_invalid_configs(self, config_data: Dict[str, Any], expected_error: str) -> None:
        """Test that ConfigUpdate rejects invalid configuration data.

        :param config_data: Invalid configuration data to test
        :param expected_error: Expected error message pattern
        """
        with pytest.raises(ValidationError, match=expected_error):
            ConfigUpdate(**config_data)  # type: ignore[call-arg]

    @pytest.mark.parametrize(
        "ytdlp_options, expected_value",
        [
            ({"format": "testformat"}, {"format": "testformat"}),
            ({"format": "best", "quality": "high"}, {"format": "best", "quality": "high"}),
            ({}, {}),
        ],
    )
    def test_config_update_ytdlp_options(self, ytdlp_options: Dict[str, Any], expected_value: Dict[str, Any]) -> None:
        """Test that ConfigUpdate properly handles yt-dlp options via both alias and field name.

        :param ytdlp_options: yt-dlp options to test
        :param expected_value: Expected value in the config
        """
        # Test via alias
        config_alias = ConfigUpdate(ytdlp_options=ytdlp_options)  # type: ignore[call-arg]
        assert config_alias.yt_dlp_options == expected_value

        # Test via field name directly
        config_field = ConfigUpdate(yt_dlp_options=ytdlp_options)  # type: ignore[call-arg]
        assert config_field.yt_dlp_options == expected_value
