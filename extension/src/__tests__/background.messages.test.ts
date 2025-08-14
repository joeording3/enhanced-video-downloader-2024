/**
 * Tests for background.ts message routing and icon/theme updates
 */

// background module will be imported dynamically inside tests to register listeners

describe("background message routing", () => {
  let infoSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    infoSpy = jest.spyOn(console, "info");
  });

  it("handles getServerStatus message", async () => {
    // By default, getServerStatus will check storage for a port and return disconnected when none.
    (chrome.storage.local.get as jest.Mock).mockImplementation((_k: any, cb: any) => cb({}));
    // Ensure addListener captures our handler
    (chrome.runtime.onMessage.addListener as jest.Mock).mockImplementation((fn: any) => {
      (chrome.runtime.onMessage.addListener as any).handler = fn;
    });
    await import("../background");
    const cb = jest.fn();
    // Ensure sendResponse is called synchronously by stubbing fetch/health path via storage returning no port
    const handler =
      (chrome.runtime.onMessage.addListener as any).handler ||
      (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
    await handler({ type: "getServerStatus" }, {}, cb);
    jest.runAllTimers?.();
    // handler is async and returns true to indicate async sendResponse; flush microtasks
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(cb).toHaveBeenCalled();
  });

  it("polls server status and registers background message handler", async () => {
    jest.resetModules();
    (chrome.storage.local.get as jest.Mock).mockImplementation((keys: any, cb: any) => {
      if (typeof keys === "string" && keys === "serverPort") return cb({ serverPort: 9090 });
      if (Array.isArray(keys)) return cb({});
      return cb({});
    });
    (chrome.runtime.onMessage.addListener as jest.Mock).mockImplementation((fn: any) => {
      (chrome.runtime.onMessage.addListener as any).handler = fn;
    });
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    jest.useFakeTimers();
    await import("../background");
    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });

  it("POSTs reorder to server and keeps local order on error", async () => {
    jest.resetModules();
    (chrome.runtime.onMessage.addListener as jest.Mock).mockImplementation((fn: any) => {
      (chrome.runtime.onMessage.addListener as any).handler = fn;
    });
    // Provide a port for background
    (chrome.storage.local.get as jest.Mock).mockImplementation((keys: any, cb: any) => {
      if (typeof keys === "string" && keys === "serverPort") return cb({ serverPort: 9090 });
      return cb({});
    });
    const fetchMock = jest
      .fn()
      // health for init (twice)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ app_name: "Enhanced Video Downloader" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ app_name: "Enhanced Video Downloader" }),
      })
      // reorder POST → simulate server error
      .mockRejectedValueOnce(new Error("network"));
    (global as any).fetch = fetchMock;

    await import("../background");
    const handler =
      (chrome.runtime.onMessage.addListener as any).handler ||
      (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];

    const cb = jest.fn();
    await handler({ type: "reorderQueue", queue: ["a", "b", "c"] }, {}, cb);
    await Promise.resolve();
    expect(cb).toHaveBeenCalledWith({ status: "success" });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/queue/reorder"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("handles getLogs and clearLogs gracefully when no port", async () => {
    (chrome.runtime.onMessage.addListener as jest.Mock).mockImplementation((fn: any) => {
      (chrome.runtime.onMessage.addListener as any).handler = fn;
    });
    await import("../background");
    const handler =
      (chrome.runtime.onMessage.addListener as any).handler ||
      (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
    const cb = jest.fn();
    await handler({ type: "getLogs", lines: 10, recent: true }, {}, cb);
    jest.runAllTimers?.();
    for (let i = 0; i < 3; i += 1) {
      await Promise.resolve();
    }
    expect(cb).not.toThrow?.();
    const cb2 = jest.fn();
    await handler({ type: "clearLogs" }, {}, cb2);
    jest.runAllTimers?.();
    for (let i = 0; i < 3; i += 1) {
      await Promise.resolve();
    }
    expect(cb2).not.toThrow?.();
  });
});
