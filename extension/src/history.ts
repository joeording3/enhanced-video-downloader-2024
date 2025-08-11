/**
 * History management for the Enhanced Video Downloader extension.
 * Handles download history storage, retrieval, and display.
 */

import { HistoryEntry } from "./types";

// --- History utility functions ---
export const historyStorageKey = "downloadHistory";

/**
 * Fetches history entries with pagination
 * @param page - Page number to fetch
 * @param perPage - Number of items per page
 * @returns Promise resolving to history entries and total count
 */
export async function fetchHistory(
  page = 1,
  perPage = 25
): Promise<{
  history: HistoryEntry[];
  totalItems: number;
}> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get({ [historyStorageKey]: [] }, result => {
      if (chrome.runtime.lastError) {
        console.warn("[EVD][HISTORY] Error fetching history:", chrome.runtime.lastError.message);
        return resolve({ history: [], totalItems: 0 });
      }
      // Ensure items have a timestamp for sorting, default to 0 if missing
      const allHistory = (result[historyStorageKey] || []).map((item: HistoryEntry) => ({
        ...item,
        timestamp: item.timestamp || 0,
      }));
      // Sort by timestamp descending (newest first)
      allHistory.sort(
        (a: HistoryEntry, b: HistoryEntry) => (b.timestamp as number) - (a.timestamp as number)
      );

      // Handle pagination
      const totalItems = allHistory.length;
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;
      const paginatedHistory = allHistory.slice(startIndex, endIndex);

      resolve({ history: paginatedHistory, totalItems });
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
export function renderHistoryItems(
  historyItems: HistoryEntry[],
  page = 1,
  perPage = 25,
  totalItems = 0,
  historyListElement?: HTMLElement,
  pageInfoElement?: HTMLElement,
  prevPageBtn?: HTMLButtonElement,
  nextPageBtn?: HTMLButtonElement
): void {
  if (!historyListElement) {
    console.error("[EVD][HISTORY] No history list element provided to renderHistory");
    return;
  }

  // Validate that historyListElement is actually a DOM element with innerHTML property
  if (typeof historyListElement.innerHTML !== "string") {
    console.error(
      "[EVD][HISTORY] Invalid history list element provided to renderHistory:",
      historyListElement
    );
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
    const rawStatus = String(item.status || "");
    const normalized = rawStatus.toLowerCase();
    statusBold.textContent = rawStatus;
    // Apply status pill classes
    statusBold.classList.add("status-pill");
    if (["success", "complete", "completed", "done"].includes(normalized)) {
      statusBold.classList.add("is-success");
    } else if (["error", "failed", "fail"].includes(normalized)) {
      statusBold.classList.add("is-error");
    } else if (["queued", "pending", "waiting", "paused"].includes(normalized)) {
      statusBold.classList.add("is-warning");
    }
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
      chrome.runtime.sendMessage(
        {
          type: "downloadVideo",
          url: item.url,
          downloadId: item.id || undefined,
          page_title: item.page_title || document.title,
        },
        response => {
          if (chrome.runtime.lastError) {
            console.warn(
              "[EVD][HISTORY] Error sending retry message:",
              chrome.runtime.lastError.message
            );
          } else {
            // Retry download initiated
            // Optionally, provide feedback to the user in the popup
          }
        }
      );
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn btn--secondary delete-btn";
    deleteButton.textContent = "Delete";
    deleteButton.title = "Remove from history";
    deleteButton.addEventListener("click", async e => {
      e.stopPropagation();
      if (!item.id) return;
      // Delete clicked for item
      try {
        await removeHistoryItemAndNotify(item.id);
        // The historyUpdated message from removeHistoryItemAndNotify will trigger a re-render
      } catch (error) {
        console.error("[EVD][HISTORY] Failed to delete history item from UI action:", error);
      }
    });

    actionsWrapper.appendChild(retryButton);
    actionsWrapper.appendChild(deleteButton);

    // Also tag item with normalized status for styling hooks
    if (normalized) {
      li.classList.add("status-" + normalized);
    }
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
    } else {
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
export async function addToHistory(entry: HistoryEntry): Promise<void> {
  const newEntry = {
    ...entry,
    id: entry.id || crypto.randomUUID(),
    timestamp: entry.timestamp || Date.now(),
  };

  return new Promise((resolve, reject) => {
    chrome.storage.local.get({ [historyStorageKey]: [] }, result => {
      if (chrome.runtime.lastError) {
        console.warn(
          "[EVD][HISTORY] Warning fetching existing history:",
          chrome.runtime.lastError.message
        );
      }

      const history = (result && result[historyStorageKey]) || [];
      history.unshift(newEntry);

      chrome.storage.local.set({ [historyStorageKey]: history }, () => {
        if (chrome.runtime.lastError) {
          console.warn(
            "[EVD][HISTORY] Warning adding to history:",
            chrome.runtime.lastError.message
          );
          // Swallow storage.set errors to prevent breaking functionality
          resolve();
          return;
        }
        // Attempt to sync to backend history API (best effort)
        try {
          chrome.storage.local.get("serverPort", async res => {
            const port = (res as any).serverPort;
            if (!port) return;
            try {
              await fetch(`http://127.0.0.1:${port}/api/history`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newEntry),
              });
            } catch {
              // ignore sync errors
            }
          });
        } catch {
          // ignore
        }
        // Added to history locally
        resolve();
      });
    });
  });
}

/**
 * Clears all download history
 * @returns Promise resolving when history is cleared
 */
export async function clearHistory(): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [historyStorageKey]: [] }, () => {
      if (chrome.runtime.lastError) {
        console.error("[EVD][HISTORY] Error clearing history:", chrome.runtime.lastError.message);
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        // Attempt to clear backend history API as well (best effort)
        try {
          chrome.storage.local.get("serverPort", async res => {
            const port = (res as any).serverPort;
            if (!port) return;
            try {
              await fetch(`http://127.0.0.1:${port}/api/history`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "clear" }),
              });
            } catch {
              // ignore errors
            }
          });
        } catch {
          // ignore
        }
        // History cleared locally
        resolve();
      }
    });
  });
}

