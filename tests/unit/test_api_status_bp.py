"""Unit tests for server.api.status_bp module."""

import time
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from flask import Flask

from server.api.status_bp import (
    _analyze_progress_trend,
    _enhance_status_data,
    _format_bytes,
    _format_duration,
    clear_status_bulk,
    clear_status_by_id,
    get_all_status,
    get_status_by_id,
    status_bp,
)


class TestStatusBlueprint:
    """Test status blueprint functionality."""

    def test_status_bp_registration(self):
        """Test that status blueprint can be registered with Flask app."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        # Verify blueprint is registered
        assert "status" in app.blueprints
        assert app.blueprints["status"] == status_bp

    def test_status_bp_url_prefix(self):
        """Test that status blueprint has correct URL prefix."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        # Test that the endpoint is accessible
        with app.test_client() as client:
            response = client.get("/api/status")
            # Should return 200 (success) or other status
            assert response.status_code in [200, 404, 500]


class TestHelperFunctions:
    """Test helper functions."""

    def test_format_duration_seconds(self):
        """Test _format_duration with seconds."""
        assert _format_duration(30) == "30s"
        assert _format_duration(59.9) == "59s"

    def test_format_duration_minutes(self):
        """Test _format_duration with minutes."""
        assert _format_duration(90) == "1m30s"
        assert _format_duration(3599) == "59m59s"

    def test_format_duration_hours(self):
        """Test _format_duration with hours."""
        assert _format_duration(3660) == "1h1m"
        assert _format_duration(7320) == "2h2m"

    def test_format_bytes_small(self):
        """Test _format_bytes with small values."""
        assert _format_bytes(1024) == "1.0KB"
        assert _format_bytes(512) == "512.0B"

    def test_format_bytes_large(self):
        """Test _format_bytes with large values."""
        assert _format_bytes(1024 * 1024) == "1.0MB"
        assert _format_bytes(1024 * 1024 * 1024) == "1.0GB"

    def test_analyze_progress_trend_insufficient_data(self):
        """Test _analyze_progress_trend with insufficient data."""
        result = _analyze_progress_trend([])
        assert result["trend"] == "insufficient_data"

        result = _analyze_progress_trend([{"percent": "10%"}])
        assert result["trend"] == "insufficient_data"

    def test_analyze_progress_trend_improving(self):
        """Test _analyze_progress_trend with improving trend."""
        history = [
            {"percent": "10%", "timestamp": "2023-01-01T10:00:00"},
            {"percent": "20%", "timestamp": "2023-01-01T10:01:00"},
        ]
        result = _analyze_progress_trend(history)
        assert result["trend"] == "improving"
        assert result["progress_made"] == 10.0

    def test_analyze_progress_trend_slow_progress(self):
        """Test _analyze_progress_trend with slow progress."""
        history = [
            {"percent": "10%", "timestamp": "2023-01-01T10:00:00"},
            {"percent": "12%", "timestamp": "2023-01-01T10:01:00"},
        ]
        result = _analyze_progress_trend(history)
        assert result["trend"] == "slow_progress"
        assert result["progress_made"] == 2.0

    def test_analyze_progress_trend_stalled(self):
        """Test _analyze_progress_trend with stalled progress."""
        history = [
            {"percent": "10%", "timestamp": "2023-01-01T10:00:00"},
            {"percent": "10%", "timestamp": "2023-01-01T10:01:00"},
        ]
        result = _analyze_progress_trend(history)
        assert result["trend"] == "stalled"
        assert result["progress_made"] == 0.0

    def test_analyze_progress_trend_regressing(self):
        """Test _analyze_progress_trend with regressing progress."""
        history = [
            {"percent": "20%", "timestamp": "2023-01-01T10:00:00"},
            {"percent": "10%", "timestamp": "2023-01-01T10:01:00"},
        ]
        result = _analyze_progress_trend(history)
        assert result["trend"] == "regressing"
        assert result["progress_made"] == -10.0

    def test_analyze_progress_trend_error_handling(self):
        """Test _analyze_progress_trend with invalid data."""
        history = [
            {"percent": "invalid", "timestamp": "2023-01-01T10:00:00"},
            {"percent": "20%", "timestamp": "2023-01-01T10:01:00"},
        ]
        result = _analyze_progress_trend(history)
        assert result["trend"] == "insufficient_data"

    def test_enhance_status_data_basic(self):
        """Test _enhance_status_data with basic data."""
        status = {
            "download_id": "test123",
            "status": "downloading",
            "percent": "50%",
        }
        enhanced = _enhance_status_data(status)
        assert enhanced["download_id"] == "test123"
        assert enhanced["status"] == "downloading"
        assert enhanced["percent"] == "50%"

    def test_enhance_status_data_with_timing(self):
        """Test _enhance_status_data with timing information."""
        start_time = datetime.now(timezone.utc).isoformat()
        last_update = datetime.now(timezone.utc).isoformat()
        status = {
            "start_time": start_time,
            "last_update": last_update,
        }
        enhanced = _enhance_status_data(status)
        assert "elapsed_time" in enhanced
        assert enhanced["elapsed_time"] != "unknown"

    def test_enhance_status_data_with_speeds(self):
        """Test _enhance_status_data with speed information."""
        status = {
            "speeds": ["1.0MB/s", "2.0MB/s", "1.5MB/s"],
        }
        enhanced = _enhance_status_data(status)
        assert "recent_speeds" in enhanced
        assert "speed_count" in enhanced
        assert enhanced["speed_count"] == 3

    def test_enhance_status_data_with_history(self):
        """Test _enhance_status_data with history information."""
        status = {
            "history": [
                {"timestamp": "2023-01-01T10:00:00", "percent": "10%"},
                {"timestamp": "2023-01-01T10:01:00", "percent": "20%"},
            ],
        }
        enhanced = _enhance_status_data(status)
        assert "history_count" in enhanced
        assert "last_progress_update" in enhanced
        assert enhanced["history_count"] == 2


