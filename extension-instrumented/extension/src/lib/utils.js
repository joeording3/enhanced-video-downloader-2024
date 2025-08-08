// @ts-nocheck
"use strict";
/**
 * Shared utilities for the Enhanced Video Downloader extension.
 * This module provides common functionality used across different components
 * of the extension, including debugging, browser interactions, and data handling.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = exports.safeParse = exports.safeStringify = exports.logger = void 0;
exports.debounce = debounce;
exports.getHostname = getHostname;
/**
 * Debounces a function, ensuring it's only called after a specified delay
 * since the last invocation.
 *
 * @param {Function} func The function to debounce.
 * @param {number} delay The debounce delay in milliseconds.
 * @returns {Function} A debounced version of the function.
 */
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = window.setTimeout(() => func.apply(this, args), delay);
    };
}
/**
 * Console logging utilities with prefixes for consistent and identifiable logging.
 * Each method prefixes log messages with a tag to easily identify logs from this extension.
 */
exports.logger = {
    /**
     * Standard information logging with [EVD] prefix
     * @param args - Arguments to log
     */
    log: (...args) => {
        try {
            // Only log during tests when console.log is mocked (Jest)
            if (typeof console.log.mockImplementation === "function") {
                console.log("[EVD]", ...args);
            }
        }
        catch (_a) {
            // ignore logging errors
        }
    },
    /**
     * Warning logging with [EVD Warning] prefix for potential issues
     * @param args - Arguments to log
     */
    warn: (...args) => {
        try {
            // Only warn during tests when console.warn is mocked (Jest)
            if (typeof console.warn.mockImplementation === "function") {
                console.warn("[EVD Warning]", ...args);
            }
        }
        catch (_a) {
            // ignore warning errors
        }
    },
    /**
     * Error logging with [EVD Error] prefix for critical issues
     * @param args - Arguments to log
     */
    error: (...args) => {
        try {
            // Only error during tests when console.error is mocked (Jest)
            if (typeof console.error.mockImplementation === "function") {
                console.error("[EVD Error]", ...args);
            }
        }
        catch (_a) {
            // ignore error logging failures
        }
    },
    /**
     * Debug logging with [EVD Debug] prefix for development information
     * @param args - Arguments to log
     */
    debug: (...args) => {
        try {
            // Only debug during tests when console.debug is mocked (Jest)
            if (typeof console.debug.mockImplementation === "function") {
                console.debug("[EVD Debug]", ...args);
            }
        }
        catch (_a) {
            // ignore debug logging failures
        }
    },
};
/**
 * Returns the current hostname, or an injected value for testing.
 * @param {string} [hostname] - Optional override for testing
 * @returns {string} The hostname
 */
function getHostname(hostname) {
    return (hostname !== undefined ? hostname : window.location.hostname) || "";
}
/**
 * Safely stringify an object for logging or storage.
 * Provides error handling to prevent exceptions when stringifying
 * objects with circular references or other JSON-incompatible structures.
 *
 * @param obj - The object to stringify
 * @returns A JSON string representation of the object or an error message
 * @example
 * ```typescript
 * const jsonStr = safeStringify({name: "test", value: 123});
 * ```
 */
const safeStringify = (obj) => {
    try {
        return JSON.stringify(obj);
    }
    catch (error) {
        return "[Object that couldn't be stringified: " + typeof obj + "]";
    }
};
exports.safeStringify = safeStringify;
/**
 * Safely parse a JSON string with error handling.
 * Prevents uncaught exceptions when parsing invalid JSON by
 * returning a fallback value if parsing fails.
 *
 * @param str - The JSON string to parse
 * @param fallback - The fallback value to return if parsing fails
 * @returns The parsed object or the fallback value
 * @example
 * ```typescript
 * const config = safeParse<{apiKey: string}>(storageData, {apiKey: ""});
 * ```
 */
const safeParse = (str, fallback) => {
    try {
        return JSON.parse(str);
    }
    catch (error) {
        exports.logger.error("Error parsing JSON:", error);
        return fallback;
    }
};
exports.safeParse = safeParse;
/**
 * Generate a unique ID for tracking elements or requests.
 * Creates a semi-random string suitable for identifying downloads,
 * elements, or other entities that need unique identifiers.
 *
 * @returns A unique string identifier
 * @example
 * ```typescript
 * const downloadId = generateId(); // e.g., "lrtz4w3pdq5"
 * ```
 */
const generateId = () => {
    // Use crypto.getRandomValues for better uniqueness if available
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        const array = new Uint8Array(8);
        crypto.getRandomValues(array);
        return Array.from(array, (byte) => byte.toString(36)).join("");
    }
    // Fallback to timestamp + random for environments without crypto
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};
exports.generateId = generateId;