/**
 * Clears the entire history and notifies other parts of the extension.
 * @returns Promise resolving to void
 */
export async function clearHistoryAndNotify(): Promise<void> {
  await clearHistory();
  chrome.runtime.sendMessage({ type: "historyUpdated" });
}

/**
 * Removes a specific history item by ID
 * @param itemId - ID of the history item to remove
 * @returns Promise resolving when item is removed
 */
export async function removeHistoryItem(itemId?: string | number): Promise<void> {
  if (!itemId) {
    console.warn("[EVD][HISTORY] No item ID provided for removal.");
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    // Note: We can't use fetchHistory here as it now rejects on error.
    chrome.storage.local.get({ [historyStorageKey]: [] }, result => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }

      const history = result[historyStorageKey] || [];
      const newHistory = history.filter((item: HistoryEntry) => item.id !== itemId);

      chrome.storage.local.set({ [historyStorageKey]: newHistory }, () => {
        if (chrome.runtime.lastError) {
          console.error(
            "[EVD][HISTORY] Error removing item from history:",
            chrome.runtime.lastError.message
          );
          return reject(new Error(chrome.runtime.lastError.message));
        }
        // Removed item from history
        resolve();
      });
    });
  });
}

/**
 * Removes a history item and notifies other parts of the extension.
 * @param itemId - The ID of the item to remove.
 * @returns Promise resolving to void
 */
export async function removeHistoryItemAndNotify(itemId?: string | number): Promise<void> {
  await removeHistoryItem(itemId);
  chrome.runtime.sendMessage({ type: "historyUpdated" });
}

/**
 * Sanitizes a filename to be safe for filesystem storage
 * @param name - Filename to sanitize
 * @returns Sanitized filename
 */
function sanitizeFilename(name: string): string {
  // Remove invalid characters for filenames
  return name
    .replace(/[/\\?%*:|"<>]/g, "-") // Replace invalid chars with dash
    .replace(/\s+/g, "_") // Replace spaces with underscore
    .replace(/^\.+/, "") // Remove leading dots
    .trim();
}

// Export for testing (these are already exported above)
// export { fetchHistory, renderHistoryItems, addToHistory, clearHistory, removeHistoryItem };
