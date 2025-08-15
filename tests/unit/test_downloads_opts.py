from pathlib import Path
from typing import Any

import pytest
from pytest import MonkeyPatch

from server.config import Config
from server.downloads.ytdlp import build_opts


class DummyConfig:
    """Dummy Config to stub Config.load for testing purposes."""

    @staticmethod
    def load() -> Any:
        """
        Return a dummy config object with custom yt_dlp_options for tests.

        :returns: Dummy config object.
        """

        class C:
            def get_value(self, key: str, default: Any) -> Any:
                if key == "yt_dlp_options":
                    # include a custom option and attempt to override outtmpl which should be ignored
                    return {"format": "worst", "outtmpl": "ignored", "custom_opt": True}
                return default

        return C()


@pytest.fixture(autouse=True)
def patch_config(monkeypatch: MonkeyPatch) -> None:
    """
    Monkeypatch Config.load to use DummyConfig for all tests.

    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    monkeypatch.setattr(Config, "load", DummyConfig.load)


def test_build_opts_defaults(tmp_path: Path) -> None:
    """
    Test build_opts returns default options when no overrides or hooks provided.

    :param tmp_path: temporary directory fixture.
    :returns: None
    """
    out_file = str(tmp_path / "video.mp4")
    opts = build_opts(out_file)
    assert opts["outtmpl"] == out_file
    # format override from config should be applied
    assert opts.get("format") == "worst"
    assert opts.get("merge_output_format") == "mp4"
    # custom option should be applied
    assert opts.get("custom_opt") is True
    # outtmpl from config should be ignored
    assert opts.get("outtmpl") == out_file
    # no progress hooks by default
    assert "progress_hooks" not in opts


def test_build_opts_playlist_and_hooks(tmp_path: Path) -> None:
    """
    Test build_opts includes hooks and playlist options when requested.

    :param tmp_path: temporary directory fixture.
    :returns: None
    """
    out_file = str(tmp_path / "video.mp4")
    opts = build_opts(out_file, downloadId="123", download_playlist=True)
    # progress_hooks should include our wrapper
    assert "progress_hooks" in opts and isinstance(opts["progress_hooks"], list)
    hook_fn = opts["progress_hooks"][0]
    # ytdlp_progress_hook should return None but update state
    result = hook_fn({"status": "downloading", "_percent_str": "50%"})
    assert result is None
    # playlist options
    assert opts.get("yesplaylist") is True
    assert "noplaylist" not in opts


def test_build_opts_single_video(tmp_path: Path) -> None:
    """
    Test build_opts enforces single video mode when download_playlist is False.

    :param tmp_path: temporary directory fixture.
    :returns: None
    """
    out_file = str(tmp_path / "video.mp4")
    opts = build_opts(out_file, downloadId=None, download_playlist=False)
    assert opts.get("noplaylist") is True
    assert "yesplaylist" not in opts
    assert "yesplaylist" not in opts
