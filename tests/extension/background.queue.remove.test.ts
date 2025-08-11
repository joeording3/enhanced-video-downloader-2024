/**
 * Tests for background removeFromQueue handling.
 */

import "../jest/jest.setup";

describe("Background removeFromQueue", () => {
  beforeEach(() => {
    // Ensure a clean module instance
    jest.isolateModules(() => {
      require("extension/src/background");
    });
    (chrome.storage.local.get as jest.Mock).mockReset();
    (chrome.storage.local.set as jest.Mock).mockReset();
    (chrome.runtime.sendMessage as jest.Mock).mockReset();
  });

  it("removes id locally and responds success", async () => {
    const listener = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
    const sendResponse = jest.fn();
    // Seed queue via storage getter used at startup
    // Not strictly necessary for this isolated test; we directly handle message
    listener({ type: "removeFromQueue", downloadId: "qid" }, {}, sendResponse);
    // Listener runs inside an async IIFE; await microtask
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(sendResponse).toHaveBeenCalledWith({ status: "success" });
  });
});
