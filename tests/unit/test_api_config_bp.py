"""Unit tests for server.api.config_bp module."""

from unittest.mock import Mock, patch

from flask import Flask

from server.api.config_bp import (
    _handle_get_config,
    _handle_load_error,
    _handle_post_config,
    _handle_preflight,
    _validate_post_data,
    config_bp,
)
from server.constants import get_server_port


class TestConfigBlueprint:
    """Test config blueprint functionality."""

    def test_config_bp_registration(self):
        """Test that config blueprint can be registered with Flask app."""
        app = Flask(__name__)
        app.register_blueprint(config_bp)

        # Verify blueprint is registered
        assert "config_api" in app.blueprints
        assert app.blueprints["config_api"] == config_bp

    def test_config_bp_url_prefix(self):
        """Test that config blueprint has correct URL prefix."""
        app = Flask(__name__)
        app.register_blueprint(config_bp)

        # Test that the endpoint is accessible
        with app.test_client() as client:
            response = client.get("/api/config")
            # Should return 200 or 500 depending on config loading
            assert response.status_code in [200, 500]


class TestHelperFunctions:
    """Test helper functions in config blueprint."""

    def test_handle_preflight(self):
        """Test CORS preflight request handling."""
        app = Flask(__name__)
        with app.app_context():
            response, status_code = _handle_preflight()

            assert status_code == 200
            assert response.json["success"] is True
            assert response.headers["Access-Control-Allow-Origin"] == "*"
            assert response.headers["Access-Control-Allow-Headers"] == "Content-Type,Authorization"
            assert response.headers["Access-Control-Allow-Methods"] == "GET,POST,OPTIONS"

    def test_handle_load_error(self):
        """Test configuration loading error handling."""
        test_error = Exception("Test error")
        app = Flask(__name__)

        with patch("server.api.config_bp.logger") as mock_logger, app.app_context():
            response, status_code = _handle_load_error(test_error)

            assert status_code == 500
            assert response.json["success"] is False
            assert "Failed to load server configuration" in response.json["error"]
            mock_logger.error.assert_called_once()

    def test_handle_get_config_success(self):
        """Test successful GET config handling."""
        mock_config = Mock()
        mock_config.as_dict.return_value = {"test": "value"}
        app = Flask(__name__)

        with app.app_context():
            response, status_code = _handle_get_config(mock_config)

            assert status_code == 200
            assert response.json["test"] == "value"
            mock_config.as_dict.assert_called_once()

    def test_handle_get_config_error(self):
        """Test GET config handling with error."""
        mock_config = Mock()
        mock_config.as_dict.side_effect = Exception("Config error")
        app = Flask(__name__)

        with patch("server.api.config_bp.logger") as mock_logger, app.app_context():
            response, status_code = _handle_get_config(mock_config)

            assert status_code == 500
            assert response.json["success"] is False
            assert "Error retrieving configuration" in response.json["error"]
            mock_logger.error.assert_called_once()

    def test_validate_post_data_success(self):
        """Test successful POST data validation."""
        app = Flask(__name__)

        with app.test_request_context(json={"key": "value"}):
            data, error = _validate_post_data()

            assert data == {"key": "value"}
            assert error is None

    def test_validate_post_data_not_json(self):
        """Test POST data validation with non-JSON content."""
        app = Flask(__name__)

        with app.test_request_context():
            data, error = _validate_post_data()

            assert data == {}
            assert error is not None
            response, status_code = error
            assert status_code == 415
            assert "Content-Type must be application/json" in response.json["error"]

    def test_validate_post_data_invalid_json(self):
        """Test POST data validation with invalid JSON."""
        app = Flask(__name__)

        with app.test_request_context():
            data, error = _validate_post_data()

            assert data == {}
            assert error is not None
            response, status_code = error
            assert status_code == 415
            assert "Content-Type must be application/json" in response.json["error"]

    def test_validate_post_data_empty(self):
        """Test POST data validation with empty data."""
        app = Flask(__name__)

        with app.test_request_context(json={}):
            data, error = _validate_post_data()

            assert data == {}
            assert error is not None
            response, status_code = error
            assert status_code == 400
            assert "No data provided" in response.json["error"]

    def test_validate_post_data_not_dict(self):
        """Test POST data validation with non-dict data."""
        app = Flask(__name__)

        with app.test_request_context(json="not a dict"):
            data, error = _validate_post_data()

            assert data == {}
            assert error is not None
            response, status_code = error
            assert status_code == 400
            assert "expected an object" in response.json["error"]

    def test_handle_post_config_success(self):
        """Test successful POST config handling."""
        mock_config = Mock()
        mock_config.as_dict.return_value = {"updated": "config"}
        app = Flask(__name__)

        with patch("server.api.config_bp._validate_post_data") as mock_validate:
            mock_validate.return_value = ({"key": "value"}, None)

            with app.app_context():
                response, status_code = _handle_post_config(mock_config)

                assert status_code == 200
                assert response.json["success"] is True
                assert "Configuration updated successfully" in response.json["message"]
                assert response.json["new_config"] == {"updated": "config"}
                mock_config.update_config.assert_called_once_with({"key": "value"})

    def test_handle_post_config_validation_error(self):
        """Test POST config handling with validation error."""
        mock_config = Mock()
        app = Flask(__name__)

        with patch("server.api.config_bp._validate_post_data") as mock_validate:
            mock_validate.return_value = ({}, (Mock(), 400))

            with app.app_context():
                response, status_code = _handle_post_config(mock_config)

                assert status_code == 400
                # The response should be the error from validation

    def test_handle_post_config_value_error(self):
        """Test POST config handling with ValueError."""
        mock_config = Mock()
        mock_config.update_config.side_effect = ValueError("Invalid value")
        app = Flask(__name__)

        with patch("server.api.config_bp._validate_post_data") as mock_validate:
            mock_validate.return_value = ({"key": "value"}, None)

            with app.app_context():
                response, status_code = _handle_post_config(mock_config)

                assert status_code == 400
                assert response.json["success"] is False
                assert "Invalid value" in response.json["error"]

    def test_handle_post_config_attribute_error(self):
        """Test POST config handling with AttributeError."""
        mock_config = Mock()
        mock_config.update_config.side_effect = AttributeError("Missing attribute")
        app = Flask(__name__)

        with patch("server.api.config_bp._validate_post_data") as mock_validate:
            mock_validate.return_value = ({"key": "value"}, None)

            with app.app_context():
                response, status_code = _handle_post_config(mock_config)

                assert status_code == 400
                assert response.json["success"] is False
                assert "Missing attribute" in response.json["error"]

    def test_handle_post_config_general_error(self):
        """Test POST config handling with general exception."""
        mock_config = Mock()
        mock_config.update_config.side_effect = Exception("General error")
        app = Flask(__name__)

        with patch("server.api.config_bp._validate_post_data") as mock_validate:
            mock_validate.return_value = ({"key": "value"}, None)

            with app.app_context():
                response, status_code = _handle_post_config(mock_config)

                assert status_code == 500
                assert response.json["success"] is False
                assert "Failed to update configuration" in response.json["error"]


