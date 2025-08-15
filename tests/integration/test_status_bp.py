from datetime import datetime, timedelta, timezone

from flask.testing import FlaskClient

from server.__main__ import create_app
from server.config import Config
from server.downloads import progress_data, progress_lock
from server.schemas import ServerConfig


def _mk_client() -> FlaskClient:
    cfg = Config(ServerConfig())
    app = create_app(cfg)
    return app.test_client()


def test_status_empty_defaults() -> None:
    client = _mk_client()
    with progress_lock:
        progress_data.clear()
    resp = client.get("/api/status")
    assert resp.status_code == 200
    assert resp.get_json() == {}


def test_status_includes_enhanced_fields_and_trend() -> None:
    client = _mk_client()
    now = datetime.now(timezone.utc)
    hist = [
        {"timestamp": (now - timedelta(seconds=10)).isoformat(), "percent": "10%"},
        {"timestamp": now.isoformat(), "percent": "20%"},
    ]
    with progress_lock:
        progress_data.clear()
        progress_data["d1"] = {
            "status": "downloading",
            "percent": "20%",
            "downloaded": "1.0MiB",
            "total": "5.0MiB",
            "speed": "1.0MiB",
            "eta": "10s",
            "speeds": ["1.0MiB", "1.2MiB", "0.8MiB"],
            "history": hist,
            "start_time": (now - timedelta(seconds=30)).isoformat(),
            "last_update": now.isoformat(),
        }
    resp = client.get("/api/status")
    data = resp.get_json()
    assert "d1" in data
    d1 = data["d1"]
    # Enhanced fields present
    assert "elapsed_time" in d1
    assert "average_speed_bytes" in d1
    assert "progress_trend" in d1 and d1["progress_trend"]["trend"] in {"improving", "slow_progress"}


def test_status_by_id_and_clear() -> None:
    client = _mk_client()
    with progress_lock:
        progress_data.clear()
        progress_data["k1"] = {"status": "finished", "last_update": datetime.now(timezone.utc).isoformat()}
    # Fetch by id
    r = client.get("/api/status/k1")
    assert r.status_code == 200
    # Clear by id
    r2 = client.delete("/api/status/k1")
    assert r2.status_code == 200
    # Now 404
    r3 = client.get("/api/status/k1")
    assert r3.status_code == 404


def test_status_bulk_clear_by_status_and_age() -> None:
    client = _mk_client()
    now = datetime.now(timezone.utc)
    with progress_lock:
        progress_data.clear()
        progress_data["a"] = {
            "status": "finished",
            "history": [{"timestamp": (now - timedelta(seconds=120)).isoformat()}],
        }
        progress_data["b"] = {
            "status": "downloading",
            "history": [{"timestamp": now.isoformat()}],
        }
    # Clear finished older than 60s
    r = client.delete("/api/status?status=finished&age=60")
    payload = r.get_json()
    assert payload["status"] == "success"
    assert "a" in payload["cleared_ids"] and "b" not in payload["cleared_ids"]
    # Cleanup any remaining entries to avoid test leakage
    with progress_lock:
        progress_data.clear()
