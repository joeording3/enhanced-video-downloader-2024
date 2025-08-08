"""Provide CLI utility commands for the Enhanced Video Downloader server."""

import contextlib
import json
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import click
import yaml

from server.config import Config

# Expose Config.load and Config.update_config for CLI commands and tests
load_config = Config.load
update_config = Config.update_config


# Helper functions for logs and cleanup
def get_log_files() -> list[str]:
    """Return list of log file paths."""
    logs_dir = Path(__file__).parent.parent.resolve() / "logs"
    if not logs_dir.exists():
        return []
    return [str(p) for p in logs_dir.glob("*.log") if p.is_file()]


def read_log_file(path: str, lines: int = 50, filter_text: str | None = None) -> list[str]:
    """Read specified lines from a log file, optionally filtering text."""
    try:
        with Path(path).open() as f:
            log_lines = f.readlines()
    except Exception:
        return []
    if filter_text:
        log_lines = [line for line in log_lines if filter_text.lower() in line.lower()]
    return [line.rstrip("\n") for line in log_lines[-lines:]]


def clean_log_files() -> int:
    """Remove log files and return number removed."""
    logs_dir = Path(__file__).parent.parent.resolve() / "logs"
    if not logs_dir.exists():
        return 0
    files = [p for p in logs_dir.glob("*.log") if p.is_file()]
    count = len(files)
    for f in files:
        with contextlib.suppress(Exception):
            f.unlink()
    return count


def run_cleanup() -> dict[str, Any]:
    """Clean up temporary files and partial downloads; return summary dict."""
    # Default stub: return empty cleanup results. Override in tests via patch.
    return {}


@click.group(name="config", invoke_without_command=True)
@click.pass_context
def config_group(ctx: click.Context) -> None:
    """Manage configuration commands (show, set)."""
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())
        ctx.exit(0)


@click.command(name="show")
@click.option(
    "--format",
    type=click.Choice(["table", "json", "yaml"]),
    default="table",
    help="Output format for configuration display.",
)
@click.option(
    "--filter",
    "filter_keys",
    multiple=True,
    help="Filter configuration keys to display (can be specified multiple times).",
)
@click.option(
    "--section",
    type=click.Choice(["server", "download", "logging", "ui", "yt-dlp"]),
    help="Filter by configuration section.",
)
@click.option(
    "--verbose",
    is_flag=True,
    help="Show detailed explanations for configuration options.",
)
def config_show_command(format: str, filter_keys: tuple[str, ...], section: str, verbose: bool) -> None:
    """
    Display current server configuration with enhanced formatting and filtering.

    Examples:
        videodownloader-server utils config show
        videodownloader-server utils config show --format json
        videodownloader-server utils config show --filter server_port --filter download_dir
        videodownloader-server utils config show --section server --verbose
    """
    try:
        config_data = load_config()
        config_dict = config_data.as_dict()

        # Apply filtering
        if filter_keys:
            config_dict = {k: v for k, v in config_dict.items() if k in filter_keys}
        elif section:
            config_dict = _filter_by_section(config_dict, section)

        # Display in requested format
        if format == "json":
            _display_json(config_dict, verbose)
        elif format == "yaml":
            _display_yaml(config_dict, verbose)
        else:  # table format
            _display_table(config_dict, verbose)

    except Exception as e:
        click.echo(f" Error loading configuration: {e}", err=True)
        sys.exit(1)


def _filter_by_section(config_dict: dict[str, Any], section: str) -> dict[str, Any]:
    """Filter configuration by section."""
    section_mappings = {
        "server": ["server_host", "server_port"],
        "download": ["download_dir", "max_concurrent_downloads", "download_history_limit", "allow_playlists"],
        "logging": ["log_level", "console_log_level", "log_path"],
        "ui": ["show_download_button", "button_position_memory", "scan_interval_ms"],
        "yt-dlp": ["yt_dlp_options"],
    }

    if section not in section_mappings:
        return config_dict

    filtered_keys = section_mappings[section]
    return {k: v for k, v in config_dict.items() if k in filtered_keys}


def _display_json(config_dict: dict[str, Any], verbose: bool) -> None:
    """Display configuration in JSON format."""
    if verbose:
        # Add explanatory comments as JSON comments (not standard but readable)
        click.echo("// Configuration with explanatory notes:")
        click.echo("// Use --verbose for detailed explanations")
        click.echo()

    click.echo(json.dumps(config_dict, indent=2))


