from pathlib import Path

import pytest
from flask.testing import FlaskClient
from pytest import MonkeyPatch

import server.api.logs_bp as logs_module

pytestmark = pytest.mark.integration


@pytest.fixture
def logs_project_root(tmp_path: Path, monkeypatch: MonkeyPatch) -> Path:
    """
    Fixture to stub module __file__ and control project_root for logs.
    """
    fake_module_dir = tmp_path / "x" / "y" / "z"
    fake_module_dir.mkdir(parents=True)
    fake_module_file = fake_module_dir / "logs_bp.py"
    fake_module_file.write_text("")
    monkeypatch.setattr(logs_module, "__file__", str(fake_module_file))
    return Path(fake_module_file).parent.parent.parent


@pytest.mark.parametrize(
    "method, endpoint, setup_lines, params, expected_status, expected_content, description",
    [
        ("options", "/logs", None, None, 204, "", "OPTIONS returns 204"),
        ("get", "/logs", None, None, 404, "Log file not found", "GET missing file returns 404"),
        (
            "get",
            "/logs",
            ["Line1\n", "Line2\n", "Line3\n", "Line4\n"],
            None,
            200,
            "Line1\nLine2\nLine3\nLine4\n",
            "GET returns all lines by default",
        ),
        (
            "get",
            "/logs",
            ["Line1\n", "Line2\n", "Line3\n", "Line4\n"],
            {"lines": "2"},
            200,
            "Line1\nLine2\n",
            "GET returns limited lines",
        ),
        (
            "get",
            "/logs",
            ["A\n", "B\n", "C\n", "D\n"],
            {"lines": "2", "recent": "true"},
            200,
            "C\nD\n",
            "GET recent param returns last lines",
        ),
    ],
)
def test_logs_endpoint_various(
    client: FlaskClient,
    logs_project_root: Path,
    method: str,
    endpoint: str,
    setup_lines: list,
    params: dict,
    expected_status: int,
    expected_content: str,
    description: str,
) -> None:
    """
    Parameterized test for /logs endpoint covering OPTIONS, missing file, default, line count, and recent param.
    """
    project_root = logs_project_root
    if setup_lines is not None:
        log_file = project_root / "server_output.log"
        log_file.write_text("".join(setup_lines))
    if params:
        query = "?" + "&".join(f"{k}={v}" for k, v in params.items())
        url = endpoint + query
    else:
        url = endpoint
    resp = getattr(client, method)(url)
    assert resp.status_code == expected_status
    if expected_content:
        assert expected_content in resp.get_data(as_text=True)
    else:
        assert resp.get_data(as_text=True) == ""


@pytest.mark.parametrize("lines_param", ["0", "-1", "notint"])
def test_logs_invalid_lines_param(client: FlaskClient, logs_project_root: Path, lines_param: str) -> None:
    """
    Test that GET /logs with invalid lines param returns HTTP 400.
    """
    project_root = logs_project_root
    (project_root / "server_output.log").write_text("X\n")
    resp = client.get(f"/logs?lines={lines_param}")
    assert resp.status_code == 400
    text = resp.get_data(as_text=True)
    assert "Invalid 'lines' parameter" in text
