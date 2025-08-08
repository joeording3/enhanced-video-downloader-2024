"use strict";
/**
 * Enhanced Video Downloader - Background Script Helpers
 * Utility functions for the background service worker
 */
// @ts-nocheck
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionIconPaths = void 0;
exports.getActionIconPaths = getActionIconPaths;
exports.applyThemeToActionIcon = applyThemeToActionIcon;
// Function to get icon paths for different themes - using chrome.runtime.getURL for proper extension URL resolution
function getActionIconPaths() {
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
    };
}
// Legacy export for backward compatibility
exports.actionIconPaths = getActionIconPaths();
/**
 * Applies the specified theme to the extension action icon
 * @param themeToApply - The theme to apply ('light' or 'dark')
 */
function applyThemeToActionIcon(themeToApply) {
    const validTheme = themeToApply === "dark" ? "dark" : "light";
    const paths = getActionIconPaths()[validTheme];
    if (!paths) {
        console.warn("[BG] No icon paths found for theme: " + validTheme + ". Defaulting to light theme icons.");
    }
    if (typeof chrome !== "undefined" && chrome.action && chrome.action.setIcon) {
        chrome.action.setIcon({ path: paths || getActionIconPaths().light }, () => {
            if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.lastError) {
                console.error("[BG] Error setting action icon for theme " + validTheme + ":", chrome.runtime.lastError.message);
            }
        });
    }
}
