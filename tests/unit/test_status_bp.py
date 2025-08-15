"""
Test the status API blueprint module.

This module tests the helper functions and edge cases in server/api/status_bp.py
that may not be covered by integration tests.
"""

from datetime import datetime, timedelta, timezone
from typing import Any

import pytest
from flask import Flask
from flask.testing import FlaskClient

from server.api.status_bp import (
    _analyze_progress_trend,
    _enhance_status_data,
    _format_bytes,
    _format_duration,
    status_bp,
)


@pytest.fixture
def app() -> Flask:
    """Create a Flask app for testing.

    :returns: Flask app instance.
    """
    app = Flask(__name__)
    app.register_blueprint(status_bp)
    return app


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    """Create a Flask test client.

    :param app: Flask app fixture.
    :returns: Flask test client.
    """
    return app.test_client()


class TestStatusHelperFunctions:
    """Test the helper functions in status_bp.py."""

    @pytest.mark.parametrize(
        "seconds, expected",
        [
            (0, "0s"),
            (30, "30s"),
            (60, "1m0s"),
            (90, "1m30s"),
            (3600, "1h0m"),
            (3661, "1h1m"),
            (7200, "2h0m"),
        ],
    )
    def test_format_duration(self, seconds: float, expected: str) -> None:
        """Test _format_duration function with various inputs.

        :param seconds: Duration in seconds.
        :param expected: Expected formatted string.
        :returns: None.
        """
        result = _format_duration(seconds)
        assert result == expected

    @pytest.mark.parametrize(
        "bytes_value, expected",
        [
            (0, "0.0B"),
            (1024, "1.0KB"),
            (1024 * 1024, "1.0MB"),
            (1024 * 1024 * 1024, "1.0GB"),
            (1024 * 1024 * 1024 * 1024, "1.0TB"),
            (1024 * 1024 * 1024 * 1024 * 1024, "1.0PB"),
            (512, "512.0B"),
            (1536, "1.5KB"),
        ],
    )
    def test_format_bytes(self, bytes_value: float, expected: str) -> None:
        """Test _format_bytes function with various inputs.

        :param bytes_value: Bytes value to format.
        :param expected: Expected formatted string.
        :returns: None.
        """
        result = _format_bytes(bytes_value)
        assert result == expected

    @pytest.mark.parametrize(
        "history, expected_trend",
        [
            ([], {"trend": "insufficient_data"}),
            ([{"percent": "10%"}], {"trend": "insufficient_data"}),
            (
                [{"percent": "10%"}, {"percent": "20%"}],
                {
                    "trend": "improving",
                    "progress_made": 10.0,
                    "recent_percent": 20.0,
                    "earlier_percent": 10.0,
                    "data_points": 2,
                },
            ),
            (
                [{"percent": "20%"}, {"percent": "25%"}],
                {
                    "trend": "slow_progress",
                    "progress_made": 5.0,
                    "recent_percent": 25.0,
                    "earlier_percent": 20.0,
                    "data_points": 2,
                },
            ),
            (
                [{"percent": "30%"}, {"percent": "30%"}],
                {
                    "trend": "stalled",
                    "progress_made": 0.0,
                    "recent_percent": 30.0,
                    "earlier_percent": 30.0,
                    "data_points": 2,
                },
            ),
            (
                [{"percent": "40%"}, {"percent": "35%"}],
                {
                    "trend": "regressing",
                    "progress_made": -5.0,
                    "recent_percent": 35.0,
                    "earlier_percent": 40.0,
                    "data_points": 2,
                },
            ),
            (
                [{"percent": "invalid"}, {"percent": "50%"}],
                {"trend": "insufficient_data"},
            ),
            (
                [{"percent": "10%"}, {"percent": "invalid"}, {"percent": "20%"}],
                {
                    "trend": "improving",
                    "progress_made": 10.0,
                    "recent_percent": 20.0,
                    "earlier_percent": 10.0,
                    "data_points": 2,
                },
            ),
        ],
    )
    def test_analyze_progress_trend(self, history: list[dict[str, Any]], expected_trend: dict[str, Any]) -> None:
        """Test _analyze_progress_trend function with various history data.

        :param history: Progress history data.
        :param expected_trend: Expected trend analysis result.
        :returns: None.
        """
        result = _analyze_progress_trend(history)
        assert result == expected_trend

    def test_analyze_progress_trend_with_exception(self) -> None:
        """Test _analyze_progress_trend function with data that causes exceptions.

        :returns: None.
        """
        # Create history data that will cause an exception
        history = [{"percent": None}]  # This will cause a TypeError when trying to endswith

        result = _analyze_progress_trend(history)
        assert result == {"trend": "insufficient_data"}

    def test_enhance_status_data_basic(self) -> None:
        """Test _enhance_status_data function with basic status data.

        :returns: None.
        """
        status = {
            "status": "downloading",
            "percent": "50%",
            "start_time": "2023-01-01T10:00:00",
            "last_update": "2023-01-01T10:30:00",
        }

        result = _enhance_status_data(status)

        assert result["status"] == "downloading"
        assert result["percent"] == "50%"
        assert result["elapsed_time"] == "30m0s"

    def test_enhance_status_data_with_speeds(self) -> None:
        """Test _enhance_status_data function with speed data.

        :returns: None.
        """
        status = {
            "status": "downloading",
            "speeds": ["1.0MB/s", "2.0MB/s", "1.5MB/s"],
        }

        result = _enhance_status_data(status)

        assert result["recent_speeds"] == ["1.0MB/s", "2.0MB/s", "1.5MB/s"]
        assert result["speed_count"] == 3
        # Note: average_speed calculation may fail if _parse_bytes is not available
        # We just check that the basic speed data is processed correctly

    def test_enhance_status_data_with_history(self) -> None:
        """Test _enhance_status_data function with history data.

        :returns: None.
        """
        status = {
            "status": "downloading",
            "history": [
                {"timestamp": "2023-01-01T10:00:00", "percent": "10%"},
                {"timestamp": "2023-01-01T10:30:00", "percent": "50%"},
            ],
        }

        result = _enhance_status_data(status)

        assert result["history_count"] == 2
        assert result["last_progress_update"] == "2023-01-01T10:30:00"
        assert "progress_trend" in result

    def test_enhance_status_data_with_invalid_dates(self) -> None:
        """Test _enhance_status_data function with invalid date data.

        :returns: None.
        """
        status = {
            "status": "downloading",
            "start_time": "invalid-date",
            "last_update": "also-invalid",
        }

        result = _enhance_status_data(status)

        assert result["elapsed_time"] == "unknown"

    def test_enhance_status_data_with_empty_speeds(self) -> None:
        """Test _enhance_status_data function with empty speeds list.

        :returns: None.
        """
        status = {
            "status": "downloading",
            "speeds": [],
        }

        result = _enhance_status_data(status)

        assert "recent_speeds" not in result
        assert "speed_count" not in result

    def test_enhance_status_data_with_empty_history(self) -> None:
        """Test _enhance_status_data function with empty history list.

        :returns: None.
        """
        status = {
            "status": "downloading",
            "history": [],
        }

        result = _enhance_status_data(status)

        # Check that history processing handles empty lists correctly
        assert "history_count" not in result  # Not added for empty history
        assert "last_progress_update" not in result  # Not added for empty history
        assert "progress_trend" not in result


