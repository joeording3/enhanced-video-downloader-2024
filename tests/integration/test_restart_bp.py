from typing import Any

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


def test_restart_options(client: FlaskClient) -> None:
    resp = client.options("/api/restart")
    assert resp.status_code == 204
    assert resp.get_data(as_text=True) == ""


def test_restart_not_supported_without_werkzeug(client: FlaskClient) -> None:
    # Simulate absence of werkzeug shutdown in environ
    resp = client.post("/api/restart")
    assert resp.status_code == 500
    data = resp.get_json()
    assert data["status"] == "error"


def test_managed_restart_no_candidates(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    # Ensure env vars are cleared so no commands are built
    for key in [
        "EVD_RESTART_COMMAND",
        "EVD_SYSTEMD_SERVICE",
        "EVD_SUPERVISOR_PROGRAM",
        "EVD_LAUNCHCTL_LABEL",
    ]:
        monkeypatch.delenv(key, raising=False)

    # Force shutil.which to return None so CLI path isn't discovered
    import server.api.restart_bp as bp

    monkeypatch.setattr(bp.shutil, "which", lambda _: None, raising=True)
    # Force no candidates by stubbing builder to return empty list
    monkeypatch.setattr(bp, "_build_managed_restart_commands", list, raising=True)

    resp = client.post("/api/restart/managed")
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["status"] == "error"


def test_managed_restart_starts_subprocess(client: FlaskClient, monkeypatch: pytest.MonkeyPatch) -> None:
    # Provide explicit restart command
    monkeypatch.setenv("EVD_RESTART_COMMAND", "echo restarting")

    import server.api.restart_bp as bp

    started: dict[str, Any] = {}

    class DummyPopen:
        def __init__(self, cmd: list[str], **kwargs: Any) -> None:
            started["cmd"] = cmd
            self.pid = 12345

    monkeypatch.setattr(bp.subprocess, "Popen", DummyPopen, raising=True)

    resp = client.post("/api/restart/managed")
    assert resp.status_code == 202
    assert started["cmd"][0] == "/bin/sh"
