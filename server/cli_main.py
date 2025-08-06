"""
Provide command-line interface for Enhanced Video Downloader server.

This module defines Click commands to manage server lifecycle, downloads,
configuration, debug utilities, and system maintenance via a unified CLI.
"""

import json
import logging
import platform
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Third-party modules
import click
import psutil

# Import enhanced config functions from utils
from server.cli_commands.system_maintenance import system_maintenance

# Register scaffolded CLI subcommands
from server.cli_helpers import (
    disable_agents_cli,
    find_server_processes_cli,
    find_video_downloader_agents_cli,
    get_lock_pid_port_cli,
    is_port_in_use,
    kill_processes_cli,
    remove_lock_file_cli,
    wait_for_server_start_cli,
)
from server.config import Config


# Import subcommand modules - using lazy imports to avoid circular dependencies
def get_cli_commands():
    """Get CLI commands with lazy imports to avoid circular dependencies."""
    from server.cli import (
        download_command,
        history_command,
        resume_group,
        status_command,
        utils_command,
    )

    return download_command, history_command, resume_group, status_command, utils_command


# Project modules


# Logger for CLI
log = logging.getLogger(__name__)


# Project paths
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent  # Correctly assumes cli.py is in server/
# Configuration is now environment-only, no config files needed
# LOCK_PATH is now defined in server.lock and used via functions from there,
# but server.cli might still need its own reference for messages or direct checks if any.
# For consistency, let's use the one from server.lock if possible, or redefine carefully.
LOCK_PATH = PROJECT_ROOT / "server.lock"  # Defined here for CLI messages, actual ops use server.lock's functions
SERVER_MAIN_SCRIPT = SCRIPT_DIR / "__main__.py"


# Helper functions adapted moved to server/cli_helpers.py


# --- Command Line Interface ---
@click.group(invoke_without_command=True)
@click.option("--verbose", "-v", is_flag=True, help="Enable verbose logging")
@click.pass_context
def cli(ctx: click.Context, verbose: bool) -> None:
    """Initialize Enhanced Video Downloader CLI and register subcommands."""
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        log.setLevel(logging.DEBUG)
        log.debug("Verbose logging enabled")
    # Configuration is now environment-only
    ctx.obj = {}
    # Subcommands are registered below
    # If no subcommand provided, show help and exit
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())
        ctx.exit()


# Server lifecycle commands


# Extracted helper functions for start_server and stop_server
def _run_start_server(
    ctx,
    daemon: bool,
    host: Optional[str] = None,
    port: Optional[int] = None,
    download_dir: Optional[str] = None,
    gunicorn: bool = False,
    workers: int = 1,
    verbose: bool = False,
    force: bool = False,
    timeout: int = 30,
    retry_attempts: int = 3,
    auto_port: bool = False,
):
    """Start the server with all CLI options for use by start_server command and tests."""
    log = logging.getLogger("server.cli")
    log.info(
        f"_run_start_server called with: daemon={daemon}, host={host}, port={port}, "
        f"download_dir={download_dir}, gunicorn={gunicorn}, workers={workers}, "
        f"verbose={verbose}, force={force}, timeout={timeout}, "
        f"retry_attempts={retry_attempts}, auto_port={auto_port}"
    )

    # Call the actual helper functions that are mocked in tests
    cfg = _cli_load_config(ctx)
    _cli_set_logging(verbose)

    resolved_host, resolved_port, _ = _resolve_start_params(cfg, host, port, download_dir)
    _cli_pre_start_checks(resolved_host, resolved_port, force)

    cmd = _cli_build_command(cfg, resolved_host, resolved_port, gunicorn, workers)

    if daemon:
        _cli_execute_daemon(cmd, resolved_host, resolved_port)
    else:
        _cli_execute_foreground(cmd, resolved_host, resolved_port)


