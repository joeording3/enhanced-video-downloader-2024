"""CLI commands for download operations (download, resume, cancel)."""

import json
import sys
import time
from pathlib import Path
from typing import Any

import click
import requests
from tqdm import tqdm

from server.cli_helpers import get_config_value, is_server_running


@click.command(name="url")
@click.argument("url", required=True)
@click.option("--format", default="best", help="Video format to download (default: 'best').")
@click.option(
    "--output-dir",
    type=click.Path(exists=True, file_okay=False, dir_okay=True, resolve_path=True),
    help="Directory to save the download (defaults to config's download_dir).",
)
@click.option("--user-agent", help="User agent to use for the download request.")
@click.option("--referrer", help="Referrer URL to use for the download request.")
@click.option("--is-playlist", is_flag=True, help="Whether the URL points to a playlist.")
def url_command(url: str, format: str, output_dir: str, user_agent: str, referrer: str, is_playlist: bool) -> None:
    """Download a video from a URL.

    This command allows downloading a video directly from the command line
    without using the extension.
    """
    _download_single_url(url, format, output_dir, user_agent, referrer, is_playlist)


@click.command(name="batch")
@click.argument("urls_file", type=click.Path(exists=True, file_okay=True, dir_okay=False))
@click.option("--format", default="best", help="Video format to download (default: 'best').")
@click.option(
    "--output-dir",
    type=click.Path(exists=True, file_okay=False, dir_okay=True, resolve_path=True),
    help="Directory to save the downloads (defaults to config's download_dir).",
)
@click.option("--user-agent", help="User agent to use for the download requests.")
@click.option("--referrer", help="Referrer URL to use for the download requests.")
@click.option("--concurrent", type=int, default=3, help="Number of concurrent downloads (default: 3).")
@click.option("--delay", type=float, default=1.0, help="Delay between downloads in seconds (default: 1.0).")
@click.option("--continue-on-error", is_flag=True, help="Continue processing remaining URLs if one fails.")
def batch_command(
    urls_file: str,
    format: str,
    output_dir: str,
    user_agent: str,
    referrer: str,
    concurrent: int,
    delay: float,
    continue_on_error: bool,
) -> None:
    """Download multiple videos from a file containing URLs.

    The URLs file should contain one URL per line. Lines starting with # are
    treated as comments.
    """
    _download_batch_from_file(urls_file, format, output_dir, user_agent, referrer, concurrent, delay, continue_on_error)


def _download_single_url(
    url: str, format: str, output_dir: str, user_agent: str, referrer: str, is_playlist: bool
) -> None:
    """Download a single URL with the given options."""
    # Check if server is running and ready to accept download requests
    if not is_server_running():
        click.echo(" Server is not running. Please start the server first.")
        sys.exit(1)

    # Get server port from config or lock file
    port = get_config_value("server_port")
    if not port:
        click.echo(" Could not determine server port. Please start the server first.")
        sys.exit(1)

    # Build download options
    download_options: dict[str, Any] = {
        "url": url,
        "format": format,
        "is_playlist": is_playlist,
    }

    if user_agent:
        download_options["user_agent"] = user_agent

    if referrer:
        download_options["referrer"] = referrer

    # Use output_dir if specified, otherwise use config's download_dir
    if output_dir:
        download_options["download_dir"] = str(output_dir)

    # Send request to server
    try:
        click.echo(f" Starting download: {url}")
        response = requests.post(f"http://127.0.0.1:{port}/download", json=download_options, timeout=10)

        if response.status_code == 200:
            result = response.json()
            click.echo(f" Download started: {result.get('title', 'Unknown title')}")
            click.echo(f" Download ID: {result.get('downloadId', 'Unknown ID')}")
        else:
            click.echo(f" Error: {response.status_code}")
            click.echo(response.text)
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        click.echo(f" Could not connect to server at port {port}. Is the server running?")
        sys.exit(1)
    except Exception as e:
        click.echo(f" Error: {e}")
        sys.exit(1)


