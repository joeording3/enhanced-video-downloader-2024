// @ts-nocheck
"use strict";
/**
 * Popup UI controller for the Enhanced Video Downloader extension.
 * Manages the popup UI components, download status, history display,
 * and user interactions with the extension popup.
 *
 * @module popup
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setStatus = setStatus;
exports.applyPopupTheme = applyPopupTheme;
exports.updateToggleButtonState = updateToggleButtonState;
exports.loadAndRenderHistory = loadAndRenderHistory;
exports.loadConfig = loadConfig;
exports.updateDownloadDirDisplay = updateDownloadDirDisplay;
exports.updatePortDisplay = updatePortDisplay;
exports.showConfigErrorIfPresent = showConfigErrorIfPresent;
exports.createErrorListItem = createErrorListItem;
exports.createGenericListItem = createGenericListItem;
exports.createQueuedListItem = createQueuedListItem;
exports.createActiveListItem = createActiveListItem;
exports.handleDragStart = handleDragStart;
exports.handleDragOver = handleDragOver;
exports.handleDragLeave = handleDragLeave;
exports.handleDrop = handleDrop;
exports.handleDragEnd = handleDragEnd;
exports.renderDownloadStatus = renderDownloadStatus;
exports.updatePopupServerStatus = updatePopupServerStatus;
exports.initPopup = initPopup;
const utils_1 = require("./lib/utils");
// Module-level state (will be initialized in initPopup)
let statusTimeout = null;
let dragSrcIndex = null;
/**
 * Sets a status message in the popup.
 * @param message - The message to display.
 * @param isError - Whether the message is an error.
 * @param duration - How long to display the message for.
 * @returns The timer ID for the timeout.
 */
function setStatus(message, isError = false, duration = 3000) {
    if (statusTimeout) {
        clearTimeout(statusTimeout);
    }
    const statusEl = document.getElementById("status");
    if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = isError ? "status-error" : "status-success";
        if (isError) {
            const tip = document.createElement("div");
            tip.className = "error-tip";
            tip.textContent = "Tip: check your network connection and try again";
            statusEl.appendChild(tip);
        }
        statusTimeout = setTimeout(() => {
            statusEl.textContent = "";
            statusEl.className = "";
            statusTimeout = null;
        }, duration);
        return statusTimeout;
    }
    return null;
}
/**
 * Applies the appropriate theme (light/dark) to the popup UI.
 * Uses the stored theme preference from chrome.storage or falls back to system preference.
 *
 * @param forceTheme - Optional theme to force (light/dark)
 */
function applyPopupTheme(forceTheme) {
    return __awaiter(this, void 0, void 0, function* () {
        let isDark;
        if (forceTheme) {
            isDark = forceTheme === "dark";
        }
        else {
            // Get stored theme preference
            const result = yield chrome.storage.local.get("theme");
            const storedTheme = result.theme;
            if (storedTheme) {
                isDark = storedTheme === "dark";
            }
            else {
                // Fallback to system preference
                isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            }
        }
        document.body.classList.toggle("dark-theme", isDark);
        // Update logo src based on theme
        const logo = document.querySelector("img[src*='icon']");
        if (logo) {
            const currentSrc = logo.src;
            const isCurrentlyDark = currentSrc.includes("darkicon");
            if (isDark !== isCurrentlyDark) {
                logo.src = currentSrc.replace(isCurrentlyDark ? "darkicon" : "icon", isDark ? "darkicon" : "icon");
            }
        }
    });
}
/**
 * Updates the toggle button state and text based on the provided parameters.
 * Supports multiple overloads for different use cases.
 *
 * @param buttonIdOrState - Button ID or active state
 * @param isActiveOrButtonId - Active state or button ID
 */
