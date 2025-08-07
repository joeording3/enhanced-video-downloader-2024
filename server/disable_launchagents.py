#!/usr/bin/env python3
"""
Script to permanently disable LaunchAgents for the Video Downloader server.

This will prevent the server from auto-starting at login or system boot.
"""

import logging
import os
import subprocess
from pathlib import Path

# Import central logging setup
from server.logging_setup import setup_logging

# Set up logging using central configuration
setup_logging(log_level="INFO")
log = logging.getLogger(__name__)


def find_video_downloader_agents(include_system: bool = False) -> list[str]:
    """Find all LaunchAgent plist files related to the video downloader.

    Args:
        include_system: If True, also search system directories. Defaults to False.

    Returns:
        List[str]: Paths to LaunchAgent plist files as strings
    """
    agents: list[str] = []

    # Common locations for LaunchAgents
    locations = [str(Path("~/Library/LaunchAgents").expanduser())]

    if include_system:
        locations.extend(
            [
                "/Library/LaunchAgents",
                "/Library/LaunchDaemons",
            ]
        )

    log.info("Searching for Video Downloader LaunchAgents...")

    for location in locations:
        if not Path(location).exists():
            continue

        for file_path in Path(location).iterdir():
            file_name = file_path.name
            if (
                "video_downloader" in file_name.lower()
                or "enhanced" in file_name.lower()
                or "joeording" in file_name.lower()
                or "josephording" in file_name.lower()
            ):
                full_path = str(file_path)
                agents.append(full_path)
                log.info(f"Found: {full_path}")

    return agents


# Helper to retrieve LaunchAgent label from plist file
def get_agent_label(agent_path: str) -> str | None:
    """Retrieve the LaunchAgent label from a plist file.

    Args:
        agent_path: Path to the LaunchAgent plist file.

    Returns:
        The agent label as a string, or None if the label cannot be read.
    """
    try:
        return subprocess.check_output(["defaults", "read", agent_path, "Label"], text=True).strip()
    except subprocess.CalledProcessError:
        log.exception("Failed to read Label from {agent_path}")
    except Exception:
        log.exception("Unexpected error reading Label from {agent_path}")
    return None


# Helper to stop and unload a LaunchAgent
def stop_and_unload_agent(label: str, agent_path: str, is_root: bool) -> None:
    """Stop and unload a LaunchAgent service.

    Args:
        label: The LaunchAgent label.
        agent_path: Path to the LaunchAgent plist file.
        is_root: Whether the operation is being performed as root.
    """
    log.info(f"  Agent label: {label}")
    # Stop service
    try:
        log.info("  Stopping service...")
        subprocess.run(["launchctl", "stop", label], check=True)
    except subprocess.CalledProcessError:
        log.exception("Failed to stop service {label}")
    # Unload service
    if is_root:
        domain = "system" if "/Library/LaunchDaemons" in agent_path else "user/$(id -u)"
        log.info(f"  Using bootout as root to unload from {domain}...")
        subprocess.run(["launchctl", "bootout", f"{domain}/{label}"], check=False)
    else:
        log.info("  Unloading service...")
        subprocess.run(["launchctl", "unload", agent_path], check=False)


# Helper to rename a LaunchAgent plist file to disable it
def rename_agent(agent_path: str) -> None:
    """Rename a LaunchAgent plist file to disable it.

    Args:
        agent_path: Path to the LaunchAgent plist file to disable.
    """
    try:
        disabled_path = agent_path + ".DISABLED"
        log.info(f"  Renaming {agent_path} to {disabled_path}...")
        Path(agent_path).rename(disabled_path)
        log.info("   Successfully disabled")
    except PermissionError:
        log.exception("   Permission denied. Try running with sudo.")
    except Exception:
        log.exception("   Error disabling agent {agent_path}")


def disable_agents(agents: list[str]) -> None:
    """Permanently disable the identified LaunchAgents.

    Args:
        agents: List of paths to LaunchAgent plist files
    """
    if not agents:
        log.info("No LaunchAgents found to disable.")
        return

    is_root = os.geteuid() == 0

    for agent_path in agents:
        log.info(f"\nProcessing: {agent_path}")

        # Validate paths before operations
        if not Path(agent_path).exists():
            log.error(f"Path does not exist: {agent_path}")
            continue

        # Retrieve label and stop/unload service
        label = get_agent_label(agent_path)
        if label:
            stop_and_unload_agent(label, agent_path, is_root)
        else:
            log.error(f"  Could not determine agent label for {agent_path}")

        # Disable agent by renaming plist file
        rename_agent(agent_path)


def main() -> None:
    """Disable video downloader LaunchAgents."""
    # Logging is already configured at module level

    # Find all relevant agents
    agents = find_video_downloader_agents(include_system=True)

    if not agents:
        return

    # Check if we need root
    needs_root = any("/Library/" in agent for agent in agents)
    is_root = os.geteuid() == 0

    if needs_root and not is_root:
        response = input("Continue with user-level agents only? (y/n): ")
        if response.lower() != "y":
            return

    # Disable the agents
    disable_agents(agents)


if __name__ == "__main__":
    main()
