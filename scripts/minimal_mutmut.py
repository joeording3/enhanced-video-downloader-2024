#!/usr/bin/env python3
"""
Minimal Mutmut Testing Script.

This script provides the fastest possible mutation testing by:
1. Using only unit tests (no integration tests)
2. Excluding all slow/problematic tests
3. Using minimal test patterns
4. Aggressive timeouts and parallel execution
"""

import subprocess
import sys
import time
from pathlib import Path

# Only test these specific modules (fastest and most critical)
MINIMAL_MODULES = ["server/config.py", "server/schemas.py", "server/utils.py"]


def create_minimal_config():
    """Create a minimal mutmut configuration for fastest execution."""
    config_content = """[mutmut]
# Minimal ultra-fast configuration
paths_to_mutate=server/
backup=False
runner=python -m pytest
tests_dir=tests/

# Maximum performance settings
max_workers=12
timeout_factor=1.0
enable_speed_report=True

# Exclude ALL problematic tests and modules
exclude=server/__pycache__/*,server/*.pyc,server/data/*,server/config/*.json,mutants/*,server/utils/*,server/integration/*,server/api/*,server/cli/*,server/downloads/*,tests/integration/*,tests/extension/*,tests/unit/test_property_based.py,tests/unit/test_api_*.py

# Only use fastest mutation operators
mutation_operators=operator,comparison

# Ultra-aggressive timeout settings
test_time_multiplier=0.5
test_time_base=15

# Only run unit tests with specific patterns
test_pattern=test_*_unit.py,test_*_fast.py
"""

    with Path("setup_minimal.cfg").open("w") as f:
        f.write(config_content)

    return "setup_minimal.cfg"


def run_minimal_mutation_testing():
    """Run minimal mutation testing on core modules only."""

    # Create minimal config
    config_file = create_minimal_config()

    try:
        # Run with minimal settings
        cmd = ["mutmut", "run", "--max-children", "1", "--paths-to-mutate", ",".join(MINIMAL_MODULES)]

        start_time = time.time()

        result = subprocess.run(cmd, check=False, capture_output=True, text=True)

        end_time = time.time()
        end_time - start_time

        if result.stdout:
            pass  # Last 500 chars

        if result.stderr:
            pass  # Last 500 chars

        return result.returncode == 0

    finally:
        # Clean up
        if Path(config_file).exists():
            Path(config_file).unlink()


def run_quick_test():
    """Run a very quick test to verify the setup works."""

    # Test just one simple function
    cmd = ["mutmut", "run", "--max-children", "1", "--paths-to-mutate", "server/utils.py"]

    time.time()
    result = subprocess.run(cmd, check=False, capture_output=True, text=True)
    time.time()

    return result.returncode == 0


def main():
    """Main entry point."""
    if len(sys.argv) > 1:
        if sys.argv[1] == "--quick":
            success = run_quick_test()
            sys.exit(0 if success else 1)
        else:
            sys.exit(1)

    # Run minimal mutation testing
    success = run_minimal_mutation_testing()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