class TestStatusAPIEndpoints:
    """Test the status API endpoints."""

    def test_get_all_status_empty(self, client: FlaskClient) -> None:
        """Test GET /api/status with no data.

        :param client: Flask test client fixture.
        :returns: None.
        """
        # Clear all downloads and errors to ensure empty state
        from server.downloads import unified_download_manager
        from server.downloads.ytdlp import download_errors_from_hooks

        with unified_download_manager._lock:
            unified_download_manager._downloads.clear()
            unified_download_manager._queue_order.clear()

        # Clear error hooks
        download_errors_from_hooks.clear()

        response = client.get("/api/status")
        assert response.status_code == 200
        assert response.get_json() == {}

    def test_get_all_status_with_progress_data(self, client: FlaskClient) -> None:
        """Test GET /api/status with progress data.

        :param client: Flask test client fixture.
        :returns: None.
        """
        # Mock the unified download manager to return progress data
        with pytest.MonkeyPatch().context() as m:
            progress_data = {"download1": {"status": "downloading", "percent": "50%"}}
            m.setattr("server.api.status_bp.unified_download_manager.get_status_summary", lambda: progress_data)

            response = client.get("/api/status")
            assert response.status_code == 200
            data = response.get_json()
            assert "download1" in data
            assert data["download1"]["status"] == "downloading"

    def test_get_all_status_with_errors(self, client: FlaskClient) -> None:
        """Test GET /api/status with error data.

        :param client: Flask test client fixture.
        :returns: None.
        """
        # Clear all downloads and errors to ensure clean state
        from server.downloads import unified_download_manager
        from server.downloads.ytdlp import download_errors_from_hooks

        with unified_download_manager._lock:
            unified_download_manager._downloads.clear()
            unified_download_manager._queue_order.clear()

        # Set up error data
        errors = {"error1": {"original_message": "test error"}}
        download_errors_from_hooks.clear()
        download_errors_from_hooks.update(errors)

        response = client.get("/api/status")
        assert response.status_code == 200
        data = response.get_json()
        assert "error1" in data
        assert data["error1"]["status"] == "error"

    def test_get_status_by_id_not_found(self, client: FlaskClient) -> None:
        """Test GET /api/status/<id> with non-existent download.

        :param client: Flask test client fixture.
        :returns: None.
        """
        # Mock empty data
        with pytest.MonkeyPatch().context() as m:
            m.setattr("server.downloads.unified_download_manager.get_status_summary", dict)

            response = client.get("/api/status/nonexistent")
            assert response.status_code == 404
            data = response.get_json()
            assert data["status"] == "error"
            assert data["message"] == "Download not found"

    def test_get_status_by_id_with_progress(self, client: FlaskClient) -> None:
        """Test GET /api/status/<id> with progress data.

        :param client: Flask test client fixture.
        :returns: None.
        """
        # Mock progress data
        with pytest.MonkeyPatch().context() as m:
            progress_data = {"download1": {"status": "downloading", "percent": "50%"}}
            m.setattr("server.api.status_bp.unified_download_manager.get_status_summary", lambda: progress_data)

            response = client.get("/api/status/download1")
            assert response.status_code == 200
            data = response.get_json()
            assert data["status"] == "downloading"
            assert data["percent"] == "50%"

    def test_get_status_by_id_with_error(self, client: FlaskClient) -> None:
        """Test GET /api/status/<id> with error data.

        :param client: Flask test client fixture.
        :returns: None.
        """
        # Mock error data
        with pytest.MonkeyPatch().context() as m:
            errors = {"error1": {"original_message": "test error"}}
            m.setattr("server.api.status_bp.unified_download_manager.get_status_summary", lambda: errors)

            response = client.get("/api/status/error1")
            assert response.status_code == 200
            data = response.get_json()
            assert "error" in data
            assert data["error"]["original_message"] == "test error"

    def test_clear_status_by_id_success(self, client: FlaskClient) -> None:
        """Test DELETE /api/status/<id> with existing download.

        :param client: Flask test client fixture.
        :returns: None.
        """
        # Mock data to clear
        with pytest.MonkeyPatch().context() as m:
            progress_data = {"download1": {"status": "downloading"}}
            m.setattr("server.api.status_bp.progress_data", progress_data)
            m.setattr("server.api.status_bp.download_errors_from_hooks", {})

            response = client.delete("/api/status/download1")
            assert response.status_code == 200
            data = response.get_json()
            assert data["status"] == "success"
            assert data["message"] == "Status cleared"

    def test_clear_status_by_id_not_found(self, client: FlaskClient) -> None:
        """Test DELETE /api/status/<id> with non-existent download.

        :param client: Flask test client fixture.
        :returns: None.
        """
        # Mock empty data
        with pytest.MonkeyPatch().context() as m:
            m.setattr("server.api.status_bp.progress_data", {})
            m.setattr("server.api.status_bp.download_errors_from_hooks", {})

            response = client.delete("/api/status/nonexistent")
            assert response.status_code == 404
            data = response.get_json()
            assert data["status"] == "error"
            assert data["message"] == "Download not found"

    def test_clear_status_bulk_no_filters(self, client: FlaskClient) -> None:
        """Test DELETE /api/status with no filters.

        :param client: Flask test client fixture.
        :returns: None.
        """
        # Mock data to clear
        with pytest.MonkeyPatch().context() as m:
            progress_data = {"download1": {"status": "downloading"}}
            m.setattr("server.api.status_bp.progress_data", progress_data)

            response = client.delete("/api/status")
            assert response.status_code == 200
            data = response.get_json()
            assert data["status"] == "success"
            assert data["cleared_count"] == 1
            assert "download1" in data["cleared_ids"]

    def test_clear_status_bulk_with_status_filter(self, client: FlaskClient) -> None:
        """Test DELETE /api/status with status filter.

        :param client: Flask test client fixture.
        :returns: None.
        """
        # Mock data with different statuses
        with pytest.MonkeyPatch().context() as m:
            progress_data = {
                "download1": {"status": "downloading"},
                "download2": {"status": "completed"},
            }
            m.setattr("server.api.status_bp.progress_data", progress_data)

            response = client.delete("/api/status?status=downloading")
            assert response.status_code == 200
            data = response.get_json()
            assert data["status"] == "success"
            assert data["cleared_count"] == 1
            assert "download1" in data["cleared_ids"]
            assert "download2" not in data["cleared_ids"]

    def test_clear_status_bulk_with_age_filter(self, client: FlaskClient) -> None:
        """Test DELETE /api/status with age filter.

        :param client: Flask test client fixture.
        :returns: None.
        """
        # Mock data with history timestamps
        with pytest.MonkeyPatch().context() as m:
            old_time = (datetime.now(timezone.utc) - timedelta(seconds=100)).isoformat()
            new_time = datetime.now(timezone.utc).isoformat()

            progress_data = {
                "old": {"status": "downloading", "history": [{"timestamp": old_time}]},
                "new": {"status": "downloading", "history": [{"timestamp": new_time}]},
            }
            m.setattr("server.api.status_bp.progress_data", progress_data)

            response = client.delete("/api/status?age=50")
            assert response.status_code == 200
            data = response.get_json()
            assert data["status"] == "success"
            assert data["cleared_count"] == 1
            assert "old" in data["cleared_ids"]
            assert "new" not in data["cleared_ids"]

    def test_clear_status_bulk_with_invalid_age(self, client: FlaskClient) -> None:
        """Test DELETE /api/status with invalid age parameter.

        :param client: Flask test client fixture.
        :returns: None.
        """
        response = client.delete("/api/status?age=invalid")
        assert response.status_code == 400
        data = response.get_json()
        assert data["status"] == "error"
        assert "Invalid age value" in data["message"]

    def test_clear_status_bulk_with_combined_filters(self, client: FlaskClient) -> None:
        """Test DELETE /api/status with both status and age filters.

        :param client: Flask test client fixture.
        :returns: None.
        """
        # Mock data with different statuses and ages
        with pytest.MonkeyPatch().context() as m:
            old_time = (datetime.now(timezone.utc) - timedelta(seconds=100)).isoformat()
            new_time = datetime.now(timezone.utc).isoformat()

            progress_data = {
                "old_downloading": {"status": "downloading", "history": [{"timestamp": old_time}]},
                "new_downloading": {"status": "downloading", "history": [{"timestamp": new_time}]},
                "old_completed": {"status": "completed", "history": [{"timestamp": old_time}]},
            }
            m.setattr("server.api.status_bp.progress_data", progress_data)

            response = client.delete("/api/status?status=downloading&age=50")
            assert response.status_code == 200
            data = response.get_json()
            assert data["status"] == "success"
            assert data["cleared_count"] == 1
            assert "old_downloading" in data["cleared_ids"]
            assert "new_downloading" not in data["cleared_ids"]
            assert "old_completed" not in data["cleared_ids"]

    def test_clear_status_bulk_with_invalid_history(self, client: FlaskClient) -> None:
        """Test DELETE /api/status with invalid history data.

        :param client: Flask test client fixture.
        :returns: None.
        """
        # Mock data with invalid history
        with pytest.MonkeyPatch().context() as m:
            progress_data = {
                "invalid": {"status": "downloading", "history": [{"timestamp": "invalid-date"}]},
            }
            m.setattr("server.api.status_bp.progress_data", progress_data)

            response = client.delete("/api/status?age=50")
            assert response.status_code == 200
            data = response.get_json()
            assert data["status"] == "success"
            assert data["cleared_count"] == 0  # Invalid history should be skipped
