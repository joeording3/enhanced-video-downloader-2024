"""Unit tests for server.api.history_bp module."""

import time
from unittest.mock import Mock, patch

from flask import Flask

from server.api.history_bp import (
    _error_response,
    _handle_history_append,
    _handle_history_clear,
    _handle_history_sync,
    _history_post,
    _success_response,
    history_bp,
)


class TestHistoryBlueprint:
    """Test history blueprint functionality."""

    def test_history_bp_registration(self):
        """Test that history blueprint can be registered with Flask app."""
        app = Flask(__name__)
        app.register_blueprint(history_bp)

        # Verify blueprint is registered
        assert "history" in app.blueprints
        assert app.blueprints["history"] == history_bp

    def test_history_bp_url_prefix(self):
        """Test that history blueprint has correct URL prefix."""
        app = Flask(__name__)
        app.register_blueprint(history_bp)

        # Test that the endpoint is accessible
        with app.test_client() as client:
            response = client.get("/history")
            # Should return 200 or 500 depending on history loading
            assert response.status_code in [200, 500]


class TestHelperFunctions:
    """Test helper functions in history blueprint."""

    def test_error_response(self):
        """Test _error_response function."""
        app = Flask(__name__)
        with app.app_context():
            response, status_code = _error_response("Test error", 400)

            assert status_code == 400
            assert response.json["success"] is False
            assert response.json["error"] == "Test error"

    def test_success_response(self):
        """Test _success_response function."""
        app = Flask(__name__)
        with app.app_context():
            response, status_code = _success_response("Test success", 200)

            assert status_code == 200
            assert response.json["success"] is True
            assert response.json["message"] == "Test success"

    def test_success_response_default_status(self):
        """Test _success_response function with default status code."""
        app = Flask(__name__)
        with app.app_context():
            response, status_code = _success_response("Test success")

            assert status_code == 200
            assert response.json["success"] is True
            assert response.json["message"] == "Test success"

    def test_handle_history_sync_success(self):
        """Test _handle_history_sync with successful sync."""
        test_data = [{"id": 1, "url": "test.com"}, {"id": 2, "url": "test2.com"}]

        app = Flask(__name__)
        with app.app_context(), patch("server.api.history_bp.save_history") as mock_save:
            mock_save.return_value = True

            response, status_code = _handle_history_sync(test_data)

            assert status_code == 200
            assert response.json["success"] is True
            assert "History synchronized successfully" in response.json["message"]
            mock_save.assert_called_once_with(test_data)

    def test_handle_history_sync_failure(self):
        """Test _handle_history_sync with save failure."""
        test_data = [{"id": 1, "url": "test.com"}]

        app = Flask(__name__)
        with app.app_context(), patch("server.api.history_bp.save_history") as mock_save:
            mock_save.return_value = False

            response, status_code = _handle_history_sync(test_data)

            assert status_code == 500
            assert response.json["success"] is False
            assert "Failed to save history" in response.json["error"]

    def test_handle_history_sync_exception(self):
        """Test _handle_history_sync with exception."""
        test_data = [{"id": 1, "url": "test.com"}]

        app = Flask(__name__)
        with app.app_context(), patch("server.api.history_bp.save_history") as mock_save:
            mock_save.side_effect = Exception("Save error")

            response, status_code = _handle_history_sync(test_data)

            assert status_code == 500
            assert response.json["success"] is False
            assert "Failed to sync history" in response.json["error"]

    def test_handle_history_clear_success(self):
        """Test _handle_history_clear with successful clear."""
        app = Flask(__name__)
        with app.app_context(), patch("server.api.history_bp.clear_history") as mock_clear:
            mock_clear.return_value = True

            response, status_code = _handle_history_clear()

            assert status_code == 200
            assert response.json["success"] is True
            assert "History cleared successfully" in response.json["message"]
            mock_clear.assert_called_once()

    def test_handle_history_clear_failure(self):
        """Test _handle_history_clear with clear failure."""
        app = Flask(__name__)
        with app.app_context(), patch("server.api.history_bp.clear_history") as mock_clear:
            mock_clear.return_value = False

            response, status_code = _handle_history_clear()

            assert status_code == 500
            assert response.json["success"] is False
            assert "Clear failed" in response.json["error"]

    def test_handle_history_clear_exception(self):
        """Test _handle_history_clear with exception."""
        app = Flask(__name__)
        with app.app_context(), patch("server.api.history_bp.clear_history") as mock_clear:
            mock_clear.side_effect = Exception("Clear error")

            response, status_code = _handle_history_clear()

            assert status_code == 500
            assert response.json["success"] is False
            assert "Failed to clear history" in response.json["error"]

    def test_handle_history_append_success(self):
        """Test _handle_history_append with successful append."""
        test_data = {"id": 1, "url": "test.com", "status": "completed"}

        app = Flask(__name__)
        with app.app_context(), patch("server.api.history_bp.append_history_entry") as mock_append:
            response, status_code = _handle_history_append(test_data)

            assert status_code == 200
            assert response.json["success"] is True
            assert "Entry added successfully" in response.json["message"]
            mock_append.assert_called_once_with(test_data)

    def test_handle_history_append_exception(self):
        """Test _handle_history_append with exception."""
        test_data = {"id": 1, "url": "test.com"}

        app = Flask(__name__)
        with app.app_context(), patch("server.api.history_bp.append_history_entry") as mock_append:
            mock_append.side_effect = Exception("Append error")

            response, status_code = _handle_history_append(test_data)

            assert status_code == 500
            assert response.json["success"] is False
            assert "Append error" in response.json["error"]

    def test_history_post_sync_list(self):
        """Test _history_post with list data (sync)."""
        test_data = [{"id": 1, "url": "test.com"}]

        with patch("server.api.history_bp._handle_history_sync") as mock_sync:
            mock_sync.return_value = (Mock(), 200)

            response, status_code = _history_post(test_data)

            mock_sync.assert_called_once_with(test_data)

    def test_history_post_clear_action(self):
        """Test _history_post with clear action."""
        test_data = {"action": "clear"}

        with patch("server.api.history_bp._handle_history_clear") as mock_clear:
            mock_clear.return_value = (Mock(), 200)

            response, status_code = _history_post(test_data)

            mock_clear.assert_called_once()

    def test_history_post_append_dict(self):
        """Test _history_post with dict data (append)."""
        test_data = {"id": 1, "url": "test.com"}

        with patch("server.api.history_bp._handle_history_append") as mock_append:
            mock_append.return_value = (Mock(), 200)

            response, status_code = _history_post(test_data)

            mock_append.assert_called_once_with(test_data)

    def test_history_post_invalid_payload(self):
        """Test _history_post with invalid payload."""
        test_data = "invalid"

        app = Flask(__name__)
        with app.app_context():
            response, status_code = _history_post(test_data)

            assert status_code == 400
            assert response.json["success"] is False
            assert "Invalid payload" in response.json["error"]


