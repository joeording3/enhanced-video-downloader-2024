import { logger } from "./core/logger";

// Align popup console logging level once from stored config
chrome.storage.local.get("serverConfig", res => {
  const cfg = (res as any).serverConfig || {};
  let level: string = cfg.console_log_level || cfg.log_level || "info";
  const normalized = String(level).toLowerCase();
  if (normalized === "warning") level = "warn";
  if (normalized === "critical") level = "error";
  try {
    logger.setLevel(String(level).toLowerCase() as any);
  } catch {
    // ignore
  }
});
/**
 * Enhanced Video Downloader - Popup Script
 * Handles popup UI interactions and server communication
 */

import { Theme, ServerConfig, HistoryEntry } from "./types";
import { fetchHistory, renderHistoryItems } from "./history";

/**
 * Download status interface for the popup UI
 */
export interface DownloadStatus {
  isActive: boolean;
  progress: number;
  id?: string;
  filename?: string;
  url?: string;
  error?: string;
  message?: string;
}

// Module-level state (will be initialized in initPopup)
let statusTimeout: ReturnType<typeof setTimeout> | null = null;
let dragSrcIndex: number | null = null;

/**
 * Sets a status message in the popup.
 * @param message - The message to display.
 * @param isError - Whether the message is an error.
 * @param duration - How long to display the message for.
 * @returns The timer ID for the timeout.
 */
export function setStatus(
  message: string,
  isError = false,
  duration = 3000
): ReturnType<typeof setTimeout> | null {
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
export async function applyPopupTheme(forceTheme?: "light" | "dark"): Promise<void> {
  let isDark: boolean;

  if (forceTheme) {
    isDark = forceTheme === "dark";
  } else {
    // Get stored theme preference
    const result = await chrome.storage.local.get("theme");
    const storedTheme = result.theme as "light" | "dark" | undefined;

    if (storedTheme) {
      isDark = storedTheme === "dark";
    } else {
      // Fallback to system preference
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
  }

  document.body.classList.toggle("dark-theme", isDark);

  // Update logo src based on theme
  const logo = document.querySelector("img[src*='icon']") as HTMLImageElement;
  if (logo) {
    const currentSrc = logo.src;
    const isCurrentlyDark = currentSrc.includes("darkicon");
    if (isDark !== isCurrentlyDark) {
      logo.src = currentSrc.replace(
        isCurrentlyDark ? "darkicon" : "icon",
        isDark ? "darkicon" : "icon"
      );
    }
  }
}

/**
 * Updates the toggle button state and text based on the provided parameters.
 * Supports multiple overloads for different use cases.
 *
 * @param buttonIdOrState - Button ID or active state
 * @param isActiveOrButtonId - Active state or button ID
 */
export function updateToggleButtonState(
  buttonIdOrState: string | boolean,
  isActiveOrButtonId?: boolean | string
): void {
  let buttonId: string;
  let isActive: boolean;
  let buttonText: string | undefined;
  let isDisabled: boolean | undefined;

  // Handle the overloaded function signature
  if (typeof buttonIdOrState === "boolean") {
    // First parameter is the state
    isActive = buttonIdOrState;
    buttonId = (isActiveOrButtonId as string) || "toggle-enhanced-download-button";
  } else if (typeof buttonIdOrState === "string" && typeof isActiveOrButtonId === "string") {
    // First parameter is the button text, second is also a string (button ID)
    buttonText = buttonIdOrState;
    buttonId = isActiveOrButtonId;
    isActive = false; // Custom text mode disables the button
    isDisabled = true;
  } else {
    // First parameter is the button ID, second is the state
    buttonId = buttonIdOrState;
    isActive = (isActiveOrButtonId as boolean) || false;
  }

  const button = document.getElementById(buttonId) as HTMLButtonElement;
  if (!button) {
    // logger.error("Toggle button with ID " + buttonId + " not found"); // Original code had logger, but logger is removed.
    return;
  }

  // Update button state
  button.classList.toggle("active", isActive);
  button.setAttribute("aria-pressed", isActive.toString());

  // Update button text based on state
  if (buttonText !== undefined) {
    button.textContent = buttonText;
  } else {
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
export function loadAndRenderHistory(
  containerId: string = "history-items",
  limit: number = 5
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    // logger.error("History container with ID " + containerId + " not found"); // Original code had logger, but logger is removed.
    return;
  }

  // Clear existing history items
  container.innerHTML = "";

  // Fetch history entries from storage
  chrome.storage.local.get(["downloadHistory"], result => {
    const history: HistoryEntry[] = result.downloadHistory || [];
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
    recentEntries.forEach(entry => {
      const item = document.createElement("div");
      item.className = "history-item status-" + entry.status;

      const title = document.createElement("div");
      title.className = "history-title";
      title.textContent = entry.page_title || "Unknown video";

      const meta = document.createElement("div");
      meta.className = "history-meta";
      meta.textContent =
        entry.status + "  " + new Date(entry.timestamp || Date.now()).toLocaleString();

      item.appendChild(title);
      item.appendChild(meta);
      container.appendChild(item);
    });

    // logger.debug("Rendered " + recentEntries.length + " history entries"); // Original code had logger, but logger is removed.
  });
}

// Load configuration from server or fallback to local storage
export async function loadConfig(): Promise<any> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "getConfig" }, (response: any) => {
      if (!chrome.runtime.lastError && response && (response.data || response.serverConfig)) {
        // Normalize to .data (background returns { status, data })
        const cfg = response.data || response.serverConfig;
        resolve(cfg);
      } else {
        chrome.storage.local.get("extensionConfig", (result: any) => {
          resolve(result.extensionConfig);
        });
      }
    });
  });
}