@cli.command("start")
@click.option(
    "--daemon/--foreground",
    "-d/-f",
    is_flag=True,
    default=True,
    help=("Run the server as a daemon (background process) or in foreground. Default: daemon."),
)
@click.option(
    "--fg",
    is_flag=True,
    help=("Run the server in foreground mode (same as --foreground)"),
)
@click.option("--host", help="Host to bind to (default: from config)")
@click.option("--port", type=int, help="Port to listen on (default: from config)")
@click.option(
    "--download-dir",
    type=click.Path(),
    help="Directory to store downloads (default: from config)",
)
@click.option("--gunicorn", is_flag=True, help="Run using Gunicorn WSGI server (production)")
@click.option(
    "--workers",
    type=int,
    default=2,
    help="Number of Gunicorn workers (default: 2)",
)
@click.option(
    "--verbose",
    is_flag=True,
    help=("Show all log output in the console. Default: only show warnings and errors"),
)
@click.option(
    "--force",
    is_flag=True,
    help=("Force start the server even if another instance is running (automatically stops the existing instance)"),
)
@click.option(
    "--timeout",
    type=int,
    default=30,
    help=("Timeout in seconds for server startup verification (default: 30)"),
)
@click.option(
    "--retry-attempts",
    type=int,
    default=3,
    help=("Number of retry attempts for port conflict resolution (default: 3)"),
)
@click.option(
    "--auto-port",
    is_flag=True,
    help=("Automatically find an available port if the specified port is in use"),
)
@click.pass_context
def start_server(
    ctx: click.Context,
    daemon: bool,
    fg: bool,
    host: Optional[str],
    port: Optional[int],
    download_dir: Optional[str],
    gunicorn: bool,
    workers: int,
    verbose: bool,
    force: bool,
    timeout: int,
    retry_attempts: int,
    auto_port: bool,
):
    """
    Start the server in development or production mode.

    Parameters
    ----------
    ctx : click.Context
        Click context object.
    daemon : bool
        Run as a daemon if True, else run in foreground.
    fg : bool
        Run in foreground mode if True (overrides daemon setting).
    host : Optional[str]
        Host address to bind the server.
    port : Optional[int]
        Port number to listen on.
    download_dir : Optional[str]
        Directory to store downloaded files.
    gunicorn : bool
        Use Gunicorn WSGI server if True.
    workers : int
        Number of worker processes for Gunicorn.
    verbose : bool
        Enable verbose logging output if True.
    force : bool
        Force start by stopping existing instance if running.
    timeout : int
        Timeout in seconds for server startup verification.
    retry_attempts : int
        Number of retry attempts for port conflict resolution.
    auto_port : bool
        Automatically find an available port if the specified port is in use.

    Returns
    -------
    None
        This command does not return a value.
    """
    # If --fg flag is used, override daemon setting to run in foreground
    if fg:
        daemon = False

    _run_start_server(
        ctx,
        daemon,
        host,
        port,
        download_dir,
        gunicorn,
        workers,
        verbose,
        force,
        timeout,
        retry_attempts,
        auto_port,
    )


@cli.command("stop")
@click.option(
    "--timeout",
    type=int,
    default=10,
    help="Timeout in seconds for graceful termination (default: 10)",
)
@click.option(
    "--force",
    is_flag=True,
    help="Force kill processes without graceful shutdown",
)
@click.pass_context
def stop_server(_ctx: click.Context, timeout: int, force: bool):
    """
    Stop the server gracefully.

    Parameters
    ----------
    ctx : click.Context
        Click context object.
    timeout : int
        Timeout in seconds for graceful termination.
    force : bool
        Force kill processes without graceful shutdown.

    Returns
    -------
    None
        This command does not return a value.
    """
    _run_stop_server_enhanced(timeout, force)


@cli.command("restart")
@click.option(
    "--daemon/--foreground",
    "-d/-f",
    is_flag=True,
    default=True,
    help=("Run the restarted server as a daemon (background process) or in foreground. Default: daemon."),
)
@click.option(
    "--fg",
    is_flag=True,
    help=("Run the restarted server in foreground mode (same as --foreground)"),
)
@click.option("--host", help="Host to bind to (default: from config)")
@click.option("--port", type=int, help="Port to listen on (default: from config)")
@click.option("--gunicorn", is_flag=True, help="Run using Gunicorn WSGI server (production)")
@click.option(
    "--workers",
    type=int,
    default=None,
    help="Number of Gunicorn workers (default: from start_server)",
)
@click.option(
    "--verbose",
    is_flag=True,
    help=("Show all log output in the console. Default: only show warnings and errors"),
)
@click.option(
    "--force",
    is_flag=True,
    help=("Force restart the server even if another instance is running on a different port"),
)
@click.option(
    "--timeout",
    type=int,
    default=30,
    help="Timeout in seconds for restart verification (default: 30)",
)
@click.option(
    "--preserve-state",
    is_flag=True,
    help="Preserve server state between restarts (downloads, history)",
)
@click.pass_context
def restart_server_command(
    ctx: click.Context,
    daemon: bool,
    fg: bool,
    host: Optional[str],
    port: Optional[int],
    gunicorn: bool,
    workers: Optional[int],
    verbose: bool,
    force: bool,
    timeout: int,
    preserve_state: bool,
):
    """
    Restart the server with updated settings.

    Parameters
    ----------
    ctx : click.Context
        Click context object.
    daemon : bool
        Run restarted server as a daemon if True.
    fg : bool
        Run restarted server in foreground mode if True (overrides daemon setting).
    host : Optional[str]
        Host address to bind the server.
    port : Optional[int]
        Port number to listen on.
    gunicorn : bool
        Use Gunicorn WSGI server if True.
    workers : Optional[int]
        Number of worker processes for Gunicorn.
    verbose : bool
        Enable verbose logging if True.
    force : bool
        Force restart even if server is already running on a different port.
    timeout : int
        Timeout in seconds for restart verification.
    preserve_state : bool
        Preserve server state between restarts.

    Returns
    -------
    None
        This command does not return a value.
    """
    # If --fg flag is used, override daemon setting to run in foreground
    if fg:
        daemon = False

    _run_restart_server_enhanced(
        ctx,
        daemon,
        host,
        port,
        gunicorn,
        workers,
        verbose,
        force,
        timeout,
        preserve_state,
    )


