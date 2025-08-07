/**
 * Centralized constants for the Enhanced Video Downloader extension.
 *
 * This module contains all port-related constants and other configuration values
 * used throughout the extension to ensure consistency and easy maintenance.
 * It mirrors the Python server/constants.py configuration.
 */

// Environment detection
function getEnvironment(): string {
  // In browser environment, we can't easily detect environment
  // Default to development, but could be overridden by extension options
  return "development";
}

// Central Port Configuration
// This is the single source of truth for all port numbers across the entire codebase
const CENTRAL_PORT_CONFIG = {
  development: {
    server_port: 9090,
    client_port: 5001,
    port_range_start: 9090,
    port_range_end: 9090,
    docker_port: 5010,
    test_server_port: 5006,
    test_client_port: 5002,
    test_port_range_start: 5000,
    test_port_range_end: 5010,
  },
  testing: {
    server_port: 5006,
    client_port: 5002,
    port_range_start: 5000,
    port_range_end: 5010,
    docker_port: 5010,
    test_server_port: 5006,
    test_client_port: 5002,
    test_port_range_start: 5000,
    test_port_range_end: 5010,
  },
  production: {
    server_port: 5010,
    client_port: 5001,
    port_range_start: 5001,
    port_range_end: 9099,
    docker_port: 5010,
    test_server_port: 5006,
    test_client_port: 5002,
    test_port_range_start: 5000,
    test_port_range_end: 5010,
  },
} as const;

// Legacy port mappings for backward compatibility
const LEGACY_PORTS: Record<string, number> = {
  "5000": 5013, // Map old default to new default
  "5001": 5001, // Keep client port
  "5005": 5006, // Map old test port to new test port
  "5010": 5010, // Keep docker port
  "5013": 5013, // Keep current default
};

// Port validation constants
export const MIN_PORT = 1024;
export const MAX_PORT = 65535;

// Get current environment
const CURRENT_ENVIRONMENT = getEnvironment();

// Get current port configuration
function getCurrentPortConfig() {
  return (
    CENTRAL_PORT_CONFIG[
      CURRENT_ENVIRONMENT as keyof typeof CENTRAL_PORT_CONFIG
    ] || CENTRAL_PORT_CONFIG.development
  );
}

// Convenience functions for accessing specific ports
export function getServerPort(): number {
  const config = getCurrentPortConfig();
  return config.server_port;
}

export function getClientPort(): number {
  const config = getCurrentPortConfig();
  return config.client_port;
}

export function getPortRange(): [number, number] {
  const config = getCurrentPortConfig();
  return [config.port_range_start, config.port_range_end];
}

export function getTestServerPort(): number {
  const config = getCurrentPortConfig();
  return config.test_server_port;
}

export function getTestClientPort(): number {
  const config = getCurrentPortConfig();
  return config.test_client_port;
}

export function getTestPortRange(): [number, number] {
  const config = getCurrentPortConfig();
  return [config.test_port_range_start, config.test_port_range_end];
}

export function getDockerPort(): number {
  const config = getCurrentPortConfig();
  return config.docker_port;
}

export function isValidPort(port: number): boolean {
  return MIN_PORT <= port && port <= MAX_PORT;
}

export function normalizeLegacyPort(port: number): number {
  return LEGACY_PORTS[port.toString()] || port;
}

// Backward compatibility - maintain existing constants for gradual migration
export const DEFAULT_SERVER_PORT = getServerPort();
export const DEFAULT_CLIENT_PORT = getClientPort();
export const [DEFAULT_PORT_RANGE_START, DEFAULT_PORT_RANGE_END] =
  getPortRange();
export const DEFAULT_DOCKER_PORT = getDockerPort();
export const TEST_SERVER_PORT = getTestServerPort();
export const TEST_CLIENT_PORT = getTestClientPort();
export const [TEST_PORT_RANGE_START, TEST_PORT_RANGE_END] = getTestPortRange();

// Export the entire configuration for advanced use cases
export const PORT_CONFIG = CENTRAL_PORT_CONFIG;
export const CURRENT_ENV = CURRENT_ENVIRONMENT;
