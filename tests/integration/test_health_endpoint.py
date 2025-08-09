from typing import Any

import pytest

pytestmark = pytest.mark.integration


def test_health_get_and_options(client: Any) -> None:
    """GET and OPTIONS /api/health should return 200 OK with JSON data."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["app_name"] == "Enhanced Video Downloader"
    assert data["status"] == "healthy"

    resp2 = client.options("/api/health")
    assert resp2.status_code == 200
    data2 = resp2.get_json()
    assert data2["app_name"] == "Enhanced Video Downloader"
    assert data2["status"] == "healthy"

    # No root /health support anymore
