"""Unit tests for server-wide security headers, CORS, and request size limits."""

from __future__ import annotations

from typing import Any

import pytest

from server import create_app
from server.config import Config


@pytest.fixture()
def app():
    """Create a Flask app instance for testing with default config."""
    cfg = Config.load()
    app = create_app(cfg)
    yield app


def test_security_headers_present(app):
    """Responses should include common security headers added by after_request hook."""
    with app.test_client() as client:
        resp = client.get("/api/health")
        assert resp.status_code == 200

        # Security headers
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"
        assert resp.headers.get("X-Frame-Options") == "DENY"
        assert resp.headers.get("X-XSS-Protection") == "1; mode=block"
        assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert "Content-Security-Policy" in resp.headers


def test_cors_allows_localhost_request(app):
    """CORS should allow localhost origins per configuration."""
    with app.test_client() as client:
        resp = client.get("/api/health", headers={"Origin": "http://localhost:5001"})
        assert resp.status_code == 200
        # Header presence indicates CORS processing; value may be reflected origin
        assert resp.headers.get("Access-Control-Allow-Origin") in {
            "http://localhost:5001",
            "*",
        }


def test_request_size_limit_returns_json_error(app):
    """Exceeding MAX_CONTENT_LENGTH should return a 413 JSON response."""
    # Reduce limit to ensure test payload triggers 413
    app.config["MAX_CONTENT_LENGTH"] = 100

    large_url = "http://example.com/" + ("a" * 200)
    payload: dict[str, Any] = {"url": large_url}

    with app.test_client() as client:
        resp = client.post("/api/download", json=payload)
        assert resp.status_code == 413
        data = resp.get_json()
        assert data["status"] == "error"
        assert data["error_type"] == "REQUEST_ENTITY_TOO_LARGE"

