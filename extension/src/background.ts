/**
 * Enhanced Video Downloader - Background Script
 * Handles port discovery, server communication, and download management
 */

import { Theme, ServerConfig } from "./types";
import type { HistoryEntry } from "./types";
import {
  applyThemeToActionIcon,
  actionIconPaths,
  getActionIconPaths,
} from "./background-helpers";
import { debounce } from "./lib/utils";
import {
  handleSetConfig,
  ApiService,
  StorageService,
  handleGetHistory,
  handleClearHistory,
  discoverServerPort,
} from "./background-logic";
import { getServerPort, getPortRange } from "./constants";

// --- START CONSTANTS AND STORAGE KEYS ---
const _historyStorageKey = "downloadHistory";
const _portStorageKey = "serverPort";
const _configStorageKey = "serverConfig";
const serverStatusKey = "serverOnlineStatus";
const _historyEnabledKey = "isHistoryEnabled"; // For toggling history
const networkStatusKey = "networkOnlineStatus";
const _queueStorageKey = "downloadQueue";

// Use centralized port configuration
const _defaultServerPort = getServerPort();
const _maxPortScan = getPortRange()[1]; // Use the end of the port range
const _serverCheckInterval = 5000; // ms, for periodic server status checks

// Expected application name for server identification (from manifest)
const expectedAppName =
  (chrome.runtime && chrome.runtime.getManifest
    ? chrome.runtime.getManifest().name
    : null) || "Enhanced Video Downloader";
// --- END CONSTANTS AND STORAGE KEYS ---

// Utility logging functions
const log = (...args: any[]): void => console.log("[BG]", ...args);
const warn = (...args: any[]): void => console.warn("[BG Warning]", ...args);
const error = (...args: any[]): void => console.error("[BG Error]", ...args);

// --- START SERVICE IMPLEMENTATIONS ---

