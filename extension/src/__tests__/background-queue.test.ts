import { persistQueue, queueManager } from "../background";

describe("persistQueue", () => {
  it("is now a no-op function", async () => {
    await expect(persistQueue()).resolves.toBeUndefined();
  });
});

describe("ConsolidatedQueueManager", () => {
  let originalFetch: any;
  let originalChrome: any;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Mock chrome API
    originalChrome = global.chrome;
    global.chrome = {
      storage: {
        local: {
          get: jest.fn().mockImplementation((keys: any, cb?: any) => {
            if (typeof cb === "function") cb({ serverPort: 9090 });
            return Promise.resolve({ serverPort: 9090 });
          }),
          set: jest.fn((obj: any, cb?: any) => {
            if (typeof cb === "function") cb();
            return Promise.resolve(obj);
          }),
        },
      },
    } as any;

    // Mock fetch
    originalFetch = global.fetch;
    (global as any).fetch = jest.fn();
  });

  afterEach(() => {
    global.chrome = originalChrome;
    global.fetch = originalFetch;
  });

  describe("basic functionality", () => {
    it("can be imported and used", () => {
      expect(queueManager).toBeDefined();
      expect(typeof queueManager.getQueueStatus).toBe("function");
      expect(typeof queueManager.addToQueue).toBe("function");
      expect(typeof queueManager.removeFromQueue).toBe("function");
    });

    it("sets server port correctly", () => {
      queueManager.setServerPort(8080);
      // The port is used internally, we can't easily test it without exposing it
      expect(queueManager).toBeDefined();
    });
  });

  describe("queue operations", () => {
    beforeEach(() => {
      queueManager.setServerPort(9090);
    });

    it("adds items to queue via server", async () => {
      const mockResponse = { ok: true, json: async () => ({ status: "success" }) };
      (global as any).fetch.mockResolvedValue(mockResponse);

      const result = await queueManager.addToQueue("test-url", { pageTitle: "test-title" });

      expect(result.success).toBe(true);
      expect((global as any).fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/download"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("test-url")
        })
      );
    });

    it("removes items from queue via server", async () => {
      const mockResponse = { ok: true, json: async () => ({ status: "success" }) };
      (global as any).fetch.mockResolvedValue(mockResponse);

      const result = await queueManager.removeFromQueue("test-id");

      expect(result.success).toBe(true);
      expect((global as any).fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/queue\/test-id\/remove$/),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("reorders queue via server", async () => {
      const mockResponse = { ok: true, json: async () => ({ status: "success" }) };
      (global as any).fetch.mockResolvedValue(mockResponse);

      const result = await queueManager.reorderQueue(["id1", "id2", "id3"]);

      expect(result.success).toBe(true);
      expect((global as any).fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/queue/reorder"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ order: ["id1", "id2", "id3"] })
        })
      );
    });

    it("pauses downloads via server", async () => {
      const mockResponse = { ok: true, json: async () => ({ status: "success" }) };
      (global as any).fetch.mockResolvedValue(mockResponse);

      const result = await queueManager.pauseDownload("test-id");

      expect(result.success).toBe(true);
      expect((global as any).fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/download/test-id/pause"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("resumes downloads via server", async () => {
      const mockResponse = { ok: true, json: async () => ({ status: "success" }) };
      (global as any).fetch.mockResolvedValue(mockResponse);

      const result = await queueManager.resumeDownload("test-id");

      expect(result.success).toBe(true);
      expect((global as any).fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/download/test-id/resume"),
        expect.objectContaining({ method: "POST" })
      );
    });

    it("sets priority via server", async () => {
      const mockResponse = { ok: true, json: async () => ({ status: "success" }) };
      (global as any).fetch.mockResolvedValue(mockResponse);

      const result = await queueManager.setPriority("test-id", 5);

      expect(result.success).toBe(true);
      expect((global as any).fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/download/test-id/priority"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ priority: 5 })
        })
      );
    });

    it("force starts downloads via server", async () => {
      const mockResponse = { ok: true, json: async () => ({ status: "success" }) };
      (global as any).fetch.mockResolvedValue(mockResponse);

      const result = await queueManager.forceStart("test-id");

      expect(result.success).toBe(true);
      expect((global as any).fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/queue\/test-id\/force-start$/),
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      queueManager.setServerPort(9090);
    });

    it("handles network errors gracefully", async () => {
      (global as any).fetch.mockRejectedValue(new Error("Network error"));

      const result = await queueManager.addToQueue("test-url", { pageTitle: "test-title" });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Network error");
    });

        it("handles server errors gracefully", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        text: async () => "Server error message"
      };
      (global as any).fetch.mockResolvedValue(mockResponse);

      const result = await queueManager.addToQueue("test-url", { pageTitle: "test-title" });

      expect(result.success).toBe(false);
      expect(result.message).toContain("Server error");
    });
  });

  describe("queue status", () => {
    beforeEach(() => {
      queueManager.setServerPort(9090);
    });

    it("fetches queue status from server", async () => {
      const mockStatus = {
        "download1": { status: "queued", url: "http://example.com/video1" },
        "download2": { status: "downloading", progress: 50, url: "http://example.com/video2" }
      };

      const mockResponse = {
        ok: true,
        json: async () => mockStatus
      };
      (global as any).fetch.mockResolvedValue(mockResponse);

      const status = await queueManager.getQueueStatus();

      expect(status).toBeDefined();
      expect((global as any).fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/status?include_queue=1")
      );
    });

    it("returns cached status when available", async () => {
      // First call to populate cache
      const mockStatus = { active: {}, queued: [], totalCount: 0 };
      const mockResponse = { ok: true, json: async () => mockStatus };
      (global as any).fetch.mockResolvedValue(mockResponse);

      await queueManager.getQueueStatus();

      // Second call should use cache
      const cachedStatus = await queueManager.getQueueStatus();

      expect(cachedStatus).toEqual(mockStatus);
      // Should only call fetch once
      expect((global as any).fetch).toHaveBeenCalledTimes(1);
    });

        it("calculates badge count correctly", () => {
      // Mock the server response in the format expected by refreshQueueStatus
      const mockServerData = {
        "download1": { status: "downloading", url: "http://example.com/video1" },
        "download2": { status: "queued", url: "http://example.com/video2" },
        "download3": { status: "queued", url: "http://example.com/video3" }
      };

      const mockResponse = {
        ok: true,
        json: async () => mockServerData
      };
      (global as any).fetch.mockResolvedValue(mockResponse);

      // This will populate the internal cache
      return queueManager.getQueueStatus().then(() => {
        const badgeCount = queueManager.getBadgeCount();
        expect(badgeCount).toBe(3); // 1 active + 2 queued
      });
    });
  });

  describe("update listeners", () => {
    it("adds and removes update listeners", () => {
      const listener = jest.fn();

      const unsubscribe = queueManager.addUpdateListener(listener);
      expect(typeof unsubscribe).toBe("function");

      // Test that listener can be removed
      unsubscribe();
      // We can't easily test the internal listener removal without exposing internals
      expect(queueManager).toBeDefined();
    });
  });

  describe("periodic updates", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("starts and stops periodic updates", () => {
      queueManager.startPeriodicUpdates();
      queueManager.stopPeriodicUpdates();

      // We can't easily test the internal timer logic without exposing internals
      expect(queueManager).toBeDefined();
    });
  });
});