// Update download directory display element
export async function updateDownloadDirDisplay(): Promise<void> {
  const el = document.getElementById("download-dir-display");
  if (!el) return;
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "getConfig" }, (response: any) => {
      if (!chrome.runtime.lastError && response && (response.data || response.serverConfig)) {
        const cfg = response.data || response.serverConfig;
        el.textContent = "Saving to: " + (cfg?.download_dir || "");
        resolve();
      } else {
        chrome.storage.local.get("extensionConfig", (result: any) => {
          const cfg = result.extensionConfig || {};
          el.textContent = "Saving to: " + (cfg.download_dir || "");
          resolve();
        });
      }
    });
  });
}

// Update server port display element
export async function updatePortDisplay(): Promise<void> {
  const el = document.getElementById("server-port-display");
  if (!el) return;
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: "getConfig" }, (response: any) => {
      if (!chrome.runtime.lastError && response && (response.data || response.serverConfig)) {
        const cfg = response.data || response.serverConfig;
        el.textContent = "Server Port: " + (cfg?.server_port ?? "");
      }
      resolve();
    });
  });
}

// Show configuration error if present in local storage
export function showConfigErrorIfPresent(): void {
  const el = document.getElementById("config-error-display");
  if (!el) return;
  chrome.storage.local.get("configError", (result: any) => {
    if (result.configError) {
      el.textContent = "Configuration Error: " + result.configError;
      el.classList.remove("hidden");
      el.classList.add("evd-visible");
    }
  });
}

// Create a list item for errors with a toggle for details
export function createErrorListItem(
  downloadId: string,
  info: {
    filename: string;
    errorInfo: { type: string; message: string; original: string };
  }
): HTMLLIElement {
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
    info.errorInfo.type + ": " + info.errorInfo.message + " (" + info.errorInfo.original + ")";
  detailsEl.appendChild(content);
  // Add contextual help/troubleshooting link
  const helpBtn = document.createElement("button");
  helpBtn.className = "error-help-link";
  helpBtn.textContent = "Help";
  helpBtn.addEventListener("click", (): void => {
    // Open extension options page for troubleshooting
    (chrome.runtime as any).openOptionsPage();
  });
  detailsEl.appendChild(helpBtn);
  li.appendChild(detailsEl);
  return li;
}

// Create a generic list item with a resume button
export function createGenericListItem(downloadId: string, item: { status: string }): HTMLLIElement {
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
export function createQueuedListItem(item: { id: string }): HTMLLIElement {
  const li = document.createElement("li");
  li.classList.add("queued-item");
  li.dataset.downloadId = item.id;
  const queuedText = document.createElement("div");
  queuedText.className = "item-status";
  queuedText.textContent = "Queued: " + item.id;
  li.appendChild(queuedText);
  const removeBtn = document.createElement("button");
  removeBtn.className = "cancel-button";
  removeBtn.textContent = "Cancel";
  removeBtn.title = "Cancel download";
  removeBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "cancelDownload", downloadId: item.id }, () => {});
  });
  li.appendChild(removeBtn);
  return li;
}

