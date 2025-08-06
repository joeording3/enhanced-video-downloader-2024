/* eslint-env jest */
import * as popup from "extension/src/popup";

describe("Popup Queue Controls", () => {
  beforeEach(() => {
    // Prepare minimal DOM container
    document.body.innerHTML = '<ul id="download-status"></ul>';
    // Stub chrome runtime
    // @ts-expect-error - Mocking Chrome API for testing
    global.chrome = { runtime: { sendMessage: jest.fn() } };
  });

  it("createActiveListItem pause button calls pauseDownload", () => {
    const li = popup.createActiveListItem("idPause", {
      status: "running",
      progress: 75,
      filename: "test.mp4",
    });
    const btn = li.querySelector<HTMLButtonElement>("button.pause-button");
    expect(btn).not.toBeNull();
    btn!.click();
    expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: "pauseDownload", downloadId: "idPause" },
      expect.any(Function)
    );
  });

  it("renderDownloadStatus resume button calls resumeDownload for paused items", () => {
    // Simulate paused active item
    popup.renderDownloadStatus({
      active: { idResume: { status: "paused", progress: 0 } },
      queue: [],
    });
    const resumeBtn = document.querySelector<HTMLButtonElement>(
      "button.resume-button"
    );
    expect(resumeBtn).not.toBeNull();
    resumeBtn!.click();
    expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: "resumeDownload", downloadId: "idResume" },
      expect.any(Function)
    );
  });
});