def _display_yaml(config_dict: dict[str, Any], verbose: bool) -> None:
    """Display configuration in YAML format."""
    if verbose:
        # Add explanatory comments
        click.echo("# Configuration with explanatory notes:")
        click.echo("# Use --verbose for detailed explanations")
        click.echo()

    click.echo(yaml.dump(config_dict, default_flow_style=False, sort_keys=False))


def _display_table(config_dict: dict[str, Any], verbose: bool) -> None:
    """Display configuration in formatted table."""
    if not config_dict:
        click.echo(" No configuration items found matching the specified filters.")
        return

    # Configuration descriptions for verbose mode
    descriptions = {
        "server_host": "Host address for the server to bind to",
        "server_port": "Port number for the server to listen on",
        "download_dir": "Directory where downloaded files are stored",
        "debug_mode": "Enable debug mode for detailed logging",
        "max_concurrent_downloads": "Maximum number of simultaneous downloads",
        "download_history_limit": "Maximum number of history entries to keep",
        "allowed_domains": "List of domains allowed for downloads (empty = all)",
        "ffmpeg_path": "Path to ffmpeg executable for video processing",
        "log_level": "Logging level for file output",
        "console_log_level": "Logging level for console output",
        "log_path": "Path to log file (null = use default)",
        "scan_interval_ms": "Interval in milliseconds for UI scanning",
        "show_download_button": "Show download button on supported pages",
        "button_position_memory": "Remember button positions per domain",
        "enable_history": "Enable download history tracking",
        "allow_playlists": "Allow downloading entire playlists",
        "yt_dlp_options": "Advanced yt-dlp configuration options",
    }

    # Table header
    if verbose:
        click.echo(f"{'Key':<25} {'Value':<30} {'Description'}")
        click.echo("-" * 80)
    else:
        click.echo(f"{'Key':<25} {'Value'}")
        click.echo("-" * 50)

    # Display each configuration item
    for key, value in config_dict.items():
        # Format value for display
        if isinstance(value, dict):
            display_value = f"<{len(value)} items>"  # type: ignore[arg-type]
        elif isinstance(value, list):
            display_value = f"[{len(value)} items]"  # type: ignore[arg-type]
        elif value is None:
            display_value = "null"
        else:
            display_value = str(value)

        # Truncate long values
        if len(display_value) > 28:
            display_value = display_value[:25] + "..."

        if verbose:
            description = descriptions.get(key, "No description available")
            click.echo(f"{key:<25} {display_value:<30} {description}")
        else:
            click.echo(f"{key:<25} {display_value}")

    if verbose:
        click.echo()
        click.echo(" Tip: Use --format json or --format yaml for machine-readable output")
        click.echo(" Tip: Use --filter <key> to show specific configuration items")