// Create an active download list item with a pause button
export function createActiveListItem(
  downloadId: string,
  statusObj: {
    status: string;
    progress: number;
    filename?: string;
    error?: string;
    message?: string;
  }
): HTMLLIElement {
  const li = document.createElement("li");
  li.classList.add("active-item");
  li.classList.add("status-" + statusObj.status);
  li.dataset.downloadId = downloadId;
  const title = document.createElement("div");
  title.textContent = statusObj.filename || downloadId;
  li.appendChild(title);
  const progress = document.createElement("progress");
  // Sanitize and clamp progress to a finite value within [0, 100]
  const raw = Number(statusObj.progress);
  const finite = Number.isFinite(raw) ? raw : 0;
  const clamped = Math.min(100, Math.max(0, finite));
  progress.max = 100;
  progress.value = clamped;
  li.appendChild(progress);
  const percentLabel = document.createElement("span");
  percentLabel.className = "item-percent";
  percentLabel.textContent = String(Math.round(clamped)) + "%";
  li.appendChild(percentLabel);
  const statusText = document.createElement("div");
  statusText.className = "item-status";
  statusText.textContent = statusObj.status;
  li.appendChild(statusText);
  const btn = document.createElement("button");
  btn.className = "pause-button";
  btn.textContent = "Pause";
  btn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "pauseDownload", downloadId }, () => {});
  });
  li.appendChild(btn);
  // Priority control (optional)
  const priorityWrapper = document.createElement("div");
  priorityWrapper.className = "priority-controls";
  const select = document.createElement("select");
  select.className = "priority-select";
  const priorityOptions = [
    { label: "Low (+10)", value: 10 },
    { label: "Below normal (+5)", value: 5 },
    { label: "Normal (0)", value: 0 },
    { label: "Above normal (-5)", value: -5 },
  ];
  priorityOptions.forEach(opt => {
    const o = document.createElement("option");
    o.value = String(opt.value);
    o.textContent = opt.label;
    select.appendChild(o);
  });
  const setBtn = document.createElement("button");
  setBtn.className = "priority-set-button";
  setBtn.textContent = "Set Priority";
  setBtn.addEventListener("click", () => {
    const val = parseInt(select.value, 10);
    if (!Number.isFinite(val)) return;
    chrome.runtime.sendMessage({ type: "setPriority", downloadId, priority: val }, () => {});
  });
  priorityWrapper.appendChild(select);
  priorityWrapper.appendChild(setBtn);
  li.appendChild(priorityWrapper);
  return li;
}

// Drag-and-drop queue reordering handlers
export function handleDragStart(e: DragEvent): void {
  const li = e.currentTarget as HTMLLIElement;
  dragSrcIndex = Array.from(li.parentElement!.children).indexOf(li);
  e.dataTransfer!.effectAllowed = "move";
  e.dataTransfer!.setData("text/plain", li.dataset.downloadId!);
  li.classList.add("dragging");
}

export function handleDragOver(e: DragEvent): void {
  e.preventDefault();
  const li = e.currentTarget as HTMLLIElement;
  li.classList.add("drag-over");
  e.dataTransfer!.dropEffect = "move";
}

export function handleDragLeave(e: DragEvent): void {
  const li = e.currentTarget as HTMLLIElement;
  li.classList.remove("drag-over");
}

export function handleDrop(e: DragEvent): void {
  e.preventDefault();
  const li = e.currentTarget as HTMLLIElement;
  li.classList.remove("drag-over");
  if (dragSrcIndex === null) return;
  const dropIndex = Array.from(li.parentElement!.children).indexOf(li);
  // Collect current ids
  const listEls = Array.from(li.parentElement!.children) as HTMLLIElement[];
  const ids = listEls.map(el => el.dataset.downloadId!);
  // Reorder array
  const reordered = [...ids];
  const [moved] = reordered.splice(dragSrcIndex, 1);
  reordered.splice(dropIndex, 0, moved);
  // Notify background of new queue order
  chrome.runtime.sendMessage({ type: "reorderQueue", queue: reordered });
}

export function handleDragEnd(e: DragEvent): void {
  (e.currentTarget as HTMLLIElement).classList.remove("dragging");
}