@cli.command("status")
@click.option(
    "--detailed",
    "-d",
    is_flag=True,
    help="Show detailed status information including active downloads",
)
@click.option(
    "--json",
    is_flag=True,
    help="Output status in JSON format",
)
@click.pass_context
def server_status(ctx: click.Context, detailed: bool, json_output: bool):
    """
    Show current server status and active downloads.

    Parameters
    ----------
    ctx : click.Context
        Click context object.
    detailed : bool
        Show detailed status information including active downloads.
    json_output : bool
        Output status in JSON format.

    Returns
    -------
    None
        This command does not return a value.
    """
    _run_server_status_enhanced(ctx, detailed, json_output)


# --- System Command Group ---
@cli.group("system")
def system_group():
    """
    Perform system maintenance tasks.

    Parameters
    ----------
    None
        This function does not return a value.

    Returns
    -------
    None
        This function does not return a value.
    """


@system_group.command("disable-launchagents")
@click.option("--verify", is_flag=True, help="Verify successful disabling of launch agents.")
@click.option("--enable", is_flag=True, help="Re-enable previously disabled launch agents.")
@click.option("--backup", is_flag=True, help="Create backup of original configurations before disabling.")
@click.option("--force", is_flag=True, help="Force disable without confirmation prompts.")
@click.pass_context
def disable_launchagents_cmd(_ctx: click.Context, verify: bool, enable: bool, backup: bool, force: bool):
    """
    Enhanced launch agent management for the Enhanced Video Downloader.

    Provides comprehensive control over auto-start launch agents with verification,
    backup, and re-enabling capabilities.

    Parameters
    ----------
    ctx : click.Context
        Click context object.
    verify : bool
        Verify successful disabling of launch agents.
    enable : bool
        Re-enable previously disabled launch agents.
    backup : bool
        Create backup of original configurations before disabling.
    force : bool
        Force disable without confirmation prompts.

    Returns
    -------
    None
        This function does not return a value.
    """
    system = platform.system().lower()

    if enable:
        # Re-enable functionality
        click.echo(" Re-enabling launch agents...")
        try:
            if system == "darwin":
                # macOS: Restore from backup or recreate
                backup_dir = Path.home() / ".evd_launchagent_backups"
                if backup_dir.exists():
                    for backup_file in backup_dir.glob("*.plist.backup"):
                        original_path = backup_file.with_suffix("")
                        try:
                            shutil.copy2(backup_file, original_path)
                            click.echo(f" Restored: {original_path}")
                        except Exception as e:
                            click.echo(f" Failed to restore {original_path}: {e}", err=True)
                else:
                    click.echo("  No backup directory found. Cannot restore launch agents.")
            elif system == "linux":
                # Linux: Re-enable systemd service
                try:
                    subprocess.run(["systemctl", "--user", "enable", "evd.service"], check=True)
                    click.echo(" Re-enabled systemd user service.")
                except subprocess.CalledProcessError as e:
                    click.echo(f" Failed to re-enable systemd service: {e}", err=True)
            else:
                click.echo(f"  Re-enabling not supported on {system}")
        except Exception as e:
            click.echo(f" Error during re-enabling: {e}", err=True)
        return

    # Check system compatibility
    if system not in ["darwin", "linux"]:
        click.echo(f"  Launch agent management is not fully supported on {system}")
        click.echo("   This command is primarily designed for macOS and Linux.")
        if not force and not click.confirm("Continue anyway?"):
            return

    # Find launch agents
    click.echo(" Searching for Enhanced Video Downloader launch agents...")
    agents_found = find_video_downloader_agents_cli()

    if not agents_found:
        click.echo(" No relevant launch agents found.")
        return

    click.echo(f" Found {len(agents_found)} launch agent(s):")
    for agent_path in agents_found:
        click.echo(f"   • {agent_path}")

    # Create backup if requested
    if backup:
        click.echo(" Creating backup of launch agent configurations...")
        backup_dir = Path.home() / ".evd_launchagent_backups"
        backup_dir.mkdir(exist_ok=True)

        for agent_path in agents_found:
            try:
                agent_file = Path(agent_path)
                if agent_file.exists():
                    backup_path = backup_dir / f"{agent_file.name}.backup"
                    shutil.copy2(agent_file, backup_path)
                    click.echo(f"    Backed up: {agent_path}")
                else:
                    click.echo(f"     Agent file not found: {agent_path}")
            except Exception as e:  # noqa: PERF203
                click.echo(f"    Failed to backup {agent_path}: {e}", err=True)

    # Confirm action
    if not force and not click.confirm(f"Do you want to disable {len(agents_found)} launch agent(s)?"):
        click.echo(" Operation cancelled by user.")
        return

    # Disable launch agents
    click.echo(" Disabling launch agents...")
    try:
        disable_agents_cli([str(agent) for agent in agents_found])
        click.echo(" Launch agent disable sequence completed.")
    except Exception as e:
        click.echo(f" Error during disable sequence: {e}", err=True)
        return

    # Verify if requested
    if verify:
        click.echo(" Verifying launch agent status...")
        time.sleep(2)  # Give system time to process changes

        # Check if agents are still active
        still_active = []
        for agent_path in agents_found:
            try:
                if system == "darwin":
                    # Check if launchctl still shows the service
                    result = subprocess.run(["launchctl", "list"], capture_output=True, text=True, check=True)
                    if any("evd" in line for line in result.stdout.splitlines()):
                        still_active.append(agent_path)
                elif system == "linux":
                    # Check if systemd service is still enabled
                    result = subprocess.run(
                        ["systemctl", "--user", "is-enabled", "evd.service"],
                        capture_output=True,
                        text=True,
                        check=False,
                    )
                    if result.returncode == 0:
                        still_active.append(agent_path)
            except Exception:  # noqa: PERF203
                still_active.append(agent_path)

        if still_active:
            click.echo("  Some launch agents may still be active:")
            for agent in still_active:
                click.echo(f"   • {agent}")
            click.echo("   You may need to restart your system for changes to take effect.")
        else:
            click.echo(" All launch agents successfully disabled and verified.")

    click.echo(" Tip: Use '--enable' flag to re-enable launch agents if needed.")


