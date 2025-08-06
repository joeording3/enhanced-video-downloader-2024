#!/usr/bin/env python3
"""
Fast Mutmut Testing Script

This script provides ultra-fast mutation testing by:
1. Testing only critical modules
2. Using aggressive timeouts
3. Skipping slow tests
4. Running in parallel with optimized settings
"""

import subprocess
import sys
import time
from pathlib import Path

# Critical modules to test (most important for mutation testing)
CRITICAL_MODULES = [
    "server/config.py",
    "server/schemas.py",
    "server/utils.py",
    "server/api/download_bp.py",
    "server/cli/download.py",
    "server/downloads/ytdlp.py",
]

# Modules to exclude (too slow or not critical)
EXCLUDE_MODULES = [
    "server/api/debug_bp.py",  # Has file system dependencies
    "tests/unit/test_property_based.py",  # Hypothesis tests are slow
    "tests/extension/test_extension_ui.py",  # UI tests have file dependencies
]


def create_fast_config():
    """Create a fast mutmut configuration."""
    config_content = """[mutmut]
# Ultra-fast configuration
paths_to_mutate=server/
backup=False
runner=python -m pytest
tests_dir=tests/

# Aggressive performance settings
max_workers=8
timeout_factor=1.5
enable_speed_report=True

# Skip slow tests and problematic modules
exclude=server/__pycache__/*,server/*.pyc,server/data/*,server/config/*.json,mutants/*,server/utils/*,server/integration/*,tests/unit/test_property_based.py,tests/extension/test_extension_ui.py,server/api/debug_bp.py

# Focus on most effective mutation operators
mutation_operators=operator,comparison,boolean

# Aggressive timeout settings
test_time_multiplier=1.0
test_time_base=30

# Skip slow test patterns
test_pattern=test_*_fast.py,test_*_unit.py
"""

    with Path("setup_fast.cfg").open("w") as f:
        f.write(config_content)

    return "setup_fast.cfg"


def run_fast_mutation_testing():
    """Run fast mutation testing on critical modules."""

    # Create fast config
    config_file = create_fast_config()

    try:
        # Run with fast settings (mutmut uses setup.cfg for configuration)
        cmd = ["mutmut", "run", "--max-children", "1"]

        start_time = time.time()

        result = subprocess.run(cmd, check=False, capture_output=True, text=True)

        end_time = time.time()
        end_time - start_time

        if result.stdout:
            pass  # Last 1000 chars

        if result.stderr:
            pass  # Last 1000 chars

        return result.returncode == 0

    finally:
        # Clean up
        if Path(config_file).exists():
            Path(config_file).unlink()


def run_single_module_test(module: str):
    """Test a single module for quick feedback."""
    # TODO: Implement module-specific testing

    cmd = ["mutmut", "run", "--max-children", "1", "--paths-to-mutate", module]

    time.time()
    result = subprocess.run(cmd, check=False, capture_output=True, text=True)
    time.time()

    return result.returncode == 0


def main():
    """Main entry point."""
    if len(sys.argv) > 1:
        if sys.argv[1] == "--single":
            if len(sys.argv) > 2:
                module = sys.argv[2]
                success = run_single_module_test(module)
                sys.exit(0 if success else 1)
            else:
                sys.exit(1)
        else:
            sys.exit(1)

    # Run fast mutation testing
    success = run_fast_mutation_testing()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
