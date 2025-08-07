"use strict";
/**
 * Enhanced Video Downloader - Centralized Constants
 * Eliminates duplicate constants across the codebase
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NOTIFICATION_MESSAGES = exports.SUCCESS_MESSAGES = exports.ERROR_MESSAGES = exports.STATUS_CONSTANTS = exports.THEME_CONSTANTS = exports.MESSAGE_TYPES = exports.CSS_CLASSES = exports.DOM_SELECTORS = exports.CONFIG_CONSTANTS = exports.NETWORK_CONSTANTS = exports.UI_CONSTANTS = exports.STORAGE_KEYS = void 0;
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
