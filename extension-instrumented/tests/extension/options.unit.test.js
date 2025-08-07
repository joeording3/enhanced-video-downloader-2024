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
const options_1 = require("extension/src/options");
const logger_1 = require("extension/src/core/logger");
const state_manager_1 = require("extension/src/core/state-manager");
// Mock centralized services
jest.mock("extension/src/core/logger");
jest.mock("extension/src/core/state-manager");
const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
    setLevel: jest.fn(),
    getLogs: jest.fn(),
    clearLogs: jest.fn(),
};
const mockStateManager = {
    getState: jest.fn(),
    getServerState: jest.fn(),
    getUIState: jest.fn(),
    getDownloadState: jest.fn(),
    getFormState: jest.fn(),
    updateServerState: jest.fn(),
    updateUIState: jest.fn(),
    updateDownloadState: jest.fn(),
    updateFormState: jest.fn(),
    subscribe: jest.fn(),
    loadFromStorage: jest.fn(),
    saveToStorage: jest.fn(),
    reset: jest.fn(),
};
/* eslint-env jest */
// Create a mock event that satisfies the properties used in the function
const createMockEvent = (target) => ({
    target,
    preventDefault: jest.fn(),
});
describe("Options Page Tests", () => {
    beforeEach(() => {
        // Setup centralized service mocks
        logger_1.CentralizedLogger.getInstance.mockReturnValue(mockLogger);
        state_manager_1.ExtensionStateManager.getInstance.mockReturnValue(mockStateManager);
        // Set up a more complete DOM for each test
        document.body.innerHTML =
            '<div class="tabs">' +
                '<button class="tab-button active" data-tab="general-settings">General</button>' +
                '<button class="tab-button" data-tab="log-viewer">Logs</button>' +
                "</div>" +
                '<div id="general-settings" class="tab-content active">' +
                '<form id="settings-form">' +
                '<input name="server-port" type="number" id="settings-server-port" min="1024" max="65535" value="5001" required />' +
                '<div id="port-validation" class="validation-message"></div>' +
                '<input name="download-dir" id="settings-download-dir" value="/downloads" required />' +
                '<div id="folder-validation" class="validation-message"></div>' +
                '<input type="checkbox" name="enable-debug" id="settings-enable-debug" />' +
                '<input type="checkbox" name="enable-history" id="settings-enable-history" />' +
                '<select name="log-level" id="settings-log-level">' +
                '<option value="ERROR">Errors Only</option>' +
                '<option value="INFO" selected>Normal</option>' +
                '<option value="DEBUG">Verbose</option>' +
                "</select>" +
                '<div id="log-level-validation" class="validation-message"></div>' +
                '<select name="ytdlp-format" id="settings-ytdlp-format">' +
                '<option value="bestvideo+bestaudio/best">Best Quality (MP4/WEBM)</option>' +
                '<option value="best">Best Available Single File</option>' +
                '<option value="mp4">MP4 (Best)</option>' +
                '<option value="webm">WebM (Best)</option>' +
                '<option value="bestaudio[ext=m4a]">Best Audio (M4A)</option>' +
                '<option value="bestaudio[ext=opus]">Best Audio (Opus)</option>' +
                "</select>" +
                '<div id="format-validation" class="validation-message"></div>' +
                '<input type="checkbox" name="allow-playlists" id="settings-allow-playlists" />' +
                '<button type="submit" id="save-settings">Save</button>' +
                "</form>" +
                '<div id="settings-status"></div>' +
                '<button id="settings-folder-picker"></button>' +
                '<div id="settings-download-dir-warning"></div>' +
                '<button id="restart-server"></button>' +
                '<div id="restart-status"></div>' +
                '<button id="settings-clear-history"></button>' +
                '<button id="settings-resume-downloads"></button>' +
                '<button id="theme-toggle">Toggle Theme</button>' +
                '<div id="server-status-indicator"></div>' +
                '<div id="server-status-text"></div>' +
                '<div class="search-results"></div>' +
                '<div class="no-results-message"></div>' +
                "</div>" +
                '<div id="log-viewer" class="tab-content"></div>';
        // Clear mocks before each test
        chrome.storage.local.set.mockClear();
        chrome.runtime.sendMessage.mockClear();
        chrome.storage.local.get.mockClear();
        jest.useFakeTimers();
        // Re-initialize scripts
        (0, options_1.initOptionsPage)();
    });
    afterEach(() => {
        jest.useRealTimers();
        document.body.innerHTML = "";
    });
    describe("Validation and Saving", () => {
        it("shows an error for an invalid port on form submission", () => __awaiter(void 0, void 0, void 0, function* () {
            const form = document.getElementById("settings-form");
            const portInput = document.getElementById("settings-server-port");
            const status = document.getElementById("settings-status");
            portInput.value = "99999"; // Invalid port (out of range)
            // Clear any calls from init
            chrome.runtime.sendMessage.mockClear();
            yield (0, options_1.saveSettings)(createMockEvent(form));
            // The validation should prevent saving and show validation error
            expect(status.textContent).toMatch(/Please fix validation errors before saving/);
            expect(chrome.storage.local.set).not.toHaveBeenCalled();
            expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
        }));
        it("saves valid settings and shows success on form submission", () => __awaiter(void 0, void 0, void 0, function* () {
            const form = document.getElementById("settings-form");
            const status = document.getElementById("settings-status");
            // Mock sendMessage to simulate a successful server response
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                if (message.type === "setConfig") {
                    if (typeof callback === "function") {
                        callback({ status: "success" });
                    }
                    return Promise.resolve({ status: "success" });
                }
                // For other calls like getConfig, do nothing
                return Promise.resolve({ status: "success" });
            });
            // Mock storage.set to simulate successful save
            chrome.storage.local.set.mockImplementation((items, callback) => {
                if (typeof callback === "function") {
                    callback();
                }
                return Promise.resolve();
            });
            yield (0, options_1.saveSettings)(createMockEvent(form));
            expect(chrome.storage.local.set).toHaveBeenCalled();
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "setConfig" }), expect.any(Function));
            // Check for success message
            expect(status.textContent).toBe("Settings saved successfully!");
            // Fast-forward timers to check if the message disappears
            jest.runAllTimers();
            expect(status.textContent).toBe("");
        }));
        it("shows an error if saving to server fails", () => __awaiter(void 0, void 0, void 0, function* () {
            const form = document.getElementById("settings-form");
            const status = document.getElementById("settings-status");
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                if (message.type === "setConfig") {
                    if (typeof callback === "function") {
                        callback({ status: "error", message: "Server is offline" });
                    }
                    return Promise.resolve({
                        status: "error",
                        message: "Server is offline",
                    });
                }
                return Promise.resolve({ status: "success" });
            });
            yield (0, options_1.saveSettings)(createMockEvent(form));
            expect(status.textContent).toMatch(/Error saving settings: Server is offline/);
        }));
        it("shows an error if chrome.runtime.lastError is set during save", () => __awaiter(void 0, void 0, void 0, function* () {
            const form = document.getElementById("settings-form");
            const status = document.getElementById("settings-status");
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                if (message.type === "setConfig") {
                    chrome.runtime.lastError = { message: "Message send failed" };
                    if (typeof callback === "function") {
                        callback(undefined); // Callback is called with no response on lastError
                    }
                    return Promise.resolve(undefined);
                }
                return Promise.resolve({ status: "success" });
            });
            yield (0, options_1.saveSettings)(createMockEvent(form));
            expect(status.textContent).toMatch(/Error saving settings: Message send failed/);
            chrome.runtime.lastError = null; // Clean up for other tests
        }));
    });
    describe("Folder Picker", () => {
        it("warns when folder picker API is not supported", () => __awaiter(void 0, void 0, void 0, function* () {
            const status = document.getElementById("settings-status");
            // Simulate environment where picker is not available
            // @ts-expect-error - Testing unsupported API scenario
            delete window.showDirectoryPicker;
            yield (0, options_1.selectDownloadDirectory)();
            expect(status.textContent).toMatch(/does not support directory selection/);
        }));
        it("sets the input value on successful directory selection", () => __awaiter(void 0, void 0, void 0, function* () {
            const downloadDirInput = document.getElementById("settings-download-dir");
            // Mock the directory picker
            // @ts-expect-error - Mocking experimental API for testing
            window.showDirectoryPicker = jest.fn().mockResolvedValue({
                name: "/mock/path",
            });
            yield (0, options_1.selectDownloadDirectory)();
            expect(downloadDirInput.value).toBe("/mock/path");
        }));
        it("shows a warning on generic error during directory selection", () => __awaiter(void 0, void 0, void 0, function* () {
            const status = document.getElementById("settings-status");
            // @ts-expect-error - Mocking experimental API error scenario
            window.showDirectoryPicker = jest
                .fn()
                .mockRejectedValue(new Error("Generic error"));
            yield (0, options_1.selectDownloadDirectory)();
            expect(status.textContent).toMatch(/Failed to select directory/);
        }));
    });
    describe("Server Actions", () => {
        it("sends a restart message when restart button is clicked", () => {
            const restartButton = document.getElementById("restart-server");
            const status = document.getElementById("settings-status");
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                if (message.type === "restartServer") {
                    callback({ status: "success" });
                }
            });
            restartButton.click();
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "restartServer" }, expect.any(Function));
            expect(status.textContent).toBe("Server restarted successfully!");
        });
        it("shows an error message when server restart fails", () => {
            const restartButton = document.getElementById("restart-server");
            const status = document.getElementById("settings-status");
            chrome.runtime.sendMessage.mockImplementation((message, callback) => {
                if (message.type === "restartServer") {
                    callback({ status: "error", message: "Restart failed" });
                }
            });
            restartButton.click();
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "restartServer" }, expect.any(Function));
            expect(status.textContent).toBe("Error: Restart failed");
        });
        it("sends a clear history message when clear history button is clicked", () => {
            const clearHistoryButton = document.getElementById("settings-clear-history");
            window.confirm = jest.fn(() => true); // Mock confirm dialog
            clearHistoryButton.click();
            expect(window.confirm).toHaveBeenCalled();
            // Note: The actual call is in history.ts, so we can't directly test it here
            // without more complex mocking. We are testing that the button click is wired up.
            // A better test would be an E2E test.
        });
    });
    describe("Tab Navigation", () => {
        it("switches tabs correctly on click", () => {
            const generalTab = document.querySelector('[data-tab="general-settings"]');
            const generalContent = document.getElementById("general-settings");
            const logsTab = document.querySelector('[data-tab="log-viewer"]');
            const logsContent = document.getElementById("log-viewer");
            // Initial state
            expect(generalTab === null || generalTab === void 0 ? void 0 : generalTab.classList.contains("active")).toBe(true);
            expect(generalContent === null || generalContent === void 0 ? void 0 : generalContent.classList.contains("active")).toBe(true);
            expect(logsTab === null || logsTab === void 0 ? void 0 : logsTab.classList.contains("active")).toBe(false);
            expect(logsContent === null || logsContent === void 0 ? void 0 : logsContent.classList.contains("active")).toBe(false);
            // Click logs tab
            logsTab === null || logsTab === void 0 ? void 0 : logsTab.click();
            // Final state
            expect(generalTab === null || generalTab === void 0 ? void 0 : generalTab.classList.contains("active")).toBe(false);
            expect(generalContent === null || generalContent === void 0 ? void 0 : generalContent.classList.contains("active")).toBe(false);
            expect(logsTab === null || logsTab === void 0 ? void 0 : logsTab.classList.contains("active")).toBe(true);
            expect(logsContent === null || logsContent === void 0 ? void 0 : logsContent.classList.contains("active")).toBe(true);
        });
    });
    describe("Theme Management", () => {
        it("applyOptionsTheme should apply dark theme", () => {
            (0, options_1.applyOptionsTheme)("dark");
            expect(document.documentElement.classList.contains("dark-theme")).toBe(true);
        });
        it("applyOptionsTheme should apply light theme", () => {
            (0, options_1.applyOptionsTheme)("light");
            expect(document.documentElement.classList.contains("dark-theme")).toBe(false);
        });
        it("applyOptionsTheme should use system preference when no theme specified", () => {
            // Mock matchMedia to return dark preference
            Object.defineProperty(window, "matchMedia", {
                writable: true,
                value: jest.fn().mockImplementation((query) => ({
                    matches: query === "(prefers-color-scheme: dark)",
                    media: query,
                    onchange: null,
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                    addEventListener: jest.fn(),
                    removeEventListener: jest.fn(),
                    dispatchEvent: jest.fn(),
                })),
            });
            (0, options_1.applyOptionsTheme)();
            expect(document.documentElement.classList.contains("dark-theme")).toBe(true);
        });
        it("handleThemeToggle should toggle from light to dark", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock chrome.storage.local.get to return light theme
            chrome.storage.local.get.mockResolvedValueOnce({
                theme: "light",
            });
            yield (0, options_1.handleThemeToggle)();
            expect(chrome.storage.local.set).toHaveBeenCalledWith({ theme: "dark" });
        }));
        it("handleThemeToggle should toggle from dark to light", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock chrome.storage.local.get to return dark theme
            chrome.storage.local.get.mockResolvedValueOnce({
                theme: "dark",
            });
            yield (0, options_1.handleThemeToggle)();
            expect(chrome.storage.local.set).toHaveBeenCalledWith({ theme: "light" });
        }));
        it("initializeOptionsTheme should use stored theme", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock chrome.storage.local.get to return stored theme
            chrome.storage.local.get.mockResolvedValueOnce({
                theme: "dark",
            });
            yield (0, options_1.initializeOptionsTheme)();
            expect(document.documentElement.classList.contains("dark-theme")).toBe(true);
        }));
        it("initializeOptionsTheme should fall back to system preference when no stored theme", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock chrome.storage.local.get to return no theme
            chrome.storage.local.get.mockResolvedValueOnce({});
            yield (0, options_1.initializeOptionsTheme)();
            // Should apply system preference (mocked to dark in setup)
            expect(document.documentElement.classList.contains("dark-theme")).toBe(true);
        }));
    });
    describe("Server Status", () => {
        it("updateOptionsServerStatus should update connected status", () => {
            (0, options_1.updateOptionsServerStatus)("connected");
            const indicator = document.getElementById("server-status-indicator");
            const text = document.getElementById("server-status-text");
            expect(indicator === null || indicator === void 0 ? void 0 : indicator.classList.contains("connected")).toBe(true);
            expect(text === null || text === void 0 ? void 0 : text.textContent).toBe("Connected");
        });
        it("updateOptionsServerStatus should update disconnected status", () => {
            (0, options_1.updateOptionsServerStatus)("disconnected");
            const indicator = document.getElementById("server-status-indicator");
            const text = document.getElementById("server-status-text");
            expect(indicator === null || indicator === void 0 ? void 0 : indicator.classList.contains("disconnected")).toBe(true);
            expect(text === null || text === void 0 ? void 0 : text.textContent).toBe("Disconnected");
        });
        it("updateOptionsServerStatus should update checking status", () => {
            (0, options_1.updateOptionsServerStatus)("checking");
            const text = document.getElementById("server-status-text");
            expect(text === null || text === void 0 ? void 0 : text.textContent).toBe("Checking...");
        });
    });
    describe("Validation Functions", () => {
        it("validatePort should validate valid port", () => {
            const input = document.createElement("input");
            input.value = "5001";
            const result = (0, options_1.validatePort)(input);
            expect(result).toBe(true);
        });
        it("validatePort should reject invalid port", () => {
            const input = document.createElement("input");
            input.value = "99999"; // Invalid port
            const result = (0, options_1.validatePort)(input);
            expect(result).toBe(false);
        });
        it("validateFolder should validate valid folder path", () => {
            const input = document.createElement("input");
            input.value = "/valid/path";
            const result = (0, options_1.validateFolder)(input);
            expect(result).toBe(true);
        });
        it("validateFolder should reject empty folder path", () => {
            const input = document.createElement("input");
            input.value = "";
            const result = (0, options_1.validateFolder)(input);
            expect(result).toBe(false);
        });
        it("validateLogLevel should validate valid log level", () => {
            const select = document.createElement("select");
            const option = document.createElement("option");
            option.value = "INFO";
            select.appendChild(option);
            select.value = "INFO";
            const result = (0, options_1.validateLogLevel)(select);
            expect(result).toBe(true);
        });
        it("validateFormat should validate valid format", () => {
            const select = document.createElement("select");
            const option = document.createElement("option");
            option.value = "mp4";
            select.appendChild(option);
            select.value = "mp4";
            const result = (0, options_1.validateFormat)(select);
            expect(result).toBe(true);
        });
    });
    describe("Utility Functions", () => {
        it("showValidationMessage should show success message", () => {
            const element = document.createElement("div");
            element.id = "test-element";
            document.body.appendChild(element);
            (0, options_1.showValidationMessage)(element, "Success message", "success");
            expect(element.classList.contains("success")).toBe(true);
            expect(element.textContent).toBe("Success message");
        });
        it("showValidationMessage should show error message", () => {
            const element = document.createElement("div");
            element.id = "test-element";
            document.body.appendChild(element);
            (0, options_1.showValidationMessage)(element, "Error message", "error");
            expect(element.classList.contains("error")).toBe(true);
            expect(element.textContent).toBe("Error message");
        });
        it("showValidationMessage should handle null element", () => {
            // Should not throw error
            expect(() => {
                (0, options_1.showValidationMessage)(null, "Test message", "warning");
            }).not.toThrow();
        });
    });
});
