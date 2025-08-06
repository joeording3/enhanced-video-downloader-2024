from typing import Any

import pytest

pytestmark = pytest.mark.integration


def test_health_get_and_options(client: Any) -> None:
    """GET and OPTIONS /health should return 204 No Content."""
    resp = client.get("/health")
    assert resp.status_code == 204
    assert resp.get_data(as_text=True) == ""
    resp2 = client.options("/health")
    assert resp2.status_code == 204
    assert resp2.get_data(as_text=True) == ""
    assert resp2.get_data(as_text=True) == ""
