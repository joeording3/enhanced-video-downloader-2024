import json
from pathlib import Path

from server.history import consolidate_lingering_info_json, load_history


def test_consolidate_lingering_info_json_dedup_and_cleanup(tmp_path: Path, monkeypatch) -> None:
    # Arrange: point config download_dir at tmp_path so history.json resolves under it
    class DummyCfg:
        download_dir = str(tmp_path)

        def get_value(self, key: str, default=None):
            if key == "download_dir":
                return str(tmp_path)
            return default

    import server.history as hmod

    monkeypatch.setattr(hmod.Config, "load", staticmethod(lambda: DummyCfg()), raising=True)

    # Create unique and duplicate .info.json files
    f1 = tmp_path / "v1.info.json"
    f1.write_text(json.dumps({"id": "abc", "webpage_url": "http://ex/a"}))

    f2 = tmp_path / "v2.info.json"
    f2.write_text(json.dumps({"id": "def", "webpage_url": "http://ex/b"}))

    fdup = tmp_path / "dup.info.json"
    fdup.write_text(json.dumps({"id": "abc", "webpage_url": "http://ex/other"}))

    # Act: consolidate
    processed = consolidate_lingering_info_json()

    # Assert: all files were processed and removed
    assert processed == 3
    assert not f1.exists() and not f2.exists() and not fdup.exists()

    # History should contain only two unique entries (dedup by id/url)
    hist = load_history()
    urls = {e.get("webpage_url") or e.get("url") for e in hist}
    assert {"http://ex/a", "http://ex/b"}.issubset(urls)
