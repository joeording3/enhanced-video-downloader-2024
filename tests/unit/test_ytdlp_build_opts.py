from typing import Any

from pytest import MonkeyPatch

from server.config import Config
from server.downloads.ytdlp import build_opts


class DummyConfig:
    """Stub config object returning predefined yt_dlp_options for testing."""

    def __init__(self, options: dict[str, Any]) -> None:
        """
        Initialize dummy config with provided options.

        :param options: dictionary of yt-dlp options to return.
        :returns: None
        """
        self._options = options

    def get_value(self, key: str, default: Any = None) -> Any:
        """
        Return stored options when key is 'yt_dlp_options', else default.

        :param key: configuration key to retrieve.
        :param default: default value if key is not present.
        :returns: configuration value or default.
        """
        if key == "yt_dlp_options":
            return self._options
        return default


def test_build_opts_default(monkeypatch: MonkeyPatch) -> None:
    """
    Test build_opts with default configuration and no download_id or playlist.

    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    monkeypatch.setattr(Config, "load", lambda *args, **kwargs: DummyConfig({}))
    opts = build_opts("out.mp4")
    assert opts["outtmpl"] == "out.mp4"
    assert opts["format"] == "bestvideo+bestaudio/best"
    assert "progress_hooks" not in opts
    assert opts.get("noplaylist") is True
    assert "yesplaylist" not in opts


def test_build_opts_with_download_id(monkeypatch: MonkeyPatch) -> None:
    """
    Test build_opts includes progress_hooks when download_id is provided.

    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    monkeypatch.setattr(Config, "load", lambda *args, **kwargs: DummyConfig({}))
    opts = build_opts("out.mp4", download_id="123")
    assert "progress_hooks" in opts
    hooks = opts["progress_hooks"]
    assert isinstance(hooks, list) and len(hooks) == 1
    hook = hooks[0]
    assert callable(hook)


def test_build_opts_with_playlist(monkeypatch: MonkeyPatch) -> None:
    """
    Test build_opts toggles playlist flags correctly.

    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    monkeypatch.setattr(Config, "load", lambda *args, **kwargs: DummyConfig({}))
    opts = build_opts("out.mp4", download_playlist=True)
    assert opts["outtmpl"] == "out.mp4"
    assert opts.get("yesplaylist") is True
    assert "noplaylist" not in opts


def test_build_opts_custom_options(monkeypatch: MonkeyPatch) -> None:
    """
    Test build_opts merges custom yt-dlp options from configuration.

    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    custom = {"format": "mp3", "custom_key": "value"}
    monkeypatch.setattr(Config, "load", lambda *args, **kwargs: DummyConfig(custom))
    opts = build_opts("file", download_playlist=False)
    assert opts["format"] == "mp3"
    assert opts["custom_key"] == "value"
    assert opts["format"] == "mp3"
    assert opts["custom_key"] == "value"
