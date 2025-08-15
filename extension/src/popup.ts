/* eslint-disable no-restricted-syntax */
// This file contains whitelisted unicode icons for status display
// See config/emoji_whitelist.json for allowed icons
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
    /* ignore */
  }
});
/**
 * Enhanced Video Downloader - Popup Script
 * Handles popup UI interactions and server communication
 */

import { Theme, ServerConfig, HistoryEntry, ActiveDownloadMap, QueuedDetailsMap } from "./types";
import {
  MESSAGE_TYPES,
  STORAGE_KEYS,
  CSS_CLASSES,
  STATUS_CONSTANTS,
  DOM_SELECTORS,
} from "./core/constants";
import { domManager } from "./core/dom-manager";
import {
  fetchHistory,
  renderHistoryItems,
  removeHistoryItemAndNotify,
  removeHistoryItemByUrlAndNotify,
} from "./history";
import { queueManager } from "./background-queue";

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
let lastDownloadStatusData: {
  active: ActiveDownloadMap;
  queue: string[];
  queuedDetails?: QueuedDetailsMap;
} | null = null;

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

  const statusEl = domManager.querySelector(DOM_SELECTORS.STATUS_MESSAGE);
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = isError ? CSS_CLASSES.STATUS_ERROR : CSS_CLASSES.STATUS_SUCCESS;

    if (isError) {
      const tip = document.createElement("div");
      tip.className = CSS_CLASSES.ERROR_TIP;
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
    const result = await chrome.storage.local.get(STORAGE_KEYS.THEME);
    const storedTheme = result.theme as "light" | "dark" | undefined;

    if (storedTheme) {
      isDark = storedTheme === "dark";
    } else {
      // Fallback to system preference
      isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
  }

  document.body.classList.toggle(CSS_CLASSES.DARK_THEME, isDark);
  // Always use compact density for popup to maximize information density
  document.body.classList.add(CSS_CLASSES.COMPACT);

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
    buttonId = (isActiveOrButtonId as string) || DOM_SELECTORS.TOGGLE_BUTTON.replace("#", "");
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
  button.classList.toggle(CSS_CLASSES.ACTIVE, isActive);
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
  chrome.storage.local.get([STORAGE_KEYS.DOWNLOAD_HISTORY], result => {
    const history: HistoryEntry[] = result.downloadHistory || [];
    const recentEntries = history.slice(0, limit);

    if (recentEntries.length === 0) {
      // Display message when no history exists
      const emptyMessage = document.createElement("div");
      emptyMessage.className = CSS_CLASSES.HISTORY_EMPTY;
      emptyMessage.textContent = "No download history yet";
      container.appendChild(emptyMessage);
      return;
    }

    // Create history items
    recentEntries.forEach(entry => {
      const item = document.createElement("div");
      item.className = CSS_CLASSES.HISTORY_ITEM + " " + CSS_CLASSES.STATUS_PREFIX + entry.status;

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
export async function loadConfig(): Promise<ServerConfig | Record<string, unknown> | undefined> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage(
      { type: "getConfig" },
      (response: { data?: ServerConfig; serverConfig?: ServerConfig } | undefined) => {
        if (!chrome.runtime.lastError && response && (response.data || response.serverConfig)) {
          const cfg = response.data || response.serverConfig;
          resolve(cfg);
        } else {
          chrome.storage.local.get(
            "extensionConfig",
            (result: { extensionConfig?: ServerConfig } | undefined) => {
              resolve(result?.extensionConfig);
            }
          );
        }
      }
    );
  });
}

// Update download directory display element
export async function updateDownloadDirDisplay(): Promise<void> {
  const el = document.querySelector(DOM_SELECTORS.DOWNLOAD_DIR_DISPLAY);
  if (!el) return;
  return new Promise(resolve => {
    chrome.runtime.sendMessage(
      { type: "getConfig" },
      (response: { data?: ServerConfig; serverConfig?: ServerConfig } | undefined) => {
        if (!chrome.runtime.lastError && response && (response.data || response.serverConfig)) {
          const cfg = response.data || response.serverConfig;
          (el as HTMLElement).textContent = "Saving to: " + (cfg?.download_dir || "");
          resolve();
        } else {
          chrome.storage.local.get(
            "extensionConfig",
            (result: { extensionConfig?: ServerConfig } | undefined) => {
              const cfg = result?.extensionConfig || ({} as ServerConfig);
              (el as HTMLElement).textContent = "Saving to: " + (cfg.download_dir || "");
              resolve();
            }
          );
        }
      }
    );
  });
}

// Update server port display element
export async function updatePortDisplay(): Promise<void> {
  const el = document.querySelector(DOM_SELECTORS.SERVER_PORT_DISPLAY);
  if (!el) return;
  return new Promise(resolve => {
    chrome.runtime.sendMessage(
      { type: "getConfig" },
      (response: { data?: ServerConfig; serverConfig?: ServerConfig } | undefined) => {
        if (!chrome.runtime.lastError && response && (response.data || response.serverConfig)) {
          const cfg = response.data || response.serverConfig;
          (el as HTMLElement).textContent = "Server Port: " + (cfg?.server_port ?? "");
        }
        resolve();
      }
    );
  });
}

// Show configuration error if present in local storage
export function showConfigErrorIfPresent(): void {
  const el = document.querySelector(DOM_SELECTORS.CONFIG_ERROR_DISPLAY);
  if (!el) return;
  chrome.storage.local.get(
    STORAGE_KEYS.CONFIG_ERROR,
    (result: { configError?: string } | undefined) => {
      if (result?.configError) {
        (el as HTMLElement).textContent = "Configuration Error: " + result.configError;
        el.classList.remove(CSS_CLASSES.HIDDEN);
        el.classList.add(CSS_CLASSES.EVD_VISIBLE);
      }
    }
  );
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
  li.classList.add(CSS_CLASSES.STATUS_PREFIX + severity);
  li.classList.add(CSS_CLASSES.SEVERITY_PREFIX + severity);
  li.dataset.downloadId = downloadId;
  const title = document.createElement("div");
  title.className = "item-title";
  title.textContent = info.filename;
  li.appendChild(title);
  // Use semantic <details> for error details
  const detailsEl = document.createElement("details");
  detailsEl.className = CSS_CLASSES.ERROR_DETAILS;
  const summary = document.createElement("summary");
  summary.textContent = "Details";
  detailsEl.appendChild(summary);
  const content = document.createElement("div");
  content.className = CSS_CLASSES.ERROR_DETAILS_CONTENT;
  content.textContent =
    info.errorInfo.type + ": " + info.errorInfo.message + " (" + info.errorInfo.original + ")";
  detailsEl.appendChild(content);
  // Add contextual help/troubleshooting link
  const helpBtn = document.createElement("button");
  helpBtn.className = CSS_CLASSES.ERROR_HELP_LINK;
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
  li.classList.add(CSS_CLASSES.STATUS_PREFIX + item.status);
  const statusText = document.createElement("div");
  statusText.className = CSS_CLASSES.ITEM_STATUS;
  statusText.textContent = item.status;
  li.appendChild(statusText);
  li.dataset.downloadId = downloadId;
  const btn = document.createElement("button");
  btn.className = CSS_CLASSES.RESUME_BUTTON;
  btn.textContent = "Resume";
  li.appendChild(btn);
  return li;
}

// Create a queued list item with a cancel button
export function createQueuedListItem(item: { id: string }): HTMLLIElement {
  const li = document.createElement("li");
  li.classList.add(CSS_CLASSES.QUEUED_ITEM);
  li.dataset.downloadId = item.id;
  const queuedText = document.createElement("div");
  queuedText.className = CSS_CLASSES.ITEM_STATUS;
  queuedText.textContent = "Queued: " + item.id;
  li.appendChild(queuedText);
  const removeBtn = document.createElement("button");
  removeBtn.className = CSS_CLASSES.CANCEL_BUTTON;
  removeBtn.textContent = "Cancel";
  removeBtn.title = "Cancel download";
  removeBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage(
      { type: MESSAGE_TYPES.CANCEL_DOWNLOAD, downloadId: item.id },
      () => {}
    );
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
  li.classList.add(CSS_CLASSES.ACTIVE_ITEM);
  li.classList.add(CSS_CLASSES.STATUS_PREFIX + statusObj.status);
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
  percentLabel.className = CSS_CLASSES.ITEM_PERCENT;
  percentLabel.textContent = String(Math.round(clamped)) + "%";
  li.appendChild(percentLabel);
  const statusText = document.createElement("div");
  statusText.className = CSS_CLASSES.ITEM_STATUS;
  statusText.textContent = statusObj.status;
  li.appendChild(statusText);
  const btn = document.createElement("button");
  btn.className = `${CSS_CLASSES.BTN_SECONDARY} ${CSS_CLASSES.BTN_SMALL} ${CSS_CLASSES.PAUSE_BUTTON}`;
  btn.textContent = "Pause";
  btn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.PAUSE_DOWNLOAD, downloadId }, () => {});
  });
  li.appendChild(btn);
  // Priority control (optional)
  const priorityWrapper = document.createElement("div");
  priorityWrapper.className = CSS_CLASSES.PRIORITY_CONTROLS;
  const select = document.createElement("select");
  select.className = `input input--select input--small ${CSS_CLASSES.PRIORITY_SELECT}`;
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
  setBtn.className = `${CSS_CLASSES.BTN_SECONDARY} ${CSS_CLASSES.BTN_SMALL} ${CSS_CLASSES.PRIORITY_SET_BUTTON}`;
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
  li.classList.add(CSS_CLASSES.DRAGGING);
}