def _download_batch_from_file(
    urls_file: str,
    format: str,
    output_dir: str,
    user_agent: str,
    referrer: str,
    concurrent: int,
    delay: float,
    continue_on_error: bool,
) -> None:
    """Download multiple URLs from a file with progress reporting."""
    # Check if server is running
    if not is_server_running():
        click.echo(" Server is not running. Please start the server first.")
        sys.exit(1)

    # Get server port
    port = get_config_value("server_port")
    if not port:
        click.echo(" Could not determine server port. Please start the server first.")
        sys.exit(1)

    # Read URLs from file
    try:
        with Path(urls_file).open() as f:
            urls = [line.strip() for line in f if line.strip() and not line.strip().startswith("#")]
    except Exception as e:
        click.echo(f" Error reading URLs file: {e}")
        sys.exit(1)

    if not urls:
        click.echo(" No valid URLs found in the file.")
        sys.exit(1)

    click.echo(f" Found {len(urls)} URLs to download")
    click.echo(f"  Concurrent downloads: {concurrent}")
    click.echo(f"  Delay between downloads: {delay}s")
    click.echo(f" Continue on error: {continue_on_error}")
    click.echo()

    # Process URLs with progress bar
    successful = 0
    failed = 0
    failed_urls = []

    with tqdm(total=len(urls), desc="Downloading", unit="url") as pbar:
        for i, url in enumerate(urls):
            try:
                # Build download options
                download_options: dict[str, Any] = {
                    "url": url,
                    "format": format,
                    "is_playlist": False,  # Assume single videos for batch
                }

                if user_agent:
                    download_options["user_agent"] = user_agent

                if referrer:
                    download_options["referrer"] = referrer

                if output_dir:
                    download_options["download_dir"] = str(output_dir)

                # Send request
                response = requests.post(f"http://127.0.0.1:{port}/download", json=download_options, timeout=10)

                if response.status_code == 200:
                    result = response.json()
                    pbar.set_postfix({"status": "", "id": result.get("downloadId", "Unknown")})
                    successful += 1
                else:
                    pbar.set_postfix({"status": "", "error": f"HTTP {response.status_code}"})
                    failed += 1
                    failed_urls.append(url)
                    if not continue_on_error:
                        click.echo(f"\n Failed to download {url}: {response.status_code}")
                        sys.exit(1)

            except Exception as e:
                pbar.set_postfix({"status": "", "error": str(e)[:20]})
                failed += 1
                failed_urls.append(url)
                if not continue_on_error:
                    click.echo(f"\n Failed to download {url}: {e}")
                    sys.exit(1)

            pbar.update(1)

            # Add delay between downloads (except for the last one)
            if i < len(urls) - 1 and delay > 0:
                time.sleep(delay)

    # Summary
    click.echo("\n Batch download completed:")
    click.echo(f"    Successful: {successful}")
    click.echo(f"    Failed: {failed}")

    if failed_urls:
        click.echo("\n Failed URLs:")
        for url in failed_urls:
            click.echo(f"   - {url}")


@click.command(name="resume")
@click.argument("type", type=click.Choice(["partials", "incomplete", "failed"]))
def resume_command(type: str) -> None:
    """Resume downloads by type (partials, incomplete, or failed)."""
    if not is_server_running():
        click.echo(" Server is not running. Please start the server first.")
        sys.exit(1)

    port = get_config_value("server_port")
    if not port:
        click.echo(" Could not determine server port. Please start the server first.")
        sys.exit(1)

    # Map type to appropriate endpoint
    endpoint_map = {
        "partials": "/resume",
        "incomplete": "/resume",
        "failed": "/resume",
    }

    endpoint = endpoint_map.get(type, "/resume")

    try:
        click.echo(f" Resuming {type} downloads...")
        response = requests.post(
            f"http://127.0.0.1:{port}{endpoint}",
            json={"type": type},
            timeout=30,  # Resume operations can take longer
        )

        if response.status_code == 200:
            result = response.json()
            click.echo(" Resume operation completed:")
            click.echo(f"    Status: {result.get('status', 'Unknown')}")
            if result.get("message"):
                click.echo(f"    Message: {result.get('message')}")
        else:
            click.echo(f" Error: {response.status_code}")
            click.echo(response.text)
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        click.echo(f" Could not connect to server at port {port}. Is the server running?")
        sys.exit(1)
    except Exception as e:
        click.echo(f" Error: {e}")
        sys.exit(1)


