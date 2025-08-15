/* eslint-env jest */

describe("background config and history behaviors", () => {
  let originalChrome: any;
  const flush = async () => new Promise<void>(resolve => setTimeout(resolve, 0));

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    originalChrome = (global as any).chrome;
    (global as any).chrome = {
      action: {
        setIcon: jest.fn(),
        setBadgeText: jest.fn(),
        setBadgeBackgroundColor: jest.fn(),
      },
      runtime: {
        getManifest: jest.fn(() => ({ name: "Enhanced Video Downloader", version: "1.0.0" })),
        onMessage: { addListener: jest.fn() },
        sendMessage: jest.fn((m: any, cb?: any) => cb && cb({})),
        lastError: null,
      },
      storage: {
        local: {
          get: jest.fn().mockImplementation((keys: any, cb?: any) => {
            const respond = (obj: any) => {
              if (typeof cb === "function") cb(obj);
              return Promise.resolve(obj);
            };
            // Default: provide a serverPort so getConfig can hit fetch path
            if (typeof keys === "string") {
              if (keys === "serverPort") return respond({ serverPort: 9090 });
              if (keys === "theme") return respond({ theme: "light" });
              return respond({});
            }
            if (Array.isArray(keys)) {
              const obj: any = {};
              if (keys.includes("serverPort")) obj.serverPort = 9090;
              if (keys.includes("theme")) obj.theme = "light";
              return respond(obj);
            }
            return respond({});
          }),
          set: jest.fn((obj: any, cb?: any) => {
            if (typeof cb === "function") cb();
            return Promise.resolve(obj);
          }),
        },
      },
      notifications: { create: jest.fn() },
      tabs: { query: jest.fn(), sendMessage: jest.fn() },
    } as any;
  });

  afterEach(() => {
    (global as any).fetch = undefined;
    (global as any).chrome = originalChrome;
  });

  it("toggleHistorySetting flips isHistoryEnabled boolean", async () => {
    let histEnabled = true;
    (chrome.storage.local.get as jest.Mock).mockImplementation((key: any, cb?: any) => {
      const respond = (obj: any) => {
        if (typeof cb === "function") cb(obj);
        return Promise.resolve(obj);
      };
      if (key === "isHistoryEnabled") return respond({ isHistoryEnabled: histEnabled });
      return respond({});
    });

    const { default: _bg } = { default: await import("../background") } as any;
    void _bg;
    const handler = (chrome.runtime.onMessage as any).addListener.mock.calls[0][0];

    const cb1 = jest.fn();
    await handler({ type: "toggleHistory" }, {}, cb1);
    await flush();
    // Expect it to set to !histEnabled
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ isHistoryEnabled: !histEnabled });
    histEnabled = !histEnabled;

    const cb2 = jest.fn();
    await handler({ type: "toggleHistory" }, {}, cb2);
    await flush();
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ isHistoryEnabled: !histEnabled });
  });

  it("getConfig returns server config when fetch succeeds", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ a: 1 }) });
    const { default: _bg } = { default: await import("../background") } as any;
    void _bg;
    const handler = (chrome.runtime.onMessage as any).addListener.mock.calls[0][0];
    const cb = jest.fn();
    await handler({ type: "getConfig" }, {}, cb);
    await flush();
    expect(cb).toHaveBeenCalledWith({ status: "success", data: { a: 1 } });
  });

  it("getConfig falls back to cached serverConfig when fetch fails", async () => {
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: false });
    // Provide cached serverConfig
    const originalGet = chrome.storage.local.get as jest.Mock;
    (chrome.storage.local.get as jest.Mock) = jest
      .fn()
      .mockImplementation((keys: any, cb?: any) => {
        const respond = (obj: any) => {
          if (typeof cb === "function") cb(obj);
          return Promise.resolve(obj);
        };
        if (typeof keys === "string") {
          if (keys === "serverPort") return respond({ serverPort: 9090 });
          if (keys === "serverConfig") return respond({ serverConfig: { foo: "bar" } });
          return respond({});
        }
        if (Array.isArray(keys)) {
          const obj: any = {};
          if (keys.includes("serverPort")) obj.serverPort = 9090;
          if (keys.includes("serverConfig")) obj.serverConfig = { foo: "bar" };
          return respond(obj);
        }
        return respond({});
      });

    const { default: _bg } = { default: await import("../background") } as any;
    void _bg;
    const handler = (chrome.runtime.onMessage as any).addListener.mock.calls[0][0];
    const cb = jest.fn();
    await handler({ type: "getConfig" }, {}, cb);
    await flush();
    expect(cb).toHaveBeenCalledWith({ status: "success", data: { foo: "bar" } });

    // restore get mock if needed
    (chrome.storage.local.get as any) = originalGet;
  });

  it("getConfig responds with a status even when storage lacks a cached port", async () => {
    (chrome.storage.local.get as jest.Mock).mockImplementation((keys: any, cb?: any) => {
      const respond = (obj: any) => {
        if (typeof cb === "function") cb(obj);
        return Promise.resolve(obj);
      };
      // Return nothing so code relies on default port fallback
      return respond({});
    });
    const { default: _bg } = { default: await import("../background") } as any;
    void _bg;
    const handler = (chrome.runtime.onMessage as any).addListener.mock.calls[0][0];
    const cb = jest.fn();
    await handler({ type: "getConfig" }, {}, cb);
    await flush();
    expect(typeof cb.mock.calls[0][0].status).toBe("string");
  });

  it("sendDownloadRequest does not persist history when disabled", async () => {
    // Configure isHistoryEnabled false and valid port
    (chrome.storage.local.get as jest.Mock).mockImplementation((keys: any, cb?: any) => {
      const respond = (obj: any) => {
        if (typeof cb === "function") cb(obj);
        return Promise.resolve(obj);
      };
      if (typeof keys === "string") {
        if (keys === "serverPort") return respond({ serverPort: 9090 });
        if (keys === "isHistoryEnabled") return respond({ isHistoryEnabled: false });
        return respond({});
      }
      if (Array.isArray(keys)) {
        const obj: any = {};
        if (keys.includes("serverPort")) obj.serverPort = 9090;
        if (keys.includes("isHistoryEnabled")) obj.isHistoryEnabled = false;
        return respond(obj);
      }
      return respond({});
    });

    const { sendDownloadRequest } = await import("../background");
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "queued", downloadId: "hid" }),
    });
    await sendDownloadRequest("http://hist", undefined, false, null, null, "p", 9090);

    // Ensure downloadHistory was not persisted
    const setCalls = (chrome.storage.local.set as jest.Mock).mock.calls;
    const hadHistorySet = setCalls.some(args => Boolean(args[0]?.downloadHistory));
    expect(hadHistorySet).toBe(false);
  });
});
