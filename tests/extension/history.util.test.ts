/**
 * Tests for history module utility functions.
 *
 * Covers: history fetching, clearing, item management, storage operations,
 * and Chrome API integration with error handling.
 *
 * Uses jest.isolateModules to ensure clean state between tests.
 */

import type { HistoryEntry } from "extension/src/types";

// Note: We don't import from 'extension/src/history' at the top level
// because we will be using jest.isolateModules to get a fresh module for each test.

describe("history module", () => {
  // Use a fresh module for every test to avoid state leakage
  let historyModule: typeof import("extension/src/history");

  beforeEach(() => {
    jest.isolateModules(() => {
      historyModule = require("extension/src/history");
    });
    // Reset mocks before each test
    (chrome.storage.local.get as jest.Mock).mockClear();
    (chrome.storage.local.set as jest.Mock).mockClear();
    (chrome.runtime.sendMessage as jest.Mock).mockClear();
    (chrome.runtime.lastError as any) = null;
  });

  describe("fetchHistory", () => {
    it("returns sorted history", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementation((keys, cb) => {
        cb({
          downloadHistory: [
            { id: "1", timestamp: 1000 },
            { id: "2", timestamp: 2000 },
          ],
        });
      });
      const result = await historyModule.fetchHistory();
      expect(result.history[0].id).toBe("2");
    });

    it("returns empty history on storage error", async () => {
      (chrome.runtime.lastError as any) = { message: "fail" };
      (chrome.storage.local.get as jest.Mock).mockImplementation((keys, cb) =>
        cb({})
      );
      const result = await historyModule.fetchHistory();
      expect(result).toEqual({ history: [], totalItems: 0 });
    });
  });

  describe("clearHistory", () => {
    it("clears history from storage", async () => {
      (chrome.storage.local.set as jest.Mock).mockImplementation((items, cb) =>
        cb()
      );
      await historyModule.clearHistory();
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { [historyModule.historyStorageKey]: [] },
        expect.any(Function)
      );
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it("rejects on storage.set error", async () => {
      (chrome.runtime.lastError as any) = new Error("fail");
      (chrome.storage.local.set as jest.Mock).mockImplementation((items, cb) =>
        cb()
      );
      await expect(historyModule.clearHistory()).rejects.toThrow("fail");
    });
  });

  describe("clearHistoryAndNotify", () => {
    it("clears history and sends a notification", async () => {
      (chrome.storage.local.set as jest.Mock).mockImplementation((items, cb) =>
        cb()
      );
      await historyModule.clearHistoryAndNotify();
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { [historyModule.historyStorageKey]: [] },
        expect.any(Function)
      );
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "historyUpdated",
      });
    });
  });

  describe("removeHistoryItem", () => {
    /**
     * Tests history item removal functionality with various scenarios.
     * Verifies storage operations, error handling, and edge cases.
     */
    const mockHistory: HistoryEntry[] = [
      {
        id: "keep",
        url: "http://keep.com",
        filename: "a",
        page_title: "a",
        timestamp: "1",
        status: "completed",
        detail: "",
        error: "",
      },
      {
        id: "remove",
        url: "http://remove.com",
        filename: "b",
        page_title: "b",
        timestamp: "2",
        status: "completed",
        detail: "",
        error: "",
      },
    ];

    it("removes an item from history", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
        cb({ [historyModule.historyStorageKey]: mockHistory });
      });
      (chrome.storage.local.set as jest.Mock).mockImplementation((items, cb) =>
        cb()
      );

      await historyModule.removeHistoryItem("remove");
      const expectedHistory = [mockHistory[0]];
      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { [historyModule.historyStorageKey]: expectedHistory },
        expect.any(Function)
      );
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
    });

    it("does nothing when no id provided", async () => {
      await historyModule.removeHistoryItem(""); // Pass empty string for type safety
      expect(chrome.storage.local.set).not.toHaveBeenCalled();
    });

    it("rejects when removing an item fails", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
        cb({ [historyModule.historyStorageKey]: mockHistory });
      });
      (chrome.runtime.lastError as any) = new Error("Failed to save");
      (chrome.storage.local.set as jest.Mock).mockImplementation((items, cb) =>
        cb()
      );
      await expect(historyModule.removeHistoryItem("remove")).rejects.toThrow(
        "Failed to save"
      );
    });

    it("rejects if fetching history fails", async () => {
      (chrome.runtime.lastError as any) = new Error("Failed to fetch");
      (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
        cb({}); // Simulate error by returning no data
      });
      await expect(historyModule.removeHistoryItem("remove")).rejects.toThrow(
        "Failed to fetch"
      );
    });
  });

  describe("removeHistoryItemAndNotify", () => {
    it("removes item and sends a notification", async () => {
      const mockHistory = [
        { id: "some-id", timestamp: 1 },
        { id: "another-id", timestamp: 2 },
      ];
      (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
        cb({ [historyModule.historyStorageKey]: mockHistory });
      });
      (chrome.storage.local.set as jest.Mock).mockImplementation((items, cb) =>
        cb()
      );

      await historyModule.removeHistoryItemAndNotify("some-id");

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        {
          [historyModule.historyStorageKey]: [
            { id: "another-id", timestamp: 2 },
          ],
        },
        expect.any(Function)
      );
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: "historyUpdated",
      });
    });
  });

  describe("addToHistory", () => {
    /**
     * Tests adding new entries to history with error handling.
     * Verifies storage operations and graceful error recovery.
     */
    const newEntry: HistoryEntry = {
      id: "new-id",
      url: "http://new.com",
      filename: "c",
      page_title: "c",
      timestamp: "3",
      status: "completed",
      detail: "",
      error: "",
    };

    it("adds an item to history", async () => {
      // Mock get to return empty history
      (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
        cb({ [historyModule.historyStorageKey]: [] });
      });
      // Mock set to be successful
      (chrome.storage.local.set as jest.Mock).mockImplementation((items, cb) =>
        cb()
      );

      await historyModule.addToHistory(newEntry);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { [historyModule.historyStorageKey]: [newEntry] },
        expect.any(Function)
      );
    });

    it("resolves when getting history fails", async () => {
      // Simulate storage.get error but swallow in implementation
      (chrome.runtime.lastError as any) = new Error("Failed to get");
      (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
        cb({});
      });
      (chrome.storage.local.set as jest.Mock).mockImplementation((items, cb) =>
        cb()
      );
      await expect(
        historyModule.addToHistory(newEntry)
      ).resolves.toBeUndefined();
    });

    it("resolves when setting history fails", async () => {
      // Simulate storage.set error but swallow in implementation
      (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
        cb({ [historyModule.historyStorageKey]: [] });
      });
      (chrome.runtime.lastError as any) = new Error("Failed to set");
      (chrome.storage.local.set as jest.Mock).mockImplementation((items, cb) =>
        cb()
      );
      await expect(
        historyModule.addToHistory(newEntry)
      ).resolves.toBeUndefined();
    });
  });
});
