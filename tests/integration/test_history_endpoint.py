from typing import Any

import pytest

pytestmark = pytest.mark.integration


def test_get_history_no_filters(client: Any, monkeypatch: Any) -> None:
    """Test GET /api/history returns full history and total_items."""
    stub = [
        {"status": "done", "url": "http://a.com", "id": 1},
        {"status": "failed", "url": "http://b.com", "id": 2},
    ]
    monkeypatch.setattr("server.api.history_bp.load_history", lambda: stub.copy())
    resp = client.get("/api/history")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["history"] == stub
    assert data["total_items"] == 2


def test_get_history_filters_and_pagination(client: Any, monkeypatch: Any) -> None:
    """Test filtering by status/domain and pagination parameters."""
    stub = [
        {
            "status": "done" if i % 2 else "failed",
            "url": f"http://site{i}.com/path",
            "id": i,
        }
        for i in range(1, 6)
    ]
    monkeypatch.setattr("server.api.history_bp.load_history", lambda: stub.copy())
    # Filter status=done
    resp = client.get("/api/history?status=done")
    data = resp.get_json()
    assert all(e["status"] == "done" for e in data["history"])
    # Filter domain site3
    resp = client.get("/api/history?domain=site3.com")
    data = resp.get_json()
    assert len(data["history"]) == 1 and data["history"][0]["id"] == 3
    # Pagination per_page=2, page=2
    resp = client.get("/api/history?per_page=2&page=2")
    data = resp.get_json()
    # Second page items are ids 3 and 4 (0-based indexing after filter)
    assert [e["id"] for e in data["history"]] == [3, 4]


def test_post_sync_full_history(client: Any, monkeypatch: Any) -> None:
    """Test POST /api/history with full history list syncs data."""
    stub = [{"id": 1}]
    monkeypatch.setattr("server.api.history_bp.save_history", lambda data: True)
    resp = client.post("/api/history", json=stub)
    assert resp.status_code == 200
    assert resp.get_json()["success"] is True
    # Test failure
    monkeypatch.setattr("server.api.history_bp.save_history", lambda data: False)
    resp = client.post("/api/history", json=stub)
    assert resp.status_code == 500
    json_data = resp.get_json()
    assert json_data["success"] is False
    assert "Failed to save" in json_data["error"]


def test_post_clear_history(client: Any, monkeypatch: Any) -> None:
    """Test POST /api/history action clear clears history."""
    monkeypatch.setattr("server.api.history_bp.clear_history", lambda: True)
    resp = client.post("/api/history", json={"action": "clear"})
    assert resp.status_code == 200
    assert resp.get_json()["success"] is True
    # Clear failure
    monkeypatch.setattr("server.api.history_bp.clear_history", lambda: False)
    resp = client.post("/api/history", json={"action": "clear"})
    assert resp.status_code == 500
    assert resp.get_json()["success"] is False


def test_post_append_entry_and_invalid(client: Any, monkeypatch: Any) -> None:
    """Test POST /api/history appends entry or rejects invalid payload."""
    called = {}

    def fake_append(entry: Any) -> None:
        called["entry"] = entry

    monkeypatch.setattr("server.api.history_bp.append_history_entry", fake_append)
    # Append
    entry = {"id": 42}
    resp = client.post("/api/history", json=entry)
    assert resp.status_code == 200
    assert resp.get_json()["success"] is True
    assert called.get("entry") == entry
    # Invalid payload (e.g., integer)
    resp = client.post("/api/history", json=123)
    assert resp.status_code == 400
    json_data = resp.get_json()
    assert json_data["success"] is False
    assert "Invalid payload" in json_data["error"]
    assert "Invalid payload" in json_data["error"]