class TestHistoryEndpoints:
    """Test history API endpoints."""

    def test_history_endpoint_get_method_success(self):
        """Test history endpoint with GET method (success)."""
        app = Flask(__name__)
        app.register_blueprint(history_bp)

        mock_history = [
            {"id": 1, "url": "test.com", "status": "completed"},
            {"id": 2, "url": "test2.com", "status": "completed"},
        ]
        with patch("server.api.history_bp.load_history", return_value=mock_history), app.test_client() as client:
            response = client.get("/history")

            assert response.status_code == 200
            data = response.json
            assert "history" in data
            assert "total_items" in data
            assert len(data["history"]) == 2
            assert data["total_items"] == 2

    def test_history_endpoint_get_method_error(self):
        """Test history endpoint with GET method (error)."""
        app = Flask(__name__)
        app.register_blueprint(history_bp)

        with patch("server.api.history_bp.load_history", side_effect=Exception("Load error")), patch(
            "server.api.history_bp.logger"
        ) as mock_logger, app.test_client() as client:
            response = client.get("/history")

            assert response.status_code == 500
            assert response.json["success"] is False
            assert "Load error" in response.json["error"]
            mock_logger.error.assert_called_once()

    def test_history_endpoint_get_method_with_filters(self):
        """Test history endpoint with GET method and filters."""
        app = Flask(__name__)
        app.register_blueprint(history_bp)

        mock_history = [
            {"id": 1, "url": "youtube.com/video1", "status": "completed"},
            {"id": 2, "url": "youtube.com/video2", "status": "completed"},
        ]
        with patch("server.api.history_bp.load_history", return_value=mock_history), app.test_client() as client:
            response = client.get("/history?status=completed&domain=youtube")

            assert response.status_code == 200
            data = response.json
            assert len(data["history"]) == 2
            assert data["total_items"] == 2
            # All returned items should have status "completed" and contain "youtube"
            for item in data["history"]:
                assert item["status"] == "completed"
                assert "youtube" in item["url"]

    def test_history_endpoint_get_method_with_pagination(self):
        """Test history endpoint with GET method and pagination."""
        app = Flask(__name__)
        app.register_blueprint(history_bp)

        mock_history = [
            {"id": 1, "url": "test1.com", "status": "completed"},
            {"id": 2, "url": "test2.com", "status": "completed"},
            {"id": 3, "url": "test3.com", "status": "completed"},
            {"id": 4, "url": "test4.com", "status": "completed"},
            {"id": 5, "url": "test5.com", "status": "completed"},
        ]
        with patch("server.api.history_bp.load_history", return_value=mock_history), app.test_client() as client:
            response = client.get("/history?page=2&per_page=2")

            assert response.status_code == 200
            data = response.json
            assert len(data["history"]) == 2
            assert data["total_items"] == 5
            # Should return items 3 and 4 (page 2 with 2 per page)
            assert data["history"][0]["id"] == 3
            assert data["history"][1]["id"] == 4

    def test_history_endpoint_post_method_sync(self):
        """Test history endpoint with POST method (sync)."""
        app = Flask(__name__)
        app.register_blueprint(history_bp)

        with patch("server.api.history_bp.save_history", return_value=True), app.test_client() as client:
            response = client.post("/history", json=[{"id": 1, "url": "test.com"}], content_type="application/json")

            assert response.status_code == 200
            assert response.json["success"] is True
            assert "History synchronized successfully" in response.json["message"]

    def test_history_endpoint_post_method_clear(self):
        """Test history endpoint with POST method (clear)."""
        app = Flask(__name__)
        app.register_blueprint(history_bp)

        with patch("server.api.history_bp.clear_history", return_value=True), app.test_client() as client:
            response = client.post("/history", json={"action": "clear"}, content_type="application/json")

            assert response.status_code == 200
            assert response.json["success"] is True
            assert "History cleared successfully" in response.json["message"]

    def test_history_endpoint_post_method_append(self):
        """Test history endpoint with POST method (append)."""
        app = Flask(__name__)
        app.register_blueprint(history_bp)

        with patch("server.api.history_bp.append_history_entry") as mock_append, app.test_client() as client:
            response = client.post(
                "/history", json={"id": 1, "url": "test.com", "status": "completed"}, content_type="application/json"
            )

            assert response.status_code == 200
            assert response.json["success"] is True
            assert "Entry added successfully" in response.json["message"]
            mock_append.assert_called_once()

    def test_history_endpoint_post_method_invalid_payload(self):
        """Test history endpoint with POST method (invalid payload)."""
        app = Flask(__name__)
        app.register_blueprint(history_bp)

        with app.test_client() as client:
            response = client.post("/history", json="invalid", content_type="application/json")

            assert response.status_code == 400
            assert response.json["success"] is False
            assert "Invalid payload" in response.json["error"]

    def test_history_endpoint_unsupported_method(self):
        """Test history endpoint with unsupported method."""
        app = Flask(__name__)
        app.register_blueprint(history_bp)

        with app.test_client() as client:
            response = client.put("/history")

            # Should return 405 Method Not Allowed
            assert response.status_code == 405

    def test_history_endpoint_alternate_route(self):
        """Test history endpoint with alternate route (/api/history)."""
        app = Flask(__name__)
        app.register_blueprint(history_bp)

        mock_history = [
            {"id": 1, "url": "test.com", "status": "completed"},
            {"id": 2, "url": "test2.com", "status": "completed"},
        ]
        with patch("server.api.history_bp.load_history", return_value=mock_history), app.test_client() as client:
            response = client.get("/api/history")

            assert response.status_code == 200
            data = response.json
            assert "history" in data
            assert "total_items" in data

    def test_history_endpoint_performance(self):
        """Test that history endpoint responds in reasonable time."""
        app = Flask(__name__)
        app.register_blueprint(history_bp)

        mock_history = [
            {"id": 1, "url": "test.com", "status": "completed"},
        ]
        with patch("server.api.history_bp.load_history", return_value=mock_history), app.test_client() as client:
            start_time = time.time()

            response = client.get("/history")

            end_time = time.time()
            response_time = end_time - start_time

            # History endpoint should respond quickly (< 1 second)
            assert response_time < 1.0
            assert response.status_code == 200

    def test_history_endpoint_error_handling(self):
        """Test history endpoint error handling."""
        app = Flask(__name__)
        app.register_blueprint(history_bp)

        with patch("server.api.history_bp.load_history", side_effect=Exception("History error")), patch(
            "server.api.history_bp.logger"
        ) as mock_logger, app.test_client() as client:
            response = client.get("/history")

            assert response.status_code == 500
            assert response.json["success"] is False
            assert "History error" in response.json["error"]
            mock_logger.error.assert_called_once()

    def test_history_endpoint_content_type(self):
        """Test that history endpoint returns correct content type."""
        app = Flask(__name__)
        app.register_blueprint(history_bp)

        mock_history = [
            {"id": 1, "url": "test.com", "status": "completed"},
        ]
        with patch("server.api.history_bp.load_history", return_value=mock_history), app.test_client() as client:
            response = client.get("/history")

            assert response.content_type == "application/json"
            assert "application/json" in response.headers.get("Content-Type", "")

    def test_history_endpoint_empty_history(self):
        """Test history endpoint with empty history."""
        app = Flask(__name__)
        app.register_blueprint(history_bp)

        with patch("server.api.history_bp.load_history") as mock_load:
            mock_load.return_value = []

            with app.test_client() as client:
                response = client.get("/history")

                assert response.status_code == 200
                data = response.json
                assert "history" in data
                assert "total_items" in data
                assert len(data["history"]) == 0
                assert data["total_items"] == 0
