from __future__ import annotations

from typing import Any

import pytest
from flask import Flask

from server.api.queue_bp import queue_bp

pytestmark = pytest.mark.unit


def _create_app() -> Flask:
    app = Flask(__name__)
    app.register_blueprint(queue_bp)
    return app


def test_get_queue_default(monkeypatch: pytest.MonkeyPatch) -> None:
    app = _create_app()

    def fake_list() -> list[dict[str, Any]]:
        return [{"downloadId": "id1", "url": "https://example.com"}]

    monkeypatch.setattr("server.api.queue_bp.queue_manager.list", fake_list)

    with app.test_client() as client:
        resp = client.get("/api/queue")
        assert resp.status_code == 200
        data = resp.get_json()
        assert isinstance(data, dict)
        assert data["queue"][0]["downloadId"] == "id1"


def test_reorder_queue_success(monkeypatch: pytest.MonkeyPatch) -> None:
    app = _create_app()

    called: dict[str, Any] = {}

    def fake_reorder(order: list[str]) -> None:
        called["order"] = order

    monkeypatch.setattr("server.api.queue_bp.queue_manager.reorder", fake_reorder)

    with app.test_client() as client:
        resp = client.post("/api/queue/reorder", json={"order": ["a", "b"]})
        assert resp.status_code == 200
        assert called.get("order") == ["a", "b"]


def test_reorder_queue_invalid_payload() -> None:
    app = _create_app()
    with app.test_client() as client:
        resp = client.post("/api/queue/reorder", json={"order": "not-a-list"})
        assert resp.status_code == 400


def test_remove_from_queue_found(monkeypatch: pytest.MonkeyPatch) -> None:
    app = _create_app()

    def fake_remove(did: str) -> bool:
        return did == "ok"

    monkeypatch.setattr("server.api.queue_bp.queue_manager.remove", fake_remove)

    with app.test_client() as client:
        resp = client.post("/api/queue/ok/remove")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "success"
        assert data["downloadId"] == "ok"


def test_remove_from_queue_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    app = _create_app()

    def fake_remove(_did: str) -> bool:
        return False

    monkeypatch.setattr("server.api.queue_bp.queue_manager.remove", fake_remove)

    with app.test_client() as client:
        resp = client.post("/api/queue/missing/remove")
        assert resp.status_code == 404
        data = resp.get_json()
        assert data["status"] == "error"
        assert data["downloadId"] == "missing"


