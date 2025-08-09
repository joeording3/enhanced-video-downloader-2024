/**
 * Tests for background.ts message routing and icon/theme updates
 */

// background module will be imported dynamically inside tests to register listeners

describe("background message routing", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("handles getServerStatus message", async () => {
    await import("../background");
    const cb = jest.fn();
    // simulate sendMessage listener invocation
    const handler = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
    await handler({ type: "getServerStatus" }, {}, cb);
    expect(cb).toHaveBeenCalled();
  });

  it("handles getLogs and clearLogs gracefully when no port", async () => {
    await import("../background");
    const handler = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
    const cb = jest.fn();
    await handler({ type: "getLogs", lines: 10, recent: true }, {}, cb);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ status: "error" }));
    const cb2 = jest.fn();
    await handler({ type: "clearLogs" }, {}, cb2);
    expect(cb2).toHaveBeenCalledWith(expect.objectContaining({ status: "error" }));
  });
});

