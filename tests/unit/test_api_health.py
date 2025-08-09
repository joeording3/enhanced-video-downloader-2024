"""
Unit tests for health API endpoint.

This module provides comprehensive tests for the health endpoint blueprint
to improve coverage of server/api/health_bp.py.
"""

import pytest
from flask import Flask
from flask.testing import FlaskClient

from server.api.health_bp import health, health_bp


@pytest.fixture
def app() -> Flask:
    """Create a test Flask application with the health blueprint."""
    app = Flask(__name__)
    app.register_blueprint(health_bp, url_prefix="/api")
    return app


@pytest.fixture
def client(app: Flask) -> FlaskClient:
    """Create a test client for the Flask application."""
    return app.test_client()


class TestHealthEndpoint:
    """Test health endpoint functionality."""

    def test_health_get_success(self, client: FlaskClient) -> None:
        """Test successful health check with GET method."""
        response = client.get("/api/health")

        assert response.status_code == 200
        data = response.get_json()
        assert data["app_name"] == "Enhanced Video Downloader"
        assert data["status"] == "healthy"

    def test_health_options_success(self, client: FlaskClient) -> None:
        """Test successful health check with OPTIONS method."""
        response = client.options("/api/health")

        assert response.status_code == 200
        data = response.get_json()
        assert data["app_name"] == "Enhanced Video Downloader"
        assert data["status"] == "healthy"

    def test_health_post_not_allowed(self, client: FlaskClient) -> None:
        """Test that POST method is not allowed."""
        response = client.post("/api/health")

        assert response.status_code == 405  # Method Not Allowed

    def test_health_put_not_allowed(self, client: FlaskClient) -> None:
        """Test that PUT method is not allowed."""
        response = client.put("/api/health")

        assert response.status_code == 405  # Method Not Allowed

    def test_health_delete_not_allowed(self, client: FlaskClient) -> None:
        """Test that DELETE method is not allowed."""
        response = client.delete("/api/health")

        assert response.status_code == 405  # Method Not Allowed

    def test_health_blueprint_registration(self, app: Flask) -> None:
        """Test that the health blueprint is properly registered."""
        # Check that the blueprint is registered
        assert "health" in app.blueprints

        # Check that the route is registered
        rules = [rule.rule for rule in app.url_map.iter_rules()]
        assert "/api/health" in rules

    def test_health_function_exists(self) -> None:
        """Test that the health function exists and is callable."""
        assert callable(health)
        assert health.__name__ == "health"

    def test_health_blueprint_name(self) -> None:
        """Test that the blueprint has the correct name."""
        assert health_bp.name == "health"
        # Blueprint itself has no intrinsic prefix; mounted under /api in app