const apiService: ApiService = {
  async fetchConfig(port: number): Promise<Partial<ServerConfig>> {
    const response = await fetch("http://127.0.0.1:" + port + "/api/config");
    if (!response.ok) {
      throw new Error(
        "Failed to fetch config from server: " + response.statusText
      );
    }
    return response.json();
  },
  async saveConfig(
    port: number,
    config: Partial<ServerConfig>
  ): Promise<boolean> {
    const response = await fetch("http://127.0.0.1:" + port + "/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    return response.ok;
  },
};

const storageService: StorageService = {
  async getConfig(): Promise<Partial<ServerConfig>> {
    const result = await chrome.storage.local.get(_configStorageKey);
    return result[_configStorageKey] || {};
  },
  async setConfig(config: Partial<ServerConfig>): Promise<void> {
    const currentConfig = await this.getConfig();
    const newConfig = { ...currentConfig, ...config };
    return chrome.storage.local.set({ [_configStorageKey]: newConfig });
  },
  async getPort(): Promise<number | null> {
    const result = await chrome.storage.local.get(_portStorageKey);
    return result[_portStorageKey] || null;
  },
  async setPort(port: number | null): Promise<void> {
    try {
      await chrome.storage.local.set({ [_portStorageKey]: port });
    } catch (e) {
      warn("Failed to cache server port:", e);
    }
  },
  async getHistory(): Promise<HistoryEntry[]> {
    const result = await chrome.storage.local.get({ [_historyStorageKey]: [] });
    return result[_historyStorageKey];
  },
  async clearHistory(): Promise<void> {
    return chrome.storage.local.set({ [_historyStorageKey]: [] });
  },
};

// --- END SERVICE IMPLEMENTATIONS ---

// --- START NETWORK STATUS MONITORING ---
/** Handle changes in network connectivity */
const handleNetworkChange = async (online: boolean): Promise<void> => {
  try {
    await chrome.storage.local.set({ [networkStatusKey]: online });
  } catch (err) {
    log("Failed to update network status in storage:", err);
  }

  // Notify the user
  if (online) {
    showNotification(
      "Network Connected",
      "Browser is back online. Extension functions are restored."
    );
    // Automatically attempt server reconnection on network restore
    try {
      // Show scanning indicator
      if ((chrome.action as any)?.setBadgeText) {
        try {
          (chrome.action as any).setBadgeBackgroundColor({
            color: "var(--color-warning)",
          });
          (chrome.action as any).setBadgeText({ text: "SCAN" }); // Use plain ASCII string
        } catch (e) {
          /* ignore errors setting badge */
        }
      }

      const port = await findServerPort(true);
      if (port !== null) {
        log("Server reconnected on port " + port);
        showNotification(
          "Server Reconnected",
          "Enhanced Video Downloader server is back online on port " +
            port +
            "."
        );
        // Broadcast server status after reconnection
        broadcastServerStatus();
      } else {
        log("Server reconnection failed upon network restore.");
        showNotification(
          "Server Unavailable",
          "Could not reconnect to the Enhanced Video Downloader server. Please check if it's running."
        );
        // Broadcast disconnected status
        broadcastServerStatus();
      }
    } catch (reconnectErr) {
      log("Error during server reconnection attempt:", reconnectErr);
    }
  } else {
    showNotification(
      "Network Disconnected",
      "Browser is offline. Download functionality may be unavailable."
    );

    // Persist current state when going offline
    try {
      await persistQueue();
      // Also persist active downloads
      await chrome.storage.local.set({
        activeDownloads: activeDownloads,
      });
      log("Persisted queue and active downloads due to network disconnect");
    } catch (persistErr) {
      warn("Failed to persist state during network disconnect:", persistErr);
    }

    // Broadcast disconnected status when going offline
    broadcastServerStatus();
  }
};
// Initialize network status in storage
chrome.storage.local.get(networkStatusKey, (res) => {
  const current =
    typeof res[networkStatusKey] === "boolean"
      ? res[networkStatusKey]
      : navigator.onLine;
  handleNetworkChange(current);
});
// Listen for browser online/offline events
try {
  self.addEventListener("online", () => handleNetworkChange(true));
  self.addEventListener("offline", () => handleNetworkChange(false));
  log("Registered network connectivity listeners");
} catch (e) {
  warn("Could not register network status listeners:", e);
}
// --- END NETWORK STATUS MONITORING ---

// Helper for initial theme setup
const initializeActionIconTheme = async (): Promise<void> => {
  try {
    log("Initializing action icon theme...");
    const result = await chrome.storage.local.get("theme");
    const storedTheme = result.theme as Theme | undefined;

    if (storedTheme) {
      log("Found stored theme: " + storedTheme);
      applyThemeToActionIcon(storedTheme);
    } else {
      log("No theme stored. Checking system preference.");
      if (typeof self !== "undefined" && self.matchMedia) {
        const darkModeMediaQuery = self.matchMedia(
          "(prefers-color-scheme: dark)"
        );
        const systemPrefersDark = darkModeMediaQuery.matches;
        log("System prefers dark: " + systemPrefersDark);
        applyThemeToActionIcon(systemPrefersDark ? "dark" : "light");

        // Add listener for system theme changes
        try {
          darkModeMediaQuery.addEventListener("change", (e) => {
            const newSystemPrefersDark = e.matches;
            log(
              "System theme changed, now prefers dark: " + newSystemPrefersDark
            );

            // Check if user has manually set a theme
            chrome.storage.local.get("theme", (themeResult) => {
              if (!themeResult.theme) {
                // Only update automatically if user hasn't set a preference
                applyThemeToActionIcon(newSystemPrefersDark ? "dark" : "light");
              } else {
                log(
                  "Not updating theme automatically as user has set a preference."
                );
              }
            });
          });
          log("Added listener for system theme changes");
        } catch (listenerError) {
          warn(
            "Could not add listener for system theme changes: " +
              (listenerError as Error).message
          );
        }
      } else {
        warn(
          "self.matchMedia not available. " +
            "Defaulting action icon to light theme."
        );
        applyThemeToActionIcon("light"); // Fallback if matchMedia is not available
      }
    }
  } catch (e) {
    error("Error initializing action icon theme:", e);
    applyThemeToActionIcon("light"); // Fallback to a default if storage access fails
  }
};

// Types for active downloads and queue
interface DownloadStatus {
  status: string;
  progress: number;
  filename?: string;
  title?: string;
  id?: string;
  url: string;
}

// Forward declaration for functions used by debouncedUpdateQueueUI or early setup
export let downloadQueue: string[] = []; // Stores URLs of queued videos
const activeDownloads: Record<string, DownloadStatus> = {}; // Store {url: {status, progress, filename}}

// Define updateQueueUI before it's used by debouncedUpdateQueueUI
const updateQueueUI = (): void => {
  // Persist queue to storage
  persistQueue();
  chrome.runtime
    .sendMessage({
      type: "queueUpdated",
      queue: downloadQueue,
      active: activeDownloads,
    })
    .catch(() => {
      // Catch errors if the popup is not open or the receiver doesn't exist.
    });
};

const debouncedUpdateQueueUI = debounce(updateQueueUI, 300);

// Function to update both badge and queue UI (called frequently)
const _updateQueueAndBadge = (): void => {
  updateBadge();
  debouncedUpdateQueueUI();
};

// Show a browser notification with optional tag
const showNotification = (
  title: string,
  message: string,
  tag: string | null = null
): void => {
  if (!chrome.notifications) {
    warn("Chrome notifications API not available");
    return;
  }

  // Determine icon URL if available
  const iconUrl =
    chrome.runtime && typeof chrome.runtime.getURL === "function"
      ? chrome.runtime.getURL("extension/icons/icon128.png")
      : "";
  const options: chrome.NotificationOptions = {
    type: "basic",
    iconUrl,
    title,
    message,
  };

  // Use tag as notificationId for grouping, if provided
  if (tag) {
    chrome.notifications.create(tag, options);
  } else {
    chrome.notifications.create("", options);
  }
};

// Server state variables
const _currentPort: number | null = null;
let serverAvailable = false;
// Track previous server availability for notifications
const _prevServerAvailable = serverAvailable;
let _portScanInProgress = false;
const _initialScanDone = false;

const _lastKnownConfig: Partial<ServerConfig> = {};
const _configRefreshCounter = 0; // Counter for periodic config refresh
const _configRefreshIntervalCount = 6; // Refresh config every 6 * 5s = 30s

// Exponential backoff settings for server discovery retries
const initialPortBackoffInterval = 1000; // Start with 1 second
let _portBackoffInterval = initialPortBackoffInterval;
const _maxPortBackoffInterval = 60000; // Cap at 1 minute

// Timeout for individual port status checks (ms)
const PORT_CHECK_TIMEOUT = 2000;

// Server Communication
const getServerStatus = async (): Promise<
  "connected" | "disconnected" | "checking"
> => {
  try {
    const port = await storageService.getPort();
    if (!port) {
      return "disconnected";
    }

    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      return "connected";
    } else {
      return "disconnected";
    }
  } catch (error) {
    return "disconnected";
  }
};

