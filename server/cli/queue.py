"""CLI commands for managing the server-side download queue."""

from __future__ import annotations

import json
from typing import Any

import click
import requests

from server.cli_helpers import get_config_value, is_server_running


@click.group(name="queue")
def queue_group() -> None:
    """Manage the server-side download queue."""


@queue_group.command(name="list")
def list_command() -> None:
    """List queued items from the server."""
    if not is_server_running():
        click.echo("Server is not running. Please start the server first.")
        return
    port = get_config_value("server_port")
    try:
        resp = requests.get(f"http://127.0.0.1:{port}/api/queue", timeout=5)
        if not resp.ok:
            click.echo(f"Error: {resp.status_code}")
            click.echo(resp.text)
            return
        data: dict[str, Any] = resp.json()
        items = data.get("queue", [])
        if not items:
            click.echo("Queue is empty")
            return
        for it in items:
            did = it.get("downloadId") or it.get("download_id") or "unknown"
            url = it.get("url", "")
            click.echo(f"{did}\t{url}")
    except Exception as e:
        click.echo(f"Error: {e}")


@queue_group.command(name="reorder")
@click.argument("ids", nargs=-1)
def reorder_command(ids: tuple[str, ...]) -> None:
    """Reorder queue by specifying a new sequence of IDs."""
    if not ids:
        click.echo("Provide at least one ID in the desired order.")
        return
    if not is_server_running():
        click.echo("Server is not running. Please start the server first.")
        return
    port = get_config_value("server_port")
    try:
        resp = requests.post(
            f"http://127.0.0.1:{port}/api/queue/reorder",
            headers={"Content-Type": "application/json"},
            data=json.dumps({"order": list(ids)}),
            timeout=5,
        )
        if not resp.ok:
            click.echo(f"Error: {resp.status_code}")
            click.echo(resp.text)
            return
        click.echo("Queue reordered successfully")
    except Exception as e:
        click.echo(f"Error: {e}")


@queue_group.command(name="remove")
@click.argument("download_id")
def remove_command(download_id: str) -> None:
    """Remove a queued item by ID."""
    if not is_server_running():
        click.echo("Server is not running. Please start the server first.")
        return
    port = get_config_value("server_port")
    try:
        resp = requests.post(f"http://127.0.0.1:{port}/api/queue/{download_id}/remove", timeout=5)
        data = resp.json() if resp.content else {}
        if resp.ok:
            click.echo(f"Removed: {data.get('downloadId', download_id)}")
        else:
            click.echo(f"Error: {resp.status_code}")
            click.echo(json.dumps(data))
    except Exception as e:
        click.echo(f"Error: {e}")
