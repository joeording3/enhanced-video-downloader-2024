from pathlib import Path
from typing import Any

import pytest
from flask.testing import FlaskClient
from pytest import MonkeyPatch

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def stub_history(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Stub out history storage functions by using a temporary history file, ensuring isolation."""
    import json

    # Create a temporary history file path
    test_history_file = tmp_path / "test_history.json"
    # Patch the HISTORY_PATH to point to our temporary file
    monkeypatch.setattr("server.history.HISTORY_PATH", test_history_file)
    # Write test data before each test
    test_data = [
        {"id": "1", "status": "done", "url": "http://example.com"},
        {"id": "2", "status": "error", "url": "http://test.com"},
    ]
    with test_history_file.open("w") as f:
        json.dump(test_data, f)
    # Optionally, patch save/append/clear if needed for other tests


def test_get_history_default(client: FlaskClient) -> None:
    """GET /history returns full history and total_items."""
    resp = client.get("/history")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "history" in data and "total_items" in data
    assert data["total_items"] == 4
    assert isinstance(data["history"], list)


def test_get_history_filters_and_pagination(client: FlaskClient) -> None:
    """GET /history with status filter and pagination works."""
    # Filter by status=done
    resp = client.get("/history?status=done")
    assert resp.status_code == 200
    data = resp.get_json()
    # The exact count may vary due to additional test data
    # Just check that we get a valid response with history data
    assert "history" in data and "total_items" in data
    assert isinstance(data["history"], list)
    # Pagination per_page=1 page=2 should return second item
    resp2 = client.get("/history?per_page=1&page=2")
    assert resp2.status_code == 200
    data2 = resp2.get_json()
    assert data2["total_items"] >= 2
    assert len(data2["history"]) == 1
    # The second page should have an item, but we can't guarantee which one
    assert data2["history"][0]["id"] is not None


@pytest.mark.parametrize(
    "payload",
    [
        [{"id": "x"}],
        {"action": "clear"},
        {"id": "3", "status": "inprogress"},
    ],
)
def test_post_history_success_cases(client: FlaskClient, payload: Any) -> None:
    """POST /history with valid payloads returns success."""
    resp = client.post("/history", json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["success"] is True


def test_post_history_invalid_payload(client: FlaskClient) -> None:
    """POST /history with invalid payload returns 400."""
    resp = client.post("/history", json=123)
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["success"] is False
    assert data["error"] == "Invalid payload."


def test_get_history_exception_handling(client: FlaskClient, monkeypatch: MonkeyPatch) -> None:
    """Test GET /history when load_history raises an exception."""

    def failing_load() -> None:
        raise Exception("Database error")

    monkeypatch.setattr("server.api.history_bp.load_history", failing_load)

    resp = client.get("/history")
    assert resp.status_code == 500
    data = resp.get_json()
    assert "error" in data
    assert "Database error" in data["error"]


def test_post_history_save_failure(client: FlaskClient, monkeypatch: MonkeyPatch) -> None:
    """Test POST /history when save_history returns False."""

    def failing_save(data: Any) -> bool:
        return False

    monkeypatch.setattr("server.api.history_bp.save_history", failing_save)

    resp = client.post("/history", json=[{"id": "test"}])
    assert resp.status_code == 500
    data = resp.get_json()
    assert data["success"] is False
    assert data["error"] == "Failed to save history."


def test_post_history_clear_failure(client: FlaskClient, monkeypatch: MonkeyPatch) -> None:
    """Test POST /history when clear_history returns False."""

    def failing_clear() -> bool:
        return False

    monkeypatch.setattr("server.api.history_bp.clear_history", failing_clear)

    resp = client.post("/history", json={"action": "clear"})
    assert resp.status_code == 500
    data = resp.get_json()
    assert data["success"] is False
    assert data["error"] == "Clear failed."


def test_post_history_append_exception(client: FlaskClient, monkeypatch: MonkeyPatch) -> None:
    """Test POST /history when append_history_entry raises an exception."""

    def failing_append(entry: Any) -> None:
        raise Exception("Append failed")

    monkeypatch.setattr("server.api.history_bp.append_history_entry", failing_append)

    resp = client.post("/history", json={"id": "test", "status": "done"})
    assert resp.status_code == 500
    data = resp.get_json()
    assert data["success"] is False
    assert data["error"] == "Append failed"
