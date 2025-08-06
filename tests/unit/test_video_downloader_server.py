import pytest

pytestmark = pytest.mark.unit


def test_import_video_downloader_server() -> None:
    """
    Test that the video downloader server module imports without error.

    :returns: None
    """
    # Ensure the legacy server module imports without error
    import server.video_downloader_server as vds

    assert hasattr(vds, "__doc__")


def test_legacy_module_structure() -> None:
    """
    Test that the legacy module has the expected structure.

    :returns: None
    """
    import server.video_downloader_server as vds

    # The legacy module should be a compatibility shim
    assert hasattr(vds, "__doc__")
    # It should not have create_app as it's been refactored
    assert not hasattr(vds, "create_app")
