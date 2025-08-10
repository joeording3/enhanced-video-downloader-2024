/**
 * Tests for background.ts message routing and icon/theme updates
 */
// @ts-nocheck


// background module will be imported dynamically inside tests to register listeners

describe("background message routing", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
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
    await Promise.resolve();
    expect(cb).toHaveBeenCalled();
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
    await Promise.resolve();
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ status: "error" }));
    const cb2 = jest.fn();
    await handler({ type: "clearLogs" }, {}, cb2);
    jest.runAllTimers?.();
    await Promise.resolve();
    expect(cb2).toHaveBeenCalledWith(expect.objectContaining({ status: "error" }));
  });
});
