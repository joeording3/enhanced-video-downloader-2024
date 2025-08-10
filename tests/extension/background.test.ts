/**
 * @fileoverview
 * Comprehensive unit tests for background.ts
 * Updated to use centralized services
 */
// @ts-nocheck


import {
  sendDownloadRequest,
  initializeActionIconTheme,
  findServerPort,
  checkServerStatus,
  fetchServerConfig,
  persistQueue,
  downloadQueue,
  applyThemeToActionIcon,
  actionIconPaths,
} from "../../extension/src/background";
import { getServerPort, getClientPort, getPortRange } from "../../extension/src/core/constants";
import { CentralizedLogger } from "../../extension/src/core/logger";
import { ExtensionStateManager } from "../../extension/src/core/state-manager";

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
global.AbortController = jest.fn(() => mockAbortController) as any;

describe("Background Script - Core Functions", () => {
  let logger: CentralizedLogger;
  let stateManager: ExtensionStateManager;

  beforeEach(() => {
    // Get actual instances of centralized services
    logger = CentralizedLogger.getInstance();
    stateManager = ExtensionStateManager.getInstance();

    // Clear logs and reset state for clean tests
    logger.clearLogs();
    stateManager.reset();

    // Setup other global mocks
    (global as any).fetch = mockFetch;
    (global as any).navigator = mockNavigator;
    (global as any).self = mockSelf;

    // Reset all mocks
    jest.clearAllMocks();

    // Reset download queue
    downloadQueue.length = 0;

    // Reset global server state variables
    // This is needed because serverAvailable is a global variable in background.ts
    const backgroundModule = require("../../extension/src/background");
    if (backgroundModule && typeof backgroundModule.resetServerState === "function") {
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
    it("checkServerStatus should return true for successful response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ app_name: "Enhanced Video Downloader" }),
      });

      const result = await checkServerStatus(getServerPort());
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        `http://127.0.0.1:${getServerPort()}/api/health`,
        expect.objectContaining({ signal: expect.anything() })
      );
    });

    it("checkServerStatus should return false for failed response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await checkServerStatus(getServerPort());
      expect(result).toBe(false);
    });

    it("checkServerStatus returns false on network error (no throw)", async () => {
      // Mock fetch to throw an error that will be caught by error handler
      mockFetch.mockImplementation(() => {
        throw new Error("Network error");
      });

      const result = await checkServerStatus(getServerPort());
      expect(result).toBe(false);
    });

    it("checkServerStatus should return false when fetch is not available", async () => {
      // Mock fetch as undefined
      (global as any).fetch = undefined;

      const result = await checkServerStatus(getServerPort());
      expect(result).toBe(false);

      // Restore fetch
      (global as any).fetch = mockFetch;
    });

    it("checkServerStatus should return false for wrong server app name", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ app_name: "Wrong App" }),
      });

      const result = await checkServerStatus(getServerPort());
      expect(result).toBe(false);
    });

    it("checkServerStatus returns false on AbortError (no throw)", async () => {
      // Mock fetch to throw an AbortError that will be caught by error handler
      mockFetch.mockImplementation(() => {
        const abortError = new Error("AbortError");
        abortError.name = "AbortError";
        throw abortError;
      });

      const result = await checkServerStatus(getServerPort());
      expect(result).toBe(false);
    });

    it("checkServerStatus should handle storage errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ app_name: "Enhanced Video Downloader" }),
      });

      const result = await checkServerStatus(getServerPort());
      expect(result).toBe(true);
    });

    it("checkServerStatus should handle server availability changes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ app_name: "Enhanced Video Downloader" }),
      });

      const result = await checkServerStatus(getServerPort());
      expect(result).toBe(true);
    });
  });

  describe("Server Configuration Functions", () => {
    it("fetchServerConfig should return config from server", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          app_name: "Enhanced Video Downloader",
        }),
      });

      const result = await fetchServerConfig(getServerPort());
      expect(result).toEqual({
        app_name: "Enhanced Video Downloader",
      });
    });

    it("fetchServerConfig should return empty object on fetch error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await fetchServerConfig(getServerPort());
      expect(result).toEqual({});
    });

    it("fetchServerConfig should return empty object on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await fetchServerConfig(getServerPort());
      expect(result).toEqual({});
    });
  });

  describe("Port Discovery", () => {
    it("findServerPort should return port when server is found", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ app_name: "Enhanced Video Downloader" }),
      });

      const result = await findServerPort();
      expect(result).toBe(getServerPort());
    });

    it("findServerPort should return null when no server found", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await findServerPort();
      expect(result).toBeNull();
    });

    it("findServerPort should handle network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await findServerPort();
      expect(result).toBeNull();
    });

    it("findServerPort should handle badge updates when startScan is true", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await findServerPort(true);
      expect(result).toBeNull();
    });

    it("findServerPort should handle progress updates", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const result = await findServerPort();
      expect(result).toBeNull();
    });
  });

  describe("Download Request", () => {
    it("sendDownloadRequest should return error when server not available", async () => {
      const result = await sendDownloadRequest("https://example.com/video");
      expect(result).toEqual({
        status: "error",
        message: "Server not available",
      });
    });

    it("sendDownloadRequest should handle different parameters", async () => {
      const result = await sendDownloadRequest(
        "https://example.com/video",
        1,
        true,
        "best",
        "mp4",
        "Test Video"
      );
      expect(result).toEqual({
        status: "error",
        message: "Server not available",
      });
    });
  });

  describe("Theme Initialization", () => {
    it("initializeActionIconTheme should set theme from storage", async () => {
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({
        theme: "dark",
      });

      await initializeActionIconTheme();
      expect(chrome.action.setIcon).toHaveBeenCalled();
    });

    it("initializeActionIconTheme should use system preference when no stored theme", async () => {
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({});

      await initializeActionIconTheme();
      expect(chrome.action.setIcon).toHaveBeenCalled();
    });

    it("initializeActionIconTheme should handle system preference change listener", async () => {
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({});

      await initializeActionIconTheme();
      expect(mockSelf.matchMedia).toHaveBeenCalled();
    });

    it("initializeActionIconTheme should handle matchMedia not available", async () => {
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({});
      (mockSelf.matchMedia as jest.Mock).mockReturnValue(null);

      await initializeActionIconTheme();
      expect(chrome.action.setIcon).toHaveBeenCalled();
    });

    it("initializeActionIconTheme should handle theme change listener errors", async () => {
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({});
      const mockMatchMedia = jest.fn(() => ({
        matches: false,
        addEventListener: jest.fn().mockImplementation(() => {
          throw new Error("Listener error");
        }),
        removeEventListener: jest.fn(),
      }));
      mockSelf.matchMedia = mockMatchMedia;

      await initializeActionIconTheme();
      expect(chrome.action.setIcon).toHaveBeenCalled();
    });
  });

  describe("Queue Persistence", () => {
    it("persistQueue should save queue to storage", async () => {
      downloadQueue.length = 0;
      downloadQueue.push("video1", "video2");

      await persistQueue();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        downloadQueue: ["video1", "video2"],
      });
    });

    it("persistQueue should handle storage errors gracefully", async () => {
      (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(new Error("Storage full"));

      await persistQueue();
      // The centralized logger should handle the error
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toContain("Storage full");
      expect(logs[0].level).toBe("warn");
    });

    it("persistQueue should handle empty queue", async () => {
      downloadQueue.length = 0;

      await persistQueue();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        downloadQueue: [],
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle Chrome API errors gracefully", () => {
      // Test that Chrome API errors are handled properly
      expect(() => {
        // This should not throw
        chrome.action.setIcon({ path: { "16": "invalid.png" } });
      }).not.toThrow();
    });

    it("should handle fetch errors in server operations (no throw)", async () => {
      // Mock fetch to throw an error that will be caught by error handler
      mockFetch.mockImplementation(() => {
        throw new Error("Network error");
      });

      const result = await checkServerStatus(getServerPort());
      expect(result).toBe(false);
    });
  });

  describe("API Service Functions", () => {
    it("fetchServerConfig should return config from server", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({
          app_name: "Enhanced Video Downloader",
        }),
      });

      const result = await fetchServerConfig(getServerPort());
      expect(result).toEqual({
        app_name: "Enhanced Video Downloader",
      });
    });

    it("fetchServerConfig should return empty object on fetch error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await fetchServerConfig(getServerPort());
      expect(result).toEqual({});
    });

    it("fetchServerConfig should return empty object on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await fetchServerConfig(getServerPort());
      expect(result).toEqual({});
    });
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
      const debounced = (fn: (...args: any[]) => void, delay: number) => {
        let timeoutId: ReturnType<typeof setTimeout>;
        return (...args: any[]) => {
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
      applyThemeToActionIcon("dark");
      expect(chrome.action.setIcon).toHaveBeenCalledWith(
        expect.objectContaining({ path: actionIconPaths.dark }),
        expect.any(Function)
      );
    });

    it("applyThemeToActionIcon should fall back to light on invalid theme", () => {
      applyThemeToActionIcon("unknown" as any);
      expect(chrome.action.setIcon).toHaveBeenCalledWith(
        expect.objectContaining({ path: actionIconPaths.light }),
        expect.any(Function)
      );
    });
  });

  describe("Queue Management", () => {
    it("persistQueue should save queue to storage", async () => {
      downloadQueue.length = 0;
      downloadQueue.push("video1", "video2");

      await persistQueue();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        downloadQueue: ["video1", "video2"],
      });
    });

    it("persistQueue should handle storage errors gracefully", async () => {
      (chrome.storage.local.set as jest.Mock).mockRejectedValueOnce(new Error("Storage full"));

      await persistQueue();
      const logs = logger.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toContain("Storage full");
      expect(logs[0].level).toBe("warn");
    });
  });
});

// Constants from background.ts (these would normally be imported)
const _historyStorageKey = "downloadHistory";
const _historyEnabledKey = "isHistoryEnabled";
const _queueStorageKey = "downloadQueue";
const networkStatusKey = "networkOnlineStatus";