export function handleDragOver(e: DragEvent): void {
  e.preventDefault();
  const li = e.currentTarget as HTMLLIElement;
  li.classList.add(CSS_CLASSES.DRAG_OVER);
  e.dataTransfer!.dropEffect = "move";
}

export function handleDragLeave(e: DragEvent): void {
  const li = e.currentTarget as HTMLLIElement;
  li.classList.remove(CSS_CLASSES.DRAG_OVER);
}

export function handleDrop(e: DragEvent): void {
  e.preventDefault();
  const li = e.currentTarget as HTMLLIElement;
  li.classList.remove(CSS_CLASSES.DRAG_OVER);
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
  chrome.runtime.sendMessage({ type: MESSAGE_TYPES.REORDER_QUEUE, queue: reordered });
}

export function handleDragEnd(e: DragEvent): void {
  (e.currentTarget as HTMLLIElement).classList.remove(CSS_CLASSES.DRAGGING);
}

// Render current downloads and queued items
export async function renderDownloadStatus(data: {
  active: ActiveDownloadMap;
  queue: string[];
  queuedDetails?: QueuedDetailsMap;
}): Promise<void> {
  lastDownloadStatusData = data;
  const container = domManager.querySelector(DOM_SELECTORS.DOWNLOAD_STATUS);
  if (!container) return;
  // Preserve scroll to avoid snapping to top during refresh
  const prevScrollTopInitial = (container as HTMLElement).scrollTop;
  container.innerHTML = "";

  // Helper to render a list of unified entries into the container
  const renderUnified = (unified: Unified[]): void => {
    // Handle empty case - show "no downloads" message
    if (!unified || unified.length === 0) {
      const noDownloadsMsg = document.createElement("li");
      noDownloadsMsg.className = "no-downloads-message";
      noDownloadsMsg.textContent = "No active or queued downloads.";
      container.appendChild(noDownloadsMsg);
      return;
    }

    // Sort unified list: newest first by timestamp; ensure active/queued bubble to top via recent timestamps
    unified.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // Render unified list into the existing container (#download-status)
    const ul = container as HTMLUListElement;
    ul.classList.add(CSS_CLASSES.UNIFIED_LIST);
    (ul.style as any).listStyleType = "none";
    unified.forEach(item => {
      const li = document.createElement("li");
      li.className =
        CSS_CLASSES.UNIFIED_ITEM +
        " " +
        CSS_CLASSES.STATUS_PREFIX +
        String(item.status).toLowerCase();
      li.dataset.downloadId = item.id;

      // Status icon replacing bullet
      const normalized = String(item.status || "").toLowerCase();
      const icon = document.createElement("span");
      icon.className = CSS_CLASSES.STATUS_ICON;
      // Choose status icon (use whitelisted symbols; see config/emoji_whitelist.json)
      if (normalized === "queued" || normalized === "pending" || normalized === "waiting") {
        icon.textContent = "⏰"; // clock icon (whitelisted)
      } else if (normalized === "downloading") {
        icon.style.color = "var(--success-color)";
        icon.innerHTML =
          '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 3v12.17l3.59-3.58L17 13l-5 5-5-5 1.41-1.41L11 15.17V3h1z"/></svg>';
      } else if (normalized === "paused") {
        icon.textContent = "⏸"; // pause icon (whitelisted)
      } else if (["success", "complete", "completed", "done"].includes(normalized)) {
        icon.textContent = "✓"; // check mark icon (whitelisted)
        icon.style.color = "var(--success-color)"; // Make it green
      } else if (["canceled", "cancelled"].includes(normalized)) {
        icon.textContent = "✘"; // cancel icon (whitelisted)
      } else if (["error", "failed", "fail"].includes(normalized)) {
        icon.textContent = "⚠"; // warning icon (whitelisted)
      } else {
        icon.textContent = "?"; // question mark for unknown statuses
      }
      icon.setAttribute("aria-hidden", "true");
      li.appendChild(icon);

      const title = document.createElement("div");
      title.className = "item-title";
      title.textContent = item.label;
      li.appendChild(title);

      if (normalized === "downloading" || normalized === "paused") {
        const progress = document.createElement("progress");
        const raw = Number(item.progress);
        const finite = Number.isFinite(raw) ? raw : 0;
        const clamped = Math.min(100, Math.max(0, finite));
        progress.max = 100;
        progress.value = clamped;
        if (normalized === "downloading")
          (progress.style as any).accentColor = "var(--success-color)";
        li.appendChild(progress);
        const percentLabel = document.createElement("span");
        percentLabel.className = CSS_CLASSES.ITEM_PERCENT;
        percentLabel.textContent = String(Math.round(clamped)) + "%";
        li.appendChild(percentLabel);
      }

      // Do not render progress or percent for completed entries

      const normalized2 = String(item.status || "").toLowerCase();
      // For queued-like statuses, 'downloading', and 'completed', omit the status pill (we already show an icon/progress)
      if (!["queued", "pending", "waiting", "downloading", "completed"].includes(normalized2)) {
        const statusPill = document.createElement("span");
        statusPill.className = CSS_CLASSES.STATUS_PILL;
        statusPill.textContent = item.status;
        if (["success", "complete", "completed", "done"].includes(normalized2)) {
          statusPill.classList.add(CSS_CLASSES.IS_SUCCESS);
        } else if (["error", "failed", "fail", "canceled", "cancelled"].includes(normalized2)) {
          statusPill.classList.add(CSS_CLASSES.IS_ERROR);
        } else if (["paused"].includes(normalized2)) {
          statusPill.classList.add(CSS_CLASSES.IS_WARNING);
        }
        li.appendChild(statusPill);
      }

      // Add a cancel button per entry; enable only for queued/active/paused
      const cancelBtn = document.createElement("button");
      cancelBtn.className = `${CSS_CLASSES.BTN_SECONDARY} ${CSS_CLASSES.BTN_SMALL} ${CSS_CLASSES.CANCEL_BUTTON}`;
      cancelBtn.textContent = "X";
      cancelBtn.title = "Cancel";
      cancelBtn.setAttribute("aria-label", "Cancel");

      if (normalized === "queued") {
        cancelBtn.disabled = false;
        cancelBtn.addEventListener("click", e => {
          e.stopPropagation();
          // Optimistically remove the item from UI immediately
          try {
            li.remove();
          } catch {
            /* ignore */
          }
          // Send message to background script
          chrome.runtime.sendMessage(
            { type: MESSAGE_TYPES.REMOVE_FROM_QUEUE, downloadId: item.id },
            response => {
              // Response received - no action needed
            }
          );
        });

        // Add a Force start button for queued entries
        const forceBtn = document.createElement("button");
        // Match shape/size with other inline buttons; color the icon green without bespoke classes
        forceBtn.className = `${CSS_CLASSES.BTN_SECONDARY} ${CSS_CLASSES.BTN_SMALL}`;
        forceBtn.setAttribute("aria-label", "Start");
        // Inline SVG so we can color via currentColor (no emoji whitelist dependency)
        forceBtn.style.color = "var(--success)";
        forceBtn.innerHTML =
          '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
        forceBtn.title = "Force start now";
        forceBtn.setAttribute("aria-label", "Force start");
        forceBtn.addEventListener("click", async e => {
          e.stopPropagation();
          try {
            const res = await chrome.storage.local.get(STORAGE_KEYS.SERVER_PORT);
            const port = (res as any)?.serverPort;
            if (typeof port === "number" && Number.isFinite(port)) {
              const resp = await fetch(
                `http://127.0.0.1:${port}/api/queue/${encodeURIComponent(item.id)}/force-start`,
                {
                  method: "POST",
                }
              );
              if (resp.ok) {
                // Disable button to indicate action taken
                (forceBtn as HTMLButtonElement).disabled = true;
              } else if (resp.status === 404) {
                // Item no longer in queue; refresh UI and inform user
                try {
                  setStatus("Item no longer in queue", true, 2000);
                } catch {}
                chrome.runtime.sendMessage({ type: "getQueue" }, (response: any) => {
                  void renderDownloadStatus(response || { active: {}, queue: [] });
                });
              }
            }
          } catch {
            // ignore network errors; UI will refresh via polling
          }
        });
        li.appendChild(forceBtn);
      } else if (normalized === "downloading" || normalized === "paused") {
        cancelBtn.disabled = false;
        cancelBtn.addEventListener("click", e => {
          e.stopPropagation();
          // Optimistically remove the item from UI immediately
          try {
            li.remove();
          } catch {
            /* ignore */
          }
          // Send message to background script
          chrome.runtime.sendMessage(
            { type: MESSAGE_TYPES.CANCEL_DOWNLOAD, downloadId: item.id },
            () => {}
          );
        });
      } else {
        // Inactive entry: use cancel as delete
        cancelBtn.disabled = false;
        cancelBtn.title = "Delete";
        cancelBtn.addEventListener("click", async e => {
          e.preventDefault();
          e.stopImmediatePropagation();
          e.stopPropagation();
          // Prefer deletion by stable id; fall back to URL
          if (item.id) await removeHistoryItemAndNotify(item.id);
          else if (item.url) await removeHistoryItemByUrlAndNotify(item.url);
          // Optimistically update UI to remove the row immediately
          try {
            li.remove();
          } catch {
            /* ignore */
          }
        });
      }
      // Defer appending cancel/delete button so it always renders at the far right

      // Add a pause button for actively downloading entries
      if (normalized === "downloading") {
        const pauseBtn = document.createElement("button");
        pauseBtn.className = `${CSS_CLASSES.BTN_SECONDARY} ${CSS_CLASSES.BTN_SMALL} ${CSS_CLASSES.PAUSE_BUTTON}`;
        pauseBtn.textContent = "⏸"; // pause icon (whitelisted)
        pauseBtn.setAttribute("aria-label", "Pause");
        pauseBtn.title = "Pause";
        pauseBtn.setAttribute("aria-label", "Pause");
        pauseBtn.addEventListener("click", e => {
          e.stopPropagation();
          chrome.runtime.sendMessage(
            { type: MESSAGE_TYPES.PAUSE_DOWNLOAD, downloadId: item.id },
            () => {}
          );
        });
        li.appendChild(pauseBtn);
      }

      // Add a resume button for paused entries
      if (normalized === "paused") {
        const resumeBtn = document.createElement("button");
        resumeBtn.className = CSS_CLASSES.RESUME_BUTTON;
        resumeBtn.textContent = "Resume";
        resumeBtn.title = "Resume";
        resumeBtn.setAttribute("aria-label", "Resume");
        resumeBtn.addEventListener("click", e => {
          e.stopPropagation();
          chrome.runtime.sendMessage(
            { type: MESSAGE_TYPES.RESUME_DOWNLOAD, downloadId: item.id },
            () => {}
          );
        });
        li.appendChild(resumeBtn);
      }

      // Add a retry button (⟳) for failed/canceled entries
      if (["error", "failed", "fail", "canceled", "cancelled"].includes(normalized)) {
        const retryBtn = document.createElement("button");
        retryBtn.className = `${CSS_CLASSES.BTN_PRIMARY} ${CSS_CLASSES.BTN_SMALL} ${CSS_CLASSES.RETRY_BUTTON}`;
        retryBtn.textContent = "Retry";
        retryBtn.title = "Retry";
        retryBtn.setAttribute("aria-label", "Retry");
        retryBtn.addEventListener("click", e => {
          e.stopPropagation();
          if (!item.url) {
            // Try to get URL from other sources or provide helpful error
            const fallbackUrl = (item as any).webpage_url || (item as any).original_url;
            if (fallbackUrl) {
              // Use fallback URL for retry
              chrome.runtime.sendMessage(
                {
                  type: "downloadVideo",
                  url: fallbackUrl,
                  pageTitle: item.pageTitle || item.label,
                },
                () => {}
              );
              return;
            }
            // No URL available - show helpful error message
            setStatus("Original URL unavailable for retry. This download cannot be retried.", true, 5000);
            return;
          }
          chrome.runtime.sendMessage(
            {
              type: "downloadVideo",
              url: item.url,
              pageTitle: item.pageTitle || item.label,
            },
            () => {}
          );
        });
        li.appendChild(retryBtn);
      }

      // Append cancel/delete as the last action so it stays on the far right
      li.appendChild(cancelBtn);

      ul.appendChild(li);
    });
  };

  // Build unified entries: active + queued (render immediately for responsiveness)
  type Unified = {
    id: string;
    status: string;
    label: string;
    progress?: number;
    timestamp?: number;
    url?: string;
    pageTitle?: string;
  };
  const unified: Unified[] = [];

  // Derive a human-friendly label from available fields
  const computeLabel = (
    providedLabel: string | undefined,
    filename?: string,
    url?: string,
    id?: string
  ): string => {
    const raw = String((providedLabel || "").trim());
    if (raw && raw.toLowerCase() !== "video") return raw;
    if (filename && String(filename).trim()) return String(filename).trim();
    if (url) {
      try {
        const u = new URL(url);
        // Prefer last non-empty path segment
        const segs = u.pathname.split("/").filter(Boolean);
        if (u.hostname.includes("youtube.com")) {
          const vid = u.searchParams.get("v");
          if (vid) return `youtube:${vid}`;
          if (segs[0] === "shorts" && segs[1]) return `yt shorts:${segs[1]}`;
        }
        if (segs.length > 0) return `${u.hostname}/${segs[segs.length - 1]}`;
        return u.hostname;
      } catch {
        // ignore URL parse errors
      }
    }
    // Last resort: show shortened id if present
    if (id) return `id:${String(id).slice(0, 6)}…`;
    return "Unknown";
  };

  // Status normalizer to enforce a single final state for completed downloads
  const normalizeStatus = (raw: string): string => {
    const s = String(raw || "").toLowerCase();
    if (["success", "complete", "completed", "done", "finished"].includes(s)) return "completed";
    if (["fail", "failed"].includes(s)) return "error";
    if (["cancelled"].includes(s)) return "canceled";
    if (["waiting"].includes(s)) return "queued";
    return s || "queued";
  };

  // Active downloads
  Object.entries(data.active || {}).forEach(([id, st]) => {
    const statusObj = st as any;
    const label = computeLabel(
      (statusObj as any).title || (statusObj as any).page_title,
      statusObj.filename,
      statusObj.url,
      id
    );
    const prog = Number(statusObj.progress);
    const norm = normalizeStatus(String(statusObj.status || "downloading"));
    unified.push({
      id,
      status: norm,
      label,
      progress: prog,
      timestamp: Date.now(),
    });
  });

  // Queued downloads
  const qDetails = data.queuedDetails || {};
  (data.queue || []).forEach(id => {
    const info = qDetails[id] || {};
    // prefer original page title if provided from server, otherwise fallback
    const label = computeLabel(
      (info as any).title || (info as any).page_title,
      (info as any).filename,
      (info as any).url,
      id
    );
    unified.push({ id, status: "queued", label, timestamp: Date.now() - 1 });
  });

  // Do not block on history; it will be appended below once fetched

  // Render immediate items (active + queued)
  renderUnified(unified);
  // Restore scroll position after initial render
  (container as HTMLElement).scrollTop = prevScrollTopInitial;

  // Fetch all history (no pagination; scroll instead) and append when available
  try {
    const result: any = await fetchHistory(1, 10000);
    const histList: any[] = Array.isArray(result?.history) ? result.history : [];
    const historyUnified: Unified[] = [];
    for (const h of histList) {
      const id = String((h as any).id || Math.random());
      const label = computeLabel(
        (h as any).page_title || (h as any).title,
        (h as any).filename,
        (h as any).url,
        id
      );
      historyUnified.push({
        id,
        status: normalizeStatus(String(h.status || "completed")),
        label,
        timestamp: Number(h.timestamp) || Date.now(),
        url: h.url as string | undefined,
        pageTitle: (h.page_title || (h as any).title) as string | undefined,
      });
    }

    // Merge and deduplicate by id, preferring final statuses
    const priority: Record<string, number> = {
      completed: 5,
      error: 4,
      canceled: 3,
      downloading: 2,
      queued: 1,
      paused: 1,
    };
    const byId = new Map<string, Unified>();
    const canonUrl = (u?: string): string => {
      if (!u) return "";
      try {
        const p = new URL(u);
        const host = p.hostname.replace(/^www\./i, "").toLowerCase();
        const path = p.pathname.replace(/\/$/, "");
        return host + path.toLowerCase();
      } catch {
        return String(u);
      }
    };
    const take = (item: Unified): void => {
      // Prefer stable download id when present; fallback to canonicalized URL
      const key = item.id || canonUrl(item.url as string | undefined);
      const existing = byId.get(key);
      if (!existing) {
        byId.set(key, item);
        return;
      }
      const a = priority[String(existing.status).toLowerCase()] || 0;
      const b = priority[String(item.status).toLowerCase()] || 0;
      if (b > a || (b === a && (item.timestamp || 0) > (existing.timestamp || 0))) {
        byId.set(key, item);
      }
    };

    // Prefer history entries when they indicate completion/error; otherwise keep active/queued
    [...unified, ...historyUnified].forEach(take);

    // Re-render final merged list
    const prevScrollTopMerged = (container as HTMLElement).scrollTop;
    container.innerHTML = "";
    renderUnified(Array.from(byId.values()));
    // Restore scroll position after merge render
    (container as HTMLElement).scrollTop = prevScrollTopMerged;
  } catch {
    // ignore history rendering errors
  }
}

