"use strict";
/**
 * Enhanced Video Downloader - History Management
 * Handles download history fetching, rendering, and management
 */
// @ts-nocheck
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
exports.historyStorageKey = void 0;
exports.fetchHistory = fetchHistory;
exports.renderHistoryItems = renderHistoryItems;
exports.addToHistory = addToHistory;
exports.clearHistory = clearHistory;
exports.clearHistoryAndNotify = clearHistoryAndNotify;
exports.removeHistoryItem = removeHistoryItem;
exports.removeHistoryItemAndNotify = removeHistoryItemAndNotify;
// --- History utility functions ---
exports.historyStorageKey = "downloadHistory";
/**
 * Fetches history entries with pagination
 * @param page - Page number to fetch
 * @param perPage - Number of items per page
 * @returns Promise resolving to history entries and total count
 */
function fetchHistory() {
    return __awaiter(this, arguments, void 0, function* (page = 1, perPage = 25) {
        return new Promise((resolve, reject) => {
            chrome.storage.local.get({ [exports.historyStorageKey]: [] }, result => {
                if (chrome.runtime.lastError) {
                    console.warn("[EVD][HISTORY] Error fetching history:", chrome.runtime.lastError.message);
                    return resolve({ history: [], totalItems: 0 });
                }
                // Ensure items have a timestamp for sorting, default to 0 if missing
                const allHistory = (result[exports.historyStorageKey] || []).map((item) => (Object.assign(Object.assign({}, item), { timestamp: item.timestamp || 0 })));
                // Sort by timestamp descending (newest first)
                allHistory.sort((a, b) => b.timestamp - a.timestamp);
                // Handle pagination
                const totalItems = allHistory.length;
                const startIndex = (page - 1) * perPage;
                const endIndex = startIndex + perPage;
                const paginatedHistory = allHistory.slice(startIndex, endIndex);
                resolve({ history: paginatedHistory, totalItems });
            });
        });
    });
}
/**
 * Renders history items to a specified DOM element
 * @param historyItems - Array of history entries to render
 * @param page - Current page number
 * @param perPage - Items per page
 * @param totalItems - Total number of history items
 * @param historyListElement - DOM element to render into
 * @param pageInfoElement - Optional element to show pagination info
 * @param prevPageBtn - Optional previous page button
 * @param nextPageBtn - Optional next page button
 */
