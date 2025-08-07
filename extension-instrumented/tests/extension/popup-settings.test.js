"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const popup_1 = require("../../extension/src/popup");
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
            storage: {
                local: {
                    get: jest.fn().mockResolvedValue({ theme: "light" }),
                    set: jest.fn().mockResolvedValue(undefined),
                },
            },
        };
        // Initialize popup functionality
        (0, popup_1.initPopup)();
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