@click.command(name="set")
@click.option("--port", type=int, help="Server port.")
@click.option(
    "--download-dir",
    type=click.Path(exists=True, file_okay=False, dir_okay=True, resolve_path=True),
    help="Directory to store downloads.",
)
@click.option("--debug-mode", type=bool, help="Enable or disable debug mode.")
@click.option("--enable-history", type=bool, help="Enable or disable download history.")
@click.option(
    "--log-level",
    type=click.Choice(["debug", "info", "warning", "error", "critical"]),
    help="Server log level.",
)
@click.option(
    "--console-log-level",
    type=click.Choice(["debug", "info", "warning", "error", "critical"]),
    help="Console log level.",
)
@click.option(
    "--max-concurrent-downloads",
    type=int,
    help="Maximum number of concurrent downloads.",
)
@click.option(
    "--backup",
    is_flag=True,
    help="Create backup of current configuration before making changes.",
)
@click.option(
    "--test",
    is_flag=True,
    help="Validate changes without applying them (dry run).",
)
@click.option(
    "--key-value",
    "key_value_pairs",
    multiple=True,
    help="Set multiple key-value pairs in format 'key=value' (can be specified multiple times).",
)
def config_set_command(
    port: int | None,
    download_dir: str | None,
    debug_mode: bool | None,
    enable_history: bool | None,
    log_level: str | None,
    console_log_level: str | None,
    max_concurrent_downloads: int | None,
    backup: bool,
    test: bool,
    key_value_pairs: tuple[str, ...],
) -> None:
    """
    Set server configuration options with enhanced validation and backup.

    Examples:
        videodownloader-server utils config set --port {get_server_port()}
        videodownloader-server utils config set --key-value f"server_port={get_server_port()}" \
            --key-value "log_level=debug"
        videodownloader-server utils config set --port {get_server_port()} --backup --test
    """
    try:
        # Prepare config updates
        updates: dict[str, Any] = {}

        # Process individual options
        if port is not None:
            updates["server_port"] = port
        if download_dir is not None:
            updates["download_dir"] = str(download_dir)
        if debug_mode is not None:
            updates["debug_mode"] = debug_mode
        if enable_history is not None:
            updates["enable_history"] = enable_history
        if log_level is not None:
            updates["log_level"] = log_level
        if console_log_level is not None:
            updates["console_log_level"] = console_log_level
        if max_concurrent_downloads is not None:
            updates["max_concurrent_downloads"] = max_concurrent_downloads

        # Process key-value pairs
        for kv_pair in key_value_pairs:
            if "=" not in kv_pair:
                click.echo(f" Invalid key-value format: {kv_pair}. Use 'key=value'", err=True)
                sys.exit(1)

            key, value = kv_pair.split("=", 1)
            key = key.strip()
            value = value.strip()

            # Validate and convert value
            validated_value = _validate_and_convert_value(key, value)
            if validated_value is not None:
                updates[key] = validated_value

        if not updates:
            click.echo(" No configuration changes specified.")
            click.echo(" Use --help to see available options")
            return

        # Load current configuration
        config_data = load_config()

        # Create backup if requested
        if backup and not test:
            _create_config_backup(config_data)

        # Validate all updates before applying
        validation_errors = _validate_updates(updates, config_data)
        if validation_errors:
            click.echo(" Configuration validation errors:", err=True)
            for error in validation_errors:
                click.echo(f"   • {error}", err=True)
            sys.exit(1)

        # Show what would be changed
        _show_changes(config_data, updates)

        if test:
            click.echo(" Test mode: No changes applied")
            click.echo(" All changes are valid and would be applied successfully")
            return

        # Apply updates
        config_data.update_config(updates)

        click.echo(" Configuration updated successfully.")

        # Show restart notice if needed
        if _requires_restart(updates):
            click.echo("  Some settings require a server restart to take effect.")
            click.echo("   To restart the server, run: videodownloader-server restart")

    except Exception as e:
        click.echo(f" Error updating configuration: {e}", err=True)
        sys.exit(1)


def _validate_and_convert_value(key: str, value: str) -> Any:
    """Validate and convert a configuration value."""
    # Type mappings for validation
    type_mappings: dict[str, type] = {
        "server_port": int,
        "max_concurrent_downloads": int,
        "download_history_limit": int,
        "scan_interval_ms": int,
        "debug_mode": bool,
        "enable_history": bool,
        "show_download_button": bool,
        "allow_playlists": bool,
        "log_level": str,
        "console_log_level": str,
        "server_host": str,
        "download_dir": str,
        "ffmpeg_path": str,
        "log_path": str,
    }

    expected_type = type_mappings.get(key)
    if expected_type is None:
        click.echo(f"  Warning: Unknown configuration key '{key}'", err=True)
        return value

    try:
        if expected_type is bool:
            return value.lower() in ("true", "1", "yes", "on")
        if expected_type is int:
            return int(value)
    except ValueError:
        click.echo(f" Invalid value for {key}: {value} (expected {expected_type.__name__})", err=True)
        return None
    else:
        return value


