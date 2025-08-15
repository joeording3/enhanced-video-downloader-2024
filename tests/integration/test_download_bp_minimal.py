import pytest
from flask.testing import FlaskClient

from server.__main__ import create_app
from server.config import Config
from server.schemas import ServerConfig


@pytest.fixture
def client() -> FlaskClient:
    cfg = Config(ServerConfig())
    app = create_app(cfg)
    return app.test_client()


def test_download_missing_url(client: FlaskClient) -> None:
    resp = client.post("/api/download", json={})
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["error_type"] == "MISSING_URL"


def test_download_rate_limited(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    # Force low window and limit
    import server.api.download_bp as bp

    monkeypatch.setattr(bp, "_RATE_LIMIT_WINDOW", 60, raising=True)
    monkeypatch.setattr(bp, "_MAX_REQUESTS_PER_WINDOW", 1, raising=True)
    bp.clear_rate_limit_storage()

    # Make first request fast by stubbing downstream handler
    import server.api.download_bp as dlmod

    monkeypatch.setattr(
        dlmod,
        "handle_ytdlp_download",
        lambda _data: (bp.jsonify({"status": "success"}), 200),
        raising=True,
    )

    # Side-effect for rate limit: first call allowed, second limited
    calls = {"n": 0}

    def fake_check(ip: str) -> bool:
        calls["n"] += 1
        return calls["n"] >= 2

    monkeypatch.setattr(bp, "check_rate_limit", fake_check, raising=True)

    # First request passes, second should be 429
    ok = client.post("/api/download", json={"url": "http://example.com"})
    assert ok.status_code in (200, 500, 202, 400)  # downstream may vary; rate-limit check occurs before
    limited = client.post("/api/download", json={"url": "http://example.com"})
    assert limited.status_code == 429


def test_download_capacity_queued(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    # Simulate capacity full
    import server.downloads.ytdlp as ymod

    monkeypatch.setenv("MAX_REQUESTS_PER_WINDOW", "100")
    monkeypatch.setenv("RATE_LIMIT_WINDOW_SECONDS", "60")

    # Stub config to set max_concurrent=0 to force queue path
    class DummyCfg:
        def get_value(self, key: str, default: int) -> int:
            if key == "max_concurrent_downloads":
                return 0
            return default

    import server.config as cfgmod

    monkeypatch.setattr(cfgmod.Config, "load", staticmethod(lambda: DummyCfg()), raising=True)

    # Ensure registry shows as full by policy (>= max_concurrent)
    ymod.download_process_registry.clear()

    resp = client.post("/api/download", json={"url": "http://example.com"})
    assert resp.status_code == 200
    payload = resp.get_json()
    assert payload["status"] == "queued"
