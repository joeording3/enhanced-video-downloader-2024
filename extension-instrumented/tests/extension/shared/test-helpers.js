"use strict";
/**
 * Shared test helpers for consistent testing patterns across the extension
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
exports.testUtils = void 0;
exports.setupTestEnvironment = setupTestEnvironment;
exports.teardownTestEnvironment = teardownTestEnvironment;
exports.setupDOM = setupDOM;
exports.createMockEvent = createMockEvent;
exports.createMockFormEvent = createMockFormEvent;
exports.createMockClickEvent = createMockClickEvent;
exports.createMockInputEvent = createMockInputEvent;
exports.createMockChangeEvent = createMockChangeEvent;
exports.waitForAsync = waitForAsync;
exports.waitForDOMUpdate = waitForDOMUpdate;
exports.mockFetch = mockFetch;
exports.mockFetchError = mockFetchError;
exports.createMockConsole = createMockConsole;
exports.createMockDownloadData = createMockDownloadData;
exports.createMockServerConfig = createMockServerConfig;
exports.createMockExtensionConfig = createMockExtensionConfig;
exports.expectAsyncError = expectAsyncError;
exports.expectLogsContain = expectLogsContain;
exports.expectLogsNotContain = expectLogsNotContain;
exports.createMockStorage = createMockStorage;
exports.createMockRuntime = createMockRuntime;
exports.createMockTabs = createMockTabs;
const logger_1 = require("../../../extension/src/core/logger");
const state_manager_1 = require("../../../extension/src/core/state-manager");
const mock_chrome_api_1 = require("./mock-chrome-api");
/**
 * Common test setup for extension tests
 */
function setupTestEnvironment() {
    const logger = logger_1.CentralizedLogger.getInstance();
    const stateManager = state_manager_1.ExtensionStateManager.getInstance();
    // Clear previous state
    logger.clearLogs();
    stateManager.reset();
    // Setup Chrome API
    const chromeMock = (0, mock_chrome_api_1.setupChromeAPI)();
    mock_chrome_api_1.mockConfigs.default();
    return {
        logger,
        stateManager,
        chromeMock,
    };
}
/**
 * Common test teardown for extension tests
 */
function teardownTestEnvironment() {
    (0, mock_chrome_api_1.teardownChromeAPI)();
}
/**
 * Setup DOM environment for UI tests
 */
function setupDOM(html = "") {
    const container = document.createElement("div");
    container.id = "test-container";
    if (html) {
        container.innerHTML = html;
    }
    document.body.appendChild(container);
    const cleanup = () => {
        if (container.parentNode) {
            container.parentNode.removeChild(container);
        }
        document.body.innerHTML = "";
    };
    return { container, cleanup };
}
/**
 * Create a mock event for testing
 */
function createMockEvent(type, target) {
    const event = new Event(type);
    if (target) {
        Object.defineProperty(event, "target", { value: target });
    }
    return event;
}
/**
 * Create a mock form submission event
 */
function createMockFormEvent(form) {
    const event = new Event("submit");
    Object.defineProperty(event, "target", { value: form });
    Object.defineProperty(event, "preventDefault", { value: jest.fn() });
    return event;
}
/**
 * Create a mock click event
 */
function createMockClickEvent(element) {
    const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
    });
    Object.defineProperty(event, "target", { value: element });
    return event;
}
/**
 * Create a mock input event
 */
function createMockInputEvent(element, value) {
    const event = new Event("input");
    element.value = value;
    Object.defineProperty(event, "target", { value: element });
    return event;
}
/**
 * Create a mock change event
 */
function createMockChangeEvent(element, value) {
    const event = new Event("change");
    element.value = value;
    Object.defineProperty(event, "target", { value: element });
    return event;
}
/**
 * Wait for async operations to complete
 */
function waitForAsync(ms = 0) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Wait for DOM updates
 */
function waitForDOMUpdate() {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });
}
/**
 * Mock fetch with predefined responses
 */
function mockFetch(response, status = 200) {
    const mockFetch = jest.fn();
    mockFetch.mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(response),
        text: () => Promise.resolve(JSON.stringify(response)),
    });
    global.fetch = mockFetch;
    return mockFetch;
}
/**
 * Mock fetch with error
 */
function mockFetchError(error) {
    const mockFetch = jest.fn();
    mockFetch.mockRejectedValue(error);
    global.fetch = mockFetch;
    return mockFetch;
}
/**
 * Create a mock console with spies
 */
function createMockConsole() {
    const consoleSpy = {
        log: jest.spyOn(console, "log").mockImplementation(),
        warn: jest.spyOn(console, "warn").mockImplementation(),
        error: jest.spyOn(console, "error").mockImplementation(),
        info: jest.spyOn(console, "info").mockImplementation(),
    };
    return Object.assign(Object.assign({}, consoleSpy), { restore: () => {
            consoleSpy.log.mockRestore();
            consoleSpy.warn.mockRestore();
            consoleSpy.error.mockRestore();
            consoleSpy.info.mockRestore();
        } });
}
/**
 * Create test data for downloads
 */