# Resume downloads commands group


# Resume commands are now imported from server/cli/resume.py


# Register all subcommands using lazy imports
download_cmd, history_cmd, resume_grp, status_cmd, utils_cmd = get_cli_commands()
cli.add_command(download_cmd)
cli.add_command(history_cmd)
cli.add_command(status_cmd)
cli.add_command(utils_cmd)
cli.add_command(resume_grp)
cli.add_command(system_maintenance)


def main():
    """
    Console script entrypoint.

    Invokes the main CLI group to start the application.

    Returns
    -------
    None
        This function does not return a value.
    """
    cli()


if __name__ == "__main__":
    project_root = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(project_root))
    cli()


# Helpers for start_server to reduce complexity
def _cli_load_config(_ctx: click.Context) -> Config:
    return Config.load()


def _cli_set_logging(verbose: bool) -> None:
    if verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        log.setLevel(logging.DEBUG)
        log.info("Verbose logging enabled")
    else:
        logging.getLogger().setLevel(logging.INFO)
        log.setLevel(logging.INFO)
        log.info("Console logging set to warnings and errors only")


# Helper to resolve download directory for start_server
def _resolve_download_dir(cfg: Config, download_dir: Optional[str]) -> str:
    """Determine the effective download directory."""
    current_config_download_dir = cfg.get_value("download_dir")
    # CLI override
    if download_dir is not None:
        cli_download_path = Path(download_dir).expanduser().resolve()
        try:
            cli_download_path.mkdir(parents=True, exist_ok=True)
            return str(cli_download_path)
        except Exception:
            log.exception("Failed to set or create CLI-provided download directory")
            sys.exit(1)
    # Config value
    if current_config_download_dir is not None:
        return current_config_download_dir
    # Default location
    default_dl_path = PROJECT_ROOT / "user_downloads"
    try:
        default_dl_path.mkdir(parents=True, exist_ok=True)
        log.info(f"Download directory not specified, defaulting to '{default_dl_path}'")
    except Exception as e:
        log.warning(f"Could not create default download directory '{default_dl_path}': {e}.")
    return str(default_dl_path)


