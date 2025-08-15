/* eslint-env jest */

describe("background restart and tabs messaging", () => {
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
        onMessage: {
          addListener: jest.fn((fn: any) => {
            (global as any).chrome.runtime._handler = fn;
          }),
        },
        sendMessage: jest.fn((msg: any, cb?: any) => cb && cb({})),
        lastError: null,
      },
      storage: {
        local: {
          get: jest.fn().mockImplementation((keys: any, cb?: any) => {
            const respond = (obj: any) => {
              if (typeof cb === "function") cb(obj);
              return Promise.resolve(obj);
            };
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
      tabs: {
        query: jest.fn((q: any, cb: any) => cb([{ id: 1 }, { id: 2 }])),
        sendMessage: jest.fn((id: number, msg: any, cb?: any) => cb && cb({})),
      },
    } as any;
  });

  afterEach(() => {
    (global as any).fetch = undefined;
    (global as any).chrome = originalChrome;
  });

  it("restartServer returns success when restart endpoint OK", async () => {
    const { default: _bg } = { default: await import("../background") } as any;
    void _bg;
    const handler = (chrome.runtime as any)._handler;
    (global as any).fetch = jest.fn().mockResolvedValueOnce({ ok: true, status: 200 });

    const cb = jest.fn();
    await handler({ type: "restartServer" }, {}, cb);
    await flush();
    expect(cb).toHaveBeenCalledWith({ status: "success" });
  });

  it("restartServer succeeds via managed fallback when health becomes OK", async () => {
    const { default: _bg } = { default: await import("../background") } as any;
    void _bg;
    const handler = (chrome.runtime as any)._handler;

    // Sequence: two /api/restart calls -> not ok, then managed POST throws, then health OK
    (global as any).fetch = jest
      .fn()
      // /api/restart candidates (not ok)
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      // managed restart throws to set managedMaybeStarted
      .mockImplementationOnce(() => {
        throw new Error("server restarting");
      })
      // health check OK
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const cb = jest.fn();
    await handler({ type: "restartServer" }, {}, cb);
    // allow the small retry loop/awaits
    await flush();
    await flush();
    expect(cb).toHaveBeenCalledWith({ status: "success" });
  });

  it("setContentButtonHidden broadcasts to tabs and returns success", async () => {
    const { default: _bg } = { default: await import("../background") } as any;
    void _bg;
    const handler = (chrome.runtime as any)._handler;
    const cb = jest.fn();
    await handler({ type: "setContentButtonHidden", hidden: true }, {}, cb);
    await flush();
    expect(chrome.tabs.query).toHaveBeenCalled();
    expect(chrome.tabs.sendMessage).toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ status: "success" });
  });
});