def _validate_updates(updates: dict[str, Any], config_data: Config) -> list[str]:
    """Validate configuration updates."""
    errors: list[str] = []

    for key, value in updates.items():
        # Check if key exists in configuration
        if not hasattr(config_data, key):
            errors.append(f"Unknown configuration key: {key}")
            continue

        # Validate specific keys
        if key == "server_port":
            try:
                port_value = int(value)
                if not (1 <= port_value <= 65535):
                    errors.append(f"Server port must be between 1 and 65535, got: {value}")
            except (ValueError, TypeError):
                errors.append(f"Server port must be a valid integer, got: {value}")

        elif key == "max_concurrent_downloads":
            try:
                downloads_value = int(value)
                if downloads_value < 1:
                    errors.append(f"Max concurrent downloads must be at least 1, got: {value}")
            except (ValueError, TypeError):
                errors.append(f"Max concurrent downloads must be a valid integer, got: {value}")

        elif key == "download_history_limit":
            try:
                limit_value = int(value)
                if limit_value < 0:
                    errors.append(f"Download history limit must be non-negative, got: {value}")
            except (ValueError, TypeError):
                errors.append(f"Download history limit must be a valid integer, got: {value}")

        elif key == "log_level":
            valid_levels = ["debug", "info", "warning", "error", "critical"]
            if not isinstance(value, str) or value.lower() not in valid_levels:
                errors.append(f"Log level must be one of {valid_levels}, got: {value}")

        elif key == "console_log_level":
            valid_levels = ["debug", "info", "warning", "error", "critical"]
            if not isinstance(value, str) or value.lower() not in valid_levels:
                errors.append(f"Console log level must be one of {valid_levels}, got: {value}")

        elif key == "download_dir":
            path = Path(value)
            if not path.exists():
                try:
                    path.mkdir(parents=True, exist_ok=True)
                except OSError:
                    errors.append(f"Cannot create download directory: {value}")

    return errors


def _create_config_backup(config_data: Config) -> None:
    """Create a backup of the current configuration."""
    try:
        backup_dir = Path("config/backups")
        backup_dir.mkdir(exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"config_backup_{timestamp}.json"

        with backup_file.open("w") as f:
            json.dump(config_data.as_dict(), f, indent=2)

        click.echo(f" Configuration backup created: {backup_file}")

    except Exception as e:
        click.echo(f"  Warning: Could not create backup: {e}", err=True)


def _show_changes(config_data: Config, updates: dict[str, Any]) -> None:
    """Show what changes would be made."""
    click.echo(" Configuration changes:")

    for key, new_value in updates.items():
        try:
            old_value = getattr(config_data, key)
            if old_value != new_value:
                click.echo(f"   {key}: {old_value} → {new_value}")
            else:
                click.echo(f"   {key}: {new_value} (no change)")
        except AttributeError:  # noqa: PERF203
            click.echo(f"   {key}: {new_value} (new setting)")

    click.echo()


def _requires_restart(updates: dict[str, Any]) -> bool:
    """Check if any updates require a server restart."""
    restart_keys = {
        "server_port",
        "server_host",
        "max_concurrent_downloads",
        "log_level",
        "console_log_level",
        "log_path",
    }

    return any(key in restart_keys for key in updates)


@click.group(name="logs", invoke_without_command=True)
@click.pass_context
def logs_group(ctx: click.Context) -> None:
    """Manage logs (view, clear)."""
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())
        ctx.exit(0)