function updateToggleButtonState(buttonIdOrState, isActiveOrButtonId) {
    let buttonId;
    let isActive;
    let buttonText;
    let isDisabled;
    // Handle the overloaded function signature
    if (typeof buttonIdOrState === "boolean") {
        // First parameter is the state
        isActive = buttonIdOrState;
        buttonId =
            isActiveOrButtonId || "toggle-enhanced-download-button";
    }
    else if (typeof buttonIdOrState === "string" &&
        typeof isActiveOrButtonId === "string") {
        // First parameter is the button text, second is also a string (button ID)
        buttonText = buttonIdOrState;
        buttonId = isActiveOrButtonId;
        isActive = false; // Custom text mode disables the button
        isDisabled = true;
    }
    else {
        // First parameter is the button ID, second is the state
        buttonId = buttonIdOrState;
        isActive = isActiveOrButtonId || false;
    }
    const button = document.getElementById(buttonId);
    if (!button) {
        utils_1.logger.error("Toggle button with ID " + buttonId + " not found");
        return;
    }
    // Update button state
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", isActive.toString());
    // Update button text based on state
    if (buttonText !== undefined) {
        button.textContent = buttonText;
    }
    else {
        button.textContent = isActive ? "HIDE" : "SHOW";
    }
    // Update disabled state if specified
    if (isDisabled !== undefined) {
        button.disabled = isDisabled;
    }
}
/**
 * Loads download history entries and renders them in the popup UI.
 * Fetches history from storage or the server and creates UI elements
 * to display the download history.
 *
 * @param containerId - ID of the container element for history items (defaults to 'history-items')
 * @param limit - Maximum number of history entries to display (defaults to 5)
 */
