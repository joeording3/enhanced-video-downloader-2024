"use strict";
/**
 * Shared Chrome API mock utilities for consistent testing across the extension
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockConfigs = exports.chromeAPIMocker = exports.ChromeAPIMocker = void 0;
exports.setupChromeAPI = setupChromeAPI;
exports.teardownChromeAPI = teardownChromeAPI;
class ChromeAPIMocker {
    constructor() {
        this.mock = this.createMock();
    }
    createMock() {
        return {
            runtime: {
                openOptionsPage: jest.fn(),
                getURL: jest.fn((path) => path),
                sendMessage: jest.fn(),
                onMessage: {
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                },
            },
            storage: {
                local: {
                    get: jest.fn().mockResolvedValue({}),
                    set: jest.fn().mockResolvedValue(undefined),
                    remove: jest.fn().mockResolvedValue(undefined),
                    clear: jest.fn().mockResolvedValue(undefined),
                },
                sync: {
                    get: jest.fn().mockResolvedValue({}),
                    set: jest.fn().mockResolvedValue(undefined),
                    remove: jest.fn().mockResolvedValue(undefined),
                    clear: jest.fn().mockResolvedValue(undefined),
                },
            },
            tabs: {
                query: jest.fn().mockResolvedValue([]),
                sendMessage: jest.fn().mockResolvedValue({}),
                create: jest.fn().mockResolvedValue({}),
                update: jest.fn().mockResolvedValue({}),
                remove: jest.fn().mockResolvedValue({}),
            },
            webNavigation: {
                onCompleted: {
                    addListener: jest.fn(),
                    removeListener: jest.fn(),
                },
            },
            contentScripts: {
                register: jest.fn().mockResolvedValue({}),
                unregister: jest.fn().mockResolvedValue({}),
            },
        };
    }
    setup() {
        this.originalChrome = global.chrome;
        global.chrome = this.mock;
    }
    teardown() {
        global.chrome = this.originalChrome;
    }
    getMock() {
        return this.mock;
    }
    // Storage helpers
    mockStorageGet(data) {
        this.mock.storage.local.get.mockResolvedValue(data);
        this.mock.storage.sync.get.mockResolvedValue(data);
    }
    mockStorageSet() {
        this.mock.storage.local.set.mockResolvedValue(undefined);
        this.mock.storage.sync.set.mockResolvedValue(undefined);
    }
    mockStorageError(error) {
        this.mock.storage.local.get.mockImplementation((key, callback) => {
            if (callback) {
                callback(error);
            }
            return Promise.reject(error);
        });
    }
    // Runtime helpers
    mockRuntimeSendMessage(response) {
        this.mock.runtime.sendMessage.mockImplementation((message, callback) => {
            if (callback) {
                callback(response);
            }
            return Promise.resolve(response);
        });
    }
    mockRuntimeError(error) {
        this.mock.runtime.lastError = error;
    }
    // Tabs helpers
    mockTabsQuery(tabs) {
        this.mock.tabs.query.mockResolvedValue(tabs);
    }
    mockTabsSendMessage(response) {
        this.mock.tabs.sendMessage.mockResolvedValue(response);
    }
    // Message helpers
    mockMessageListener(handler) {
        this.mock.runtime.onMessage.addListener.mockImplementation(handler);
    }
    // Navigation helpers
    mockWebNavigationListener(handler) {
        this.mock.webNavigation.onCompleted.addListener.mockImplementation(handler);
    }
    // Reset all mocks
    resetMocks() {
        jest.clearAllMocks();
        this.mock = this.createMock();
        global.chrome = this.mock;
    }
    // Get call counts
    getCallCount(apiPath) {
        const path = apiPath.split(".");
        let current = this.mock;
        for (const key of path) {
            current = current[key];
        }
        return current.mock.calls.length;
    }
    // Get last call arguments
    getLastCallArgs(apiPath) {
        const path = apiPath.split(".");
        let current = this.mock;
        for (const key of path) {
            current = current[key];
        }
        const calls = current.mock.calls;
        return calls.length > 0 ? calls[calls.length - 1] : [];
    }
}
exports.ChromeAPIMocker = ChromeAPIMocker;
// Default mock instance
exports.chromeAPIMocker = new ChromeAPIMocker();
// Helper function to setup Chrome API for tests
function setupChromeAPI() {
    exports.chromeAPIMocker.setup();
    return exports.chromeAPIMocker.getMock();
}
// Helper function to teardown Chrome API after tests
function teardownChromeAPI() {
    exports.chromeAPIMocker.teardown();
}
// Predefined mock configurations
exports.mockConfigs = {
    default: () => {
        exports.chromeAPIMocker.mockStorageGet({ theme: "light" });
        exports.chromeAPIMocker.mockStorageSet();
        exports.chromeAPIMocker.mockRuntimeSendMessage({ status: "success" });
    },
    withError: () => {
        exports.chromeAPIMocker.mockStorageError({ message: "Storage error" });
        exports.chromeAPIMocker.mockRuntimeError({ message: "Runtime error" });
    },
    withTheme: (theme) => {
        exports.chromeAPIMocker.mockStorageGet({ theme });
        exports.chromeAPIMocker.mockStorageSet();
    },
    withHistory: (history) => {
        exports.chromeAPIMocker.mockStorageGet({ downloadHistory: history });
        exports.chromeAPIMocker.mockStorageSet();
    },
    withConfig: (config) => {
        exports.chromeAPIMocker.mockStorageGet({ extensionConfig: config });
        exports.chromeAPIMocker.mockStorageSet();
    },
};
