/**
 * History management for the Enhanced Video Downloader extension.
 * Handles download history storage, retrieval, and display.
 */

import { HistoryEntry } from "./types";

// --- History utility functions ---
export const historyStorageKey = "downloadHistory";

/**
 * Fetches history entries with pagination. Falls back to server /api/history if local storage is empty.
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
  // Helper to normalize entries (ensure numeric timestamps and id presence)
  const normalizeEntries = (items: HistoryEntry[]): HistoryEntry[] =>
    items.map((item: HistoryEntry) => ({
      ...item,
      id: (item as any).id || (item as any).download_id || crypto.randomUUID(),
      timestamp:
        typeof item.timestamp === "number"
          ? item.timestamp
          : item.timestamp
          ? Date.parse(String(item.timestamp)) || Date.now()
          : Date.now(),
    }));

  // Read from local storage first
  const local = await new Promise<HistoryEntry[]>(resolve => {
    chrome.storage.local.get({ [historyStorageKey]: [] }, result => {
      if (chrome.runtime.lastError) {
        console.warn("[EVD][HISTORY] Error fetching history:", chrome.runtime.lastError.message);
        return resolve([]);
      }
      resolve((result[historyStorageKey] as HistoryEntry[]) || []);
    });
  });

  // If we have local items, paginate/sort and return
  if (local && local.length > 0) {
    const all = normalizeEntries(local);
    // Sort by timestamp descending (newest first)
    all.sort((a, b) => (b.timestamp as number) - (a.timestamp as number));
    const totalItems = all.length;
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginated = all.slice(startIndex, endIndex);
    return { history: paginated, totalItems };
  }

  // Fallback: attempt to fetch from server if a port is known
  try {
    const { serverPort } = await chrome.storage.local.get("serverPort");
    const port = serverPort as number | undefined;
    if (!port) return { history: [], totalItems: 0 };

    const url = new URL(`http://127.0.0.1:${port}/api/history`);
    // Ask server to paginate for efficiency; still normalize locally
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(perPage));

    const res = await fetch(url.toString());
    if (!res.ok) return { history: [], totalItems: 0 };
    const data = (await res.json()) as { history?: any[]; total_items?: number };

    const serverItemsRaw: HistoryEntry[] = (data.history as any[]) || [];
    // Map server fields to our HistoryEntry shape
    const mapped: HistoryEntry[] = serverItemsRaw.map((it: any) => ({
      id: it.id || it.download_id || crypto.randomUUID(),
      url: it.url,
      status: it.status,
      filename: it.filename,
      filepath: it.filepath,
      page_title: it.page_title || it.title,
      title: it.title,
      error: it.error || it.message,
      timestamp: it.timestamp ? Date.parse(String(it.timestamp)) || Date.now() : Date.now(),
    }));

    const normalized = normalizeEntries(mapped);

    // Seed local storage (best-effort) with the first page to make UI snappier next time
    try {
      // We will not clobber any future locally-added items; only set if still empty
      const confirmLocal = await new Promise<HistoryEntry[]>(resolve => {
        chrome.storage.local.get({ [historyStorageKey]: [] }, r =>
          resolve(r[historyStorageKey] || [])
        );
      });
      if (!confirmLocal || confirmLocal.length === 0) {
        // Keep a bounded cache locally; store only what we retrieved
        await new Promise<void>(resolve => {
          chrome.storage.local.set({ [historyStorageKey]: normalized }, () => resolve());
        });
      }
    } catch {
      // ignore seeding failures
    }

    const totalItems = typeof data.total_items === "number" ? data.total_items : normalized.length;
    return { history: normalized, totalItems };
  } catch (e) {
    console.warn("[EVD][HISTORY] Server history fetch failed:", (e as Error).message);
    return { history: [], totalItems: 0 };
  }
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
  nextPageBtn?: HTMLButtonElement,
  options?: { preserveExisting?: boolean }
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

  // Clear the list unless asked to preserve existing content (to allow prepending queued items)
  if (!options || options.preserveExisting !== true) {
    historyListElement.innerHTML = "";
  }

  // If we have no items, show a message
  if (!historyItems || historyItems.length === 0) {
    historyListElement.innerHTML = '<li class="empty-history">No download history available.</li>';

    // Update pagination UI if provided
    if (pageInfoElement && pageInfoElement instanceof Element) {
      pageInfoElement.textContent = "No items";
    }

    // Disable pagination buttons if they exist and are DOM elements
    if (prevPageBtn && prevPageBtn instanceof HTMLButtonElement) {
      prevPageBtn.disabled = true;
    }

    if (nextPageBtn && nextPageBtn instanceof HTMLButtonElement) {
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

    // Left column wrapper
    const leftWrapper = document.createElement("div");
    leftWrapper.className = "history-left";

    const titleDiv = document.createElement("div");
    const titleBold = document.createElement("b");
    // Prioritize the original page title if available
    titleBold.textContent =
      (item.page_title || item.title || "").trim() || computeDisplayTitle(item);
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
    // Assemble left column
    leftWrapper.appendChild(titleDiv);
    leftWrapper.appendChild(timestampDiv);
    leftWrapper.appendChild(statusDiv);

    if (item.detail) {
      const detailDiv = document.createElement("div");
      const detailSpan = document.createElement("span");
      detailSpan.className = "history-item-detail";
      // If detail is an array, join it. Otherwise, display as is.
      detailSpan.textContent = Array.isArray(item.detail) ? item.detail.join(", ") : item.detail;
      detailDiv.appendChild(document.createTextNode("Detail: "));
      detailDiv.appendChild(detailSpan);
      leftWrapper.appendChild(detailDiv);
    }

    if (item.error) {
      const errorDiv = document.createElement("div");
      errorDiv.className = "history-item-error";
      errorDiv.textContent = "Error: " + item.error;
      leftWrapper.appendChild(errorDiv);
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
      leftWrapper.appendChild(urlDiv);
    }
    li.appendChild(leftWrapper);
    li.appendChild(actionsWrapper);
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
  if (prevPageBtn && prevPageBtn instanceof HTMLButtonElement) {
    prevPageBtn.disabled = page <= 1;
  }

  if (nextPageBtn && nextPageBtn instanceof HTMLButtonElement) {
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
  return (
    name
      // Replace invalid characters (except forward slash handled separately below)
      .replace(/[\\?%*:|"<>]/g, "-")
      // Replace forward slashes
      .replace(/\//g, "-")
      // Replace spaces with underscore
      .replace(/\s+/g, "_")
      .replace(/^\.+/, "") // Remove leading dots
      .trim()
  );
}

function computeDisplayTitle(item: HistoryEntry): string {
  const raw =
    (item as any).page_title ||
    (item as any).title ||
    item.filename ||
    extractTitleFromUrl(item.url);
  const t = String(raw || "").trim();
  if (t && t.toLowerCase() !== "video") return t;
  const fallback = extractTitleFromUrl(item.url);
  return fallback || (item.filename ? sanitizeFilename(item.filename) : "...");
}

function extractTitleFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `youtube:${id}`;
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" && parts[1]) return `yt shorts:${parts[1]}`;
    }
    const segs = u.pathname.split("/").filter(Boolean);
    if (segs.length > 0) return `${u.hostname}/${segs[segs.length - 1]}`;
    return u.hostname;
  } catch {
    return undefined;
  }
}
// Export for testing (these are already exported above)
// export { fetchHistory, renderHistoryItems, addToHistory, clearHistory, removeHistoryItem };