const getCurrentTheme = async (): Promise<Theme> => {
  try {
    const result = await chrome.storage.local.get("theme");
    return (result.theme as Theme) || "light";
  } catch (error) {
    return "light";
  }
};

const broadcastServerStatus = async (): Promise<void> => {
  const status = await getServerStatus();

  // Update icon based on server status
  if (status === "connected") {
    // Use the current theme's icon paths
    const iconPaths = getActionIconPaths();
    const currentTheme = await getCurrentTheme();
    chrome.action.setIcon({ path: iconPaths[currentTheme] });
    (chrome.action as any).setBadgeText?.({ text: "" });
  } else {
    // Use error icon (could be a different icon or just the current theme with badge)
    const iconPaths = getActionIconPaths();
    const currentTheme = await getCurrentTheme();
    chrome.action.setIcon({ path: iconPaths[currentTheme] });
    (chrome.action as any).setBadgeText?.({ text: "!" });
    (chrome.action as any).setBadgeBackgroundColor?.({ color: "#f44336" });
  }

  // Broadcast status to all UI components
  chrome.runtime
    .sendMessage({
      type: "serverStatusUpdate",
      status,
    })
    .catch(() => {
      // Ignore errors when no listeners are available
    });
};

const checkServerStatus = async (port: number): Promise<boolean> => {
  const oldAvailable = serverAvailable;
  // Skip server status checks when fetch API is unavailable (e.g., non-browser or test env)
  if (typeof fetch !== "function") {
    return false;
  }
  if (!port) {
    serverAvailable = false;
    try {
      await chrome.storage.local.set({ [serverStatusKey]: false });
    } catch (storageErr) {
      warn("Failed to update server status in storage:", storageErr);
    }
    updateIcon();
    // Notify if availability changed
    if (serverAvailable !== oldAvailable) {
      showNotification(
        "Server Disconnected",
        "The Enhanced Video Downloader server is not available. Downloads won't work until it's reconnected."
      );
    }
    return false;
  }

  try {
    // Fetch server status with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PORT_CHECK_TIMEOUT);
    let response: Response;
    try {
      response = await fetch("http://127.0.0.1:" + port + "/health", {
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.ok) {
      const data = await response.json();
      // Verify the server is our app by checking app_name
      if (data.app_name === expectedAppName) {
        serverAvailable = true;
        // If server just came online, refresh config
        if (!oldAvailable) {
          log("Server now available on port " + port + ", refreshing config"); // No emoji, just text
          await fetchServerConfig(port);
        }
      } else {
        warn("Wrong server on port " + port + ": " + data.app_name);
        serverAvailable = false;
      }
    } else {
      warn("Server check failed on port " + port + ": " + response.status);
      serverAvailable = false;
    }
  } catch (e: any) {
    if (e.name === "AbortError") {
      warn("Server check timeout on port " + port);
    } else {
      warn("Error checking server on port " + port + ":", e);
    }
    serverAvailable = false;
  }

  // Update storage
  try {
    await chrome.storage.local.set({ [serverStatusKey]: serverAvailable });
  } catch (storageErr) {
    warn("Failed to update server status in storage:", storageErr);
  }

  // Update badge/icon to reflect server status
  updateIcon();

  // If server availability changed, show notification
  if (serverAvailable !== oldAvailable) {
    if (serverAvailable) {
      showNotification(
        "Server Connected",
        "Enhanced Video Downloader server is now online on port " + port + "."
      );
      // Reset backoff interval when server is found
      _portBackoffInterval = initialPortBackoffInterval;
    } else {
      showNotification(
        "Server Disconnected",
        "The Enhanced Video Downloader server is not available. Downloads won't work until it's reconnected."
      );
    }
  }

  return serverAvailable;
};

// Additional functions (stub implementations to be completed)
const fetchServerConfig = async (
  port: number
): Promise<Partial<ServerConfig>> => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/config`);
    if (response.ok) {
      const config = await response.json();
      return config;
    } else {
      log(`Failed to fetch config from server: ${response.status}`);
      return {};
    }
  } catch (error) {
    log(`Error fetching server config: ${error}`);
    return {};
  }
};
const saveServerConfig = async (
  port: number,
  configToSave: Partial<ServerConfig>
): Promise<boolean> => {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/config`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(configToSave),
    });

    if (response.ok) {
      log(`Config saved successfully to server on port ${port}`);
      return true;
    } else {
      log(`Failed to save config to server: ${response.status}`);
      return false;
    }
  } catch (error) {
    log(`Error saving server config: ${error}`);
    return false;
  }
};

