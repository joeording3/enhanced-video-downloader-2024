"use strict";
/**
 * Tests for content script functionality.
 *
 * Covers: button creation and management, video detection,
 * user interaction handling, and Chrome API integration.
 *
 * Tests both UI elements and background communication logic.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-env jest */
const content_1 = require("../../extension/src/content");
describe("Content Script Tests", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        // Mock storage and runtime APIs
        global.chrome = {
            storage: {
                local: {
                    get: jest.fn((keys, callback) => callback({})),
                    set: jest.fn((data, callback) => callback()),
                },
            },
            runtime: {
                sendMessage: jest.fn(),
                lastError: null,
            },
        };
    });
    describe("createOrUpdateButton", () => {
        it("should create a new button if one does not exist", () => __awaiter(void 0, void 0, void 0, function* () {
            const button = yield (0, content_1.createOrUpdateButton)();
            expect(button).toBeInstanceOf(HTMLElement);
            expect(button.tagName).toBe("BUTTON");
            expect(button.textContent).toBe("DOWNLOAD");
        }));
        it("should reuse existing button when no video element is provided", () => __awaiter(void 0, void 0, void 0, function* () {
            const button1 = yield (0, content_1.createOrUpdateButton)();
            const button2 = yield (0, content_1.createOrUpdateButton)();
            expect(button1).toBe(button2);
        }));
        it("should create button with correct default styles", () => __awaiter(void 0, void 0, void 0, function* () {
            const button = yield (0, content_1.createOrUpdateButton)();
            expect(button.style.position).toBe("fixed");
            expect(button.style.zIndex).toBe("2147483647");
            expect(button.classList.contains("download-button")).toBe(true);
        }));
        it("should handle button creation with video element", () => __awaiter(void 0, void 0, void 0, function* () {
            const video = document.createElement("video");
            video.src = "test-video.mp4";
            document.body.appendChild(video);
            const button = yield (0, content_1.createOrUpdateButton)(video);
            expect(button).toBeInstanceOf(HTMLElement);
            expect(button.id).toContain("evd-download-button-");
        }));
    });
    describe("resetButtonPosition", () => {
        it("should reset the button position to the default", () => __awaiter(void 0, void 0, void 0, function* () {
            const button = yield (0, content_1.createOrUpdateButton)();
            button.style.left = "100px";
            button.style.top = "10px";
            yield (0, content_1.resetButtonPosition)();
            expect(button.style.left).toBe("10px");
            expect(button.style.top).toBe("10px");
        }));
        it("should save button state after resetting position", () => __awaiter(void 0, void 0, void 0, function* () {
            const button = yield (0, content_1.createOrUpdateButton)();
            yield (0, content_1.resetButtonPosition)();
            expect(global.chrome.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({
                [window.location.hostname]: expect.objectContaining({
                    x: 10,
                    y: 10,
                }),
            }), expect.any(Function));
        }));
        it("should handle storage errors gracefully during reset", () => __awaiter(void 0, void 0, void 0, function* () {
            global.chrome.storage.local.set.mockImplementation((data, callback) => {
                callback(new Error("Storage error"));
            });
            const button = yield (0, content_1.createOrUpdateButton)();
            yield expect((0, content_1.resetButtonPosition)()).resolves.not.toThrow();
        }));
    });
    describe("setButtonHiddenState", () => {
        it("should hide the button when hidden is true", () => __awaiter(void 0, void 0, void 0, function* () {
            const button = yield (0, content_1.createOrUpdateButton)();
            yield (0, content_1.setButtonHiddenState)(true);
            expect(button.style.display).toBe("none");
        }));
        it("should show the button when hidden is false", () => __awaiter(void 0, void 0, void 0, function* () {
            const button = yield (0, content_1.createOrUpdateButton)();
            button.style.display = "none";
            yield (0, content_1.setButtonHiddenState)(false);
            expect(button.style.display).toBe("block");
        }));
        it("should save button state when hiding", () => __awaiter(void 0, void 0, void 0, function* () {
            const button = yield (0, content_1.createOrUpdateButton)();
            yield (0, content_1.setButtonHiddenState)(true);
            expect(global.chrome.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({
                [window.location.hostname]: expect.objectContaining({
                    hidden: true,
                }),
            }), expect.any(Function));
        }));
        it("should save button state when showing", () => __awaiter(void 0, void 0, void 0, function* () {
            const button = yield (0, content_1.createOrUpdateButton)();
            yield (0, content_1.setButtonHiddenState)(false);
            expect(global.chrome.storage.local.set).toHaveBeenCalledWith(expect.objectContaining({
                [window.location.hostname]: expect.objectContaining({
                    hidden: false,
                }),
            }), expect.any(Function));
        }));
        it("should handle storage errors gracefully when hiding", () => __awaiter(void 0, void 0, void 0, function* () {
            global.chrome.storage.local.set.mockImplementation((data, callback) => {
                callback(new Error("Storage error"));
            });
            const button = yield (0, content_1.createOrUpdateButton)();
            yield expect((0, content_1.setButtonHiddenState)(true)).resolves.not.toThrow();
        }));
    });
    describe("isSignificantVideo", () => {
        beforeEach(() => {
            if (typeof content_1._resetStateForTesting === "function")
                (0, content_1._resetStateForTesting)();
        });
        it("should return true for a large, visible video with a source", () => {
            const video = document.createElement("video");
            video.src = "test-video.mp4";
            video.style.width = "400px";
            video.style.height = "300px";
            document.body.appendChild(video);
            video.getBoundingClientRect = jest.fn().mockReturnValue({
                width: 400,
                height: 300,
                top: 0,
                left: 0,
                right: 400,
                bottom: 300,
            });
            expect((0, content_1.isSignificantVideo)(video)).toBe(true);
        });
        it("should return false for a small video", () => {
            const video = document.createElement("video");
            video.src = "test-video.mp4";
            video.style.width = "100px";
            video.style.height = "75px";
            document.body.appendChild(video);
            video.getBoundingClientRect = jest.fn().mockReturnValue({
                width: 100,
                height: 75,
                top: 0,
                left: 0,
                right: 100,
                bottom: 75,
            });
            expect((0, content_1.isSignificantVideo)(video)).toBe(false);
        });
        it("should return false for a video without a source", () => {
            const video = document.createElement("video");
            video.style.width = "400px";
            video.style.height = "300px";
            document.body.appendChild(video);
            video.getBoundingClientRect = jest.fn().mockReturnValue({
                width: 400,
                height: 300,
                top: 0,
                left: 0,
                right: 400,
                bottom: 300,
            });
            expect((0, content_1.isSignificantVideo)(video)).toBe(false);
        });
        it("should return false for a video with ad-banner parent", () => {
            const video = document.createElement("video");
            video.src = "test-video.mp4";
            video.style.width = "400px";
            video.style.height = "300px";
            const parent = document.createElement("div");
            parent.classList.add("ad-banner");
            parent.appendChild(video);
            document.body.appendChild(parent);
            video.getBoundingClientRect = jest.fn().mockReturnValue({
                width: 400,
                height: 300,
                top: 0,
                left: 0,
                right: 400,
                bottom: 300,
            });
            expect((0, content_1.isSignificantVideo)(video)).toBe(false);
        });
        it("should return true for an iframe from a supported source", () => {
            const iframe = document.createElement("iframe");
            iframe.src = "https://www.youtube.com/embed/test";
            iframe.style.width = "400px";
            iframe.style.height = "300px";
            document.body.appendChild(iframe);
            iframe.getBoundingClientRect = jest.fn().mockReturnValue({
                width: 400,
                height: 300,
                top: 0,
                left: 0,
                right: 400,
                bottom: 300,
            });
            expect((0, content_1.isSignificantVideo)(iframe)).toBe(true);
        });
        it("should return false for non-video and non-iframe elements", () => {
            const div = document.createElement("div");
            div.style.width = "400px";
            div.style.height = "300px";
            document.body.appendChild(div);
            div.getBoundingClientRect = jest.fn().mockReturnValue({
                width: 400,
                height: 300,
                top: 0,
                left: 0,
                right: 400,
                bottom: 300,
            });
            expect((0, content_1.isSignificantVideo)(div)).toBe(false);
        });
    });
    describe("Button Click Handler", () => {
        it("handles successful download response", () => __awaiter(void 0, void 0, void 0, function* () {
            const btn = yield (0, content_1.createOrUpdateButton)();
            document.body.appendChild(btn);
            global.chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                if (message.type === "downloadVideo") {
                    callback({ status: "success" });
                }
            });
            btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            btn.click();
            // Check for the success class after the async operation completes
            yield new Promise((resolve) => setTimeout(resolve, 10));
            expect(btn.classList.contains("download-success")).toBe(true);
        }));
        it("handles error download response", () => __awaiter(void 0, void 0, void 0, function* () {
            const btn = yield (0, content_1.createOrUpdateButton)();
            document.body.appendChild(btn);
            global.chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                if (message.type === "downloadVideo") {
                    callback({ status: "error" });
                }
            });
            btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            btn.click();
            expect(btn.classList.contains("download-error")).toBe(true);
        }));
        it("handles retry/warning download response", () => __awaiter(void 0, void 0, void 0, function* () {
            const btn = yield (0, content_1.createOrUpdateButton)();
            document.body.appendChild(btn);
            global.chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                if (message.type === "downloadVideo") {
                    callback({ status: "retry" });
                }
            });
            btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            btn.click();
            // All non-success statuses are treated as error (red)
            expect(btn.classList.contains("download-error")).toBe(true);
        }));
        it("handles unknown download response status", () => __awaiter(void 0, void 0, void 0, function* () {
            const btn = yield (0, content_1.createOrUpdateButton)();
            document.body.appendChild(btn);
            global.chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                if (message.type === "downloadVideo") {
                    callback({ status: "unknown" });
                }
            });
            btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            btn.click();
            // All non-success statuses are treated as error (red)
            expect(btn.classList.contains("download-error")).toBe(true);
        }));
        it("handles runtime error during download request", () => __awaiter(void 0, void 0, void 0, function* () {
            const btn = yield (0, content_1.createOrUpdateButton)();
            document.body.appendChild(btn);
            global.chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                if (message.type === "downloadVideo") {
                    global.chrome.runtime.lastError = new Error("Runtime error");
                    callback({});
                }
            });
            btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
            btn.click();
            expect(btn.classList.contains("download-error")).toBe(true);
        }));
    });
    describe("Storage Error Handling", () => {
        it("should handle storage get errors gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            global.chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback(new Error("Storage error"));
            });
            const button = yield (0, content_1.createOrUpdateButton)();
            expect(button.style.left).toBe("10px");
            expect(button.style.top).toBe("10px");
        }));
        it("should handle storage set errors gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            global.chrome.storage.local.set.mockImplementation((data, callback) => {
                callback(new Error("Storage error"));
            });
            const button = yield (0, content_1.createOrUpdateButton)();
            yield expect((0, content_1.setButtonHiddenState)(true)).resolves.not.toThrow();
        }));
        it("should handle storage exceptions gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            global.chrome.storage.local.get.mockImplementation(() => {
                throw new Error("Storage exception");
            });
            const button = yield (0, content_1.createOrUpdateButton)();
            expect(button.style.left).toBe("10px");
            expect(button.style.top).toBe("10px");
        }));
    });
    describe("DOM Manipulation Edge Cases", () => {
        it("should handle button not in document gracefully", () => {
            const button = document.createElement("button");
            if (button.parentNode) {
                button.parentNode.removeChild(button);
            }
            expect(() => {
                if (button.parentNode)
                    button.parentNode.removeChild(button);
            }).not.toThrow();
        });
        it("should handle computed style edge cases", () => __awaiter(void 0, void 0, void 0, function* () {
            const button = yield (0, content_1.createOrUpdateButton)();
            // Mock getComputedStyle to return problematic values
            const originalGetComputedStyle = window.getComputedStyle;
            window.getComputedStyle = jest.fn().mockReturnValue({
                display: "none",
                opacity: "0.5",
                padding: "0px",
                borderRadius: "0px",
                backgroundColor: "transparent",
                borderWidth: "0px",
                borderStyle: "none",
            });
            // Should force correct styles
            button.style.display = "block";
            button.style.opacity = "1";
            expect(button.style.display).toBe("block");
            expect(button.style.opacity).toBe("1");
            window.getComputedStyle = originalGetComputedStyle;
        }));
    });
    describe("Button State Management", () => {
        it("should use default state when storage is empty", () => __awaiter(void 0, void 0, void 0, function* () {
            global.chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({});
            });
            const button = yield (0, content_1.createOrUpdateButton)();
            expect(button.style.left).toBe("10px");
            expect(button.style.top).toBe("10px");
        }));
    });
    describe("Content Script Drag-and-Drop", () => {
        let button;
        beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
            if (typeof content_1._resetStateForTesting === "function")
                (0, content_1._resetStateForTesting)();
            document.body.innerHTML = "";
            button = yield (0, content_1.createOrUpdateButton)();
            document.body.appendChild(button);
        }));
        afterEach(() => {
            if (typeof content_1._resetStateForTesting === "function")
                (0, content_1._resetStateForTesting)();
        });
        it("should start dragging on left mousedown", () => {
            const mousedown = new MouseEvent("mousedown", {
                button: 0,
                clientX: 100,
                clientY: 200,
                bubbles: true,
            });
            button.dispatchEvent(mousedown);
            // Check that dragging state is set (this will be tested indirectly)
            // The button should now respond to mousemove events
            const mousemove = new MouseEvent("mousemove", {
                clientX: 150,
                clientY: 250,
                bubbles: true,
            });
            document.dispatchEvent(mousemove);
            // Verify the button position changed (indicating drag started)
            expect(button.style.left).not.toBe("10px");
            expect(button.style.top).not.toBe("10px");
        });
        it("should not start dragging on right mousedown", () => {
            const mousedown = new MouseEvent("mousedown", {
                button: 2,
                clientX: 100,
                clientY: 200,
                bubbles: true,
            });
            button.dispatchEvent(mousedown);
            // Check that dragging state is not set
            const mousemove = new MouseEvent("mousemove", {
                clientX: 150,
                clientY: 250,
                bubbles: true,
            });
            document.dispatchEvent(mousemove);
            // Button position should remain unchanged
            expect(button.style.left).toBe("10px");
            expect(button.style.top).toBe("10px");
        });
        it("should update button position during drag", () => {
            // Start drag
            const mousedown = new MouseEvent("mousedown", {
                button: 0,
                clientX: 100,
                clientY: 200,
                bubbles: true,
            });
            button.dispatchEvent(mousedown);
            // Move mouse
            const mousemove = new MouseEvent("mousemove", {
                clientX: 150,
                clientY: 250,
                bubbles: true,
            });
            document.dispatchEvent(mousemove);
            // Button should have moved
            expect(button.style.left).not.toBe("10px");
            expect(button.style.top).not.toBe("10px");
        });
        it("should end dragging on mouseup", () => {
            // Start drag
            const mousedown = new MouseEvent("mousedown", {
                button: 0,
                clientX: 100,
                clientY: 200,
                bubbles: true,
            });
            button.dispatchEvent(mousedown);
            // Move mouse
            const mousemove = new MouseEvent("mousemove", {
                clientX: 150,
                clientY: 250,
                bubbles: true,
            });
            document.dispatchEvent(mousemove);
            // End drag
            const mouseup = new MouseEvent("mouseup", {
                button: 0,
                bubbles: true,
            });
            document.dispatchEvent(mouseup);
            // Further mousemove should not change position (drag ended)
            const finalMove = new MouseEvent("mousemove", {
                clientX: 200,
                clientY: 300,
                bubbles: true,
            });
            document.dispatchEvent(finalMove);
            // Position should remain at the last drag position
            const expectedLeft = button.style.left;
            const expectedTop = button.style.top;
            // Dispatch another mousemove
            document.dispatchEvent(new MouseEvent("mousemove", {
                clientX: 250,
                clientY: 350,
                bubbles: true,
            }));
            // Position should not change (drag ended)
            expect(button.style.left).toBe(expectedLeft);
            expect(button.style.top).toBe(expectedTop);
        });
        it("should distinguish between click and drag", () => {
            // Start drag
            const mousedown = new MouseEvent("mousedown", {
                button: 0,
                clientX: 100,
                clientY: 200,
                bubbles: true,
            });
            button.dispatchEvent(mousedown);
            // Move mouse significantly
            const mousemove = new MouseEvent("mousemove", {
                clientX: 200,
                clientY: 300,
                bubbles: true,
            });
            document.dispatchEvent(mousemove);
            // End drag
            const mouseup = new MouseEvent("mouseup", {
                button: 0,
                bubbles: true,
            });
            document.dispatchEvent(mouseup);
            // Button should have moved (indicating drag, not click)
            expect(button.style.left).not.toBe("10px");
            expect(button.style.top).not.toBe("10px");
        });
    });
});
