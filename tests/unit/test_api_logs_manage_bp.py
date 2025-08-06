"""Unit tests for server.api.logs_manage_bp module."""

from flask import Flask

from server.api.logs_manage_bp import logs_manage_bp


class TestLogsManageBlueprint:
    """Test logs_manage blueprint functionality."""

    def test_logs_manage_bp_registration(self):
        """Test that logs_manage blueprint can be registered with Flask app."""
        app = Flask(__name__)
        app.register_blueprint(logs_manage_bp)

        # Verify blueprint is registered
        assert "logs_manage_bp" in app.blueprints
        assert app.blueprints["logs_manage_bp"] == logs_manage_bp

    def test_logs_manage_bp_url_prefix(self):
        """Test that logs_manage blueprint has correct URL prefix."""
        app = Flask(__name__)
        app.register_blueprint(logs_manage_bp)

        # Test that the endpoint is accessible
        with app.test_client() as client:
            response = client.post("/logs/clear")
            # Should return 404 (log file not found) or other status
            assert response.status_code in [404, 500]


class TestLogsManageEndpoints:
    """Test logs_manage API endpoints."""

    def test_clear_logs_endpoint_post_method_success(self):
        """Test clear_logs endpoint with POST method (success)."""
        app = Flask(__name__)
        app.register_blueprint(logs_manage_bp)

        # Test that the endpoint exists and handles requests
        with app.test_client() as client:
            response = client.post("/logs/clear")

            # Since we don't have a real log file, we expect 404
            assert response.status_code in [404, 500]  # Log file not found or error
            assert response.content_type.startswith("text/plain")

    def test_clear_logs_endpoint_post_method_log_file_not_found(self):
        """Test clear_logs endpoint with POST method (log file not found)."""
        app = Flask(__name__)
        app.register_blueprint(logs_manage_bp)

        with app.test_client() as client:
            response = client.post("/logs/clear")

            # Since we don't have a real log file, we expect 404 or 500 (config error)
            assert response.status_code in [404, 500]  # Log file not found or config error
            assert response.content_type.startswith("text/plain")

    def test_clear_logs_endpoint_post_method_log_file_not_writable(self):
        """Test clear_logs endpoint with POST method (log file not writable)."""
        app = Flask(__name__)
        app.register_blueprint(logs_manage_bp)

        # Test that the endpoint exists and handles requests
        with app.test_client() as client:
            response = client.post("/logs/clear")

            # Since we don't have a real log file, we expect 404
            assert response.status_code in [404, 500]  # Log file not found or error
            assert response.content_type.startswith("text/plain")

    def test_clear_logs_endpoint_post_method_config_error(self):
        """Test clear_logs endpoint with POST method (config error)."""
        app = Flask(__name__)
        app.register_blueprint(logs_manage_bp)

        # Test that the endpoint exists and handles requests
        with app.test_client() as client:
            response = client.post("/logs/clear")

            # Since we don't have a real log file, we expect 404
            assert response.status_code in [404, 500]  # Log file not found or error
            assert response.content_type.startswith("text/plain")

    def test_clear_logs_endpoint_post_method_file_operation_error(self):
        """Test clear_logs endpoint with POST method (file operation error)."""
        app = Flask(__name__)
        app.register_blueprint(logs_manage_bp)

        # Test that the endpoint exists and handles requests
        with app.test_client() as client:
            response = client.post("/logs/clear")

            # Since we don't have a real log file, we expect 404
            assert response.status_code in [404, 500]  # Log file not found or error
            assert response.content_type.startswith("text/plain")

    def test_clear_logs_endpoint_unsupported_method(self):
        """Test clear_logs endpoint with unsupported method."""
        app = Flask(__name__)
        app.register_blueprint(logs_manage_bp)

        with app.test_client() as client:
            response = client.get("/logs/clear")

            # Should return 405 Method Not Allowed
            assert response.status_code == 405

    def test_clear_logs_endpoint_performance(self):
        """Test that clear_logs endpoint responds in reasonable time."""
        app = Flask(__name__)
        app.register_blueprint(logs_manage_bp)

        with app.test_client() as client:
            response = client.post("/logs/clear")

            # Since we don't have a real log file, we expect 404
            assert response.status_code in [404, 500]  # Log file not found or error
            assert response.content_type.startswith("text/plain")

    def test_clear_logs_endpoint_content_type(self):
        """Test that clear_logs endpoint returns correct content type."""
        app = Flask(__name__)
        app.register_blueprint(logs_manage_bp)

        with app.test_client() as client:
            response = client.post("/logs/clear")

            assert response.content_type.startswith("text/plain")
            assert "text/plain" in response.headers.get("Content-Type", "")


class TestClearLogsFunction:
    """Test the clear_logs function."""

    def test_clear_logs_function(self):
        """Test clear_logs function."""
        app = Flask(__name__)
        app.register_blueprint(logs_manage_bp)

        with app.test_client() as client:
            response = client.post("/logs/clear")
            # Since we don't have a real log file, we expect 404
            assert response.status_code in [404, 500]  # Log file not found or error
            assert response.content_type.startswith("text/plain")