type FindServerPortDeps = {
  discoverServerPort: typeof discoverServerPort;
  storageService: typeof storageService;
  checkServerStatus: typeof checkServerStatus;
  log: typeof log;
  warn: typeof warn;
};

const findServerPort = async (
  startScan = false,
  deps?: Partial<FindServerPortDeps>
): Promise<number | null> => {
  const {
    discoverServerPort: discover = discoverServerPort,
    storageService: storage = storageService,
    checkServerStatus: checkStatus = checkServerStatus,
    log: logFn = log,
    warn: warnFn = warn,
  } = deps || {};

  // Show badge indicator if forcing scan
  if (startScan && (chrome.action as any)?.setBadgeText) {
    try {
      (chrome.action as any).setBadgeBackgroundColor({
        color: "var(--color-warning)",
      });
      (chrome.action as any).setBadgeText({ text: "SCAN" }); // Use plain ASCII string
    } catch (e) {
      /* ignore errors setting badge */
    }
  }

  // Set scanning state
  _portScanInProgress = true;

  try {
    // Progress callback for user feedback
    const onProgress = (current: number, total: number) => {
      if (startScan && (chrome.action as any)?.setBadgeText) {
        try {
          const percentage = Math.round((current / total) * 100);
          (chrome.action as any).setBadgeText({
            text: String(percentage) + "%",
          }); // Use string concatenation
        } catch (e) {
          /* ignore errors setting badge */
        }
      }
    };

    // Perform discovery with timeout and progress
    const port = await discover(
      storage,
      checkStatus,
      _defaultServerPort,
      _maxPortScan,
      startScan,
      PORT_CHECK_TIMEOUT,
      onProgress
    );

    if (port !== null) {
      logFn("Server discovered on port " + port);
      // Reset backoff interval when server is found
      _portBackoffInterval = initialPortBackoffInterval;

      // Notify options page about server discovery
      try {
        chrome.runtime.sendMessage(
          { type: "serverDiscovered", port },
          (response) => {
            // Ignore any errors - this is just a notification
            if (chrome.runtime.lastError) {
              // This is expected when options page is not open
              logFn(
                "Server discovery notification sent (options page may not be open)"
              );
            }
          }
        );
      } catch (e) {
        // Ignore errors if no listeners are available
        logFn(
          "Server discovery notification failed (expected if options page not open)"
        );
      }
    } else {
      warnFn("Server port discovery failed after scanning range."); // No emoji, just text
      // Increase backoff interval for next attempt
      _portBackoffInterval = Math.min(
        _portBackoffInterval * 2,
        _maxPortBackoffInterval
      );
    }

    return port;
  } catch (e) {
    // Handle any errors from the discover function
    warnFn("Error during server port discovery:", e); // No emoji, just text
    // Increase backoff interval for next attempt
    _portBackoffInterval = Math.min(
      _portBackoffInterval * 2,
      _maxPortBackoffInterval
    );
    return null;
  } finally {
    // Clear badge after scanning
    if (startScan && (chrome.action as any)?.setBadgeText) {
      try {
        (chrome.action as any).setBadgeText({ text: "" }); // Clear badge text, no emoji
      } catch (e) {
        /* ignore errors clearing badge */
      }
    }

    // Clear scanning state
    _portScanInProgress = false;
  }
};