def _cli_get_existing_server_status(host: str, port: int) -> Tuple[Optional[Tuple[int, int]], bool]:
    """Retrieve server lock PID/port and port-in-use status."""
    pid_port = get_lock_pid_port_cli(LOCK_PATH)
    port_in_use = is_port_in_use(port, host)
    return pid_port, port_in_use


def _resolve_start_params(
    cfg: Config, host: Optional[str], port: Optional[int], download_dir: Optional[str]
) -> Tuple[str, int, str]:
    """Determine effective host, port, and download directory."""
    # Host resolution
    current_config_host = cfg.get_value("server_host")
    if host is not None:
        effective_host = host
    elif current_config_host is not None:
        effective_host = current_config_host
    else:
        effective_host = "127.0.0.1"

    # Port resolution
    current_config_port = cfg.get_value("server_port")
    if port is not None:
        effective_port = port
    elif current_config_port is not None:
        effective_port = current_config_port
    else:
        from server.constants import get_server_port

        effective_port = get_server_port()

    # Download directory resolution
    effective_download_dir_str = _resolve_download_dir(cfg, download_dir)

    return effective_host, effective_port, effective_download_dir_str


# Helper to build the server start command
def _cli_build_command(cfg: Config, host: str, port: int, gunicorn: bool, workers: int) -> List[str]:
    """Build the command list for starting the server."""
    if gunicorn:
        log.info("Starting server in production mode with Gunicorn on %s:%s", host, port)
        cmd = [
            "gunicorn",
            f"--workers={workers}",
            f"--bind={host}:{port}",
            "server.wsgi:app",
            "--access-logfile",
            "-",
            "--error-logfile",
            "-",
            "--log-level",
            "info",
        ]
        if cfg.get_value("debug_mode", False):
            cmd.append("--reload")
    else:
        log.info("Starting server in development mode with Flask on %s:%s", host, port)
        cmd = [sys.executable, str(SERVER_MAIN_SCRIPT)]
    return cmd


# Pre-start checks helper for start_server
def _cli_pre_start_checks(host: str, port: int, force: bool) -> None:
    """Perform pre-start lock and port conflict checks by delegating to helpers."""
    pid_port, port_in_use = _cli_get_existing_server_status(host, port)
    _cli_assert_no_port_conflict(pid_port, port_in_use, host, port)
    if pid_port:
        _cli_handle_existing_server(pid_port, port_in_use, host, port, force)


# Helper: no-lock port conflict
def _cli_assert_no_port_conflict(pid_port: Optional[Tuple[int, int]], port_in_use: bool, host: str, port: int) -> None:
    if port_in_use and not pid_port:
        log.error(f"Port {host}:{port} is already in use by another application")
        sys.exit(1)
    if not pid_port and port_in_use:
        raise click.ClickException("Conflict")


# Helper: handle existing server instance
def _cli_handle_existing_server(
    pid_port: Tuple[int, int], port_in_use: bool, host: str, port: int, force: bool
) -> None:
    existing_pid, existing_port = pid_port
    try:
        proc = psutil.Process(existing_pid)
        process_exists = proc.is_running()
    except psutil.NoSuchProcess:
        log.warning(f"Found stale lock file with PID {existing_pid} that is no longer running")
        remove_lock_file_cli()
        return
    # Remove lock if process is not running
    if not process_exists:
        log.warning(f"Process with PID {existing_pid} is not running. Removing stale lock file.")
        remove_lock_file_cli()
        return
    if existing_port == port and port_in_use:
        if force:
            _cli_force_stop(proc, host, port)
        else:
            _cli_error_already_running(existing_pid, host, port)
    elif port_in_use:
        log.warning(
            f"Server running on port {existing_port} (PID: {existing_pid}), "
            f"port {port} also in use by another application"
        )
        if force:
            log.warning("--force flag only stops our server, but port is used by a different application")
        log.error("Please choose a different port.")
        sys.exit(1)


# Helper: force stop existing server
def _cli_force_stop(proc: psutil.Process, host: str, port: int) -> None:
    try:
        kill_processes_cli([proc])
        time.sleep(2)
        remove_lock_file_cli()
        if is_port_in_use(port, host):
            log.error(f"Failed to free port {port} even after stopping process. Please try a different port.")
            sys.exit(1)
    except Exception:
        log.exception("Failed to stop existing server")
        sys.exit(1)


