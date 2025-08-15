from typing import Any

import pytest
from flask.testing import FlaskClient

from server.__main__ import create_app
from server.config import Config
from server.downloads import unified_download_manager
from server.schemas import ServerConfig


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> FlaskClient:
    # Set up a fresh unified download manager for isolation
    mgr = unified_download_manager

    # Replace global singleton with our instance
    import server.api.queue_bp as qbp

    monkeypatch.setattr(qbp, "unified_download_manager", mgr, raising=True)

    # Create app
    cfg = Config(ServerConfig())
    app = create_app(cfg)
    return app.test_client()


def test_get_queue_empty(client: FlaskClient) -> None:
    resp = client.get("/api/queue")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data == {"queue": []}


def test_reorder_and_remove_endpoints(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    # Access the injected manager
    import server.api.queue_bp as qbp

    mgr = qbp.unified_download_manager

    # Seed items (include legacy key to exercise normalization)
    mgr.add_download("A", "u1")
    mgr.add_download("B", "u2")
    mgr.add_download("C", "u3")

    # Reorder B, A (C should be appended)
    resp = client.post("/api/queue/reorder", json={"order": ["B", "A"]})
    assert resp.status_code == 200
    # Remove C
    resp2 = client.post("/api/queue/C/remove")
    assert resp2.status_code == 200

    # Verify order via GET
    resp3 = client.get("/api/queue")
    payload = resp3.get_json()
    ids = [it["downloadId"] for it in payload["queue"]]
    assert ids == ["B", "A"]


def test_force_start_endpoint(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    # Inject a fake handler into queue module used by manager
    import server.api.queue_bp as qbp
    import server.downloads as downloads_mod

    started: dict[str, Any] = {}

    def fake_run(task: dict) -> None:
        started["id"] = task.get("downloadId")

    monkeypatch.setattr(
        downloads_mod.unified_download_manager,
        "_run_download_task",
        staticmethod(fake_run),
        raising=True
    )

    mgr = qbp.unified_download_manager
    mgr.add_download("X1", "u")

    resp = client.post("/api/queue/X1/force-start")
    assert resp.status_code == 200
    assert started.get("id") == "X1"
