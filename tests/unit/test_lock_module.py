import os
from pathlib import Path

import pytest
from pytest import LogCaptureFixture

import server.lock as lockmod

pytestmark = pytest.mark.unit


def test_create_and_cleanup(tmp_path: Path) -> None:
    """
    Test creating a lock file, retrieving PID and port, and cleanup.

    :param tmp_path: temporary directory fixture.
    :returns: None
    """
    lockfile = tmp_path / "test.lock"
    # Create lock file with port 5678
    fh = lockmod.create_lock_file(lockfile, 5678)
    assert lockfile.exists()
    # Verify PID and port in lock file
    pid_port = lockmod.get_lock_pid_port(lockfile)
    assert isinstance(pid_port, tuple)
    pid, port = pid_port
    assert port == 5678
    assert pid == os.getpid()
    # Cleanup and ensure file removed
    lockmod.cleanup_lock_file(fh)
    assert not lockfile.exists()


def test_get_lock_pid_and_port(tmp_path: Path) -> None:
    """
    Test get_lock_pid and get_lock_pid_port parsing valid and invalid formats.

    :param tmp_path: temporary directory fixture.
    :returns: None
    """
    lockfile = tmp_path / "lock2"
    # Invalid content
    lockfile.write_text("notvalid")
    assert lockmod.get_lock_pid(lockfile) is None
    assert lockmod.get_lock_pid_port(lockfile) is None
    # Valid PID-only (legacy)
    lockfile.write_text("1234")
    assert lockmod.get_lock_pid(lockfile) == 1234  # legacy PID-only format
    assert lockmod.get_lock_pid_port(lockfile) is None
    # Valid PID:PORT
    lockfile.write_text("4321:8765")
    assert lockmod.get_lock_pid(lockfile) == 4321
    pp = lockmod.get_lock_pid_port(lockfile)
    assert pp == (4321, 8765)


def test_remove_lock_file(tmp_path: Path, caplog: LogCaptureFixture) -> None:
    """
    Test remove_lock_file handles existing and missing files gracefully.

    :param tmp_path: temporary directory fixture.
    :param caplog: pytest LogCaptureFixture for capturing log messages.
    :returns: None
    """
    lockfile = tmp_path / "lock3"
    # Write and remove
    lockfile.write_text("data")
    lockmod.remove_lock_file(lockfile)
    assert not lockfile.exists()
    # Removing again should not raise
    lockmod.remove_lock_file(lockfile)
    # No errors logged
    assert caplog.records == []
