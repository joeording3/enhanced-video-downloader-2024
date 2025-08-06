"""Unit tests for server.api.download_bp module."""

import time
from unittest.mock import Mock, patch

from flask import Flask

from server.api.download_bp import download_bp


class TestDownloadBlueprint:
    """Test download blueprint functionality."""

    def test_download_bp_registration(self):
        """Test that download blueprint can be registered with Flask app."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        # Verify blueprint is registered
        assert "download" in app.blueprints
        assert app.blueprints["download"] == download_bp

    def test_download_bp_url_prefix(self):
        """Test that download blueprint has correct URL prefix."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        # Test that the endpoint is accessible
        with app.test_client() as client:
            response = client.post("/api/download")
            # Should return 400 (missing URL) or other status
            assert response.status_code in [400, 500]


class TestDownloadEndpoints:
    """Test download API endpoints."""

    def test_download_endpoint_options_method(self):
        """Test download endpoint with OPTIONS method."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with app.test_client() as client:
            response = client.options("/api/download")

            assert response.status_code == 204
            assert response.data == b""

    def test_download_endpoint_post_method_missing_url(self):
        """Test download endpoint with POST method (missing URL)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with app.test_client() as client:
            response = client.post("/api/download", json={}, content_type="application/json")

            assert response.status_code == 400
            data = response.json
            assert data["status"] == "error"
            assert "URL is required" in data["message"]
            assert data["error_type"] == "MISSING_URL"

    def test_download_endpoint_post_method_invalid_json(self):
        """Test download endpoint with POST method (invalid JSON)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with app.test_client() as client:
            response = client.post("/api/download", data="invalid json", content_type="application/json")

            assert response.status_code == 500
            data = response.json
            assert data["status"] == "error"
            assert "Server error" in data["message"]
            assert data["error_type"] == "SERVER_ERROR"

    def test_download_endpoint_post_method_validation_error(self):
        """Test download endpoint with POST method (validation error)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        mock_response = {"status": "error", "message": "Invalid request data", "error_type": "VALIDATION_ERROR"}

        with patch(
            "server.api.download_bp._process_download_request", return_value=(mock_response, None)
        ), app.test_client() as client:
            response = client.post("/api/download", json={"downloadId": "test123"}, content_type="application/json")

            assert response.status_code == 200
            data = response.json
            assert data["status"] == "error"
            assert "Invalid request data" in data["message"]
            assert data["error_type"] == "VALIDATION_ERROR"

    def test_download_endpoint_post_method_server_error(self):
        """Test download endpoint with POST method (server error)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with patch("server.api.download_bp._process_download_request"), app.test_client() as client:
            response = client.post("/api/download", json={"downloadId": "test123"}, content_type="application/json")

            assert response.status_code == 500
            data = response.json
            assert data["status"] == "error"
            assert "Server error" in data["message"]
            assert data["error_type"] == "SERVER_ERROR"

    def test_gallery_dl_endpoint_options_method(self):
        """Test gallery-dl endpoint with OPTIONS method."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with app.test_client() as client:
            response = client.options("/api/gallery-dl")

            assert response.status_code == 204
            assert response.data == b""

    def test_gallery_dl_endpoint_post_method_success(self):
        """Test gallery-dl endpoint with POST method (success)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        mock_response = {"status": "success", "message": "Gallery download started"}
        with patch(
            "server.api.download_bp.handle_gallery_dl_download", return_value=mock_response
        ), app.test_client() as client:
            response = client.post(
                "/api/gallery-dl",
                json={"downloadId": "test123", "url": "https://example.com"},
                content_type="application/json",
            )

            assert response.status_code == 200
            data = response.json
            assert data["status"] == "success"

    def test_gallery_dl_endpoint_post_method_validation_error(self):
        """Test gallery-dl endpoint with POST method (validation error)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with app.test_client() as client:
            response = client.post(
                "/api/gallery-dl",
                json={"downloadId": "test123"},  # Missing required url field
                content_type="application/json",
            )

            assert response.status_code == 400
            data = response.json
            assert data["status"] == "error"
            assert "Invalid request data" in data["message"]
            assert data["error_type"] == "VALIDATION_ERROR"

    def test_gallery_dl_endpoint_post_method_server_error(self):
        """Test gallery-dl endpoint with POST method (server error)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with patch(
            "server.api.download_bp.handle_gallery_dl_download", side_effect=Exception("Test error")
        ), app.test_client() as client:
            response = client.post(
                "/api/gallery-dl",
                json={"downloadId": "test123", "url": "https://example.com"},
                content_type="application/json",
            )

            assert response.status_code == 500
            data = response.json
            assert data["status"] == "error"
            assert "Server error" in data["message"]
            assert data["error_type"] == "SERVER_ERROR"

    def test_resume_endpoint_post_method_success(self):
        """Test resume endpoint with POST method (success)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        mock_response = {"status": "success", "message": "Resume download started"}
        with patch(
            "server.api.download_bp.handle_resume_download", return_value=mock_response
        ), app.test_client() as client:
            response = client.post(
                "/api/resume",
                json={"downloadId": "test123", "ids": ["file1.part", "file2.part"]},
                content_type="application/json",
            )

            assert response.status_code == 200
            data = response.json
            assert data["status"] == "success"

    def test_resume_endpoint_post_method_validation_error(self):
        """Test resume endpoint with POST method (validation error)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with app.test_client() as client:
            response = client.post(
                "/api/resume",
                json={},  # Missing required fields
                content_type="application/json",
            )

            assert response.status_code == 400
            data = response.json
            assert data["status"] == "error"
            assert "Invalid request data" in data["message"]

    def test_cancel_download_endpoint_options_method(self):
        """Test cancel download endpoint with OPTIONS method."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with app.test_client() as client:
            response = client.options("/api/download/test123/cancel")

            assert response.status_code == 204
            assert response.data == b""

    def test_cancel_download_endpoint_post_method_success(self):
        """Test cancel download endpoint with POST method (success)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        Mock()

        with patch("server.api.download_bp.download_process_registry"), patch(
            "server.api.download_bp.download_tempfile_registry"
        ) as mock_temp_registry:
            mock_temp_registry.pop.return_value = None

            with app.test_client() as client:
                response = client.post("/api/download/test123/cancel")

                assert response.status_code == 200
                data = response.json
                assert data["status"] == "success"
                assert "Download canceled" in data["message"]
                assert data["downloadId"] == "test123"

    def test_cancel_download_endpoint_post_method_not_found(self):
        """Test cancel download endpoint with POST method (download not found)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        mock_registry = Mock()
        mock_registry.get.return_value = None  # Simulate download not found

        with patch("server.api.download_bp.download_process_registry", mock_registry), app.test_client() as client:
            response = client.post("/api/download/test123/cancel")

            assert response.status_code == 404
            data = response.json
            assert data["status"] == "error"
            assert "No active download" in data["message"]
            assert data["downloadId"] == "test123"

    def test_pause_download_endpoint_options_method(self):
        """Test pause download endpoint with OPTIONS method."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with app.test_client() as client:
            response = client.options("/api/download/test123/pause")

            assert response.status_code == 204
            assert response.data == b""

    def test_pause_download_endpoint_post_method_success(self):
        """Test pause download endpoint with POST method (success)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        mock_proc = Mock()
        mock_registry = Mock()
        mock_registry.get.return_value = mock_proc

        with patch("server.api.download_bp.download_process_registry", mock_registry), app.test_client() as client:
            response = client.post("/api/download/test123/pause")

            assert response.status_code == 200
            data = response.json
            assert data["status"] == "success"
            assert "Download paused" in data["message"]
            assert data["downloadId"] == "test123"
            mock_proc.suspend.assert_called_once()

    def test_pause_download_endpoint_post_method_not_found(self):
        """Test pause download endpoint with POST method (download not found)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        mock_registry = Mock()
        mock_registry.get.return_value = None  # Simulate download not found

        with patch("server.api.download_bp.download_process_registry", mock_registry), app.test_client() as client:
            response = client.post("/api/download/test123/pause")

            assert response.status_code == 404
            data = response.json
            assert data["status"] == "error"
            assert "No active download" in data["message"]
            assert data["downloadId"] == "test123"

    def test_pause_download_endpoint_post_method_error(self):
        """Test pause download endpoint with POST method (pause error)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        mock_proc = Mock()
        mock_proc.suspend.side_effect = Exception("Pause error")
        mock_registry = Mock()
        mock_registry.get.return_value = mock_proc

        with patch("server.api.download_bp.download_process_registry", mock_registry), app.test_client() as client:
            response = client.post("/api/download/test123/pause")

            assert response.status_code == 500
            data = response.json
            assert data["status"] == "error"
            assert "Failed to pause download" in data["message"]
            assert data["downloadId"] == "test123"

    def test_resume_download_endpoint_options_method(self):
        """Test resume download endpoint with OPTIONS method."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with app.test_client() as client:
            response = client.options("/api/download/test123/resume")

            assert response.status_code == 204
            assert response.data == b""

    def test_resume_download_endpoint_post_method_success(self):
        """Test resume download endpoint with POST method (success)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        mock_proc = Mock()
        mock_registry = Mock()
        mock_registry.get.return_value = mock_proc

        with patch("server.api.download_bp.download_process_registry", mock_registry), app.test_client() as client:
            response = client.post("/api/download/test123/resume")

            assert response.status_code == 200
            data = response.json
            assert data["status"] == "success"
            assert "Download resumed" in data["message"]
            assert data["downloadId"] == "test123"
            mock_proc.resume.assert_called_once()

    def test_resume_download_endpoint_post_method_not_found(self):
        """Test resume download endpoint with POST method (download not found)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        mock_registry = Mock()
        mock_registry.get.return_value = None  # Simulate download not found

        with patch("server.api.download_bp.download_process_registry", mock_registry), app.test_client() as client:
            response = client.post("/api/download/test123/resume")

            assert response.status_code == 404
            data = response.json
            assert data["status"] == "error"
            assert "No paused download" in data["message"]
            assert data["downloadId"] == "test123"

    def test_resume_download_endpoint_post_method_error(self):
        """Test resume download endpoint with POST method (resume error)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        mock_proc = Mock()
        mock_proc.resume.side_effect = Exception("Resume error")
        mock_registry = Mock()
        mock_registry.get.return_value = mock_proc

        with patch("server.api.download_bp.download_process_registry", mock_registry), app.test_client() as client:
            response = client.post("/api/download/test123/resume")

            assert response.status_code == 500
            data = response.json
            assert data["status"] == "error"
            assert "Failed to resume download" in data["message"]
            assert data["downloadId"] == "test123"

    def test_set_priority_endpoint_options_method(self):
        """Test set priority endpoint with OPTIONS method."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with app.test_client() as client:
            response = client.options("/api/download/test123/priority")

            assert response.status_code == 204
            assert response.data == b""

    def test_set_priority_endpoint_post_method_success(self):
        """Test set priority endpoint with POST method (success)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        mock_proc = Mock()
        mock_registry = Mock()
        mock_registry.get.return_value = mock_proc

        with patch("server.api.download_bp.download_process_registry", mock_registry), app.test_client() as client:
            response = client.post(
                "/api/download/test123/priority", json={"priority": 10}, content_type="application/json"
            )

            assert response.status_code == 200
            data = response.json
            assert data["status"] == "success"
            assert "Priority set successfully" in data["message"]
            assert data["downloadId"] == "test123"
            mock_proc.nice.assert_called_once_with(10)

    def test_set_priority_endpoint_post_method_not_found(self):
        """Test set priority endpoint with POST method (download not found)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        mock_registry = Mock()
        mock_registry.get.return_value = None  # Simulate download not found

        with patch("server.api.download_bp.download_process_registry", mock_registry), app.test_client() as client:
            response = client.post(
                "/api/download/test123/priority", json={"priority": 10}, content_type="application/json"
            )

            assert response.status_code == 404
            data = response.json
            assert data["status"] == "error"
            assert "Download not found" in data["message"]
            assert data["downloadId"] == "test123"

    def test_set_priority_endpoint_post_method_invalid_json(self):
        """Test set priority endpoint with POST method (invalid JSON)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with app.test_client() as client:
            response = client.post(
                "/api/download/test123/priority", data="invalid json", content_type="application/json"
            )

            assert response.status_code == 400
            data = response.json
            assert data["status"] == "error"
            assert "Invalid JSON" in data["message"]
            assert data["downloadId"] == "test123"

    def test_set_priority_endpoint_post_method_validation_error(self):
        """Test set priority endpoint with POST method (validation error)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with app.test_client() as client:
            response = client.post(
                "/api/download/test123/priority", json={"invalid_field": "value"}, content_type="application/json"
            )

            assert response.status_code == 400
            data = response.json
            assert data["status"] == "error"
            assert "Invalid priority value" in data["message"]
            assert data["downloadId"] == "test123"

    def test_set_priority_endpoint_post_method_error(self):
        """Test set priority endpoint with POST method (set priority error)."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        mock_proc = Mock()
        mock_proc.nice.side_effect = Exception("Priority error")
        mock_registry = Mock()
        mock_registry.get.return_value = mock_proc

        with patch("server.api.download_bp.download_process_registry", mock_registry), app.test_client() as client:
            response = client.post(
                "/api/download/test123/priority", json={"priority": 10}, content_type="application/json"
            )

            assert response.status_code == 500
            data = response.json
            assert data["status"] == "error"
            assert "Failed to set priority" in data["message"]
            assert data["downloadId"] == "test123"

    def test_download_endpoint_performance(self):
        """Test that download endpoint responds in reasonable time."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        mock_response = {"status": "success", "message": "Download started"}
        with patch(
            "server.api.download_bp._process_download_request", return_value=(mock_response, None)
        ), app.test_client() as client:
            start_time = time.time()

            response = client.post(
                "/api/download",
                json={"url": "https://example.com", "downloadId": "test123"},
                content_type="application/json",
            )

            end_time = time.time()
            response_time = end_time - start_time

            # Download endpoint should respond quickly (< 1 second)
            assert response_time < 1.0
            assert response.status_code == 200

    def test_download_endpoint_content_type(self):
        """Test that download endpoint returns correct content type."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with patch("server.api.download_bp._process_download_request"), app.test_client() as client:
            response = client.post(
                "/api/download",
                json={"url": "https://example.com", "downloadId": "test123"},
                content_type="application/json",
            )

            assert response.content_type == "application/json"
            assert "application/json" in response.headers.get("Content-Type", "")

    def test_download_endpoint_with_query_parameters(self):
        """Test download endpoint with query parameters."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        mock_response = {"status": "success", "message": "Download started"}
        with patch(
            "server.api.download_bp._process_download_request", return_value=(mock_response, None)
        ), app.test_client() as client:
            response = client.post(
                "/api/download?param1=value1&param2=value2",
                json={"url": "https://example.com", "downloadId": "test123"},
                content_type="application/json",
            )

            assert response.status_code == 200
            data = response.json
            assert data["status"] == "success"

    def test_download_endpoint_unsupported_method(self):
        """Test download endpoint with unsupported method."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with app.test_client() as client:
            response = client.get("/api/download")

            # Should return 405 Method Not Allowed
            assert response.status_code == 405

    def test_gallery_dl_endpoint_unsupported_method(self):
        """Test gallery-dl endpoint with unsupported method."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with app.test_client() as client:
            response = client.get("/api/gallery-dl")

            # Should return 405 Method Not Allowed
            assert response.status_code == 405

    def test_resume_endpoint_unsupported_method(self):
        """Test resume endpoint with unsupported method."""
        app = Flask(__name__)
        app.register_blueprint(download_bp)

        with app.test_client() as client:
            response = client.get("/api/resume")

            # Should return 405 Method Not Allowed
            assert response.status_code == 405
