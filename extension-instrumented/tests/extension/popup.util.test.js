"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-env jest */
const popup_1 = require("extension/src/popup");
describe("Popup Util Functions", () => {
    let statusElement;
    let headerLogo;
    let timerId;
    beforeEach(() => {
        document.body.innerHTML =
            '<div id="status"></div>' + '<img id="header-logo" src="initial" />';
        statusElement = document.getElementById("status");
        headerLogo = document.getElementById("header-logo");
        document.documentElement.className = "";
        document.body.className = "";
        // Mock getURL which is used to set the image src
        chrome.runtime.getURL.mockImplementation((path) => "http://localhost/" + path);
        jest.useFakeTimers();
        timerId = null;
    });
    afterEach(() => {
        if (timerId) {
            clearTimeout(timerId);
        }
        jest.useRealTimers();
    });
    describe("setStatus", () => {
        it("should display error message with prefix and tip and clear after timeout", () => {
            timerId = (0, popup_1.setStatus)("fail", true);
            expect(statusElement.childNodes[0].textContent).toBe("fail");
            const tip = statusElement.querySelector(".error-tip");
            expect(tip).not.toBeNull();
            expect(tip.textContent).toContain("Tip: check your network connection");
            expect(statusElement.className).toBe("status-error");
            jest.advanceTimersByTime(5000);
            expect(statusElement.innerHTML).toBe("");
        });
    });
    describe("applyPopupTheme", () => {
        it("should toggle dark theme on and off", () => {
            // The implementation now uses document.documentElement.classList.toggle
            // and looks for img[src*='icon'] instead of #header-logo
            headerLogo.src = "http://localhost/extension/icons/icon48.png";
            (0, popup_1.applyPopupTheme)(true); // Switch to dark
            expect(document.documentElement.classList.contains("dark-theme")).toBe(true);
            expect(headerLogo.src).toMatch(/darkicons\/icon48\.png$/);
            (0, popup_1.applyPopupTheme)(false); // Switch back to light
            expect(document.documentElement.classList.contains("dark-theme")).toBe(false);
            expect(headerLogo.src).toMatch(/icon48\.png$/);
        });
    });
});