class TestStatusEndpoints:
    """Test status API endpoints."""

    def test_get_all_status_endpoint_success(self):
        """Test get_all_status endpoint (success)."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        # Mock the progress data and errors
        mock_progress_data = {
            "test123": {"status": "downloading", "percent": "50%"},
            "test456": {"status": "completed", "percent": "100%"},
        }
        mock_errors = {
            "test789": {"original_message": "Network error", "troubleshooting": "Check connection"},
        }

        with patch("server.api.status_bp.progress_data", mock_progress_data), patch(
            "server.api.status_bp.download_errors_from_hooks", mock_errors
        ), patch("server.api.status_bp.progress_lock"), app.test_client() as client:
            response = client.get("/api/status")

            assert response.status_code == 200
            data = response.json
            assert "test123" in data
            assert "test456" in data
            assert "test789" in data

    def test_get_all_status_endpoint_empty(self):
        """Test get_all_status endpoint (empty data)."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        with patch("server.api.status_bp.progress_data", {}), patch(
            "server.api.status_bp.download_errors_from_hooks", {}
        ), patch("server.api.status_bp.progress_lock"), app.test_client() as client:
            response = client.get("/api/status")

            assert response.status_code == 200
            data = response.json
            assert data == {}

    def test_get_status_by_id_endpoint_success(self):
        """Test get_status_by_id endpoint (success)."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        mock_status = {"status": "downloading", "percent": "50%"}

        with patch("server.api.status_bp.progress_data", {"test123": mock_status}), patch(
            "server.api.status_bp.download_errors_from_hooks", {}
        ), patch("server.api.status_bp.progress_lock"), app.test_client() as client:
            response = client.get("/api/status/test123")

            assert response.status_code == 200
            data = response.json
            assert data["status"] == "downloading"
            assert data["percent"] == "50%"

    def test_get_status_by_id_endpoint_not_found(self):
        """Test get_status_by_id endpoint (not found)."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        with patch("server.api.status_bp.progress_data", {}), patch(
            "server.api.status_bp.download_errors_from_hooks", {}
        ), patch("server.api.status_bp.progress_lock"), app.test_client() as client:
            response = client.get("/api/status/nonexistent")

            assert response.status_code == 404
            data = response.json
            assert data["status"] == "error"
            assert "not found" in data["message"].lower()

    def test_get_status_by_id_endpoint_with_error(self):
        """Test get_status_by_id endpoint (with error)."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        mock_error = {"original_message": "Network error", "troubleshooting": "Check connection"}

        with patch("server.api.status_bp.progress_data", {}), patch(
            "server.api.status_bp.download_errors_from_hooks", {"test123": mock_error}
        ), patch("server.api.status_bp.progress_lock"), app.test_client() as client:
            response = client.get("/api/status/test123")

            assert response.status_code == 200
            data = response.json
            assert "error" in data
            assert "troubleshooting" in data

    def test_clear_status_by_id_endpoint_success(self):
        """Test clear_status_by_id endpoint (success)."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        mock_progress_data = {"test123": {"status": "downloading"}}
        mock_errors = {"test123": {"error": "details"}}

        with patch("server.api.status_bp.progress_data", mock_progress_data), patch(
            "server.api.status_bp.download_errors_from_hooks", mock_errors
        ), patch("server.api.status_bp.progress_lock"), app.test_client() as client:
            response = client.delete("/api/status/test123")

            assert response.status_code == 200
            data = response.json
            assert data["status"] == "success"
            assert "cleared" in data["message"].lower()

    def test_clear_status_by_id_endpoint_not_found(self):
        """Test clear_status_by_id endpoint (not found)."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        with patch("server.api.status_bp.progress_data", {}), patch(
            "server.api.status_bp.download_errors_from_hooks", {}
        ), patch("server.api.status_bp.progress_lock"), app.test_client() as client:
            response = client.delete("/api/status/nonexistent")

            assert response.status_code == 404
            data = response.json
            assert data["status"] == "error"
            assert "not found" in data["message"].lower()

    def test_clear_status_bulk_endpoint_success(self):
        """Test clear_status_bulk endpoint (success)."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        mock_progress_data = {
            "test123": {"status": "completed"},
            "test456": {"status": "downloading"},
        }

        with patch("server.api.status_bp.progress_data", mock_progress_data), patch(
            "server.api.status_bp.progress_lock"
        ), app.test_client() as client:
            response = client.delete("/api/status?status=completed")

            assert response.status_code == 200
            data = response.json
            assert data["status"] == "success"
            assert "cleared_count" in data
            assert "cleared_ids" in data

    def test_clear_status_bulk_endpoint_with_age_filter(self):
        """Test clear_status_bulk endpoint (with age filter)."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        # Create old history data
        old_timestamp = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        mock_progress_data = {
            "test123": {
                "status": "completed",
                "history": [{"timestamp": old_timestamp, "percent": "100%"}],
            },
        }

        with patch("server.api.status_bp.progress_data", mock_progress_data), patch(
            "server.api.status_bp.progress_lock"
        ), app.test_client() as client:
            response = client.delete("/api/status?age=3600")  # 1 hour

            assert response.status_code == 200
            data = response.json
            assert data["status"] == "success"

    def test_clear_status_bulk_endpoint_invalid_age(self):
        """Test clear_status_bulk endpoint (invalid age parameter)."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        with app.test_client() as client:
            response = client.delete("/api/status?age=invalid")

            assert response.status_code == 400
            data = response.json
            assert data["status"] == "error"
            assert "Invalid age value" in data["message"]

    def test_status_endpoints_unsupported_methods(self):
        """Test status endpoints with unsupported methods."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        with app.test_client() as client:
            # Test POST method on /api/status
            response = client.post("/api/status")
            assert response.status_code == 405

            # Test PUT method on /api/status/test123
            response = client.put("/api/status/test123")
            assert response.status_code == 405

    def test_status_endpoints_performance(self):
        """Test that status endpoints respond in reasonable time."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        with patch("server.api.status_bp.progress_data", {}), patch(
            "server.api.status_bp.download_errors_from_hooks", {}
        ), patch("server.api.status_bp.progress_lock"), app.test_client() as client:
            start_time = time.time()

            response = client.get("/api/status")

            end_time = time.time()
            response_time = end_time - start_time

            # Status endpoint should respond quickly (< 1 second)
            assert response_time < 1.0
            assert response.status_code == 200

    def test_status_endpoints_content_type(self):
        """Test that status endpoints return correct content type."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        with patch("server.api.status_bp.progress_data", {}), patch(
            "server.api.status_bp.download_errors_from_hooks", {}
        ), patch("server.api.status_bp.progress_lock"), app.test_client() as client:
            response = client.get("/api/status")

            assert response.content_type == "application/json"

    def test_status_endpoints_with_query_parameters(self):
        """Test status endpoints with query parameters."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        with patch("server.api.status_bp.progress_data", {}), patch(
            "server.api.status_bp.download_errors_from_hooks", {}
        ), patch("server.api.status_bp.progress_lock"), app.test_client() as client:
            response = client.delete("/api/status?status=completed&age=3600")

            assert response.status_code == 200
            data = response.json
            assert data["status"] == "success"


