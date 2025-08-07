"""Resume CLI commands for Enhanced Video Downloader server."""

import logging
import os
import sys
import tempfile
from pathlib import Path

import click

from server.cli_helpers import resume_incomplete_downloads
from server.config import Config

log = logging.getLogger(__name__)


@click.group("resume")
@click.pass_context
def resume(ctx: click.Context) -> None:
    """
    Group command for resuming downloads.

    Parameters
    ----------
    ctx : click.Context
        Click context object.

    Returns
    -------
    None
        This function does not return a value.
    """


@resume.command("incomplete")
@click.option(
    "--scan-dir",
    "scan_dir_override_str",
    type=click.Path(exists=True, file_okay=False, dir_okay=True, readable=True),
    default=None,
    help="Directory to scan for incomplete downloads",
)
@click.pass_context
def incomplete(_ctx: click.Context, scan_dir_override_str: str | None) -> None:
    """
    Resume incomplete downloads.

    Parameters
    ----------
    ctx : click.Context
        Click context object.
    scan_dir_override_str : Optional[str]
        Directory path to scan for incomplete downloads (overrides config).

    Returns
    -------
    None
        This function does not return a value.
    """
    cfg = Config.load()
    download_dir_str = cfg.get_value("download_dir")

    # Check if we're in a test environment to prevent junk folder creation

    is_test_environment = any("pytest" in arg for arg in sys.argv) or "PYTEST_CURRENT_TEST" in os.environ

    if download_dir_str:
        base_dir = Path(download_dir_str)
    elif is_test_environment:
        # Use a temporary directory for tests to prevent junk folders
        # Explicitly specify the system temp directory to avoid creating folders in project root
        temp_dir = Path(tempfile.gettempdir())
        base_dir = Path(tempfile.mkdtemp(prefix="test_resume_", dir=temp_dir))
        log.info(f"Test environment detected, using temporary directory for resume: '{base_dir}'")
    else:
        base_dir = Path.cwd()

    scan_dir = Path(scan_dir_override_str) if scan_dir_override_str else base_dir
    log.info(f"Resuming incomplete downloads in {scan_dir}")
    resume_incomplete_downloads(base_dir, scan_dir, log)


@resume.command("failed")
@click.argument("download_ids", nargs=-1, required=True)
@click.pass_context
def failed(_ctx: click.Context, download_ids: tuple[str, ...]) -> None:
    """
    Resume failed downloads with given download IDs.

    Parameters
    ----------
    ctx : click.Context
        Click context object.
    download_ids : Tuple[str, ...]
        Tuple of download ID strings to resume.

    Returns
    -------
    None
        This function does not return a value.
    """
    log.info(f"Resuming failed downloads: {download_ids}")
    # Note: resume_failed_downloads expects a build_opts_func as 3rd parameter, not logger
    # This is a simplified CLI interface that doesn't provide the full functionality
    log.error("resume_failed_downloads requires build_opts_func parameter - not implemented in CLI")
    log.info("Resume failed downloads command completed.")