function loadAndRenderHistory(containerId = "history-items", limit = 5) {
    const container = document.getElementById(containerId);
    if (!container) {
        utils_1.logger.error("History container with ID " + containerId + " not found");
        return;
    }
    // Clear existing history items
    container.innerHTML = "";
    // Fetch history entries from storage
    chrome.storage.local.get(["downloadHistory"], (result) => {
        const history = result.downloadHistory || [];
        const recentEntries = history.slice(0, limit);
        if (recentEntries.length === 0) {
            // Display message when no history exists
            const emptyMessage = document.createElement("div");
            emptyMessage.className = "history-empty";
            emptyMessage.textContent = "No download history yet";
            container.appendChild(emptyMessage);
            return;
        }
        // Create history items
        recentEntries.forEach((entry) => {
            const item = document.createElement("div");
            item.className = "history-item status-" + entry.status;
            const title = document.createElement("div");
            title.className = "history-title";
            title.textContent = entry.page_title || "Unknown video";
            const meta = document.createElement("div");
            meta.className = "history-meta";
            meta.textContent =
                entry.status +
                    "  " +
                    new Date(entry.timestamp || Date.now()).toLocaleString();
            item.appendChild(title);
            item.appendChild(meta);
            container.appendChild(item);
        });
        utils_1.logger.debug("Rendered " + recentEntries.length + " history entries");
    });
}
// Load configuration from server or fallback to local storage
function loadConfig() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "getConfig" }, (response) => {
                if (!chrome.runtime.lastError && response && response.serverConfig) {
                    resolve(response.serverConfig);
                }
                else {
                    chrome.storage.local.get("extensionConfig", (result) => {
                        resolve(result.extensionConfig);
                    });
                }
            });
        });
    });
}
// Update download directory display element
function updateDownloadDirDisplay() {
    return __awaiter(this, void 0, void 0, function* () {
        const el = document.getElementById("download-dir-display");
        if (!el)
            return;
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "getConfig" }, (response) => {
                if (!chrome.runtime.lastError && response && response.serverConfig) {
                    el.textContent = "Saving to: " + response.serverConfig.download_dir;
                    resolve();
                }
                else {
                    chrome.storage.local.get("extensionConfig", (result) => {
                        const cfg = result.extensionConfig || {};
                        el.textContent = "Saving to: " + (cfg.download_dir || "");
                        resolve();
                    });
                }
            });
        });
    });
}
// Update server port display element
function updatePortDisplay() {
    return __awaiter(this, void 0, void 0, function* () {
        const el = document.getElementById("server-port-display");
        if (!el)
            return;
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: "getConfig" }, (response) => {
                if (!chrome.runtime.lastError && response && response.serverConfig) {
                    el.textContent = "Server Port: " + response.serverConfig.server_port;
                }
                resolve();
            });
        });
    });
}
// Show configuration error if present in local storage
function showConfigErrorIfPresent() {
    const el = document.getElementById("config-error-display");
    if (!el)
        return;
    chrome.storage.local.get("configError", (result) => {
        if (result.configError) {
            el.textContent = "Configuration Error: " + result.configError;
            el.style.display = "block";
        }
    });
}
// Create a list item for errors with a toggle for details
function createErrorListItem(downloadId, info) {
    const li = document.createElement("li");
    // Add CSS classes for severity-based styling
    const severity = info.errorInfo.type.toLowerCase();
    li.classList.add("status-" + severity);
    li.classList.add("severity-" + severity);
    li.dataset.downloadId = downloadId;
    const title = document.createElement("div");
    title.className = "item-title";
    title.textContent = info.filename;
    li.appendChild(title);
    // Use semantic <details> for error details
    const detailsEl = document.createElement("details");
    detailsEl.className = "error-details";
    const summary = document.createElement("summary");
    summary.textContent = "Details";
    detailsEl.appendChild(summary);
    const content = document.createElement("div");
    content.className = "error-details-content";
    content.textContent =
        info.errorInfo.type +
            ": " +
            info.errorInfo.message +
            " (" +
            info.errorInfo.original +
            ")";
    detailsEl.appendChild(content);
    // Add contextual help/troubleshooting link
    const helpBtn = document.createElement("button");
    helpBtn.className = "error-help-link";
    helpBtn.textContent = "Help";
    helpBtn.addEventListener("click", () => {
        // Open extension options page for troubleshooting
        chrome.runtime.openOptionsPage();
    });
    detailsEl.appendChild(helpBtn);
    li.appendChild(detailsEl);
    return li;
}
// Create a generic list item with a resume button
function createGenericListItem(downloadId, item) {
    const li = document.createElement("li");
    li.classList.add("status-" + item.status);
    const statusText = document.createElement("div");
    statusText.className = "item-status";
    statusText.textContent = item.status;
    li.appendChild(statusText);
    li.dataset.downloadId = downloadId;
    const btn = document.createElement("button");
    btn.className = "resume-button";
    btn.textContent = "Resume";
    li.appendChild(btn);
    return li;
}
// Create a queued list item with a cancel button
function createQueuedListItem(item) {
    const li = document.createElement("li");
    li.classList.add("queued-item");
    li.dataset.downloadId = item.id;
    const queuedText = document.createElement("div");
    queuedText.className = "item-status";
    queuedText.textContent = "Queued: " + item.id;
    li.appendChild(queuedText);
    const btn = document.createElement("button");
    btn.className = "cancel-button";
    btn.textContent = "Cancel";
    btn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "cancelDownload", downloadId: item.id }, () => { });
    });
    li.appendChild(btn);
    return li;
}
// Create an active download list item with a pause button
function createActiveListItem(downloadId, statusObj) {
    const li = document.createElement("li");
    li.classList.add("active-item");
    li.classList.add("status-" + statusObj.status);
    li.dataset.downloadId = downloadId;
    const title = document.createElement("div");
    title.textContent = statusObj.filename || downloadId;
    li.appendChild(title);
    const progress = document.createElement("progress");
    progress.value = statusObj.progress;
    progress.max = 100;
    li.appendChild(progress);
    const percentLabel = document.createElement("span");
    percentLabel.className = "item-percent";
    percentLabel.textContent = String(statusObj.progress) + "%";
    li.appendChild(percentLabel);
    const statusText = document.createElement("div");
    statusText.className = "item-status";
    statusText.textContent = statusObj.status;
    li.appendChild(statusText);
    const btn = document.createElement("button");
    btn.className = "pause-button";
    btn.textContent = "Pause";
    btn.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "pauseDownload", downloadId }, () => { });
    });
    li.appendChild(btn);
    return li;
}
// Drag-and-drop queue reordering handlers
function handleDragStart(e) {
    const li = e.currentTarget;
    dragSrcIndex = Array.from(li.parentElement.children).indexOf(li);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", li.dataset.downloadId);
    li.classList.add("dragging");
}
function handleDragOver(e) {
    e.preventDefault();
    const li = e.currentTarget;
    li.classList.add("drag-over");
    e.dataTransfer.dropEffect = "move";
}
function handleDragLeave(e) {
    const li = e.currentTarget;
    li.classList.remove("drag-over");
}
function handleDrop(e) {
    e.preventDefault();
    const li = e.currentTarget;
    li.classList.remove("drag-over");
    if (dragSrcIndex === null)
        return;
    const dropIndex = Array.from(li.parentElement.children).indexOf(li);
    // Collect current ids
    const listEls = Array.from(li.parentElement.children);
    const ids = listEls.map((el) => el.dataset.downloadId);
    // Reorder array
    const reordered = [...ids];
    const [moved] = reordered.splice(dragSrcIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    // Notify background of new queue order
    chrome.runtime.sendMessage({ type: "reorderQueue", queue: reordered });
}
function handleDragEnd(e) {
    e.currentTarget.classList.remove("dragging");
}
// Render current downloads and queued items
function renderDownloadStatus(data) {
    const container = document.getElementById("download-status");
    if (!container)
        return;
    container.innerHTML = "";
    const activeIds = Object.keys(data.active || {});
    const queuedIds = data.queue || [];
    if (activeIds.length === 0 && queuedIds.length === 0) {
        const li = document.createElement("li");
        li.textContent = "No active or queued downloads.";
        container.appendChild(li);
        return;
    }
    // Grouped active and queued items into collapsible sections
    if (activeIds.length > 0) {
        const activeDetails = document.createElement("details");
        activeDetails.open = true;
        const activeSummary = document.createElement("summary");
        activeSummary.textContent = "Active Downloads";
        activeDetails.appendChild(activeSummary);
        const activeUl = document.createElement("ul");
        activeIds.forEach((id) => {
            var _a;
            const statusObj = data.active[id];
            let liEl;
            if (statusObj.status === "error") {
                liEl = createErrorListItem(id, {
                    filename: statusObj.filename || id,
                    errorInfo: {
                        type: "Error",
                        message: statusObj.error || "Error",
                        original: statusObj.message || "",
                    },
                });
            }
            else if (statusObj.status === "paused") {
                liEl = createGenericListItem(id, { status: "paused" });
                (_a = liEl
                    .querySelector("button.resume-button")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => {
                    chrome.runtime.sendMessage({ type: "resumeDownload", downloadId: id }, () => { });
                });
            }
            else {
                liEl = createActiveListItem(id, statusObj);
            }
            activeUl.appendChild(liEl);
        });
        activeDetails.appendChild(activeUl);
        container.appendChild(activeDetails);
    }
    if (queuedIds.length > 0) {
        const queueDetails = document.createElement("details");
        queueDetails.open = true;
        const queueSummary = document.createElement("summary");
        queueSummary.textContent = "Queued Downloads";
        queueDetails.appendChild(queueSummary);
        const queueUl = document.createElement("ul");
        queuedIds.forEach((id) => {
            const li = createQueuedListItem({ id });
            // Enable drag-and-drop reordering for queued items
            li.setAttribute("draggable", "true");
            li.addEventListener("dragstart", handleDragStart);
            li.addEventListener("dragover", handleDragOver);
            li.addEventListener("dragleave", handleDragLeave);
            li.addEventListener("drop", handleDrop);
            li.addEventListener("dragend", handleDragEnd);
            queueUl.appendChild(li);
        });
        queueDetails.appendChild(queueUl);
        container.appendChild(queueDetails);
    }
}
/**
 * Updates the server status indicator in the popup.
 * @param status - The server status ('connected', 'disconnected', or 'checking')
 */
function updatePopupServerStatus(status) {
    const indicator = document.getElementById("server-status-indicator");
    const text = document.getElementById("server-status-text");
    if (indicator && text) {
        // Remove all status classes
        indicator.classList.remove("connected", "disconnected");
        switch (status) {
            case "connected":
                indicator.classList.add("connected");
                text.textContent = "Connected";
                break;
            case "disconnected":
                indicator.classList.add("disconnected");
                text.textContent = "Disconnected";
                break;
            case "checking":
                text.textContent = "Checking...";
                break;
        }
    }
}
/**
 * Initialize the popup UI and set up all event listeners and message handlers.
 * This function should be called when the DOM is ready.
 */
function initPopup() {
    return __awaiter(this, void 0, void 0, function* () {
        // Initialize theme
        yield applyPopupTheme();
        // Set up settings button click handler
        const settingsButton = document.getElementById("open-settings");
        if (settingsButton) {
            settingsButton.addEventListener("click", () => {
                chrome.runtime.openOptionsPage();
            });
        }
        // Initialize download status
        chrome.runtime.sendMessage({ type: "getQueue" }, (response) => {
            renderDownloadStatus(response || { active: {}, queue: [] });
        });
        // Set up message listeners
        chrome.runtime.onMessage.addListener((msg) => {
            if (msg.type === "downloadStatusUpdate") {
                renderDownloadStatus(msg.data);
            }
            else if (msg.type === "queueUpdated") {
                renderDownloadStatus({ active: msg.active, queue: msg.queue });
            }
            else if (msg.type === "serverStatusUpdate") {
                updatePopupServerStatus(msg.status);
            }
        });
    });
}
// Initialize popup when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    initPopup().catch((error) => {
        console.error("Error initializing popup:", error);
    });
});
