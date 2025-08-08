// @ts-nocheck
import { initPopup } from "../../extension/src/popup";

declare const global: any;

describe("popup settings button", () => {
  let originalChrome: any;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = '<button id="open-settings"></button>';
    // Mock chrome.runtime
    originalChrome = global.chrome;
    global.chrome = {
      runtime: {
        openOptionsPage: jest.fn(),
        getURL: (path: string) => path,
        sendMessage: jest.fn(),
        onMessage: { addListener: jest.fn() },
      },
      storage: {
        local: {
          get: jest.fn().mockResolvedValue({ theme: "light" }),
          set: jest.fn().mockResolvedValue(undefined),
        },
      },
    };
    // Initialize popup functionality
    initPopup();
  });

  afterEach(() => {
    global.chrome = originalChrome;
    document.body.innerHTML = "";
    jest.resetModules();
  });

  it("should call chrome.runtime.openOptionsPage on settings click", () => {
    const settingsButton = document.getElementById("open-settings");
    settingsButton?.click();
    expect(global.chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });
});
