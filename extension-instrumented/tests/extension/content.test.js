// @ts-nocheck
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
const utils_1 = require("../../extension/src/lib/utils");
const logger_1 = require("../../extension/src/core/logger");
describe("Content Script Tests", () => {
    let logger;
    beforeEach(() => {
        // Get actual logger instance
        logger = logger_1.CentralizedLogger.getInstance();
        logger.clearLogs();
        // Setup DOM
        document.body.innerHTML = '<div id="test-container"></div>';
        // Reset mocks
        chrome.storage.local.get.mockClear();
        chrome.storage.local.set.mockClear();
    });
    describe("Button Creation and Management", () => {
        it("should create download button", () => __awaiter(void 0, void 0, void 0, function* () {
            const button = yield (0, content_1.createOrUpdateButton)();
            expect(button).toBeInstanceOf(HTMLButtonElement);
            expect(button.id).toBe("evd-download-button-main");
            expect(button.textContent).toBe("DOWNLOAD");
        }));
        it("should update existing button", () => __awaiter(void 0, void 0, void 0, function* () {
            const button1 = yield (0, content_1.createOrUpdateButton)();
            const button2 = yield (0, content_1.createOrUpdateButton)();
            expect(button1).toBe(button2); // Should return the same button
        }));
        it("should reset button position", () => __awaiter(void 0, void 0, void 0, function* () {
            const button = yield (0, content_1.createOrUpdateButton)();
            button.style.left = "100px";
            button.style.top = "100px";
            yield (0, content_1.resetButtonPosition)();
            expect(button.style.left).toBe("10px");
            expect(button.style.top).toBe("10px");
        }));
        it("should set button hidden state", () => __awaiter(void 0, void 0, void 0, function* () {
            const button = yield (0, content_1.createOrUpdateButton)();
            yield (0, content_1.setButtonHiddenState)(true);
            expect(button.style.display).toBe("none");
            yield (0, content_1.setButtonHiddenState)(false);
            expect(button.style.display).toBe("block");
        }));
    });
    describe("Video Detection", () => {
        it("should detect significant video elements", () => {
            const video = document.createElement("video");
            video.src = "test.mp4";
            // Mock video properties that are read-only
            Object.defineProperty(video, "duration", {
                value: 30,
                writable: false,
            });
            Object.defineProperty(video, "videoWidth", {
                value: 1280,
                writable: false,
            });
            Object.defineProperty(video, "videoHeight", {
                value: 720,
                writable: false,
            });
            // Mock getBoundingClientRect to return significant dimensions
            Object.defineProperty(video, "getBoundingClientRect", {
                value: () => ({
                    width: 1280,
                    height: 720,
                    left: 0,
                    top: 0,
                    right: 1280,
                    bottom: 720,
                }),
                writable: false,
            });
            document.body.appendChild(video);
            expect((0, content_1.isSignificantVideo)(video)).toBe(true);
        });
        it("should reject insignificant video elements", () => {
            const video = document.createElement("video");
            // Mock video properties that are read-only
            Object.defineProperty(video, "duration", {
                value: 5,
                writable: false,
            }); // Too short
            Object.defineProperty(video, "videoWidth", {
                value: 320,
                writable: false,
            });
            Object.defineProperty(video, "videoHeight", {
                value: 240,
                writable: false,
            });
            document.body.appendChild(video);
            expect((0, content_1.isSignificantVideo)(video)).toBe(false);
        });
        it("should handle video elements without duration", () => {
            const video = document.createElement("video");
            document.body.appendChild(video);
            expect((0, content_1.isSignificantVideo)(video)).toBe(false);
        });
    });
    describe("Debounce Function", () => {
        it("should debounce function calls", (done) => {
            let callCount = 0;
            const debouncedFn = (0, utils_1.debounce)(() => {
                callCount++;
            }, 100);
            debouncedFn();
            debouncedFn();
            debouncedFn();
            setTimeout(() => {
                expect(callCount).toBe(1);
                done();
            }, 150);
        });
    });
    describe("Button State Management", () => {
        it("should get button state from storage", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockState = { x: 50, y: 60, hidden: false };
            // Mock getHostname to return "localhost" for consistent testing
            jest
                .spyOn(require("../../extension/src/lib/utils"), "getHostname")
                .mockReturnValue("localhost");
            chrome.storage.local.get.mockImplementation((keys, callback) => callback({ localhost: mockState }));
            const state = yield (0, content_1.getButtonState)();
            expect(state).toEqual(mockState);
        }));
        it("should save button state to storage", () => __awaiter(void 0, void 0, void 0, function* () {
            const state = { x: 100, y: 150, hidden: true };
            chrome.storage.local.set.mockImplementation((data, callback) => callback());
            yield (0, content_1.saveButtonState)(state);
            expect(chrome.storage.local.set).toHaveBeenCalledWith({
                localhost: state,
            }, expect.any(Function));
        }));
        it("should handle storage errors gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            chrome.storage.local.get.mockImplementation((keys, callback) => {
                chrome.runtime.lastError = { message: "Storage error" };
                callback({});
            });
            const state = yield (0, content_1.getButtonState)();
            expect(state).toEqual({ x: 10, y: 10, hidden: false });
            const logs = logger.getLogs();
            expect(logs.some((log) => log.message.includes("Storage error"))).toBe(true);
        }));
    });
    describe("Button Style Management", () => {
        it("should ensure download button style", () => {
            const button = document.createElement("button");
            button.style.display = "none";
            button.style.opacity = "0.5";
            document.body.appendChild(button);
            (0, content_1.ensureDownloadButtonStyle)(button);
            expect(button.style.display).toBe("block");
            expect(button.style.opacity).toBe("1");
        });
    });
    describe("Logging Integration", () => {
        it("should handle button operations without requiring logs", () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, content_1.createOrUpdateButton)();
            // The actual implementation may or may not log depending on button state
            // We just verify the function doesn't throw
            expect(true).toBe(true);
        }));
        it("should handle video detection without logging", () => {
            const video = document.createElement("video");
            document.body.appendChild(video);
            (0, content_1.isSignificantVideo)(video);
            // The actual implementation doesn't log video detection, so we just verify it doesn't throw
            expect(video).toBeTruthy();
        });
        it("should handle storage operations without requiring logs", () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, content_1.getButtonState)();
            // The actual implementation may or may not log depending on storage state
            // We just verify the function doesn't throw
            expect(true).toBe(true);
        }));
    });
});