@click.command(name="cancel")
@click.argument("download_id")
def cancel_command(download_id: str) -> None:
    """Cancel an active download by ID."""
    if not is_server_running():
        click.echo(" Server is not running. Please start the server first.")
        sys.exit(1)

    port = get_config_value("server_port")
    if not port:
        click.echo(" Could not determine server port. Please start the server first.")
        sys.exit(1)

    try:
        click.echo(f"  Canceling download: {download_id}")
        response = requests.post(f"http://127.0.0.1:{port}/download/{download_id}/cancel", timeout=10)

        if response.status_code == 200:
            result = response.json()
            click.echo(f" Download canceled: {result.get('message', 'Success')}")
        else:
            click.echo(f" Error: {response.status_code}")
            click.echo(response.text)
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        click.echo(f" Could not connect to server at port {port}. Is the server running?")
        sys.exit(1)
    except Exception as e:
        click.echo(f" Error: {e}")
        sys.exit(1)


@click.command(name="priority")
@click.argument("download_id")
@click.argument("priority", type=int)
def priority_command(download_id: str, priority: int) -> None:
    """Set the priority of an active download."""
    if not is_server_running():
        click.echo(" Server is not running. Please start the server first.")
        sys.exit(1)

    port = get_config_value("server_port")
    if not port:
        click.echo(" Could not determine server port. Please start the server first.")
        sys.exit(1)

    try:
        click.echo(f" Setting priority for download {download_id} to {priority}")
        response = requests.post(
            f"http://127.0.0.1:{port}/download/{download_id}/priority", json={"priority": priority}, timeout=10
        )

        if response.status_code == 200:
            result = response.json()
            click.echo(f" Priority updated: {result.get('message', 'Success')}")
        else:
            click.echo(f" Error: {response.status_code}")
            click.echo(response.text)
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        click.echo(f" Could not connect to server at port {port}. Is the server running?")
        sys.exit(1)
    except Exception as e:
        click.echo(f" Error: {e}")
        sys.exit(1)


@click.command(name="list")
@click.option("--active-only", is_flag=True, help="Show only active downloads.")
@click.option("--failed-only", is_flag=True, help="Show only failed downloads.")
@click.option("--format", type=click.Choice(["table", "json"]), default="table", help="Output format.")
def list_command(active_only: bool, failed_only: bool, format: str) -> None:
    """List current downloads with their status."""
    if not is_server_running():
        click.echo(" Server is not running. Please start the server first.")
        sys.exit(1)

    port = get_config_value("server_port")
    if not port:
        click.echo(" Could not determine server port. Please start the server first.")
        sys.exit(1)

    try:
        response = requests.get(f"http://127.0.0.1:{port}/status", timeout=10)

        if response.status_code == 200:
            result = response.json()
            downloads = result.get("downloads", [])

            # Apply filters
            if active_only:
                downloads = [d for d in downloads if d.get("status") in ["downloading", "queued"]]
            elif failed_only:
                downloads = [d for d in downloads if d.get("status") == "error"]

            if format == "json":
                click.echo(json.dumps(downloads, indent=2))
            else:
                _display_downloads_table(downloads)
        else:
            click.echo(f" Error: {response.status_code}")
            click.echo(response.text)
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        click.echo(f" Could not connect to server at port {port}. Is the server running?")
        sys.exit(1)
    except Exception as e:
        click.echo(f" Error: {e}")
        sys.exit(1)


def _display_downloads_table(downloads: "list[dict[str, Any]]") -> None:
    """Display downloads in a formatted table."""
    if not downloads:
        click.echo(" No downloads found.")
        return

    click.echo(f" Current Downloads ({len(downloads)} total):")
    click.echo("-" * 100)
    click.echo(f"{'ID':<20} {'Status':<12} {'Progress':<10} {'Title'[:40]:<40}")
    click.echo("-" * 100)

    for download in downloads:
        download_id = download.get("downloadId", "Unknown")[:18]
        status = download.get("status", "unknown")
        progress = f"{download.get('progress', 0):.1f}%"
        title = download.get("title", "Unknown Title")[:38]

        click.echo(f"{download_id:<20} {status:<12} {progress:<10} {title:<40}")

    click.echo("-" * 100)


@click.group(name="download", invoke_without_command=True)
@click.pass_context
def download_group(ctx: click.Context) -> None:
    """Download management commands (url, batch, resume, cancel, priority, list)."""
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())


# Add commands to the group
download_group.add_command(url_command)
download_group.add_command(batch_command)
download_group.add_command(resume_command)
download_group.add_command(cancel_command)
download_group.add_command(priority_command)
download_group.add_command(list_command)

# Expose the main command for registration
download_command = download_group
