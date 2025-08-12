"""CLI commands for managing download history."""

import json
import sys
import types
from datetime import datetime
from typing import Any

import click
import requests

from server.cli_helpers import get_config_value, is_server_running


@click.command(name="list")
@click.option(
    "--status",
    type=click.Choice(["completed", "failed", "queued", "all"]),
    default="all",
    help="Filter history by download status.",
)
@click.option("--domain", help="Filter history by domain substring (e.g., 'youtube').")
@click.option(
    "--limit",
    type=int,
    default=10,
    help="Maximum number of history entries to display.",
)
@click.option("--json", "as_json", is_flag=True, help="Output in JSON format.")
def list_command(status: str, domain: str, limit: int, as_json: bool) -> None:
    """List download history entries."""
    _ensure_server_running()
    port = _get_server_port_or_exit()
    entries, total = _fetch_history_entries(status, domain, port, limit)
    if as_json:
        click.echo(json.dumps(entries, indent=2))
        return
    if not entries:
        click.echo("No history entries found.")
        return
    click.echo(f"Download History (showing {len(entries)} of {total}):")
    click.echo("-" * 80)
    for entry in entries:
        for line in _format_history_entry(entry):
            click.echo(line)
        click.echo("-" * 80)


@click.command(name="clear")
@click.option("--force", is_flag=True, help="Skip confirmation prompt.")
def clear_command(force: bool) -> None:
    """Clear all download history."""
    if not is_server_running():
        click.echo("Server is not running. Please start the server first.")
        sys.exit(1)

    # Confirm with user unless --force is used
    if not force and not click.confirm("Are you sure you want to clear all download history?"):
        click.echo("Operation cancelled.")
        return

    # Get server port from config or lock file
    port = get_config_value("server_port")
    if not port:
        click.echo("Could not determine server port. Please start the server first.")
        sys.exit(1)

    # Send request to server
    try:
        response = requests.post(f"http://127.0.0.1:{port}/api/history", json={"action": "clear"}, timeout=10)

        if response.status_code == 200:
            click.echo("Download history cleared successfully.")
        else:
            click.echo(f"Error: {response.status_code}")
            click.echo(response.text)
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        click.echo(f"Could not connect to server at port {port}. Is the server running?")
        sys.exit(1)
    except Exception as e:
        click.echo(f"Error: {e}")
        sys.exit(1)


# Group the history commands
@click.group(name="history", invoke_without_command=True)
@click.pass_context
def history_group(ctx: click.Context) -> None:
    """History management commands (list, clear)."""
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())


history_group.add_command(list_command)
history_group.add_command(clear_command)


# Expose the main command for registration
history_command = history_group

# Provide a patchable list_history callback holder for tests
_orig_list_callback = history_group.commands["list"].callback
list_history = types.SimpleNamespace(callback=_orig_list_callback)
# Override the click Command callback to delegate to our `list_history.callback`
history_group.commands["list"].callback = (
    lambda *args, **kwargs: globals()["list_history"].callback(*args, **kwargs)
)


def _ensure_server_running() -> None:
    """Exit with message if server is not running."""
    if not is_server_running():
        click.echo("Server is not running. Please start the server first.")
        sys.exit(1)


def _get_server_port_or_exit() -> int:
    """Retrieve server port from config or exit on failure."""
    port = get_config_value("server_port")
    if not port:
        click.echo("Could not determine server port. Please start the server first.")
        sys.exit(1)
    return int(port)


def _fetch_history_entries(status: str, domain: str, port: int, limit: int) -> tuple[list[dict[str, Any]], int]:
    """Fetch and filter history entries from server."""
    params: dict[str, str] = {}
    if status != "all":
        params["status"] = status
    if domain:
        params["domain"] = domain
    try:
        response = requests.get(f"http://127.0.0.1:{port}/api/history", params=params, timeout=10)
    except requests.exceptions.ConnectionError:
        click.echo(f"Could not connect to server at port {port}. Is the server running?")
        sys.exit(1)
    if response.status_code != 200:
        click.echo(f"Error: {response.status_code}")
        click.echo(response.text)
        sys.exit(1)
    data = response.json()
    entries = data.get("history", [])
    # Client-side status filtering if needed
    if status != "all":
        entries = [e for e in entries if e.get("status") == status]
    total = data.get("total_items", len(entries))
    if isinstance(total, int):
        return entries[:limit], total
    return entries[:limit], len(entries)


def _format_history_entry(entry: dict[str, Any]) -> list[str]:
    """Return formatted lines for a history entry."""
    lines: list[str] = []
    lines.append(f"ID: {entry.get('id', 'N/A')}")
    lines.append(f"Title: {entry.get('page_title', 'Unknown')}")
    lines.append(f"URL: {entry.get('url', 'N/A')}")
    lines.append(f"Status: {entry.get('status', 'unknown')}")
    timestamp = entry.get("timestamp", "")
    try:
        dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        formatted = dt.strftime("%Y-%m-%d %H:%M:%S")
    except (ValueError, TypeError):
        formatted = timestamp
    lines.append(f"Timestamp: {formatted}")
    lines.append(f"Filename: {entry.get('filename', 'N/A')}")
    if entry.get("error"):
        lines.append(f"Error: {entry.get('error')}")
    return lines