function renderHistoryItems(historyItems, page = 1, perPage = 25, totalItems = 0, historyListElement, pageInfoElement, prevPageBtn, nextPageBtn) {
    if (!historyListElement) {
        console.error("[EVD][HISTORY] No history list element provided to renderHistory");
        return;
    }
    // Validate that historyListElement is actually a DOM element with innerHTML property
    if (typeof historyListElement.innerHTML !== "string") {
        console.error("[EVD][HISTORY] Invalid history list element provided to renderHistory:", historyListElement);
        return;
    }
    // Clear the list
    historyListElement.innerHTML = "";
    // If we have no items, show a message
    if (!historyItems || historyItems.length === 0) {
        historyListElement.innerHTML = '<li class="empty-history">No download history available.</li>';
        // Update pagination UI if provided
        if (pageInfoElement && pageInfoElement instanceof Element) {
            pageInfoElement.textContent = "No items";
        }
        // Disable pagination buttons if they exist and are DOM elements
        if (prevPageBtn && prevPageBtn instanceof Element) {
            prevPageBtn.disabled = true;
        }
        if (nextPageBtn && nextPageBtn instanceof Element) {
            nextPageBtn.disabled = true;
        }
        return;
    }
    // Render history items
    historyItems.forEach(item => {
        const li = document.createElement("li");
        li.className = "history-item";
        if (item.id) {
            li.dataset.itemId = item.id.toString(); // Store ID for potential actions like delete
        }
        const titleDiv = document.createElement("div");
        const titleBold = document.createElement("b");
        titleBold.textContent = item.page_title || item.filename || "...";
        titleDiv.appendChild(titleBold);
        const timestampDiv = document.createElement("div");
        timestampDiv.className = "history-item-timestamp";
        timestampDiv.textContent = item.timestamp ? new Date(item.timestamp).toLocaleString() : "";
        const statusDiv = document.createElement("div");
        const statusBold = document.createElement("b");
        statusBold.textContent = item.status || "";
        statusDiv.appendChild(document.createTextNode("Status: "));
        statusDiv.appendChild(statusBold);
        const actionsWrapper = document.createElement("div");
        actionsWrapper.className = "history-actions";
        const retryButton = document.createElement("button");
        retryButton.className = "btn btn--secondary retry-btn";
        retryButton.textContent = "Retry";
        retryButton.title = "Retry download";
        retryButton.addEventListener("click", e => {
            e.stopPropagation(); // Prevent li click if any
            // Retry clicked for item
            chrome.runtime.sendMessage({
                type: "downloadVideo", // Changed action to type
                url: item.url,
                filename: item.filename,
                page_title: item.page_title || document.title, // Fallback for page_title
                // id: item.id // Optionally pass original ID if server needs to link them
            }, response => {
                if (chrome.runtime.lastError) {
                    console.warn("[EVD][HISTORY] Error sending retry message:", chrome.runtime.lastError.message);
                }
                else {
                    // Retry download initiated
                    // Optionally, provide feedback to the user in the popup
                }
            });
        });
        const deleteButton = document.createElement("button");
        deleteButton.className = "btn btn--secondary delete-btn";
        deleteButton.textContent = "Delete";
        deleteButton.title = "Remove from history";
        deleteButton.addEventListener("click", (e) => __awaiter(this, void 0, void 0, function* () {
            e.stopPropagation();
            if (!item.id)
                return;
            // Delete clicked for item
            try {
                yield removeHistoryItemAndNotify(item.id);
                // The historyUpdated message from removeHistoryItemAndNotify will trigger a re-render
            }
            catch (error) {
                console.error("[EVD][HISTORY] Failed to delete history item from UI action:", error);
            }
        }));
        actionsWrapper.appendChild(retryButton);
        actionsWrapper.appendChild(deleteButton);
        li.appendChild(titleDiv);
        li.appendChild(timestampDiv);
        li.appendChild(statusDiv);
        li.appendChild(actionsWrapper);
        if (item.detail) {
            const detailDiv = document.createElement("div");
            const detailSpan = document.createElement("span");
            detailSpan.className = "history-item-detail";
            // If detail is an array, join it. Otherwise, display as is.
            detailSpan.textContent = Array.isArray(item.detail) ? item.detail.join(", ") : item.detail;
            detailDiv.appendChild(document.createTextNode("Detail: "));
            detailDiv.appendChild(detailSpan);
            li.appendChild(detailDiv);
        }
        if (item.error) {
            const errorDiv = document.createElement("div");
            errorDiv.className = "history-item-error";
            errorDiv.textContent = "Error: " + item.error;
            li.appendChild(errorDiv);
        }
        if (item.url) {
            const urlDiv = document.createElement("div");
            urlDiv.className = "history-item-url";
            const urlLink = document.createElement("a");
            urlLink.href = item.url;
            urlLink.target = "_blank";
            urlLink.textContent = item.url;
            urlDiv.appendChild(document.createTextNode("URL: "));
            urlDiv.appendChild(urlLink);
            li.appendChild(urlDiv);
        }
        historyListElement.appendChild(li);
    });
    // Update pagination UI if provided
    if (pageInfoElement && pageInfoElement instanceof Element) {
        // Handle the case where totalItems is 0 but we still have items (edge case)
        const actualTotal = totalItems || historyItems.length;
        if (actualTotal === 0) {
            pageInfoElement.textContent = "No items";
        }
        else {
            const startItem = Math.min((page - 1) * perPage + 1, actualTotal);
            const endItem = Math.min(page * perPage, actualTotal);
            pageInfoElement.textContent =
                "Showing " + startItem + "-" + endItem + " of " + actualTotal + " items";
        }
    }
    // Update pagination button states
    if (prevPageBtn && prevPageBtn instanceof Element) {
        prevPageBtn.disabled = page <= 1;
    }
    if (nextPageBtn && nextPageBtn instanceof Element) {
        // If totalItems is 0 but we have items, calculate based on items length
        const actualTotal = totalItems || historyItems.length;
        nextPageBtn.disabled = page * perPage >= actualTotal;
    }
}
/**
 * Adds a new entry to the download history
 * @param entry - History entry to add
 * @returns Promise resolving when entry is saved
 */
