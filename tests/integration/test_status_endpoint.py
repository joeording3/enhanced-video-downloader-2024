from datetime import datetime, timedelta, timezone

import pytest
from flask.testing import FlaskClient

from server.downloads import progress_data, progress_lock
from server.downloads.ytdlp import _map_error_message, _progress_downloading, download_errors_from_hooks

pytestmark = pytest.mark.integration


def test_status_empty_data(client: FlaskClient) -> None:
    """Test that GET /api/status returns empty JSON when no progress data exists.

    :param client: Flask test client fixture
    """
    # Ensure no errors either
    download_errors_from_hooks.clear()
    resp = client.get("/api/status")
    assert resp.status_code == 200
    assert resp.get_json() == {}


def test_status_with_data(client: FlaskClient) -> None:
    """Test that GET /api/status returns existing progress data.

    :param client: Flask test client fixture
    """
    sample = {"id1": {"status": "downloading", "percent": 50}}
    download_errors_from_hooks.clear()
    with progress_lock:
        progress_data.clear()
        progress_data.update(sample)
    resp = client.get("/api/status")
    assert resp.status_code == 200
    assert resp.get_json() == sample


def test_status_by_id_not_found(client: FlaskClient) -> None:
    """Test that GET /api/status/<download_id> returns 404 when no entry exists.

    :param client: Flask test client fixture
    """
    # Ensure no progress or errors
    from server.downloads import progress_data, progress_lock
    from server.downloads.ytdlp import download_errors_from_hooks

    with progress_lock:
        progress_data.clear()
    download_errors_from_hooks.clear()
    resp = client.get("/api/status/notexist")
    assert resp.status_code == 404
    data = resp.get_json()
    assert data["status"] == "error"
    assert data["message"] == "Download not found"


def test_status_by_id_success(client: FlaskClient) -> None:
    """Test that GET /api/status/<download_id> returns stored progress data.

    :param client: Flask test client fixture
    """
    sample = {"did1": {"status": "downloading", "percent": "30%"}}
    from server.downloads import progress_data, progress_lock

    with progress_lock:
        progress_data.clear()
        progress_data.update(sample)
    resp = client.get("/api/status/did1")
    assert resp.status_code == 200
    assert resp.get_json() == sample["did1"]


def test_status_by_id_error_only(client: FlaskClient) -> None:
    """Test that GET /api/status/<download_id> returns error info when only error exists.

    :param client: Flask test client fixture
    """
    from server.downloads import progress_data, progress_lock
    from server.downloads.ytdlp import download_errors_from_hooks

    # Clear existing
    with progress_lock:
        progress_data.clear()
    download_errors_from_hooks.clear()
    # Seed error only
    error_info: dict[str, str | dict[str, str]] = {
        "original_message": "fail",
        "parsed_type": "HOOK_ERROR",
        "source": "hook",
        "details": {},
    }
    download_errors_from_hooks["err1"] = error_info
    resp = client.get("/api/status/err1")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "error" in data
    assert data["error"] == error_info
    # Troubleshooting suggestion based on error message

    _, expected = _map_error_message(str(error_info["original_message"]))
    assert data.get("troubleshooting") == expected


def test_status_by_id_with_details(client: FlaskClient) -> None:
    """Test that GET /api/status/<download_id> returns detailed progress info.

    :param client: Flask test client fixture
    """
    from server.downloads import progress_data, progress_lock

    # Prepare hook data
    d = {
        "status": "downloading",
        "_percent_str": "25.0%",
        "_downloaded_bytes_str": "2MiB",
        "_total_bytes_estimate_str": "8MiB",
        "_speed_str": "256KiB/s",
        "_eta_str": "30s",
    }
    # Clear and apply hook
    with progress_lock:
        progress_data.clear()
    _progress_downloading(d, "det1")
    # Request status
    resp = client.get("/api/status/det1")
    assert resp.status_code == 200
    info = resp.get_json()
    assert info["status"] == "downloading"
    assert info["percent"] == "25.0%"
    assert info["downloaded"] == "2MiB"
    assert info["total"] == "8MiB"
    assert info["speed"] == "256KiB/s"
    assert info["eta"] == "30s"
    # Cleanup
    with progress_lock:
        progress_data.clear()


