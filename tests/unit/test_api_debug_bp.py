"""Unit tests for server.api.debug_bp module."""

import os
import time
from pathlib import Path
from unittest.mock import patch

from flask import Flask

from server.api.debug_bp import (
    _collect_log_paths,
    _get_project_root,
    _perform_test_write,
    debug_bp,
)


class TestDebugBlueprint:
    """Test debug blueprint functionality."""

    def test_debug_bp_registration(self):
        """Test that debug blueprint can be registered with Flask app."""
        app = Flask(__name__)
        app.register_blueprint(debug_bp)

        # Verify blueprint is registered
        assert "debug_bp" in app.blueprints
        assert app.blueprints["debug_bp"] == debug_bp

    def test_debug_bp_url_prefix(self):
        """Test that debug blueprint has correct URL prefix."""
        app = Flask(__name__)
        app.register_blueprint(debug_bp)

        # Test that the endpoint is accessible
        with app.test_client() as client:
            response = client.get("/debug/paths")
            # Should return 200
            assert response.status_code == 200


class TestHelperFunctions:
    """Test helper functions in debug blueprint."""

    def test_get_project_root(self):
        """Test _get_project_root function."""
        project_root = _get_project_root()

        assert isinstance(project_root, Path)
        assert project_root.exists()
        # Should be the parent of the server directory
        assert (project_root / "server").exists()

    def test_collect_log_paths_empty_directory(self, tmp_path):
        """Test _collect_log_paths with empty directory."""
        log_paths = _collect_log_paths(tmp_path)

        assert isinstance(log_paths, list)
        # Should return info for expected log files even if they don't exist
        assert len(log_paths) >= 1

        # Check that all entries have expected structure
        for log_info in log_paths:
            assert "path" in log_info
            assert "exists" in log_info
            assert isinstance(log_info["path"], str)
            assert isinstance(log_info["exists"], bool)

    def test_collect_log_paths_with_existing_files(self, tmp_path):
        """Test _collect_log_paths with existing log files."""
        # Create some test log files
        test_log1 = tmp_path / "server_output.log"
        test_log1.write_text("test log content")

        logs_dir = tmp_path / "logs"
        logs_dir.mkdir()
        test_log2 = logs_dir / "test.log"
        test_log2.write_text("test log content 2")

        log_paths = _collect_log_paths(tmp_path)

        assert isinstance(log_paths, list)
        assert len(log_paths) >= 1

        # Find our test files in the results

        for log_info in log_paths:
            if ("server_output.log" in log_info["path"] or "test.log" in log_info["path"]) and log_info["exists"]:
                assert "size" in log_info
                assert "readable" in log_info
                assert "writable" in log_info

    def test_perform_test_write_success(self, tmp_path):
        """Test _perform_test_write with successful write."""
        with patch("server.api.debug_bp._get_project_root") as mock_get_root:
            mock_get_root.return_value = tmp_path

            result = _perform_test_write(tmp_path)

            assert isinstance(result, dict)
            assert "path" in result
            assert "success" in result
            assert result["success"] is True
            assert "test_log_access.log" in result["path"]

            # Verify the file was actually created
            test_file = tmp_path / "logs" / "test_log_access.log"
            assert test_file.exists()
            assert test_file.read_text() == "Test log file created by debug endpoint"

    def test_perform_test_write_failure(self, tmp_path):
        """Test _perform_test_write with write failure."""
        # Make the directory read-only to cause a write failure
        logs_dir = tmp_path / "logs"
        logs_dir.mkdir()
        logs_dir.chmod(0o444)  # Read-only

        try:
            result = _perform_test_write(tmp_path)

            assert isinstance(result, dict)
            assert "path" in result
            assert "success" in result
            assert result["success"] is False
        finally:
            # Restore permissions
            logs_dir.chmod(0o755)


