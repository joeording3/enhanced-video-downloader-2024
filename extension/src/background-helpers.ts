/**
 * Helper functions for the background script of the Enhanced Video Downloader extension.
 * Provides utilities for icon management, theme handling, and server communication.
 */

import { Theme } from "./types";
import { logger } from "./core/logger";

// Function to get icon paths for different themes - using chrome.runtime.getURL for proper extension URL resolution
export function getActionIconPaths(): Record<Theme, Record<string, string>> {
  // Check if chrome and chrome.runtime.getURL are available
  if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.getURL) {
    // Return fallback paths when chrome API is not available (e.g., in tests)
    return {
      light: {
        "16": "extension/icons/icon16.png",
        "48": "extension/icons/icon48.png",
        "128": "extension/icons/icon128.png",
      },
      dark: {
        "16": "extension/icons/darkicon16.png",
        "48": "extension/icons/darkicon48.png",
        "128": "extension/icons/darkicon128.png",
      },
      auto: {
        "16": "extension/icons/icon16.png",
        "48": "extension/icons/icon48.png",
        "128": "extension/icons/icon128.png",
      },
    };
  }

  return {
    light: {
      "16": chrome.runtime.getURL("extension/icons/icon16.png"),
      "48": chrome.runtime.getURL("extension/icons/icon48.png"),
      "128": chrome.runtime.getURL("extension/icons/icon128.png"),
    },
    dark: {
      "16": chrome.runtime.getURL("extension/icons/darkicon16.png"),
      "48": chrome.runtime.getURL("extension/icons/darkicon48.png"),
      "128": chrome.runtime.getURL("extension/icons/darkicon128.png"),
    },
    auto: {
      "16": chrome.runtime.getURL("extension/icons/icon16.png"),
      "48": chrome.runtime.getURL("extension/icons/icon48.png"),
      "128": chrome.runtime.getURL("extension/icons/icon128.png"),
    },
  };
}

// Legacy export for backward compatibility
export const actionIconPaths = getActionIconPaths();

/**
 * Applies the specified theme to the extension action icon
 * @param themeToApply - The theme to apply ('light' or 'dark')
 */
export function applyThemeToActionIcon(themeToApply: Theme): void {
  const validTheme = themeToApply === "dark" ? "dark" : "light";
  const paths = getActionIconPaths()[validTheme];

  if (!paths) {
    logger.warn(
      `No icon paths found for theme: ${validTheme}. Defaulting to light theme icons.`,
      { component: "background-helpers", operation: "applyThemeToActionIcon" }
    );
  }

  if (typeof chrome !== "undefined" && chrome.action && chrome.action.setIcon) {
    chrome.action.setIcon({ path: paths || getActionIconPaths().light }, () => {
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.lastError) {
        logger.error(
          `Error setting action icon for theme ${validTheme}:`,
          {
            component: "background-helpers",
            operation: "applyThemeToActionIcon",
            data: chrome.runtime.lastError.message
          }
        );
      }
    });
  }
}
