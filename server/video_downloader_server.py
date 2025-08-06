#!/usr/bin/env python3
"""
Retain legacy Flask server module for compatibility.

This file preserves the original monolithic Flask server and serves as a
compatibility shim while functionality has been refactored into modules:
  - server/__init__.py (application factory)
  - server/api/ (Blueprints)
  - server/downloads/ (download logic)
  - server/config.py (configuration management)
  - server/utils.py (utility functions)
  - server/history.py (history management)
  - server/extraction_rules.py
  - server/cli.py (CLI commands)
  - server/__main__.py (entry point)

It may be removed once refactoring is fully validated.
"""

# All substantive code, including Flask app initialization, routes,
# utility functions (like sanitize_filename, load_config, etc.),
# download option building (like build_opts), and the main execution block,
# has been moved to the respective modules mentioned above.
