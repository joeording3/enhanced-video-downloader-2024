"use strict";
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
const globals_1 = require("@jest/globals");
// Mock Chrome API
global.chrome = {
    storage: {
        local: {
            get: globals_1.jest.fn(),
            set: globals_1.jest.fn(),
        },
    },
    runtime: {
        lastError: null,
        sendMessage: globals_1.jest.fn(),
        openOptionsPage: globals_1.jest.fn(),
    },
};
// Mock DragEvent for test environment
global.DragEvent = class DragEvent extends Event {
    constructor(type, init) {
        super(type, init);
        this.dataTransfer = null;
        this.dataTransfer = (init === null || init === void 0 ? void 0 : init.dataTransfer) || null;
    }
};
// Import after mocks
const popup_1 = require("../../extension/src/popup");
const logger_1 = require("../../extension/src/core/logger");
describe("Popup UI Tests", () => {
    let logger;
    beforeEach(() => {
        // Get actual logger instance
        logger = logger_1.CentralizedLogger.getInstance();
        logger.clearLogs();
        // Clear DOM
        document.body.innerHTML =
            '<div id="status"></div>' +
                '<button id="toggle-enhanced-download-button"></button>' +
                '<div id="history-items"></div>' +
                '<div id="download-dir-display"></div>' +
                '<div id="server-port-display"></div>' +
                '<div id="config-error-display" style="display: none;"></div>' +
                '<div id="download-status"></div>' +
                '<div id="download-queue"></div>' +
                '<img id="header-logo" src="icon48.png" />';
        // Reset mocks
        globals_1.jest.clearAllMocks();
        chrome.storage.local.get.mockImplementation((keys, callback) => {
            if (callback)
                callback({});
        });
        chrome.runtime.sendMessage.mockImplementation((message, callback) => {
            if (callback)
                callback({});
        });
    });
    describe("Status Management", () => {
        it("should set status message", () => {
            (0, popup_1.setStatus)("Test message");
            const status = document.getElementById("status");
            expect(status === null || status === void 0 ? void 0 : status.textContent).toBe("Test message");
        });
        it("should clear status after timeout", (done) => {
            (0, popup_1.setStatus)("Test message", 100);
            const status = document.getElementById("status");
            expect(status === null || status === void 0 ? void 0 : status.textContent).toBe("Test message");
            setTimeout(() => {
                expect(status === null || status === void 0 ? void 0 : status.textContent).toBe("");
                done();
            }, 150);
        });
    });
    describe("Theme Management", () => {
        it("should apply dark theme", () => {
            (0, popup_1.applyPopupTheme)(true);
            expect(document.documentElement.classList.contains("dark-theme")).toBe(true);
        });
        it("should apply light theme", () => {
            (0, popup_1.applyPopupTheme)(false);
            expect(document.documentElement.classList.contains("dark-theme")).toBe(false);
        });
    });
    describe("History Rendering", () => {
        it("should render empty history", () => {
            (0, popup_1.loadAndRenderHistory)();
            const container = document.getElementById("history-items");
            expect(container === null || container === void 0 ? void 0 : container.children.length).toBe(0);
        });
        it("should render history items", () => {
            const history = [
                { id: "1", title: "Video 1", timestamp: Date.now() },
                { id: "2", title: "Video 2", timestamp: Date.now() - 1000 },
            ];
            chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({ downloadHistory: history });
            });
            (0, popup_1.loadAndRenderHistory)();
            const container = document.getElementById("history-items");
            expect(container === null || container === void 0 ? void 0 : container.children.length).toBe(2);
        });
        it("should handle storage errors gracefully", () => {
            chrome.runtime.lastError = { message: "Storage error" };
            chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({});
            });
            (0, popup_1.loadAndRenderHistory)();
            const container = document.getElementById("history-items");
            expect(container === null || container === void 0 ? void 0 : container.children.length).toBe(0);
            const logs = logger.getLogs();
            expect(logs.some((log) => log.message.includes("Storage error"))).toBe(true);
        });
    });
    describe("Configuration Loading", () => {
        it("should load server config", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockConfig = { server_port: 8080, download_dir: "/tmp" };
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                callback({ serverConfig: mockConfig });
            });
            const config = yield (0, popup_1.loadConfig)();
            expect(config).toEqual(mockConfig);
        }));
        it("should handle config loading errors", () => __awaiter(void 0, void 0, void 0, function* () {
            chrome.runtime.lastError = { message: "Runtime error" };
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                callback({});
            });
            const config = yield (0, popup_1.loadConfig)();
            expect(config).toEqual({});
            const logs = logger.getLogs();
            expect(logs.some((log) => log.message.includes("Runtime error"))).toBe(true);
        }));
    });
    describe("Display Updates", () => {
        it("should update download directory display", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockConfig = { download_dir: "/storage/path" };
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                callback({ serverConfig: mockConfig });
            });
            yield (0, popup_1.updateDownloadDirDisplay)();
            const display = document.getElementById("download-dir-display");
            expect(display === null || display === void 0 ? void 0 : display.textContent).toContain("/storage/path");
        }));
        it("should update port display", () => __awaiter(void 0, void 0, void 0, function* () {
            const mockConfig = { server_port: 8080 };
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                callback({ serverConfig: mockConfig });
            });
            yield (0, popup_1.updatePortDisplay)();
            const display = document.getElementById("server-port-display");
            expect(display === null || display === void 0 ? void 0 : display.textContent).toContain("8080");
        }));
        it("should show config errors", () => {
            chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({ configError: "Configuration error" });
            });
            (0, popup_1.showConfigErrorIfPresent)();
            const display = document.getElementById("config-error-display");
            expect(display === null || display === void 0 ? void 0 : display.style.display).not.toBe("none");
            expect(display === null || display === void 0 ? void 0 : display.textContent).toContain("Configuration error");
        });
        it("should hide config errors when none present", () => {
            chrome.storage.local.get.mockImplementation((keys, callback) => {
                callback({}); // No configError
            });
            (0, popup_1.showConfigErrorIfPresent)();
            const display = document.getElementById("config-error-display");
            expect(display === null || display === void 0 ? void 0 : display.style.display).toBe("none");
        });
    });
    describe("List Item Creation", () => {
        it("should create error list item", () => {
            const item = (0, popup_1.createErrorListItem)("Error message");
            expect(item.classList.contains("error-item")).toBe(true);
            expect(item.textContent).toContain("Error message");
        });
        it("should create generic list item", () => {
            const item = (0, popup_1.createGenericListItem)("Generic message");
            expect(item.classList.contains("generic-item")).toBe(true);
            expect(item.textContent).toContain("Generic message");
        });
        it("should create queued list item", () => {
            const item = (0, popup_1.createQueuedListItem)("Queued video", "video-id");
            expect(item.classList.contains("queued-item")).toBe(true);
            expect(item.textContent).toContain("Queued video");
        });
        it("should create active list item", () => {
            const item = (0, popup_1.createActiveListItem)("Active video", "video-id", 50);
            expect(item.classList.contains("active-item")).toBe(true);
            expect(item.textContent).toContain("Active video");
            expect(item.textContent).toContain("50%");
        });
    });
    describe("Drag and Drop", () => {
        it("should handle drag start", () => {
            var _a;
            const event = new DragEvent("dragstart");
            (0, popup_1.handleDragStart)(event);
            expect((_a = event.dataTransfer) === null || _a === void 0 ? void 0 : _a.effectAllowed).toBe("move");
        });
        it("should handle drag over", () => {
            const event = new DragEvent("dragover");
            (0, popup_1.handleDragOver)(event);
            expect(event.preventDefault).toHaveBeenCalled();
        });
        it("should handle drag leave", () => {
            const event = new DragEvent("dragleave");
            (0, popup_1.handleDragLeave)(event);
            // Should not throw
            expect(event).toBeDefined();
        });
        it("should handle drop", () => {
            const event = new DragEvent("drop");
            (0, popup_1.handleDrop)(event);
            expect(event.preventDefault).toHaveBeenCalled();
        });
        it("should handle drag end", () => {
            const event = new DragEvent("dragend");
            (0, popup_1.handleDragEnd)(event);
            // Should not throw
            expect(event).toBeDefined();
        });
    });
    describe("Download Status Rendering", () => {
        it("should render download status", () => {
            const status = { status: "downloading", progress: 75 };
            (0, popup_1.renderDownloadStatus)(status);
            const display = document.getElementById("download-status");
            expect(display === null || display === void 0 ? void 0 : display.textContent).toContain("downloading");
            expect(display === null || display === void 0 ? void 0 : display.textContent).toContain("75%");
        });
        it("should handle empty status", () => {
            (0, popup_1.renderDownloadStatus)(null);
            const display = document.getElementById("download-status");
            expect(display === null || display === void 0 ? void 0 : display.textContent).toBe("");
        });
    });
    describe("Logging Integration", () => {
        it("should log status changes", () => {
            (0, popup_1.setStatus)("Test status");
            const logs = logger.getLogs();
            expect(logs.some((log) => log.message.includes("status"))).toBe(true);
        });
        it("should log theme changes", () => {
            (0, popup_1.applyPopupTheme)(true);
            const logs = logger.getLogs();
            expect(logs.some((log) => log.message.includes("theme"))).toBe(true);
        });
        it("should log history loading", () => {
            (0, popup_1.loadAndRenderHistory)();
            const logs = logger.getLogs();
            expect(logs.some((log) => log.message.includes("history"))).toBe(true);
        });
    });
});
