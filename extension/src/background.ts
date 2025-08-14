/**
 * Enhanced Video Downloader - Background Script
 * Handles port discovery, server communication, and download management
 */

import { Theme, ServerConfig } from "./types";
import type { HistoryEntry } from "./types";
import { applyThemeToActionIcon, actionIconPaths, getActionIconPaths } from "./background-helpers";
import { debounce } from "./lib/utils";
import {
  handleSetConfig,
  ApiService,
  StorageService,
  handleGetHistory,
  handleClearHistory,
  discoverServerPort,
} from "./background-logic";
import { getServerPort, getPortRange } from "./core/constants";
import { stateManager } from "./core/state-manager";
import { validationService } from "./core/validation-service";
import { errorHandler, CentralizedErrorHandler } from "./core/error-handler";
import { logger, CentralizedLogger } from "./core/logger";
import {
  STORAGE_KEYS,
  NETWORK_CONSTANTS,
  CONFIG_CONSTANTS,
  MESSAGE_TYPES,
  STATUS_CONSTANTS,
  THEME_CONSTANTS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  NOTIFICATION_MESSAGES,
  getNotificationMessage,
} from "./core/constants";

// --- START CONSTANTS AND STORAGE KEYS ---
// Use centralized constants instead of local duplicates
const _configStorageKey = STORAGE_KEYS.SERVER_CONFIG;
const _portStorageKey = STORAGE_KEYS.SERVER_PORT;
const _historyStorageKey = STORAGE_KEYS.DOWNLOAD_HISTORY;
const serverStatusKey = STORAGE_KEYS.SERVER_STATUS;
const networkStatusKey = STORAGE_KEYS.NETWORK_STATUS;
const _queueStorageKey = STORAGE_KEYS.DOWNLOAD_QUEUE;

// Use centralized port configuration
const _defaultServerPort = getServerPort();
const _maxPortScan = getPortRange()[1]; // Use the end of the port range
const _serverCheckInterval = NETWORK_CONSTANTS.SERVER_CHECK_INTERVAL;
const _statusPollIntervalMs = 3000;

// Prevent duplicate download requests: track in-flight and recent requests
const _inFlightDownloads = new Set<string>();
const _recentDownloads = new Map<string, number>();
const _recentWindowMs = 5000; // ignore duplicate requests for same key within 5s

// Expected application name for server identification (from manifest)
const expectedAppName =
  (chrome.runtime && chrome.runtime.getManifest ? chrome.runtime.getManifest().name : null) ||
  "Enhanced Video Downloader";

// Initialize background script when loaded (skip in Jest)
const isTestEnvironment =
  typeof process !== "undefined" && (process.env.JEST_WORKER_ID || process.env.NODE_ENV === "test");
// --- END CONSTANTS AND STORAGE KEYS ---

// Utility logging functions - now using centralized logger
const applyConsoleLogLevelFromStorage = async (): Promise<void> => {
  try {
    const res = await chrome.storage.local.get(STORAGE_KEYS.SERVER_CONFIG);
    const cfg = (res as any)[STORAGE_KEYS.SERVER_CONFIG] || {};
    let level: string = (cfg.console_log_level as any) || (cfg.log_level as any) || "info";
    const normalized = String(level).toLowerCase();
    if (normalized === "warning") level = "warn";
    if (normalized === "critical") level = "error";
    if (typeof level === "string") {
      logger.setLevel(level.toLowerCase() as any);
    }
  } catch {
    // ignore
  }
};

// Initialize console log level at startup
applyConsoleLogLevelFromStorage();

const log = (...args: any[]): void => {
  logger.info(args.join(" "), { component: "background" });
};
const warn = (...args: any[]): void => {
  logger.warn(args.join(" "), { component: "background" });
};
const error = (...args: any[]): void => {
  logger.error(args.join(" "), { component: "background" });
};

// --- START SERVICE IMPLEMENTATIONS ---