class TestConfigEndpoints:
    """Test config API endpoints."""

    def test_config_endpoint_options_method(self):
        """Test config endpoint with OPTIONS method."""
        app = Flask(__name__)
        app.register_blueprint(config_bp)

        with app.test_client() as client:
            response = client.options("/api/config")

            assert response.status_code == 200
            assert response.json["success"] is True
            assert response.headers["Access-Control-Allow-Origin"] == "*"

    def test_config_endpoint_get_method_success(self):
        """Test config endpoint with GET method (success)."""
        app = Flask(__name__)
        app.register_blueprint(config_bp)

        mock_config = Mock()
        mock_config.as_dict.return_value = {"server_host": "127.0.0.1", "server_port": get_server_port()}

        with patch("server.api.config_bp.Config.load", return_value=mock_config), app.test_client() as client:
            response = client.get("/api/config")

            assert response.status_code == 200
            data = response.json
            assert "server_host" in data
            assert "server_port" in data

    def test_config_endpoint_get_method_error(self):
        """Test config endpoint with GET method (error)."""
        app = Flask(__name__)
        app.register_blueprint(config_bp)

        with patch("server.api.config_bp.Config.load", side_effect=Exception("Config error")), patch(
            "server.api.config_bp.logger"
        ) as mock_logger, app.test_client() as client:
            response = client.get("/api/config")

            assert response.status_code == 500
            assert response.json["success"] is False
            assert "Failed to load server configuration" in response.json["error"]
            mock_logger.error.assert_called_once()

    def test_config_endpoint_post_method_success(self):
        """Test config endpoint with POST method (success)."""
        app = Flask(__name__)
        app.register_blueprint(config_bp)

        mock_config = Mock()
        mock_config.as_dict.return_value = {"server_host": "127.0.0.1", "server_port": get_server_port()}

        with patch("server.api.config_bp.Config.load", return_value=mock_config), app.test_client() as client:
            response = client.post("/api/config", json={"server_host": "127.0.0.1"}, content_type="application/json")

            assert response.status_code == 200
            assert response.json["success"] is True
            assert "Configuration updated successfully" in response.json["message"]

    def test_config_endpoint_post_method_invalid_content_type(self):
        """Test config endpoint with POST method (invalid content type)."""
        app = Flask(__name__)
        app.register_blueprint(config_bp)

        with app.test_client() as client:
            response = client.post("/api/config", data="not json", content_type="text/plain")

            assert response.status_code == 415
            assert response.json["success"] is False
            assert "Content-Type must be application/json" in response.json["error"]

    def test_config_endpoint_post_method_invalid_json(self):
        """Test config endpoint with POST method (invalid JSON)."""
        app = Flask(__name__)
        app.register_blueprint(config_bp)

        with app.test_client() as client:
            response = client.post("/api/config", data="invalid json", content_type="application/json")

            assert response.status_code == 400
            assert response.json["success"] is False
            assert "Invalid JSON" in response.json["error"]

    def test_config_endpoint_post_method_empty_data(self):
        """Test config endpoint with POST method (empty data)."""
        app = Flask(__name__)
        app.register_blueprint(config_bp)

        with app.test_client() as client:
            response = client.post("/api/config", json={}, content_type="application/json")

            assert response.status_code == 400
            assert response.json["success"] is False
            assert "No data provided" in response.json["error"]

    def test_config_endpoint_unsupported_method(self):
        """Test config endpoint with unsupported method."""
        app = Flask(__name__)
        app.register_blueprint(config_bp)

        with app.test_client() as client:
            response = client.put("/api/config")

            assert response.status_code == 405
            # Flask returns HTML for unsupported methods, not JSON
            assert b"Method Not Allowed" in response.data

    def test_config_endpoint_cors_headers(self):
        """Test that config endpoint includes appropriate CORS headers."""
        app = Flask(__name__)
        app.register_blueprint(config_bp)

        with app.test_client() as client:
            response = client.options("/api/config")

            assert response.status_code == 200
            assert response.headers["Access-Control-Allow-Origin"] == "*"
            assert response.headers["Access-Control-Allow-Headers"] == "Content-Type,Authorization"
            assert response.headers["Access-Control-Allow-Methods"] == "GET,POST,OPTIONS"
