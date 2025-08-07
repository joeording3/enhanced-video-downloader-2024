#!/usr/bin/env python3
"""
Setup script to initialize a development environment for Enhanced Video Downloader.

This script:
1. Creates a virtual environment if it doesn't exist
2. Installs required dependencies
3. Sets up pre-commit hooks
4. Configures linting tools
"""

import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
# Prefer existing .venv directory for virtual environment, else use "venv"
venv_candidate = ROOT_DIR / ".venv"
VENV_DIR = venv_candidate if venv_candidate.exists() else ROOT_DIR / "venv"
REQUIREMENTS = ROOT_DIR / "requirements.txt"
DEV_PKGS = [
    "black",
    "flake8",
    "flake8-docstrings",
    "flake8-bugbear",
    "pylint",
    "pytest",
    "pytest-cov",
    "ruff",
]


def run_cmd(cmd: list[str], cwd: Path | None = None, exit_on_error: bool = True) -> bool:
    """Run a command in a subprocess and handle errors."""
    try:
        subprocess.run(cmd, check=True, cwd=cwd or ROOT_DIR)
        return True
    except subprocess.CalledProcessError:
        if exit_on_error:
            sys.exit(1)
        return False
    else:
        return True


def setup_venv() -> tuple[Path, Path]:
    """Create and activate a virtual environment."""
    if not VENV_DIR.exists():
        run_cmd([sys.executable, "-m", "venv", str(VENV_DIR)])
    else:
        pass

    # Determine the appropriate pip and python within the venv
    if sys.platform == "win32":
        pip_path = VENV_DIR / "Scripts" / "pip"
        python_path = VENV_DIR / "Scripts" / "python"
    else:
        pip_path = VENV_DIR / "bin" / "pip"
        python_path = VENV_DIR / "bin" / "python"

    # Upgrade pip
    run_cmd([str(pip_path), "install", "--upgrade", "pip"])

    # Install requirements
    if REQUIREMENTS.exists():
        run_cmd([str(pip_path), "install", "-r", str(REQUIREMENTS)])

    # Install development packages
    run_cmd([str(pip_path), "install", *DEV_PKGS])

    return pip_path, python_path


def setup_npm() -> None:
    """Install npm dependencies."""
    if Path(ROOT_DIR / "package.json").exists():
        run_cmd(["npm", "install"], exit_on_error=False)
        run_cmd(["npm", "run", "prepare"], exit_on_error=False)
    else:
        pass


def setup_hooks() -> None:
    """Set up git hooks."""
    hooks_dir = ROOT_DIR / ".git" / "hooks"
    husky_dir = ROOT_DIR / ".husky"

    if hooks_dir.exists() and husky_dir.exists():
        for hook in husky_dir.glob("*"):
            if not hook.name.startswith("_") and hook.is_file():
                hook.chmod(0o755)  # Make executable
    else:
        pass


def configure_tests() -> None:
    """Set up testing configuration if it doesn't exist."""
    tests_dir = ROOT_DIR / "tests"

    if not tests_dir.exists():
        tests_dir.mkdir(exist_ok=True)

    conftest_file = tests_dir / "conftest.py"
    if not conftest_file.exists():
        with conftest_file.open("w") as f:
            f.write(
                '''"""
Pytest configuration file for Enhanced Video Downloader.

This file contains fixtures and configuration for pytest.
"""

import sys
import pytest

# Add the parent directory to sys.path to allow importing from the server directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

@pytest.fixture
def sample_video_url():
    """Return a sample video URL for testing."""
    return "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
'''
            )


def main() -> None:
    """Run the setup script."""

    # Setup virtual environment
    pip_path, python_path = setup_venv()

    # Setup npm dependencies
    setup_npm()

    # Setup git hooks
    setup_hooks()

    # Configure testing
    configure_tests()

    if sys.platform == "win32":
        pass
    else:
        pass


if __name__ == "__main__":
    main()
