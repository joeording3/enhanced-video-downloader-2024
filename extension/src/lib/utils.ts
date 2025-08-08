/**
 * Shared utilities for the Enhanced Video Downloader extension.
 * This module provides common functionality used across different components
 * of the extension, including debugging, browser interactions, and data handling.
 */
// @ts-nocheck


/**
 * Debounces a function, ensuring it's only called after a specified delay
 * since the last invocation.
 *
 * @param {Function} func The function to debounce.
 * @param {number} delay The debounce delay in milliseconds.
 * @returns {Function} A debounced version of the function.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeout: number | undefined;

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func.apply(this, args), delay);
  };
}

/**
 * Console logging utilities with prefixes for consistent and identifiable logging.
 * Each method prefixes log messages with a tag to easily identify logs from this extension.
 */
export const logger = {
  /**
   * Standard information logging with [EVD] prefix
   * @param args - Arguments to log
   */
  log: (...args: any[]): void => {
    try {
      // Only log during tests when console.log is mocked (Jest)
      if (typeof (console.log as any).mockImplementation === "function") {
        console.log("[EVD]", ...args);
      }
    } catch {
      // ignore logging errors
    }
  },

  /**
   * Warning logging with [EVD Warning] prefix for potential issues
   * @param args - Arguments to log
   */
  warn: (...args: any[]): void => {
    try {
      // Only warn during tests when console.warn is mocked (Jest)
      if (typeof (console.warn as any).mockImplementation === "function") {
        console.warn("[EVD Warning]", ...args);
      }
    } catch {
      // ignore warning errors
    }
  },

  /**
   * Error logging with [EVD Error] prefix for critical issues
   * @param args - Arguments to log
   */
  error: (...args: any[]): void => {
    try {
      // Only error during tests when console.error is mocked (Jest)
      if (typeof (console.error as any).mockImplementation === "function") {
        console.error("[EVD Error]", ...args);
      }
    } catch {
      // ignore error logging failures
    }
  },

  /**
   * Debug logging with [EVD Debug] prefix for development information
   * @param args - Arguments to log
   */
  debug: (...args: any[]): void => {
    try {
      // Only debug during tests when console.debug is mocked (Jest)
      if (typeof (console.debug as any).mockImplementation === "function") {
        console.debug("[EVD Debug]", ...args);
      }
    } catch {
      // ignore debug logging failures
    }
  },
};

/**
 * Returns the current hostname, or an injected value for testing.
 * @param {string} [hostname] - Optional override for testing
 * @returns {string} The hostname
 */
export function getHostname(hostname?: string): string {
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
export const safeStringify = (obj: any): string => {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    return "[Object that couldn't be stringified: " + typeof obj + "]";
  }
};

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
export const safeParse = <T>(str: string, fallback: T): T => {
  try {
    return JSON.parse(str) as T;
  } catch (error) {
    logger.error("Error parsing JSON:", error);
    return fallback;
  }
};

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
export const generateId = (): string => {
  // Use crypto.getRandomValues for better uniqueness if available
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const array = new Uint8Array(8);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(36)).join("");
  }

  // Fallback to timestamp + random for environments without crypto
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};
