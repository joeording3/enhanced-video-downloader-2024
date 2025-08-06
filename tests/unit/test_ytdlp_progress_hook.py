import logging
from typing import Any

from server.downloads.ytdlp import download_errors_from_hooks, ytdlp_progress_hook


def setup_function() -> None:
    """
    Clear the download_errors_from_hooks before each test.

    :returns: None
    """
    download_errors_from_hooks.clear()


def test_error_hook_default_type() -> None:
    """
    Test that a generic error produces HOOK_ERROR type.

    :returns: None
    """
    d = {"status": "error", "message": "generic error"}
    ytdlp_progress_hook(d, "id1")
    assert "id1" in download_errors_from_hooks
    err = download_errors_from_hooks["id1"]
    assert err["parsed_type"] == "HOOK_ERROR"
    assert err["original_message"] == "generic error"
    assert err["source"] == "hook"
    assert err["details"] == d


def test_error_hook_unsupported_url() -> None:
    """
    Test that 'Unsupported URL' message yields HOOK_UNSUPPORTED_URL type.

    :returns: None
    """
    d = {"status": "error", "message": "Error: Unsupported URL for video"}
    ytdlp_progress_hook(d, "id2")
    err = download_errors_from_hooks["id2"]
    assert err["parsed_type"] == "HOOK_UNSUPPORTED_URL"
    assert "Unsupported URL" in err["original_message"]


def test_error_hook_video_unavailable() -> None:
    """
    Test that 'video unavailable' message yields HOOK_VIDEO_UNAVAILABLE type.

    :returns: None
    """
    d = {"status": "error", "message": "Video unavailable due to region lock"}
    ytdlp_progress_hook(d, "id3")
    err = download_errors_from_hooks["id3"]
    assert err["parsed_type"] == "HOOK_VIDEO_UNAVAILABLE"
    assert "video unavailable" in err["original_message"].lower()


def test_finished_hook_does_not_add_error(caplog: Any) -> None:
    """
    Test that finished status does not modify download_errors_from_hooks.

    :param caplog: log capture fixture.
    :returns: None
    """
    caplog.set_level(logging.INFO)
    d = {"status": "finished", "filename": "video.mp4"}
    ytdlp_progress_hook(d, "id4")
    assert download_errors_from_hooks == {}
    assert "reported as FINISHED" in caplog.text


def test_downloading_hook_logs_progress(caplog: Any) -> None:
    """
    Test that downloading status logs debug progress and does not add error.

    :param caplog: log capture fixture.
    :returns: None
    """
    caplog.set_level(logging.DEBUG)
    d = {
        "status": "downloading",
        "_percent_str": "50%",
        "_downloaded_bytes_str": "500",
        "_total_bytes_estimate_str": "1000",
        "_speed_str": "10KiB/s",
        "_eta_str": "5s",
    }
    ytdlp_progress_hook(d, "id5")
    assert download_errors_from_hooks == {}
    assert "Download id5 progress:" in caplog.text
