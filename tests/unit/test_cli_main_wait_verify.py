import pytest

import server.cli_main as cli


def test_wait_for_port_release_true(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(cli, "is_port_in_use", lambda p, h: False, raising=True)
    assert cli._wait_for_port_release("127.0.0.1", 1234, timeout=1) is True


def test_wait_for_port_release_flips(monkeypatch: pytest.MonkeyPatch) -> None:
    calls = {"n": 0}

    def toggling(_p, _h):
        calls["n"] += 1
        return calls["n"] < 2

    monkeypatch.setattr(cli, "is_port_in_use", toggling, raising=True)
    assert cli._wait_for_port_release("127.0.0.1", 1234, timeout=2) is True


def test_verify_restart_success_with_config(monkeypatch: pytest.MonkeyPatch) -> None:
    class DummyCfg:
        def get_value(self, key: str, default=None):
            if key == "server_host":
                return "127.0.0.1"
            if key == "server_port":
                return 5050
            return None

    monkeypatch.setattr(cli.Config, "load", staticmethod(lambda: DummyCfg()), raising=True)
    monkeypatch.setattr(cli, "wait_for_server_start_cli", lambda port, host, timeout=5: True, raising=True)

    assert cli._verify_restart_success(None, None, timeout=1) is True
