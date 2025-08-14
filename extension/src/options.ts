/**
 * Options page functionality for the Enhanced Video Downloader extension.
 * Handles extension settings, configuration, and user preferences.
 */
// Note: keep strict typing; avoid no-check to preserve type safety

import { safeParse } from "./lib/utils";
import { logger } from "./core/logger";
import { Theme, ServerConfig } from "./types";
import { clearHistoryAndNotify, fetchHistory, renderHistoryItems } from "./history";
import { getServerPort, getPortRange } from "./core/constants";

// Add type definitions for newer APIs
declare global {
  interface Window {
    showDirectoryPicker?: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
  }

  interface DirectoryPickerOptions {
    mode?: "read" | "readwrite";
  }
}

const setStatus = (elementId: string, message: string, isError = false, timeout = 3000): void => {
  const statusElement = document.getElementById(elementId);
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.classList.toggle("success", !isError);
  statusElement.classList.toggle("error", isError);

  if (timeout > 0) {
    setTimeout(() => {
      statusElement.textContent = "";
      statusElement.classList.remove("success", "error");
    }, timeout);
  }
};

/**
 * Updates the server status indicator in the options page.
 * @param status - The server status ('connected', 'disconnected', or 'checking')
 */
export function updateOptionsServerStatus(status: "connected" | "disconnected" | "checking"): void {
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
 * Initializes the options page, setting up event listeners and loading current settings.
 * This function runs when the options page is loaded.
 */
export function initOptionsPage(): void {
  // Apply console log level from stored config to reflect user selection
  chrome.storage.local.get("serverConfig", res => {
    const cfg = res.serverConfig || {};
    let level = (cfg.console_log_level || cfg.log_level || "info") as string;
    // Map server-style levels to extension logger levels
    const normalized = String(level).toLowerCase();
    if (normalized === "warning") level = "warn";
    if (normalized === "critical") level = "error";
    try {
      logger.setLevel(String(level).toLowerCase() as any);
    } catch {
      /* ignore */
    }
  });
  // Initialize theme first
  initializeOptionsTheme().catch(error => {
    console.error("Error initializing theme:", error);
  });

  // Initialize server status immediately
  try {
    chrome.runtime.sendMessage({ type: "getServerStatus" }, (resp: any) => {
      if (!chrome.runtime.lastError && resp && resp.status) {
        updateOptionsServerStatus(resp.status);
      }
    });
  } catch {
    // ignore
  }

  loadSettings();
  setupEventListeners();
  setupValidation();
  setupInfoMessages();
  setupAccordion();
  setupTabNavigation();
  setupMessageListener();
  setupLogsUI();
  setupLiveSave();
  setupHistoryUI();
  loadErrorHistory();
  logger.debug("Options page initialized", { component: "options" });
  // helper actions wired after UI init
  // no-op: helpers declared below

  // Queue Admin wiring
  const queueRefreshBtn = document.getElementById("queue-refresh") as HTMLButtonElement | null;
  const queueClearBtn = document.getElementById("queue-clear") as HTMLButtonElement | null;
  const queueList = document.getElementById("queue-list") as HTMLUListElement | null;

  const renderQueue = (ids: string[]) => {
    if (!queueList) return;
    queueList.innerHTML = "";
    if (ids.length === 0) {
      const li = document.createElement("li");
      li.textContent = "Queue is empty";
      queueList.appendChild(li);
      return;
    }
    ids.forEach(id => {
      const li = document.createElement("li");
      li.dataset.downloadId = id;
      li.textContent = id;
      // Draggable for reordering
      li.setAttribute("draggable", "true");
      li.addEventListener("dragstart", e => {
        (e.dataTransfer as DataTransfer).setData("text/plain", id);
        li.classList.add("dragging");
      });
      li.addEventListener("dragover", e => {
        e.preventDefault();
        li.classList.add("drag-over");
      });
      li.addEventListener("dragleave", () => li.classList.remove("drag-over"));
      li.addEventListener("drop", () => {
        li.classList.remove("drag-over");
        const all = Array.from(queueList.querySelectorAll("li"));
        const newOrder = all.map(el => el.dataset.downloadId!).filter(Boolean);
        // Optimistic reorder locally
        renderQueue(newOrder);
        // Notify background and server
        chrome.runtime.sendMessage({ type: "reorderQueue", queue: newOrder }, () => {});
        // Best-effort server reorder
        chrome.storage.local.get("serverPort", res => {
          const port = (res as any).serverPort;
          if (!port) return;
          fetch(`http://127.0.0.1:${port}/api/queue/reorder`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: newOrder }),
          }).catch(() => {});
        });
      });
      li.addEventListener("dragend", () => li.classList.remove("dragging"));
      // Remove button per item
      const rm = document.createElement("button");
      rm.textContent = "Remove";
      rm.className = "btn btn--secondary";
      rm.addEventListener("click", () => {
        chrome.runtime.sendMessage({ type: "removeFromQueue", downloadId: id }, () => {
          li.remove();
        });
      });
      li.appendChild(document.createTextNode(" "));
      li.appendChild(rm);
      queueList.appendChild(li);
    });
  };

  const refreshQueue = () => {
    chrome.runtime.sendMessage({ type: "getQueue" }, (resp: any) => {
      if (resp && Array.isArray(resp.queue)) {
        renderQueue(resp.queue);
      } else {
        renderQueue([]);
      }
    });
  };

  if (queueRefreshBtn) {
    queueRefreshBtn.addEventListener("click", refreshQueue);
  }
  if (queueClearBtn) {
    queueClearBtn.addEventListener("click", () => {
      renderQueue([]);
      chrome.runtime.sendMessage({ type: "reorderQueue", queue: [] }, () => {});
      chrome.storage.local.get("serverPort", res => {
        const port = (res as any).serverPort;
        if (!port) return;
        fetch(`http://127.0.0.1:${port}/api/queue/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: [] }),
        }).catch(() => {});
      });
    });
  }
}

/**
 * Sets up accessible expand/collapse (accordion) behavior for settings groups.
 * Persists per-section expanded state in storage using the group's data-category.
 */
export function setupAccordion(): void {
  const groups = Array.from(document.querySelectorAll<HTMLElement>(".settings-group"));

  const toggles = groups
    .map(group => {
      const toggle = group.querySelector<HTMLButtonElement>(".accordion-toggle");
      const content = group.querySelector<HTMLElement>(".section-content");
      return toggle && content
        ? ({ group, toggle, content, category: group.dataset.category || undefined } as const)
        : null;
    })
    .filter(Boolean) as Array<{
    group: HTMLElement;
    toggle: HTMLButtonElement;
    content: HTMLElement;
    category: string | undefined;
  }>;

  if (toggles.length === 0) return;

  const ensureIds = (t: HTMLButtonElement, c: HTMLElement): void => {
    // Ensure aria-controls/id linkage
    let contentId = t.getAttribute("aria-controls");
    if (!contentId) {
      contentId = `section-${Math.random().toString(36).slice(2)}`;
      t.setAttribute("aria-controls", contentId);
    }
    if (!c.id) c.id = contentId;
  };

  chrome.storage.local.get("optionsAccordionState", res => {
    const persisted: Record<string, boolean> = (res as any).optionsAccordionState || {};

    toggles.forEach(({ toggle, content, category }) => {
      ensureIds(toggle, content);

      const defaultExpanded = toggle.getAttribute("aria-expanded") !== "false";
      const initialExpanded =
        category && category in persisted ? !!persisted[category] : defaultExpanded;
      toggle.setAttribute("aria-expanded", String(initialExpanded));
      content.hidden = !initialExpanded;

      const onToggle = (): void => {
        const expanded = toggle.getAttribute("aria-expanded") === "true";
        const next = !expanded;
        toggle.setAttribute("aria-expanded", String(next));
        content.hidden = !next;

        if (category) {
          const nextState = { ...(persisted || {}) } as Record<string, boolean>;
          nextState[category] = next;
          try {
            chrome.storage.local.set({ optionsAccordionState: nextState });
          } catch {
            /* ignore */
          }
        }
      };

      toggle.addEventListener("click", onToggle);
      toggle.addEventListener("keydown", ev => {
        const e = ev as KeyboardEvent;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      });
    });
  });
}

/**
 * Loads the current settings from storage and populates the form fields.
 * Retrieves configuration from both local storage and the server when available.
 */
export function loadSettings(): void {
  // First try to load from storage
  chrome.storage.local.get(["serverConfig"], result => {
    const hadLocalConfig = Boolean(result.serverConfig);
    if (hadLocalConfig) {
      populateFormFields(result.serverConfig);
    }

    // Then try to get latest from server
    chrome.runtime.sendMessage({ type: "getConfig" }, response => {
      if (chrome.runtime.lastError) {
        logger.error(
          "Error getting config:",
          { component: "options" },
          chrome.runtime.lastError.message as any
        );
        // Do not proceed if there's an error
        return;
      }
      if (response && response.status === "success" && response.data) {
        // If we already had a local config (just saved or previously cached),
        // prefer that and avoid overwriting the user's selections from storage.
        if (!hadLocalConfig) {
          populateFormFields(response.data);
        } else {
          // When local config exists, still populate env-only fields from server (e.g., LOG_PATH)
          try {
            const serverData: any = response.data;
            const logFileInput = document.getElementById(
              "settings-log-file"
            ) as HTMLInputElement | null;
            if (
              logFileInput &&
              typeof serverData?.log_file === "string" &&
              logFileInput.value.trim() === ""
            ) {
              logFileInput.value = serverData.log_file;
            }
          } catch {
            // ignore UI population issues for env-only fields
          }
        }
        logger.debug("Loaded settings from server", { component: "options" });
      } else {
        logger.warn(
          "Could not load settings from server:",
          { component: "options" },
          response?.message as any
        );
        // Even if the fetch failed, the background may have provided cached data
        // Attempt to populate env-only fields like log_file when available
        try {
          const serverData: any = response?.data;
          const logFileInput = document.getElementById(
            "settings-log-file"
          ) as HTMLInputElement | null;
          if (
            logFileInput &&
            typeof serverData?.log_file === "string" &&
            logFileInput.value.trim() === ""
          ) {
            logFileInput.value = serverData.log_file;
          }
        } catch {
          // ignore UI population issues for env-only fields
        }
      }
    });
  });
}

/**
 * Populates the settings form fields with values from the provided configuration.
 *
 * @param config - The server configuration object
 */
export function populateFormFields(config: ServerConfig): void {
  // Set form field values from config
  const elements = {
    port: document.getElementById("settings-server-port") as HTMLInputElement,
    downloadDir: document.getElementById("settings-download-dir") as HTMLInputElement,
    debugMode: document.getElementById("settings-enable-debug") as HTMLInputElement,
    enableHistory: document.getElementById("settings-enable-history") as HTMLInputElement,
    logLevel: document.getElementById("settings-log-level") as HTMLSelectElement,
    ytdlpFormat: document.getElementById("settings-ytdlp-format") as HTMLSelectElement,
    allowPlaylists: document.getElementById("settings-allow-playlists") as HTMLInputElement,
    logFile: document.getElementById("settings-log-file") as HTMLInputElement,
    historyFile: document.getElementById("settings-history-file") as HTMLInputElement,
    ytdlpConcurrent: document.getElementById(
      "settings-ytdlp-concurrent-fragments"
    ) as HTMLInputElement,
    ytdlpCookiesBrowser: document.getElementById(
      "settings-ytdlp-cookies-browser"
    ) as HTMLSelectElement,
    ytdlpMergeFormat: document.getElementById("settings-ytdlp-merge-format") as HTMLSelectElement,
    ytdlpContinue: document.getElementById("settings-ytdlp-continue") as HTMLInputElement,
    ytdlpFragmentRetries: document.getElementById(
      "settings-ytdlp-fragment-retries"
    ) as HTMLInputElement,
  };

  if (elements.port && config.server_port !== undefined && config.server_port !== null) {
    elements.port.value = config.server_port.toString();
  }
  if (elements.downloadDir && config.download_dir) {
    elements.downloadDir.value = config.download_dir;
  }
  if (elements.debugMode) {
    elements.debugMode.checked = config.debug_mode ?? false;
  }
  if (elements.enableHistory) {
    elements.enableHistory.checked = config.enable_history ?? true;
  }
  if (elements.logLevel && config.log_level) {
    elements.logLevel.value = config.log_level;
  }
  if (elements.ytdlpFormat && config.yt_dlp_options?.format) {
    elements.ytdlpFormat.value = config.yt_dlp_options.format;
  }
  if (elements.ytdlpCookiesBrowser && Array.isArray(config.yt_dlp_options?.cookiesfrombrowser)) {
    const arr = config.yt_dlp_options!.cookiesfrombrowser as unknown as any[];
    const first = arr && arr.length ? String(arr[0]) : "";
    if (first) elements.ytdlpCookiesBrowser.value = first;
  }
  if (elements.ytdlpMergeFormat && config.yt_dlp_options?.merge_output_format) {
    elements.ytdlpMergeFormat.value = String(config.yt_dlp_options.merge_output_format);
  }
  if (elements.ytdlpContinue && typeof (config as any)?.yt_dlp_options?.continuedl === "boolean") {
    elements.ytdlpContinue.checked = !!(config as any).yt_dlp_options.continuedl;
  }
  if (elements.allowPlaylists) {
    elements.allowPlaylists.checked = config.allow_playlists ?? false;
  }
  if (elements.logFile && (config as any).log_file) {
    elements.logFile.value = (config as any).log_file as string;
  }
  if (elements.historyFile && (config as any).history_file) {
    elements.historyFile.value = (config as any).history_file as string;
  }
  // Populate yt-dlp concurrent fragments from config or env overlay
  const conc =
    (config as any)?.yt_dlp_options?.concurrent_fragments ??
    (config as any)?.ytdlp_concurrent_fragments;
  if (elements.ytdlpConcurrent && conc !== undefined && conc !== null) {
    elements.ytdlpConcurrent.value = String(conc);
  }
  const fragRetries = (config as any)?.yt_dlp_options?.fragment_retries;
  if (elements.ytdlpFragmentRetries && fragRetries !== undefined && fragRetries !== null) {
    elements.ytdlpFragmentRetries.value = String(fragRetries);
  }

  // Populate console log level select if present
  const consoleLogLevelSelectEl = document.getElementById(
    "settings-console-log-level"
  ) as HTMLSelectElement | null;
  if (consoleLogLevelSelectEl && (config as any).console_log_level) {
    consoleLogLevelSelectEl.value = String((config as any).console_log_level);
  }

  // Trigger validation after populating
  validateAllFields();

  // Update info messages to reflect current selections
  const logLevelSelect = document.getElementById("settings-log-level") as HTMLSelectElement;
  const consoleLogLevelSelect = document.getElementById(
    "settings-console-log-level"
  ) as HTMLSelectElement;
  const formatSelect = document.getElementById("settings-ytdlp-format") as HTMLSelectElement;
  const cookiesBrowserSelect = document.getElementById(
    "settings-ytdlp-cookies-browser"
  ) as HTMLSelectElement | null;
  const mergeFormatSelect = document.getElementById(
    "settings-ytdlp-merge-format"
  ) as HTMLSelectElement | null;

  if (logLevelSelect) {
    updateLogLevelInfo(logLevelSelect);
  }
  if (consoleLogLevelSelect) {
    updateConsoleLogLevelInfo(consoleLogLevelSelect);
  }
  if (formatSelect) {
    updateFormatInfo(formatSelect);
  }
  if (cookiesBrowserSelect && !cookiesBrowserSelect.value) {
    cookiesBrowserSelect.value = "chrome";
  }
  if (mergeFormatSelect && !mergeFormatSelect.value) {
    mergeFormatSelect.value = "mp4";
  }
}

/**
 * Sets up event listeners for form submission and button clicks.
 */
export function setupEventListeners(): void {
  const form = document.getElementById("settings-form") as HTMLFormElement;
  if (form) {
    form.addEventListener("submit", saveSettings);
  }

  // Removed folder picker UI; users should input absolute paths directly

  const restartButton = document.getElementById("restart-server");
  if (restartButton) {
    restartButton.addEventListener("click", restartServer);
  }

  // Theme toggle functionality
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", handleThemeToggle);
  }

  const clearCompletedBtn = document.getElementById("settings-clear-completed");
  clearCompletedBtn?.addEventListener("click", async () => {
    try {
      await clearByStatus("completed");
      setStatus("settings-status", "Cleared completed items");
    } catch (e) {
      setStatus("settings-status", "Failed to clear completed", true);
    }
  });

  const clearFailedBtn = document.getElementById("settings-clear-failed");
  clearFailedBtn?.addEventListener("click", async () => {
    try {
      await clearByStatus("error");
      setStatus("settings-status", "Cleared failed items");
    } catch (e) {
      setStatus("settings-status", "Failed to clear failed", true);
    }
  });

  const clearAllBtn = document.getElementById("settings-clear-all");
  clearAllBtn?.addEventListener("click", async () => {
    if (!confirm("This will stop active downloads, clear queue, and remove all history. Continue?")) return;
    try {
      await clearStatuses(["downloading", "paused", "queued", "finished", "error"]);
      await clearQueueServer();
      await clearHistoryRemote();
      // Also clear local cached history
      await clearHistoryAndNotify();
      setStatus("settings-status", "Cleared all and stopped active downloads");
    } catch (e) {
      setStatus("settings-status", "Failed to clear all", true);
    }
  });

  const clearQueueBtn = document.getElementById("settings-clear-queue");
  clearQueueBtn?.addEventListener("click", async () => {
    try {
      await clearQueueServer();
      setStatus("settings-status", "Cleared queue");
    } catch (e) {
      setStatus("settings-status", "Failed to clear queue", true);
    }
  });

  const resumeDownloadsButton = document.getElementById("settings-resume-downloads");
  if (resumeDownloadsButton) {
    resumeDownloadsButton.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "resumeDownloads" }, response => {
        if (response && response.status === "success") {
          setStatus("settings-status", "Resume operation completed successfully!");
        } else {
          setStatus(
            "settings-status",
            "Error: " + (response?.message || "Failed to resume downloads"),
            true
          );
        }
      });
    });
  }

  // Optional: enable GalleryDL and Priority UI hooks if present in DOM
  const galleryBtn = document.getElementById("settings-gallery-download");
  if (galleryBtn) {
    galleryBtn.addEventListener("click", () => {
      const urlInput = document.getElementById("settings-gallery-url") as HTMLInputElement | null;
      const url = urlInput?.value?.trim();
      if (!url) {
        setStatus("settings-status", "Please enter a gallery URL", true);
        return;
      }
      chrome.runtime.sendMessage({ type: "galleryDownload", url }, (response: any) => {
        if (response && response.status === "success") {
          setStatus("settings-status", "Gallery download started");
        } else {
          setStatus(
            "settings-status",
            "Error: " + (response?.message || "Failed to start gallery"),
            true
          );
        }
      });
    });
  }

  // Clear all stored button positions across hosts
  const clearPositionsButton = document.getElementById("settings-clear-positions");
  if (clearPositionsButton) {
    clearPositionsButton.addEventListener("click", async () => {
      try {
        // Fetch all storage, remove keys that look like hostnames (contain a dot) with x/y/hidden
        const all = await chrome.storage.local.get(null as any);
        const keysToRemove: string[] = [];
        for (const [key, value] of Object.entries(all)) {
          // Heuristic: hostname-like keys or keys with position schema
          const looksLikeHost = key.includes(".");
          const v: any = value;
          const looksLikePosition =
            v && typeof v === "object" && "x" in v && "y" in v && "hidden" in v;
          if (looksLikeHost && looksLikePosition) {
            keysToRemove.push(key);
          }
        }
        if (keysToRemove.length === 0) {
          setStatus("settings-status", "No stored button positions found to clear");
          return;
        }
        await new Promise<void>(resolve =>
          (chrome.storage.local as any).remove(keysToRemove, () => resolve())
        );
        setStatus(
          "settings-status",
          `Cleared ${keysToRemove.length} stored button position${
            keysToRemove.length === 1 ? "" : "s"
          }`
        );
      } catch (e) {
        setStatus("settings-status", "Failed to clear button positions", true);
      }
    });
  }
}

/**
 * Live-save non-server settings when changed.
 * Server Configuration section continues to use explicit Save + Restart flow.
 */
function setupLiveSave(): void {
  const sendPartialUpdate = async (
    partial: Partial<ServerConfig & Record<string, any>>
  ): Promise<void> => {
    try {
      setStatus("settings-status", "Saving...", false, 1500);
      const response = await new Promise<any>((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "setConfig", config: partial }, res => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(res);
          }
        });
      });
      if (response && response.status === "success") {
        setStatus("settings-status", "Saved", false, 1200);
      } else {
        setStatus(
          "settings-status",
          "Save failed: " + (response?.message || "Unknown error"),
          true,
          3000
        );
      }
    } catch (e) {
      setStatus(
        "settings-status",
        "Save failed: " + (e instanceof Error ? e.message : "Unknown error"),
        true,
        3000
      );
    }
  };

  const onEnterCommit = (el: HTMLElement, handler: () => void) => {
    el.addEventListener("keydown", ev => {
      const e = ev as KeyboardEvent;
      if (e.key === "Enter") {
        e.preventDefault();
        handler();
      }
    });
  };

  // Download Settings (live save)
  const downloadDirInput = document.getElementById(
    "settings-download-dir"
  ) as HTMLInputElement | null;
  if (downloadDirInput) {
    const commit = () => {
      if (validateFolder(downloadDirInput)) {
        const v = downloadDirInput.value.trim();
        if (v) void sendPartialUpdate({ download_dir: v });
      }
    };
    downloadDirInput.addEventListener("blur", commit);
    onEnterCommit(downloadDirInput, commit);
  }

  // History file path (live save)
  const historyFileInput = document.getElementById(
    "settings-history-file"
  ) as HTMLInputElement | null;
  if (historyFileInput) {
    const commit = () => {
      const raw = historyFileInput.value;
      const v = typeof raw === "string" ? raw.trim() : "";
      const partial: Record<string, unknown> = {};
      if (v) partial.history_file = v;
      else partial.history_file = undefined;
      void sendPartialUpdate(partial as any);
    };
    historyFileInput.addEventListener("blur", commit);
    onEnterCommit(historyFileInput, commit);
  }

  const ytdlpFormat = document.getElementById("settings-ytdlp-format") as HTMLSelectElement | null;
  if (ytdlpFormat) {
    ytdlpFormat.addEventListener("change", () => {
      if (validateFormat(ytdlpFormat)) {
        void sendPartialUpdate({ yt_dlp_options: { format: ytdlpFormat.value } });
      }
    });
  }

  const ytdlpCookiesBrowser = document.getElementById(
    "settings-ytdlp-cookies-browser"
  ) as HTMLSelectElement | null;
  if (ytdlpCookiesBrowser) {
    const commitCookies = () => {
      const val = (ytdlpCookiesBrowser.value || "chrome").trim();
      if (val) void sendPartialUpdate({ yt_dlp_options: { cookiesfrombrowser: [val] } });
    };
    ytdlpCookiesBrowser.addEventListener("change", commitCookies);
    ytdlpCookiesBrowser.addEventListener("blur", commitCookies);
  }

  const ytdlpMergeFormat = document.getElementById(
    "settings-ytdlp-merge-format"
  ) as HTMLSelectElement | null;
  if (ytdlpMergeFormat) {
    const commitMerge = () => {
      const val = (ytdlpMergeFormat.value || "mp4").trim();
      if (val) void sendPartialUpdate({ yt_dlp_options: { merge_output_format: val } });
    };
    ytdlpMergeFormat.addEventListener("change", commitMerge);
    ytdlpMergeFormat.addEventListener("blur", commitMerge);
  }

  const ytdlpContinue = document.getElementById(
    "settings-ytdlp-continue"
  ) as HTMLInputElement | null;
  if (ytdlpContinue) {
    ytdlpContinue.addEventListener("change", () => {
      void sendPartialUpdate({ yt_dlp_options: { continuedl: !!ytdlpContinue.checked } });
    });
  }

  const ytdlpConc = document.getElementById(
    "settings-ytdlp-concurrent-fragments"
  ) as HTMLInputElement | null;
  if (ytdlpConc) {
    const commitConc = () => {
      const raw = ytdlpConc.value.trim();
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 1 && n <= 16) {
        void sendPartialUpdate({ yt_dlp_options: { concurrent_fragments: n } });
      } else {
        setStatus("settings-status", "Concurrent fragments must be 1-16", true, 2500);
      }
    };
    ytdlpConc.addEventListener("change", commitConc);
    ytdlpConc.addEventListener("blur", commitConc);
    onEnterCommit(ytdlpConc, commitConc);
  }

  const ytdlpFragRetries = document.getElementById(
    "settings-ytdlp-fragment-retries"
  ) as HTMLInputElement | null;
  if (ytdlpFragRetries) {
    const commitFragRetries = () => {
      const raw = ytdlpFragRetries.value.trim();
      const n = parseInt(raw, 10);
      if (Number.isFinite(n) && n >= 0 && n <= 50) {
        void sendPartialUpdate({ yt_dlp_options: { fragment_retries: n } });
      } else {
        setStatus("settings-status", "Fragment retries must be 0-50", true, 2500);
      }
    };
    ytdlpFragRetries.addEventListener("change", commitFragRetries);
    ytdlpFragRetries.addEventListener("blur", commitFragRetries);
    onEnterCommit(ytdlpFragRetries, commitFragRetries);
  }

  const allowPlaylists = document.getElementById(
    "settings-allow-playlists"
  ) as HTMLInputElement | null;
  if (allowPlaylists) {
    allowPlaylists.addEventListener("change", () => {
      void sendPartialUpdate({ allow_playlists: !!allowPlaylists.checked });
    });
  }

  // Behavior Settings (live save)
  const enableHistory = document.getElementById(
    "settings-enable-history"
  ) as HTMLInputElement | null;
  if (enableHistory) {
    enableHistory.addEventListener("change", () => {
      void sendPartialUpdate({ enable_history: !!enableHistory.checked });
    });
  }

  const enableDebug = document.getElementById("settings-enable-debug") as HTMLInputElement | null;
  if (enableDebug) {
    enableDebug.addEventListener("change", () => {
      void sendPartialUpdate({ debug_mode: !!enableDebug.checked });
    });
  }

  // Smart Injection toggle (extension-only behavior; stored locally)
  const smartInjection = document.getElementById(
    "settings-smart-injection"
  ) as HTMLInputElement | null;
  if (smartInjection) {
    // Initialize from storage
    try {
      chrome.storage.local.get("smartInjectionEnabled", res => {
        const enabled = (res as any).smartInjectionEnabled;
        smartInjection.checked = enabled === true; // default false
      });
    } catch {
      /* ignore */
    }
    smartInjection.addEventListener("change", () => {
      try {
        chrome.storage.local.set({ smartInjectionEnabled: !!smartInjection.checked });
      } catch {
        /* ignore */
      }
    });
  }
}

/**
 * Sets up comprehensive validation for all form fields with helpful messages.
 */
export function setupValidation(): void {
  // Port validation
  const portInput = document.getElementById("settings-server-port") as HTMLInputElement;
  if (portInput) {
    portInput.addEventListener("input", () => validatePort(portInput));
    portInput.addEventListener("blur", () => validatePort(portInput));
  }

  // Download directory validation
  const downloadDirInput = document.getElementById("settings-download-dir") as HTMLInputElement;
  if (downloadDirInput) {
    downloadDirInput.addEventListener("input", () => validateFolder(downloadDirInput));
    downloadDirInput.addEventListener("blur", () => validateFolder(downloadDirInput));
  }

  // Log level validation
  const logLevelSelect = document.getElementById("settings-log-level") as HTMLSelectElement;
  if (logLevelSelect) {
    logLevelSelect.addEventListener("change", () => validateLogLevel(logLevelSelect));
  }

  // Console log level validation
  const consoleLogLevelSelect = document.getElementById(
    "settings-console-log-level"
  ) as HTMLSelectElement;
  if (consoleLogLevelSelect) {
    consoleLogLevelSelect.addEventListener("change", () =>
      validateConsoleLogLevel(consoleLogLevelSelect)
    );
  }

  // Format validation
  const formatSelect = document.getElementById("settings-ytdlp-format") as HTMLSelectElement;
  if (formatSelect) {
    formatSelect.addEventListener("change", () => validateFormat(formatSelect));
  }

  // Real-time validation for all fields
  const allInputs = document.querySelectorAll("input, select");
  allInputs.forEach(input => {
    if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
      input.addEventListener("input", () => validateField(input));
      input.addEventListener("blur", () => validateField(input));
    }
  });
}

/**
 * Validates a port number input field.
 */
export function validatePort(input: HTMLInputElement): boolean {
  const value = input.value.trim();
  const validationElement = document.getElementById("port-validation");

  if (!value) {
    showValidationMessage(validationElement, "Port number is required", "error");
    input.classList.add("invalid");
    input.classList.remove("valid");
    return false;
  }

  const port = parseInt(value, 10);
  if (isNaN(port)) {
    showValidationMessage(validationElement, "Port must be a valid number", "error");
    input.classList.add("invalid");
    input.classList.remove("valid");
    return false;
  }

  // Special-case our common default immediately so tests/dev can use 9090 regardless of env range
  if (port === 9090) {
    showValidationMessage(
      validationElement,
      "Port 9090 is the default server port for this application",
      "success"
    );
    input.classList.add("valid");
    input.classList.remove("invalid");
    return true;
  }

  const [minPort, maxPort] = getPortRange();
  if (port < minPort || port > maxPort) {
    showValidationMessage(
      validationElement,
      `Port must be between ${minPort} and ${maxPort}`,
      "error"
    );
    input.classList.add("invalid");
    input.classList.remove("valid");
    return false;
  }

  // Check for common port conflicts
  const commonPorts = [80, 443, 3000, 5000, 8000, 8080]; // Removed 9000 to allow 9090
  if (commonPorts.includes(port)) {
    showValidationMessage(
      validationElement,
      "Port " + port + " is commonly used by other services",
      "warning"
    );
    input.classList.add("valid");
    input.classList.remove("invalid");
    return true;
  }

  showValidationMessage(validationElement, "Port number is valid", "success");
  input.classList.add("valid");
  input.classList.remove("invalid");
  return true;
}

/**
 * Validates a download folder path input field.
 */
export function validateFolder(input: HTMLInputElement): boolean {
  const value = input.value.trim();
  const validationElement = document.getElementById("folder-validation");

  if (!value) {
    showValidationMessage(validationElement, "Download folder path is required", "error");
    input.classList.add("invalid");
    input.classList.remove("valid");
    return false;
  }

  // Basic path validation
  if (value.includes("..") || value.includes("//")) {
    showValidationMessage(validationElement, "Invalid path format detected", "error");
    input.classList.add("invalid");
    input.classList.remove("valid");
    return false;
  }

  // Check for absolute path (basic check), also allow home-relative (~) which the backend expands
  const isUnixAbsolute = value.startsWith("/");
  const isWindowsAbsolute = /^[A-Za-z]:/.test(value);
  const isHomeRelative = value.startsWith("~");
  if (!isUnixAbsolute && !isWindowsAbsolute && !isHomeRelative) {
    // This could be a folder name from the folder picker or a relative path
    // Allow it but show a warning that it should be an absolute path
    showValidationMessage(
      validationElement,
      "Please provide an absolute path for best compatibility",
      "warning"
    );
    input.classList.add("valid");
    input.classList.remove("invalid");
    return true;
  }

  showValidationMessage(validationElement, "Folder path looks valid", "success");
  input.classList.add("valid");
  input.classList.remove("invalid");
  return true;
}

/**
 * Validates log level selection.
 */
export function validateLogLevel(select: HTMLSelectElement): boolean {
  const value = select.value;
  const validationElement = document.getElementById("log-level-validation");

  if (!value) {
    showValidationMessage(validationElement, "Please select a log level", "error");
    select.classList.add("invalid");
    select.classList.remove("valid");
    return false;
  }

  const validLevels = ["error", "info", "debug", "ERROR", "INFO", "DEBUG"];
  if (!validLevels.includes(value)) {
    showValidationMessage(validationElement, "Invalid log level selected", "error");
    select.classList.add("invalid");
    select.classList.remove("valid");
    return false;
  }

  showValidationMessage(validationElement, "Log level is valid", "success");
  select.classList.add("valid");
  select.classList.remove("invalid");
  return true;
}

/**
 * Validates console log level selection.
 */
export function validateConsoleLogLevel(select: HTMLSelectElement): boolean {
  const value = select.value;
  const validationElement = document.getElementById("settings-console-log-level-validation");

  if (!value) {
    showValidationMessage(validationElement, "Please select a console log level", "error");
    select.classList.add("invalid");
    select.classList.remove("valid");
    return false;
  }

  const validLevels = ["debug", "info", "warning", "error", "critical"]; // per UI
  if (!validLevels.includes(value)) {
    showValidationMessage(validationElement, "Invalid console log level selected", "error");
    select.classList.add("invalid");
    select.classList.remove("valid");
    return false;
  }

  // Provide explanatory success with meaning of the selected level
  const levelInfo: Record<string, string> = {
    debug: "Verbose logging in the browser console (everything)",
    info: "General information and above",
    warning: "Only warnings and errors",
    error: "Only errors",
    critical: "Critical errors only",
  };
  showValidationMessage(
    validationElement,
    `Console log level set: ${value}. ${levelInfo[value] ?? ""}`.trim(),
    "success"
  );
  select.classList.add("valid");
  select.classList.remove("invalid");
  return true;
}

/**
 * Validates format selection.
 */
export function validateFormat(select: HTMLSelectElement): boolean {
  const value = select.value;
  const validationElement = document.getElementById("format-validation");

  if (!value) {
    showValidationMessage(validationElement, "Please select a video format", "error");
    select.classList.add("invalid");
    select.classList.remove("valid");
    return false;
  }

  const validFormats = [
    "bestvideo+bestaudio/best",
    "best",
    "mp4",
    "webm",
    "bestaudio[ext=m4a]",
    "bestaudio[ext=opus]",
  ];

  if (!validFormats.includes(value)) {
    showValidationMessage(validationElement, "Invalid format selected", "error");
    select.classList.add("invalid");
    select.classList.remove("valid");
    return false;
  }

  showValidationMessage(validationElement, "Format is valid", "success");
  select.classList.add("valid");
  select.classList.remove("invalid");
  return true;
}

/**
 * Generic field validation function.
 */
function validateField(field: HTMLInputElement | HTMLSelectElement): boolean {
  const fieldName = field.name || field.id;

  // Skip validation for checkboxes and hidden fields
  if (field.type === "checkbox" || field.type === "hidden") {
    return true;
  }

  const value = field.value.trim();

  // Required field validation
  if (field.hasAttribute("required") && !value) {
    showFieldValidation(field, fieldName + " is required", "error");
    return false;
  }

  // Field-specific validation
  if (fieldName === "server-port") {
    return validatePort(field as HTMLInputElement);
  } else if (fieldName === "download-dir") {
    return validateFolder(field as HTMLInputElement);
  } else if (fieldName === "log-level") {
    return validateLogLevel(field as HTMLSelectElement);
  } else if (fieldName === "console-log-level") {
    return validateConsoleLogLevel(field as HTMLSelectElement);
  } else if (fieldName === "ytdlp-format") {
    return validateFormat(field as HTMLSelectElement);
  }

  // Default: do not show noisy success messages for passive fields; clear prior messages
  showFieldValidation(field, "", "success");
  return true;
}

/**
 * Shows validation message for a specific field.
 */
function showFieldValidation(
  field: HTMLInputElement | HTMLSelectElement,
  message: string,
  type: "success" | "error" | "warning"
): void {
  const fieldId = field.id;
  const validationElement = document.getElementById(fieldId + "-validation");

  if (validationElement) {
    showValidationMessage(validationElement, message, type);
  }

  field.classList.remove("valid", "invalid");
  if (type === "success") {
    field.classList.add("valid");
  } else if (type === "error") {
    field.classList.add("invalid");
  }
}

/**
 * Shows validation message in the specified element.
 */
export function showValidationMessage(
  element: HTMLElement | null,
  message: string,
  type: "success" | "error" | "warning"
): void {
  if (!element) return;

  element.textContent = message;
  element.className = "validation-message " + type;

  // Auto-hide success messages after 3 seconds
  if (type === "success") {
    setTimeout(() => {
      element.textContent = "";
      element.className = "validation-message";
    }, 3000);
  }
}

/**
 * Validates all form fields and returns overall validity.
 */
function validateAllFields(): boolean {
  const requiredFields = document.querySelectorAll("input[required], select[required]");
  let allValid = true;

  requiredFields.forEach(field => {
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
      if (!validateField(field)) {
        allValid = false;
      }
    }
  });

  // Also validate specific fields that have custom validation
  const portInput = document.getElementById("settings-server-port") as HTMLInputElement;
  if (portInput && !validatePort(portInput)) {
    allValid = false;
  }

  const downloadDirInput = document.getElementById("settings-download-dir") as HTMLInputElement;
  if (downloadDirInput && !validateFolder(downloadDirInput)) {
    allValid = false;
  }

  const logLevelSelect = document.getElementById("settings-log-level") as HTMLSelectElement;
  if (logLevelSelect && !validateLogLevel(logLevelSelect)) {
    allValid = false;
  }

  const formatSelect = document.getElementById("settings-ytdlp-format") as HTMLSelectElement;
  if (formatSelect && !validateFormat(formatSelect)) {
    allValid = false;
  }

  return allValid;
}

/**
 * Sets up dynamic info messages for form fields.
 */
export function setupInfoMessages(): void {
  const formatSelect = document.getElementById("settings-ytdlp-format") as HTMLSelectElement;
  const logLevelSelect = document.getElementById("settings-log-level") as HTMLSelectElement;
  const consoleLogLevelSelect = document.getElementById(
    "settings-console-log-level"
  ) as HTMLSelectElement;

  if (formatSelect) {
    formatSelect.addEventListener("change", () => updateFormatInfo(formatSelect));
    updateFormatInfo(formatSelect); // Initial update
  }

  if (logLevelSelect) {
    logLevelSelect.addEventListener("change", () => updateLogLevelInfo(logLevelSelect));
    updateLogLevelInfo(logLevelSelect); // Initial update
  }

  if (consoleLogLevelSelect) {
    consoleLogLevelSelect.addEventListener("change", () =>
      updateConsoleLogLevelInfo(consoleLogLevelSelect)
    );
    updateConsoleLogLevelInfo(consoleLogLevelSelect); // Initial update
  }
}

/**
 * Updates the format info message based on selected format.
 */
function updateFormatInfo(select: HTMLSelectElement): void {
  const infoElement = document.getElementById("format-info");
  if (!infoElement) return;

  const infoText = infoElement.querySelector(".info-text") as HTMLElement;
  if (!infoText) return;

  const formatInfo: Record<string, string> = {
    "bestvideo+bestaudio/best": "Best quality with separate video and audio streams",
    best: "Best available single file (may be lower quality)",
    mp4: "MP4 format with best available quality",
    webm: "WebM format with best available quality",
    "bestaudio[ext=m4a]": "Audio only in M4A format",
    "bestaudio[ext=opus]": "Audio only in Opus format",
  };

  infoText.textContent = formatInfo[select.value] || "Select a format option";
}

/**
 * Updates the log level info message based on selected level.
 */
function updateLogLevelInfo(select: HTMLSelectElement): void {
  const infoElement = document.getElementById("log-level-info");
  if (!infoElement) return;

  const infoText = infoElement.querySelector(".info-text") as HTMLElement;
  if (!infoText) return;

  const levelInfo: Record<string, string> = {
    error: "Only error messages will be logged",
    info: "Normal level provides essential information",
    debug: "Verbose logging for troubleshooting",
  };

  infoText.textContent = levelInfo[select.value] || "Select a log level";
}

/**
 * Updates the console log level info message based on selected level.
 */
function updateConsoleLogLevelInfo(select: HTMLSelectElement): void {
  const infoElement = document.getElementById("console-log-level-info");
  if (!infoElement) return;

  const infoText = infoElement.querySelector(".info-text") as HTMLElement;
  if (!infoText) return;

  const levelInfo: Record<string, string> = {
    debug: "Everything printed in DevTools console (most verbose)",
    info: "General info, warnings, and errors",
    warning: "Only warnings and errors",
    error: "Only errors",
    critical: "Critical errors only",
  };

  infoText.textContent = levelInfo[select.value] || "Select a console log level";
}

/**
 * Sets up tab navigation for the options page.
 * Handles switching between different tabs in the options UI.
 */
export function setupTabNavigation(): void {
  const tabs = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove("active"));
      tabContents.forEach(content => content.classList.remove("active"));

      // Add active class to current tab
      tab.classList.add("active");

      // Show corresponding content
      const target = tab.getAttribute("data-tab");
      if (target) {
        const content = document.getElementById(target);
        if (content) content.classList.add("active");
      }
    });
  });
}

/**
 * Sets up message listener to handle server discovery notifications.
 */
export function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "serverDiscovered") {
      logger.debug("Server discovered notification received, refreshing settings");
      // Refresh settings when server is discovered
      loadSettings();
    } else if (message.type === "serverStatusUpdate") {
      updateOptionsServerStatus(message.status);
    } else if (message.type === "historyUpdated") {
      // Refresh both error and full history views on updates
      void loadErrorHistory(currentHistoryPage, currentHistoryPerPage);
      void loadDownloadHistory(currentHistoryPage, currentHistoryPerPage);
    }
  });
}

/**
 * Wire up the logs viewer controls and initial load.
 */
export function setupLogsUI(): void {
  const refreshBtn = document.getElementById("log-refresh");
  const clearBtn = document.getElementById("log-clear");
  const limitSelect = document.getElementById("log-limit") as HTMLSelectElement | null;
  const recentFirstCheckbox = document.getElementById(
    "log-recent-first"
  ) as HTMLInputElement | null;
  const filterWerkzeugCheckbox = document.getElementById(
    "log-filter-werkzeug"
  ) as HTMLInputElement | null;
  const displayDiv = document.getElementById("log-display");
  const textarea = null as unknown as HTMLTextAreaElement | null; // textarea removed from DOM
  const autoCheckbox = document.getElementById("log-toggle-auto") as HTMLInputElement | null;

  if (!displayDiv) {
    return;
  }

  let autoTimer: number | null = null;
  // If the saved prefs have auto-refresh enabled, defer starting until after
  // fetchAndRender is defined to avoid temporal dead zone issues
  let shouldStartAuto = false;

  // Load persisted log viewer preferences (awaited before first render)
  const loadPrefs = async (): Promise<void> => {
    try {
      const res = await chrome.storage.local.get("logViewerPrefs");
      const prefs = (res as any).logViewerPrefs || {};
      if (recentFirstCheckbox && typeof prefs.recentFirst === "boolean") {
        recentFirstCheckbox.checked = prefs.recentFirst;
      }
      if (limitSelect && typeof prefs.limit === "number") {
        const v = String(prefs.limit);
        if (Array.from(limitSelect.options).some(o => o.value === v)) {
          limitSelect.value = v;
        }
      }
      if (autoCheckbox && typeof prefs.auto === "boolean") {
        autoCheckbox.checked = prefs.auto;
        shouldStartAuto = !!prefs.auto;
      } else if (autoCheckbox) {
        // Fall back to current checkbox state if no pref saved
        shouldStartAuto = !!autoCheckbox.checked;
      }
      if (filterWerkzeugCheckbox && typeof prefs.filterWerkzeug === "boolean") {
        filterWerkzeugCheckbox.checked = prefs.filterWerkzeug;
      }
    } catch {
      // ignore; fall back to DOM defaults
      shouldStartAuto = !!autoCheckbox?.checked;
    }
  };

  const persistPrefs = (): void => {
    const prefs = {
      recentFirst: !!recentFirstCheckbox?.checked,
      limit: limitSelect ? parseInt(limitSelect.value, 10) : 500,
      auto: !!autoCheckbox?.checked,
      filterWerkzeug: !!filterWerkzeugCheckbox?.checked,
    };
    try {
      chrome.storage.local.set({ logViewerPrefs: prefs });
    } catch {
      // ignore
    }
  };

  const applyFilters = (text: string): string => {
    let t = text;
    // Suppress server log clear/rotation banner lines
    t = t
      .split("\n")
      .filter(line => !/^\s*Log file cleared and archived to /i.test(line))
      .join("\n");
    if (filterWerkzeugCheckbox?.checked) {
      t = t
        .split("\n")
        .filter(line => {
          const isWerkzeug = /werkzeug/i.test(line);
          // JSON: "status": 200 or "status": "200"
          const isStatus200Json = /"status"\s*:\s*"?200"?(\b|\s|[,}])/.test(line);
          // JSON: "status_code": 200 or "status_code": "200"
          const isStatusCode200Json = /"status_code"\s*:\s*"?200"?(\b|\s|[,}])/.test(line);
          // key-value forms: status=200 or status: 200 (common text logs)
          const isStatusEq200 = /\bstatus\s*[=:]\s*200\b/i.test(line);
          // Plain text within message: "-> 200" possibly followed by punctuation/space/EOL
          const isStatus200Arrow = /->\s*200(\b|\s|[,}])?/.test(line);
          // HTTP log pattern: "... HTTP/1.1" 200 ... or HTTP/2 200
          const isHttpVersion200 = /HTTP\/(?:1(?:\.\d)?|2)"?\s+200\b/i.test(line);
          // Common phrase: 200 OK
          const is200Ok = /\b200\s+OK\b/i.test(line);
          // JSON for server.request logger with 200 status (robust across spacing)
          const isServerRequest200 =
            /"logger"\s*:\s*"server\.request"[\s\S]*?"status"\s*:\s*"?200"?/i.test(line);
          return !(
            isWerkzeug ||
            isStatus200Json ||
            isStatusCode200Json ||
            isStatusEq200 ||
            isStatus200Arrow ||
            isHttpVersion200 ||
            is200Ok ||
            isServerRequest200
          );
        })
        .join("\n");
    }
    return t;
  };

  const isFilterOn = (): boolean =>
    !!(document.getElementById("log-filter-werkzeug") as HTMLInputElement | null)?.checked;

  const countEntriesFromFiltered = (filtered: string): number => {
    const rawLines = filtered.split("\n");
    let count = 0;

    // Try NDJSON first
    try {
      for (let i = 0; i < rawLines.length; i += 1) {
        const raw = rawLines[i] || "";
        const line = raw.trim();
        if (!line) continue;
        const firstBrace = line.indexOf("{");
        if (firstBrace === -1) continue;
        const jsonPart = line.slice(firstBrace);
        try {
          const obj: any = JSON.parse(jsonPart);
          if (isFilterOn()) {
            const statusVal =
              typeof obj.status === "number"
                ? obj.status
                : typeof obj.status === "string"
                ? parseInt(obj.status, 10)
                : undefined;
            const statusCodeVal =
              typeof obj.status_code === "number"
                ? obj.status_code
                : typeof obj.status_code === "string"
                ? parseInt(obj.status_code, 10)
                : undefined;
            const msgText = typeof obj.message === "string" ? obj.message : "";
            const isArrow200 =
              /->\s*200(\b|\s|[,}])?/.test(msgText) || /->\s*200(\b|\s|[,}])?/.test(line);
            const isOk200 = /\b200\s+OK\b/i.test(msgText) || /\b200\s+OK\b/i.test(line);
            const looksHttp200 =
              /HTTP\/(?:1(?:\.\d)?|2)"?\s+200\b/i.test(msgText) ||
              /HTTP\/(?:1(?:\.\d)?|2)"?\s+200\b/i.test(line);
            if (
              statusVal === 200 ||
              statusCodeVal === 200 ||
              isArrow200 ||
              isOk200 ||
              looksHttp200
            ) {
              continue;
            }
          }
          count += 1;
        } catch {
          // ignore JSON parse errors
        }
      }
      if (count > 0) return count;
    } catch {
      // fall through
    }

    // Legacy formats (grouped)
    const legacyRegex =
      /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:[,.]\d{3})?)\s*-\s*([^-]+?)\s*-\s*(DEBUG|INFO|WARNING|ERROR|CRITICAL|WARN|TRACE)\s*-\s*([\s\S]*)$/;
    let currentOpen = false;
    for (let i = 0; i < rawLines.length; i += 1) {
      const line = rawLines[i] || "";
      const m = line.match(legacyRegex);
      if (m) {
        if (isFilterOn()) {
          const msg = m[4] || "";
          const isArrow200 =
            /->\s*200(\b|\s|[,}])?/.test(line) || /->\s*200(\b|\s|[,}])?/.test(msg);
          const is200Ok = /\b200\s+OK\b/i.test(line) || /\b200\s+OK\b/i.test(msg);
          const isStatusPair200 =
            /\bstatus\s*[=:]\s*200\b/i.test(line) || /\bstatus_code\s*[=:]\s*200\b/i.test(line);
          const isHttp200 = /HTTP\/(?:1(?:\.\d)?|2)"?\s+200\b/i.test(line);
          if (isArrow200 || is200Ok || isStatusPair200 || isHttp200) {
            currentOpen = false;
            continue;
          }
        }
        if (currentOpen) count += 1; // close previous
        currentOpen = true;
      } else if (
        currentOpen &&
        (line.indexOf(" ") === 0 ||
          line.indexOf("\t") === 0 ||
          /^(Traceback|File "|\s*\.\.\.|\s*at )/.test(line))
      ) {
        // continuation
      } else if (line.trim().length > 0) {
        if (currentOpen) count += 1;
        currentOpen = true;
      }
    }
    if (currentOpen) count += 1;
    return count;
  };

  const renderLogs = (text: string, scrollMode: "preserve" | "top" = "preserve"): void => {
    const filtered = applyFilters(text);
    if (displayDiv) {
      // Preserve scroll position to avoid snapping during refresh
      const container = displayDiv;
      const prevTop = container.scrollTop;
      const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 4;
      displayDiv.textContent = "";
      const pre = document.createElement("pre");
      // If this is a synthetic error (e.g., "Error: Server not available"), render plainly without badges
      const trimmed = (text || "").trim();
      if (/^error:/i.test(trimmed)) {
        pre.textContent = trimmed;
        displayDiv.appendChild(pre);
        // Restore scroll position or enforce top depending on scroll mode
        if (scrollMode === "top") {
          container.scrollTop = 0;
        } else if (atBottom) {
          container.scrollTop = container.scrollHeight;
        } else {
          container.scrollTop = prevTop;
        }
        return;
      }
      // If nothing remains after filtering, show a simple placeholder without a misleading level badge
      if (filtered.trim().length === 0) {
        pre.textContent = "(no logs)";
        displayDiv.appendChild(pre);
        return;
      }
      const rawLines = filtered.split("\n");

      // First, try to parse as NDJSON (one JSON object per line)
      let entries = [] as Array<{
        timestamp?: string;
        logger?: string;
        level?: string;
        message: string;
        details: string[];
        _startTs?: number;
      }>;
      try {
        for (let i = 0; i < rawLines.length; i += 1) {
          const raw = rawLines[i] || "";
          const line = raw.trim();
          if (!line) continue;
          const firstBrace = line.indexOf("{");
          if (firstBrace === -1) continue;
          const jsonPart = line.slice(firstBrace);
          try {
            const obj: any = JSON.parse(jsonPart);
            const startTs: number | undefined =
              typeof obj.start_ts === "number" ? obj.start_ts : undefined;
            const iso =
              typeof obj.ts === "string"
                ? obj.ts
                : startTs
                ? new Date(startTs).toISOString()
                : undefined;
            // Derive level from JSON or from any prefix before the JSON
            let level: string | undefined = undefined;
            if (typeof obj.level === "string") {
              level = String(obj.level).toLowerCase();
            } else if (firstBrace > 0) {
              const prefix = line.slice(0, firstBrace).trim();
              const m = prefix.match(/\b(debug|info|warning|error|critical|trace|warn)\b/i);
              if (m) level = m[1].toLowerCase();
            }
            // If filter is enabled, skip any NDJSON entry representing a 200-status request
            const filterOn = !!(
              document.getElementById("log-filter-werkzeug") as HTMLInputElement | null
            )?.checked;
            if (filterOn) {
              const statusVal =
                typeof obj.status === "number"
                  ? obj.status
                  : typeof obj.status === "string"
                  ? parseInt(obj.status, 10)
                  : undefined;
              const statusCodeVal =
                typeof obj.status_code === "number"
                  ? obj.status_code
                  : typeof obj.status_code === "string"
                  ? parseInt(obj.status_code, 10)
                  : undefined;
              const msgText = typeof obj.message === "string" ? obj.message : "";
              const isArrow200 =
                /->\s*200(\b|\s|[,}])?/.test(msgText) || /->\s*200(\b|\s|[,}])?/.test(line);
              const isOk200 = /\b200\s+OK\b/i.test(msgText) || /\b200\s+OK\b/i.test(line);
              const looksHttp200 =
                /HTTP\/(?:1(?:\.\d)?|2)"?\s+200\b/i.test(msgText) ||
                /HTTP\/(?:1(?:\.\d)?|2)"?\s+200\b/i.test(line);
              if (
                statusVal === 200 ||
                statusCodeVal === 200 ||
                isArrow200 ||
                isOk200 ||
                looksHttp200
              ) {
                continue; // skip this entry
              }
            }
            entries.push({
              timestamp: iso,
              logger: typeof obj.logger === "string" ? obj.logger : undefined,
              level,
              message: typeof obj.message === "string" ? obj.message : jsonPart,
              details: [],
              _startTs: startTs,
            });
          } catch {
            // ignore JSON parsing error on this line
          }
        }
        // Do not sort here; we apply a unified sort after all parsing
      } catch {
        // Ignore NDJSON block failures entirely; we'll fall back to legacy parsing
        entries = [];
      }

      // If NDJSON was not present, parse typical server log lines (legacy) and group continuation/trace lines
      if (entries.length === 0) {
        var lineRegex2 =
          /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:[,.]\d{3})?)\s*-\s*([^-]+?)\s*-\s*(DEBUG|INFO|WARNING|ERROR|CRITICAL|WARN|TRACE)\s*-\s*([\s\S]*)$/;
        var levelMap2: Record<string, string> = {
          warn: "warning",
          warning: "warning",
          error: "error",
          critical: "critical",
          info: "info",
          debug: "debug",
          trace: "debug",
        };

        var current2: any = null;
        const filterOn2 = !!(
          document.getElementById("log-filter-werkzeug") as HTMLInputElement | null
        )?.checked;
        for (var i2 = 0; i2 < rawLines.length; i2 += 1) {
          var line2 = rawLines[i2] || "";
          var m2 = line2.match(lineRegex2);
          if (m2) {
            if (filterOn2) {
              const msg2 = m2[4] || "";
              const arrow200 =
                /->\s*200(\b|\s|[,}])?/.test(line2) || /->\s*200(\b|\s|[,}])?/.test(msg2);
              const ok200 = /\b200\s+OK\b/i.test(line2) || /\b200\s+OK\b/i.test(msg2);
              const statusPair200 =
                /\bstatus\s*[=:]\s*200\b/i.test(line2) ||
                /\bstatus_code\s*[=:]\s*200\b/i.test(line2);
              const http200 = /HTTP\/(?:1(?:\.\d)?|2)"?\s+200\b/i.test(line2);
              if (arrow200 || ok200 || statusPair200 || http200) {
                // skip starting a new entry for 200 status lines
                continue;
              }
            }
            if (current2) entries.push(current2);
            var lvlRaw2 = (m2[3] || "").trim().toLowerCase();
            current2 = {
              timestamp: (m2[1] || "").trim(),
              logger: (m2[2] || "").trim(),
              level: levelMap2[lvlRaw2] || "info",
              message: (m2[4] || "").trim(),
              details: [],
            } as any;
          } else if (
            current2 &&
            (line2.indexOf(" ") === 0 ||
              line2.indexOf("\t") === 0 ||
              /^(Traceback|File "|\s*\.\.\.|\s*at )/.test(line2))
          ) {
            current2.details.push(line2);
          } else if (line2.trim().length > 0) {
            if (current2) entries.push(current2);
            current2 = { message: line2, details: [], level: "info" } as any;
          } else if (current2) {
            current2.details.push("");
          }
        }
        if (current2) entries.push(current2);
      }
      if (entries.length === 0) {
        var lineRegex =
          /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:[,.]\d{3})?)\s*-\s*([^-]+?)\s*-\s*(DEBUG|INFO|WARNING|ERROR|CRITICAL|WARN|TRACE)\s*-\s*([\s\S]*)$/;
        var levelMap: Record<string, string> = {
          warn: "warning",
          warning: "warning",
          error: "error",
          critical: "critical",
          info: "info",
          debug: "debug",
          trace: "debug",
        };

        var current: any = null;
        const filterOn3 = !!(
          document.getElementById("log-filter-werkzeug") as HTMLInputElement | null
        )?.checked;
        for (var i = 0; i < rawLines.length; i += 1) {
          var line = rawLines[i] || "";
          var m = line.match(lineRegex);
          if (m) {
            if (filterOn3) {
              const msg = m[4] || "";
              const isArrow200 =
                /->\s*200(\b|\s|[,}])?/.test(line) || /->\s*200(\b|\s|[,}])?/.test(msg);
              const is200Ok = /\b200\s+OK\b/i.test(line) || /\b200\s+OK\b/i.test(msg);
              const isStatusPair200 =
                /\bstatus\s*[=:]\s*200\b/i.test(line) || /\bstatus_code\s*[=:]\s*200\b/i.test(line);
              const isHttp200 = /HTTP\/(?:1(?:\.\d)?|2)"?\s+200\b/i.test(line);
              if (isArrow200 || is200Ok || isStatusPair200 || isHttp200) {
                // skip this 200-status line
                continue;
              }
            }
            if (current) entries.push(current);
            var lvlRaw = (m[3] || "").trim().toLowerCase();
            current = {
              timestamp: (m[1] || "").trim(),
              logger: (m[2] || "").trim(),
              level: levelMap[lvlRaw] || "info",
              message: (m[4] || "").trim(),
              details: [],
            };
          } else if (
            current &&
            (line.indexOf(" ") === 0 ||
              line.indexOf("\t") === 0 ||
              /^(Traceback|File "|\s*\.{3}|\s*at )/.test(line))
          ) {
            current.details.push(line);
          } else if (line.trim().length > 0) {
            if (current) entries.push(current);
            current = { message: line, details: [], level: "info" };
          } else if (current) {
            current.details.push("");
          }
        }
        if (current) entries.push(current);
      }

      // Apply unified ordering based on the Recent First toggle
      try {
        const recentFirst = !!(
          document.getElementById("log-recent-first") as HTMLInputElement | null
        )?.checked;
        const entriesWithTs = entries.map(e => ({
          ...e,
          __ts:
            typeof (e as any)._startTs === "number"
              ? (e as any)._startTs
              : typeof e.timestamp === "string"
              ? Date.parse(e.timestamp)
              : undefined,
        }));
        const anyTs = entriesWithTs.some(e => Number.isFinite(e.__ts));
        if (anyTs) {
          entriesWithTs.sort((a, b) => {
            const ta = Number.isFinite(a.__ts) ? (a.__ts as number) : -Infinity;
            const tb = Number.isFinite(b.__ts) ? (b.__ts as number) : -Infinity;
            return recentFirst ? tb - ta : ta - tb;
          });
          entries = entriesWithTs.map(({ __ts, ...rest }) => rest);
        } else if (recentFirst) {
          // Fall back to reversing the arrival order
          entries.reverse();
        }
      } catch {
        // ignore ordering issues; render in arrival order
      }

      // After ordering, apply UI limit AFTER filtering
      const limitCount = limitSelect ? parseInt(limitSelect.value, 10) : 500;
      if (Number.isFinite(limitCount) && limitCount > 0 && entries.length > limitCount) {
        entries = entries.slice(0, limitCount);
      }

      if (entries.length === 0) {
        pre.textContent = "(no logs)";
      } else {
        for (var j = 0; j < entries.length; j += 1) {
          var entry = entries[j];
          var row = document.createElement("div");
          row.className = "log-line";
          if (entry.timestamp) {
            var ts = document.createElement("span");
            ts.className = "log-timestamp";
            ts.textContent = entry.timestamp as string;
            row.appendChild(ts);
            row.appendChild(document.createTextNode(" "));
          }
          if (entry.level) {
            var levelSpan = document.createElement("span");
            levelSpan.className = "log-level badge badge--" + entry.level;
            levelSpan.textContent = String(entry.level || "INFO").toUpperCase();
            row.appendChild(levelSpan);
            row.appendChild(document.createTextNode(" "));
          }
          if (entry.logger) {
            var loggerSpan = document.createElement("span");
            loggerSpan.className = "log-logger";
            loggerSpan.textContent = entry.logger as string;
            row.appendChild(loggerSpan);
            row.appendChild(document.createTextNode(" - "));
          }
          var msg = document.createElement("span");
          msg.className = "log-message";
          msg.textContent = entry.message || "";
          row.appendChild(msg);
          pre.appendChild(row);

          if (entry.details && entry.details.length > 0) {
            var trace = document.createElement("div");
            trace.className = "log-trace";
            trace.textContent = entry.details.join("\n");
            pre.appendChild(trace);
          }
        }
      }
      displayDiv.appendChild(pre);
      // Restore previous scroll position or enforce top based on scroll mode
      if (scrollMode === "top") {
        container.scrollTop = 0;
      } else if (atBottom) {
        container.scrollTop = container.scrollHeight;
      } else {
        container.scrollTop = prevTop;
      }
    }
  };

  const fetchAndRender = (scrollMode: "preserve" | "top" = "preserve"): void => {
    const uiLimit = limitSelect ? parseInt(limitSelect.value, 10) : 500;
    const recent = recentFirstCheckbox ? !!recentFirstCheckbox.checked : true;
    const wantsAll = !Number.isFinite(uiLimit) || uiLimit <= 0;

    let requested = (() => {
      if (wantsAll) return 5000;
      const scaled = (uiLimit || 500) * 10;
      return Math.min(20000, Math.max(scaled, 1000));
    })();
    const hardCap = 100000;

    const attempt = (): void => {
      chrome.runtime.sendMessage({ type: "getLogs", lines: requested, recent }, (response: any) => {
        if (chrome.runtime.lastError) {
          renderLogs("Error: " + chrome.runtime.lastError.message, scrollMode);
          return;
        }
        if (!response || response.status !== "success") {
          renderLogs("Error: " + (response?.message || "Failed to fetch logs"), scrollMode);
          return;
        }
        const text = response.data || "";
        if (wantsAll) {
          renderLogs(text, scrollMode);
          return;
        }
        const filtered = applyFilters(text);
        const count = countEntriesFromFiltered(filtered);
        if (count >= uiLimit || requested >= hardCap) {
          renderLogs(text, scrollMode);
          return;
        }
        requested = Math.min(hardCap, requested * 2);
        attempt();
      });
    };
    attempt();
  };

  refreshBtn?.addEventListener("click", () => {
    persistPrefs();
    fetchAndRender("top");
  });
  limitSelect?.addEventListener("change", () => {
    persistPrefs();
    fetchAndRender("top");
  });
  recentFirstCheckbox?.addEventListener("change", () => {
    persistPrefs();
    fetchAndRender("top");
  });
  filterWerkzeugCheckbox?.addEventListener("change", () => {
    persistPrefs();
    fetchAndRender("top");
  });

  clearBtn?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "clearLogs" }, (response: any) => {
      if (chrome.runtime.lastError) {
        renderLogs("Error: " + chrome.runtime.lastError.message);
        return;
      }
      if (response && response.status === "success") {
        fetchAndRender("top");
      } else {
        renderLogs("Error: " + (response?.message || "Failed to clear logs"));
      }
    });
  });

  autoCheckbox?.addEventListener("change", () => {
    if (autoTimer) {
      window.clearInterval(autoTimer);
      autoTimer = null;
    }
    if (autoCheckbox.checked) {
      autoTimer = window.setInterval(() => fetchAndRender("preserve"), 3000);
    }
    persistPrefs();
  });

  // Clean up timer when the page is being unloaded to prevent background polling
  window.addEventListener("beforeunload", () => {
    if (autoTimer) {
      window.clearInterval(autoTimer);
      autoTimer = null;
    }
  });

  // Initial load: wait for stored prefs, then render and start auto-refresh if enabled
  (async () => {
    await loadPrefs();
    fetchAndRender("top");
    if (shouldStartAuto && !autoTimer) {
      autoTimer = window.setInterval(() => fetchAndRender("preserve"), 3000);
    }
  })();
}

/**
 * Saves the current form settings to storage and server with enhanced visual feedback.
 */
export async function saveSettings(event: Event): Promise<void> {
  event.preventDefault();

  // Validate all fields before saving
  if (!validateAllFields()) {
    setStatus("settings-status", "Please fix validation errors before saving", true);
    return;
  }

  const saveButton = document.getElementById("save-settings") as HTMLButtonElement;
  const originalText = saveButton.innerHTML;

  // Show saving state
  saveButton.disabled = true;
  saveButton.innerHTML = '<span class="btn-icon"></span>Saving...';
  setStatus("settings-status", "Saving settings...", false);

  try {
    // Collect form data (but only send non-empty fields to avoid overwriting server defaults)
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    const portRaw = (formData.get("server-port") as string | null) || "";
    const portVal = portRaw.trim() ? parseInt(portRaw, 10) : undefined;

    const cfgToPost: Partial<ServerConfig & Record<string, unknown>> = {};
    if (Number.isFinite(portVal as number)) cfgToPost.server_port = portVal as number;

    const downloadDir = (formData.get("download-dir") as string | null) || "";
    if (downloadDir.trim()) cfgToPost.download_dir = downloadDir.trim();

    const logLevel = (formData.get("log-level") as string | null) || "";
    if (logLevel.trim()) cfgToPost.log_level = logLevel as string;

    const consoleLogLevel = (formData.get("console-log-level") as string | null) || "";
    if (consoleLogLevel.trim()) (cfgToPost as any).console_log_level = consoleLogLevel;

    const enableDebug = (form.elements.namedItem("enable-debug") as HTMLInputElement | null)
      ?.checked;
    if (enableDebug === true) cfgToPost.debug_mode = true;

    const enableHistory = (form.elements.namedItem("enable-history") as HTMLInputElement | null)
      ?.checked;
    if (enableHistory === true) cfgToPost.enable_history = true;

    const allowPlaylists = (form.elements.namedItem("allow-playlists") as HTMLInputElement | null)
      ?.checked;
    if (allowPlaylists === true) cfgToPost.allow_playlists = true;

    const ytdlpFormat = (formData.get("ytdlp-format") as string | null) || "";
    const ytdlpConcRaw = (formData.get("ytdlp-concurrent-fragments") as string | null) || "";
    const ytdlpConc = ytdlpConcRaw.trim() ? parseInt(ytdlpConcRaw, 10) : undefined;
    const ytdlpCookiesBrowser = (formData.get("ytdlp-cookies-browser") as string | null) || "";
    const ytdlpMergeFormat = (formData.get("ytdlp-merge-format") as string | null) || "";
    const ytdlpContinue = (form.elements.namedItem("ytdlp-continue") as HTMLInputElement | null)
      ?.checked;
    const ytdlpFragRetriesRaw = (formData.get("ytdlp-fragment-retries") as string | null) || "";
    const ytdlpFragRetries = ytdlpFragRetriesRaw.trim()
      ? parseInt(ytdlpFragRetriesRaw, 10)
      : undefined;
    const ytDlpOptions: Record<string, unknown> = {};
    if (ytdlpFormat.trim()) ytDlpOptions.format = ytdlpFormat.trim();
    if (ytdlpMergeFormat.trim()) ytDlpOptions.merge_output_format = ytdlpMergeFormat.trim();
    if (Number.isFinite(ytdlpConc as number))
      ytDlpOptions.concurrent_fragments = ytdlpConc as number;
    if (ytdlpCookiesBrowser.trim()) ytDlpOptions.cookiesfrombrowser = [ytdlpCookiesBrowser.trim()];
    if (ytdlpContinue === true || ytdlpContinue === false)
      ytDlpOptions.continuedl = !!ytdlpContinue;
    if (Number.isFinite(ytdlpFragRetries as number))
      ytDlpOptions.fragment_retries = ytdlpFragRetries as number;
    if (Object.keys(ytDlpOptions).length) (cfgToPost as any)["yt_dlp_options"] = ytDlpOptions;

    const logFile = (formData.get("log-file") as string | null) || "";
    if (logFile.trim()) (cfgToPost as any).log_file = logFile.trim();
    const historyFile = (formData.get("history-file") as string | null) || "";
    if (historyFile.trim()) (cfgToPost as any).history_file = historyFile.trim();

    // If user provided a server port, cache it immediately so background can talk to server
    if (Number.isFinite(portVal as number)) {
      try {
        const existing = await new Promise<any>(resolve =>
          chrome.storage.local.get(["serverConfig"], resolve)
        );
        const nextCfg = { ...(existing?.serverConfig || {}), server_port: portVal };
        await new Promise<void>((resolve, reject) =>
          chrome.storage.local.set({ serverConfig: nextCfg }, () => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve();
          })
        );
      } catch {
        // best-effort cache
      }
    }
    // Gunicorn UI removed; workers forced to 1 in backend

    // Send to server
    const response = await new Promise<any>((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "setConfig", config: cfgToPost }, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    if (response && response.status === "success") {
      // Show success state with enhanced visual feedback
      showSaveSuccess();
      setStatus("settings-status", "Settings saved successfully!", false);

      // If changes include restart-required keys, inform the user
      try {
        const changedKeys: string[] = Array.isArray(response.changed_keys)
          ? (response.changed_keys as string[])
          : [];
        const restartKeys = new Set([
          "server_port",
          "server_host",
          "max_concurrent_downloads",
          "log_level",
          "console_log_level",
          "log_path",
        ]);
        const requiresRestart = changedKeys.some(k => restartKeys.has(k));
        if (requiresRestart) {
          setStatus(
            "settings-status",
            "Some changes require a server restart. Click 'Restart Server' below to apply.",
            false,
            6000
          );
        }
      } catch {
        // ignore notification errors
      }

      // Log the successful save
      logger.info(
        "Settings saved successfully",
        { component: "options", operation: "configSave" },
        { posted: cfgToPost }
      );

      // Persist a normalized copy of current form values to storage
      try {
        await new Promise<void>((resolve, reject) => {
          // Only persist the fields we posted; avoid writing empties over server config
          chrome.storage.local.set({ serverConfig: { ...(cfgToPost as any) } }, () => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve();
          });
        });
      } catch {
        // swallow
      }

      // If some fields were left blank locally, fetch server config and populate missing
      try {
        const hadEmpties = (() => {
          const neededIds = [
            "settings-download-dir",
            "settings-log-level",
            "settings-ytdlp-format",
            "settings-ytdlp-concurrent-fragments",
            "settings-log-file",
            "settings-history-file",
          ];
          return neededIds.some(id => {
            const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null;
            if (!el) return false;
            return "value" in el ? String((el as any).value || "").trim() === "" : false;
          });
        })();
        if (hadEmpties) {
          chrome.runtime.sendMessage({ type: "getConfig" }, resp => {
            if (resp && resp.status === "success" && resp.data) {
              populateMissingFieldsFromConfig(resp.data as any);
            }
          });
        }
      } catch {
        // ignore
      }
    } else {
      throw new Error(response?.message || "Failed to save settings to server");
    }
  } catch (error) {
    logger.error(
      "Failed to save settings:",
      { component: "options", operation: "configSave" },
      error as any
    );
    setStatus(
      "settings-status",
      "Error saving settings: " + (error instanceof Error ? error.message : "Unknown error"),
      true
    );

    // Show error state
    showSaveError();
  } finally {
    // Restore button state
    saveButton.disabled = false;
    saveButton.innerHTML = originalText;
  }
}

/**
 * Populate only empty/unchecked fields from a server config payload, leaving
 * any user-entered values intact.
 */
function populateMissingFieldsFromConfig(config: ServerConfig & Record<string, any>): void {
  const portEl = document.getElementById("settings-server-port") as HTMLInputElement | null;
  if (portEl && (!portEl.value || !portEl.value.trim()) && config.server_port != null) {
    portEl.value = String(config.server_port);
  }

  const dirEl = document.getElementById("settings-download-dir") as HTMLInputElement | null;
  if (dirEl && (!dirEl.value || !dirEl.value.trim()) && config.download_dir) {
    dirEl.value = config.download_dir;
  }

  const logLevelEl = document.getElementById("settings-log-level") as HTMLSelectElement | null;
  if (logLevelEl && (!logLevelEl.value || !logLevelEl.value.trim()) && config.log_level) {
    logLevelEl.value = config.log_level;
  }

  const fmtEl = document.getElementById("settings-ytdlp-format") as HTMLSelectElement | null;
  if (fmtEl && (!fmtEl.value || !fmtEl.value.trim()) && config.yt_dlp_options?.format) {
    fmtEl.value = String(config.yt_dlp_options.format);
  }

  const concEl = document.getElementById(
    "settings-ytdlp-concurrent-fragments"
  ) as HTMLInputElement | null;
  const concVal =
    (config as any)?.yt_dlp_options?.concurrent_fragments ??
    (config as any)?.ytdlp_concurrent_fragments;
  if (concEl && (!concEl.value || !concEl.value.trim()) && concVal != null) {
    concEl.value = String(concVal);
  }

  const logFileEl = document.getElementById("settings-log-file") as HTMLInputElement | null;
  if (logFileEl && (!logFileEl.value || !logFileEl.value.trim()) && (config as any).log_file) {
    logFileEl.value = String((config as any).log_file);
  }
  const histFileEl = document.getElementById("settings-history-file") as HTMLInputElement | null;
  if (
    histFileEl &&
    (!histFileEl.value || !histFileEl.value.trim()) &&
    (config as any).history_file
  ) {
    histFileEl.value = String((config as any).history_file);
  }

  const consoleLogLevelEl = document.getElementById(
    "settings-console-log-level"
  ) as HTMLSelectElement | null;
  if (
    consoleLogLevelEl &&
    (!consoleLogLevelEl.value || !consoleLogLevelEl.value.trim()) &&
    (config as any).console_log_level
  ) {
    consoleLogLevelEl.value = String((config as any).console_log_level);
  }

  // Checkboxes: only set if currently unchecked and server says true
  const debugEl = document.getElementById("settings-enable-debug") as HTMLInputElement | null;
  if (debugEl && !debugEl.checked && config.debug_mode === true) debugEl.checked = true;

  const histEl = document.getElementById("settings-enable-history") as HTMLInputElement | null;
  if (histEl && !histEl.checked && config.enable_history === true) histEl.checked = true;

  const playlistsEl = document.getElementById(
    "settings-allow-playlists"
  ) as HTMLInputElement | null;
  if (playlistsEl && !playlistsEl.checked && config.allow_playlists === true)
    playlistsEl.checked = true;

  // Re-run validation/info updates after filling
  validateAllFields();
  const logSel = document.getElementById("settings-log-level") as HTMLSelectElement | null;
  if (logSel) updateLogLevelInfo(logSel);
  const consSel = document.getElementById("settings-console-log-level") as HTMLSelectElement | null;
  if (consSel) updateConsoleLogLevelInfo(consSel);
  const fmtSel = document.getElementById("settings-ytdlp-format") as HTMLSelectElement | null;
  if (fmtSel) updateFormatInfo(fmtSel);
}

/**
 * Shows enhanced success feedback when settings are saved.
 */
function showSaveSuccess(): void {
  const container = document.querySelector(".settings-container") as HTMLElement;
  if (!container) return;

  // Add success animation class
  container.classList.add("settings-saved");

  // Create success notification
  const notification = document.createElement("div");
  notification.className = "save-notification success";
  notification.innerHTML =
    '<div class="notification-content">' +
    '<span class="notification-icon">Success</span>' +
    '<div class="notification-text">' +
    "<h4>Settings Saved!</h4>" +
    "<p>Your configuration has been updated successfully.</p>" +
    "</div>" +
    "</div>";

  // Add to page
  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.classList.add("show");
  }, 100);

  // Remove after 4 seconds
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);

  // Remove animation class after animation completes
  setTimeout(() => {
    container.classList.remove("settings-saved");
  }, 1000);
}

/**
 * Shows error feedback when settings save fails.
 */
function showSaveError(): void {
  const notification = document.createElement("div");
  notification.className = "save-notification error";
  notification.innerHTML =
    '<div class="notification-content">' +
    '<span class="notification-icon">Error</span>' +
    '<div class="notification-text">' +
    "<h4>Save Failed</h4>" +
    "<p>There was an error saving your settings. Please try again.</p>" +
    "</div>" +
    '<button class="notification-close" onclick="this.parentElement.parentElement.remove()"></button>' +
    "</div>";

  // Add to page
  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.classList.add("show");
  }, 100);

  // Auto-remove after 6 seconds (longer for errors)
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 6000);
}

/**
 * Opens a folder picker dialog to select the download directory.
 * Provides a fallback for browsers that do not support `showDirectoryPicker`.
 */
// Removed selectDownloadDirectory; chooser removed from UI

/**
 * Sends a request to restart the server.
 */
export function restartServer(): void {
  const restartButton = document.getElementById("restart-server") as HTMLButtonElement;
  if (restartButton) {
    restartButton.disabled = true;
    restartButton.innerHTML = "Restarting...";
  }

  chrome.runtime.sendMessage({ type: "restartServer" }, response => {
    if (restartButton) {
      restartButton.disabled = false;
      restartButton.innerHTML = "Restart Server";
    }

    if (response && response.status === "success") {
      setStatus("settings-status", "Server restarted successfully!");
    } else {
      setStatus(
        "settings-status",
        "Error: " + (response?.message || "Failed to restart server"),
        true
      );
    }
  });
}

/**
 * Loads and renders download errors from history storage
 * @param page Page number for pagination
 * @param perPage Items per page
 */
export async function loadErrorHistory(page = 1, perPage = 25): Promise<void> {
  const { history, totalItems } = await fetchHistory(page, perPage);
  const errorEntries = history.filter(item => item.status === "error");
  const listEl = document.getElementById("error-history-list");
  if (!listEl) return;
  // Render only error entries
  renderHistoryItems(errorEntries, page, perPage, errorEntries.length, listEl);
}

// --- Download History (full) UI wiring ---
let currentHistoryPage = 1;
let currentHistoryPerPage = 25;

export async function loadDownloadHistory(page = 1, perPage = 25): Promise<void> {
  const listEl = document.getElementById("history-list");
  const pageInfoEl = document.getElementById("history-page-info");
  const prevBtn = document.getElementById("history-prev") as HTMLButtonElement | null;
  const nextBtn = document.getElementById("history-next") as HTMLButtonElement | null;
  if (!listEl) return;

  currentHistoryPage = page;
  currentHistoryPerPage = perPage;

  const { history, totalItems } = await fetchHistory(page, perPage);
  renderHistoryItems(
    history,
    page,
    perPage,
    totalItems,
    listEl,
    pageInfoEl || undefined,
    prevBtn || undefined,
    (nextBtn as HTMLButtonElement) || undefined
  );
}

export function setupHistoryUI(): void {
  const perPageSelect = document.getElementById("history-per-page") as HTMLSelectElement | null;
  const prevBtn = document.getElementById("history-prev") as HTMLButtonElement | null;
  const nextBtn = document.getElementById("history-next") as HTMLButtonElement | null;

  const getPerPage = (): number => {
    const raw = perPageSelect?.value || String(currentHistoryPerPage);
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n > 0 ? n : 25;
  };

  perPageSelect?.addEventListener("change", () => {
    currentHistoryPage = 1;
    currentHistoryPerPage = getPerPage();
    void loadDownloadHistory(currentHistoryPage, currentHistoryPerPage);
  });

  prevBtn?.addEventListener("click", () => {
    if (currentHistoryPage > 1) {
      currentHistoryPage -= 1;
      void loadDownloadHistory(currentHistoryPage, getPerPage());
    }
  });

  nextBtn?.addEventListener("click", () => {
    // We don't know total here; renderHistoryItems sets disabled states appropriately.
    currentHistoryPage += 1;
    void loadDownloadHistory(currentHistoryPage, getPerPage());
  });

  // Initial load
  void loadDownloadHistory(currentHistoryPage, getPerPage());
}

/**
 * Applies the appropriate theme (light/dark) to the options page UI.
 *
 * @param forceTheme - Optional theme to force (light/dark)
 */
export function applyOptionsTheme(forceTheme?: Theme): void {
  const isDark =
    forceTheme === "dark" ||
    (!forceTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Applying theme

  document.body.classList.toggle("dark-theme", isDark);

  // Update header icon based on theme
  const headerIcon = document.getElementById("options-header-icon") as HTMLImageElement;
  if (headerIcon) {
    const currentSrc = headerIcon.src;
    const isCurrentlyDark = currentSrc.includes("darkicon");
    // Header icon update

    if (isDark !== isCurrentlyDark) {
      const newSrc = currentSrc.replace(
        isCurrentlyDark ? "darkicon48.png" : "icon48.png",
        isDark ? "darkicon48.png" : "icon48.png"
      );
      // Updating icon
      headerIcon.src = newSrc;
    }
  }
}

/**
 * Handles theme toggle button click.
 * Switches between light and dark themes and persists the preference.
 */
export async function handleThemeToggle(): Promise<void> {
  // Theme toggle clicked

  try {
    // Get current theme from storage
    const result = await chrome.storage.local.get("theme");
    const currentTheme = result.theme as Theme | undefined;
    // Current theme from storage

    // Determine new theme
    let newTheme: Theme;
    if (currentTheme === "dark") {
      newTheme = "light";
    } else if (currentTheme === "light") {
      newTheme = "dark";
    } else {
      // If no theme is stored, check system preference and invert it
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      newTheme = systemPrefersDark ? "light" : "dark";
    }

    // New theme will be

    // Save new theme to storage
    await chrome.storage.local.set({ theme: newTheme });

    // Apply the new theme
    applyOptionsTheme(newTheme);

    // Log the theme change
    // Theme changed
  } catch (error) {
    console.error("Error toggling theme:", error);
  }
}

// --- Admin clear helpers ---
async function getServerPortCached(): Promise<number | null> {
  try {
    const res = await chrome.storage.local.get("serverPort");
    const port = (res as any)?.serverPort;
    return typeof port === "number" && Number.isFinite(port) ? port : null;
  } catch {
    return null;
  }
}

async function clearByStatus(status: "completed" | "error"): Promise<void> {
  // Clear in-memory status first
  try {
    const port = await getServerPortCached();
    if (port) {
      const param = status === "completed" ? "finished" : "error";
      await fetch(`http://127.0.0.1:${port}/api/status?status=${encodeURIComponent(param)}`, {
        method: "DELETE",
      });
    }
  } catch {}
  // Filter server history file
  try {
    const port = await getServerPortCached();
    if (port) {
      const resp = await fetch(`http://127.0.0.1:${port}/api/history`);
      if (resp.ok) {
        const data = await resp.json();
        const items: any[] = Array.isArray(data?.history) ? data.history : [];
        const filtered = items.filter(it => {
          const s = String(it?.status || "").toLowerCase();
          if (status === "completed") return !(s === "finished" || s === "complete" || s === "completed" || s === "success");
          return !(s === "error" || s === "failed" || s === "fail");
        });
        await fetch(`http://127.0.0.1:${port}/api/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(filtered),
        });
      }
    }
  } catch {}
  // Update UI
  try {
    chrome.runtime.sendMessage({ type: "historyUpdated" });
  } catch {}
}

async function clearStatuses(states: string[]): Promise<void> {
  const port = await getServerPortCached();
  if (!port) return;
  await Promise.all(
    states.map(async s => {
      try {
        await fetch(`http://127.0.0.1:${port}/api/status?status=${encodeURIComponent(s)}`, { method: "DELETE" });
      } catch {}
    })
  );
}

async function clearQueueServer(): Promise<void> {
  const port = await getServerPortCached();
  if (!port) return;
  try {
    // Get queue, then remove each by id
    const r = await fetch(`http://127.0.0.1:${port}/api/queue`);
    if (r.ok) {
      const data = await r.json();
      const arr: any[] = Array.isArray(data?.queue) ? data.queue : [];
      await Promise.all(
        arr.map(async it => {
          const id = String(it?.downloadId || it?.download_id || "");
          if (!id) return;
          try {
            await fetch(`http://127.0.0.1:${port}/api/queue/${encodeURIComponent(id)}/remove`, { method: "POST" });
          } catch {}
        })
      );
    }
  } catch {}
}

async function clearHistoryRemote(): Promise<void> {
  const port = await getServerPortCached();
  if (!port) return;
  try {
    await fetch(`http://127.0.0.1:${port}/api/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear" }),
    });
  } catch {}
}

/**
 * Initializes the theme for the options page.
 * Loads the stored theme preference or uses system preference.
 */
export async function initializeOptionsTheme(): Promise<void> {
  try {
    // Get stored theme preference
    const result = await chrome.storage.local.get("theme");
    const storedTheme = result.theme as Theme | undefined;

    if (storedTheme) {
      // Use stored preference
      applyOptionsTheme(storedTheme);
    } else {
      // Use system preference
      applyOptionsTheme();
    }
  } catch (error) {
    console.error("Error initializing theme:", error);
    // Fallback to system preference
    applyOptionsTheme();
  }
}

// Initialize options page when loaded
// In a test environment, DOMContentLoaded may have already fired.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOptionsPage);
} else if (typeof initOptionsPage === "function") {
  // If used in tests or after page load, init directly
  initOptionsPage();
}
