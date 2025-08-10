"""Unit tests for server.api.restart_bp module."""

import time
from unittest.mock import Mock, patch

from flask import Flask

from server.api.restart_bp import restart_bp, restart_server_route


class TestRestartBlueprint:
    """Test restart blueprint functionality."""

    def test_restart_bp_registration(self):
        """Test that restart blueprint can be registered with Flask app."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        # Verify blueprint is registered
        assert "restart" in app.blueprints
        assert app.blueprints["restart"] == restart_bp

    def test_restart_bp_url_prefix(self):
        """Test that restart blueprint has correct URL prefix."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        # Test that the endpoint is accessible
        with app.test_client() as client:
            response = client.post("/restart")
            # Should return 200 (success) or 500 (error)
            assert response.status_code in [200, 500]


class TestRestartEndpoints:
    """Test restart API endpoints."""

    def test_restart_endpoint_options_method(self):
        """Test restart endpoint with OPTIONS method."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        with app.test_client() as client:
            response = client.options("/restart")

            assert response.status_code == 204
            assert response.data == b""

    def test_restart_endpoint_post_method_success(self):
        """Test restart endpoint with POST method (success)."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        # Mock the shutdown function
        mock_shutdown = Mock()

        with patch("server.api.restart_bp.log") as mock_log, app.test_client() as client:
            response = client.post("/restart", environ_overrides={"werkzeug.server.shutdown": mock_shutdown})

            assert response.status_code == 200
            data = response.json
            assert data is not None
            assert data["success"] is True
            assert "Server shutting down for restart" in data["message"]
            mock_log.info.assert_called()

    def test_restart_endpoint_post_method_no_shutdown_function(self):
        """Test restart endpoint with POST method (no shutdown function)."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        with patch("server.api.restart_bp.log") as mock_log, app.test_client() as client:
            response = client.post("/restart")

            assert response.status_code == 500
            data = response.json
            assert data is not None
            assert data["status"] == "error"
            assert "restart not supported" in data["message"].lower()
            mock_log.warning.assert_called_once()

    def test_restart_endpoint_post_method_shutdown_exception(self):
        """Test restart endpoint with POST method (shutdown exception)."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        # Mock the shutdown function to raise an exception
        mock_shutdown = Mock(side_effect=Exception("Shutdown error"))

        with patch("server.api.restart_bp.log") as mock_log, app.test_client() as client:
            response = client.post("/restart", environ_overrides={"werkzeug.server.shutdown": mock_shutdown})

            assert response.status_code == 500
            data = response.json
            assert data is not None
            assert data["success"] is False
            assert "Error during shutdown" in data["error"]
            assert "Shutdown error" in data["error"]
            mock_log.error.assert_called_once()

    def test_restart_endpoint_unsupported_method(self):
        """Test restart endpoint with unsupported method."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        with app.test_client() as client:
            response = client.get("/restart")

            # Should return 405 Method Not Allowed
            assert response.status_code == 405

    def test_restart_endpoint_performance(self):
        """Test that restart endpoint responds in reasonable time."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        # Mock the shutdown function
        mock_shutdown = Mock()

        with app.test_client() as client:
            start_time = time.time()

            response = client.post("/restart", environ_overrides={"werkzeug.server.shutdown": mock_shutdown})

            end_time = time.time()
            response_time = end_time - start_time

            # Restart endpoint should respond quickly (< 1 second)
            assert response_time < 1.0
            assert response.status_code == 200

    def test_restart_endpoint_content_type(self):
        """Test that restart endpoint returns correct content type."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        # Mock the shutdown function
        mock_shutdown = Mock()

        with app.test_client() as client:
            response = client.post("/restart", environ_overrides={"werkzeug.server.shutdown": mock_shutdown})

            assert response.content_type == "application/json"

    def test_restart_endpoint_with_query_parameters(self):
        """Test restart endpoint with query parameters."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        # Mock the shutdown function
        mock_shutdown = Mock()

        with app.test_client() as client:
            response = client.post(
                "/restart?param1=value1&param2=value2", environ_overrides={"werkzeug.server.shutdown": mock_shutdown}
            )

            assert response.status_code == 200
            data = response.json
            assert data is not None
            assert data["success"] is True

    def test_restart_endpoint_logs_activity(self):
        """Test that restart endpoint logs activity."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        # Mock the shutdown function
        mock_shutdown = Mock()

        with patch("server.api.restart_bp.log") as mock_log, app.test_client() as client:
            response = client.post("/restart", environ_overrides={"werkzeug.server.shutdown": mock_shutdown})

            assert response.status_code == 200
            # Should log the activity
            mock_log.info.assert_called()

    def test_restart_endpoint_error_logging(self):
        """Test that restart endpoint logs errors properly."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        # Mock the shutdown function to raise an exception
        mock_shutdown = Mock(side_effect=Exception("Test error"))

        with patch("server.api.restart_bp.log") as mock_log, app.test_client() as client:
            response = client.post("/restart", environ_overrides={"werkzeug.server.shutdown": mock_shutdown})

            assert response.status_code == 500
            # Should log the error when shutdown function raises
            mock_log.error.assert_called_once()

    def test_restart_endpoint_no_shutdown_logging(self):
        """Test that restart endpoint logs when no shutdown function is available."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        with patch("server.api.restart_bp.log") as mock_log, app.test_client() as client:
            response = client.post("/restart")

            assert response.status_code == 500
            # Should log a warning for unsupported restart
            mock_log.warning.assert_called_once()

    def test_restart_endpoint_response_structure_success(self):
        """Test restart endpoint response structure (success)."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        # Mock the shutdown function
        mock_shutdown = Mock()

        with app.test_client() as client:
            response = client.post("/restart", environ_overrides={"werkzeug.server.shutdown": mock_shutdown})

            assert response.status_code == 200
            data = response.json
            assert data is not None
            assert "success" in data
            assert "message" in data
            assert data["success"] is True
            assert isinstance(data["message"], str)

    def test_restart_endpoint_response_structure_error(self):
        """Test restart endpoint response structure (error)."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        with app.test_client() as client:
            response = client.post("/restart")

            assert response.status_code == 500
            data = response.json
            assert data is not None
            assert "status" in data
            assert "message" in data
            assert data["status"] == "error"
            assert isinstance(data["message"], str)

    def test_restart_endpoint_response_structure_exception(self):
        """Test restart endpoint response structure (exception)."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        # Mock the shutdown function to raise an exception
        mock_shutdown = Mock(side_effect=Exception("Test error"))

        with app.test_client() as client:
            response = client.post("/restart", environ_overrides={"werkzeug.server.shutdown": mock_shutdown})

            assert response.status_code == 500
            data = response.json
            assert data is not None
            assert "success" in data
            assert "error" in data
            assert data["success"] is False
            assert isinstance(data["error"], str)

    def test_restart_endpoint_calls_shutdown_function(self):
        """Test that restart endpoint actually calls the shutdown function."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        # Mock the shutdown function
        mock_shutdown = Mock()

        with app.test_client() as client:
            response = client.post("/restart", environ_overrides={"werkzeug.server.shutdown": mock_shutdown})

            assert response.status_code == 200
            # Verify the shutdown function was called
            mock_shutdown.assert_called_once()

    def test_restart_endpoint_development_only_feature(self):
        """Test that restart endpoint is a development-only feature."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        with app.test_client() as client:
            response = client.post("/restart")

            assert response.status_code == 500
            data = response.json
            assert data is not None
            assert "restart not supported" in data["message"].lower()


class TestRestartServerRoute:
    """Test restart_server_route function."""

    def test_restart_server_route_direct_call_options(self):
        """Test restart_server_route function for direct call (OPTIONS)."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        with app.test_request_context("/restart", method="OPTIONS"):
            response = restart_server_route()

            assert response == ("", 204)

    def test_restart_server_route_direct_call_success(self):
        """Test restart_server_route function for direct call (success)."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        # Mock the shutdown function
        mock_shutdown = Mock()

        with app.test_request_context("/restart", method="POST"):
            # Set the shutdown function in the environment
            from flask import request

            request.environ["werkzeug.server.shutdown"] = mock_shutdown

            response = restart_server_route()

            # Should return a tuple (response, status_code)
            assert isinstance(response, tuple)
            assert len(response) == 2
            assert response[1] == 200

    def test_restart_server_route_direct_call_error(self):
        """Test restart_server_route function for direct call (error)."""
        app = Flask(__name__)
        app.register_blueprint(restart_bp)

        with app.test_request_context("/restart", method="POST"):
            # Don't set the shutdown function
            response = restart_server_route()

            # Should return a tuple (response, status_code)
            assert isinstance(response, tuple)
            assert len(response) == 2
            assert response[1] == 500
