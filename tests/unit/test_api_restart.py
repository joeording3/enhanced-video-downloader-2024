"""
Unit tests for restart API endpoint.

This module provides comprehensive tests for the restart endpoint blueprint
to improve coverage of server/api/restart_bp.py.
"""

from unittest.mock import Mock, patch

import pytest
from flask import Flask
from flask.testing import FlaskClient

from server.api.restart_bp import restart_bp, restart_server_route


@pytest.fixture
def app() -> Flask:
    """Create a test Flask application with the restart blueprint."""
    app = Flask(__name__)
    app.register_blueprint(restart_bp)
    return app


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    """Create a test client for the Flask application."""
    return app.test_client()


class TestRestartEndpoint:
    """Test restart endpoint functionality."""

    def test_restart_options_success(self, client: FlaskClient) -> None:
        """Test successful restart request with OPTIONS method."""
        response = client.options("/restart")

        assert response.status_code == 204
        assert response.data == b""

    def test_restart_post_success(self, client: FlaskClient) -> None:
        """Test successful restart POST request."""
        mock_shutdown = Mock()

        with patch.dict(client.application.config, {}):
            response = client.post("/restart", environ_overrides={"werkzeug.server.shutdown": mock_shutdown})

            assert response.status_code == 200
            assert response.json["success"] is True
            assert "Server shutting down for restart" in response.json["message"]
            mock_shutdown.assert_called_once()

    def test_restart_post_no_shutdown_func(self, client: FlaskClient) -> None:
        """Test restart POST request when shutdown function is not available."""
        response = client.post("/restart")

        assert response.status_code == 500
        assert response.json["status"] == "error"
        assert "could not initialize RestartManager" in response.json["message"]

    def test_restart_post_shutdown_error(self, client: FlaskClient) -> None:
        """Test restart POST request when shutdown function raises an error."""
        mock_shutdown = Mock(side_effect=Exception("Shutdown failed"))

        response = client.post("/restart", environ_overrides={"werkzeug.server.shutdown": mock_shutdown})

        assert response.status_code == 500
        assert response.json["success"] is False
        assert "Error during shutdown" in response.json["error"]

    def test_restart_get_not_allowed(self, client: FlaskClient) -> None:
        """Test that GET method is not allowed."""
        response = client.get("/restart")

        assert response.status_code == 405  # Method Not Allowed

    def test_restart_put_not_allowed(self, client: FlaskClient) -> None:
        """Test that PUT method is not allowed."""
        response = client.put("/restart")

        assert response.status_code == 405  # Method Not Allowed

    def test_restart_delete_not_allowed(self, client: FlaskClient) -> None:
        """Test that DELETE method is not allowed."""
        response = client.delete("/restart")

        assert response.status_code == 405  # Method Not Allowed

    def test_restart_blueprint_registration(self, app: Flask) -> None:
        """Test that the restart blueprint is properly registered."""
        # Check that the blueprint is registered
        assert "restart" in app.blueprints

        # Check that the route is registered
        rules = [rule.rule for rule in app.url_map.iter_rules()]
        assert "/restart" in rules

    def test_restart_function_exists(self) -> None:
        """Test that the restart_server_route function exists and is callable."""
        assert callable(restart_server_route)
        assert restart_server_route.__name__ == "restart_server_route"

    def test_restart_blueprint_name(self) -> None:
        """Test that the blueprint has the correct name."""
        assert restart_bp.name == "restart"
        assert restart_bp.url_prefix is None  # No prefix for this blueprint

    def test_restart_logging(self, client: FlaskClient, caplog: pytest.LogCaptureFixture) -> None:
        """Test that restart requests are properly logged."""
        caplog.set_level("INFO")
        mock_shutdown = Mock()

        response = client.post("/restart", environ_overrides={"werkzeug.server.shutdown": mock_shutdown})

        assert response.status_code == 200
        assert "Received /restart request" in caplog.text
        assert "Attempting to shut down Werkzeug server for restart" in caplog.text
        assert "Werkzeug server shutdown initiated" in caplog.text

    def test_restart_error_logging(self, client: FlaskClient, caplog: pytest.LogCaptureFixture) -> None:
        """Test that restart errors are properly logged."""
        caplog.set_level("ERROR")
        mock_shutdown = Mock(side_effect=Exception("Test error"))

        response = client.post("/restart", environ_overrides={"werkzeug.server.shutdown": mock_shutdown})

        assert response.status_code == 500
        assert "Error during server shutdown for restart" in caplog.text