const updateIcon = (): void => {
  // Implementation details
};

const updateBadge = (): void => {
  // Implementation details
};

const addOrUpdateHistory = async (
  url: string,
  status: string,
  filename?: string,
  filepath?: string,
  thumbnailUrl?: string,
  sourceUrl?: string,
  title?: string
): Promise<void> => {
  // Implementation details
};

const clearDownloadHistory = async (): Promise<void> => {
  // Implementation details
};

const toggleHistorySetting = async (): Promise<void> => {
  try {
    const result = await chrome.storage.local.get(_historyEnabledKey);
    const enabled = result[_historyEnabledKey] as boolean;
    await chrome.storage.local.set({ [_historyEnabledKey]: !enabled });
  } catch (e) {
    warn("Failed to toggle history setting:", e);
  }
};

const sendDownloadRequest = async (
  videoUrl: string,
  tabId?: number,
  isPlaylist = false,
  quality?: string | null,
  format?: string | null,
  pageTitle = "video",
  customDownloadId?: string | null
): Promise<any> =>
  // Implementation details
  ({});

// Message handling for background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Use an IIFE to handle async logic and always return true for async responses
  (async () => {
    try {
      const port = await storageService.getPort();

      switch (message.type) {
        case "downloadVideo": {
          log("Received download request for:", message.url);
          const response = await sendDownloadRequest(
            message.url,
            sender.tab?.id,
            message.isPlaylist,
            message.quality,
            message.format,
            message.pageTitle,
            message.downloadId
          );
          sendResponse(response);
          break;
        }

        case "getQueue":
          // This logic remains untouched
          sendResponse({ queue: downloadQueue, active: activeDownloads });
          break;

        case "clearHistory": {
          const result = await handleClearHistory(storageService);
          sendResponse(result);
          break;
        }

        case "toggleHistory": {
          await toggleHistorySetting();
          sendResponse({ status: "success" });
          break;
        }

        case "getHistory": {
          const result = await handleGetHistory(storageService);
          sendResponse(result);
          break;
        }

        case "setConfig": {
          // *** This is the new, refactored logic ***
          const result = await handleSetConfig(
            port,
            message.config,
            apiService,
            storageService
          );
          sendResponse(result);
          break;
        }

        case "getConfig":
          // This logic remains untouched for now
          if (port) {
            const config = await fetchServerConfig(port);
            sendResponse({ status: "success", data: config });
          } else {
            sendResponse({
              status: "error",
              message: "Server not available",
              data: _lastKnownConfig,
            });
          }
          break;

        case "getServerStatus": {
          const status = await getServerStatus();
          sendResponse({ status });
          break;
        }

        case "restartServer":
          // This logic remains untouched
          log("Received restart request");
          if (port) {
            try {
              const res = await fetch(
                "http://127.0.0.1:" + port + "/api/restart",
                {
                  method: "POST",
                }
              );
              if (res.ok) {
                sendResponse({ status: "success" });
                // Server will be gone, so trigger a new scan after a short delay
                setTimeout(() => findServerPort(true), 2000);
              } else {
                sendResponse({
                  status: "error",
                  message: "Server returned status " + res.status,
                });
              }
            } catch (e) {
              sendResponse({
                status: "error",
                message: (e as Error).message,
              });
            }
          } else {
            sendResponse({ status: "error", message: "Server not found" });
          }
          break;

        case "pauseDownload": {
          if (port) {
            try {
              const res = await fetch(
                "http://127.0.0.1:" +
                  port +
                  "/api/download/" +
                  message.downloadId +
                  "/pause",
                { method: "POST" }
              );
              const json = await res.json();
              sendResponse(json);
            } catch (e) {
              sendResponse({ status: "error", message: (e as Error).message });
            }
          } else {
            sendResponse({ status: "error", message: "Server not available" });
          }
          break;
        }

        case "resumeDownload": {
          if (port) {
            try {
              const res = await fetch(
                "http://127.0.0.1:" +
                  port +
                  "/api/download/" +
                  message.downloadId +
                  "/resume",
                { method: "POST" }
              );
              const json = await res.json();
              sendResponse(json);
            } catch (e) {
              sendResponse({ status: "error", message: (e as Error).message });
            }
          } else {
            sendResponse({ status: "error", message: "Server not available" });
          }
          break;
        }

        case "cancelDownload": {
          if (port) {
            try {
              const res = await fetch(
                "http://127.0.0.1:" +
                  port +
                  "/api/download/" +
                  message.downloadId +
                  "/cancel",
                { method: "POST" }
              );
              const json = await res.json();
              sendResponse(json);
            } catch (e) {
              sendResponse({ status: "error", message: (e as Error).message });
            }
          } else {
            sendResponse({ status: "error", message: "Server not available" });
          }
          break;
        }

        case "reorderQueue": {
          // Update the download queue order and refresh UI
          downloadQueue = message.queue;
          updateQueueUI();
          sendResponse({ status: "success" });
          break;
        }

        default:
          warn("Received unknown message type:", message.type);
          sendResponse({ status: "error", message: "Unknown message type" });
          break;
      }
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : "An unknown error occurred";
      error("Error processing message " + message.type + ":", errorMessage);
      sendResponse({ status: "error", message: errorMessage });
    }
  })();

  // Return true to indicate that sendResponse will be called asynchronously
  return true;
});

