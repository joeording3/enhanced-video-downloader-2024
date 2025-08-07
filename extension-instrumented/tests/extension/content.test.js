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
const logger_1 = require("../../extension/src/core/logger");
describe("Content Script Tests", () => {
    let logger;
    beforeEach(() => {
        document.body.innerHTML = "";
        // Reset centralized state for each test
        (0, content_1._resetStateForTesting)();
        // Get actual logger instance
        logger = logger_1.CentralizedLogger.getInstance();
        logger.clearLogs();
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
    describe("Button Creation and Management", () => {
        it("should create download button", () => __awaiter(void 0, void 0, void 0, function* () {
            const button = yield (0, content_1.createOrUpdateButton)();
            expect(button).toBeInstanceOf(HTMLButtonElement);
            expect(button.id).toBe("evd-download-button");
            expect(button.textContent).toBe("Download Video");
        }));
        it("should update existing button", () => __awaiter(void 0, void 0, void 0, function* () {
            const button1 = yield (0, content_1.createOrUpdateButton)();
            const button2 = yield (0, content_1.createOrUpdateButton)();
            expect(button1).toBe(button2);
        }));
        it("should reset button position", () => {
            const button = document.createElement("button");
            button.style.left = "100px";
            button.style.top = "200px";
            document.body.appendChild(button);
            (0, content_1.resetButtonPosition)();
            expect(button.style.left).toBe("10px");
            expect(button.style.top).toBe("10px");
        });
        it("should set button hidden state", () => {
            const button = document.createElement("button");
            document.body.appendChild(button);
            (0, content_1.setButtonHiddenState)(true);
            expect(button.style.display).toBe("none");
            (0, content_1.setButtonHiddenState)(false);
            expect(button.style.display).toBe("block");
        });
    });
    describe("Video Detection", () => {
        it("should detect significant video elements", () => {
            const video = document.createElement("video");
            video.src = "test.mp4";
            // Mock video properties that are read-only
            Object.defineProperty(video, "duration", { value: 30, writable: false });
            Object.defineProperty(video, "videoWidth", {
                value: 1280,
                writable: false,
            });
            Object.defineProperty(video, "videoHeight", {
                value: 720,
                writable: false,
            });
            document.body.appendChild(video);
            expect((0, content_1.isSignificantVideo)(video)).toBe(true);
        });
        it("should reject insignificant video elements", () => {
            const video = document.createElement("video");
            video.src = "test.mp4";
            // Mock video properties that are read-only
            Object.defineProperty(video, "duration", { value: 5, writable: false }); // Too short
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
            video.src = "test.mp4";
            document.body.appendChild(video);
            expect((0, content_1.isSignificantVideo)(video)).toBe(false);
        });
    });
    describe("Debounce Function", () => {
        it("should debounce function calls", (done) => {
            let callCount = 0;
            const debouncedFn = (0, content_1.debounce)(() => {
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
            chrome.storage.local.get.mockImplementation((keys, callback) => callback({ "example.com": mockState }));
            const state = yield (0, content_1.getButtonState)();
            expect(state).toEqual(mockState);
        }));
        it("should save button state to storage", () => __awaiter(void 0, void 0, void 0, function* () {
            const state = { x: 100, y: 150, hidden: true };
            yield (0, content_1.saveButtonState)(state);
            expect(chrome.storage.local.set).toHaveBeenCalledWith({
                "example.com": state,
            });
        }));
        it("should handle storage errors gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            chrome.storage.local.get.mockImplementation(() => {
                throw new Error("Storage error");
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
            document.body.appendChild(button);
            (0, content_1.ensureDownloadButtonStyle)(button);
            expect(button.style.position).toBe("fixed");
            expect(button.style.zIndex).toBe("9999");
        });
    });
    describe("Logging Integration", () => {
        it("should log button creation", () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, content_1.createOrUpdateButton)();
            const logs = logger.getLogs();
            expect(logs.some((log) => log.message.includes("button"))).toBe(true);
        }));
        it("should log video detection", () => {
            const video = document.createElement("video");
            video.src = "test.mp4";
            Object.defineProperty(video, "duration", { value: 30, writable: false });
            document.body.appendChild(video);
            (0, content_1.isSignificantVideo)(video);
            const logs = logger.getLogs();
            expect(logs.some((log) => log.message.includes("video"))).toBe(true);
        });
        it("should log storage operations", () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, content_1.getButtonState)();
            const logs = logger.getLogs();
            expect(logs.some((log) => log.message.includes("storage"))).toBe(true);
        }));
    });
});
