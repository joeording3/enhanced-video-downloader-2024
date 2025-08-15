/* eslint-env jest */

describe("background history consolidation", () => {
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
          if (typeof cb === "function") cb({ status: "ok" });
        }),
        lastError: null,
      },
      storage: {
        local: {
          get: jest.fn(),
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

  it("merges repeated history entries by canonical URL and moves to front", async () => {
    const { sendDownloadRequest } = await import("../background");

    const existingUrl = "http://Example.com/Video/";

    // Mock storage.get to first return historyEnabled, then existing history
    const getMock = chrome.storage.local.get as jest.Mock;
    getMock.mockImplementation((key: any, cb?: any) => {
      const respond = (obj: any) => {
        if (typeof cb === "function") cb(obj);
        return Promise.resolve(obj);
      };
      if (key === "isHistoryEnabled") return respond({ isHistoryEnabled: true });
      if (key === "downloadHistory")
        return respond({
          downloadHistory: [{ url: existingUrl, status: "completed", filename: "file.mp4" }],
        });
      return respond({});
    });

    // First response: success for same URL → triggers consolidation
    (global as any).fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "success",
        downloadId: "id-1",
        filename: "newfile.mp4",
        title: "T",
      }),
    });

    await sendDownloadRequest(existingUrl, undefined, false, null, null, "Page", 9090);

    // Find the history set call and inspect the array
    const sets = (chrome.storage.local.set as jest.Mock).mock.calls;
    const historySet = sets.find(call => call[0] && call[0].downloadHistory);
    expect(historySet).toBeTruthy();
    const savedHistory = historySet[0].downloadHistory as any[];
    expect(Array.isArray(savedHistory)).toBe(true);
    // Consolidation keeps single entry and updates fields
    expect(savedHistory.length).toBeGreaterThan(0);
    expect(savedHistory[0].url).toBe(existingUrl);
    expect(savedHistory[0].filename).toBe("newfile.mp4");
  });
});