# Helper: error message when server already running
def _cli_error_already_running(pid: int, host: str, port: int) -> None:
    log.error(f"Server is already running on {host}:{port} (PID: {pid})")
    log.info("Options:")
    log.info("  1. Use --force to stop the existing instance and start a new one:")
    log.info("     videodownloader-server start --force")
    log.info("  2. Connect to the existing instance:")
    log.info("     videodownloader-server status")
    log.info("  3. Use a different port:")
    log.info(f"     videodownloader-server start --port {port + 1}")
    log.info("  4. Stop the existing instance first:")
    log.info("     videodownloader-server stop")
    sys.exit(1)


# Execution helpers for start_server
def _cli_execute_daemon(cmd: List[str], host: str, port: int) -> None:
    """Execute server start in daemon mode."""
    try:
        process = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
        log.info(f"Attempting to start server as a daemon (PID {process.pid}). Waiting for it to become available...")
        if wait_for_server_start_cli(port, host, timeout=20):
            log.info(f"Server started as a daemon (PID {process.pid}) on {host}:{port}.")
        sys.exit(0)
    except Exception:
        log.exception("Failed to start server as daemon")


def _cli_execute_foreground(cmd: List[str], _host: str, _port: int) -> None:
    """Execute server start in foreground mode."""
    try:
        command_str = " ".join(cmd)
        log.info(f"Running server in foreground. Command: {command_str}")
        server_process = subprocess.Popen(cmd)

        server_process.wait()
    except KeyboardInterrupt:
        log.info("Server process interrupted by user (Ctrl+C in CLI). Server should handle its own cleanup.")
    except Exception:
        log.exception("Error running server in foreground")
    finally:
        log.info("Server process has terminated or CLI is exiting.")


# Helper functions for stop_server logic
def _cli_stop_pre_checks() -> List[psutil.Process]:
    """Gather processes from scan and lock file, perform initial stale lock handling."""
    initial_procs = find_server_processes_cli()
    lock_info = get_lock_pid_port_cli(LOCK_PATH)
    entities: List[psutil.Process] = []

    # Convert process info to Process objects
    for proc_info in initial_procs:
        pid = proc_info.get("pid")
        if pid is not None and isinstance(pid, int):
            try:
                proc_obj = psutil.Process(pid)
                entities.append(proc_obj)
            except Exception:
                log.warning(f"Cannot access process PID {pid}.")
    # Handle stale lock if no processes
    if not initial_procs and not (lock_info and lock_info[0]):
        log.info("No running server processes or lock file found. Nothing to stop.")
        if LOCK_PATH.exists():
            log.info(f"Removing stale lock file: {LOCK_PATH}")
            remove_lock_file_cli()
        return []
    # Include lock file PID process
    if lock_info and lock_info[0]:
        pid, _ = lock_info
        if psutil.pid_exists(pid):
            try:
                proc_obj = psutil.Process(pid)
                if proc_obj not in entities:
                    entities.append(proc_obj)
            except Exception:
                log.warning(f"Cannot add process PID {pid} from lock file.")
    return entities


def _run_stop_server_enhanced(timeout: int, force: bool) -> None:
    """Run the enhanced stop server logic with timeout handling."""
    log.info(f"Attempting to stop the server (timeout: {timeout}s, force: {force})...")

    entities = _cli_stop_pre_checks()
    if not entities:
        click.echo(" No running server found.")
        return

    # Enhanced process termination with timeout
    _cli_stop_terminate_enhanced(entities, timeout, force)
    _cli_stop_cleanup_enhanced()

    click.echo(" Server stop sequence complete.")


def _cli_stop_terminate_enhanced(entities: List[psutil.Process], timeout: int, force: bool) -> None:
    """Enhanced process termination with timeout and graceful shutdown."""
    pid_map: Dict[int, psutil.Process] = {}

    # Filter unique running processes
    for proc in entities:
        if proc.is_running() and proc.pid not in pid_map:
            pid_map[proc.pid] = proc

    procs = list(pid_map.values())
    if not procs:
        log.info("No server processes to stop after filtering.")
        return

    pids = [p.pid for p in procs]
    log.info(f"Stopping server processes: {pids}")

    if force:
        # Force kill immediately
        kill_processes_cli(procs)
        time.sleep(1)
    else:
        # Try graceful termination first
        _graceful_terminate_processes(procs, timeout)

    # Verify processes are stopped
    _verify_processes_stopped(procs)


def _graceful_terminate_processes(procs: List[psutil.Process], timeout: int) -> None:
    """Attempt graceful termination of processes with timeout."""
    log.info(f"Attempting graceful termination (timeout: {timeout}s)...")

    # Send SIGTERM to all processes
    for proc in procs:
        try:
            proc.terminate()
        except psutil.NoSuchProcess:  # noqa: PERF203
            continue

    # Wait for processes to terminate
    start_time = time.time()
    while time.time() - start_time < timeout:
        still_running = [p for p in procs if p.is_running()]
        if not still_running:
            log.info("All processes terminated gracefully.")
            return
        time.sleep(0.5)

    # Force kill remaining processes
    log.warning(f"Graceful termination timed out after {timeout}s. Force killing...")
    kill_processes_cli(procs)


