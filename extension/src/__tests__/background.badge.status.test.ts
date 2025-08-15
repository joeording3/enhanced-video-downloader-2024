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

    // Mock the queue manager to return specific badge counts
    const mockQueueManager = {
      getBadgeCount: jest
        .fn()
        .mockReturnValueOnce(1) // First call: 1 item
        .mockReturnValueOnce(99) // Many items: 99
        .mockReturnValueOnce(100), // Over 99: should show 99+
    };

    // Replace the queue manager with our mock
    const bg = await import("../background");
    (bg as any).queueManager = mockQueueManager;

    // First success → badge should become 1
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "queued", downloadId: "id-0" }),
    });
    await sendDownloadRequest("http://v0", undefined, false, null, null, "p", 9090);

    // Call the badge update function to trigger the badge change
    (bg as any)["_updateQueueAndBadge"]();
    await new Promise(r => setTimeout(r, 10));

    expect((chrome.action as any).setBadgeText).toHaveBeenCalledWith({ text: "1" });

    // Test badge capping at 99+
    (bg as any)["_updateQueueAndBadge"]();
    await new Promise(r => setTimeout(r, 10));

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

    // Mock the queue manager to return specific badge counts
    const mockQueueManager = {
      getBadgeCount: jest
        .fn()
        .mockReturnValueOnce(3) // First call: 3 items
        .mockReturnValueOnce(0), // Second call: 0 items
    };

    // Replace the queue manager with our mock
    (bg as any).queueManager = mockQueueManager;

    // Call internal combined updater
    (bg as any)["_updateQueueAndBadge"]();
    await new Promise(r => setTimeout(r, 10));

    // Call again to clear badge
    (bg as any)["_updateQueueAndBadge"]();
    await new Promise(r => setTimeout(r, 10));

    const badgeCalls = setBadgeText.mock.calls.map((c: any[]) => c[0]);
    expect(badgeCalls.length).toBeGreaterThan(0);
    // Verify last call clears badge
    expect(badgeCalls[badgeCalls.length - 1]).toEqual({ text: "" });
  });
});