function addToHistory(entry) {
    return __awaiter(this, void 0, void 0, function* () {
        const newEntry = Object.assign(Object.assign({}, entry), { id: entry.id || crypto.randomUUID(), timestamp: entry.timestamp || Date.now() });
        return new Promise((resolve, reject) => {
            chrome.storage.local.get({ [exports.historyStorageKey]: [] }, result => {
                if (chrome.runtime.lastError) {
                    console.warn("[EVD][HISTORY] Warning fetching existing history:", chrome.runtime.lastError.message);
                }
                const history = (result && result[exports.historyStorageKey]) || [];
                history.unshift(newEntry);
                chrome.storage.local.set({ [exports.historyStorageKey]: history }, () => {
                    if (chrome.runtime.lastError) {
                        console.warn("[EVD][HISTORY] Warning adding to history:", chrome.runtime.lastError.message);
                        // Swallow storage.set errors to prevent breaking functionality
                        resolve();
                        return;
                    }
                    // Added to history
                    resolve();
                });
            });
        });
    });
}
/**
 * Clears all download history
 * @returns Promise resolving when history is cleared
 */
function clearHistory() {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            chrome.storage.local.set({ [exports.historyStorageKey]: [] }, () => {
                if (chrome.runtime.lastError) {
                    console.error("[EVD][HISTORY] Error clearing history:", chrome.runtime.lastError.message);
                    reject(new Error(chrome.runtime.lastError.message));
                }
                else {
                    // History cleared
                    resolve();
                }
            });
        });
    });
}
/**
 * Clears the entire history and notifies other parts of the extension.
 * @returns Promise resolving to void
 */
function clearHistoryAndNotify() {
    return __awaiter(this, void 0, void 0, function* () {
        yield clearHistory();
        chrome.runtime.sendMessage({ type: "historyUpdated" });
    });
}
/**
 * Removes a specific history item by ID
 * @param itemId - ID of the history item to remove
 * @returns Promise resolving when item is removed
 */
function removeHistoryItem(itemId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!itemId) {
            console.warn("[EVD][HISTORY] No item ID provided for removal.");
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            // Note: We can't use fetchHistory here as it now rejects on error.
            chrome.storage.local.get({ [exports.historyStorageKey]: [] }, result => {
                if (chrome.runtime.lastError) {
                    return reject(new Error(chrome.runtime.lastError.message));
                }
                const history = result[exports.historyStorageKey] || [];
                const newHistory = history.filter((item) => item.id !== itemId);
                chrome.storage.local.set({ [exports.historyStorageKey]: newHistory }, () => {
                    if (chrome.runtime.lastError) {
                        console.error("[EVD][HISTORY] Error removing item from history:", chrome.runtime.lastError.message);
                        return reject(new Error(chrome.runtime.lastError.message));
                    }
                    // Removed item from history
                    resolve();
                });
            });
        });
    });
}
/**
 * Removes a history item and notifies other parts of the extension.
 * @param itemId - The ID of the item to remove.
 * @returns Promise resolving to void
 */
function removeHistoryItemAndNotify(itemId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield removeHistoryItem(itemId);
        chrome.runtime.sendMessage({ type: "historyUpdated" });
    });
}
/**
 * Sanitizes a filename to be safe for filesystem storage
 * @param name - Filename to sanitize
 * @returns Sanitized filename
 */
function sanitizeFilename(name) {
    // Remove invalid characters for filenames
    return name
        .replace(/[/\\?%*:|"<>]/g, "-") // Replace invalid chars with dash
        .replace(/\s+/g, "_") // Replace spaces with underscore
        .replace(/^\.+/, "") // Remove leading dots
        .trim();
}
// Export for testing (these are already exported above)
// export { fetchHistory, renderHistoryItems, addToHistory, clearHistory, removeHistoryItem };