def _verify_processes_stopped(procs: List[psutil.Process]) -> None:
    """Verify that all processes have been stopped."""
    still_running = [p for p in procs if p.is_running()]
    if still_running:
        pids = [p.pid for p in still_running]
        log.warning(f"Some processes may still be running: {pids}")
    else:
        log.info("All server processes have been stopped.")


def _cli_stop_cleanup_enhanced() -> None:
    """Enhanced cleanup with better lock file handling."""
    lock_info = get_lock_pid_port_cli(LOCK_PATH)
    pid = lock_info[0] if lock_info else None

    if pid and psutil.pid_exists(pid):
        log.warning(f"Lock file {LOCK_PATH} still present for PID {pid}.")
        click.echo(f"  Warning: Lock file still references running PID {pid}")
    elif LOCK_PATH.exists():
        log.info(f"Removing lock file: {LOCK_PATH}")
        remove_lock_file_cli()
        click.echo(" Lock file removed.")
    else:
        log.info("No lock file remaining.")
        click.echo(" No lock file found.")


def _run_restart_server_enhanced(
    ctx: click.Context,
    daemon: bool,
    host: Optional[str],
    port: Optional[int],
    gunicorn: bool,
    workers: Optional[int],
    verbose: bool,
    force: bool,
    timeout: int,
    preserve_state: bool,
) -> None:
    """Enhanced restart server logic with state preservation and verification."""
    click.echo(" Restarting Enhanced Video Downloader server...")

    # Preserve state if requested
    preserved_state = None
    if preserve_state:
        preserved_state = _preserve_server_state()
        click.echo(" Server state preserved for restoration.")

    # Stop the server with enhanced timeout
    click.echo("  Stopping current server instance...")
    _run_stop_server_enhanced(timeout=10, force=False)

    # Wait a moment for cleanup
    time.sleep(2)

    # Start the server with enhanced options
    click.echo("  Starting server with new configuration...")
    _run_start_server(
        ctx,
        daemon,
        host,
        port,
        None,  # Maintain current download dir setting
        gunicorn,
        workers if workers is not None else 2,
        verbose,
        force,
        timeout,
        3,  # retry_attempts
        False,  # auto_port
    )

    # Restore state if preserved
    if preserve_state and preserved_state:
        _restore_server_state(preserved_state)
        click.echo(" Server state restored.")

    # Verify restart was successful
    if _verify_restart_success(host, port, timeout):
        click.echo(" Server restart completed successfully!")
    else:
        click.echo("  Server restart completed, but verification failed.")


def _preserve_server_state() -> Optional[Dict[str, Any]]:
    """Preserve server state for restoration after restart."""
    try:
        state = {}

        # Preserve download history
        history_file = PROJECT_ROOT / "server" / "data" / "history.json"
        if history_file.exists():
            with history_file.open() as f:
                state["history"] = json.load(f)

        # Preserve active downloads (if any)
        # This would require integration with the server's download manager
        # For now, we'll preserve what we can

    except Exception:
        log.warning("Failed to preserve server state")
        return None
    else:
        return state if state else None


def _restore_server_state(state: Dict[str, Any]) -> None:
    """Restore server state after restart."""
    try:
        # Restore download history
        if "history" in state:
            history_file = PROJECT_ROOT / "server" / "data" / "history.json"
            history_file.parent.mkdir(parents=True, exist_ok=True)
            with history_file.open("w") as f:
                json.dump(state["history"], f, indent=2)

        # Restore other state as needed
        # This would require integration with the server's state management

    except Exception as e:
        log.warning(f"Failed to restore server state: {e}")


def _verify_restart_success(host: Optional[str], port: Optional[int], timeout: int) -> bool:
    """Verify that the restart was successful by checking server availability."""
    if not host or not port:
        # Use default values if not specified
        cfg = Config.load()
        host = host or cfg.host
        port = port or cfg.port

    # Ensure we have valid values
    if not host or not port:
        log.warning("Cannot verify restart: missing host or port")
        return False

    log.info(f"Verifying restart success on {host}:{port}...")

    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            if wait_for_server_start_cli(port, host, timeout=5):
                log.info("Restart verification successful.")
                return True
        except Exception:
            pass
        time.sleep(1)

    log.warning("Restart verification failed.")
    return False


