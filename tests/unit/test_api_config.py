"""
Unit tests for config API endpoint.

This module provides comprehensive tests for the config endpoint blueprint
to improve coverage of server/api/config_bp.py.
"""

from unittest.mock import Mock, patch

import pytest
from flask import Flask
from flask.testing import FlaskClient

from server.api.config_bp import config_bp
from server.constants import get_server_port


@pytest.fixture
def app() -> Flask:
    """Create a test Flask application with the config blueprint."""
    app = Flask(__name__)
    app.register_blueprint(config_bp)
    return app


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    """Create a test client for the Flask application."""
    return app.test_client()


class TestConfigEndpoint:
    """Test config endpoint functionality."""

    def test_config_options_success(self, client: FlaskClient) -> None:
        """Test successful config request with OPTIONS method."""
        response = client.options("/api/config")

        assert response.status_code == 200
        assert response.json["success"] is True
        assert "Access-Control-Allow-Origin" in response.headers
        assert "Access-Control-Allow-Headers" in response.headers
        assert "Access-Control-Allow-Methods" in response.headers

    def test_config_get_success(self, client: FlaskClient) -> None:
        """Test successful config GET request."""
        mock_config = Mock()
        mock_config.as_dict.return_value = {"download_dir": "/tmp", "port": get_server_port()}

        with patch("server.api.config_bp.Config.load", return_value=mock_config):
            response = client.get("/api/config")

            assert response.status_code == 200
            assert response.json["download_dir"] == "/tmp"
            assert response.json["port"] == get_server_port()

    def test_config_get_load_error(self, client: FlaskClient) -> None:
        """Test config GET request when Config.load fails."""
        with patch("server.api.config_bp.Config.load", side_effect=Exception("Config error")):
            response = client.get("/api/config")

            assert response.status_code == 500
            assert response.json["success"] is False
            assert "Failed to load server configuration" in response.json["error"]

    def test_config_get_as_dict_error(self, client: FlaskClient) -> None:
        """Test config GET request when as_dict fails."""
        mock_config = Mock()
        mock_config.as_dict.side_effect = Exception("Serialization error")

        with patch("server.api.config_bp.Config.load", return_value=mock_config):
            response = client.get("/api/config")

            assert response.status_code == 500
            assert response.json["success"] is False
            assert "Error retrieving configuration" in response.json["error"]

    def test_config_post_success(self, client: FlaskClient) -> None:
        """Test successful config POST request."""
        mock_config = Mock()
        mock_config.as_dict.return_value = {"download_dir": "/new/path", "port": get_server_port()}

        with patch("server.api.config_bp.Config.load", return_value=mock_config):
            response = client.post("/api/config", json={"download_dir": "/new/path"}, content_type="application/json")

            assert response.status_code == 200
            assert response.json["success"] is True
            assert "Configuration updated successfully" in response.json["message"]
            assert "new_config" in response.json

    def test_config_post_not_json(self, client: FlaskClient) -> None:
        """Test config POST request with non-JSON content."""
        mock_config = Mock()

        with patch("server.api.config_bp.Config.load", return_value=mock_config):
            response = client.post("/api/config", data="not json", content_type="text/plain")

            assert response.status_code == 415
            assert response.json["success"] is False
            assert "Content-Type must be application/json" in response.json["error"]

    def test_config_post_invalid_json_type(self, client: FlaskClient) -> None:
        """Test config POST request with invalid JSON type."""
        mock_config = Mock()

        with patch("server.api.config_bp.Config.load", return_value=mock_config):
            response = client.post("/api/config", json="not an object", content_type="application/json")

            assert response.status_code == 400
            assert response.json["success"] is False
            assert "expected an object" in response.json["error"]

    def test_config_post_empty_payload(self, client: FlaskClient) -> None:
        """Test config POST request with empty payload."""
        mock_config = Mock()

        with patch("server.api.config_bp.Config.load", return_value=mock_config):
            response = client.post("/api/config", json={}, content_type="application/json")

            assert response.status_code == 400
            assert response.json["success"] is False
            assert "No data provided" in response.json["error"]

    def test_config_post_attribute_error(self, client: FlaskClient) -> None:
        """Test config POST request with attribute error."""
        mock_config = Mock()
        mock_config.update_config.side_effect = AttributeError("Unknown config key: invalid_key")

        with patch("server.api.config_bp.Config.load", return_value=mock_config):
            response = client.post("/api/config", json={"invalid_key": "value"}, content_type="application/json")

            assert response.status_code == 400
            assert response.json["success"] is False
            assert "Unknown config key" in response.json["error"]

    def test_config_post_value_error(self, client: FlaskClient) -> None:
        """Test config POST request with value error."""
        mock_config = Mock()
        mock_config.update_config.side_effect = ValueError("Invalid port number")

        with patch("server.api.config_bp.Config.load", return_value=mock_config):
            response = client.post("/api/config", json={"port": -1}, content_type="application/json")

            assert response.status_code == 400
            assert response.json["success"] is False
            assert "Invalid port number" in response.json["error"]

    def test_config_post_unexpected_error(self, client: FlaskClient) -> None:
        """Test config POST request with unexpected error."""
        mock_config = Mock()
        mock_config.update_config.side_effect = Exception("Unexpected error")

        with patch("server.api.config_bp.Config.load", return_value=mock_config):
            response = client.post("/api/config", json={"port": get_server_port()}, content_type="application/json")

            assert response.status_code == 500
            assert response.json["success"] is False
            assert "Failed to update configuration" in response.json["error"]

    def test_config_put_not_allowed(self, client: FlaskClient) -> None:
        """Test that PUT method is not allowed."""
        response = client.put("/api/config")

        assert response.status_code == 405  # Method Not Allowed

    def test_config_delete_not_allowed(self, client: FlaskClient) -> None:
        """Test that DELETE method is not allowed."""
        response = client.delete("/api/config")

        assert response.status_code == 405  # Method Not Allowed

    def test_config_blueprint_registration(self, app: Flask) -> None:
        """Test that the config blueprint is properly registered."""
        # Check that the blueprint is registered
        assert "config_api" in app.blueprints

        # Check that the route is registered
        rules = [rule.rule for rule in app.url_map.iter_rules()]
        assert "/api/config" in rules

    def test_config_function_exists(self) -> None:
        """Test that the manage_config_route function exists and is callable."""
        from server.api.config_bp import manage_config_route

        assert callable(manage_config_route)
        assert manage_config_route.__name__ == "manage_config_route"

    def test_config_blueprint_name(self) -> None:
        """Test that the blueprint has the correct name."""
        assert config_bp.name == "config_api"
        assert config_bp.url_prefix == "/api"

    def test_config_helper_functions_exist(self) -> None:
        """Test that helper functions exist and are callable."""
        from server.api.config_bp import _handle_get_config, _handle_load_error, _handle_post_config, _handle_preflight

        assert callable(_handle_preflight)
        assert callable(_handle_load_error)
        assert callable(_handle_get_config)
        assert callable(_handle_post_config)