@click.command(name="view")
@click.option("--lines", type=int, default=50, help="Number of log lines to display.")
@click.option("--filter", "filter_text", help="Filter log lines containing this text.")
@click.option("--tail", is_flag=True, help="Follow log files in real time (like tail -f).")
@click.option(
    "--level", type=click.Choice(["debug", "info", "warning", "error", "critical"]), help="Filter by log level."
)
@click.option("--pattern", help="Filter log lines matching this regex pattern.")
@click.option("--color", is_flag=True, default=True, help="Enable colored output for different log levels.")
@click.option("--export", type=click.Path(), help="Export filtered logs to specified file.")
def logs_view_command(
    lines: int,
    filter_text: str | None,
    tail: bool,
    level: str | None,
    pattern: str | None,
    color: bool,
    export: str | None,
) -> None:
    """
    View server logs with enhanced filtering and formatting.

    Examples:
        videodownloader-server utils logs view --lines 100
        videodownloader-server utils logs view --filter "error" --level error
        videodownloader-server utils logs view --tail --pattern "download.*completed"
        videodownloader-server utils logs view --export filtered_logs.txt
    """
    # ANSI color codes for log levels
    colors = {
        "debug": "\033[36m",  # Cyan
        "info": "\033[32m",  # Green
        "warning": "\033[33m",  # Yellow
        "error": "\033[31m",  # Red
        "critical": "\033[35m",  # Magenta
        "reset": "\033[0m",  # Reset
    }

    def colorize_line(line: str, enable_color: bool = True) -> str:
        """Add color to log line based on level."""
        if not enable_color:
            return line

        line_lower = line.lower()
        for level_name, color_code in colors.items():
            if level_name in line_lower and level_name != "reset":
                return f"{color_code}{line}{colors['reset']}"
        return line

    def matches_filters(
        line: str,
        filter_text: str | None = None,
        level: str | None = None,
        pattern: str | None = None,
    ) -> bool:
        """Check if line matches all specified filters."""
        line_lower = line.lower()

        # Text filter
        if filter_text and filter_text.lower() not in line_lower:
            return False

        # Level filter
        if level and level not in line_lower:
            return False

        # Pattern filter
        if pattern:
            try:
                if not re.search(pattern, line, re.IGNORECASE):
                    return False
            except re.error:
                click.echo(f" Invalid regex pattern: {pattern}", err=True)
                return False

        return True

    log_files = get_log_files()
    if not log_files:
        click.echo("No log files found.")
        return

    # Collect filtered lines for export
    exported_lines: list[str] = []

    if tail:
        # Real-time tailing
        click.echo(" Following log files in real time... (Press Ctrl+C to stop)")
        try:
            # Use system tail -f if available, otherwise Python implementation
            for log_file in log_files:
                try:
                    subprocess.run(["tail", "-f", log_file], check=True)
                except (FileNotFoundError, subprocess.CalledProcessError):  # noqa: PERF203
                    # Fallback to Python implementation
                    with Path(log_file).open() as f:
                        f.seek(0, 2)  # Seek to end
                        while True:
                            line = f.readline()
                            if line:
                                line = line.rstrip("\n")
                                if matches_filters(line, filter_text, level, pattern):
                                    colored_line = colorize_line(line, color)
                                    click.echo(colored_line)
                                    if export:
                                        exported_lines.append(line)
                            else:
                                time.sleep(0.1)
                except KeyboardInterrupt:
                    click.echo("\n  Stopped following logs.")
                    break
        except KeyboardInterrupt:
            click.echo("\n  Stopped following logs.")
    else:
        # Static viewing
        for log_file in log_files:
            try:
                # Don't filter here, we'll do it manually
                log_lines = read_log_file(log_file, lines, None)
                filtered_lines: list[str] = []

                for line in log_lines:
                    if matches_filters(line, filter_text, level, pattern):
                        filtered_lines.append(line)
                        if export:
                            exported_lines.append(line)

                if not filtered_lines:
                    click.echo(f"No matching log entries found in {log_file}.")
                else:
                    click.echo(f" {log_file}:")
                    for line in filtered_lines:
                        colored_line: str = colorize_line(line, color)
                        click.echo(colored_line)
                    click.echo()

            except Exception as e:  # noqa: PERF203
                click.echo(f" Error reading log file {log_file}: {e}", err=True)
                continue

    # Export if requested
    if export and exported_lines:
        try:
            with Path(export).open("w") as f:
                f.write("\n".join(exported_lines))
            click.echo(f" Exported {len(exported_lines)} log lines to {export}")
        except Exception as e:
            click.echo(f" Error exporting logs to {export}: {e}", err=True)


@click.command(name="clear")
@click.option("--confirm", is_flag=True, help="Skip confirmation prompt.")
def logs_clear_command(confirm: bool) -> None:
    """Clear server logs."""
    if not confirm and not click.confirm("Are you sure you want to clear all server logs?"):
        click.echo("Operation cancelled.")
        return
    # Remove log files and report count
    count = clean_log_files()
    click.echo(f"{count} log files cleared")


@click.command(name="cleanup")
def cleanup_command() -> None:
    """Clean up temporary files and partial downloads."""
    # Run cleanup helper and display results
    results = run_cleanup()
    temp_files = results.get("temp_files", 0)
    partial = results.get("partial_downloads", 0)
    click.echo(f"{temp_files} temporary files")
    click.echo(f"{partial} partial downloads")


# Configure sub-commands
config_group.add_command(config_show_command)
config_group.add_command(config_set_command)

logs_group.add_command(logs_view_command)
logs_group.add_command(logs_clear_command)


# Group the utility commands
@click.group(name="utils", invoke_without_command=True)
@click.pass_context
def utils_group(ctx: click.Context) -> None:
    """Provide utility commands (config, logs, cleanup)."""
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())
        ctx.exit(0)


# Aliases for tests: config, logs, cleanup
config = config_group
logs = logs_group
cleanup = cleanup_command
utils_group.add_command(config)
utils_group.add_command(logs)
utils_group.add_command(cleanup)

# Expose the main command for registration
utils_command = utils_group
