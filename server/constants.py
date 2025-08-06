"""
Centralized constants for the Enhanced Video Downloader server.

This module contains all port-related constants and other configuration values
used throughout the application to ensure consistency and easy maintenance.
"""

import os
from typing import Any, Dict


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
        "server_port": 5013,
        "client_port": 5001,
        "port_range_start": 5001,
        "port_range_end": 9099,
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

# Legacy port mappings for backward compatibility
LEGACY_PORTS = {
    "5000": 5013,  # Map old default to new default
    "5001": 5001,  # Keep client port
    "5005": 5006,  # Map old test port to new test port
    "5010": 5010,  # Keep docker port
    "5013": 5013,  # Keep current default
}

# Port validation constants
MIN_PORT = 1024
MAX_PORT = 65535

# Get current environment
CURRENT_ENVIRONMENT = get_environment()


# Get current port configuration
def get_current_port_config() -> Dict[str, Any]:
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


def normalize_legacy_port(port: int) -> int:
    """
    Normalize legacy port numbers to current defaults.

    :param port: Legacy port number
    :returns: Normalized port number
    """
    return LEGACY_PORTS.get(str(port), port)


# Backward compatibility - maintain existing constants for gradual migration
DEFAULT_SERVER_PORT = get_server_port()
DEFAULT_CLIENT_PORT = get_client_port()
DEFAULT_PORT_RANGE_START, DEFAULT_PORT_RANGE_END = get_port_range()
DEFAULT_DOCKER_PORT = get_docker_port()
TEST_SERVER_PORT = get_test_server_port()
TEST_CLIENT_PORT = get_test_client_port()
TEST_PORT_RANGE_START, TEST_PORT_RANGE_END = get_test_port_range()

# Environment-specific port mappings (deprecated - use get_current_port_config() instead)
PORT_CONFIG = {
    "development": {
        "server_port": DEFAULT_SERVER_PORT,
        "client_port": DEFAULT_CLIENT_PORT,
        "port_range_start": DEFAULT_PORT_RANGE_START,
        "port_range_end": DEFAULT_PORT_RANGE_END,
    },
    "testing": {
        "server_port": TEST_SERVER_PORT,
        "client_port": TEST_CLIENT_PORT,
        "port_range_start": TEST_PORT_RANGE_START,
        "port_range_end": TEST_PORT_RANGE_END,
    },
    "production": {
        "server_port": DEFAULT_DOCKER_PORT,
        "client_port": DEFAULT_CLIENT_PORT,
        "port_range_start": DEFAULT_PORT_RANGE_START,
        "port_range_end": DEFAULT_PORT_RANGE_END,
    },
}


# Legacy functions for backward compatibility
def get_port_config(environment: str = "development") -> dict:
    """
    Get port configuration for the specified environment.

    :param environment: Environment name ('development', 'testing', 'production')
    :returns: Dictionary containing port configuration for the environment
    """
    return PORT_CONFIG.get(environment, PORT_CONFIG["development"])


def get_default_server_port(environment: str = "development") -> int:
    """
    Get the default server port for the specified environment.

    :param environment: Environment name ('development', 'testing', 'production')
    :returns: Default server port number
    """
    config = get_port_config(environment)
    return config["server_port"]


def get_default_client_port(environment: str = "development") -> int:
    """
    Get the default client port for the specified environment.

    :param environment: Environment name ('development', 'testing', 'production')
    :returns: Default client port number
    """
    config = get_port_config(environment)
    return config["client_port"]


def get_port_range_for_env(environment: str = "development") -> "tuple[int, int]":
    """
    Get the port range for the specified environment.

    :param environment: Environment name ('development', 'testing', 'production')
    :returns: Tuple of (start_port, end_port)
    """
    config = get_port_config(environment)
    return config["port_range_start"], config["port_range_end"]
