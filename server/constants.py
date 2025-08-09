"""
Centralized constants for the Enhanced Video Downloader server.

This module contains all port-related constants and other configuration values
used throughout the application to ensure consistency and easy maintenance.
"""

import os
from typing import Any


# Environment detection
def get_environment() -> str:
    """
    Determine the current environment.

    :returns: Environment name ('development', 'testing', 'production')
    """
    env = os.getenv("ENVIRONMENT", "development").lower()
    if env in ["development", "testing", "production"]:
        return env
    return "development"


# Central Port Configuration
# This is the single source of truth for all port numbers across the entire codebase
CENTRAL_PORT_CONFIG = {
    "development": {
        "server_port": 9090,
        "client_port": 5001,
        "port_range_start": 9090,
        "port_range_end": 9090,
        "docker_port": 5010,
        "test_server_port": 5006,
        "test_client_port": 5002,
        "test_port_range_start": 5000,
        "test_port_range_end": 5010,
    },
    "testing": {
        "server_port": 5006,
        "client_port": 5002,
        "port_range_start": 5000,
        "port_range_end": 5010,
        "docker_port": 5010,
        "test_server_port": 5006,
        "test_client_port": 5002,
        "test_port_range_start": 5000,
        "test_port_range_end": 5010,
    },
    "production": {
        "server_port": 5010,
        "client_port": 5001,
        "port_range_start": 5001,
        "port_range_end": 9099,
        "docker_port": 5010,
        "test_server_port": 5006,
        "test_client_port": 5002,
        "test_port_range_start": 5000,
        "test_port_range_end": 5010,
    },
}


# Port validation constants
MIN_PORT = 1024
MAX_PORT = 65535

# Get current environment
CURRENT_ENVIRONMENT = get_environment()


# Get current port configuration
def get_current_port_config() -> dict[str, Any]:
    """
    Get the port configuration for the current environment.

    :returns: Dictionary containing port configuration for current environment
    """
    return CENTRAL_PORT_CONFIG.get(CURRENT_ENVIRONMENT, CENTRAL_PORT_CONFIG["development"])


# Convenience functions for accessing specific ports
def get_server_port() -> int:
    """
    Get the default server port for the current environment.

    :returns: Default server port number
    """
    config = get_current_port_config()
    return config["server_port"]


def get_client_port() -> int:
    """
    Get the default client port for the current environment.

    :returns: Default client port number
    """
    config = get_current_port_config()
    return config["client_port"]


def get_port_range() -> "tuple[int, int]":
    """
    Get the port range for the current environment.

    :returns: Tuple of (start_port, end_port)
    """
    config = get_current_port_config()
    return config["port_range_start"], config["port_range_end"]


def get_test_server_port() -> int:
    """
    Get the test server port for the current environment.

    :returns: Test server port number
    """
    config = get_current_port_config()
    return config["test_server_port"]


def get_test_client_port() -> int:
    """
    Get the test client port for the current environment.

    :returns: Test client port number
    """
    config = get_current_port_config()
    return config["test_client_port"]


def get_test_port_range() -> "tuple[int, int]":
    """
    Get the test port range for the current environment.

    :returns: Tuple of (test_start_port, test_end_port)
    """
    config = get_current_port_config()
    return config["test_port_range_start"], config["test_port_range_end"]


def get_docker_port() -> int:
    """
    Get the docker port for the current environment.

    :returns: Docker port number
    """
    config = get_current_port_config()
    return config["docker_port"]


def is_valid_port(port: int) -> bool:
    """
    Check if a port number is valid.

    :param port: Port number to validate
    :returns: True if port is valid, False otherwise
    """
    return MIN_PORT <= port <= MAX_PORT


# Legacy normalization removed; use current centralized config exclusively


# Backward compatibility - maintain existing constants for gradual migration
DEFAULT_SERVER_PORT = get_server_port()
DEFAULT_CLIENT_PORT = get_client_port()
DEFAULT_PORT_RANGE_START, DEFAULT_PORT_RANGE_END = get_port_range()
DEFAULT_DOCKER_PORT = get_docker_port()
TEST_SERVER_PORT = get_test_server_port()
TEST_CLIENT_PORT = get_test_client_port()
TEST_PORT_RANGE_START, TEST_PORT_RANGE_END = get_test_port_range()

# Deprecated environment-specific helpers removed; rely on get_current_port_config()