def _run_server_status_enhanced(ctx: click.Context, detailed: bool, json_output: bool) -> None:
    """Enhanced server status logic with detailed information and JSON output."""
    config_file_path = ctx.obj["config_path"]

    log.debug(f"Checking server status. Config: {config_file_path}, Lock: {LOCK_PATH}")

    pid_port_from_lock = get_lock_pid_port_cli(LOCK_PATH)  # Use the new function

    if not pid_port_from_lock:
        # Check for orphaned server-like processes and list them
        orphaned_procs = find_server_processes_cli()
        if orphaned_procs:
            for p in orphaned_procs:
                click.echo(f"PID {p['pid']}, port {p['port']}, uptime {p['uptime']}s")
            sys.exit(0)
        # No processes found: inform the user
        click.echo("No running server found.")
        sys.exit(1)

    pid_from_lock, port_from_lock = pid_port_from_lock  # Unpack tuple
    log.info(f"Lock file {LOCK_PATH} exists with PID {pid_from_lock} for Port {port_from_lock}.")

    # Initialize variables for detailed status
    cpu_usage = 0.0
    mem_info = None
    disk_io = None
    status = "unknown"
    cmd_str = ""

    try:
        proc = psutil.Process(
            pid_from_lock
        )  # pid_from_lock is now guaranteed to be int if pid_port_from_lock was not None
        if not proc.is_running():
            log.warning(
                f"Server process PID {pid_from_lock} (from lock file) is not running. Lock file might be stale."
            )
            remove_lock_file_cli()
            sys.exit(1)

        cmdline = proc.cmdline() if hasattr(proc, "cmdline") else []
        status = proc.status() if hasattr(proc, "status") else "unknown"
        cmd_str = " ".join(cmdline)
        log.info(
            f"Server is RUNNING. PID: {pid_from_lock}, Port: {port_from_lock}, Status: {status}, Command: {cmd_str}"
        )

        if detailed:
            # Add detailed runtime statistics
            cpu_usage = proc.cpu_percent()
            mem_info = proc.memory_info()
            disk_io = proc.io_counters()  # type: ignore[attr-defined]
            log.info(f"CPU Usage: {cpu_usage}%")
            log.info(f"Memory Usage: {mem_info.rss} MB")
            log.info(f"Disk I/O: Read {disk_io.read_bytes} bytes, Write {disk_io.write_bytes} bytes")

    except psutil.NoSuchProcess:
        log.warning(f"Server process PID {pid_from_lock} (from lock file) does not exist. Lock file is stale.")
        remove_lock_file_cli()
        sys.exit(1)
    except psutil.AccessDenied:
        log.exception(f"Access denied when checking status of PID {pid_from_lock}. Cannot confirm server status.")
        sys.exit(2)  # Changed exit code to differentiate
    except Exception:
        log.exception("An unexpected error occurred while checking server status")
        sys.exit(3)  # Changed exit code

    if json_output:
        # Convert to JSON format
        status_dict: Dict[str, Any] = {
            "pid": pid_from_lock,
            "port": port_from_lock,
            "status": status,
            "command": cmd_str,
        }

        if detailed and mem_info and disk_io:
            status_dict["cpu_usage"] = cpu_usage
            status_dict["memory_usage"] = mem_info.rss
            status_dict["disk_io"] = {"read_bytes": disk_io.read_bytes, "write_bytes": disk_io.write_bytes}

        click.echo(json.dumps(status_dict, indent=2))
    else:
        # Show detailed status in human-readable format
        # Get host from configuration
        try:
            cfg = _cli_load_config(ctx)
            host = cfg.host
        except Exception:
            host = "localhost"  # fallback

        click.echo(" Server Status: RUNNING")
        click.echo(f"   PID: {pid_from_lock}")
        click.echo(f"   Port: {port_from_lock}")
        click.echo(f"   Status: {status}")
        click.echo(f"   Address: http://{host}:{port_from_lock}")

        if detailed and mem_info and disk_io:
            click.echo(f"   CPU Usage: {cpu_usage:.1f}%")
            click.echo(f"   Memory Usage: {mem_info.rss / 1024 / 1024:.1f} MB")
            click.echo(
                f"   Disk I/O: {disk_io.read_bytes / 1024 / 1024:.1f} MB read, "
                f"{disk_io.write_bytes / 1024 / 1024:.1f} MB written"
            )


# Command registrations - moved to bottom to ensure all functions are defined first
# Removed serve group - using direct commands instead
# Removed serve_start function - using direct start command instead


# Commands are now imported from server/cli modules


# Removed serve group commands - using direct commands instead
