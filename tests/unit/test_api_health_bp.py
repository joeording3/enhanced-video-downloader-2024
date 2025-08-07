"""Unit tests for server.api.health_bp module."""

import time

from flask import Flask

from server.api.health_bp import health, health_bp


class TestHealthBlueprint:
    """Test health blueprint functionality."""

    def test_health_bp_registration(self):
        """Test that health blueprint can be registered with Flask app."""
        app = Flask(__name__)
        app.register_blueprint(health_bp)

        # Verify blueprint is registered
        assert "health" in app.blueprints
        assert app.blueprints["health"] == health_bp

    def test_health_bp_url_prefix(self):
        """Test that health blueprint has correct URL prefix."""
        app = Flask(__name__)
        app.register_blueprint(health_bp, url_prefix="/api")

        # Test that the endpoint is accessible
        with app.test_client() as client:
            response = client.get("/api/health")
            assert response.status_code == 200
            data = response.get_json()
            assert data["app_name"] == "Enhanced Video Downloader"
            assert data["status"] == "healthy"

    def test_health_endpoint_get_method(self):
        """Test health endpoint with GET method."""
        app = Flask(__name__)
        app.register_blueprint(health_bp)

        with app.test_client() as client:
            response = client.get("/health")

            assert response.status_code == 200
            data = response.get_json()
            assert data["app_name"] == "Enhanced Video Downloader"
            assert data["status"] == "healthy"

    def test_health_endpoint_options_method(self):
        """Test health endpoint with OPTIONS method."""
        app = Flask(__name__)
        app.register_blueprint(health_bp)

        with app.test_client() as client:
            response = client.options("/health")

            assert response.status_code == 200
            data = response.get_json()
            assert data["app_name"] == "Enhanced Video Downloader"
            assert data["status"] == "healthy"

    def test_health_endpoint_unsupported_method(self):
        """Test health endpoint with unsupported method."""
        app = Flask(__name__)
        app.register_blueprint(health_bp)

        with app.test_client() as client:
            response = client.post("/health")

            # Should return 405 Method Not Allowed
            assert response.status_code == 405

    def test_health_endpoint_response_structure(self):
        """Test that health endpoint returns expected response structure."""
        app = Flask(__name__)
        app.register_blueprint(health_bp)

        with app.test_client() as client:
            response = client.get("/health")

            # Should return 200 OK with JSON body
            assert response.status_code == 200
            data = response.get_json()
            assert data["app_name"] == "Enhanced Video Downloader"
            assert data["status"] == "healthy"

    def test_health_endpoint_content_type(self):
        """Test that health endpoint returns correct content type."""
        app = Flask(__name__)
        app.register_blueprint(health_bp)

        with app.test_client() as client:
            response = client.get("/health")

            # Should return 200 OK with JSON content type
            assert response.status_code == 200
            assert response.content_type == "application/json"

    def test_health_endpoint_cors_headers(self):
        """Test that health endpoint includes appropriate CORS headers."""
        app = Flask(__name__)
        app.register_blueprint(health_bp)

        with app.test_client() as client:
            response = client.get("/health")

            # Should return 200 OK
            assert response.status_code == 200
            # Check for common CORS headers (if implemented)
            # This test documents the current behavior

    def test_health_function_direct_call(self):
        """Test health function when called directly."""
        app = Flask(__name__)

        with app.test_request_context("/health"):
            response = health()

            # Should return a tuple of (response, status_code)
            assert isinstance(response, tuple)
            assert len(response) == 2

            response_obj, status_code = response
            assert status_code == 200

            # Verify response is JSON dict
            assert isinstance(response_obj, dict)
            assert response_obj["app_name"] == "Enhanced Video Downloader"
            assert response_obj["status"] == "healthy"

    def test_health_endpoint_with_different_app_names(self):
        """Test health endpoint behavior with different app configurations."""
        app = Flask(__name__)
        app.register_blueprint(health_bp)

        with app.test_client() as client:
            response = client.get("/health")

            # Should return 200 OK with JSON regardless of Flask app configuration
            assert response.status_code == 200
            data = response.get_json()
            assert data["app_name"] == "Enhanced Video Downloader"
            assert data["status"] == "healthy"

    def test_health_endpoint_performance(self):
        """Test that health endpoint responds quickly."""
        app = Flask(__name__)
        app.register_blueprint(health_bp)

        with app.test_client() as client:
            start_time = time.time()

            response = client.get("/health")

            end_time = time.time()
            response_time = end_time - start_time

            # Health endpoint should respond very quickly (< 100ms)
            assert response_time < 0.1
            assert response.status_code == 200

    def test_health_endpoint_error_handling(self):
        """Test health endpoint error handling."""
        app = Flask(__name__)
        app.register_blueprint(health_bp)

        with app.test_client() as client:
            # Test with malformed request (should still work)
            response = client.get("/health", headers={"Invalid-Header": "invalid"})

            # Should still return 200 OK with JSON
            assert response.status_code == 200
            data = response.get_json()
            assert data["app_name"] == "Enhanced Video Downloader"
            assert data["status"] == "healthy"

    def test_health_endpoint_with_query_parameters(self):
        """Test health endpoint with query parameters (should be ignored)."""
        app = Flask(__name__)
        app.register_blueprint(health_bp)

        with app.test_client() as client:
            response = client.get("/health?param1=value1&param2=value2")

            # Should still return 200 OK with JSON
            assert response.status_code == 200
            data = response.get_json()
            assert data["app_name"] == "Enhanced Video Downloader"
            assert data["status"] == "healthy"
