// @ts-nocheck
"use strict";
/**
 * Centralized constants for the Enhanced Video Downloader extension.
 *
 * This module contains all port-related constants and other configuration values
 * used throughout the extension to ensure consistency and easy maintenance.
 * It mirrors the Python server/constants.py configuration.
 */
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENT_ENV = exports.PORT_CONFIG = exports.TEST_PORT_RANGE_END = exports.TEST_PORT_RANGE_START = exports.TEST_CLIENT_PORT = exports.TEST_SERVER_PORT = exports.DEFAULT_DOCKER_PORT = exports.DEFAULT_PORT_RANGE_END = exports.DEFAULT_PORT_RANGE_START = exports.DEFAULT_CLIENT_PORT = exports.DEFAULT_SERVER_PORT = exports.MAX_PORT = exports.MIN_PORT = void 0;
exports.getServerPort = getServerPort;
exports.getClientPort = getClientPort;
exports.getPortRange = getPortRange;
exports.getTestServerPort = getTestServerPort;
exports.getTestClientPort = getTestClientPort;
exports.getTestPortRange = getTestPortRange;
exports.getDockerPort = getDockerPort;
exports.isValidPort = isValidPort;
exports.normalizeLegacyPort = normalizeLegacyPort;
// Environment detection
function getEnvironment() {
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
};
// Legacy port mappings for backward compatibility
const LEGACY_PORTS = {
    "5000": 5013, // Map old default to new default
    "5001": 5001, // Keep client port
    "5005": 5006, // Map old test port to new test port
    "5010": 5010, // Keep docker port
    "5013": 5013, // Keep current default
};
// Port validation constants
exports.MIN_PORT = 1024;
exports.MAX_PORT = 65535;
// Get current environment
const CURRENT_ENVIRONMENT = getEnvironment();
// Get current port configuration
function getCurrentPortConfig() {
    return (CENTRAL_PORT_CONFIG[CURRENT_ENVIRONMENT] || CENTRAL_PORT_CONFIG.development);
}
// Convenience functions for accessing specific ports
function getServerPort() {
    const config = getCurrentPortConfig();
    return config.server_port;
}
function getClientPort() {
    const config = getCurrentPortConfig();
    return config.client_port;
}
function getPortRange() {
    const config = getCurrentPortConfig();
    return [config.port_range_start, config.port_range_end];
}
function getTestServerPort() {
    const config = getCurrentPortConfig();
    return config.test_server_port;
}
function getTestClientPort() {
    const config = getCurrentPortConfig();
    return config.test_client_port;
}
function getTestPortRange() {
    const config = getCurrentPortConfig();
    return [config.test_port_range_start, config.test_port_range_end];
}
function getDockerPort() {
    const config = getCurrentPortConfig();
    return config.docker_port;
}
function isValidPort(port) {
    return exports.MIN_PORT <= port && port <= exports.MAX_PORT;
}
function normalizeLegacyPort(port) {
    return LEGACY_PORTS[port.toString()] || port;
}
// Backward compatibility - maintain existing constants for gradual migration
exports.DEFAULT_SERVER_PORT = getServerPort();
exports.DEFAULT_CLIENT_PORT = getClientPort();
_a = getPortRange(), exports.DEFAULT_PORT_RANGE_START = _a[0], exports.DEFAULT_PORT_RANGE_END = _a[1];
exports.DEFAULT_DOCKER_PORT = getDockerPort();
exports.TEST_SERVER_PORT = getTestServerPort();
exports.TEST_CLIENT_PORT = getTestClientPort();
_b = getTestPortRange(), exports.TEST_PORT_RANGE_START = _b[0], exports.TEST_PORT_RANGE_END = _b[1];
// Export the entire configuration for advanced use cases
exports.PORT_CONFIG = CENTRAL_PORT_CONFIG;
exports.CURRENT_ENV = CURRENT_ENVIRONMENT;