/**
 * Updates the server status indicator in the popup.
 * @param status - The server status ('connected', 'disconnected', or 'checking')
 */
export function updatePopupServerStatus(status: "connected" | "disconnected" | "checking"): void {
  const indicator = document.querySelector(DOM_SELECTORS.STATUS_INDICATOR);
  const text = document.querySelector(DOM_SELECTORS.STATUS_TEXT);

  if (indicator && text) {
    // Remove all status classes
    indicator.classList.remove(CSS_CLASSES.CONNECTED, CSS_CLASSES.DISCONNECTED);
    text.classList.remove(CSS_CLASSES.STATUS_CONNECTED, CSS_CLASSES.STATUS_DISCONNECTED);

    switch (status) {
      case STATUS_CONSTANTS.CONNECTED:
        indicator.classList.add(CSS_CLASSES.CONNECTED);
        text.classList.add(CSS_CLASSES.STATUS_CONNECTED);
        chrome.storage.local.get(STORAGE_KEYS.SERVER_PORT, res => {
          const port = res.serverPort || "?";
          (text as HTMLElement).textContent = `Server: Connected @ ${port}`;
        });
        break;
      case STATUS_CONSTANTS.DISCONNECTED:
        indicator.classList.add(CSS_CLASSES.DISCONNECTED);
        text.classList.add(CSS_CLASSES.STATUS_DISCONNECTED);
        (text as HTMLElement).textContent = "Server: Disconnected";
        break;
      case STATUS_CONSTANTS.CHECKING:
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

  // Initialize server status immediately
  try {
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_SERVER_STATUS }, (resp: any) => {
      if (!chrome.runtime.lastError && resp && resp.status) {
        updatePopupServerStatus(resp.status);
      }
    });
  } catch {
    // ignore
  }

  // Set up settings button click handler
  const settingsButton = domManager.querySelector(DOM_SELECTORS.SETTINGS_BUTTON);
  if (settingsButton) {
    settingsButton.addEventListener("click", () => {
      (chrome.runtime as any).openOptionsPage();
    });
  }

  // Wire Side Panel open (Chrome Side Panel API)
  const sidepanelBtn = domManager.querySelector(DOM_SELECTORS.SIDE_PANEL_BUTTON);
  if (sidepanelBtn) {
    sidepanelBtn.addEventListener("click", async () => {
      const hasSidePanel = Boolean((chrome as any).sidePanel && (chrome.sidePanel as any).open);
      if (hasSidePanel) {
        try {
          const tabs = await new Promise<any[]>(resolve => {
            chrome.tabs.query({ active: true, currentWindow: true }, resolve);
          });
          const tabId = tabs?.[0]?.id;
          if (tabId !== undefined && (chrome.sidePanel as any).setOptions) {
            await (chrome.sidePanel as any).setOptions({
              tabId,
              path: "extension/dist/popup.html",
              enabled: true,
            });
          }
          await (chrome.sidePanel as any).open({ tabId });
          return;
        } catch {
          // fall through to tab fallback
        }
      }
      // Fallback: open the popup page in a regular tab
      try {
        const url = chrome.runtime.getURL("extension/dist/popup.html");
        chrome.tabs.create({ url }, () => {
          const hasError = Boolean(chrome.runtime && (chrome.runtime as any).lastError);
          if (hasError) {
            // intentionally ignored; opening a tab can fail on some pages
          }
        });
      } catch {
        // ignore
      }
    });
  }

  // Helper to send a message to the active tab's content script
  const sendToActiveTab = (message: unknown, callback?: (response: unknown) => void): void => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        const tabId = tabs && tabs[0] && tabs[0].id;
        if (tabId !== undefined) {
          chrome.tabs.sendMessage(tabId, message as any, resp => {
            const hasError = Boolean(chrome.runtime && (chrome.runtime as any).lastError);
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
  const toggleBtn = domManager.querySelector(
    DOM_SELECTORS.TOGGLE_BUTTON
  ) as HTMLButtonElement | null;
  if (toggleBtn) {
    // Initialize label based on active tab's per-domain state
    try {
      sendToActiveTab({ type: MESSAGE_TYPES.GET_BUTTON_VISIBILITY }, resp => {
        type VisibilityResp = { success?: boolean; hidden?: boolean };
        const r = (resp || {}) as VisibilityResp;
        if (r && r.success) {
          toggleBtn.textContent = r.hidden ? "SHOW" : "HIDE";
        }
      });
    } catch {
      // ignore init label failures
    }

    toggleBtn.addEventListener("click", () => {
      const currentlyHiding = toggleBtn.textContent?.trim().toUpperCase() === "HIDE";
      const newHidden = currentlyHiding; // if showing, next action hides
      sendToActiveTab({ type: MESSAGE_TYPES.TOGGLE_BUTTON_VISIBILITY, hidden: newHidden }, () => {
        toggleBtn.textContent = newHidden ? "SHOW" : "HIDE";
      });
    });
  }

  // Wire RESET position
  const resetBtn = domManager.querySelector(DOM_SELECTORS.RESET_BUTTON) as HTMLButtonElement | null;
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      sendToActiveTab({ type: MESSAGE_TYPES.RESET_BUTTON_POSITION }, () => {
        // no-op
      });
    });
  }

  // Initialize download status using the queue manager
  try {
    const status = await queueManager.getQueueStatus();
    renderDownloadStatus({
      active: Object.fromEntries(
        Object.entries(status.active).map(([id, item]) => [
          id,
          {
            status: item.status,
            progress: item.progress || 0,
            filename: item.filename,
            title: item.pageTitle,
            page_title: item.pageTitle,
            id: item.downloadId,
            url: item.url,
            error: undefined,
            message: undefined,
          },
        ])
      ),
      queue: status.queued.map(item => item.downloadId),
      queuedDetails: Object.fromEntries(
        status.queued.map(item => [
          item.downloadId,
          { url: item.url, title: item.pageTitle, filename: item.filename },
        ])
      ),
    });
  } catch (error) {
    renderDownloadStatus({ active: {}, queue: [] });
  }

  // --- History wiring (pagination + live updates) ---
  const historyListEl = domManager.querySelector(DOM_SELECTORS.HISTORY_LIST) as HTMLElement | null;
  const prevPageBtn = domManager.querySelector(
    DOM_SELECTORS.PREV_PAGE_BUTTON
  ) as HTMLButtonElement | null;
  const nextPageBtn = domManager.querySelector(
    DOM_SELECTORS.NEXT_PAGE_BUTTON
  ) as HTMLButtonElement | null;
  const itemsPerPageSelect = domManager.querySelector(
    DOM_SELECTORS.ITEMS_PER_PAGE_SELECT
  ) as HTMLSelectElement | null;
  const pageInfoEl = domManager.querySelector(DOM_SELECTORS.PAGE_INFO) as HTMLElement | null;

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

  // Initial unified render will call fetchHistory via renderDownloadStatus when data arrives

  // Set up queue manager listener for real-time updates
  const unsubscribeQueue = queueManager.addUpdateListener(status => {
    renderDownloadStatus({
      active: Object.fromEntries(
        Object.entries(status.active).map(([id, item]) => [
          id,
          {
            status: item.status,
            progress: item.progress || 0,
            filename: item.filename,
            title: item.pageTitle,
            page_title: item.pageTitle,
            id: item.downloadId,
            url: item.url,
            error: undefined,
            message: undefined,
          },
        ])
      ),
      queue: status.queued.map(item => item.downloadId),
      queuedDetails: Object.fromEntries(
        status.queued.map(item => [
          item.downloadId,
          { url: item.url, title: item.pageTitle, filename: item.filename },
        ])
      ),
    });
  });

  // Set up message listeners
  chrome.runtime.onMessage.addListener(
    (msg: {
      type: string;
      data?: { active: ActiveDownloadMap; queue: string[]; queuedDetails?: QueuedDetailsMap };
      status?: "connected" | "disconnected";
    }) => {
      if (msg.type === MESSAGE_TYPES.DOWNLOAD_STATUS_UPDATE && msg.data) {
        void renderDownloadStatus(msg.data);
      } else if (msg.type === MESSAGE_TYPES.QUEUE_UPDATED) {
        const payload = msg.data as
          | { active: ActiveDownloadMap; queue: string[]; queuedDetails?: QueuedDetailsMap }
          | undefined;
        // Support legacy shape without data wrapper: { type, active, queue, queuedDetails }
        const legacy = msg as unknown as {
          active?: ActiveDownloadMap;
          queue?: string[];
          queuedDetails?: QueuedDetailsMap;
        };
        const dataToRender =
          payload ||
          ({
            active: legacy.active || {},
            queue: legacy.queue || [],
            queuedDetails: legacy.queuedDetails || {},
          } as { active: ActiveDownloadMap; queue: string[]; queuedDetails?: QueuedDetailsMap });
        void renderDownloadStatus(dataToRender);
      } else if (msg.type === MESSAGE_TYPES.HISTORY_UPDATED) {
        if (lastDownloadStatusData) void renderDownloadStatus(lastDownloadStatusData);
      } else if (msg.type === MESSAGE_TYPES.SERVER_STATUS_UPDATE && msg.status) {
        updatePopupServerStatus(msg.status);
      }
    }
  );
}

// Initialize popup when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  initPopup().catch(error => {
    console.error("Error initializing popup:", error);
  });
});
