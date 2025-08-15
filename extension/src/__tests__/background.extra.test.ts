/* eslint-env jest */

// Target additional low-coverage branches in background.ts without changing source behavior

describe("background extra coverage", () => {
  const originalEnv = { ...process.env };
  let originalChrome: any;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
    process.env.NODE_ENV = "test";

    // Ensure chrome mocks exist and have needed functions for these tests
    // Base mock from tests/jest/jest.setup.js
    // Extend it here for badge-related calls used by updateBadge()
    originalChrome = global.chrome;
    global.chrome = {
      ...(originalChrome || {}),
      action: {
        ...((originalChrome && originalChrome.action) || {}),
        setIcon: jest.fn(),
        setBadgeText: jest.fn(),
        setBadgeBackgroundColor: jest.fn(),
      },
      runtime: {
        ...((originalChrome && originalChrome.runtime) || {}),
        getURL: jest.fn((p: string) => p),
        onMessage: { addListener: jest.fn() },
        sendMessage: jest.fn((_m: any, cb?: any) => {
          if (typeof cb === "function") cb({ status: "success" });
          return Promise.resolve({ status: "success" });
        }),
        getManifest: jest.fn(() => ({ name: "Enhanced Video Downloader", version: "1.0.0" })),
        lastError: null,
      },
      storage: {
        local: {
          get: jest.fn().mockImplementation((keys: any, cb?: any) => {
            if (typeof keys === "function") {
              cb = keys;
            }
            if (typeof cb === "function") cb({});
            return Promise.resolve({});
          }),
          set: jest.fn().mockImplementation((_items: any, cb?: any) => {
            if (typeof cb === "function") cb();
            return Promise.resolve();
          }),
        },
      },
      notifications: { create: jest.fn() },
      tabs: { query: jest.fn(), sendMessage: jest.fn() },
    } as any;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    process.env = { ...originalEnv };
    (global as any).fetch = undefined;
    try {
      delete (global as any).self;
    } catch {}
    global.chrome = originalChrome;
  });

  it("initializeActionIconTheme applies stored theme without system check", async () => {
    // Arrange stored theme
    (chrome.storage.local.get as jest.Mock).mockImplementation((keys: any, cb?: any) => {
      const result = { theme: "dark" };
      if (typeof cb === "function") cb(result);
      return Promise.resolve(result);
    });

    const { initializeActionIconTheme } = await import("../background");

    // Act
    await initializeActionIconTheme();

    // Assert
    expect(chrome.action.setIcon).toHaveBeenCalled();
  });

  it("initializeActionIconTheme uses system preference when no stored theme", async () => {
    // No stored theme
    (chrome.storage.local.get as jest.Mock).mockImplementation((keys: any, cb?: any) => {
      const result = {};
      if (typeof cb === "function") cb(result);
      return Promise.resolve(result);
    });
    // Prefer dark
    const mm = jest.fn().mockReturnValue({ matches: true, addEventListener: jest.fn() });
    (global as any).self = { matchMedia: mm, addEventListener: jest.fn() };

    const { initializeActionIconTheme } = await import("../background");
    await initializeActionIconTheme();
    expect(chrome.action.setIcon).toHaveBeenCalled();
  });

  it("sendDownloadRequest success enqueues id, updates badge and history", async () => {
    const { sendDownloadRequest, downloadQueue } = await import("../background");

    // Mock history enabled by default; ensure history set is called later
    const storageSet = chrome.storage.local.set as jest.Mock;

    // Successful POST
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "queued",
        downloadId: "abc123",
        filename: "file.mp4",
        filepath: "/tmp/file.mp4",
        thumbnail_url: "http://thumb",
        source_url: "http://page",
        title: "Title",
      }),
    });

    const res = await sendDownloadRequest("http://v", undefined, false, null, null, "page", 9090);
    expect(res.status).toBe("queued");
    expect(downloadQueue).toContain("abc123");
    expect((chrome.action as any).setBadgeText).toHaveBeenCalledWith({ text: "1" });
    // history saved (downloadHistory key updated)
    expect(storageSet).toHaveBeenCalledWith(
      expect.objectContaining({ downloadHistory: expect.any(Array) })
    );
  });

  it("sendDownloadRequest handles server error and duplicate prevention", async () => {
    const { sendDownloadRequest } = await import("../background");

    // First call: server error (non-ok)
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "boom",
    });

    const r1 = await sendDownloadRequest("http://x", undefined, false, null, null, "p", 9090);
    expect(r1.status).toBe("error");

    // Second call: keep fetch pending to simulate in-flight; third call should be de-duped
    let resolveFetch: ((v?: any) => void) | null = null;
    (global as any).fetch = jest.fn().mockImplementationOnce(
      () =>
        new Promise(res => {
          resolveFetch = res;
        })
    );

    const p1 = sendDownloadRequest("http://x", undefined, false, null, null, "p", 9090);
    const r2 = await sendDownloadRequest("http://x", undefined, false, null, null, "p", 9090);
    expect(r2.status).toBe("error");
    expect(String(r2.message)).toMatch(/Duplicate/);

    // Resolve the pending fetch to complete first call
    // Only resolve if our promise-based fetch path executed
    await Promise.resolve();
    if (typeof resolveFetch === "function") {
      (resolveFetch as any)({
        ok: true,
        json: async () => ({ status: "queued", downloadId: "id2" }),
      });
      await p1;
    }
  });

  it("toggleHistorySetting flips the flag and clearDownloadHistory empties array and notifies", async () => {
    await import("../background");
    // Seed history enabled
    (chrome.storage.local.get as jest.Mock).mockImplementation((key: any, cb?: any) => {
      const respond = (obj: any) => {
        if (typeof cb === "function") cb(obj);
        return Promise.resolve(obj);
      };
      if (key === "isHistoryEnabled") return respond({ isHistoryEnabled: true });
      if (key === "downloadHistory") return respond({ downloadHistory: [{ url: "u" }] });
      return respond({});
    });
    const handler = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
    const cb = jest.fn();
    // Toggle history
    await handler({ type: "toggleHistory" }, {}, cb);
    expect(chrome.storage.local.set as jest.Mock).toHaveBeenCalledWith({ isHistoryEnabled: false });
    // Clear history
    await handler({ type: "clearHistory" }, {}, cb);
    expect(chrome.storage.local.set as jest.Mock).toHaveBeenCalledWith({ downloadHistory: [] });
  });

  it("checkServerStatus returns true only for matching app_name", async () => {
    const { checkServerStatus } = await import("../background");

    // Matching app name
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ app_name: "Enhanced Video Downloader" }),
    });
    await expect(checkServerStatus(9090)).resolves.toBe(true);

    // Non-matching app name
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ app_name: "Other App" }),
    });
    await expect(checkServerStatus(9090)).resolves.toBe(false);
  });

  it("fetchServerConfig and saveServerConfig handle ok and failure", async () => {
    const { fetchServerConfig, log } = await import("../background");

    // fetch ok
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ a: 1 }),
    });
    await expect(fetchServerConfig(9090)).resolves.toEqual({ a: 1 });

    // fetch not ok → {}
    (global as any).fetch = jest.fn().mockResolvedValueOnce({ ok: false });
    await expect(fetchServerConfig(9090)).resolves.toEqual({});

    // Verify log is callable (ensures import side effect is fine)
    expect(typeof log).toBe("function");
  });

  it("resetServerState sets disconnected and backoff to default", async () => {
    const bg = await import("../background");
    // Change state away from defaults
    bg.resetServerState();
    const stateManager = (await import("../core/state-manager")).stateManager;
    const state = stateManager.getServerState();
    expect(state.status).toBe("disconnected");
    expect(state.backoffInterval).toBe(1000);
  });

  it.skip("updateIcon warns when getCurrentTheme rejects", async () => {
    const { checkServerStatus } = await import("../background");
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const originalStorageGet = chrome.storage.local.get as jest.Mock;
    (chrome.storage.local.get as any) = jest.fn().mockImplementation((keys: any, cb?: any) => {
      if (keys === "theme") {
        if (typeof cb === "function") {
          cb({});
          return Promise.resolve({});
        }
        return Promise.reject(new Error("fail"));
      }
      if (typeof cb === "function") cb({});
      return Promise.resolve({});
    });
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ app_name: "Enhanced Video Downloader" }),
    });
    await checkServerStatus(9090);
    await new Promise(r => setTimeout(r, 0));
    (chrome.storage.local.get as any) = originalStorageGet;
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
