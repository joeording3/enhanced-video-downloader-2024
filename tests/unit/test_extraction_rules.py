import json
from pathlib import Path

import pytest
from pytest import MonkeyPatch

import server.extraction_rules as er

pytestmark = pytest.mark.unit


def test_load_missing(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """
    Should return empty list when rules file is missing.

    :param tmp_path: temporary directory fixture.
    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    fake = tmp_path / "extraction_rules.json"
    monkeypatch.setattr(er, "RULES_PATH", fake)
    # Ensure file doesn't exist
    assert not fake.exists()
    assert er.load_extraction_rules() == []


def test_load_invalid_json(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """
    Should return empty list on invalid JSON.

    :param tmp_path: temporary directory fixture.
    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    fake = tmp_path / "extraction_rules.json"
    fake.write_text("invalid json")
    monkeypatch.setattr(er, "RULES_PATH", fake)
    assert er.load_extraction_rules() == []


def test_load_valid_json(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """
    Should load and return valid JSON list.

    :param tmp_path: temporary directory fixture.
    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    fake = tmp_path / "extraction_rules.json"
    data = [{"rule": 1}, {"rule": 2}]
    fake.write_text(json.dumps(data))
    monkeypatch.setattr(er, "RULES_PATH", fake)
    assert er.load_extraction_rules() == data


def test_save_success(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """
    Should save rules list to file and return True.

    :param tmp_path: temporary directory fixture.
    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    fake = tmp_path / "extraction_rules.json"
    monkeypatch.setattr(er, "RULES_PATH", fake)
    rules = [{"a": 1}]
    res = er.save_extraction_rules(rules)
    assert res is True
    assert fake.exists()
    assert json.loads(fake.read_text()) == rules


def test_save_failure(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    """
    Should return False and not create files on JSON serialization error.

    :param tmp_path: temporary directory fixture.
    :param monkeypatch: pytest MonkeyPatch fixture for stubbing functions.
    :returns: None
    """
    fake = tmp_path / "extraction_rules.json"
    monkeypatch.setattr(er, "RULES_PATH", fake)
    # Use a non-serializable object to induce failure
    non_serializable = [object()]
    res = er.save_extraction_rules(non_serializable)  # type: ignore[arg-type]
    assert res is False
    tmp = fake.with_suffix(".json.tmp")
    # Temporary and target files should not exist
    assert not tmp.exists()
    assert not fake.exists()
