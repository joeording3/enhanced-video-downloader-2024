// @ts-nocheck
"use strict";
/**
 * Enhanced Video Downloader - Centralized Constants
 * Eliminates duplicate constants across the codebase
 */
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CURRENT_ENV = exports.PORT_CONFIG = exports.TEST_PORT_RANGE_END = exports.TEST_PORT_RANGE_START = exports.TEST_CLIENT_PORT = exports.TEST_SERVER_PORT = exports.DEFAULT_DOCKER_PORT = exports.DEFAULT_PORT_RANGE_END = exports.DEFAULT_PORT_RANGE_START = exports.DEFAULT_CLIENT_PORT = exports.DEFAULT_SERVER_PORT = exports.MAX_PORT = exports.MIN_PORT = exports.NOTIFICATION_MESSAGES = exports.SUCCESS_MESSAGES = exports.ERROR_MESSAGES = exports.STATUS_CONSTANTS = exports.THEME_CONSTANTS = exports.MESSAGE_TYPES = exports.CSS_CLASSES = exports.DOM_SELECTORS = exports.CONFIG_CONSTANTS = exports.NETWORK_CONSTANTS = exports.UI_CONSTANTS = exports.STORAGE_KEYS = void 0;
exports.getServerPort = getServerPort;
exports.getClientPort = getClientPort;
exports.getPortRange = getPortRange;
exports.getTestServerPort = getTestServerPort;
exports.getTestClientPort = getTestClientPort;
exports.getTestPortRange = getTestPortRange;
exports.getDockerPort = getDockerPort;
exports.isValidPort = isValidPort;
exports.normalizeLegacyPort = normalizeLegacyPort;
exports.getNotificationMessage = getNotificationMessage;
exports.getStorageKey = getStorageKey;
exports.getCSSSelector = getCSSSelector;
exports.getMessageType = getMessageType;
// ============================================================================
// STORAGE KEYS
// ============================================================================
exports.STORAGE_KEYS = {
    // Server configuration
    SERVER_CONFIG: "serverConfig",
    SERVER_PORT: "serverPort",
    SERVER_STATUS: "serverOnlineStatus",
    NETWORK_STATUS: "networkOnlineStatus",
    // Download management
    DOWNLOAD_HISTORY: "downloadHistory",
    DOWNLOAD_QUEUE: "downloadQueue",
    // UI configuration
    THEME: "theme",
    BUTTON_STATE: "buttonState",
    HISTORY_ENABLED: "isHistoryEnabled",
};
// ============================================================================
// UI CONSTANTS
// ============================================================================
exports.UI_CONSTANTS = {
    // Button configuration
    BUTTON_ID_PREFIX: "evd-download-button-",
    DRAG_HANDLE_CLASS: "evd-drag-handle",
    BUTTON_TEXT: "DOWNLOAD",
    // Interaction thresholds
    CLICK_THRESHOLD: 200, // Max time in ms to be considered a click
    DEBOUNCE_DELAY: 300, // Debounce delay for UI updates
    // Video detection
    MIN_VIDEO_WIDTH: 200,
    MIN_VIDEO_HEIGHT: 150,
    VIDEO_CHECK_INTERVAL: 2000, // Interval for checking for new videos
    MAX_VIDEO_CHECKS: 5, // Maximum number of checks if no videos are found initially
    // Element creation
    DEFAULT_Z_INDEX: "2147483647", // Maximum z-index value
};
// ============================================================================
// NETWORK CONSTANTS
// ============================================================================
exports.NETWORK_CONSTANTS = {
    // Server communication
    SERVER_CHECK_TIMEOUT: 2000, // Timeout for individual port status checks (ms)
    SERVER_CHECK_INTERVAL: 5000, // ms, for periodic server status checks
    MAX_PORT_BACKOFF_INTERVAL: 60000, // Cap at 1 minute
    // API endpoints
    HEALTH_ENDPOINT: "/health",
    CONFIG_ENDPOINT: "/api/config",
    RESTART_ENDPOINT: "/api/restart",
    DOWNLOAD_ENDPOINT: "/api/download",
    // Server base URL
    SERVER_BASE_URL: "http://127.0.0.1",
};
// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================
exports.CONFIG_CONSTANTS = {
    // Config refresh
    CONFIG_REFRESH_INTERVAL_COUNT: 6, // Refresh config every 6 * 5s = 30s
    // Port discovery
    BATCH_SIZE: 5, // Number of ports to check in parallel
    // History pagination
    DEFAULT_PAGE_SIZE: 10,
    MAX_HISTORY_ITEMS: 100,
};
// ============================================================================
// DOM SELECTORS
// ============================================================================
exports.DOM_SELECTORS = {
    // Video detection
    VIDEO_SELECTORS: [
        "video",
        'iframe[src*="youtube.com"]',
        'iframe[src*="vimeo.com"]',
        'iframe[src*="dailymotion.com"]',
        'iframe[src*="twitch.tv"]',
    ].join(", "),
    // UI elements
    STATUS_INDICATOR: "#server-status-indicator",
    STATUS_TEXT: "#server-status-text",
    SETTINGS_BUTTON: "#open-settings",
    DOWNLOAD_STATUS: "#download-status",
    CONFIG_ERROR_DISPLAY: "#config-error-display",
    SERVER_PORT_DISPLAY: "#server-port-display",
    DOWNLOAD_DIR_DISPLAY: "#download-dir-display",
};
// ============================================================================
// CSS CLASSES
// ============================================================================
exports.CSS_CLASSES = {
    // Button states
    DOWNLOAD_SENDING: "download-sending",
    DOWNLOAD_SUCCESS: "download-success",
    DOWNLOAD_ERROR: "download-error",
    // UI states
    HIDDEN: "hidden",
    DRAG_HANDLE: "evd-drag-handle",
    DOWNLOAD_BUTTON: "download-button",
};
// ============================================================================
// MESSAGE TYPES
// ============================================================================
exports.MESSAGE_TYPES = {
    // Download operations
    DOWNLOAD_VIDEO: "downloadVideo",
    GET_QUEUE: "getQueue",
    CLEAR_HISTORY: "clearHistory",
    TOGGLE_HISTORY: "toggleHistory",
    GET_HISTORY: "getHistory",
    SET_CONFIG: "setConfig",
    // Server operations
    GET_SERVER_STATUS: "getServerStatus",
    RESTART_SERVER: "restartServer",
    PAUSE_DOWNLOAD: "pauseDownload",
    RESUME_DOWNLOAD: "resumeDownload",
    CANCEL_DOWNLOAD: "cancelDownload",
    // UI updates
    SERVER_STATUS_UPDATE: "serverStatusUpdate",
    SERVER_DISCOVERED: "serverDiscovered",
};
// ============================================================================
// THEME CONSTANTS
// ============================================================================
exports.THEME_CONSTANTS = {
    LIGHT: "light",
    DARK: "dark",
    DEFAULT: "light",
};
// ============================================================================
// STATUS CONSTANTS
// ============================================================================
exports.STATUS_CONSTANTS = {
    // Server status
    CONNECTED: "connected",
    DISCONNECTED: "disconnected",
    CHECKING: "checking",
    // Download status
    QUEUED: "queued",
    DOWNLOADING: "downloading",
    COMPLETED: "completed",
    FAILED: "failed",
    PAUSED: "paused",
    CANCELLED: "cancelled",
};
// ============================================================================
// ERROR MESSAGES
// ============================================================================
exports.ERROR_MESSAGES = {
    // Server errors
    SERVER_NOT_AVAILABLE: "Server not available",
    SERVER_NOT_FOUND: "Server not found",
    SERVER_CHECK_FAILED: "Server check failed",
    SERVER_TIMEOUT: "Server check timeout",
    // Download errors
    DOWNLOAD_FAILED: "Download failed",
    INVALID_URL: "Invalid URL format",
    BLOB_URL_FALLBACK: "Using page URL instead of blob URL",
    // Storage errors
    STORAGE_ERROR: "Failed to access storage",
    CONFIG_LOAD_ERROR: "Failed to load configuration",
    CONFIG_SAVE_ERROR: "Failed to save configuration",
    // UI errors
    ELEMENT_NOT_FOUND: "Element not found",
    INJECTION_FAILED: "Failed to inject element",
};
// ============================================================================
// SUCCESS MESSAGES
// ============================================================================
exports.SUCCESS_MESSAGES = {
    // Server messages
    SERVER_CONNECTED: "Server Connected",
    SERVER_DISCONNECTED: "Server Disconnected",
    // Download messages
    DOWNLOAD_STARTED: "Download started",
    DOWNLOAD_COMPLETED: "Download completed",
    DOWNLOAD_PAUSED: "Download paused",
    DOWNLOAD_RESUMED: "Download resumed",
    DOWNLOAD_CANCELLED: "Download cancelled",
    // Configuration messages
    CONFIG_SAVED: "Configuration saved",
    THEME_UPDATED: "Theme updated",
};
// ============================================================================
// NOTIFICATION MESSAGES
// ============================================================================
exports.NOTIFICATION_MESSAGES = {
    // Server notifications
    SERVER_CONNECTED_DETAIL: "Enhanced Video Downloader server is now online on port {port}.",
    SERVER_DISCONNECTED_DETAIL: "The Enhanced Video Downloader server is not available. Downloads won't work until it's reconnected.",
    // Download notifications
    DOWNLOAD_QUEUED: "Video queued for download",
    DOWNLOAD_STARTED: "Download started successfully",
    DOWNLOAD_FAILED: "Download failed. Please try again.",
    // Configuration notifications
    CONFIG_UPDATED: "Configuration updated successfully",
    THEME_CHANGED: "Theme changed successfully",
};
// ============================================================================
// PORT CONFIGURATION
// ============================================================================
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
// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
/**
 * Get a notification message with placeholders replaced
 */
function getNotificationMessage(messageKey, replacements = {}) {
    let message = exports.NOTIFICATION_MESSAGES[messageKey];
    for (const [key, value] of Object.entries(replacements)) {
        message = message.replace(new RegExp(`{${key}}`, "g"), String(value));
    }
    return message;
}
/**
 * Get a storage key with optional prefix
 */
function getStorageKey(key, prefix) {
    const storageKey = exports.STORAGE_KEYS[key];
    return prefix ? `${prefix}_${storageKey}` : storageKey;
}
/**
 * Get a CSS selector with optional context
 */
function getCSSSelector(selectorKey, context) {
    const selector = exports.DOM_SELECTORS[selectorKey];
    return context ? `${context} ${selector}` : selector;
}
/**
 * Get a message type with optional namespace
 */
function getMessageType(typeKey, namespace) {
    const messageType = exports.MESSAGE_TYPES[typeKey];
    return namespace ? `${namespace}:${messageType}` : messageType;
}
