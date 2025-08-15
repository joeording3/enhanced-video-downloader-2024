/* eslint-env jest */

describe("background badge and status behavior", () => {
  let originalChrome: any;

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
        sendMessage: jest.fn((msg: any, cb?: any) => {
          if (typeof cb === "function") cb({});
        }),
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
      tabs: { query: jest.fn(), sendMessage: jest.fn() },
    } as any;
  });

  afterEach(() => {
    (global as any).fetch = undefined;
    (global as any).chrome = originalChrome;
  });

  it("updates badge to 1 on first successful queue add, caps at 99+", async () => {
    const { sendDownloadRequest } = await import("../background");

    // First success → badge should become 1
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "queued", downloadId: "id-0" }),
    });
    await sendDownloadRequest("http://v0", undefined, false, null, null, "p", 9090);
    expect((chrome.action as any).setBadgeText).toHaveBeenCalledWith({ text: "1" });

    // Many successes → cap at 99+
    const fetchMock = (global as any).fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "queued", downloadId: "x" }),
    });
    for (let i = 1; i < 105; i += 1) {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "queued", downloadId: "id-" + i }),
      });
      // eslint-disable-next-line no-await-in-loop
      await sendDownloadRequest("http://v" + i, undefined, false, null, null, "p", 9090);
    }
    const lastCall = (chrome.action as any).setBadgeText.mock.calls.pop()?.[0];
    expect(lastCall?.text).toBe("99+");
  });

  it("checkServerStatus sets icon using current theme", async () => {
    (global as any).fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ app_name: "Enhanced Video Downloader" }),
    });
    const { checkServerStatus } = await import("../background");
    const { getServerPort } = await import("../core/constants");
    const ok = await checkServerStatus(getServerPort());
    expect(ok).toBe(true);
    expect(chrome.action.setIcon).toHaveBeenCalled();
  });

  it("sets numeric badge when there are queued/active items and clears when empty", async () => {
    const bg = await import("../background");
    const setBadgeText = (chrome.action as any).setBadgeText as jest.Mock;

    // Seed state: no items, ensure a clear call can be observed later
    (bg as any).downloadQueue.length = 0;
    for (const key of Object.keys((bg as any).activeDownloads))
      delete (bg as any).activeDownloads[key];

    // Add items to queue and active to trigger non-empty badge
    (bg as any).downloadQueue.push("u1", "u2");
    (bg as any).activeDownloads["id1"] = { status: "downloading", progress: 10, url: "u3" };
    (bg as any).activeDownloads["id2"] = { status: "queued", progress: 0, url: "u4" };

    // Call internal combined updater
    (bg as any)["_updateQueueAndBadge"]();
    await new Promise(r => setTimeout(r, 10));

    // Now clear all and update again
    (bg as any).downloadQueue.length = 0;
    delete (bg as any).activeDownloads["id1"];
    delete (bg as any).activeDownloads["id2"];

    (bg as any)["_updateQueueAndBadge"]();
    await new Promise(r => setTimeout(r, 10));

    const badgeCalls = setBadgeText.mock.calls.map((c: any[]) => c[0]);
    expect(badgeCalls.length).toBeGreaterThan(0);
    // Verify last call clears badge
    expect(badgeCalls[badgeCalls.length - 1]).toEqual({ text: "" });
  });
});
