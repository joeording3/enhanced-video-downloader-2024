# tests/unit/test_ytdlp_helpers.py: file uses private functions and fixtures without annotations
import logging
from typing import Any

from server.downloads.ytdlp import (
    _apply_custom_opts,
    _apply_playlist_flags,
    _assign_progress_hook,
    _default_ydl_opts,
    _handle_cookies,
)


def test_default_ydl_opts() -> None:
    """
    Test default YouTube-DL options configuration.

    :returns: None
    """
    opts = _default_ydl_opts("/tmp/video.mp4", download_playlist=False)
    assert opts["outtmpl"] == "/tmp/video.mp4"
    assert opts["noplaylist"] is True
    assert opts.get("yesplaylist") is False
    assert isinstance(opts["logger"], logging.Logger)


def test_apply_custom_opts_overrides_and_skips_protected() -> None:
    """
    Test that custom options override defaults and skip protected keys.

    :returns: None
    """
    opts = {"outtmpl": "foo", "custom": 1}
    custom = {"custom": 2, "outtmpl": "bar", "logger": "bad"}
    _apply_custom_opts(opts, custom, _downloadId=None)
    assert opts["custom"] == 2
    # Protected keys should not be overwritten
    assert opts["outtmpl"] == "foo"


def test_apply_playlist_flags() -> None:
    """
    Test that playlist flags are applied correctly.

    :returns: None
    """
    # Playlist download
    opts = {"noplaylist": False, "yesplaylist": True}
    _apply_playlist_flags(opts, download_playlist=True)
    assert opts.get("yesplaylist") is True
    assert "noplaylist" not in opts
    # Single video
    opts = {"noplaylist": False, "yesplaylist": True}
    _apply_playlist_flags(opts, download_playlist=False)
    assert opts.get("noplaylist") is True
    assert "yesplaylist" not in opts


def test_assign_progress_hook_and_invoke() -> None:
    """
    Test assignment of progress hook and invocation behavior.

    :returns: None
    """
    opts: dict[str, Any] = {}
    _assign_progress_hook(opts, downloadId="abc")
    assert "progress_hooks" in opts
    hooks = opts["progress_hooks"]
    assert isinstance(hooks, list) and len(hooks) == 1
    # Simulate hook invocation; ensure no exception
    hook = hooks[0]
    result = hook({"status": "downloading"})
    assert result is None


def test_handle_cookies_no_key() -> None:
    """
    Test that no cookiefile is added when downloadId is None.

    :returns: None
    """
    opts: dict[str, Any] = {}
    # Should not raise or add cookiefile
    _handle_cookies(opts, downloadId=None)
    assert "cookiefile" not in opts
