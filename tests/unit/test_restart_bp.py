from typing import Any

import pytest
from flask.testing import FlaskClient
from pytest import MonkeyPatch

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def stub_restart(monkeypatch: MonkeyPatch) -> None:
    """Ensure restart_module is imported and environ overrides can be applied."""
    # No global stubs needed; tests will override shutdown_func via environ_overrides


def _good_shutdown() -> None:
    pass


def _bad_shutdown() -> None:
    raise Exception("boom")


@pytest.mark.parametrize(
    "method,shutdown_func,expected_status,expected_key,expected_value,expected_contains",
    [
        ("options", None, 204, None, None, None),
        ("post", None, 500, "status", "error", None),
        ("post", _good_shutdown, 200, "success", True, None),
        ("post", _bad_shutdown, 500, "success", False, "Error during shutdown"),
    ],
)
def test_restart_endpoint_variants(
    client: FlaskClient,
    monkeypatch: MonkeyPatch,
    method: str,
    shutdown_func: Any,
    expected_status: int,
    expected_key: str | None,
    expected_value: Any,
    expected_contains: str | None,
) -> None:
    """Test /restart endpoint for options, shutdown scenarios, and exception handling."""
    if method == "options":
        resp = client.options("/restart")
    else:
        overrides: dict[str, Any] = {}
        if shutdown_func is not None:
            overrides["werkzeug.server.shutdown"] = shutdown_func
        resp = client.post("/restart", environ_overrides=overrides)
    assert resp.status_code == expected_status
    if expected_key:
        data = resp.get_json()
        assert data.get(expected_key) == expected_value
        if expected_contains:
            assert expected_contains in data.get("error", "")