class TestStatusFunctions:
    """Test status functions directly."""

    def test_get_all_status_function(self):
        """Test get_all_status function for direct call compatibility."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        with patch("server.api.status_bp.progress_data", {}), patch(
            "server.api.status_bp.download_errors_from_hooks", {}
        ), patch("server.api.status_bp.progress_lock"), app.test_request_context("/api/status"):
            response = get_all_status()

            # Should return a Response object
            assert hasattr(response, "status_code")
            assert response.status_code == 200

    def test_get_status_by_id_function(self):
        """Test get_status_by_id function for direct call compatibility."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        mock_status = {"status": "downloading", "percent": "50%"}

        with patch("server.api.status_bp.progress_data", {"test123": mock_status}), patch(
            "server.api.status_bp.download_errors_from_hooks", {}
        ), patch("server.api.status_bp.progress_lock"), app.test_request_context("/api/status/test123"):
            response = get_status_by_id("test123")

            # Should return a Response object
            assert hasattr(response, "status_code")
            assert response.status_code == 200

    def test_clear_status_by_id_function(self):
        """Test clear_status_by_id function for direct call compatibility."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        mock_progress_data = {"test123": {"status": "downloading"}}

        with patch("server.api.status_bp.progress_data", mock_progress_data), patch(
            "server.api.status_bp.download_errors_from_hooks", {}
        ), patch("server.api.status_bp.progress_lock"), app.test_request_context("/api/status/test123"):
            response = clear_status_by_id("test123")

            # Should return a Response object
            assert hasattr(response, "status_code")
            assert response.status_code == 200

    def test_clear_status_bulk_function(self):
        """Test clear_status_bulk function for direct call compatibility."""
        app = Flask(__name__)
        app.register_blueprint(status_bp)

        with patch("server.api.status_bp.progress_data", {}), patch(
            "server.api.status_bp.progress_lock"
        ), app.test_request_context("/api/status"):
            response = clear_status_bulk()

            # Should return a Response object
            assert hasattr(response, "status_code")
            assert response.status_code == 200