def test_historical_rate_tracking(client: FlaskClient) -> None:
    """Test that GET /api/status/<download_id> accumulates speeds history.

    :param client: Flask test client fixture
    """
    from server.downloads import progress_data, progress_lock

    d1 = {
        "status": "downloading",
        "_percent_str": "10%",
        "_downloaded_bytes_str": "1MiB",
        "_total_bytes_estimate_str": "10MiB",
        "_speed_str": "100KiB/s",
        "_eta_str": "90s",
    }
    d2 = {
        "status": "downloading",
        "_percent_str": "20%",
        "_downloaded_bytes_str": "2MiB",
        "_total_bytes_estimate_str": "10MiB",
        "_speed_str": "200KiB/s",
        "_eta_str": "40s",
    }
    with progress_lock:
        progress_data.clear()
    _progress_downloading(d1, "hist1")
    _progress_downloading(d2, "hist1")
    resp = client.get("/api/status/hist1")
    assert resp.status_code == 200
    info = resp.get_json()
    # Check speeds history list
    assert info.get("speeds") == ["100KiB/s", "200KiB/s"]
    # Ensure latest metrics are from second update
    assert info["percent"] == "20%"
    assert info["speed"] == "200KiB/s"
    assert info["eta"] == "40s"
    # Cleanup
    with progress_lock:
        progress_data.clear()

    # Test full progress history snapshots
    # Apply two updates
    _progress_downloading(d1, "histH1")
    _progress_downloading(d2, "histH1")
    resp = client.get("/api/status/histH1")
    assert resp.status_code == 200
    info = resp.get_json()
    history = info.get("history")
    # Verify history is a list of two snapshots
    assert isinstance(history, list) and len(history) == 2
    # Check first and second entries
    assert history[0]["percent"] == d1["_percent_str"]
    assert history[1]["percent"] == d2["_percent_str"]
    # Each snapshot should have a timestamp
    assert all("timestamp" in entry for entry in history)
    with progress_lock:
        progress_data.clear()


def test_status_all_includes_errors(client: FlaskClient) -> None:
    """Test that GET /api/status should include both progress and error entries.

    :param client: Flask test client fixture
    """
    from server.downloads import progress_data, progress_lock
    from server.downloads.ytdlp import download_errors_from_hooks

    # Prepare data
    sample_status = {"status": "downloading", "percent": "50%"}
    error_info = {"original_message": "fail", "parsed_type": "HOOK_ERROR", "source": "hook", "details": {}}
    with progress_lock:
        progress_data.clear()
        progress_data.update({"pid1": sample_status})
    download_errors_from_hooks.clear()
    download_errors_from_hooks["eid2"] = error_info
    # Request combined status
    resp = client.get("/api/status")
    assert resp.status_code == 200
    data = resp.get_json()
    # Check progress entry
    assert "pid1" in data and data["pid1"] == sample_status
    # Check error entry and troubleshooting
    assert "eid2" in data
    assert data["eid2"]["error"] == error_info

    _, expected2 = _map_error_message(str(error_info["original_message"]))
    assert data["eid2"].get("troubleshooting") == expected2
    # Cleanup
    with progress_lock:
        progress_data.clear()
    download_errors_from_hooks.clear()


@pytest.mark.parametrize(
    "query_params, expected_cleared_count, expected_cleared_ids, description",
    [
        ("?age=50", 1, ["old"], "Clear entries older than 50 seconds"),
        ("?status=downloading&age=50", 1, ["old_d"], "Clear downloading entries older than 50 seconds"),
    ],
)
def test_clear_status_operations(
    client: FlaskClient,
    query_params: str,
    expected_cleared_count: int,
    expected_cleared_ids: "list[str]",
    description: str,
) -> None:
    """Test DELETE /api/status with various query parameters.

    :param client: Flask test client fixture
    :param query_params: Query parameters for the DELETE request
    :param expected_cleared_count: Expected number of entries cleared
    :param expected_cleared_ids: Expected IDs of cleared entries
    :param description: Description of the test case
    """
    from server.downloads import progress_data, progress_lock

    now = datetime.now(timezone.utc)
    old_ts = (now - timedelta(seconds=100)).isoformat()
    recent_ts = now.isoformat()

    with progress_lock:
        progress_data.clear()
        if "status=downloading" in query_params:
            # Test with status filter
            progress_data["old_d"] = {"status": "downloading", "history": [{"timestamp": old_ts}]}
            progress_data["recent_d"] = {"status": "downloading", "history": [{"timestamp": recent_ts}]}
            progress_data["old_f"] = {"status": "failed", "history": [{"timestamp": old_ts}]}
        else:
            # Test with age filter only
            progress_data["old"] = {"status": "downloading", "history": [{"timestamp": old_ts}]}
            progress_data["recent"] = {"status": "downloading", "history": [{"timestamp": recent_ts}]}

    resp = client.delete(f"/api/status{query_params}")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert data["cleared_count"] == expected_cleared_count
    assert data["cleared_ids"] == expected_cleared_ids

    # Verify remaining entries
    resp2 = client.get("/api/status")
    assert resp2.status_code == 200
    remaining_data = resp2.get_json()
    if "status=downloading" in query_params:
        assert "recent_d" in remaining_data
        assert "old_f" in remaining_data  # Failed status should remain
    else:
        assert "recent" in remaining_data

    # Cleanup
    with progress_lock:
        progress_data.clear()


def test_clear_status_invalid_age(client: FlaskClient) -> None:
    """Test that DELETE /api/status?age=invalid returns 400 error.

    :param client: Flask test client fixture
    """
    resp = client.delete("/api/status?age=notanint")
    assert resp.status_code == 400
    data = resp.get_json()
    assert "Invalid age value" in data.get("message", "")