// Initialize background script when loaded (skip in Jest)
if (typeof process === "undefined" || !process.env.JEST_WORKER_ID) {
  // Set up initialization on service worker lifecycle events
  chrome.runtime.onInstalled.addListener(() => {
    initializeActionIconTheme();
    findServerPort(true).then((port) => {
      if (port !== null) {
        log("Discovered server on port " + port);
        // Broadcast server status after discovery
        broadcastServerStatus();
      } else {
        warn("Server port discovery failed after scanning range.");
        // Broadcast disconnected status
        broadcastServerStatus();
      }
    });

    // Set up periodic server status checks
    setInterval(broadcastServerStatus, _serverCheckInterval);

    // Initial server status check
    broadcastServerStatus();
  });
  chrome.runtime.onStartup.addListener(() => {
    findServerPort(true).then((port) => {
      if (port !== null) {
        log("Discovered server on port " + port);
        // Broadcast server status after discovery
        broadcastServerStatus();
      } else {
        warn("Server port discovery failed after scanning range.");
        // Broadcast disconnected status
        broadcastServerStatus();
      }
    });

    // Set up periodic server status checks
    setInterval(broadcastServerStatus, _serverCheckInterval);

    // Initial server status check
    broadcastServerStatus();
  });
}

// Export functions for testing
export {
  sendDownloadRequest,
  initializeActionIconTheme,
  findServerPort,
  checkServerStatus,
  fetchServerConfig,
  log,
  warn,
  error,
  debounce,
  applyThemeToActionIcon,
  actionIconPaths,
};

/**
 * Persist the download queue to storage
 */
export const persistQueue = async (): Promise<void> => {
  try {
    await chrome.storage.local.set({ [_queueStorageKey]: downloadQueue });
  } catch (e) {
    warn("Failed to persist download queue:", e);
  }
};

// Initialize persisted queue on startup
chrome.storage.local.get(_queueStorageKey, (res) => {
  downloadQueue = res[_queueStorageKey] || [];
  updateQueueUI();
});

// Initialize persisted active downloads on startup
chrome.storage.local.get("activeDownloads", (res) => {
  if (res.activeDownloads) {
    Object.assign(activeDownloads, res.activeDownloads);
    log(
      "Restored active downloads from storage:",
      Object.keys(activeDownloads).length
    );
    updateQueueUI();
  }
});