// Render current downloads and queued items
export function renderDownloadStatus(data: { active: Record<string, any>; queue: string[] }): void {
  const container = document.getElementById("download-status");
  if (!container) return;
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
    activeIds.forEach(id => {
      const statusObj = data.active[id];
      let liEl: HTMLLIElement;
      if (statusObj.status === "error") {
        liEl = createErrorListItem(id, {
          filename: statusObj.filename || id,
          errorInfo: {
            type: "Error",
            message: statusObj.error || "Error",
            original: statusObj.message || "",
          },
        });
      } else if (statusObj.status === "paused") {
        liEl = createGenericListItem(id, { status: "paused" });
        liEl.querySelector("button.resume-button")?.addEventListener("click", () => {
          chrome.runtime.sendMessage({ type: "resumeDownload", downloadId: id }, () => {});
        });
      } else {
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
    queuedIds.forEach(id => {
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
export function updatePopupServerStatus(status: "connected" | "disconnected" | "checking"): void {
  const indicator = document.getElementById("server-status-indicator");
  const text = document.getElementById("server-status-text");

  if (indicator && text) {
    // Remove all status classes
    indicator.classList.remove("connected", "disconnected");
    text.classList.remove("status-connected", "status-disconnected");

    switch (status) {
      case "connected":
        indicator.classList.add("connected");
        text.classList.add("status-connected");
        chrome.storage.local.get("serverPort", res => {
          const port = res.serverPort || "?";
          (text as HTMLElement).textContent = `Server: Connected @ ${port}`;
        });
        break;
      case "disconnected":
        indicator.classList.add("disconnected");
        text.classList.add("status-disconnected");
        (text as HTMLElement).textContent = "Server: Disconnected";
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
export async function initPopup(): Promise<void> {
  // Initialize theme
  await applyPopupTheme();

  // Set up settings button click handler
  const settingsButton = document.getElementById("open-settings");
  if (settingsButton) {
    settingsButton.addEventListener("click", () => {
      (chrome.runtime as any).openOptionsPage();
    });
  }

  // Helper to send a message to the active tab's content script
  const sendToActiveTab = (message: any, callback?: (response: any) => void): void => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const tabId = tabs && tabs[0] && tabs[0].id;
        if (tabId !== undefined) {
          chrome.tabs.sendMessage(tabId, message, resp => {
            // Swallow lastError; content script may not be injected on internal pages
            if (callback) callback(resp);
          });
        } else if (callback) {
          callback(undefined);
        }
      });
    } catch {
      if (callback) callback(undefined);
    }
  };

  // Wire HIDE/SHOW toggle
  const toggleBtn = document.getElementById(
    "toggle-enhanced-download-button"
  ) as HTMLButtonElement | null;
  if (toggleBtn) {
    // Initialize label based on active tab's per-domain state
    try {
      sendToActiveTab({ type: "getButtonVisibility" }, resp => {
        if (resp && resp.success) {
          toggleBtn.textContent = resp.hidden ? "SHOW" : "HIDE";
        }
      });
    } catch {
      // ignore init label failures
    }

    toggleBtn.addEventListener("click", () => {
      const currentlyHiding = toggleBtn.textContent?.trim().toUpperCase() === "HIDE";
      const newHidden = currentlyHiding; // if showing, next action hides
      sendToActiveTab({ type: "toggleButtonVisibility", hidden: newHidden }, () => {
        toggleBtn.textContent = newHidden ? "SHOW" : "HIDE";
      });
    });
  }

  // Wire RESET position
  const resetBtn = document.getElementById("reset-button-position") as HTMLButtonElement | null;
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      sendToActiveTab({ type: "resetButtonPosition" }, () => {
        // no-op
      });
    });
  }

  // Initialize download status
  chrome.runtime.sendMessage({ type: "getQueue" }, (response: any) => {
    renderDownloadStatus(response || { active: {}, queue: [] });
  });

  // --- History wiring (pagination + live updates) ---
  const historyListEl = document.getElementById("download-history") as HTMLElement | null;
  const prevPageBtn = document.getElementById("prev-page") as HTMLButtonElement | null;
  const nextPageBtn = document.getElementById("next-page") as HTMLButtonElement | null;
  const itemsPerPageSelect = document.getElementById("items-per-page") as HTMLSelectElement | null;
  const pageInfoEl = document.getElementById("page-info") as HTMLElement | null;

  let currentPage = 1;
  let perPage = (() => {
    const v = itemsPerPageSelect?.value;
    const n = v ? parseInt(v, 10) : 50;
    return Number.isFinite(n) && n > 0 ? n : 50;
  })();

  const refreshHistory = async (): Promise<void> => {
    try {
      if (!historyListEl) return;
      const { history, totalItems } = await fetchHistory(currentPage, perPage);
      renderHistoryItems(
        history,
        currentPage,
        perPage,
        totalItems,
        historyListEl,
        pageInfoEl || undefined,
        prevPageBtn || undefined,
        nextPageBtn || undefined
      );
    } catch (e) {
      // Keep popup resilient; ignore render errors
    }
  };

  if (itemsPerPageSelect) {
    itemsPerPageSelect.addEventListener("change", () => {
      const n = parseInt(itemsPerPageSelect.value, 10);
      perPage = Number.isFinite(n) && n > 0 ? n : perPage;
      currentPage = 1;
      void refreshHistory();
    });
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage -= 1;
        void refreshHistory();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener("click", () => {
      // Bounds are enforced by renderHistoryItems disabling button, but we also guard here
      currentPage += 1;
      void refreshHistory();
    });
  }

  // Initial history load
  await refreshHistory();

  // Set up message listeners
  chrome.runtime.onMessage.addListener((msg: any) => {
    if (msg.type === "downloadStatusUpdate") {
      renderDownloadStatus(msg.data);
    } else if (msg.type === "queueUpdated") {
      renderDownloadStatus({ active: msg.active, queue: msg.queue });
    } else if (msg.type === "historyUpdated") {
      // Keep current page if possible
      void refreshHistory();
    } else if (msg.type === "serverStatusUpdate") {
      updatePopupServerStatus(msg.status);
    }
  });
}

// Initialize popup when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initPopup().catch(error => {
    console.error("Error initializing popup:", error);
  });
});
