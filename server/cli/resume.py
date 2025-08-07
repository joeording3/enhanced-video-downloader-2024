"""CLI commands for resuming downloads (incomplete and failed)."""

import logging
from collections.abc import Callable
from pathlib import Path

import click

from server.cli_helpers import cli_build_opts, resume_failed_downloads, resume_incomplete_downloads
from server.config import Config


@click.group(name="resume")
def resume_group() -> None:
    """Resume downloads for different categories: incomplete or failed."""


@resume_group.command(name="incomplete")
@click.option(
    "--scan-dir",
    "scan_dir_str",
    type=click.Path(exists=True, file_okay=False, dir_okay=True, readable=True),
    help="Specific directory to scan for incomplete downloads (overrides config's download_dir).",
    default=None,
)
@click.option(
    "--priority",
    type=int,
    help="OS process priority (nice value) for resumed downloads (-20 to 19).",
)
@click.option(
    "--max-concurrent",
    type=int,
    default=3,
    help="Maximum number of concurrent downloads (default: 3).",
)
@click.option(
    "--no-verify",
    is_flag=True,
    help="Skip file integrity verification before resuming.",
)
@click.option(
    "--progress",
    is_flag=True,
    help="Show detailed progress information during resume operations.",
)
@click.pass_context
def cli_resume_incomplete(
    _ctx: click.Context,
    scan_dir_str: str | None,
    priority: int | None,
    max_concurrent: int,
    no_verify: bool,
    progress: bool,
) -> None:
    """
    Resume incomplete downloads with enhanced detection and verification.

    Parameters
    ----------
    scan_dir_str : Optional[str]
        Specific directory to scan for incomplete downloads.
    priority : Optional[int]
        OS process priority (nice value) for resumed downloads.
    max_concurrent : int
        Maximum number of concurrent downloads.
    no_verify : bool
        Skip file integrity verification.
    progress : bool
        Show detailed progress information.
    """
    cfg = Config.load()
    download_dir = Path(cfg.get_value("download_dir"))
    logger = logging.getLogger("cli.resume.incomplete")

    click.echo(" Resuming incomplete downloads with enhanced detection...")

    # Progress callback for detailed reporting
    progress_callback: Callable[[int, int, str], None] | None = None
    if progress:

        def incomplete_progress_callback(current: int, total: int, status: str) -> None:
            if total > 0:
                percentage = (current / total) * 100
                click.echo(f" Progress: {current}/{total} ({percentage:.1f}%) - {status}")

        progress_callback = incomplete_progress_callback

    resume_incomplete_downloads(
        download_dir=download_dir,
        scan_dir_override=Path(scan_dir_str) if scan_dir_str else None,
        logger=logger,
        priority=priority,
        max_concurrent=max_concurrent,
        verify_integrity=not no_verify,
        progress_callback=progress_callback,
    )


@resume_group.command(name="failed")
@click.option(
    "--order",
    type=click.Choice(["newest", "oldest", "priority"]),
    default="oldest",
    help="Processing order for failed downloads (newest, oldest, or priority first).",
)
@click.option(
    "--priority",
    type=int,
    help="OS process priority (nice value) for resumed downloads (-20 to 19).",
)
@click.option(
    "--max-concurrent",
    type=int,
    default=3,
    help="Maximum number of concurrent downloads (default: 3).",
)
@click.option(
    "--progress",
    is_flag=True,
    help="Show detailed progress information during resume operations.",
)
@click.argument("download_ids", nargs=-1, required=False)
@click.pass_context
def resume_failed_cmd(
    _ctx: click.Context,
    download_ids: tuple[str, ...],
    order: str,
    priority: int | None,
    max_concurrent: int,
    progress: bool,
) -> None:
    """
    Resume failed downloads with enhanced prioritization and progress reporting.

    Parameters
    ----------
    download_ids : Tuple[str, ...]
        URLs or IDs of downloads to resume; if empty, retries all failed in history.
    order : str
        Processing order: newest, oldest, or priority (by file size).
    priority : Optional[int]
        OS process priority (nice value) for resumed downloads.
    max_concurrent : int
        Maximum number of concurrent downloads.
    progress : bool
        Show detailed progress information.
    """
    cfg = Config.load()
    download_dir = Path(cfg.get_value("download_dir"))
    logger = logging.getLogger("cli.resume.failed")

    click.echo(" Resuming failed downloads with enhanced prioritization...")

    # Progress callback for detailed reporting
    failed_progress_callback: Callable[[int, int, str], None] | None = None
    if progress:

        def failed_callback_impl(current: int, total: int, status: str) -> None:
            if total > 0:
                percentage = (current / total) * 100
                click.echo(f" Progress: {current}/{total} ({percentage:.1f}%) - {status}")

        failed_progress_callback = failed_callback_impl

    resume_failed_downloads(
        download_ids=list(download_ids),
        download_dir=download_dir,
        build_opts_func=cli_build_opts,
        logger=logger,
        order=order,
        priority=priority,
        max_concurrent=max_concurrent,
        progress_callback=failed_progress_callback,
    )
