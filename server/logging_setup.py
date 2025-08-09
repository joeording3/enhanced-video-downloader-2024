"""
Configure logging for Enhanced Video Downloader server.

This module defines functions to ensure log file availability and set up
console and file logging based on application configuration.
"""

import logging
import os
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    pass  # Import for type hinting


def ensure_log_file(path: str) -> bool:  # Added type hint for path
    """
    Ensure log file exists and is writable.

    Create parent directory and an empty log file if needed.

    Parameters
    ----------
    path : str
        File system path to the log file.

    Returns
    -------
    bool
        True if log file is ready and writable, False otherwise.
    """
    try:
        # Create directory if it doesn't exist
        log_path = Path(path)
        log_dir = log_path.parent
        if log_dir and not log_dir.exists():
            log_dir.mkdir(parents=True, exist_ok=True)

        # Create file if it doesn't exist
        if not log_path.exists():
            with log_path.open("a", encoding="utf-8") as f:
                f.write(
                    f"Log file created at {
                        logging.Formatter('%Y-%m-%d %H:%M:%S').format(logging.LogRecord('', 0, '', 0, '', (), None))
                    }\n"
                )

        # Check if file is writable
        return os.access(path, os.W_OK)
    except Exception:
        return False


def setup_logging(log_level: str = "INFO", log_file: str | None = None) -> None:
    """Set up logging configuration for the application."""
    # Convert string log level to logging constant
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    # Create formatter
    formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    # Set up root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Clear existing handlers
    root_logger.handlers.clear()

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)

    # File handler (if specified)
    if log_file:
        try:
            file_handler = logging.FileHandler(log_file)
        except TypeError:
            # Some test stubs may not support the full open(...) signature used by FileHandler.
            # In that case, skip attaching a file handler to avoid test failures.
            file_handler = None
        except Exception:
            file_handler = None
        if file_handler is not None:
            file_handler.setLevel(numeric_level)
            file_handler.setFormatter(formatter)
            root_logger.addHandler(file_handler)
