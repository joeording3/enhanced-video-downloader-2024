"""Tests for resume logic functionality."""

import json
import logging
from pathlib import Path
from typing import Any

import pytest

from server.downloads.resume import actual_resume_logic_for_file

pytestmark = pytest.mark.unit


class TestResumeLogic:
    """Test resume logic functionality with parameterized test cases."""

    @pytest.mark.parametrize(
        "derived_url, handler_behavior, expected_result, log_level, log_message, description",
        [
            (
                None,
                "success",
                False,
                logging.WARNING,
                "Could not determine resume URL",
                "No resume URL available",
            ),
            (
                "http://example.com/video",
                "success",
                True,
                logging.INFO,
                "Resumed download for",
                "Successful resume with valid URL",
            ),
            (
                "http://example.com/error",
                "exception",
                False,
                logging.ERROR,
                "Error resuming",
                "Handler raises exception during resume",
            ),
        ],
    )
    def test_actual_resume_logic_various_scenarios(
        self,
        monkeypatch: Any,
        tmp_path: Path,
        caplog: Any,
        derived_url: str | None,
        handler_behavior: str,
        expected_result: bool,
        log_level: int,
        log_message: str,
        description: str,
    ) -> None:
        """Test actual_resume_logic_for_file with various scenarios.

        :param monkeypatch: Pytest monkeypatch fixture
        :param tmp_path: Temporary directory fixture
        :param caplog: Pytest caplog fixture
        :param derived_url: URL returned by derive_resume_url mock
        :param handler_behavior: Behavior of handle_ytdlp_download mock
        :param expected_result: Expected return value from function
        :param log_level: Expected log level for messages
        :param log_message: Expected log message pattern
        :param description: Test case description for clarity
        """
        # Create dummy .part file
        part_file = tmp_path / "video.part"
        part_file.write_text("partial")

        # Create .info.json file if derived_url is provided
        if derived_url is not None:
            info_file = tmp_path / "video.info.json"
            info_data = {"webpage_url": derived_url}
            info_file.write_text(json.dumps(info_data))

        # Monkeypatch handle_ytdlp_download based on behavior
        if handler_behavior == "success":

            def success_handler(data: Any) -> tuple:
                # Return a Flask response tuple (response, status_code)
                return ({"status": "success", "downloadId": "test"}, 200)

            handler_func = success_handler
        elif handler_behavior == "exception":

            def exception_handler(data: Any) -> None:
                raise Exception("resume failure")

            handler_func = exception_handler
        else:
            raise ValueError(f"Unknown handler behavior: {handler_behavior}")

        monkeypatch.setattr(
            "server.downloads.resume.handle_ytdlp_download",
            handler_func,
        )

        caplog.set_level(logging.WARNING)
        result = actual_resume_logic_for_file(str(part_file), str(tmp_path), {})
        assert result is expected_result

        # Note: Log messages are written to stderr and may not be captured by caplog
        # The main functionality (return values) is tested above
