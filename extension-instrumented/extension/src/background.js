"use strict";
/**
 * Enhanced Video Downloader - Background Script
 * Handles port discovery, server communication, and download management
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
exports.persistQueue = exports.expectedAppName = exports.resetServerState = exports.actionIconPaths = exports.applyThemeToActionIcon = exports.debounce = exports.error = exports.warn = exports.log = exports.fetchServerConfig = exports.checkServerStatus = exports.findServerPort = exports.initializeActionIconTheme = exports.sendDownloadRequest = exports.downloadQueue = void 0;
const background_helpers_1 = require("./background-helpers");
Object.defineProperty(exports, "applyThemeToActionIcon", { enumerable: true, get: function () { return background_helpers_1.applyThemeToActionIcon; } });
Object.defineProperty(exports, "actionIconPaths", { enumerable: true, get: function () { return background_helpers_1.actionIconPaths; } });
const utils_1 = require("./lib/utils");
Object.defineProperty(exports, "debounce", { enumerable: true, get: function () { return utils_1.debounce; } });
const background_logic_1 = require("./background-logic");
const constants_1 = require("./constants");
const state_manager_1 = require("./core/state-manager");
const error_handler_1 = require("./core/error-handler");
const logger_1 = require("./core/logger");
const constants_2 = require("./core/constants");
// --- START CONSTANTS AND STORAGE KEYS ---
// Use centralized constants instead of local duplicates
const _configStorageKey = constants_2.STORAGE_KEYS.SERVER_CONFIG;
const _portStorageKey = constants_2.STORAGE_KEYS.SERVER_PORT;
const _historyStorageKey = constants_2.STORAGE_KEYS.DOWNLOAD_HISTORY;
const serverStatusKey = constants_2.STORAGE_KEYS.SERVER_STATUS;
const networkStatusKey = constants_2.STORAGE_KEYS.NETWORK_STATUS;
const _queueStorageKey = constants_2.STORAGE_KEYS.DOWNLOAD_QUEUE;
// Use centralized port configuration
const _defaultServerPort = (0, constants_1.getServerPort)();
const _maxPortScan = (0, constants_1.getPortRange)()[1]; // Use the end of the port range
const _serverCheckInterval = constants_2.NETWORK_CONSTANTS.SERVER_CHECK_INTERVAL;
// Expected application name for server identification (from manifest)
const expectedAppName = (chrome.runtime && chrome.runtime.getManifest
    ? chrome.runtime.getManifest().name
    : null) || "Enhanced Video Downloader";
exports.expectedAppName = expectedAppName;
// Initialize background script when loaded (skip in Jest)
const isTestEnvironment = typeof process !== "undefined" &&
    (process.env.JEST_WORKER_ID || process.env.NODE_ENV === "test");
// --- END CONSTANTS AND STORAGE KEYS ---
// Utility logging functions - now using centralized logger
const log = (...args) => {
    logger_1.logger.info(args.join(" "), { component: "background" });
};
exports.log = log;
const warn = (...args) => {
    logger_1.logger.warn(args.join(" "), { component: "background" });
};
exports.warn = warn;
const error = (...args) => {
    logger_1.logger.error(args.join(" "), { component: "background" });
};
exports.error = error;
// --- START SERVICE IMPLEMENTATIONS ---
const apiService = {
    fetchConfig(port) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch("http://127.0.0.1:" + port + "/api/config");
            if (!response.ok) {
                throw new Error("Failed to fetch config from server: " + response.statusText);
            }
            return response.json();
        });
    },
    saveConfig(port, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield fetch("http://127.0.0.1:" + port + "/api/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config),
            });
            return response.ok;
        });
    },
};
const storageService = {
    getConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield chrome.storage.local.get(_configStorageKey);
            return result[_configStorageKey] || {};
        });
    },
    setConfig(config) {
        return __awaiter(this, void 0, void 0, function* () {
            const currentConfig = yield this.getConfig();
            const newConfig = Object.assign(Object.assign({}, currentConfig), config);
            return chrome.storage.local.set({ [_configStorageKey]: newConfig });
        });
    },
    getPort() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield chrome.storage.local.get(_portStorageKey);
            return result[_portStorageKey] || null;
        });
    },
    setPort(port) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield chrome.storage.local.set({ [_portStorageKey]: port });
            }
            catch (e) {
                warn("Failed to cache server port:", e);
            }
        });
    },
    getHistory() {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield chrome.storage.local.get({ [_historyStorageKey]: [] });
            return result[_historyStorageKey];
        });
    },
    clearHistory() {
        return __awaiter(this, void 0, void 0, function* () {
            return chrome.storage.local.set({ [_historyStorageKey]: [] });
        });
    },
};
// --- END SERVICE IMPLEMENTATIONS ---
// --- START NETWORK STATUS MONITORING ---
/** Handle changes in network connectivity */
const handleNetworkChange = (online) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        yield chrome.storage.local.set({ [networkStatusKey]: online });
    }
    catch (err) {
        log("Failed to update network status in storage:", err);
    }
    // Notify the user
    if (online) {
        showNotification("Network Connected", "Browser is back online. Extension functions are restored.");
        // Automatically attempt server reconnection on network restore
        try {
            // Show scanning indicator
            if ((_a = chrome.action) === null || _a === void 0 ? void 0 : _a.setBadgeText) {
                try {
                    chrome.action.setBadgeBackgroundColor({
                        color: "#ffc107",
                    });
                    chrome.action.setBadgeText({ text: "SCAN" }); // Use plain ASCII string
                }
                catch (e) {
                    /* ignore errors setting badge */
                }
            }
            const port = yield findServerPort(true);
            if (port !== null) {
                log("Server reconnected on port " + port);
                showNotification("Server Reconnected", "Enhanced Video Downloader server is back online on port " +
                    port +
                    ".");
                // Broadcast server status after reconnection
                broadcastServerStatus();
            }
            else {
                log("Server reconnection failed upon network restore.");
                showNotification("Server Unavailable", "Could not reconnect to the Enhanced Video Downloader server. Please check if it's running.");
                // Broadcast disconnected status
                broadcastServerStatus();
            }
        }
        catch (reconnectErr) {
            log("Error during server reconnection attempt:", reconnectErr);
        }
    }
    else {
        showNotification("Network Disconnected", "Browser is offline. Download functionality may be unavailable.");
        // Persist current state when going offline
        try {
            yield (0, exports.persistQueue)();
            // Also persist active downloads
            yield chrome.storage.local.set({
                activeDownloads: activeDownloads,
            });
            log("Persisted queue and active downloads due to network disconnect");
        }
        catch (persistErr) {
            warn("Failed to persist state during network disconnect:", persistErr);
        }
        // Broadcast disconnected status when going offline
        broadcastServerStatus();
    }
});
// Initialize network status in storage
if (!isTestEnvironment) {
    chrome.storage.local.get(networkStatusKey, (res) => {
        const current = typeof res[networkStatusKey] === "boolean"
            ? res[networkStatusKey]
            : navigator.onLine;
        handleNetworkChange(current);
    });
    // Listen for browser online/offline events
    try {
        self.addEventListener("online", () => handleNetworkChange(true));
        self.addEventListener("offline", () => handleNetworkChange(false));
        log("Registered network connectivity listeners");
    }
    catch (e) {
        warn("Could not register network status listeners:", e);
    }
}
// --- END NETWORK STATUS MONITORING ---
// Helper for initial theme setup
const initializeActionIconTheme = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        log("Initializing action icon theme...");
        const result = yield chrome.storage.local.get("theme");
        const storedTheme = result.theme;
        if (storedTheme) {
            log("Found stored theme: " + storedTheme);
            (0, background_helpers_1.applyThemeToActionIcon)(storedTheme);
        }
        else {
            log("No theme stored. Checking system preference.");
            if (typeof self !== "undefined" && self.matchMedia) {
                const darkModeMediaQuery = self.matchMedia("(prefers-color-scheme: dark)");
                const systemPrefersDark = darkModeMediaQuery.matches;
                log("System prefers dark: " + systemPrefersDark);
                (0, background_helpers_1.applyThemeToActionIcon)(systemPrefersDark ? "dark" : "light");
                // Add listener for system theme changes
                try {
                    darkModeMediaQuery.addEventListener("change", (e) => {
                        const newSystemPrefersDark = e.matches;
                        log("System theme changed, now prefers dark: " + newSystemPrefersDark);
                        // Check if user has manually set a theme
                        chrome.storage.local.get("theme", (themeResult) => {
                            if (!themeResult.theme) {
                                // Only update automatically if user hasn't set a preference
                                (0, background_helpers_1.applyThemeToActionIcon)(newSystemPrefersDark ? "dark" : "light");
                            }
                            else {
                                log("Not updating theme automatically as user has set a preference.");
                            }
                        });
                    });
                    log("Added listener for system theme changes");
                }
                catch (listenerError) {
                    warn("Could not add listener for system theme changes: " +
                        listenerError.message);
                }
            }
            else {
                warn("self.matchMedia not available. " +
                    "Defaulting action icon to light theme.");
                (0, background_helpers_1.applyThemeToActionIcon)("light"); // Fallback if matchMedia is not available
            }
        }
    }
    catch (e) {
        error("Error initializing action icon theme:", e);
        (0, background_helpers_1.applyThemeToActionIcon)("light"); // Fallback to a default if storage access fails
    }
});
exports.initializeActionIconTheme = initializeActionIconTheme;
// Forward declaration for functions used by debouncedUpdateQueueUI or early setup
exports.downloadQueue = []; // Stores URLs of queued videos
const activeDownloads = {}; // Store {url: {status, progress, filename}}
// Define updateQueueUI before it's used by debouncedUpdateQueueUI
const updateQueueUI = () => {
    // Persist queue to storage
    (0, exports.persistQueue)();
    chrome.runtime
        .sendMessage({
        type: "queueUpdated",
        queue: exports.downloadQueue,
        active: activeDownloads,
    })
        .catch(() => {
        // Catch errors if the popup is not open or the receiver doesn't exist.
    });
};
const debouncedUpdateQueueUI = (0, utils_1.debounce)(updateQueueUI, 300);
// Function to update both badge and queue UI (called frequently)
const _updateQueueAndBadge = () => {
    updateBadge();
    debouncedUpdateQueueUI();
};
// Show a browser notification with optional tag
const showNotification = (title, message, tag = null) => {
    if (!chrome.notifications) {
        warn("Chrome notifications API not available");
        return;
    }
    // Determine icon URL if available
    const iconUrl = chrome.runtime && typeof chrome.runtime.getURL === "function"
        ? chrome.runtime.getURL("extension/icons/icon128.png")
        : "";
    const options = {
        type: "basic",
        iconUrl,
        title,
        message,
    };
    // Use tag as notificationId for grouping, if provided
    if (tag) {
        chrome.notifications.create(tag, options);
    }
    else {
        chrome.notifications.create("", options);
    }
};
// Server state variables - now managed by centralized state manager
const PORT_CHECK_TIMEOUT = constants_2.NETWORK_CONSTANTS.SERVER_CHECK_TIMEOUT;
const _configRefreshIntervalCount = constants_2.CONFIG_CONSTANTS.CONFIG_REFRESH_INTERVAL_COUNT;
const _maxPortBackoffInterval = constants_2.NETWORK_CONSTANTS.MAX_PORT_BACKOFF_INTERVAL;
// Reset function for testing
const resetServerState = () => {
    state_manager_1.stateManager.updateServerState({
        status: "disconnected",
        scanInProgress: false,
        backoffInterval: 1000,
    });
};
exports.resetServerState = resetServerState;
// Server Communication
const getServerStatus = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const port = yield storageService.getPort();
        if (!port) {
            return "disconnected";
        }
        const response = yield fetch(`http://127.0.0.1:${port}/api/health`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });
        if (response.ok) {
            return "connected";
        }
        else {
            return "disconnected";
        }
    }
    catch (error) {
        return "disconnected";
    }
});
const getCurrentTheme = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield chrome.storage.local.get("theme");
        return result.theme || "light";
    }
    catch (error) {
        return "light";
    }
});
const broadcastServerStatus = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    const status = yield getServerStatus();
    // Update icon based on server status
    if (status === "connected") {
        // Use the current theme's icon paths
        const iconPaths = (0, background_helpers_1.getActionIconPaths)();
        const currentTheme = yield getCurrentTheme();
        chrome.action.setIcon({ path: iconPaths[currentTheme] });
        (_b = (_a = chrome.action).setBadgeText) === null || _b === void 0 ? void 0 : _b.call(_a, { text: "" });
    }
    else {
        // Use error icon (could be a different icon or just the current theme with badge)
        const iconPaths = (0, background_helpers_1.getActionIconPaths)();
        const currentTheme = yield getCurrentTheme();
        chrome.action.setIcon({ path: iconPaths[currentTheme] });
        (_d = (_c = chrome.action).setBadgeText) === null || _d === void 0 ? void 0 : _d.call(_c, { text: "!" });
        (_f = (_e = chrome.action).setBadgeBackgroundColor) === null || _f === void 0 ? void 0 : _f.call(_e, { color: "#f44336" });
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
});
const checkServerStatus = (port) => __awaiter(void 0, void 0, void 0, function* () {
    return error_handler_1.errorHandler.wrap(() => __awaiter(void 0, void 0, void 0, function* () {
        const serverState = state_manager_1.stateManager.getServerState();
        const oldAvailable = serverState.status === "connected";
        // Skip server status checks when fetch API is unavailable (e.g., non-browser or test env)
        if (typeof fetch !== "function") {
            return false;
        }
        if (!port) {
            state_manager_1.stateManager.updateServerState({ status: "disconnected" });
            yield error_handler_1.errorHandler.handle(() => chrome.storage.local.set({ [serverStatusKey]: false }), error_handler_1.CentralizedErrorHandler.contexts.background.serverCheck(port));
            updateIcon();
            // Notify if availability changed
            if (oldAvailable) {
                showNotification("Server Disconnected", "The Enhanced Video Downloader server is not available. Downloads won't work until it's reconnected.");
            }
            return false;
        }
        // Fetch server status with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), PORT_CHECK_TIMEOUT);
        let response;
        try {
            response = yield fetch("http://127.0.0.1:" + port + "/health", {
                signal: controller.signal,
            });
        }
        finally {
            clearTimeout(timeoutId);
        }
        if (response.ok) {
            const data = yield response.json();
            // Verify the server is our app by checking app_name
            if (data.app_name === expectedAppName) {
                state_manager_1.stateManager.updateServerState({ status: "connected" });
                // If server just came online, refresh config
                if (!oldAvailable) {
                    logger_1.logger.info("Server now available on port " + port + ", refreshing config", logger_1.CentralizedLogger.contexts.background.serverCheck(port));
                    yield fetchServerConfig(port);
                }
            }
            else {
                logger_1.logger.warn("Wrong server on port " + port + ": " + data.app_name, logger_1.CentralizedLogger.contexts.background.serverCheck(port));
                state_manager_1.stateManager.updateServerState({ status: "disconnected" });
            }
        }
        else {
            logger_1.logger.warn("Server check failed on port " + port + ": " + response.status, logger_1.CentralizedLogger.contexts.background.serverCheck(port));
            state_manager_1.stateManager.updateServerState({ status: "disconnected" });
        }
        // Update storage
        const currentState = state_manager_1.stateManager.getServerState();
        yield error_handler_1.errorHandler.handle(() => chrome.storage.local.set({
            [serverStatusKey]: currentState.status === "connected",
        }), error_handler_1.CentralizedErrorHandler.contexts.background.serverCheck(port));
        // Update badge/icon to reflect server status
        updateIcon();
        // If server availability changed, show notification
        const currentAvailable = currentState.status === "connected";
        if (currentAvailable !== oldAvailable) {
            if (currentAvailable) {
                showNotification("Server Connected", "Enhanced Video Downloader server is now online on port " + port + ".");
                // Reset backoff interval when server is found
                state_manager_1.stateManager.updateServerState({ backoffInterval: 1000 });
            }
            else {
                showNotification("Server Disconnected", "The Enhanced Video Downloader server is not available. Downloads won't work until it's reconnected.");
            }
        }
        return currentAvailable;
    }), error_handler_1.CentralizedErrorHandler.contexts.background.serverCheck(port));
});
exports.checkServerStatus = checkServerStatus;
// Additional functions (stub implementations to be completed)
const fetchServerConfig = (port) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield fetch(`http://127.0.0.1:${port}/api/config`);
        if (response.ok) {
            const config = yield response.json();
            return config;
        }
        else {
            log(`Failed to fetch config from server: ${response.status}`);
            return {};
        }
    }
    catch (error) {
        log(`Error fetching server config: ${error}`);
        return {};
    }
});
exports.fetchServerConfig = fetchServerConfig;
const saveServerConfig = (port, configToSave) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield fetch(`http://127.0.0.1:${port}/api/config`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(configToSave),
        });
        if (response.ok) {
            log(`Config saved successfully to server on port ${port}`);
            return true;
        }
        else {
            log(`Failed to save config to server: ${response.status}`);
            return false;
        }
    }
    catch (error) {
        log(`Error saving server config: ${error}`);
        return false;
    }
});
const findServerPort = (...args_1) => __awaiter(void 0, [...args_1], void 0, function* (startScan = false, deps) {
    var _a, _b;
    const { discoverServerPort: discover = background_logic_1.discoverServerPort, storageService: storage = storageService, checkServerStatus: checkStatus = checkServerStatus, log: logFn = log, warn: warnFn = warn, } = deps || {};
    // Show badge indicator if forcing scan
    if (startScan && ((_a = chrome.action) === null || _a === void 0 ? void 0 : _a.setBadgeText)) {
        try {
            chrome.action.setBadgeBackgroundColor({
                color: "#ffc107",
            });
            chrome.action.setBadgeText({ text: "SCAN" }); // Use plain ASCII string
        }
        catch (e) {
            /* ignore errors setting badge */
        }
    }
    // Set scanning state
    state_manager_1.stateManager.updateServerState({ scanInProgress: true });
    try {
        // Progress callback for user feedback
        const onProgress = (current, total) => {
            var _a;
            if (startScan && ((_a = chrome.action) === null || _a === void 0 ? void 0 : _a.setBadgeText)) {
                try {
                    const percentage = Math.round((current / total) * 100);
                    chrome.action.setBadgeText({
                        text: String(percentage) + "%",
                    }); // Use string concatenation
                }
                catch (e) {
                    /* ignore errors setting badge */
                }
            }
        };
        // Perform discovery with timeout and progress
        const port = yield discover(storage, checkStatus, _defaultServerPort, _maxPortScan, startScan, PORT_CHECK_TIMEOUT, onProgress);
        if (port !== null) {
            logFn("Server discovered on port " + port);
            // Reset backoff interval when server is found
            state_manager_1.stateManager.updateServerState({ backoffInterval: 1000 });
            // Notify options page about server discovery
            try {
                chrome.runtime.sendMessage({ type: "serverDiscovered", port }, (response) => {
                    // Ignore any errors - this is just a notification
                    if (chrome.runtime.lastError) {
                        // This is expected when options page is not open
                        logFn("Server discovery notification sent (options page may not be open)");
                    }
                });
            }
            catch (e) {
                // Ignore errors if no listeners are available
                logFn("Server discovery notification failed (expected if options page not open)");
            }
        }
        else {
            warnFn("Server port discovery failed after scanning range."); // No emoji, just text
            // Increase backoff interval for next attempt
            const currentState = state_manager_1.stateManager.getServerState();
            const newBackoffInterval = Math.min(currentState.backoffInterval * 2, _maxPortBackoffInterval);
            state_manager_1.stateManager.updateServerState({ backoffInterval: newBackoffInterval });
        }
        return port;
    }
    catch (e) {
        // Handle any errors from the discover function
        warnFn("Error during server port discovery:", e); // No emoji, just text
        // Increase backoff interval for next attempt
        const currentState = state_manager_1.stateManager.getServerState();
        const newBackoffInterval = Math.min(currentState.backoffInterval * 2, _maxPortBackoffInterval);
        state_manager_1.stateManager.updateServerState({ backoffInterval: newBackoffInterval });
        return null;
    }
    finally {
        // Clear badge after scanning
        if (startScan && ((_b = chrome.action) === null || _b === void 0 ? void 0 : _b.setBadgeText)) {
            try {
                chrome.action.setBadgeText({ text: "" }); // Clear badge text, no emoji
            }
            catch (e) {
                /* ignore errors clearing badge */
            }
        }
        // Clear scanning state
        state_manager_1.stateManager.updateServerState({ scanInProgress: false });
    }
});
exports.findServerPort = findServerPort;
const updateIcon = () => {
    // Implementation details
};
const updateBadge = () => {
    // Implementation details
};
const addOrUpdateHistory = (url, status, filename, filepath, thumbnailUrl, sourceUrl, title) => __awaiter(void 0, void 0, void 0, function* () {
    // Implementation details
});
const clearDownloadHistory = () => __awaiter(void 0, void 0, void 0, function* () {
    // Implementation details
});
const toggleHistorySetting = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield chrome.storage.local.get("isHistoryEnabled");
        const enabled = result.isHistoryEnabled;
        yield chrome.storage.local.set({ isHistoryEnabled: !enabled });
    }
    catch (e) {
        warn("Failed to toggle history setting:", e);
    }
});
const sendDownloadRequest = (videoUrl_1, tabId_1, ...args_1) => __awaiter(void 0, [videoUrl_1, tabId_1, ...args_1], void 0, function* (videoUrl, tabId, isPlaylist = false, quality, format, pageTitle = "video", customDownloadId) { 
// Implementation details
return ({}); });
exports.sendDownloadRequest = sendDownloadRequest;
// Consolidated initialization function
const initializeExtension = () => __awaiter(void 0, void 0, void 0, function* () {
    // Prevent multiple simultaneous initializations
    const serverState = state_manager_1.stateManager.getServerState();
    if (serverState.scanInProgress) {
        log("Initialization already in progress, skipping...");
        return;
    }
    state_manager_1.stateManager.updateServerState({ scanInProgress: true });
    try {
        // Initialize action icon theme
        yield initializeActionIconTheme();
        // Perform initial server discovery
        const port = yield findServerPort(true);
        if (port !== null) {
            log("Discovered server on port " + port);
            // Broadcast server status after discovery
            yield broadcastServerStatus();
        }
        else {
            warn("Server port discovery failed after scanning range.");
            // Broadcast disconnected status
            yield broadcastServerStatus();
        }
        // Set up periodic server status checks
        setInterval(broadcastServerStatus, _serverCheckInterval);
        // Initial server status check
        yield broadcastServerStatus();
    }
    catch (err) {
        error("Error during extension initialization:", err);
    }
    finally {
        state_manager_1.stateManager.updateServerState({ scanInProgress: false });
    }
});
// Message handling for background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Use an IIFE to handle async logic and always return true for async responses
    (() => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        try {
            const port = yield storageService.getPort();
            switch (message.type) {
                case "downloadVideo": {
                    log("Received download request for:", message.url);
                    const response = yield sendDownloadRequest(message.url, (_a = sender.tab) === null || _a === void 0 ? void 0 : _a.id, message.isPlaylist, message.quality, message.format, message.pageTitle, message.downloadId);
                    sendResponse(response);
                    break;
                }
                case "getQueue":
                    // This logic remains untouched
                    sendResponse({ queue: exports.downloadQueue, active: activeDownloads });
                    break;
                case "clearHistory": {
                    const result = yield (0, background_logic_1.handleClearHistory)(storageService);
                    sendResponse(result);
                    break;
                }
                case "toggleHistory": {
                    yield toggleHistorySetting();
                    sendResponse({ status: "success" });
                    break;
                }
                case "getHistory": {
                    const result = yield (0, background_logic_1.handleGetHistory)(storageService);
                    sendResponse(result);
                    break;
                }
                case "setConfig": {
                    // *** This is the new, refactored logic ***
                    const result = yield (0, background_logic_1.handleSetConfig)(port, message.config, apiService, storageService);
                    sendResponse(result);
                    break;
                }
                case "getConfig":
                    // This logic remains untouched for now
                    if (port) {
                        const config = yield fetchServerConfig(port);
                        sendResponse({ status: "success", data: config });
                    }
                    else {
                        const serverState = state_manager_1.stateManager.getServerState();
                        sendResponse({
                            status: "error",
                            message: "Server not available",
                            data: serverState.config,
                        });
                    }
                    break;
                case "getServerStatus": {
                    const status = yield getServerStatus();
                    sendResponse({ status });
                    break;
                }
                case "restartServer":
                    // This logic remains untouched
                    log("Received restart request");
                    if (port) {
                        try {
                            const res = yield fetch("http://127.0.0.1:" + port + "/api/restart", {
                                method: "POST",
                            });
                            if (res.ok) {
                                sendResponse({ status: "success" });
                                // Server will be gone, so trigger a new scan after a short delay
                                if (!isTestEnvironment) {
                                    setTimeout(() => findServerPort(true), 2000);
                                }
                            }
                            else {
                                sendResponse({
                                    status: "error",
                                    message: "Server returned status " + res.status,
                                });
                            }
                        }
                        catch (e) {
                            sendResponse({
                                status: "error",
                                message: e.message,
                            });
                        }
                    }
                    else {
                        sendResponse({ status: "error", message: "Server not found" });
                    }
                    break;
                case "pauseDownload": {
                    if (port) {
                        try {
                            const res = yield fetch("http://127.0.0.1:" +
                                port +
                                "/api/download/" +
                                message.downloadId +
                                "/pause", { method: "POST" });
                            const json = yield res.json();
                            sendResponse(json);
                        }
                        catch (e) {
                            sendResponse({ status: "error", message: e.message });
                        }
                    }
                    else {
                        sendResponse({ status: "error", message: "Server not available" });
                    }
                    break;
                }
                case "resumeDownload": {
                    if (port) {
                        try {
                            const res = yield fetch("http://127.0.0.1:" +
                                port +
                                "/api/download/" +
                                message.downloadId +
                                "/resume", { method: "POST" });
                            const json = yield res.json();
                            sendResponse(json);
                        }
                        catch (e) {
                            sendResponse({ status: "error", message: e.message });
                        }
                    }
                    else {
                        sendResponse({ status: "error", message: "Server not available" });
                    }
                    break;
                }
                case "cancelDownload": {
                    if (port) {
                        try {
                            const res = yield fetch("http://127.0.0.1:" +
                                port +
                                "/api/download/" +
                                message.downloadId +
                                "/cancel", { method: "POST" });
                            const json = yield res.json();
                            sendResponse(json);
                        }
                        catch (e) {
                            sendResponse({ status: "error", message: e.message });
                        }
                    }
                    else {
                        sendResponse({ status: "error", message: "Server not available" });
                    }
                    break;
                }
                case "reorderQueue": {
                    // Update the download queue order and refresh UI
                    exports.downloadQueue = message.queue;
                    updateQueueUI();
                    sendResponse({ status: "success" });
                    break;
                }
                default:
                    warn("Received unknown message type:", message.type);
                    sendResponse({ status: "error", message: "Unknown message type" });
                    break;
            }
        }
        catch (e) {
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
            error("Error processing message " + message.type + ":", errorMessage);
            sendResponse({ status: "error", message: errorMessage });
        }
    }))();
    // Return true to indicate that sendResponse will be called asynchronously
    return true;
});
if (!isTestEnvironment) {
    // Set up initialization on service worker lifecycle events
    chrome.runtime.onInstalled.addListener(() => {
        initializeExtension();
    });
    chrome.runtime.onStartup.addListener(() => {
        initializeExtension();
    });
}
/**
 * Persist the download queue to storage
 */
const persistQueue = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield chrome.storage.local.set({ [_queueStorageKey]: exports.downloadQueue });
    }
    catch (e) {
        warn("Failed to persist download queue:", e);
    }
});
exports.persistQueue = persistQueue;
// Initialize persisted queue on startup
if (!isTestEnvironment) {
    chrome.storage.local.get(_queueStorageKey, (res) => {
        exports.downloadQueue = res[_queueStorageKey] || [];
        updateQueueUI();
    });
    // Initialize persisted active downloads on startup
    chrome.storage.local.get("activeDownloads", (res) => {
        if (res.activeDownloads) {
            Object.assign(activeDownloads, res.activeDownloads);
            log("Restored active downloads from storage:", Object.keys(activeDownloads).length);
            updateQueueUI();
        }
    });
}
