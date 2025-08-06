"""
Unit tests for logs API endpoint.

This module provides comprehensive tests for the logs endpoint blueprint
to improve coverage of server/api/logs_bp.py.
"""

import pytest
from flask import Flask
from flask.testing import FlaskClient

from server.api.logs_bp import get_logs, logs_bp

pytestmark = pytest.mark.unit


@pytest.fixture
def app() -> Flask:
    """Create a test Flask application with the logs blueprint."""
    app = Flask(__name__)
    app.register_blueprint(logs_bp)
    return app


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    """Create a test client for the Flask application."""
    return app.test_client()


class TestLogsEndpoint:
    """Test logs endpoint functionality with parameterized test cases."""

    @pytest.mark.parametrize(
        "endpoint, expected_status, expected_data, description",
        [
            ("/logs", 204, b"", "OPTIONS request to /logs"),
            ("/logs/", 204, b"", "OPTIONS request to /logs/ with trailing slash"),
        ],
    )
    def test_logs_options_requests(
        self, client: FlaskClient, endpoint: str, expected_status: int, expected_data: bytes, description: str
    ) -> None:
        """
        Test successful logs OPTIONS requests using parameterization.

        :param client: Flask test client
        :param endpoint: Endpoint to test
        :param expected_status: Expected HTTP status code
        :param expected_data: Expected response data
        :param description: Test case description for clarity
        """
        response = client.options(endpoint)
        assert response.status_code == expected_status
        assert response.data == expected_data

    @pytest.mark.parametrize(
        "lines_param, expected_status, expected_error, description",
        [
            ("invalid", 400, "Invalid 'lines' parameter", "Non-numeric lines parameter"),
            ("-5", 400, "Invalid 'lines' parameter", "Negative lines parameter"),
            ("0", 400, "Invalid 'lines' parameter", "Zero lines parameter"),
        ],
    )
    def test_logs_get_invalid_lines_parameters(
        self, client: FlaskClient, lines_param: str, expected_status: int, expected_error: str, description: str
    ) -> None:
        """
        Test logs GET with various invalid lines parameters using parameterization.

        :param client: Flask test client
        :param lines_param: Invalid lines parameter value
        :param expected_status: Expected HTTP status code
        :param expected_error: Expected error message
        :param description: Test case description for clarity
        """
        response = client.get(f"/logs?lines={lines_param}")
        assert response.status_code == expected_status
        assert response.mimetype == "text/plain"
        assert expected_error in response.get_data(as_text=True)

    @pytest.mark.parametrize(
        "http_method, expected_status, description",
        [
            ("post", 405, "POST method not allowed"),
            ("put", 405, "PUT method not allowed"),
            ("delete", 405, "DELETE method not allowed"),
        ],
    )
    def test_logs_http_methods_not_allowed(
        self, client: FlaskClient, http_method: str, expected_status: int, description: str
    ) -> None:
        """
        Test that various HTTP methods are not allowed using parameterization.

        :param client: Flask test client
        :param http_method: HTTP method to test
        :param expected_status: Expected HTTP status code (405 Method Not Allowed)
        :param description: Test case description for clarity
        """
        method_func = getattr(client, http_method)
        response = method_func("/logs")
        assert response.status_code == expected_status

    @pytest.mark.parametrize(
        "recent_param, expected_statuses, description",
        [
            ("1", [200, 404], "Recent parameter with '1'"),
            ("yes", [200, 404], "Recent parameter with 'yes'"),
            ("false", [200, 404], "Recent parameter with 'false'"),
        ],
    )
    def test_logs_get_with_recent_parameters(
        self, client: FlaskClient, recent_param: str, expected_statuses: list, description: str
    ) -> None:
        """
        Test logs GET with different recent parameter variants using parameterization.

        :param client: Flask test client
        :param recent_param: Recent parameter value to test
        :param expected_statuses: Expected HTTP status codes (200 if log exists, 404 if not)
        :param description: Test case description for clarity
        """
        response = client.get(f"/logs?lines=3&recent={recent_param}")
        assert response.status_code in expected_statuses

    @pytest.mark.parametrize(
        "lines_param, expected_statuses, description",
        [
            (None, [200, 404], "Default parameters"),
            ("5", [200, 404], "Custom lines parameter"),
        ],
    )
    def test_logs_get_with_lines_parameters(
        self, client: FlaskClient, lines_param: str, expected_statuses: list, description: str
    ) -> None:
        """
        Test logs GET with various lines parameters using parameterization.

        :param client: Flask test client
        :param lines_param: Lines parameter value (None for default)
        :param expected_statuses: Expected HTTP status codes (200 if log exists, 404 if not)
        :param description: Test case description for clarity
        """
        response = client.get("/logs") if lines_param is None else client.get(f"/logs?lines={lines_param}")

        assert response.status_code in expected_statuses
        if response.status_code == 200:
            assert response.mimetype == "text/plain"

    def test_logs_blueprint_registration(self, app: Flask) -> None:
        """Test that the logs blueprint is properly registered."""
        # Check that the blueprint is registered
        assert "logs" in app.blueprints

        # Check that the routes are registered
        rules = [rule.rule for rule in app.url_map.iter_rules()]
        assert "/logs" in rules
        assert "/logs/" in rules

    def test_logs_function_exists(self) -> None:
        """Test that the get_logs function exists and is callable."""
        assert callable(get_logs)
        assert get_logs.__name__ == "get_logs"

    def test_logs_blueprint_name(self) -> None:
        """Test that the blueprint has the correct name."""
        assert logs_bp.name == "logs"
        assert logs_bp.url_prefix is None  # No prefix for this blueprint
