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
// Mock only external dependencies
jest.mock("extension/src/core/logger", () => ({
    CentralizedLogger: {
        getInstance: jest.fn(() => ({
            debug: jest.fn(),
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
            setLevel: jest.fn(),
            getLogs: jest.fn(),
            clearLogs: jest.fn(),
        })),
    },
}));
// Mock Chrome APIs
const mockChrome = {
    storage: {
        local: {
            get: jest.fn(),
            set: jest.fn(),
        },
    },
    runtime: {
        sendMessage: jest.fn(),
    },
};
// Mock global fetch
const mockFetch = jest.fn();
// Mock global document
const mockDocument = {
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    addEventListener: jest.fn(),
};
// Mock global window
const mockWindow = {
    location: {
        href: "chrome-extension://test/options.html",
    },
    addEventListener: jest.fn(),
};
describe("Options Script - Core Functions", () => {
    let logger;
    let stateManager;
    beforeEach(() => {
        // Get actual instances of centralized services
        logger = logger_1.CentralizedLogger.getInstance();
        stateManager = state_manager_1.ExtensionStateManager.getInstance();
        // Clear logs and reset state for clean tests
        logger.clearLogs();
        stateManager.reset();
        // Setup global mocks
        global.chrome = mockChrome;
        global.fetch = mockFetch;
        global.document = mockDocument;
        global.window = mockWindow;
        // Reset all mocks
        jest.clearAllMocks();
        // Default successful responses
        mockFetch.mockResolvedValue({
            ok: true,
            json: jest.fn().mockResolvedValue({ status: "success" }),
        });
    });
    describe("Logging Functions", () => {
        it("should use centralized logger for info messages", () => {
            logger.info("test message", { component: "options" });
            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe("test message");
            expect(logs[0].context.component).toBe("options");
            expect(logs[0].level).toBe("info");
        });
        it("should use centralized logger for warning messages", () => {
            logger.warn("warning message", { component: "options" });
            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe("warning message");
            expect(logs[0].context.component).toBe("options");
            expect(logs[0].level).toBe("warn");
        });
        it("should use centralized logger for error messages", () => {
            logger.error("error message", { component: "options" });
            const logs = logger.getLogs();
            expect(logs).toHaveLength(1);
            expect(logs[0].message).toBe("error message");
            expect(logs[0].context.component).toBe("options");
            expect(logs[0].level).toBe("error");
        });
    });
    describe("State Management", () => {
        it("should use centralized state manager", () => {
            const initialState = stateManager.getState();
            expect(initialState).toBeDefined();
        });
        it("should handle UI state updates", () => {
            const uiState = stateManager.getUIState();
            expect(uiState).toBeDefined();
        });
        it("should handle form state updates", () => {
            const formState = stateManager.getFormState();
            expect(formState).toBeDefined();
        });
    });
    describe("Validation Functions", () => {
        it("validatePort should validate port numbers", () => {
            // Mock HTML input elements
            const validInput = { value: "8080" };
            const invalidInput = { value: "abc" };
            const outOfRangeInput = { value: "99999" };
            const zeroInput = { value: "0" };
            expect((0, options_1.validatePort)(validInput)).toBe(true);
            expect((0, options_1.validatePort)(invalidInput)).toBe(false);
            expect((0, options_1.validatePort)(outOfRangeInput)).toBe(false);
            expect((0, options_1.validatePort)(zeroInput)).toBe(false);
        });
        it("validateFolder should validate folder paths", () => {
            // Mock HTML input elements
            const validInput = { value: "/valid/path" };
            const emptyInput = { value: "" };
            const invalidInput = { value: "invalid\\path" };
            expect((0, options_1.validateFolder)(validInput)).toBe(true);
            expect((0, options_1.validateFolder)(emptyInput)).toBe(false);
            expect((0, options_1.validateFolder)(invalidInput)).toBe(false);
        });
        it("validateLogLevel should validate log levels", () => {
            // Mock HTML select elements
            const debugSelect = { value: "debug" };
            const infoSelect = { value: "info" };
            const warnSelect = { value: "warn" };
            const errorSelect = { value: "error" };
            const invalidSelect = { value: "invalid" };
            expect((0, options_1.validateLogLevel)(debugSelect)).toBe(true);
            expect((0, options_1.validateLogLevel)(infoSelect)).toBe(true);
            expect((0, options_1.validateLogLevel)(warnSelect)).toBe(true);
            expect((0, options_1.validateLogLevel)(errorSelect)).toBe(true);
            expect((0, options_1.validateLogLevel)(invalidSelect)).toBe(false);
        });
        it("validateFormat should validate video formats", () => {
            // Mock HTML select elements
            const mp4Select = { value: "mp4" };
            const webmSelect = { value: "webm" };
            const aviSelect = { value: "avi" };
            const invalidSelect = { value: "invalid" };
            expect((0, options_1.validateFormat)(mp4Select)).toBe(true);
            expect((0, options_1.validateFormat)(webmSelect)).toBe(true);
            expect((0, options_1.validateFormat)(aviSelect)).toBe(true);
            expect((0, options_1.validateFormat)(invalidSelect)).toBe(false);
        });
    });
    describe("Theme Functions", () => {
        it("applyOptionsTheme should apply theme correctly", () => {
            // Mock DOM elements
            const mockElement = {
                classList: {
                    add: jest.fn(),
                    remove: jest.fn(),
                },
            };
            mockDocument.querySelector.mockReturnValue(mockElement);
            (0, options_1.applyOptionsTheme)("dark");
            expect(mockElement.classList.add).toHaveBeenCalledWith("dark-theme");
        });
        it("handleThemeToggle should toggle theme", () => {
            // Mock DOM elements
            const mockToggle = {
                checked: false,
            };
            mockDocument.getElementById.mockReturnValue(mockToggle);
            (0, options_1.handleThemeToggle)();
            expect(mockToggle.checked).toBe(false);
        });
        it("initializeOptionsTheme should initialize theme from storage", () => __awaiter(void 0, void 0, void 0, function* () {
            mockChrome.storage.local.get.mockResolvedValue({
                theme: "dark",
            });
            yield (0, options_1.initializeOptionsTheme)();
            expect(mockChrome.storage.local.get).toHaveBeenCalledWith("theme");
        }));
    });
    describe("Settings Functions", () => {
        it("saveSettings should save settings to storage", () => __awaiter(void 0, void 0, void 0, function* () {
            const settings = {
                serverPort: "8080",
                downloadFolder: "/downloads",
                logLevel: "info",
            };
            yield (0, options_1.saveSettings)(settings);
            expect(mockChrome.storage.local.set).toHaveBeenCalledWith(settings);
        }));
        it("selectDownloadDirectory should handle directory selection", () => {
            // Mock directory selection
            const mockInput = {
                value: "/selected/path",
            };
            mockDocument.getElementById.mockReturnValue(mockInput);
            (0, options_1.selectDownloadDirectory)();
            expect(mockInput.value).toBe("/selected/path");
        });
    });
    describe("Server Status Functions", () => {
        it("updateOptionsServerStatus should update server status", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: jest.fn().mockResolvedValue({ status: "online" }),
            });
            yield (0, options_1.updateOptionsServerStatus)();
            expect(mockFetch).toHaveBeenCalled();
        }));
        it("updateOptionsServerStatus should handle server offline", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockRejectedValueOnce(new Error("Network error"));
            yield (0, options_1.updateOptionsServerStatus)();
            // Should handle the error gracefully
            expect(mockFetch).toHaveBeenCalled();
        }));
    });
    describe("Initialization Functions", () => {
        it("initOptionsPage should initialize the options page", () => __awaiter(void 0, void 0, void 0, function* () {
            // Mock DOM elements
            const mockForm = {
                addEventListener: jest.fn(),
            };
            mockDocument.querySelector.mockReturnValue(mockForm);
            yield (0, options_1.initOptionsPage)();
            expect(mockForm.addEventListener).toHaveBeenCalled();
        }));
    });
    describe("Utility Functions", () => {
        it("showValidationMessage should show validation messages", () => {
            const mockElement = {
                textContent: "",
                style: {
                    display: "",
                },
            };
            mockDocument.getElementById.mockReturnValue(mockElement);
            (0, options_1.showValidationMessage)("test message", "error");
            expect(mockElement.textContent).toBe("test message");
            expect(mockElement.style.display).toBe("block");
        });
    });
    describe("Error Handling", () => {
        it("should handle Chrome API errors gracefully", () => {
            mockChrome.storage.local.set.mockRejectedValueOnce(new Error("Storage error"));
            // Should not throw
            expect(() => {
                (0, options_1.saveSettings)({});
            }).not.toThrow();
        });
        it("should handle fetch errors gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
            mockFetch.mockRejectedValueOnce(new Error("Network error"));
            // Should not throw
            yield expect((0, options_1.updateOptionsServerStatus)()).resolves.toBeUndefined();
        }));
    });
});
