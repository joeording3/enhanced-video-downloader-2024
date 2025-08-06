import { persistQueue, downloadQueue } from "../background";

describe("persistQueue", () => {
  beforeEach(() => {
    // Use the global chrome mock from jest.setup.js
    // Reset queue
    downloadQueue.length = 0;
  });

  it("persists the downloadQueue to chrome.storage", async () => {
    downloadQueue.push("video1");
    await persistQueue();
    expect(chrome.storage.local.set as jest.Mock).toHaveBeenCalledWith({
      downloadQueue: ["video1"],
    });
  });

  it("handles errors without throwing", async () => {
    (chrome.storage.local.set as jest.Mock).mockImplementation(() =>
      Promise.reject(new Error("fail"))
    );
    await expect(persistQueue()).resolves.toBeUndefined();
  });
});
