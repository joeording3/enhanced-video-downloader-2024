/**
 * Core constants for the Enhanced Video Downloader extension.
 * Centralized configuration and constants used throughout the extension.
 */

// ============================================================================
// STORAGE KEYS
// ============================================================================

export const STORAGE_KEYS = {
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
} as const;

// ============================================================================
// UI CONSTANTS
// ============================================================================

export const UI_CONSTANTS = {
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
} as const;

// ============================================================================
// NETWORK CONSTANTS
// ============================================================================

export const NETWORK_CONSTANTS = {
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
} as const;

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

export const CONFIG_CONSTANTS = {
  // Config refresh
  CONFIG_REFRESH_INTERVAL_COUNT: 6, // Refresh config every 6 * 5s = 30s

  // Port discovery
  BATCH_SIZE: 5, // Number of ports to check in parallel

  // History pagination
  DEFAULT_PAGE_SIZE: 10,
  MAX_HISTORY_ITEMS: 100,
} as const;

// ============================================================================
// DOM SELECTORS
// ============================================================================

export const DOM_SELECTORS = {
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
} as const;

// ============================================================================
// CSS CLASSES
// ============================================================================

export const CSS_CLASSES = {
  // Button states
  DOWNLOAD_SENDING: "download-sending",
  DOWNLOAD_SUCCESS: "download-success",
  DOWNLOAD_ERROR: "download-error",

  // UI states
  HIDDEN: "hidden",
  DRAG_HANDLE: "evd-drag-handle",
  DOWNLOAD_BUTTON: "download-button",
} as const;

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export const MESSAGE_TYPES = {
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
} as const;

// ============================================================================
// THEME CONSTANTS
// ============================================================================

export const THEME_CONSTANTS = {
  LIGHT: "light",
  DARK: "dark",
  DEFAULT: "light",
} as const;

// ============================================================================
// STATUS CONSTANTS
// ============================================================================

export const STATUS_CONSTANTS = {
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
} as const;

// ============================================================================
// ERROR MESSAGES
// ============================================================================

export const ERROR_MESSAGES = {
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
} as const;

// ============================================================================
// SUCCESS MESSAGES
// ============================================================================

export const SUCCESS_MESSAGES = {
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
} as const;

// ============================================================================
// NOTIFICATION MESSAGES
// ============================================================================

export const NOTIFICATION_MESSAGES = {
  // Server notifications
  SERVER_CONNECTED_DETAIL: "Enhanced Video Downloader server is now online on port {port}.",
  SERVER_DISCONNECTED_DETAIL:
    "The Enhanced Video Downloader server is not available. Downloads won't work until it's reconnected.",

  // Download notifications
  DOWNLOAD_QUEUED: "Video queued for download",
  DOWNLOAD_STARTED: "Download started successfully",
  DOWNLOAD_FAILED: "Download failed. Please try again.",

  // Configuration notifications
  CONFIG_UPDATED: "Configuration updated successfully",
  THEME_CHANGED: "Theme changed successfully",
} as const;

// ============================================================================
// PORT CONFIGURATION
// ============================================================================

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

// Port validation constants
export const MIN_PORT = 1024;
export const MAX_PORT = 65535;

// Get current environment
const CURRENT_ENVIRONMENT = getEnvironment();

// Get current port configuration
function getCurrentPortConfig() {
  return (
    CENTRAL_PORT_CONFIG[CURRENT_ENVIRONMENT as keyof typeof CENTRAL_PORT_CONFIG] ||
    CENTRAL_PORT_CONFIG.development
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

// Legacy port normalization removed; use centralized config directly

// Backward compatibility - maintain existing constants for gradual migration
export const DEFAULT_SERVER_PORT = getServerPort();
export const DEFAULT_CLIENT_PORT = getClientPort();
export const [DEFAULT_PORT_RANGE_START, DEFAULT_PORT_RANGE_END] = getPortRange();
export const DEFAULT_DOCKER_PORT = getDockerPort();
export const TEST_SERVER_PORT = getTestServerPort();
export const TEST_CLIENT_PORT = getTestClientPort();
export const [TEST_PORT_RANGE_START, TEST_PORT_RANGE_END] = getTestPortRange();

// Export the entire configuration for advanced use cases
export const PORT_CONFIG = CENTRAL_PORT_CONFIG;
export const CURRENT_ENV = CURRENT_ENVIRONMENT;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a notification message with placeholders replaced
 */
export function getNotificationMessage(
  messageKey: keyof typeof NOTIFICATION_MESSAGES,
  replacements: Record<string, string | number> = {}
): string {
  let message = NOTIFICATION_MESSAGES[messageKey] as string;

  for (const [key, value] of Object.entries(replacements)) {
    message = message.replace(new RegExp(`{${key}}`, "g"), String(value));
  }

  return message;
}

/**
 * Get a storage key with optional prefix
 */
export function getStorageKey(key: keyof typeof STORAGE_KEYS, prefix?: string): string {
  const storageKey = STORAGE_KEYS[key];
  return prefix ? `${prefix}_${storageKey}` : storageKey;
}

/**
 * Get a CSS selector with optional context
 */
export function getCSSSelector(selectorKey: keyof typeof DOM_SELECTORS, context?: string): string {
  const selector = DOM_SELECTORS[selectorKey];
  return context ? `${context} ${selector}` : selector;
}

/**
 * Get a message type with optional namespace
 */
export function getMessageType(typeKey: keyof typeof MESSAGE_TYPES, namespace?: string): string {
  const messageType = MESSAGE_TYPES[typeKey];
  return namespace ? `${namespace}:${messageType}` : messageType;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type StorageKey = keyof typeof STORAGE_KEYS;
export type UIConstant = keyof typeof UI_CONSTANTS;
export type NetworkConstant = keyof typeof NETWORK_CONSTANTS;
export type ConfigConstant = keyof typeof CONFIG_CONSTANTS;
export type DOMSelector = keyof typeof DOM_SELECTORS;
export type CSSClass = keyof typeof CSS_CLASSES;
export type MessageType = keyof typeof MESSAGE_TYPES;
export type ThemeConstant = keyof typeof THEME_CONSTANTS;
export type StatusConstant = keyof typeof STATUS_CONSTANTS;
export type ErrorMessage = keyof typeof ERROR_MESSAGES;
export type SuccessMessage = keyof typeof SUCCESS_MESSAGES;
export type NotificationMessage = keyof typeof NOTIFICATION_MESSAGES;
