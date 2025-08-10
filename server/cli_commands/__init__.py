"""CLI subcommands package for Enhanced Video Downloader server."""

# CLI subcommands package for server

# lifecycle module removed; expose only maintained commands
from .status import status
from .system_maintenance import system_maintenance

__all__ = [
    "status",
    "system_maintenance",
]
