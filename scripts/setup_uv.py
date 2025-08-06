#!/usr/bin/env python3
"""
Setup script for migrating to uv package manager.

This script helps users migrate from the old requirements.txt-based setup
to the new uv-based package management system.
"""

import subprocess
import sys
from pathlib import Path


def run_command(cmd, check=True, capture_output=True):
    """Run a command and return the result."""
    try:
        return subprocess.run(cmd, shell=True, check=check, capture_output=capture_output, text=True)
    except subprocess.CalledProcessError as e:
        sys.stderr.write(f"Error running command: {cmd}\n")
        sys.stderr.write(f"Error: {e}\n")
        return None


def check_uv_installed():
    """Check if uv is installed."""
    result = run_command("uv --version", check=False)
    return result is not None and result.returncode == 0


def setup_uv_environment():
    """Set up uv environment and install dependencies."""
    sys.stdout.write("Setting up uv package manager environment...\n")

    # Check if uv is installed
    if not check_uv_installed():
        sys.stdout.write("ERROR: uv is not installed. Please install uv first:\n")
        sys.stdout.write("   curl -LsSf https://astral.sh/uv/install.sh | sh\n")
        sys.stdout.write("   Or visit: https://github.com/astral-sh/uv#installation\n")
        return False

    sys.stdout.write("SUCCESS: uv is installed\n")

    # Define setup steps
    setup_steps = [
        ("Creating virtual environment", "uv venv .venv"),
        ("Installing project dependencies", "uv pip install -e ."),
        ("Installing development dependencies", 'uv pip install -e ".[dev]"'),
        ("Installing Node.js dependencies", "npm install"),
        ("Building TypeScript files", "npm run build:ts"),
    ]

    # Execute each step
    for step_name, command in setup_steps:
        sys.stdout.write(f"{step_name}...\n")
        result = run_command(command)
        if result is None:
            sys.stdout.write(f"ERROR: Failed to {step_name.lower()}\n")
            return False
        sys.stdout.write(f"SUCCESS: {step_name} completed\n")

    return True


def cleanup_old_files():
    """Remove old requirements.txt if it exists."""
    requirements_file = Path("requirements.txt")
    if requirements_file.exists():
        sys.stdout.write("Removing old requirements.txt...\n")
        requirements_file.unlink()
        sys.stdout.write("SUCCESS: Old requirements.txt removed\n")


def main():
    """Execute the main setup function."""
    sys.stdout.write("=== Enhanced Video Downloader - uv Setup ===\n")
    sys.stdout.write("\n")

    # Check if we're in the right directory
    if not Path("pyproject.toml").exists():
        sys.stdout.write("ERROR: pyproject.toml not found. Please run this script from the project root.\n")
        sys.exit(1)

    # Clean up old files
    cleanup_old_files()

    # Set up uv environment
    if setup_uv_environment():
        sys.stdout.write("\n")
        sys.stdout.write("SUCCESS: uv setup completed successfully!\n")
        sys.stdout.write("\n")
        sys.stdout.write("Next steps:\n")
        sys.stdout.write("1. Activate the virtual environment:\n")
        sys.stdout.write("   source .venv/bin/activate  # On Unix/macOS\n")
        sys.stdout.write("   .venv\\Scripts\\activate     # On Windows\n")
        sys.stdout.write("\n")
        sys.stdout.write("2. Or use direnv for automatic activation:\n")
        sys.stdout.write("   direnv allow\n")
        sys.stdout.write("\n")
        sys.stdout.write("3. Run quality checks:\n")
        sys.stdout.write("   make all\n")
        sys.stdout.write("\n")
        sys.stdout.write("4. Start development:\n")
        sys.stdout.write("   make test  # Run tests\n")
        sys.stdout.write("   make lint  # Run linting\n")
        sys.stdout.write("   make format  # Format code\n")
    else:
        sys.stdout.write("\n")
        sys.stdout.write("ERROR: uv setup failed. Please check the error messages above.\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
