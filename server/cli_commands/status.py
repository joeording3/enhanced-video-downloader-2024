"""Status CLI command for Enhanced Video Downloader server."""

import sys

import click

from server.cli_helpers import find_server_processes_cli


@click.command("status")
@click.pass_context
def status(_ctx: click.Context) -> None:
    """
    Show server status, including PID, port, and uptime.

    Parameters
    ----------
    ctx : click.Context
        Click context object.

    Returns
    -------
    None
        This function does not return a value (exits with status code 1 if no server).
    """
    procs = find_server_processes_cli()
    if not procs:
        click.echo("No running server found.")
        sys.exit(1)
    for p in procs:
        uptime = f"{p['uptime']}s" if p["uptime"] is not None else "unknown"
        click.echo(f"PID {p['pid']}, port {p['port']}, uptime {uptime}")
