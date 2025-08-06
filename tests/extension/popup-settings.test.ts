import "../../extension/dist/popup.js";

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
    };
    // Import popup.js after DOM and mocks are set up
    jest.resetModules();
    require("../../extension/dist/popup.js");
    // Trigger DOMContentLoaded event to initialize popup functionality
    document.dispatchEvent(new Event("DOMContentLoaded"));
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
