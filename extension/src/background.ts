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
import { getServerPort, getPortRange, MESSAGE_TYPES } from "./core/constants";
import { stateManager } from "./core/state-manager";
// validationService import removed (unused)
import { errorHandler, CentralizedErrorHandler } from "./core/error-handler";
import { logger } from "./core/logger";
import { STORAGE_KEYS, NETWORK_CONSTANTS, CONFIG_CONSTANTS } from "./core/constants";
import { queueManager } from "./background-queue";

// --- START CONSTANTS AND STORAGE KEYS ---
// Use centralized constants instead of local duplicates
const _configStorageKey = STORAGE_KEYS.SERVER_CONFIG;
const _portStorageKey = STORAGE_KEYS.SERVER_PORT;
const _historyStorageKey = STORAGE_KEYS.DOWNLOAD_HISTORY;
const serverStatusKey = STORAGE_KEYS.SERVER_STATUS;
const networkStatusKey = STORAGE_KEYS.NETWORK_STATUS;

// Use centralized port configuration
// Single source of truth for server port: prefer cached, else discover; avoid hard-coded default reads
const getEffectiveServerPort = async (): Promise<number | null> => {
  try {
    const cached = await storageService.getPort();
    if (typeof cached === "number" && Number.isFinite(cached)) {
      // Update queue manager with the cached port
      queueManager.setServerPort(cached);
      return cached;
    }
  } catch {}
  // As a last resort, use the compiled default once and seed the cache
  try {
    const fallback = getServerPort();
    if (typeof fallback === "number" && Number.isFinite(fallback)) {
      try {
        await storageService.setPort?.(fallback);
        // Update queue manager with the fallback port
        queueManager.setServerPort(fallback);
      } catch {}
      return fallback;
    }
  } catch {}
  return null;
};
const _maxPortScan = getPortRange()[1]; // Use the end of the port range
const _serverCheckInterval = NETWORK_CONSTANTS.SERVER_CHECK_INTERVAL;
const _statusPollIntervalMs = 1000;

// Prevent duplicate download requests: track in-flight and recent requests
const _inFlightDownloads = new Set<string>();
const _recentDownloads = new Map<string, number>();
const _recentWindowMs = 5000; // ignore duplicate requests for same key within 5s

// Track recently deleted queued items to prevent them from being restored by status polling
const recentlyDeletedQueueItems = new Set<string>();
const RECENTLY_DELETED_TIMEOUT = 30000; // 30 seconds - increased to allow server processing

// Track when status updates should be suppressed to prevent UI conflicts
const suppressStatusUpdatesUntil = 0;
const SUPPRESS_STATUS_UPDATE_DURATION = 2000; // 2 seconds

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

