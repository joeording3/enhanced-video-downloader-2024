"""System maintenance CLI commands for Enhanced Video Downloader server.

This module consolidates system-related commands that were previously under
`server/cli_commands`. Backward-compatibility shims have been removed.
"""

import logging
from pathlib import Path

import click

from server.cli_helpers import perform_system_maintenance
from server.config import Config

log = logging.getLogger(__name__)


@click.command("system_maintenance")
@click.option(
    "--resume-incomplete",
    "maintenance_resume_incomplete_flag",
    is_flag=True,
    help="Resume downloads that have .part files during maintenance.",
)
@click.option(
    "--resume-failed",
    "maintenance_resume_failed_flag",
    is_flag=True,
    help="Resume downloads marked as 'error' in history during maintenance.",
)
@click.option(
    "--clear-history",
    is_flag=True,
    help="Clear the download history (history.json).",
)
@click.option(
    "--clear-cache",
    is_flag=True,
    help="Clear temporary/cache files (e.g., .part, .ytdl).",
)
@click.pass_context
def system_maintenance(
    _ctx: click.Context,
    maintenance_resume_incomplete_flag: bool,
    maintenance_resume_failed_flag: bool,
    clear_history: bool,
    clear_cache: bool,
) -> None:
    """Perform system maintenance tasks such as resuming downloads and clearing history/cache."""
    log.info("Starting system maintenance...")
    cfg = Config.load()
    download_dir_str = cfg.get_value("download_dir")
    download_dir = Path(download_dir_str) if download_dir_str else None

    if not any(
        [
            maintenance_resume_incomplete_flag,
            maintenance_resume_failed_flag,
            clear_history,
            clear_cache,
        ]
    ):
        log.info(
            "No maintenance tasks specified. Use options like --resume-incomplete, --clear-history, etc."
        )
        return

    perform_system_maintenance(
        download_dir,
        maintenance_resume_incomplete_flag,
        maintenance_resume_failed_flag,
        clear_history,
        clear_cache,
        log,
    )

