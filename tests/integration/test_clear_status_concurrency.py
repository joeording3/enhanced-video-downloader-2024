from concurrent.futures import ThreadPoolExecutor
from typing import Any

import pytest
import requests

from server.downloads import progress_data, progress_lock

pytestmark = pytest.mark.integration


def test_concurrent_clear_by_id(live_server: str) -> None:
    """
    Test concurrent DELETE by download ID: one request succeeds, the other 404.

    :param live_server: base URL of the live Flask test server.
    :returns: None
    """
    url_base = f"{live_server}/api/status"
    downloadId = "race1"
    with progress_lock:
        progress_data.clear()
        progress_data[downloadId] = {"status": "downloading", "history": []}

    delete_url = f"{url_base}/{downloadId}"

    def send_delete(_: Any) -> requests.Response:
        """
        Send DELETE request to the delete URL.

        :param _: parameter ignored by ThreadPoolExecutor.
        :returns: HTTP response.
        """
        return requests.delete(delete_url)

    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(send_delete, range(2)))

    codes = sorted(r.status_code for r in responses)
    assert codes == [200, 404]


def test_concurrent_bulk_clear(live_server: str) -> None:
    """
    Test concurrent bulk DELETE by status: first clears all, second clears none.

    :param live_server: base URL of the live Flask test server.
    :returns: None
    """
    url = f"{live_server}/api/status?status=downloading"
    # Seed two entries
    with progress_lock:
        progress_data.clear()
        progress_data.update(
            {
                "bid1": {"status": "downloading", "history": []},
                "bid2": {"status": "downloading", "history": []},
            }
        )

    def send_delete(_: Any) -> requests.Response:
        """
        Send bulk DELETE request by status.

        :param _: parameter ignored by ThreadPoolExecutor.
        :returns: HTTP response.
        """
        return requests.delete(url)

    with ThreadPoolExecutor(max_workers=2) as executor:
        responses = list(executor.map(send_delete, range(2)))

    # One should clear both, the other nothing
    results = [r.json() for r in responses]
    counts = sorted(res["cleared_count"] for res in results)
    assert counts == [0, 2]
    # Ensure cleared_ids reflect counts
    for res in results:
        if res["cleared_count"] == 2:
            assert set(res["cleared_ids"]) == {"bid1", "bid2"}
        else:
            assert res["cleared_ids"] == []


def test_clear_status_invalid_age(client: Any) -> None:
    """
    Test DELETE status with invalid age parameter returns 400.

    :param client: FlaskClient for HTTP requests.
    :returns: None
    """
    resp = client.delete("/api/status?age=notanint")
    assert resp.status_code == 400
    data = resp.get_json()
    assert "Invalid age value" in data.get("message", "")