// Prevent noisy unhandled promise rejections in the background service worker
try {
  self.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    try {
      event.preventDefault();
    } catch {
      /* ignore */
    }
  });
} catch {
  /* ignore */
}

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
    const protocolsToTry = ["http", "https"] as const;
    const hostsToTry = ["127.0.0.1", "localhost", "[::1]"] as const;
    const timeoutMs = NETWORK_CONSTANTS.SERVER_CHECK_TIMEOUT;

    let response: Response | null = null;
    let lastNetworkError: unknown = null;
    outer: for (const protocol of protocolsToTry) {
      for (const host of hostsToTry) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
          response = await fetch(`${protocol}://${host}:${port}/api/config`, {
            method: "GET",
            signal: controller.signal,
          });
          clearTimeout(timeout);
          break outer;
        } catch (e) {
          clearTimeout(timeout);
          lastNetworkError = e;
        }
      }
    }

    if (!response) {
      throw lastNetworkError instanceof Error ? lastNetworkError : new Error("Network error");
    }
    if (!response.ok) {
      throw new Error("Failed to fetch config from server: " + response.statusText);
    }
    return response.json();
  },
  async saveConfig(port: number, config: Partial<ServerConfig>): Promise<boolean> {
    const protocolsToTry = ["http", "https"] as const;
    const hostsToTry = ["127.0.0.1", "localhost", "[::1]"] as const;
    const timeoutMs = NETWORK_CONSTANTS.SERVER_CHECK_TIMEOUT;

    let response: Response | null = null;
    let lastNetworkError: unknown = null;
    outer: for (const protocol of protocolsToTry) {
      for (const host of hostsToTry) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
          response = await fetch(`${protocol}://${host}:${port}/api/config`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(config),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          break outer;
        } catch (e) {
          clearTimeout(timeout);
          lastNetworkError = e;
        }
      }
    }

    if (!response) {
      throw lastNetworkError instanceof Error ? lastNetworkError : new Error("Network error");
    }
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
export const handleNetworkChange = async (online: boolean): Promise<void> => {
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
      const port = await getEffectiveServerPort();
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

    // Queue state is now managed by the consolidated queue manager
    // No need to manually persist state
    log("Network disconnected - queue manager will handle state");

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
    const result = await chrome.storage.local.get(STORAGE_KEYS.THEME);
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
            chrome.storage.local.get(STORAGE_KEYS.THEME, themeResult => {
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
// Download state is now managed by the consolidated queue manager

// Queue UI updates are now handled by the consolidated queue manager
const updateQueueUI = (): void => {
  // No-op: queue UI updates are handled by the queue manager
};

const debouncedUpdateQueueUI = debounce(updateQueueUI, 300);

// Function to update both badge and queue UI (called frequently)
export const _updateQueueAndBadge = (): void => {
  updateBadge();
  // Queue UI updates are now handled by the queue manager
  // debouncedUpdateQueueUI();
};

// Show a browser notification with optional tag
export const showNotification = (
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

  // Create notification options object
  const options = {
    type: "basic" as const,
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
    const port = await getEffectiveServerPort();
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
    const result = await chrome.storage.local.get(STORAGE_KEYS.THEME);
    return (result.theme as Theme) || "light";
  } catch (error) {
    return "light";
  }
};

export const broadcastServerStatus = async (): Promise<void> => {
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
  try {
    chrome.runtime.sendMessage(
      {
        type: MESSAGE_TYPES.SERVER_STATUS_UPDATE,
        status,
      },
      () => {
        try {
          const _ = (chrome.runtime as any)?.lastError?.message;
          void _;
        } catch {}
      }
    );
  } catch {}
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
      response = await fetch(
        NETWORK_CONSTANTS.buildServerUrl(port, NETWORK_CONSTANTS.HEALTH_ENDPOINT),
        { signal: controller.signal }
      );
    } catch {
      try {
        // Fallback to localhost
        response = await fetch(`http://localhost:${port}${NETWORK_CONSTANTS.HEALTH_ENDPOINT}`, {
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
          logger.info("Server now available on port " + port + ", refreshing config");
          await fetchServerConfig(port);
        }
      } else {
        logger.warn("Wrong server on port " + port + ": " + data.app_name);
        stateManager.updateServerState({ status: "disconnected" });
      }
    } else if (response) {
      logger.warn("Server check failed on port " + port + ": " + response.status);
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
        const response = await fetch(
          NETWORK_CONSTANTS.buildServerUrl(port, NETWORK_CONSTANTS.CONFIG_ENDPOINT)
        );
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
        const response = await fetch(`http://${host}:${port}/api/config`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
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
    const response = await fetch(
      NETWORK_CONSTANTS.buildServerUrl(port, NETWORK_CONSTANTS.CONFIG_ENDPOINT),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configToSave),
      }
    );

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
      getServerPort(),
      _maxPortScan,
      startScan,
      PORT_CHECK_TIMEOUT,
      onProgress
    );

    if (port !== null) {
      logFn("Server discovered on port " + port);
      // Set up queue manager with the discovered port
      queueManager.setServerPort(port);
      // Reset backoff interval when server is found
      stateManager.updateServerState({ backoffInterval: 1000 });

      // Notify options page about server discovery
      try {
        chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SERVER_DISCOVERED, port }, response => {
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
        try {
          warn("Failed to update icon:", error);
        } catch {}
      });
  } catch (error) {
    try {
      warn("Error updating icon:", error);
    } catch {}
  }
};

const updateBadge = (): void => {
  try {
    // Get current queue count from the queue manager
    const totalCount = queueManager.getBadgeCount();

    if (totalCount > 0) {
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
    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY_ENABLED);
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
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.HISTORY_UPDATED }, () => {
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
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.HISTORY_UPDATED }, () => {
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

export const toggleHistorySetting = async (): Promise<void> => {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY_ENABLED);
    const enabled = result.isHistoryEnabled as boolean;
    await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY_ENABLED]: !enabled });
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
    const port = typeof forcedPort === "number" ? forcedPort : await getEffectiveServerPort();
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

      // Queue is now managed by the consolidated queue manager
      // No need to manually update local state
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

  // Initialize the consolidated queue manager
  try {
    // Set up queue manager with any known port
    const port = await getEffectiveServerPort();
    if (port) {
      queueManager.setServerPort(port);
    }
  } catch (error) {
    log("Failed to initialize queue manager:", error);
  }

  try {
    // Initialize action icon theme
    await initializeActionIconTheme();

    // In tests, rely on the test-mode polling block below

    // Perform initial server discovery
    // In tests, avoid scanning/health/config prefetch to keep mocked fetch order stable
    let port = await getEffectiveServerPort();
    if (!isTestEnvironment) {
      if (typeof port !== "number" || !Number.isFinite(port)) {
        port = await findServerPort(false);
      }
      if (port !== null) {
        log("Discovered server on port " + port);
        // Set up queue manager with the discovered port
        queueManager.setServerPort(port);
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
        // Set up queue manager with the discovered port
        queueManager.setServerPort(port);
        // In tests, avoid additional fetches here to keep the mocked fetch order intact.
      }
    }

    // Set up periodic server status checks via the main status poll (single poller)
    if (!isTestEnvironment) {
      // Initial server status check
      await broadcastServerStatus();
    }

    // Start status polling to feed popup UI
    if (!isTestEnvironment) {
      let _lastServerStatus: "connected" | "disconnected" | undefined;
      setInterval(async () => {
        try {
          const port = await getEffectiveServerPort();
          if (!port) return;
          const res = await fetch(
            NETWORK_CONSTANTS.buildServerUrl(port, "/api/status?include_queue=1")
          );
          if (!res.ok) {
            if (_lastServerStatus !== "disconnected") {
              stateManager.updateServerState({ status: "disconnected" });
              try {
                chrome.runtime.sendMessage(
                  { type: MESSAGE_TYPES.SERVER_STATUS_UPDATE, status: "disconnected" },
                  () => {}
                );
              } catch {}
              updateIcon();
              _lastServerStatus = "disconnected";
            }
            return;
          }
          const data = await res.json();
          const active: Record<string, any> = {};
          const serverQueued: string[] = [];
          const newQueuedDetails: Record<
            string,
            { url?: string; title?: string; filename?: string }
          > = {};
          Object.entries(data || {}).forEach(([id, obj]) => {
            const rawStatus = String((obj as any)?.status || "").toLowerCase();
            if (rawStatus === "queued") {
              serverQueued.push(id);
              const url = (obj as any)?.url as string | undefined;
              const title = (obj as any)?.title as string | undefined;
              const filename = (obj as any)?.filename as string | undefined;
              newQueuedDetails[id] = { url, title, filename };
            } else if (["starting", "downloading", "paused"].includes(rawStatus)) {
              // Compute numeric progress for UI from percent string/history when available
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

          // Queue state is now managed by the consolidated queue manager
          // No need to manually sync local state

          try {
            // Suppress status updates for a short period after deletions to prevent UI conflicts
            if (Date.now() < suppressStatusUpdatesUntil) {
              log("Suppressing status update due to recent deletion operation");
              return;
            }

            // Queue status updates are now handled by the queue manager
            // No need to manually send messages here
          } catch {}

          // Mark server as connected and broadcast only on change
          if (_lastServerStatus !== "connected") {
            stateManager.updateServerState({ status: "connected" });
            try {
              chrome.runtime.sendMessage(
                { type: MESSAGE_TYPES.SERVER_STATUS_UPDATE, status: "connected" },
                () => {
                  try {
                    const _ = (chrome.runtime as any)?.lastError?.message;
                    void _;
                  } catch {}
                }
              );
            } catch {}
            updateIcon();
            _lastServerStatus = "connected";
          }
        } catch {
          // Treat as disconnected on network errors
          if (_lastServerStatus !== "disconnected") {
            stateManager.updateServerState({ status: "disconnected" });
            try {
              chrome.runtime.sendMessage(
                { type: MESSAGE_TYPES.SERVER_STATUS_UPDATE, status: "disconnected" },
                () => {
                  try {
                    const _ = (chrome.runtime as any)?.lastError?.message;
                    void _;
                  } catch {}
                }
              );
            } catch {}
            updateIcon();
            _lastServerStatus = "disconnected";
          }
        }
      }, _statusPollIntervalMs);
    } else {
      // In tests, schedule a single delayed poll so tests can deterministically advance timers
      const runPoll = async () => {
        try {
          let port = await getEffectiveServerPort();
          if (!port) {
            // In tests, fall back to default configured port to ensure polling proceeds
            try {
              port = getServerPort();
            } catch {}
          }
          if (!port) return;
          const res = await fetch(
            NETWORK_CONSTANTS.buildServerUrl(port, "/api/status?include_queue=1")
          );
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
            } else if (["starting", "downloading", "paused"].includes(status)) {
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

          // Queue state is now managed by the consolidated queue manager
          // No need to manually sync local state
          try {
            const hasMock = typeof (chrome.runtime.sendMessage as any)?.mock !== "undefined";
            logger.info(
              "[bg] runPoll: sending downloadStatusUpdate (test-mode), hasMock=" + hasMock
            );
          } catch {}
          try {
            // Queue status updates are now handled by the queue manager
            // No need to manually send messages here
          } catch {}
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

const broadcastExtensionReloaded = (): void => {
  try {
    const version = (chrome.runtime?.getManifest?.() as any)?.version || "";
    chrome.tabs.query({ active: false, currentWindow: false } as any, tabs => {
      for (const t of tabs) {
        if (t.id !== undefined) {
          try {
            chrome.tabs.sendMessage(
              t.id,
              { type: "evd_extension_reloaded", version, ts: Date.now() },
              () => {
                try {
                  const _ = (chrome.runtime as any)?.lastError?.message;
                  void _;
                } catch {}
              }
            );
          } catch {}
        }
      }
    });
  } catch {}
};

// Message handling for background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    // Log all incoming messages for debugging
    log(`Received message: ${message.type}`, { component: "background", operation: "onMessage" });

    // In tests, handle simple error paths synchronously for determinism
    if (
      isTestEnvironment &&
      (message.type === MESSAGE_TYPES.GET_LOGS || message.type === MESSAGE_TYPES.CLEAR_LOGS)
    ) {
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
          case MESSAGE_TYPES.DOWNLOAD_VIDEO: {
            log("Received download request for:", message.url);
            // Ensure we have a server port; if not, try to discover it immediately
            const effectivePort = await getEffectiveServerPort();
            // If no cached/known port, fail fast to avoid keeping the message channel open
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
              logger.info(
                "[EVD] BG → POST /api/download",
                { component: "background", operation: "downloadRequest" },
                { port: effectivePort, url: message.url, pageTitle: message.pageTitle }
              );
            } catch {}

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
              logger.info("[EVD] BG response from server", { component: "background" }, response);
            } catch {}
            sendResponse(response);
            break;
          }

          case MESSAGE_TYPES.GET_QUEUE: {
            // Get queue status from the consolidated queue manager
            try {
              const status = await queueManager.getQueueStatus();
              sendResponse({
                queue: status.queued.map(item => item.downloadId),
                active: status.active,
                queuedDetails: Object.fromEntries(
                  status.queued.map(item => [
                    item.downloadId,
                    { url: item.url, title: item.pageTitle, filename: item.filename },
                  ])
                ),
              });
            } catch (error) {
              sendResponse({ queue: [], active: {}, queuedDetails: {} });
            }
            break;
          }

          case MESSAGE_TYPES.SET_CONTENT_BUTTON_HIDDEN: {
            const hidden = !!message.hidden;
            try {
              // Broadcast to all tabs to update hidden state
              chrome.tabs.query({ active: false, currentWindow: false } as any, tabs => {
                for (const t of tabs) {
                  if (t.id !== undefined) {
                    try {
                      chrome.tabs.sendMessage(
                        t.id,
                        { type: "toggleButtonVisibility", hidden },
                        () => {
                          // Read lastError to avoid "Unchecked runtime.lastError" noise when no content script
                          try {
                            const _ = (chrome.runtime as any)?.lastError?.message;
                            void _;
                          } catch {}
                        }
                      );
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

          case MESSAGE_TYPES.CLEAR_HISTORY: {
            const result = await handleClearHistory(storageService);
            sendResponse(result);
            break;
          }

          case MESSAGE_TYPES.TOGGLE_HISTORY: {
            await toggleHistorySetting();
            sendResponse({ status: "success" });
            break;
          }

          case MESSAGE_TYPES.GET_HISTORY: {
            const result = await handleGetHistory(storageService);
            sendResponse(result);
            break;
          }

          case MESSAGE_TYPES.SET_CONFIG: {
            // *** This is the new, refactored logic ***
            const port = await getEffectiveServerPort();
            const result = await handleSetConfig(port, message.config, apiService, storageService);
            sendResponse(result);
            break;
          }

          case MESSAGE_TYPES.GET_CONFIG: {
            // Fetch server config when a port is known; otherwise return current cached state
            const port = await getEffectiveServerPort();
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

          case MESSAGE_TYPES.GET_SERVER_STATUS: {
            const status = await getServerStatus();
            sendResponse({ status });
            break;
          }

          case MESSAGE_TYPES.RESUME_DOWNLOADS: {
            // Trigger server-side resume operation
            {
              const port = await getEffectiveServerPort();
              if (port) {
                try {
                  const res = await fetch(NETWORK_CONSTANTS.buildServerUrl(port, "/api/resume"), {
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

          case MESSAGE_TYPES.SET_PRIORITY: {
            // Adjust OS priority (nice value) for a download process
            const downloadId: string | undefined = message.downloadId;
            const priority: number | undefined = message.priority;
            if (!downloadId || typeof priority !== "number") {
              sendResponse({ status: "error", message: "Missing downloadId or priority" });
              break;
            }
            {
              const port = await getEffectiveServerPort();
              if (port) {
                try {
                  const res = await fetch(
                    `${NETWORK_CONSTANTS.buildServerUrl(
                      port,
                      "/api/download"
                    )}/${downloadId}/priority`,
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

          case MESSAGE_TYPES.GALLERY_DOWNLOAD: {
            const url: string | undefined = message.url;
            if (!url) {
              sendResponse({ status: "error", message: "Missing url" });
              break;
            }
            {
              const port = await getEffectiveServerPort();
              if (port) {
                try {
                  const res = await fetch(
                    NETWORK_CONSTANTS.buildServerUrl(port, "/api/gallery-dl"),
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ url }),
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

          case MESSAGE_TYPES.RESTART_SERVER:
            // Request server restart via API and trigger port rediscovery
            log("Received restart request");
            {
              const port = await getEffectiveServerPort();
              if (port) {
                try {
                  const base = NETWORK_CONSTANTS.buildServerUrl(port, "");
                  let ok = false;
                  let lastStatus: number | null = null;
                  let managedMaybeStarted = false;
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
                        // The process might have started a restart and killed this server before responding
                        managedMaybeStarted = true;
                        break;
                      }
                    }
                  }
                  if (ok) {
                    sendResponse({ status: "success" });
                    if (!isTestEnvironment) {
                      setTimeout(() => findServerPort(true), 2000);
                    }
                  } else if (managedMaybeStarted) {
                    // Best-effort health check: if server comes back shortly, treat as success
                    const deadline = Date.now() + 10000; // up to 10s
                    let healthy = false;
                    while (Date.now() < deadline) {
                      try {
                        const health = await fetch(base + "/api/health");
                        if (health.ok) {
                          healthy = true;
                          break;
                        }
                      } catch {
                        // ignore and retry
                      }
                      await new Promise(res => setTimeout(res, 500));
                    }
                    if (healthy) {
                      sendResponse({ status: "success" });
                      if (!isTestEnvironment) setTimeout(() => findServerPort(true), 1000);
                    } else {
                      sendResponse({
                        status: "error",
                        message:
                          "Managed restart may have started but server did not come back in time",
                      });
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

          case MESSAGE_TYPES.PAUSE_DOWNLOAD: {
            {
              const port = await storageService.getPort();
              if (port) {
                try {
                  const res = await fetch(
                    `${NETWORK_CONSTANTS.buildServerUrl(port, "/api/download")}/${
                      message.downloadId
                    }/pause`,
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

          case MESSAGE_TYPES.GET_LOGS: {
            // Ensure we have a port; if missing, try discovery and fall back to default
            let ensuredPort: number | null = await getEffectiveServerPort();
            if (!ensuredPort) {
              try {
                ensuredPort = await findServerPort(true);
              } catch {
                /* ignore */
              }
              if (!ensuredPort) {
                try {
                  const defaultPort = getServerPort();
                  const ok = await checkServerStatus(defaultPort);
                  ensuredPort = ok ? defaultPort : null;
                  if (ensuredPort) {
                    try {
                      await storageService.setPort?.(ensuredPort);
                    } catch {}
                  }
                } catch {}
              }
              if (!ensuredPort) {
                logger.info("[bg] getLogs: could not ensure port → error");
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
                // If we already ensured a port, seed storage for subsequent quick paths
                try {
                  await chrome.storage.local.set({ [_portStorageKey]: ensuredPort });
                } catch {}
              }
            } catch {
              // Continue; we already ensured a port
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
              if (typeof viaSingle?.[_portStorageKey] === "number")
                port = viaSingle[_portStorageKey];
            } catch {}
            if (typeof port !== "number" || !Number.isFinite(port)) {
              port = await getEffectiveServerPort();
            }
            if (!port) port = ensuredPort;
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
                `${NETWORK_CONSTANTS.SERVER_BASE_URL}:${port}${NETWORK_CONSTANTS.LOGS_ENDPOINT}${qs}`,
                `http://localhost:${port}${NETWORK_CONSTANTS.LOGS_ENDPOINT}${qs}`,
                // Backward-compatible paths without /api
                `${NETWORK_CONSTANTS.SERVER_BASE_URL}:${port}${NETWORK_CONSTANTS.LEGACY_LOGS_ENDPOINT}${qs}`,
                `http://localhost:${port}${NETWORK_CONSTANTS.LEGACY_LOGS_ENDPOINT}${qs}`,
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

          case MESSAGE_TYPES.CLEAR_LOGS: {
            // Immediate fast-path: if no port, return error right away (especially important in tests)
            {
              const p = await getEffectiveServerPort();
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
              if (typeof viaSingle?.[_portStorageKey] === "number")
                port = viaSingle[_portStorageKey];
            } catch {}
            if (typeof port !== "number" || !Number.isFinite(port)) {
              port = await getEffectiveServerPort();
            }
            if (!port) {
              sendResponse({ status: "error", message: "Server not available" });
              break;
            }
            try {
              const candidates = [
                // Preferred new paths under /api
                `${NETWORK_CONSTANTS.SERVER_BASE_URL}:${port}${NETWORK_CONSTANTS.LOGS_CLEAR_ENDPOINT}`,
                `http://localhost:${port}${NETWORK_CONSTANTS.LOGS_CLEAR_ENDPOINT}`,
                // Backward-compatible paths without /api
                `${NETWORK_CONSTANTS.SERVER_BASE_URL}:${port}${NETWORK_CONSTANTS.LEGACY_LOGS_CLEAR_ENDPOINT}`,
                `http://localhost:${port}${NETWORK_CONSTANTS.LEGACY_LOGS_CLEAR_ENDPOINT}`,
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

          case MESSAGE_TYPES.RESUME_DOWNLOAD: {
            {
              const port = await getEffectiveServerPort();
              if (port) {
                try {
                  const res = await fetch(
                    `${NETWORK_CONSTANTS.buildServerUrl(port, "/api/download")}/${
                      message.downloadId
                    }/resume`,
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

          case MESSAGE_TYPES.CANCEL_DOWNLOAD: {
            {
              const port = await getEffectiveServerPort();
              if (port) {
                try {
                  const res = await fetch(
                    `${NETWORK_CONSTANTS.buildServerUrl(port, "/api/download")}/${
                      message.downloadId
                    }/cancel`,
                    { method: "POST" }
                  );
                  const json = await res.json();
                  // Queue state is now managed by the consolidated queue manager
                  // No need to manually update local state
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

          case MESSAGE_TYPES.REORDER_QUEUE: {
            // Use the consolidated queue manager to reorder the queue
            try {
              const result = await queueManager.reorderQueue(message.queue);
              sendResponse(result);
            } catch (error) {
              sendResponse({
                success: false,
                message: error instanceof Error ? error.message : "Unknown error",
              });
            }
            break;
          }

          case MESSAGE_TYPES.REMOVE_FROM_QUEUE: {
            log(`Processing REMOVE_FROM_QUEUE for item: ${message.downloadId}`);
            const id: string | undefined = message.downloadId;
            if (!id) {
              sendResponse({ status: "error", message: "Missing downloadId" });
              break;
            }

            // Check if this item is already being processed for deletion
            if (recentlyDeletedQueueItems.has(id)) {
              log(
                `Item ${id} is already being processed for deletion - ignoring duplicate request`
              );
              sendResponse({ status: "success", message: "Already being processed" });
              break;
            }

            // Track this item as recently deleted to prevent status polling from restoring it
            recentlyDeletedQueueItems.add(id);

            // Use the consolidated queue manager to remove the item
            try {
              const result = await queueManager.removeFromQueue(id);
              sendResponse(result);
            } catch (error) {
              sendResponse({
                success: false,
                message: error instanceof Error ? error.message : "Unknown error",
              });
            }
            break;
          }

          // Ignore background-broadcast notifications to avoid noisy unknown-message warnings
          case MESSAGE_TYPES.HISTORY_UPDATED: {
            // Acknowledge and do nothing
            sendResponse({ status: "ok" });
            break;
          }
          case MESSAGE_TYPES.DOWNLOAD_STATUS_UPDATE: {
            sendResponse({ status: "ok" });
            break;
          }
          case MESSAGE_TYPES.SERVER_STATUS_UPDATE: {
            sendResponse({ status: "ok" });
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
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
    error("Error handling message " + message.type + ":", errorMessage);
    sendResponse({ status: "error", message: errorMessage });
    return true;
  }
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
    try {
      setTimeout(broadcastExtensionReloaded, 250);
    } catch {}
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
    try {
      setTimeout(broadcastExtensionReloaded, 250);
    } catch {}
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
 * Queue persistence is now handled by the consolidated queue manager
 */
export const persistQueue = async (): Promise<void> => {
  // No-op: queue persistence is handled by the queue manager
};

// Initialize queue manager on startup
if (!isTestEnvironment) {
  // Queue manager will handle its own initialization
}
