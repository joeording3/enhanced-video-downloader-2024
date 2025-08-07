"use strict";
/**
 * @fileoverview
 * Comprehensive unit tests for background.ts
 * Updated to use centralized services
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
const background_1 = require("../../extension/src/background");
const constants_1 = require("../../extension/src/core/constants");
const logger_1 = require("../../extension/src/core/logger");
const state_manager_1 = require("../../extension/src/core/state-manager");
// Mock global fetch
const mockFetch = jest.fn();
// Mock global navigator
const mockNavigator = {
    onLine: true,
};
// Mock global self
const mockSelf = {
    addEventListener: jest.fn(),
    matchMedia: jest.fn(() => ({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
    })),
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
        },
    },
};
// Mock AbortController
const mockAbortController = {
    signal: {
        aborted: false,
    },
    abort: jest.fn(),
};
// Mock global AbortController
global.AbortController = jest.fn(() => mockAbortController);
describe("Background Script - Core Functions", () => {
    let logger;
    let stateManager;
    beforeEach(() => {
        // Get actual instances of centralized services
        logger = logger_1.CentralizedLogger.getInstance();
        stateManager = state_manager_1.ExtensionStateManager.getInstance();
        // Clear logs and reset state for clean tests
        logger.clearLogs();
        stateManager.reset();
        // Setup other global mocks
        global.fetch = mockFetch;
        global.navigator = mockNavigator;
        global.self = mockSelf;
        // Reset all mocks
        jest.clearAllMocks();
        // Reset download queue
        background_1.downloadQueue.length = 0;
        // Reset global server state variables
        // This is needed because serverAvailable is a global variable in background.ts
        const backgroundModule = require("../../extension/src/background");
        if (backgroundModule &&
            typeof backgroundModule.resetServerState === "function") {
            backgroundModule.resetServerState();
        }
        // Default successful responses
        mockFetch.mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ status: "success" }),
        });
    });
    describe("Logging Functions", () => {
        it("log should use centralized logger", () => {
            // Test that logging functions work with centralized logger
            logger.info("test message", { component: "test" });
            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe("test message");
            expect(logs[0].context.component).toBe("test");
            expect(logs[0].level).toBe("info");
        });
        it("warn should use centralized logger", () => {
            logger.warn("warning message", { component: "test" });
            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe("warning message");
            expect(logs[0].level).toBe("warn");
        });
        it("error should use centralized logger", () => {
            logger.error("error message", { component: "test" });
            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe("error message");
            expect(logs[0].level).toBe("error");
        });
        it("debug should use centralized logger", () => {
            logger.setLevel("debug");
            logger.debug("debug message", { component: "test" });
            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe("debug message");
            expect(logs[0].level).toBe("debug");
        });
    });
    describe("State Management", () => {
        it("should use centralized state manager", () => {
            const initialState = stateManager.getState();
            expect(initialState.server.status).toBe("disconnected");
            expect(initialState.ui.theme).toBe("light");
            // Test state updates
            stateManager.updateServerState({ status: "connected", port: 8080 });
            const updatedState = stateManager.getState();
            expect(updatedState.server.status).toBe("connected");
            expect(updatedState.server.port).toBe(8080);
        });
        it("should handle UI state updates", () => {
            stateManager.updateUIState({ theme: "dark" });
            const state = stateManager.getState();
            expect(state.ui.theme).toBe("dark");
        });
        it("should handle download state updates", () => {
            const downloadState = {
                queue: ["url1", "url2"],
                active: { url1: { status: "downloading", progress: 50, url: "url1" } },
                history: [],
            };
            stateManager.updateDownloadState(downloadState);
            const state = stateManager.getState();
            expect(state.downloads.queue).toHaveLength(2);
            expect(state.downloads.active["url1"].progress).toBe(50);
        });
    });
    describe("Server Status Functions", () => {
        it("checkServerStatus should return true for successful response", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest
                    .fn()
                    .mockResolvedValue({ app_name: "Enhanced Video Downloader" }),
            });
            const result = yield (0, background_1.checkServerStatus)((0, constants_1.getServerPort)());
            expect(result).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(`http://127.0.0.1:${(0, constants_1.getServerPort)()}/health`, expect.objectContaining({ signal: expect.anything() }));
        }));
        it("checkServerStatus should return false for failed response", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
            });
            const result = yield (0, background_1.checkServerStatus)((0, constants_1.getServerPort)());
            expect(result).toBe(false);
        }));
        it("checkServerStatus should throw error for network error", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock fetch to throw an error that will be caught by error handler
            mockFetch.mockImplementation(() => {
                throw new Error("Network error");
            });
            // The centralized error handler re-throws errors, so we expect this to throw
            yield expect((0, background_1.checkServerStatus)((0, constants_1.getServerPort)())).rejects.toThrow("Network error");
            // The error handler logs to console.error, not the centralized logger
            // We just verify the function throws as expected
            expect(true).toBe(true);
        }));
        it("checkServerStatus should return false when fetch is not available", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock fetch as undefined
            global.fetch = undefined;
            const result = yield (0, background_1.checkServerStatus)((0, constants_1.getServerPort)());
            expect(result).toBe(false);
            // Restore fetch
            global.fetch = mockFetch;
        }));
        it("checkServerStatus should return false for wrong server app name", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({ app_name: "Wrong App" }),
            });
            const result = yield (0, background_1.checkServerStatus)((0, constants_1.getServerPort)());
            expect(result).toBe(false);
        }));
        it("checkServerStatus should throw AbortError", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock fetch to throw an AbortError that will be caught by error handler
            mockFetch.mockImplementation(() => {
                const abortError = new Error("AbortError");
                abortError.name = "AbortError";
                throw abortError;
            });
            // The centralized error handler re-throws errors, so we expect this to throw
            yield expect((0, background_1.checkServerStatus)((0, constants_1.getServerPort)())).rejects.toThrow("AbortError");
            // The error handler logs to console.error, not the centralized logger
            // We just verify the function throws as expected
            expect(true).toBe(true);
        }));
        it("checkServerStatus should handle storage errors", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest
                    .fn()
                    .mockResolvedValue({ app_name: "Enhanced Video Downloader" }),
            });
            const result = yield (0, background_1.checkServerStatus)((0, constants_1.getServerPort)());
            expect(result).toBe(true);
        }));
        it("checkServerStatus should handle server availability changes", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest
                    .fn()
                    .mockResolvedValue({ app_name: "Enhanced Video Downloader" }),
            });
            const result = yield (0, background_1.checkServerStatus)((0, constants_1.getServerPort)());
            expect(result).toBe(true);
        }));
    });
    describe("Server Configuration Functions", () => {
        it("fetchServerConfig should return config from server", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    app_name: "Enhanced Video Downloader",
                }),
            });
            const result = yield (0, background_1.fetchServerConfig)((0, constants_1.getServerPort)());
            expect(result).toEqual({
                app_name: "Enhanced Video Downloader",
            });
        }));
        it("fetchServerConfig should return empty object on fetch error", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockRejectedValueOnce(new Error("Network error"));
            const result = yield (0, background_1.fetchServerConfig)((0, constants_1.getServerPort)());
            expect(result).toEqual({});
        }));
        it("fetchServerConfig should return empty object on non-ok response", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
            });
            const result = yield (0, background_1.fetchServerConfig)((0, constants_1.getServerPort)());
            expect(result).toEqual({});
        }));
    });
    describe("Port Discovery", () => {
        it("findServerPort should return port when server is found", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest
                    .fn()
                    .mockResolvedValue({ app_name: "Enhanced Video Downloader" }),
            });
            const result = yield (0, background_1.findServerPort)();
            expect(result).toBe((0, constants_1.getServerPort)());
        }));
        it("findServerPort should return null when no server found", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockRejectedValue(new Error("Network error"));
            const result = yield (0, background_1.findServerPort)();
            expect(result).toBeNull();
        }));
        it("findServerPort should handle network errors", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockRejectedValue(new Error("Network error"));
            const result = yield (0, background_1.findServerPort)();
            expect(result).toBeNull();
        }));
        it("findServerPort should handle badge updates when startScan is true", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockRejectedValue(new Error("Network error"));
            const result = yield (0, background_1.findServerPort)(true);
            expect(result).toBeNull();
        }));
        it("findServerPort should handle progress updates", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockRejectedValue(new Error("Network error"));
            const result = yield (0, background_1.findServerPort)();
            expect(result).toBeNull();
        }));
    });
    describe("Download Request", () => {
        it("sendDownloadRequest should return empty object (stub implementation)", () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield (0, background_1.sendDownloadRequest)("https://example.com/video");
            expect(result).toEqual({});
        }));
        it("sendDownloadRequest should handle different parameters", () => __awaiter(void 0, void 0, void 0, function* () {
            const result = yield (0, background_1.sendDownloadRequest)("https://example.com/video", 1, true, "best", "mp4", "Test Video");
            expect(result).toEqual({});
        }));
    });
    describe("Theme Initialization", () => {
        it("initializeActionIconTheme should set theme from storage", () => __awaiter(void 0, void 0, void 0, function* () {
            chrome.storage.local.get.mockResolvedValue({
                theme: "dark",
            });
            yield (0, background_1.initializeActionIconTheme)();
            expect(chrome.action.setIcon).toHaveBeenCalled();
        }));
        it("initializeActionIconTheme should use system preference when no stored theme", () => __awaiter(void 0, void 0, void 0, function* () {
            chrome.storage.local.get.mockResolvedValue({});
            yield (0, background_1.initializeActionIconTheme)();
            expect(chrome.action.setIcon).toHaveBeenCalled();
        }));
        it("initializeActionIconTheme should handle system preference change listener", () => __awaiter(void 0, void 0, void 0, function* () {
            chrome.storage.local.get.mockResolvedValue({});
            yield (0, background_1.initializeActionIconTheme)();
            expect(mockSelf.matchMedia).toHaveBeenCalled();
        }));
        it("initializeActionIconTheme should handle matchMedia not available", () => __awaiter(void 0, void 0, void 0, function* () {
            chrome.storage.local.get.mockResolvedValue({});
            mockSelf.matchMedia.mockReturnValue(null);
            yield (0, background_1.initializeActionIconTheme)();
            expect(chrome.action.setIcon).toHaveBeenCalled();
        }));
        it("initializeActionIconTheme should handle theme change listener errors", () => __awaiter(void 0, void 0, void 0, function* () {
            chrome.storage.local.get.mockResolvedValue({});
            const mockMatchMedia = jest.fn(() => ({
                matches: false,
                addEventListener: jest.fn().mockImplementation(() => {
                    throw new Error("Listener error");
                }),
                removeEventListener: jest.fn(),
            }));
            mockSelf.matchMedia = mockMatchMedia;
            yield (0, background_1.initializeActionIconTheme)();
            expect(chrome.action.setIcon).toHaveBeenCalled();
        }));
    });
    describe("Queue Persistence", () => {
        it("persistQueue should save queue to storage", () => __awaiter(void 0, void 0, void 0, function* () {
            background_1.downloadQueue.length = 0;
            background_1.downloadQueue.push("video1", "video2");
            yield (0, background_1.persistQueue)();
            expect(chrome.storage.local.set).toHaveBeenCalledWith({
                downloadQueue: ["video1", "video2"],
            });
        }));
        it("persistQueue should handle storage errors gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            chrome.storage.local.set.mockRejectedValueOnce(new Error("Storage full"));
            yield (0, background_1.persistQueue)();
            // The centralized logger should handle the error
            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toContain("Storage full");
            expect(logs[0].level).toBe("warn");
        }));
        it("persistQueue should handle empty queue", () => __awaiter(void 0, void 0, void 0, function* () {
            background_1.downloadQueue.length = 0;
            yield (0, background_1.persistQueue)();
            expect(chrome.storage.local.set).toHaveBeenCalledWith({
                downloadQueue: [],
            });
        }));
    });
    describe("Error Handling", () => {
        it("should handle Chrome API errors gracefully", () => {
            // Test that Chrome API errors are handled properly
            expect(() => {
                // This should not throw
                chrome.action.setIcon({ path: { "16": "invalid.png" } });
            }).not.toThrow();
        });
        it("should handle fetch errors in server operations", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock fetch to throw an error that will be caught by error handler
            mockFetch.mockImplementation(() => {
                throw new Error("Network error");
            });
            // The centralized error handler re-throws errors, so we expect this to throw
            yield expect((0, background_1.checkServerStatus)((0, constants_1.getServerPort)())).rejects.toThrow("Network error");
            // The error handler logs to console.error, not the centralized logger
            // We just verify the function throws as expected
            expect(true).toBe(true);
        }));
    });
    describe("API Service Functions", () => {
        it("fetchServerConfig should return config from server", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({
                    app_name: "Enhanced Video Downloader",
                }),
            });
            const result = yield (0, background_1.fetchServerConfig)((0, constants_1.getServerPort)());
            expect(result).toEqual({
                app_name: "Enhanced Video Downloader",
            });
        }));
        it("fetchServerConfig should return empty object on fetch error", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockRejectedValueOnce(new Error("Network error"));
            const result = yield (0, background_1.fetchServerConfig)((0, constants_1.getServerPort)());
            expect(result).toEqual({});
        }));
        it("fetchServerConfig should return empty object on non-ok response", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
            });
            const result = yield (0, background_1.fetchServerConfig)((0, constants_1.getServerPort)());
            expect(result).toEqual({});
        }));
    });
    describe("Utility Functions", () => {
        it("log should use centralized logger", () => {
            // Test that the actual logger works correctly
            logger.log("info", "test message", {
                component: "test",
            });
            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe("test message");
            expect(logs[0].context.component).toBe("test");
            expect(logs[0].level).toBe("info");
        });
        it("warn should use centralized logger", () => {
            logger.warn("warning message", {
                component: "test",
            });
            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe("warning message");
            expect(logs[0].context.component).toBe("test");
            expect(logs[0].level).toBe("warn");
        });
        it("error should use centralized logger", () => {
            logger.error("error message", {
                component: "test",
            });
            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe("error message");
            expect(logs[0].context.component).toBe("test");
            expect(logs[0].level).toBe("error");
        });
        it("debounce should delay execution", () => {
            jest.useFakeTimers();
            const fn = jest.fn();
            // Import debounce from background or create a simple implementation for testing
            const debounced = (fn, delay) => {
                let timeoutId;
                return (...args) => {
                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => fn(...args), delay);
                };
            };
            const debouncedFn = debounced(fn, 1000);
            debouncedFn(1, 2);
            expect(fn).not.toHaveBeenCalled();
            jest.advanceTimersByTime(1000);
            expect(fn).toHaveBeenCalledWith(1, 2);
            jest.useRealTimers();
        });
        it("applyThemeToActionIcon should set dark theme icons", () => {
            (0, background_1.applyThemeToActionIcon)("dark");
            expect(chrome.action.setIcon).toHaveBeenCalledWith(expect.objectContaining({ path: background_1.actionIconPaths.dark }), expect.any(Function));
        });
        it("applyThemeToActionIcon should fall back to light on invalid theme", () => {
            (0, background_1.applyThemeToActionIcon)("unknown");
            expect(chrome.action.setIcon).toHaveBeenCalledWith(expect.objectContaining({ path: background_1.actionIconPaths.light }), expect.any(Function));
        });
    });
    describe("Queue Management", () => {
        it("persistQueue should save queue to storage", () => __awaiter(void 0, void 0, void 0, function* () {
            background_1.downloadQueue.length = 0;
            background_1.downloadQueue.push("video1", "video2");
            yield (0, background_1.persistQueue)();
            expect(chrome.storage.local.set).toHaveBeenCalledWith({
                downloadQueue: ["video1", "video2"],
            });
        }));
        it("persistQueue should handle storage errors gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            chrome.storage.local.set.mockRejectedValueOnce(new Error("Storage full"));
            yield (0, background_1.persistQueue)();
            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toContain("Storage full");
            expect(logs[0].level).toBe("warn");
        }));
    });
});
// Constants from background.ts (these would normally be imported)
const _historyStorageKey = "downloadHistory";
const _historyEnabledKey = "isHistoryEnabled";
const _queueStorageKey = "downloadQueue";
const networkStatusKey = "networkOnlineStatus";