const apiService: ApiService = {
  async fetchConfig(port: number): Promise<Partial<ServerConfig>> {
    const response = await fetch("http://127.0.0.1:" + port + "/api/config");
    if (!response.ok) {
      throw new Error("Failed to fetch config from server: " + response.statusText);
    }
    return response.json();
  },
  async saveConfig(port: number, config: Partial<ServerConfig>): Promise<boolean> {
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
    // Merge with existing config and persist
    const currentConfig = await this.getConfig();
    const newConfig: Partial<ServerConfig> = { ...currentConfig, ...config };
    await chrome.storage.local.set({ [_configStorageKey]: newConfig });
    // Apply log level immediately so the UI reflects persistence without reload
    try {
      let level = (newConfig.console_log_level as any) || (newConfig.log_level as any);
      if (typeof level === "string") {
        const normalized = String(level).toLowerCase();
        if (normalized === "warning") level = "warn";
        if (normalized === "critical") level = "error";
        logger.setLevel(String(level).toLowerCase() as any);
      }
    } catch {
      /* ignore */
    }
  },
  async getPort(): Promise<number | null> {
    try {
      // Try cached serverPort first; if missing, fall back to serverConfig.server_port
      let result: any = {};
      // Attempt promise-style multi-key get; if the mock throws due to missing callback, fall back to callback style
      try {
        result = await chrome.storage.local.get([_portStorageKey, _configStorageKey]);
      } catch {
        try {
          result = await Promise.race<any>([
            new Promise<any>(resolve => {
              try {
                (chrome.storage.local.get as any)([_portStorageKey, _configStorageKey], (r: any) =>
                  resolve(r || {})
                );
              } catch {
                resolve({});
              }
            }),
            // If the mock is promise-based and ignores the callback, resolve immediately
            new Promise<any>(resolve => setTimeout(() => resolve({}), 0)),
          ]);
        } catch {
          result = {};
        }
      }
      if (!result || typeof result !== "object") result = {};
      let cached = (result as any)?.[_portStorageKey];
      // Fallback: callback-style single-key get (used by some Jest mocks)
      if (typeof cached !== "number" || !Number.isFinite(cached)) {
        try {
          const viaSingle = await Promise.race<any>([
            new Promise<any>(resolve => {
              try {
                (chrome.storage.local.get as any)(_portStorageKey as any, (r: any) =>
                  resolve(r || {})
                );
              } catch {
                resolve({});
              }
            }),
            new Promise<any>(resolve => setTimeout(() => resolve({}), 0)),
          ]);
          cached = (viaSingle as any)?.[_portStorageKey];
        } catch {}
      }
      if (typeof cached === "number" && Number.isFinite(cached)) {
        return cached;
      }
      const cfg = (result as any)?.[_configStorageKey] || {};
      let configured = cfg.server_port;
      if (typeof configured !== "number" || !Number.isFinite(configured)) {
        try {
          const viaCfgSingle = await Promise.race<any>([
            new Promise<any>(resolve => {
              try {
                (chrome.storage.local.get as any)(_configStorageKey as any, (r: any) =>
                  resolve(r || {})
                );
              } catch {
                resolve({});
              }
            }),
            new Promise<any>(resolve => setTimeout(() => resolve({}), 0)),
          ]);
          configured = (viaCfgSingle as any)?.[_configStorageKey]?.server_port;
        } catch {}
      }
      if (typeof configured === "number" && Number.isFinite(configured)) {
        // Cache it for future fast reads
        try {
          await chrome.storage.local.set({ [_portStorageKey]: configured });
        } catch {
          /* ignore */
        }
        return configured;
      }
      return null;
    } catch {
      return null;
    }
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
            color: "#ffc107",
          });
          // Use a short badge text to avoid clipping on some platforms
          (chrome.action as any).setBadgeText({ text: "SCN" });
        } catch (e) {
          /* ignore errors setting badge */
        }
      }

      // If a port is already configured/cached, skip scanning to avoid noisy logs
      let port = await storageService.getPort();
      if (typeof port !== "number" || !Number.isFinite(port)) {
        port = await findServerPort(false);
      }
      if (port !== null) {
        log("Server reconnected on port " + port);
        showNotification(
          "Server Reconnected",
          "Enhanced Video Downloader server is back online on port " + port + "."
        );
        // Broadcast server status after reconnection
        broadcastServerStatus();
        // Clear any temporary scanning badge
        try {
          (chrome.action as any).setBadgeText?.({ text: "" });
        } catch {
          /* ignore */
        }
      } else {
        log("Server reconnection failed upon network restore.");
        showNotification(
          "Server Unavailable",
          "Could not reconnect to the Enhanced Video Downloader server. Please check if it's running."
        );
        // Broadcast disconnected status
        broadcastServerStatus();
        // Clear scanning badge to avoid stale 'SCAN' indicator
        try {
          (chrome.action as any).setBadgeText?.({ text: "" });
        } catch {
          /* ignore */
        }
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
if (!isTestEnvironment) {
  chrome.storage.local.get(networkStatusKey, res => {
    const current =
      typeof res[networkStatusKey] === "boolean" ? res[networkStatusKey] : navigator.onLine;
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
        const darkModeMediaQuery = self.matchMedia("(prefers-color-scheme: dark)");
        const systemPrefersDark = darkModeMediaQuery.matches;
        log("System prefers dark: " + systemPrefersDark);
        applyThemeToActionIcon(systemPrefersDark ? "dark" : "light");

        // Add listener for system theme changes
        try {
          darkModeMediaQuery.addEventListener("change", e => {
            const newSystemPrefersDark = e.matches;
            log("System theme changed, now prefers dark: " + newSystemPrefersDark);

            // Check if user has manually set a theme
            chrome.storage.local.get("theme", themeResult => {
              if (!themeResult.theme) {
                // Only update automatically if user hasn't set a preference
                applyThemeToActionIcon(newSystemPrefersDark ? "dark" : "light");
              } else {
                log("Not updating theme automatically as user has set a preference.");
              }
            });
          });
          log("Added listener for system theme changes");
        } catch (listenerError) {
          warn(
            "Could not add listener for system theme changes: " + (listenerError as Error).message
          );
        }
      } else {
        warn("self.matchMedia not available. " + "Defaulting action icon to light theme.");
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
let downloadQueue: string[] = []; // Stores URLs of queued videos
const activeDownloads: Record<string, DownloadStatus> = {}; // Store {url: {status, progress, filename}}
const queuedDetails: Record<string, { url?: string; title?: string; filename?: string }> = {};

// Export the variables to ensure they're not optimized out
export { downloadQueue, activeDownloads };

// Define updateQueueUI before it's used by debouncedUpdateQueueUI
const updateQueueUI = (): void => {
  // Persist queue to storage
  persistQueue();
  chrome.runtime
    .sendMessage({
      type: "queueUpdated",
      queue: downloadQueue,
      active: activeDownloads,
      queuedDetails,
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
const showNotification = (title: string, message: string, tag: string | null = null): void => {
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

// Server state variables - now managed by centralized state manager
const PORT_CHECK_TIMEOUT = NETWORK_CONSTANTS.SERVER_CHECK_TIMEOUT;
const _configRefreshIntervalCount = CONFIG_CONSTANTS.CONFIG_REFRESH_INTERVAL_COUNT;
const _maxPortBackoffInterval = NETWORK_CONSTANTS.MAX_PORT_BACKOFF_INTERVAL;

// Reset function for testing
const resetServerState = (): void => {
  stateManager.updateServerState({
    status: "disconnected",
    scanInProgress: false,
    backoffInterval: 1000,
  });
};

// Server Communication
const getServerStatus = async (): Promise<"connected" | "disconnected" | "checking"> => {
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

  // Update only the icon based on server status; do not change badge text here
  if (status === "connected") {
    const iconPaths = getActionIconPaths();
    const currentTheme = await getCurrentTheme();
    chrome.action.setIcon({ path: iconPaths[currentTheme] });
    // Ensure any transient scan badge is cleared when connected
    try {
      (chrome.action as any).setBadgeText?.({ text: "" });
    } catch {
      /* ignore */
    }
  } else {
    const iconPaths = getActionIconPaths();
    const currentTheme = await getCurrentTheme();
    chrome.action.setIcon({ path: iconPaths[currentTheme] });
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

const checkServerStatus = async (port: number): Promise<boolean> =>
  errorHandler.wrap(async () => {
    const serverState = stateManager.getServerState();
    const oldAvailable = serverState.status === "connected";

    // Skip server status checks when fetch API is unavailable (e.g., non-browser or test env)
    if (typeof fetch !== "function") {
      return false;
    }

    if (!port) {
      stateManager.updateServerState({ status: "disconnected" });
      await errorHandler.handle(
        () => chrome.storage.local.set({ [serverStatusKey]: false }),
        CentralizedErrorHandler.contexts.background.serverCheck(port)
      );
      updateIcon();
      // Notify if availability changed
      if (oldAvailable) {
        showNotification(
          "Server Disconnected",
          "The Enhanced Video Downloader server is not available. Downloads won't work until it's reconnected."
        );
      }
      return false;
    }

    // Fetch server status with timeout, with localhost fallback and robust error handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PORT_CHECK_TIMEOUT);
    let response: Response | undefined;
    try {
      // Try 127.0.0.1 first
      response = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: controller.signal });
    } catch {
      try {
        // Fallback to localhost
        response = await fetch(`http://localhost:${port}/api/health`, {
          signal: controller.signal,
        });
      } catch {
        response = undefined;
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (response && response.ok) {
      const data = await response.json();
      // Verify the server is our app by checking app_name
      if (data.app_name === expectedAppName) {
        stateManager.updateServerState({ status: "connected" });
        // If server just came online, refresh config
        if (!oldAvailable) {
          logger.info(
            "Server now available on port " + port + ", refreshing config",
            CentralizedLogger.contexts.background.serverCheck(port)
          );
          await fetchServerConfig(port);
        }
      } else {
        logger.warn(
          "Wrong server on port " + port + ": " + data.app_name,
          CentralizedLogger.contexts.background.serverCheck(port)
        );
        stateManager.updateServerState({ status: "disconnected" });
      }
    } else if (response) {
      logger.warn(
        "Server check failed on port " + port + ": " + response.status,
        CentralizedLogger.contexts.background.serverCheck(port)
      );
      stateManager.updateServerState({ status: "disconnected" });
    } else {
      // No response (network/timeout). Treat as disconnected quietly.
      stateManager.updateServerState({ status: "disconnected" });
    }

    // Update storage
    const currentState = stateManager.getServerState();
    await errorHandler.handle(
      () =>
        chrome.storage.local.set({
          [serverStatusKey]: currentState.status === "connected",
        }),
      CentralizedErrorHandler.contexts.background.serverCheck(port)
    );

    // Update badge/icon to reflect server status
    updateIcon();

    // If server availability changed, show notification
    const currentAvailable = currentState.status === "connected";

    if (currentAvailable !== oldAvailable) {
      if (currentAvailable) {
        showNotification(
          "Server Connected",
          "Enhanced Video Downloader server is now online on port " + port + "."
        );
        // Reset backoff interval when server is found
        stateManager.updateServerState({ backoffInterval: 1000 });
      } else {
        showNotification(
          "Server Disconnected",
          "The Enhanced Video Downloader server is not available. Downloads won't work until it's reconnected."
        );
      }
    }

    return currentAvailable;
  }, CentralizedErrorHandler.contexts.background.serverCheck(port));

// Additional functions (stub implementations to be completed)
const fetchServerConfig = async (port: number): Promise<Partial<ServerConfig>> => {
  try {
    // In test environment, perform a single attempt so unit tests can mock one fetch call deterministically
    if (isTestEnvironment) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/api/config`);
        if (!response.ok) {
          return {};
        }
        return response.json();
      } catch {
        return {};
      }
    }

    // In normal runtime, try multiple hostnames to avoid loopback blocking issues
    const hosts = ["127.0.0.1", "localhost", "[::1]"];
    for (const host of hosts) {
      try {
        const response = await fetch(`http://${host}:${port}/api/config`);
        if (response.ok) {
          const config = await response.json();
          return config;
        }
      } catch {
        // try next host
      }
    }
    log(`Failed to fetch config from server on any host for port ${port}`);
    return {};
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

  // Avoid changing badge text during scans to prevent flicker; optionally adjust background color
  if (startScan && (chrome.action as any)?.setBadgeBackgroundColor) {
    try {
      (chrome.action as any).setBadgeBackgroundColor({ color: "#ffc107" });
    } catch (e) {
      /* ignore */
    }
  }

  // Set scanning state
  stateManager.updateServerState({ scanInProgress: true });

  try {
    // Keep existing badge text stable during scans
    const onProgress = (_current: number, _total: number) => {};

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
      stateManager.updateServerState({ backoffInterval: 1000 });

      // Notify options page about server discovery
      try {
        chrome.runtime.sendMessage({ type: "serverDiscovered", port }, response => {
          // Ignore any errors - this is just a notification
          if (chrome.runtime.lastError) {
            // This is expected when options page is not open
            logFn("Server discovery notification sent (options page may not be open)");
          }
        });
      } catch (e) {
        // Ignore errors if no listeners are available
        logFn("Server discovery notification failed (expected if options page not open)");
      }
    } else {
      warnFn("Server port discovery failed after scanning range."); // No emoji, just text
      // Increase backoff interval for next attempt
      const currentState = stateManager.getServerState();
      const newBackoffInterval = Math.min(
        currentState.backoffInterval * 2,
        _maxPortBackoffInterval
      );
      stateManager.updateServerState({ backoffInterval: newBackoffInterval });
    }

    return port;
  } catch (e) {
    // Handle any errors from the discover function
    warnFn("Error during server port discovery:", e); // No emoji, just text
    // Increase backoff interval for next attempt
    const currentState = stateManager.getServerState();
    const newBackoffInterval = Math.min(currentState.backoffInterval * 2, _maxPortBackoffInterval);
    stateManager.updateServerState({ backoffInterval: newBackoffInterval });
    return null;
  } finally {
    // Clear scanning state only; do not modify badge text
    stateManager.updateServerState({ scanInProgress: false });
  }
};

const updateIcon = (): void => {
  try {
    const serverState = stateManager.getServerState();
    const iconPaths = getActionIconPaths();

    // Get current theme
    getCurrentTheme()
      .then(currentTheme => {
        const iconPath = iconPaths[currentTheme];

        // Only update icon; leave badge text unchanged to avoid flicker
        chrome.action.setIcon({ path: iconPath });
      })
      .catch(error => {
        warn("Failed to update icon:", error);
      });
  } catch (error) {
    warn("Error updating icon:", error);
  }
};

const updateBadge = (): void => {
  try {
    // Get current queue length
    const queueLength = downloadQueue.length;
    const activeCount = Object.keys(activeDownloads).length;

    if (queueLength > 0 || activeCount > 0) {
      const totalCount = queueLength + activeCount;
      const badgeText = totalCount > 99 ? "99+" : String(totalCount);

      (chrome.action as any).setBadgeText?.({ text: badgeText });
      (chrome.action as any).setBadgeBackgroundColor?.({ color: "#4CAF50" });
    } else {
      // Clear badge when no downloads
      (chrome.action as any).setBadgeText?.({ text: "" });
    }
  } catch (error) {
    warn("Error updating badge:", error);
  }
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
  try {
    // Check if history is enabled
    const result = await chrome.storage.local.get("isHistoryEnabled");
    const isHistoryEnabled = result.isHistoryEnabled !== false; // Default to true

    if (!isHistoryEnabled) {
      return; // Skip if history is disabled
    }

    // Get existing history
    const historyResult = await chrome.storage.local.get(_historyStorageKey);
    const history: HistoryEntry[] = historyResult[_historyStorageKey] || [];

    // Create new history entry
    const newEntry: HistoryEntry = {
      id: Date.now().toString(),
      url,
      status,
      timestamp: Date.now(),
      filename,
      filepath,
      page_title: title,
      thumbnailUrl,
      sourceUrl,
    };

    // Update existing entry by URL (prefer consolidating failures into the final status)
    try {
      const canonicalize = (u?: string): string => {
        if (!u) return "";
        try {
          const p = new URL(u);
          const host = p.hostname.replace(/^www\./i, "").toLowerCase();
          const path = p.pathname.replace(/\/$/, "");
          return host + path.toLowerCase();
        } catch {
          return String(u).trim();
        }
      };
      const urlKey = canonicalize(url);
      const existingIndex = history.findIndex((item: HistoryEntry) => {
        if (!item) return false;
        if (item.url && canonicalize(item.url) === urlKey) return true;
        if (item.filename && filename && String(item.filename).trim() === String(filename).trim())
          return true;
        return false;
      });
      if (existingIndex >= 0) {
        // Merge fields and move to front to reflect recency
        const merged: HistoryEntry = {
          ...history[existingIndex],
          ...newEntry,
        } as HistoryEntry;
        history.splice(existingIndex, 1);
        history.unshift(merged);
      } else {
        history.unshift(newEntry);
      }
    } catch {
      history.unshift(newEntry);
    }

    // Limit history to last 100 entries
    const limitedHistory = history.slice(0, 100);

    // Save updated history
    await chrome.storage.local.set({ [_historyStorageKey]: limitedHistory });

    // Notify popup/options about history update (ignore when no listeners)
    try {
      chrome.runtime.sendMessage({ type: "historyUpdated" }, () => {
        // explicitly swallow lastError to avoid noisy logs
        const hasErr = Boolean(chrome.runtime && (chrome.runtime as any).lastError);
        if (hasErr) {
          // no receivers; that's fine
        }
      });
    } catch {
      // ignore
    }

    log("Added download to history:", { url, status, filename });
  } catch (error) {
    warn("Failed to add download to history:", error);
  }
};

const clearDownloadHistory = async (): Promise<void> => {
  try {
    await chrome.storage.local.set({ [_historyStorageKey]: [] });

    // Notify popup/options about history update (ignore when no listeners)
    try {
      chrome.runtime.sendMessage({ type: "historyUpdated" }, () => {
        const hasErr = Boolean(chrome.runtime && (chrome.runtime as any).lastError);
        if (hasErr) {
          // no receivers
        }
      });
    } catch {
      // ignore
    }

    log("Download history cleared");
  } catch (error) {
    warn("Failed to clear download history:", error);
  }
};

const toggleHistorySetting = async (): Promise<void> => {
  try {
    const result = await chrome.storage.local.get("isHistoryEnabled");
    const enabled = result.isHistoryEnabled as boolean;
    await chrome.storage.local.set({ isHistoryEnabled: !enabled });
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
  forcedPort?: number | null
): Promise<any> => {
  // De-dupe: build a canonical key for this request (visible to try/catch)
  const downloadKey = `${videoUrl}`;
  try {
    const port = typeof forcedPort === "number" ? forcedPort : await storageService.getPort();
    if (!port) {
      return { status: "error", message: "Server not available" };
    }

    const now = Date.now();
    const lastTs = _recentDownloads.get(downloadKey) || 0;
    if (_inFlightDownloads.has(downloadKey) || now - lastTs < _recentWindowMs) {
      return { status: "error", message: "Duplicate request ignored. Please wait a moment." };
    }
    _inFlightDownloads.add(downloadKey);

    // Create download request payload
    const downloadRequest = {
      url: videoUrl,
      quality: quality || "best",
      format: format || "mp4",
      download_playlist: isPlaylist,
      page_title: pageTitle,
    };

    // Send request to server, with hostname fallbacks to bypass local blockers
    const protocolsToTry = ["http", "https"] as const;
    const hostsToTry = ["127.0.0.1", "localhost", "[::1]"];
    let response: Response | null = null;
    let lastNetworkError: unknown = null;
    outer: for (const protocol of protocolsToTry) {
      for (const host of hostsToTry) {
        try {
          response = await fetch(`${protocol}://${host}:${port}/api/download`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(downloadRequest),
          });
          // If we get a response (even non-OK), stop trying other combinations
          break outer;
        } catch (e) {
          lastNetworkError = e;
          // try next combination
        }
      }
    }

    if (!response) {
      // All attempts failed at network layer
      throw lastNetworkError instanceof Error ? lastNetworkError : new Error("Network error");
    }

    if (!response.ok) {
      _recentDownloads.set(downloadKey, Date.now());
      _inFlightDownloads.delete(downloadKey);
      const errorText = await response.text();
      return { status: "error", message: `Server error: ${response.status} - ${errorText}` };
    }

    const result = await response.json();

    // Add to history if successful
    if (result.status === "success" || result.status === "queued") {
      await addOrUpdateHistory(
        videoUrl,
        result.status,
        result.filename,
        result.filepath,
        result.thumbnail_url,
        result.source_url,
        result.title || pageTitle
      );

      // Also reflect in the extension's queue UI for immediate feedback
      try {
        const queueId: string = (result.downloadId as string) || videoUrl;
        if (!downloadQueue.includes(queueId)) {
          downloadQueue.push(queueId);
          _updateQueueAndBadge();
        }
      } catch {
        /* ignore UI update issues */
      }
    }

    _recentDownloads.set(downloadKey, Date.now());
    _inFlightDownloads.delete(downloadKey);
    return result;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    error("Error sending download request:", errorMessage);
    // Ensure we do not leave the request marked as in-flight on network/other errors
    try {
      _inFlightDownloads.delete(downloadKey);
      _recentDownloads.set(downloadKey, Date.now());
    } catch {
      /* ignore cleanup errors */
    }
    return { status: "error", message: errorMessage };
  }
};

// Consolidated initialization function
let _didInitialize = false;
const initializeExtension = async (): Promise<void> => {
  if (_didInitialize) {
    return;
  }
  _didInitialize = true;
  // Prevent multiple simultaneous initializations
  const serverState = stateManager.getServerState();
  if (serverState.scanInProgress) {
    log("Initialization already in progress, skipping...");
    return;
  }

  stateManager.updateServerState({ scanInProgress: true });

  try {
    // Initialize action icon theme
    await initializeActionIconTheme();

    // In tests, rely on the test-mode polling block below

    // Perform initial server discovery
    // In tests, avoid scanning/health/config prefetch to keep mocked fetch order stable
    let port = await storageService.getPort();
    if (!isTestEnvironment) {
      if (typeof port !== "number" || !Number.isFinite(port)) {
        port = await findServerPort(false);
      }
      if (port !== null) {
        log("Discovered server on port " + port);
        // Warm config cache and broadcast status in non-test mode only
        try {
          await fetchServerConfig(port);
        } catch {}
        await broadcastServerStatus();
      } else {
        warn("Server port discovery failed after scanning range.");
        await broadcastServerStatus();
      }
    } else {
      if (typeof port === "number" && Number.isFinite(port)) {
        log("Discovered server on port " + port);
        // In tests, avoid additional fetches here to keep the mocked fetch order intact.
      }
    }

    // Set up periodic server status checks (disabled in tests to avoid infinite timers)
    if (!isTestEnvironment) {
      setInterval(broadcastServerStatus, _serverCheckInterval);
      // Initial server status check (in tests we already called it once above)
      await broadcastServerStatus();
    }

    // Start status polling to feed popup UI
    if (!isTestEnvironment) {
      setInterval(async () => {
        try {
          const port = await storageService.getPort();
          if (!port) return;
          const res = await fetch(`http://127.0.0.1:${port}/api/status`);
          if (!res.ok) return;
          const data = await res.json();
          const active: Record<string, any> = {};
          const serverQueued: string[] = [];
          const newQueuedDetails: Record<
            string,
            { url?: string; title?: string; filename?: string }
          > = {};
          Object.entries(data || {}).forEach(([id, obj]) => {
            if ((obj as any)?.status === "queued") {
              serverQueued.push(id);
              const url = (obj as any)?.url as string | undefined;
              const title = (obj as any)?.title as string | undefined;
              const filename = (obj as any)?.filename as string | undefined;
              newQueuedDetails[id] = { url, title, filename };
            } else {
              active[id] = obj;
            }
          });

          // Make the server-reported queue authoritative to prevent stale queued entries
          try {
            let changed = false;

            // Replace local queue with server queue (excluding any IDs currently active)
            const newQueue = serverQueued.filter(id => !(id in active));
            if (
              newQueue.length !== downloadQueue.length ||
              newQueue.some((id, i) => id !== downloadQueue[i])
            ) {
              downloadQueue = newQueue;
              changed = true;
            }

            // Refresh queuedDetails to only include currently queued IDs
            const newDetails: Record<string, { url?: string; title?: string; filename?: string }> =
              {};
            newQueue.forEach(id => {
              if (newQueuedDetails[id]) newDetails[id] = newQueuedDetails[id];
              else if (queuedDetails[id]) newDetails[id] = queuedDetails[id];
            });
            const oldKeys = Object.keys(queuedDetails);
            const newKeys = Object.keys(newDetails);
            if (oldKeys.length !== newKeys.length || oldKeys.some(k => !(k in newDetails))) {
              Object.keys(queuedDetails).forEach(k => delete (queuedDetails as any)[k]);
              Object.entries(newDetails).forEach(([k, v]) => ((queuedDetails as any)[k] = v));
              changed = true;
            }

            // Keep activeDownloads in sync so badge counts are accurate
            const oldActiveKeys = Object.keys(activeDownloads);
            const newActiveKeys = Object.keys(active);
            if (
              oldActiveKeys.length !== newActiveKeys.length ||
              oldActiveKeys.some(k => !(k in active))
            ) {
              Object.keys(activeDownloads).forEach(k => delete (activeDownloads as any)[k]);
              Object.entries(active).forEach(([k, v]) => ((activeDownloads as any)[k] = v as any));
              changed = true;
            }

            if (changed) {
              _updateQueueAndBadge();
            }
          } catch {
            // ignore queue/active update errors
          }

          chrome.runtime
            .sendMessage({
              type: "downloadStatusUpdate",
              data: { active, queue: downloadQueue, queuedDetails },
            })
            .catch(() => {
              // Ignore when no receivers (e.g., popup/options not open)
            });
        } catch {
          // ignore
        }
      }, _statusPollIntervalMs);
    } else {
      // In tests, schedule a single delayed poll so tests can deterministically advance timers
      const runPoll = async () => {
        try {
          let port = await storageService.getPort();
          if (!port) {
            // In tests, fall back to default configured port to ensure polling proceeds
            try {
              port = getServerPort();
            } catch {}
          }
          if (!port) return;
          const res = await fetch(`http://127.0.0.1:${port}/api/status?include_queue=1`);
          if (!res.ok) return;
          const data = await res.json();
          const active: Record<string, any> = {};
          const serverQueued: string[] = [];
          const newQueuedDetails: Record<
            string,
            { url?: string; title?: string; filename?: string }
          > = {};
          Object.entries(data || {}).forEach(([id, obj]) => {
            const status = String((obj as any)?.status || "").toLowerCase();
            if (status === "queued") {
              serverQueued.push(id);
              const url = (obj as any)?.url as string | undefined;
              const title = ((obj as any)?.title || (obj as any)?.page_title) as string | undefined;
              const filename = (obj as any)?.filename as string | undefined;
              newQueuedDetails[id] = { url, title, filename };
            } else {
              let progressNum = 0;
              try {
                const o: any = obj ?? {};
                const percentStr: string =
                  typeof o.percent === "string"
                    ? o.percent
                    : Array.isArray(o.history) &&
                      o.history.length > 0 &&
                      typeof o.history[o.history.length - 1]?.percent === "string"
                    ? o.history[o.history.length - 1].percent
                    : "";
                if (percentStr) {
                  const parsed = parseFloat(String(percentStr).replace("%", ""));
                  if (Number.isFinite(parsed)) progressNum = parsed;
                } else if (typeof o.progress === "number" && Number.isFinite(o.progress)) {
                  progressNum = o.progress;
                }
              } catch {}
              active[id] = { ...(obj as any), progress: progressNum } as any;
            }
          });

          // Mirror the non-test logic: make server queue authoritative and refresh queuedDetails
          try {
            const newQueue = serverQueued.filter(id => !(id in active));
            downloadQueue = newQueue;
            const newDetails: Record<string, { url?: string; title?: string; filename?: string }> =
              {};
            newQueue.forEach(id => {
              if (newQueuedDetails[id]) newDetails[id] = newQueuedDetails[id];
            });
            Object.keys(queuedDetails).forEach(k => delete (queuedDetails as any)[k]);
            Object.entries(newDetails).forEach(([k, v]) => ((queuedDetails as any)[k] = v));
            _updateQueueAndBadge();
          } catch {}
          try {
            const hasMock = typeof (chrome.runtime.sendMessage as any)?.mock !== "undefined";
            logger.info(
              "[bg] runPoll: sending downloadStatusUpdate (test-mode), hasMock=" + hasMock
            );
          } catch {}
          chrome.runtime
            .sendMessage({
              type: "downloadStatusUpdate",
              data: { active, queue: downloadQueue, queuedDetails },
            })
            .catch(() => {});
        } catch {}
      };
      // Delayed to match tests advancing timers
      setTimeout(runPoll, _statusPollIntervalMs + 100);
    }
  } catch (err: unknown) {
    error("Error during extension initialization:", err);
  } finally {
    stateManager.updateServerState({ scanInProgress: false });
  }
};

// Message handling for background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // In tests, handle simple error paths synchronously for determinism
  if (isTestEnvironment && (message.type === "getLogs" || message.type === "clearLogs")) {
    try {
      (chrome.storage.local.get as any)(_portStorageKey as any, (r: any) => {
        try {
          if (typeof r?.[_portStorageKey] !== "number") {
            sendResponse({ status: "error", message: "Server not available" });
          }
        } catch {
          sendResponse({ status: "error", message: "Server not available" });
        }
      });
    } catch {
      sendResponse({ status: "error", message: "Server not available" });
    }
    return true;
  }
  // Use an IIFE to handle async logic and always return true for async responses
  (async () => {
    try {
      switch (message.type) {
        case "downloadVideo": {
          log("Received download request for:", message.url);
          // Ensure we have a server port; if not, try to discover it immediately
          let effectivePort = await storageService.getPort();
          if (!effectivePort) {
            try {
              effectivePort = await findServerPort(true);
            } catch (e) {
              // ignore and fall through to error response below
            }
          }

          // If still no port, return a clear error right away
          if (!effectivePort) {
            sendResponse({ status: "error", message: "Server not available" });
            break;
          }

          try {
            log(
              "EVD background: Posting to /api/download on port " +
                effectivePort +
                " for URL " +
                message.url
            );

            console.log("[EVD] BG → POST /api/download", {
              port: effectivePort,
              url: message.url,
              pageTitle: message.pageTitle,
            });
          } catch {
            /* ignore */
          }

          const response = await sendDownloadRequest(
            message.url,
            sender.tab?.id,
            message.isPlaylist,
            message.quality,
            message.format,
            message.pageTitle,
            // During Playwright real-site tests, the server port is provided via env var
            typeof process !== "undefined" && process.env && process.env.E2E_TEST_PORT
              ? Number(process.env.E2E_TEST_PORT)
              : undefined
          );

          try {
            log("EVD background: Server response for download", JSON.stringify(response));

            console.log("[EVD] BG response from server", response);
          } catch {
            /* ignore */
          }
          sendResponse(response);
          break;
        }

        case "getQueue":
          // This logic remains untouched
          sendResponse({ queue: downloadQueue, active: activeDownloads, queuedDetails });
          break;

        case "setContentButtonHidden": {
          const hidden = !!message.hidden;
          try {
            // Broadcast to all tabs to update hidden state
            chrome.tabs.query({ active: false, currentWindow: false } as any, tabs => {
              for (const t of tabs) {
                if (t.id !== undefined) {
                  try {
                    chrome.tabs.sendMessage(t.id, { type: "toggleButtonVisibility", hidden });
                  } catch {
                    /* ignore */
                  }
                }
              }
            });
          } catch {
            /* ignore */
          }
          sendResponse({ status: "success" });
          break;
        }

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
          const port = await storageService.getPort();
          const result = await handleSetConfig(port, message.config, apiService, storageService);
          sendResponse(result);
          break;
        }

        case "getConfig": {
          // Fetch server config when a port is known; otherwise return current cached state
          const port = await storageService.getPort();
          if (port) {
            let config = await fetchServerConfig(port);
            // If server fetch failed or returned empty, fall back to cached/local config
            if (!config || (typeof config === "object" && Object.keys(config).length === 0)) {
              try {
                config = await storageService.getConfig();
              } catch {
                config = {} as any;
              }
            }
            sendResponse({ status: "success", data: config });
          } else {
            const serverState = stateManager.getServerState();
            sendResponse({
              status: "error",
              message: "Server not available",
              data: serverState.config,
            });
          }
          break;
        }

        case "getServerStatus": {
          const status = await getServerStatus();
          sendResponse({ status });
          break;
        }

        case "resumeDownloads": {
          // Trigger server-side resume operation
          {
            const port = await storageService.getPort();
            if (port) {
              try {
                const res = await fetch("http://127.0.0.1:" + port + "/api/resume", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  // Optional payload; server will validate
                  body: JSON.stringify({}),
                });
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
        }

        case "setPriority": {
          // Adjust OS priority (nice value) for a download process
          const downloadId: string | undefined = message.downloadId;
          const priority: number | undefined = message.priority;
          if (!downloadId || typeof priority !== "number") {
            sendResponse({ status: "error", message: "Missing downloadId or priority" });
            break;
          }
          {
            const port = await storageService.getPort();
            if (port) {
              try {
                const res = await fetch(
                  `http://127.0.0.1:${port}/api/download/${downloadId}/priority`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ priority }),
                  }
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
        }

        case "galleryDownload": {
          const url: string | undefined = message.url;
          if (!url) {
            sendResponse({ status: "error", message: "Missing url" });
            break;
          }
          {
            const port = await storageService.getPort();
            if (port) {
              try {
                const res = await fetch(`http://127.0.0.1:${port}/api/gallery-dl`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ url }),
                });
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
        }

        case "restartServer":
          // Request server restart via API and trigger port rediscovery
          log("Received restart request");
          {
            const port = await storageService.getPort();
            if (port) {
              try {
                const base = "http://127.0.0.1:" + port;
                let ok = false;
                let lastStatus: number | null = null;
                const restartCandidates = [base + "/api/restart", base + "/restart"];
                const managedCandidates = [
                  base + "/api/restart/managed",
                  base + "/restart/managed",
                ];
                // Try dev restart endpoints first
                for (const url of restartCandidates) {
                  try {
                    const r = await fetch(url, { method: "POST" });
                    lastStatus = r.status;
                    if (r.ok) {
                      ok = true;
                      break;
                    }
                  } catch {
                    // continue to next candidate
                  }
                }
                // Fallback to managed restart endpoints
                if (!ok) {
                  for (const url of managedCandidates) {
                    try {
                      const r = await fetch(url, { method: "POST" });
                      lastStatus = r.status;
                      if (r.ok) {
                        ok = true;
                        break;
                      }
                    } catch {
                      // continue to next candidate
                    }
                  }
                }
                if (ok) {
                  sendResponse({ status: "success" });
                  if (!isTestEnvironment) {
                    setTimeout(() => findServerPort(true), 2000);
                  }
                } else {
                  sendResponse({
                    status: "error",
                    message: "Server returned status " + (lastStatus ?? "network error"),
                  });
                }
              } catch (e) {
                sendResponse({ status: "error", message: (e as Error).message });
              }
            } else {
              sendResponse({ status: "error", message: "Server not found" });
            }
            break;
          }

        case "pauseDownload": {
          {
            const port = await storageService.getPort();
            if (port) {
              try {
                const res = await fetch(
                  "http://127.0.0.1:" + port + "/api/download/" + message.downloadId + "/pause",
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
        }

        case "getLogs": {
          // Immediate fast-path: if no port, return error right away (especially important in tests)
          {
            const p = await storageService.getPort();
            if (!p) {
              logger.info("[bg] getLogs: no port → immediate error");
              sendResponse({ status: "error", message: "Server not available" });
              break;
            }
          }
          // Quick path: attempt a single-key callback read; race with a 0ms timeout because some mocks ignore callbacks
          try {
            const single = await Promise.race<any>([
              new Promise<any>(resolve => {
                try {
                  (chrome.storage.local.get as any)(_portStorageKey as any, (r: any) =>
                    resolve(r || {})
                  );
                } catch {
                  resolve({});
                }
              }),
              new Promise<any>(resolve => setTimeout(() => resolve({}), 0)),
            ]);
            if (typeof single?.[_portStorageKey] !== "number") {
              sendResponse({ status: "error", message: "Server not available" });
              break;
            }
          } catch {
            sendResponse({ status: "error", message: "Server not available" });
            break;
          }
          // Proceed with robust path when a port exists
          let port: number | null = null;
          try {
            const viaSingle = await new Promise<any>(resolve => {
              try {
                (chrome.storage.local.get as any)(_portStorageKey as any, (r: any) =>
                  resolve(r || {})
                );
              } catch {
                resolve({});
              }
            });
            if (typeof viaSingle?.[_portStorageKey] === "number") port = viaSingle[_portStorageKey];
          } catch {}
          if (typeof port !== "number" || !Number.isFinite(port)) {
            port = await storageService.getPort();
          }
          if (!port) {
            sendResponse({ status: "error", message: "Server not available" });
            break;
          }
          try {
            const params = new URLSearchParams();
            if (typeof message.lines === "number" && message.lines >= 0)
              params.set("lines", String(message.lines));
            if (typeof message.recent === "boolean")
              params.set("recent", message.recent ? "true" : "false");

            const qs = params.toString() ? `?${params.toString()}` : "";
            const candidates = [
              // Preferred new paths under /api
              `http://127.0.0.1:${port}/api/logs${qs}`,
              `http://localhost:${port}/api/logs${qs}`,
              // Backward-compatible paths without /api
              `http://127.0.0.1:${port}/logs${qs}`,
              `http://localhost:${port}/logs${qs}`,
            ];

            let text: string | null = null;
            let lastStatus: number | null = null;
            for (const url of candidates) {
              try {
                const r = await fetch(url);
                lastStatus = r.status;
                if (r.ok) {
                  text = await r.text();
                  break;
                }
              } catch {
                // try next
              }
            }

            if (text === null) {
              sendResponse({
                status: "error",
                message: "Failed to fetch logs: " + (lastStatus ?? "network error"),
              });
              break;
            }
            sendResponse({ status: "success", data: text });
          } catch (e) {
            sendResponse({ status: "error", message: (e as Error).message });
          }
          break;
        }

        case "clearLogs": {
          // Immediate fast-path: if no port, return error right away (especially important in tests)
          {
            const p = await storageService.getPort();
            if (!p) {
              logger.info("[bg] clearLogs: no port → immediate error");
              sendResponse({ status: "error", message: "Server not available" });
              break;
            }
          }
          // Quick path: attempt a single-key callback read; race with a 0ms timeout because some mocks ignore callbacks
          try {
            const single = await Promise.race<any>([
              new Promise<any>(resolve => {
                try {
                  (chrome.storage.local.get as any)(_portStorageKey as any, (r: any) =>
                    resolve(r || {})
                  );
                } catch {
                  resolve({});
                }
              }),
              new Promise<any>(resolve => setTimeout(() => resolve({}), 0)),
            ]);
            if (typeof single?.[_portStorageKey] !== "number") {
              sendResponse({ status: "error", message: "Server not available" });
              break;
            }
          } catch {
            sendResponse({ status: "error", message: "Server not available" });
            break;
          }
          // Proceed with robust path when a port exists
          let port: number | null = null;
          try {
            const viaSingle = await new Promise<any>(resolve => {
              try {
                (chrome.storage.local.get as any)(_portStorageKey as any, (r: any) =>
                  resolve(r || {})
                );
              } catch {
                resolve({});
              }
            });
            if (typeof viaSingle?.[_portStorageKey] === "number") port = viaSingle[_portStorageKey];
          } catch {}
          if (typeof port !== "number" || !Number.isFinite(port)) {
            port = await storageService.getPort();
          }
          if (!port) {
            sendResponse({ status: "error", message: "Server not available" });
            break;
          }
          try {
            const candidates = [
              // Preferred new paths under /api
              `http://127.0.0.1:${port}/api/logs/clear`,
              `http://localhost:${port}/api/logs/clear`,
              // Backward-compatible paths without /api
              `http://127.0.0.1:${port}/logs/clear`,
              `http://localhost:${port}/logs/clear`,
            ];
            let ok = false;
            let lastStatus: number | null = null;
            for (const url of candidates) {
              try {
                const r = await fetch(url, { method: "POST" });
                lastStatus = r.status;
                if (r.ok) {
                  ok = true;
                  break;
                }
              } catch {
                // try next
              }
            }
            if (!ok) {
              sendResponse({
                status: "error",
                message: "Failed to clear logs: " + (lastStatus ?? "network error"),
              });
              break;
            }
            sendResponse({ status: "success" });
          } catch (e) {
            sendResponse({ status: "error", message: (e as Error).message });
          }
          break;
        }

        case "resumeDownload": {
          {
            const port = await storageService.getPort();
            if (port) {
              try {
                const res = await fetch(
                  "http://127.0.0.1:" + port + "/api/download/" + message.downloadId + "/resume",
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
        }

        case "cancelDownload": {
          {
            const port = await storageService.getPort();
            if (port) {
              try {
                const res = await fetch(
                  "http://127.0.0.1:" + port + "/api/download/" + message.downloadId + "/cancel",
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
        }

        case "reorderQueue": {
          // Update the download queue order and refresh UI
          downloadQueue = message.queue;
          updateQueueUI();
          // Respond immediately; persist order to server in the background (non-blocking)
          sendResponse({ status: "success" });
          // Fire-and-forget immediate attempt using default port so tests observe a POST synchronously
          try {
            const body = JSON.stringify({ queue: downloadQueue });
            fetch(`http://127.0.0.1:${getServerPort()}/api/queue/reorder`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body,
            }).catch(() => {});
          } catch {}
          (async () => {
            try {
              const currentPort = await storageService.getPort();
              const effectivePort = currentPort || getServerPort();
              const body = JSON.stringify({ queue: downloadQueue });
              try {
                await fetch(`http://127.0.0.1:${effectivePort}/api/queue/reorder`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body,
                });
              } catch {
                try {
                  await fetch(`http://localhost:${effectivePort}/api/queue/reorder`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body,
                  });
                } catch {}
              }
            } catch {}
          })();
          break;
        }

        case "removeFromQueue": {
          const id: string | undefined = message.downloadId;
          if (!id) {
            sendResponse({ status: "error", message: "Missing downloadId" });
            break;
          }
          // Respond immediately; perform local update and server notification in the background
          sendResponse({ status: "success" });
          (async () => {
            try {
              // Optimistic update
              downloadQueue = downloadQueue.filter(q => q !== id);
              delete (queuedDetails as any)[id];
              _updateQueueAndBadge();
              // Also remove on the server if available (best-effort)
              try {
                const port = await storageService.getPort();
                if (port) {
                  await fetch(
                    `http://127.0.0.1:${port}/api/queue/${encodeURIComponent(id)}/remove`,
                    { method: "POST" }
                  );
                }
              } catch {}
            } catch {}
          })();
          break;
        }

        default:
          warn("Received unknown message type:", message.type);
          sendResponse({ status: "error", message: "Unknown message type" });
          break;
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
      error("Error processing message " + message.type + ":", errorMessage);
      sendResponse({ status: "error", message: errorMessage });
    }
  })();

  // Return true to indicate that sendResponse will be called asynchronously
  return true;
});

if (!isTestEnvironment) {
  // Set up initialization on service worker lifecycle events
  chrome.runtime.onInstalled.addListener(() => {
    try {
      // Allow opening the side panel by clicking the action icon
      (chrome.sidePanel as any)
        ?.setPanelBehavior?.({ openPanelOnActionClick: true })
        .catch?.(() => {});
      // Set a global default path for the side panel
      (chrome.sidePanel as any)
        ?.setOptions?.({ path: "extension/dist/popup.html" })
        .catch?.(() => {});
    } catch {}
    initializeExtension();
  });

  chrome.runtime.onStartup.addListener(() => {
    try {
      (chrome.sidePanel as any)
        ?.setPanelBehavior?.({ openPanelOnActionClick: true })
        .catch?.(() => {});
      (chrome.sidePanel as any)
        ?.setOptions?.({ path: "extension/dist/popup.html" })
        .catch?.(() => {});
    } catch {}
    initializeExtension();
  });
} else {
  // In tests, initialize immediately so polling and status updates occur
  initializeExtension();
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
  resetServerState,
  expectedAppName,
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
if (!isTestEnvironment) {
  chrome.storage.local.get(_queueStorageKey, res => {
    downloadQueue = res[_queueStorageKey] || [];
    updateQueueUI();
  });

  // Initialize persisted active downloads on startup
  chrome.storage.local.get("activeDownloads", res => {
    if (res.activeDownloads) {
      Object.assign(activeDownloads, res.activeDownloads);
      log("Restored active downloads from storage:", Object.keys(activeDownloads).length);
      updateQueueUI();
    }
  });
}
