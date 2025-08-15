import pytest

from server import utils


def test_cache_result_caches_and_expires(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: dict[str, int] = {"count": 0}

    @utils.cache_result(ttl_seconds=10)
    def compute(x: int) -> int:
        calls["count"] += 1
        return x * 2

    # Freeze time at t=1000
    t = {"now": 1000.0}

    def fake_time() -> float:
        return t["now"]

    monkeypatch.setattr(utils.time, "time", fake_time)

    # First call: miss
    assert compute(3) == 6
    assert calls["count"] == 1

    # Second call same args within TTL: hit
    assert compute(3) == 6
    assert calls["count"] == 1

    # Advance beyond TTL
    t["now"] = 1011.0
    assert compute(3) == 6
    assert calls["count"] == 2


def test_clear_cache_and_stats(monkeypatch: pytest.MonkeyPatch) -> None:
    # Populate cache via decorator
    @utils.cache_result(ttl_seconds=300)
    def f(y: int) -> int:
        return y + 1

    # Ensure predictable time
    monkeypatch.setattr(utils.time, "time", lambda: 1234.0)
    assert f(1) == 2
    stats = utils.get_cache_stats()
    assert stats["cache_size"] >= 1
    assert isinstance(stats["cache_keys"], list)

    # Clear cache and verify stats reset
    utils.clear_cache()
    stats2 = utils.get_cache_stats()
    assert stats2["cache_size"] == 0
    assert stats2["cache_keys"] == []


def test_cleanup_expired_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    # Manually seed cache internals
    utils.clear_cache()
    utils._cache["k1"] = 1  # type: ignore[attr-defined]
    utils._cache_timestamps["k1"] = 1000.0  # type: ignore[attr-defined]
    utils._cache["k2"] = 2  # type: ignore[attr-defined]
    utils._cache_timestamps["k2"] = 2000.0  # type: ignore[attr-defined]

    # Set current time so only k1 expires with default TTL (300s)
    monkeypatch.setattr(utils.time, "time", lambda: 1401.0)
    removed = utils.cleanup_expired_cache()
    assert removed == 1
    assert "k1" not in utils._cache  # type: ignore[attr-defined]
    assert "k2" in utils._cache  # type: ignore[attr-defined]
