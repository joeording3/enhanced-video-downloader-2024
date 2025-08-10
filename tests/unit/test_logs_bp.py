from pathlib import Path
from typing import Any

import pytest
from flask.testing import FlaskClient
from pytest import MonkeyPatch

import server.api.logs_bp as logs_module

pytestmark = pytest.mark.unit


@pytest.fixture(autouse=True)
def stub_log_open(monkeypatch: MonkeyPatch, tmp_path: Path) -> None:
    """Stub out log file operations and Path checks in logs_bp module."""
    # Create a fake server_output.log in tmp_path
    fake_log = tmp_path / "server_output.log"
    fake_log.write_text("l1\nl2\nl3\n")
    # Monkeypatch module __file__ so project_root resolves to tmp_path
    monkeypatch.setattr(logs_module, "__file__", str(tmp_path / "dummy.py"))

    # Stub Path.exists and Path.is_file for fake_log
    def fake_exists(self: Path) -> bool:
        return True

    monkeypatch.setattr(Path, "exists", fake_exists)

    def fake_is_file(self: Path) -> bool:
        return True

    monkeypatch.setattr(Path, "is_file", fake_is_file)
    # Stub Path.open to open fake_log when path ends with server_output.log
    orig_open = Path.open

    def fake_open(
        self: Path, mode: str = "r", buffering: Any = -1, encoding: Any = None, errors: Any = None, newline: Any = None
    ) -> Any:
        if str(self).endswith("server_output.log"):
            return orig_open(fake_log, mode, buffering=buffering, encoding=encoding, errors=errors, newline=newline)
        return orig_open(self, mode, buffering=buffering, encoding=encoding, errors=errors, newline=newline)

    monkeypatch.setattr(Path, "open", fake_open)


@pytest.mark.parametrize(
    "method,query,stub_missing,expected_status,expected_contains",
    [
        ("options", "", False, 204, None),
        ("get", "lines=1", True, 404, "Log file not found"),
    ],
)
def test_logs_endpoint_variants(
    client: FlaskClient,
    monkeypatch: MonkeyPatch,
    method: str,
    query: str,
    stub_missing: bool,
    expected_status: int,
    expected_contains: str | None,
) -> None:
    """Test various /logs endpoint variants using parameterization."""
    if stub_missing:

        def fake_exists(self: Path) -> bool:
            return False

        def fake_is_file(self: Path) -> bool:
            return False

        monkeypatch.setattr(Path, "exists", fake_exists)
        monkeypatch.setattr(Path, "is_file", fake_is_file)
    endpoint = "/api/logs" + (f"?{query}" if query else "")
    resp = getattr(client, method)(endpoint)
    assert resp.status_code == expected_status
    if expected_contains:
        assert expected_contains in resp.get_data(as_text=True)


@pytest.mark.parametrize(
    "query,expected_status,expected_contains",
    [
        ("lines=0", 400, "Invalid 'lines' parameter"),
        ("lines=2", 200, None),
    ],
)
def test_logs_line_queries(
    client: FlaskClient,
    query: str,
    expected_status: int,
    expected_contains: str | None,
) -> None:
    """GET /logs?lines=<n> returns expected status and content."""
    resp = client.get(f"/api/logs?{query}")
    assert resp.status_code == expected_status
    text = resp.get_data(as_text=True)
    if expected_contains:
        assert expected_contains in text
    else:
        try:
            n = int(query.split("=")[1])
        except ValueError:
            pytest.skip("Invalid query format for lines")
        lines = text.splitlines()
        assert len(lines) <= n


def test_logs_file_read_error(client: FlaskClient, monkeypatch: MonkeyPatch) -> None:
    """Test GET /logs when file reading fails with an exception."""

    def fake_open(
        self: Path, mode: str = "r", buffering: Any = -1, encoding: Any = None, errors: Any = None, newline: Any = None
    ) -> Any:
        if str(self).endswith("server_output.log"):
            raise OSError("Permission denied")
        return Path.open(self, mode, buffering=buffering, encoding=encoding, errors=errors, newline=newline)

    monkeypatch.setattr(Path, "open", fake_open)

    resp = client.get("/api/logs?lines=10")
    assert resp.status_code == 500
    assert "Error reading log file" in resp.get_data(as_text=True)
