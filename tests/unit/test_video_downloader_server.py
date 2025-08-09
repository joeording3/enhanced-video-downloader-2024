import importlib

import pytest

pytestmark = pytest.mark.unit


def test_video_downloader_server_removed() -> None:
    """Legacy entrypoint should be removed and not importable."""
    with pytest.raises(ImportError):
        importlib.import_module("server.video_downloader_server")
