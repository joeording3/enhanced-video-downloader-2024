"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("../../extension/dist/popup.js");
describe("popup settings button", () => {
    let originalChrome;
    beforeEach(() => {
        // Set up DOM
        document.body.innerHTML = '<button id="open-settings"></button>';
        // Mock chrome.runtime
        originalChrome = global.chrome;
        global.chrome = {
            runtime: {
                openOptionsPage: jest.fn(),
                getURL: (path) => path,
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
        settingsButton === null || settingsButton === void 0 ? void 0 : settingsButton.click();
        expect(global.chrome.runtime.openOptionsPage).toHaveBeenCalled();
    });
});
