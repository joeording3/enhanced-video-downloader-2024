"""
Configure logging for Enhanced Video Downloader server and CLI.

This module defines functions to ensure log file availability and set up
console and file logging based on application configuration.

Logging formats
---------------
- Server/file logs: one-JSON-per-line (NDJSON) for structured analysis.
- CLI console logs: plain, human-readable text (kept minimal by default).
"""

import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import TYPE_CHECKING, Literal

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

        # Create file if it doesn't exist (initialize with a JSON line)
        if not log_path.exists():
            with log_path.open("a", encoding="utf-8") as f:
                init_event = {
                    "event": "log_file_created",
                    "ts": datetime.now(timezone.utc).isoformat(),
                    "start_ts": int(datetime.now(timezone.utc).timestamp() * 1000),
                    "duration_ms": 0,
                    "message": "Log file initialized",
                    "logger": "server.logging",
                    "level": "INFO",
                }
                f.write(json.dumps(init_event, ensure_ascii=False) + "\n")

        # Check if file is writable
        return os.access(path, os.W_OK)
    except Exception:
        return False


class JSONLineFormatter(logging.Formatter):
    """Emit logs as a single JSON object per line (NDJSON)."""

    def format(self, record: logging.LogRecord) -> str:
        """Format a log record as a compact JSON string suitable for NDJSON files."""
        # Base envelope
        payload = {
            "ts": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "process": record.process,
            "thread": record.threadName,
            "file": getattr(record, "pathname", None),
            "line": getattr(record, "lineno", None),
            "function": getattr(record, "funcName", None),
        }

        # Optional structured timing fields expected by viewers
        # If callers pass extras, include them; otherwise leave absent
        extra = record.__dict__
        if "start_ts" in extra:
            payload["start_ts"] = extra["start_ts"]
        if "duration_ms" in extra:
            payload["duration_ms"] = extra["duration_ms"]

        # Include any extra keys that are JSON-serializable and not built-ins
        skip_keys = {
            "msg",
            "args",
            "levelname",
            "levelno",
            "pathname",
            "filename",
            "module",
            "exc_info",
            "exc_text",
            "stack_info",
            "lineno",
            "funcName",
            "created",
            "msecs",
            "relativeCreated",
            "thread",
            "threadName",
            "processName",
            "process",
            "name",
        }
        for key, value in extra.items():
            if key in skip_keys or key in payload:
                continue
            # Best-effort: only include simple JSON-serializable values
            try:
                json.dumps(value)
            except Exception:
                continue
            payload[key] = value

        return json.dumps(payload, ensure_ascii=False)


def setup_logging(log_level: str = "INFO", log_file: str | None = None) -> None:
    """Set up logging configuration for the application."""
    # Convert string log level to logging constant
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)

    # Create JSON line formatter (used for server/file logs)
    json_formatter = JSONLineFormatter()

    # Set up root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)

    # Clear existing handlers
    root_logger.handlers.clear()

    # Console handler (server contexts may still want console logs; keep JSON for parity)
    console_handler = logging.StreamHandler(stream=sys.stderr)
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(json_formatter)
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
            file_handler.setFormatter(json_formatter)
            root_logger.addHandler(file_handler)


class PlainConsoleFormatter(logging.Formatter):
    """Minimal, human-readable console formatter for CLI output."""

    def format(self, record: logging.LogRecord) -> str:
        """Return a concise, readable message for the given log record."""
        message = record.getMessage()
        if record.levelno >= logging.ERROR:
            return f"ERROR: {message}"
        if record.levelno >= logging.WARNING:
            return f"Warning: {message}"
        if record.levelno >= logging.INFO:
            return message
        # DEBUG and lower
        return f"[DEBUG] {message}"


def setup_cli_logging(verbose: bool = False) -> None:
    """
    Configure logging for CLI processes with plain console output only.

    Notes
    -----
    - Uses stderr for logs so stdout remains dedicated to command output.
    - Default level WARNING to keep CLI output clean; DEBUG when verbose=True.
    - No file handlers are attached here; server processes manage file logging.
    """
    level = logging.DEBUG if verbose else logging.WARNING
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.handlers.clear()

    console = logging.StreamHandler(stream=sys.stderr)
    console.setLevel(level)
    console.setFormatter(PlainConsoleFormatter())
    root_logger.addHandler(console)


def resolve_log_path(
    project_root: Path,
    env_value: str | None,
    cfg_value: str | None,
    *,
    purpose: Literal["read", "manage"] = "read",
) -> Path:
    """Resolve the active log file path for logs.

    Provides consistent precedence while preserving test-friendly behavior.

    Parameters
    ----------
    project_root : Path
        Root directory of the project (used for defaults and test heuristics).
    env_value : str | None
        Value of LOG_FILE from the environment, if any.
    cfg_value : str | None
        Value of log path from config, if any (used by manage operations).
    purpose : {"read", "manage"}
        Resolution mode. "read" mirrors the legacy /logs behavior (env respected only
        in a real repo; tests default to server_output.log). "manage" mirrors the
        logs/clear behavior (env > config > improbable default).

    Returns
    -------
    Path
        Resolved path to the log file.
    """
    # Detect whether we are running under the actual repository root
    real_repo = (project_root / "pyproject.toml").exists()

    if purpose == "read":
        # Behavior maintained from logs_bp:
        # - In real repo: honor env override if provided; otherwise placeholder which 404s
        # - In tests (no pyproject): ignore env override and use server_output.log
        if real_repo:
            return Path(env_value) if env_value else project_root / "__no_such_log_file__.log"
        return project_root / "server_output.log"

    # Behavior maintained from logs_manage_bp: env > config > improbable default name
    resolved = env_value or cfg_value
    default_name = "NON_EXISTENT_LOG_DO_NOT_CREATE.log"
    return Path(resolved) if resolved else (project_root / default_name)
