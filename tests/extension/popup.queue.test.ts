/* eslint-env jest */

import * as popup from "extension/src/popup";
import { CSS_CLASSES, DOM_SELECTORS } from "../../extension/src/core/constants";

describe("Popup Queue Controls", () => {
  beforeEach(() => {
    // Prepare minimal DOM container
    document.body.innerHTML = `<ul id="${DOM_SELECTORS.DOWNLOAD_STATUS.replace("#", "")}"></ul>`;
    // Stub chrome runtime
    //  - Mocking Chrome API for testing
    global.chrome = {
      runtime: {
        onInstalled: { addListener: jest.fn() },
        onStartup: { addListener: jest.fn() },
        lastError: null,
        sendMessage: jest.fn(),
        getManifest: jest.fn(() => ({})),
        getURL: jest.fn(path => path),
        onMessage: { addListener: jest.fn() },
      },
      tabs: {
        query: jest.fn(),
        sendMessage: jest.fn(),
      },
      action: {
        setIcon: jest.fn(),
      },
      storage: {
        local: {
          get: jest.fn((keys: any, cb?: any) => {
            if (typeof cb === "function") cb({});
            return Promise.resolve({});
          }),
          set: jest.fn((items: any, cb?: any) => {
            if (typeof cb === "function") cb();
            return Promise.resolve();
          }),
        },
      },
      notifications: {
        create: jest.fn((id: string, opts: any, cb?: any) => {
          if (typeof cb === "function") cb(id);
        }),
      },
    } as any;
  });

  it("createActiveListItem pause button calls pauseDownload", () => {
    const li = popup.createActiveListItem("idPause", {
      status: "running",
      progress: 75,
      filename: "test.mp4",
    });
    const btn = li.querySelector<HTMLButtonElement>(`button.${CSS_CLASSES.PAUSE_BUTTON}`);
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
      active: { idResume: { status: "paused", progress: 0, url: "http://example.com/video2" } },
      queue: [],
    });
    const resumeBtn = document.querySelector<HTMLButtonElement>(`button.${CSS_CLASSES.RESUME_BUTTON}`);
    expect(resumeBtn).not.toBeNull();
    resumeBtn!.click();
    expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: "resumeDownload", downloadId: "idResume" },
      expect.any(Function)
    );
  });
});
