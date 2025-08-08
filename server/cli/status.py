"""CLI commands for checking server and download status."""

import json
import os
import sys
from pathlib import Path
from typing import Any, TypedDict, cast

import click
import requests

from server.cli_helpers import (
    find_server_processes_cli,
    get_config_value,
    get_lock_pid_port_cli,
    is_server_running,
)


class _ProcessInfo(TypedDict, total=False):
    pid: int | None
    port: int | None
    uptime: int | float | None
    version: str | None


@click.command(name="server")
@click.option("--json", "as_json", is_flag=True, help="Output in JSON format.")
def server_command(as_json: bool) -> None:
    """Check server status."""
    processes_raw = find_server_processes_cli()
    processes: list[_ProcessInfo] = [
        cast(
            _ProcessInfo,
            {
                "pid": p.get("pid"),
                "port": p.get("port"),
                "uptime": p.get("uptime"),
                "version": p.get("version"),
            },
        )
        for p in processes_raw
    ]
    # No server running
    if not processes:
        if as_json:
            click.echo(json.dumps({"error": "No running server found"}, indent=2))
        else:
            click.echo("No running server found")
        sys.exit(1)

    if as_json:
        # Format processes for JSON output
        json_processes: list[dict[str, Any]] = []
        for proc in processes:
            pid = proc.get("pid")
            port = proc.get("port")
            uptime = proc.get("uptime")
            version = proc.get("version")

            # Format uptime for JSON
            uptime_formatted = None
            if isinstance(uptime, int | float):
                hours, remainder = divmod(uptime, 3600)
                minutes, seconds = divmod(remainder, 60)
                uptime_formatted = f"{int(hours)}h {int(minutes)}m {int(seconds)}s"

            json_processes.append({"pid": pid, "port": port, "uptime": uptime_formatted, "version": version})
        click.echo(json.dumps(json_processes, indent=2))
        return

    # Show server details in human-readable format
    for proc in processes:
        pid = proc.get("pid")
        port = proc.get("port")
        uptime = proc.get("uptime")
        version = proc.get("version")
        click.echo(f"PID {pid}")
        click.echo(f"Port {port}")
        # Format uptime
        if isinstance(uptime, int | float):
            hours, remainder = divmod(uptime, 3600)
            minutes, seconds = divmod(remainder, 60)
            click.echo(f"Uptime: {int(hours)}h {int(minutes)}m {int(seconds)}s")
        if version:
            click.echo(f"Version: {version}")


# Helper to fetch active downloads (used by downloads_command)
def get_active_downloads() -> list[dict[str, Any]]:
    """Fetch active downloads from the server via API."""
    if not is_server_running():
        click.echo("Server is not running. Please start the server first.")
        sys.exit(1)
    port = get_config_value("server_port")
    if not port:
        click.echo("Could not determine server port. Please start the server first.")
        sys.exit(1)

    try:
        response = requests.get(f"http://127.0.0.1:{port}/status", timeout=10)
        if response.status_code == 200:
            data: dict[str, Any] = response.json()
            active_downloads = data.get("active_downloads", [])
            # Ensure we return a list even if the response format is invalid
            if not isinstance(active_downloads, list):
                return []
            return cast(list[dict[str, Any]], active_downloads)
        click.echo(f"Error retrieving downloads: {response.status_code}")
        click.echo(response.text)
        sys.exit(1)
    except requests.exceptions.ConnectionError:
        click.echo(f"Could not connect to server at port {port}. Is the server running?")
        sys.exit(1)
    except Exception as e:
        click.echo(f"Error: {e}")
        sys.exit(1)


@click.command(name="downloads")
@click.option("--json", "as_json", is_flag=True, help="Output in JSON format.")
def downloads_command(as_json: bool) -> None:
    """Check status of active downloads."""
    active_downloads = get_active_downloads()
    if as_json:
        click.echo(json.dumps(active_downloads, indent=2))
        return
    if not active_downloads:
        click.echo("No active downloads")
        return
    for d in active_downloads:
        click.echo(f"ID: {d.get('id', 'unknown')}")
        click.echo(f"URL: {d.get('url', 'Unknown')}")
        click.echo(f"Status: {d.get('status', 'unknown')}")
        click.echo(f"Progress: {d.get('progress', 0)}%")
    return


# Group the status commands
@click.group(name="status", invoke_without_command=True)
@click.pass_context
def status_group(ctx: click.Context) -> None:
    """Status check commands (server, downloads)."""
    if ctx.invoked_subcommand is None:
        # Direct invocation of status_group (unit tests)
        if ctx.parent is None:
            click.echo(ctx.get_help())
            ctx.exit(0)
        # Integration CLI use: check server running or exit code 1
        lock_file_path_str = os.getenv("LOCK_FILE")
        lock_file_path = Path(lock_file_path_str) if lock_file_path_str else None
        lock_info = None
        if lock_file_path:
            lock_info = get_lock_pid_port_cli(lock_file_path)
        processes = find_server_processes_cli()
        if lock_info is None and not processes:
            # No server running: notify user and exit with error
            click.echo("No running server found.")
            ctx.exit(1)
        # Server processes found: output summary and exit
        for proc in processes:
            pid = proc.get("pid")
            port = proc.get("port")
            uptime = proc.get("uptime")
            click.echo(f"PID {pid}, port {port}, uptime {uptime}s")
        ctx.exit(0)


# Define a separate server command for the status_group that delegates to the module-level server alias
server_group = click.Command(
    name="server",
    params=server_command.params,
    callback=server_command.callback,
    help=server_command.help,
)
status_group.add_command(server_group)
status_group.add_command(downloads_command)


# Expose the main command for registration
status_command = status_group

# Aliases for tests: click.Command instances for direct invocation
server = server_command
downloads = downloads_command