function createMockDownloadData(count = 5) {
    return Array.from({ length: count }, (_, i) => ({
        id: `download-${i}`,
        url: `https://example.com/video-${i}`,
        filename: `video-${i}.mp4`,
        status: i % 3 === 0 ? "completed" : i % 3 === 1 ? "downloading" : "queued",
        progress: i % 3 === 1 ? Math.random() * 100 : 0,
        timestamp: Date.now() - i * 60000,
    }));
}
/**
 * Create test data for server config
 */
function createMockServerConfig() {
    return {
        serverPort: 9090,
        downloadDir: "/home/user/downloads",
        logLevel: "info",
        format: "mp4",
        maxConcurrentDownloads: 3,
        timeout: 30000,
    };
}
/**
 * Create test data for extension config
 */
function createMockExtensionConfig() {
    return {
        theme: "light",
        autoStart: true,
        notifications: true,
        historyEnabled: true,
        maxHistoryItems: 100,
    };
}
/**
 * Assert that a function throws with specific error
 */
function expectAsyncError(fn, errorMessage) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield fn();
            throw new Error("Expected function to throw");
        }
        catch (error) {
            if (errorMessage) {
                expect(error).toHaveProperty("message", errorMessage);
            }
        }
    });
}
/**
 * Assert that logs contain specific messages
 */
function expectLogsContain(logger, messages) {
    const logs = logger.getLogs();
    messages.forEach((message) => {
        expect(logs.some((log) => log.message.includes(message))).toBe(true);
    });
}
/**
 * Assert that logs don't contain specific messages
 */
function expectLogsNotContain(logger, messages) {
    const logs = logger.getLogs();
    messages.forEach((message) => {
        expect(logs.some((log) => log.message.includes(message))).toBe(false);
    });
}
/**
 * Create a mock storage with predefined data
 */
function createMockStorage(data = {}) {
    const storage = new Map(Object.entries(data));
    return {
        get: jest.fn((keys) => {
            if (typeof keys === "string") {
                return Promise.resolve({ [keys]: storage.get(keys) });
            }
            const result = {};
            keys.forEach((key) => {
                result[key] = storage.get(key);
            });
            return Promise.resolve(result);
        }),
        set: jest.fn((data) => {
            Object.entries(data).forEach(([key, value]) => {
                storage.set(key, value);
            });
            return Promise.resolve();
        }),
        remove: jest.fn((keys) => {
            const keyArray = Array.isArray(keys) ? keys : [keys];
            keyArray.forEach((key) => storage.delete(key));
            return Promise.resolve();
        }),
        clear: jest.fn(() => {
            storage.clear();
            return Promise.resolve();
        }),
    };
}
/**
 * Create a mock runtime with predefined responses
 */
function createMockRuntime() {
    return {
        sendMessage: jest.fn().mockResolvedValue({ status: "success" }),
        getURL: jest.fn((path) => path),
        openOptionsPage: jest.fn(),
        onMessage: {
            addListener: jest.fn(),
            removeListener: jest.fn(),
        },
        lastError: undefined,
    };
}
/**
 * Create a mock tabs API
 */
function createMockTabs() {
    return {
        query: jest.fn().mockResolvedValue([]),
        sendMessage: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        remove: jest.fn().mockResolvedValue({}),
    };
}
/**
 * Test utilities for common assertions
 */
exports.testUtils = {
    /**
     * Assert that an element has specific classes
     */
    expectElementClasses(element, classes) {
        classes.forEach((className) => {
            expect(element.classList.contains(className)).toBe(true);
        });
    },
    /**
     * Assert that an element doesn't have specific classes
     */
    expectElementNotClasses(element, classes) {
        classes.forEach((className) => {
            expect(element.classList.contains(className)).toBe(false);
        });
    },
    /**
     * Assert that an element has specific attributes
     */
    expectElementAttributes(element, attributes) {
        Object.entries(attributes).forEach(([attr, value]) => {
            expect(element.getAttribute(attr)).toBe(value);
        });
    },
    /**
     * Assert that an element is visible
     */
    expectElementVisible(element) {
        expect(element.style.display).not.toBe("none");
        expect(element.style.visibility).not.toBe("hidden");
    },
    /**
     * Assert that an element is hidden
     */
    expectElementHidden(element) {
        expect(element.style.display).toBe("none");
    },
    /**
     * Assert that an element is disabled
     */
    expectElementDisabled(element) {
        expect(element.hasAttribute("disabled")).toBe(true);
    },
    /**
     * Assert that an element is enabled
     */
    expectElementEnabled(element) {
        expect(element.hasAttribute("disabled")).toBe(false);
    },
};