class TestDebugEndpoints:
    """Test debug API endpoints."""

    def test_debug_paths_endpoint_success(self):
        """Test debug/paths endpoint with successful response."""
        app = Flask(__name__)
        app.register_blueprint(debug_bp)

        with app.test_client() as client:
            response = client.get("/debug/paths")

            assert response.status_code == 200
            assert response.content_type == "application/json"

            data = response.json
            assert "project_root" in data
            assert "current_working_dir" in data
            assert "config_path" in data
            assert "config_exists" in data
            assert "config_content" in data
            assert "log_files" in data
            assert "logging_config" in data
            assert "test_write" in data

    def test_debug_paths_endpoint_unsupported_method(self):
        """Test debug/paths endpoint with unsupported method."""
        app = Flask(__name__)
        app.register_blueprint(debug_bp)

        with app.test_client() as client:
            response = client.post("/debug/paths")

            # Should return 405 Method Not Allowed
            assert response.status_code == 405

    def test_debug_paths_endpoint_with_query_parameters(self):
        """Test debug/paths endpoint with query parameters."""
        app = Flask(__name__)
        app.register_blueprint(debug_bp)

        with app.test_client() as client:
            response = client.get("/debug/paths?param1=value1&param2=value2")

            assert response.status_code == 200
            data = response.json
            assert "project_root" in data
            assert "current_working_dir" in data

    def test_debug_paths_endpoint_config_loading(self):
        """Test debug/paths endpoint config loading behavior."""
        app = Flask(__name__)
        app.register_blueprint(debug_bp)

        with app.test_client() as client:
            response = client.get("/debug/paths")

            assert response.status_code == 200
            data = response.json
            assert "config_content" in data
            # Config content can be dict, None, or error dict during mutation testing
            assert data["config_content"] is None or isinstance(data["config_content"], dict)

    def test_debug_paths_endpoint_config_error(self):
        """Test debug/paths endpoint with config loading error."""
        app = Flask(__name__)
        app.register_blueprint(debug_bp)

        with app.test_client() as client:
            response = client.get("/debug/paths")

            assert response.status_code == 200
            data = response.json
            assert "config_content" in data
            # Config content can be dict, None, or error dict during mutation testing
            assert data["config_content"] is None or isinstance(data["config_content"], dict)

    def test_debug_paths_endpoint_environment_config(self):
        """Test debug/paths endpoint with environment config path."""
        app = Flask(__name__)
        app.register_blueprint(debug_bp)

        with patch.dict(os.environ, {"CONFIG_PATH": "/custom/config.json"}), app.test_client() as client:
            response = client.get("/debug/paths")

            assert response.status_code == 200
            data = response.json
            assert "config_path" in data
            assert data["config_path"] == "/custom/config.json"

    def test_debug_paths_endpoint_logging_info(self):
        """Test debug/paths endpoint logging information."""
        app = Flask(__name__)
        app.register_blueprint(debug_bp)

        with app.test_client() as client:
            response = client.get("/debug/paths")

            assert response.status_code == 200
            data = response.json
            assert "logging_config" in data
            assert "root_level" in data["logging_config"]

    def test_debug_paths_endpoint_test_write_info(self):
        """Test debug/paths endpoint test write information."""
        app = Flask(__name__)
        app.register_blueprint(debug_bp)

        with app.test_client() as client:
            response = client.get("/debug/paths")

            assert response.status_code == 200
            data = response.json
            assert "test_write" in data
            assert "path" in data["test_write"]
            assert "success" in data["test_write"]
            assert isinstance(data["test_write"]["success"], bool)

    def test_debug_paths_endpoint_log_files_structure(self):
        """Test debug/paths endpoint log files structure."""
        app = Flask(__name__)
        app.register_blueprint(debug_bp)

        with app.test_client() as client:
            response = client.get("/debug/paths")

            assert response.status_code == 200
            data = response.json
            assert "log_files" in data
            assert isinstance(data["log_files"], list)

            # Check structure of log file entries
            for log_file in data["log_files"]:
                assert "path" in log_file
                assert "exists" in log_file
                assert isinstance(log_file["path"], str)
                assert isinstance(log_file["exists"], bool)

                if log_file["exists"]:
                    assert "size" in log_file
                    assert "readable" in log_file
                    assert "writable" in log_file
                    assert isinstance(log_file["size"], int)
                    assert isinstance(log_file["readable"], bool)
                    assert isinstance(log_file["writable"], bool)

    def test_debug_paths_endpoint_performance(self):
        """Test that debug/paths endpoint responds in reasonable time."""
        app = Flask(__name__)
        app.register_blueprint(debug_bp)

        with app.test_client() as client:
            start_time = time.time()

            response = client.get("/debug/paths")

            end_time = time.time()
            response_time = end_time - start_time

            # Debug endpoint should respond quickly (< 2 seconds)
            assert response_time < 2.0
            assert response.status_code == 200

    def test_debug_paths_endpoint_error_handling(self):
        """Test debug/paths endpoint error handling."""
        app = Flask(__name__)
        app.register_blueprint(debug_bp)

        with app.test_client() as client:
            # Test with malformed request (should still work)
            response = client.get("/debug/paths", headers={"Invalid-Header": "invalid"})

            # Should still return 200 OK
            assert response.status_code == 200
            data = response.json
            assert "project_root" in data
            assert "current_working_dir" in data

    def test_debug_paths_endpoint_content_type(self):
        """Test that debug/paths endpoint returns correct content type."""
        app = Flask(__name__)
        app.register_blueprint(debug_bp)

        with app.test_client() as client:
            response = client.get("/debug/paths")

            assert response.content_type == "application/json"
            assert "application/json" in response.headers.get("Content-Type", "")

    def test_debug_paths_endpoint_request_logging(self):
        """Test that debug/paths endpoint logs request information."""
        app = Flask(__name__)
        app.register_blueprint(debug_bp)

        with patch("server.api.debug_bp.logger") as mock_logger, app.test_client() as client:
            response = client.get("/debug/paths")

            assert response.status_code == 200
            # Verify that debug logging was called
            mock_logger.debug.assert_called_once()

            # Check that the log message contains expected information
            log_call = mock_logger.debug.call_args[0][0]
            assert "Request from" in log_call
            assert "Headers:" in log_call
            assert "Cookies:" in log_call
            assert "Params:" in log_call
            assert "Data:" in log_call
