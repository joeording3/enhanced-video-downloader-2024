import { initPopup } from "../../extension/src/popup";
import { CSS_CLASSES, DOM_SELECTORS } from "../../extension/src/core/constants";

declare const global: any;

describe("popup settings button", () => {
  let originalChrome: any;

  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `<button id="${DOM_SELECTORS.SETTINGS_BUTTON.replace("#", "")}"></button>`;
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
    const settingsButton = document.getElementById(DOM_SELECTORS.SETTINGS_BUTTON.replace("#", ""));
    settingsButton?.click();
    expect(global.chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });
});
