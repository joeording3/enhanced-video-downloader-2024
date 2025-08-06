"""
Unit tests for server.api.config_bp route functions.

This module tests the main route function to improve test coverage.
"""

from typing import Any
from unittest.mock import Mock, patch

from flask import Flask

from server.api.config_bp import config_bp
from server.constants import get_server_port


class TestConfigBpRoutes:
    """Test config blueprint route functions."""

    def setup_method(self) -> None:
        """Set up test fixtures."""
        self.app = Flask(__name__)
        self.app.register_blueprint(config_bp)
        self.app.config["TESTING"] = True
        self.client = self.app.test_client()

    def test_config_options_request(self) -> None:
        """Test OPTIONS request for CORS preflight."""
        response = self.client.options("/api/config")
        assert response.status_code == 200

        # Check CORS headers
        assert response.headers.get("Access-Control-Allow-Origin") == "*"
        assert "Content-Type" in response.headers.get("Access-Control-Allow-Headers", "")

    @patch("server.api.config_bp.Config")
    def test_config_get_success(self, mock_config_class: Any) -> None:
        """Test successful GET request."""
        # Mock config instance
        mock_config = Mock()
        mock_config.as_dict.return_value = {
            "host": "localhost",
            "port": get_server_port(),
            "download_dir": "/downloads",
        }
        mock_config_class.load.return_value = mock_config

        response = self.client.get("/api/config")
        assert response.status_code == 200

        data = response.get_json()
        assert data["host"] == "localhost"
        assert data["port"] == get_server_port()
        assert data["download_dir"] == "/downloads"

    @patch("server.api.config_bp.Config")
    def test_config_get_load_error(self, mock_config_class: Any) -> None:
        """Test GET request when config loading fails."""
        mock_config_class.load.side_effect = Exception("Config load failed")

        response = self.client.get("/api/config")
        assert response.status_code == 500

        data = response.get_json()
        assert data["success"] is False
        assert "Failed to load server configuration" in data["error"]

    @patch("server.api.config_bp.Config")
    def test_config_get_as_dict_error(self, mock_config_class: Any) -> None:
        """Test GET request when as_dict fails."""
        mock_config = Mock()
        mock_config.as_dict.side_effect = Exception("Serialization failed")
        mock_config_class.load.return_value = mock_config

        response = self.client.get("/api/config")
        assert response.status_code == 500

        data = response.get_json()
        assert data["success"] is False
        assert "Error retrieving configuration" in data["error"]

    def test_config_post_not_json(self) -> None:
        """Test POST request with non-JSON content."""
        response = self.client.post("/api/config", data="not json", content_type="text/plain")
        assert response.status_code == 415

        data = response.get_json()
        assert data["success"] is False
        assert "Content-Type must be application/json" in data["error"]

    def test_config_post_invalid_json_type(self) -> None:
        """Test POST request with JSON that's not an object."""
        response = self.client.post("/api/config", json="not an object")
        assert response.status_code == 400

        data = response.get_json()
        assert data["success"] is False
        assert "expected an object" in data["error"]

    @patch("server.api.config_bp.Config")
    def test_config_post_validation_error(self, mock_config_class: Any) -> None:
        """Test POST request with validation error."""
        # Mock config loading
        mock_config = Mock()
        mock_config_class.load.return_value = mock_config

        # Mock validation error in update_config
        mock_config.update_config.side_effect = ValueError("Invalid configuration value")

        response = self.client.post("/api/config", json={"host": "bad-host"})
        assert response.status_code == 400

        data = response.get_json()
        assert data["success"] is False
        assert "Invalid configuration value" in data["error"]

    @patch("server.api.config_bp.Config")
    def test_config_post_no_valid_fields(self, mock_config_class: Any) -> None:
        """Test POST request with no valid fields."""
        # Mock config loading
        mock_config = Mock()
        mock_config_class.load.return_value = mock_config

        # Mock empty payload validation
        mock_config.update_config.side_effect = ValueError("No valid configuration fields provided")

        response = self.client.post("/api/config", json={"unknown_field": "value"})
        assert response.status_code == 400

        data = response.get_json()
        assert data["success"] is False
        assert "No valid configuration fields provided" in data["error"]

    @patch("server.api.config_bp.Config")
    def test_config_post_success(self, mock_config_class: Any) -> None:
        """Test successful POST request."""
        # Mock config loading
        mock_config = Mock()
        mock_config.update_config.return_value = None
        mock_config.as_dict.return_value = {"host": "newhost", "port": get_server_port()}
        mock_config_class.load.return_value = mock_config

        response = self.client.post("/api/config", json={"host": "newhost", "port": get_server_port()})
        assert response.status_code == 200

        data = response.get_json()
        assert data["success"] is True
        assert "Configuration updated successfully" in data["message"]
        assert "new_config" in data

    @patch("server.api.config_bp.Config")
    def test_config_post_attribute_error(self, mock_config_class: Any) -> None:
        """Test POST request with unknown config key."""
        # Mock config loading
        mock_config = Mock()
        mock_config.update_config.side_effect = AttributeError("Unknown config key")
        mock_config_class.load.return_value = mock_config

        response = self.client.post("/api/config", json={"unknown_key": "value"})
        assert response.status_code == 400

        data = response.get_json()
        assert data["success"] is False
        assert "Unknown config key" in data["error"]

    @patch("server.api.config_bp.Config")
    def test_config_post_value_error(self, mock_config_class: Any) -> None:
        """Test POST request with invalid config value."""
        # Mock config loading
        mock_config = Mock()
        mock_config.update_config.side_effect = ValueError("Invalid value")
        mock_config_class.load.return_value = mock_config

        response = self.client.post("/api/config", json={"port": -1})
        assert response.status_code == 400

        data = response.get_json()
        assert data["success"] is False
        assert "Invalid value" in data["error"]

    @patch("server.api.config_bp.Config")
    def test_config_post_unexpected_error(self, mock_config_class: Any) -> None:
        """Test POST request with unexpected server error."""
        # Mock config loading
        mock_config = Mock()
        mock_config.update_config.side_effect = RuntimeError("Unexpected error")
        mock_config_class.load.return_value = mock_config

        response = self.client.post("/api/config", json={"host": "localhost"})
        assert response.status_code == 500

        data = response.get_json()
        assert data["success"] is False
        assert "Failed to update configuration" in data["error"]

    def test_config_invalid_method(self) -> None:
        """Test invalid HTTP method."""
        response = self.client.put("/api/config", json={"test": "data"})
        assert response.status_code == 405

        # Flask may not return JSON for 405 errors, just check status code
        # The route should handle this properly
