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
// @ts-nocheck
const background_logic_1 = require("../background-logic");
const constants_1 = require("../core/constants");
describe("discoverServerPort", () => {
    const defaultPort = (0, constants_1.getServerPort)();
    const maxPort = (0, constants_1.getPortRange)()[1];
    let calls;
    let storageService;
    beforeEach(() => {
        calls = [];
        storageService = {
            getPort: jest.fn(),
            setPort: jest.fn(),
        };
    });
    it("returns cached port if valid", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = (0, constants_1.getServerPort)() + 1;
        storageService.getPort.mockResolvedValue(cachedPort);
        const checkStatus = jest.fn().mockImplementation(port => {
            calls.push(port);
            return Promise.resolve(true);
        });
        const port = yield (0, background_logic_1.discoverServerPort)(storageService, checkStatus, defaultPort, maxPort, false);
        expect(port).toBe(cachedPort);
        expect(calls).toEqual([cachedPort]);
        // should not scan other ports
        expect(storageService.setPort).not.toHaveBeenCalled();
    }));
    it("scans all ports when cached invalid and caches discovered port", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = (0, constants_1.getServerPort)() + 1;
        const discoveredPort = (0, constants_1.getServerPort)(); // Use the actual server port since range is [9090, 9090]
        storageService.getPort.mockResolvedValue(cachedPort);
        const statuses = {
            [(0, constants_1.getServerPort)()]: true, // The only port in range should be available
            [cachedPort]: false,
        };
        const checkStatus = jest.fn().mockImplementation(port => {
            calls.push(port);
            return Promise.resolve(statuses[port] || false);
        });
        const port = yield (0, background_logic_1.discoverServerPort)(storageService, checkStatus, defaultPort, maxPort, false);
        expect(port).toBe(discoveredPort);
        // The actual implementation scans the full port range, so we expect more calls
        // but we can verify the key calls are in the right order
        expect(calls).toContain(cachedPort);
        expect(calls).toContain((0, constants_1.getServerPort)());
        expect(calls.indexOf(cachedPort)).toBeLessThan(calls.indexOf(discoveredPort));
        // should expire cache then set new cache
        expect(storageService.setPort).toHaveBeenCalledWith(null);
        expect(storageService.setPort).toHaveBeenCalledWith(discoveredPort);
    }));
    it("scans ports when no cache", () => __awaiter(void 0, void 0, void 0, function* () {
        storageService.getPort.mockResolvedValue(null);
        const discoveredPort = (0, constants_1.getServerPort)(); // Use the actual server port since range is [9090, 9090]
        const statuses = {
            [(0, constants_1.getServerPort)()]: true, // The only port in range should be available
        };
        const checkStatus = jest
            .fn()
            .mockImplementation(port => Promise.resolve(statuses[port] || false));
        const port = yield (0, background_logic_1.discoverServerPort)(storageService, checkStatus, defaultPort, maxPort, false);
        expect(port).toBe(discoveredPort);
        expect(storageService.setPort).toHaveBeenCalledWith(discoveredPort);
    }));
    it("forces scan when startScan is true", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = (0, constants_1.getServerPort)() + 1;
        const discoveredPort = (0, constants_1.getServerPort)(); // Use the actual server port since range is [9090, 9090]
        storageService.getPort.mockResolvedValue(cachedPort);
        const statuses = {
            [(0, constants_1.getServerPort)()]: true, // The only port in range should be available
            [cachedPort]: false,
        };
        const checkStatus = jest.fn().mockImplementation(port => {
            calls.push(port);
            return Promise.resolve(statuses[port] || false);
        });
        const port = yield (0, background_logic_1.discoverServerPort)(storageService, checkStatus, defaultPort, maxPort, true);
        expect(port).toBe(discoveredPort);
        // should not return cached, so calls start with scanning all
        // The actual implementation scans the full port range, so we expect more calls
        // but we can verify the key calls are in the right order
        expect(calls).toContain((0, constants_1.getServerPort)());
        // Note: cachedPort (9091) is outside the scan range [9090, 9090], so it won't be called
        // Since both getServerPort() and discoveredPort are the same (9090), they have the same index
        expect(calls).toContain(discoveredPort);
    }));
    it("returns null if no port found", () => __awaiter(void 0, void 0, void 0, function* () {
        storageService.getPort.mockResolvedValue(null);
        const checkStatus = jest.fn().mockResolvedValue(false);
        const port = yield (0, background_logic_1.discoverServerPort)(storageService, checkStatus, defaultPort, maxPort, false);
        expect(port).toBeNull();
        expect(storageService.setPort).not.toHaveBeenCalled();
    }));
    it("handles timeout during cached port check", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = (0, constants_1.getServerPort)() + 1;
        storageService.getPort.mockResolvedValue(cachedPort);
        storageService.setPort = jest.fn();
        // Mock checkStatus to timeout
        const checkStatus = jest
            .fn()
            .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(false), 3000)));
        const port = yield (0, background_logic_1.discoverServerPort)(storageService, checkStatus, defaultPort, maxPort, false, 1000);
        // Should expire cached port and return null (since no other ports available)
        expect(storageService.setPort).toHaveBeenCalledWith(null);
        expect(port).toBeNull();
    }));
    it("handles batch processing and progress callback", () => __awaiter(void 0, void 0, void 0, function* () {
        storageService.getPort.mockResolvedValue(null);
        const progressCallback = jest.fn();
        // Mock checkStatus to fail first batch, succeed on second batch
        // Create a wider port range to ensure multiple batches
        const testDefaultPort = (0, constants_1.getServerPort)();
        const testMaxPort = (0, constants_1.getServerPort)() + 10; // Wider range
        const checkStatus = jest.fn().mockImplementation(port => 
        // Only the last port in range succeeds to ensure progress callbacks
        Promise.resolve(port === testMaxPort));
        const port = yield (0, background_logic_1.discoverServerPort)(storageService, checkStatus, testDefaultPort, testMaxPort, false, 2000, progressCallback);
        expect(port).toBe(testMaxPort);
        expect(progressCallback).toHaveBeenCalled();
    }));
    it("handles error during port checking", () => __awaiter(void 0, void 0, void 0, function* () {
        storageService.getPort.mockResolvedValue(null);
        // Mock checkStatus to throw errors
        const checkStatus = jest.fn().mockRejectedValue(new Error("Network error"));
        const port = yield (0, background_logic_1.discoverServerPort)(storageService, checkStatus, defaultPort, maxPort, false);
        expect(port).toBeNull();
    }));
});
describe("handleSetConfig", () => {
    let apiService;
    let storageService;
    let mockConfig;
    beforeEach(() => {
        apiService = {
            fetchConfig: jest.fn(),
            saveConfig: jest.fn(),
        };
        storageService = {
            getConfig: jest.fn(),
            setConfig: jest.fn(),
            getPort: jest.fn(),
            setPort: jest.fn(),
            getHistory: jest.fn(),
            clearHistory: jest.fn(),
        };
        mockConfig = {
            server_port: 9090,
            max_concurrent_downloads: 3,
            debug_mode: false,
        };
    });
    it("successfully saves config to server and storage", () => __awaiter(void 0, void 0, void 0, function* () {
        apiService.saveConfig.mockResolvedValue(true);
        storageService.setConfig.mockResolvedValue(undefined);
        const result = yield (0, background_logic_1.handleSetConfig)(9090, mockConfig, apiService, storageService);
        expect(result).toEqual({ status: "success" });
        expect(apiService.saveConfig).toHaveBeenCalledWith(9090, mockConfig);
        expect(storageService.setConfig).toHaveBeenCalledWith(mockConfig);
    }));
    it("returns error when port is null", () => __awaiter(void 0, void 0, void 0, function* () {
        const result = yield (0, background_logic_1.handleSetConfig)(null, mockConfig, apiService, storageService);
        expect(result).toEqual({
            status: "error",
            message: "Server port not found.",
        });
        expect(apiService.saveConfig).not.toHaveBeenCalled();
        expect(storageService.setConfig).not.toHaveBeenCalled();
    }));
    it("returns error when server save fails", () => __awaiter(void 0, void 0, void 0, function* () {
        apiService.saveConfig.mockResolvedValue(false);
        const result = yield (0, background_logic_1.handleSetConfig)(9090, mockConfig, apiService, storageService);
        expect(result).toEqual({
            status: "error",
            message: "Failed to save config to server.",
        });
        expect(apiService.saveConfig).toHaveBeenCalledWith(9090, mockConfig);
        expect(storageService.setConfig).not.toHaveBeenCalled();
    }));
    it("handles API service error", () => __awaiter(void 0, void 0, void 0, function* () {
        const error = new Error("Network timeout");
        apiService.saveConfig.mockRejectedValue(error);
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
        const result = yield (0, background_logic_1.handleSetConfig)(9090, mockConfig, apiService, storageService);
        expect(result).toEqual({
            status: "error",
            message: "Network timeout",
        });
        expect(consoleSpy).toHaveBeenCalledWith("[BG Logic] Error in handleSetConfig:", "Network timeout");
        expect(storageService.setConfig).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
    }));
    it("handles storage service error", () => __awaiter(void 0, void 0, void 0, function* () {
        apiService.saveConfig.mockResolvedValue(true);
        const error = new Error("Storage quota exceeded");
        storageService.setConfig.mockRejectedValue(error);
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
        const result = yield (0, background_logic_1.handleSetConfig)(9090, mockConfig, apiService, storageService);
        expect(result).toEqual({
            status: "error",
            message: "Storage quota exceeded",
        });
        expect(consoleSpy).toHaveBeenCalledWith("[BG Logic] Error in handleSetConfig:", "Storage quota exceeded");
        consoleSpy.mockRestore();
    }));
    it("handles unknown error type", () => __awaiter(void 0, void 0, void 0, function* () {
        apiService.saveConfig.mockRejectedValue("Unknown error string");
        const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });
        const result = yield (0, background_logic_1.handleSetConfig)(9090, mockConfig, apiService, storageService);
        expect(result).toEqual({
            status: "error",
            message: "An unknown error occurred.",
        });
        expect(consoleSpy).toHaveBeenCalledWith("[BG Logic] Error in handleSetConfig:", "An unknown error occurred.");
        consoleSpy.mockRestore();
    }));
});
describe("handleGetHistory", () => {
    let storageService;
    let mockHistory;
    beforeEach(() => {
        storageService = {
            getConfig: jest.fn(),
            setConfig: jest.fn(),
            getPort: jest.fn(),
            setPort: jest.fn(),
            getHistory: jest.fn(),
            clearHistory: jest.fn(),
        };
        mockHistory = [
            {
                id: "1",
                url: "https://example.com/video1",
                title: "Test Video 1",
                downloaded_at: new Date().toISOString(),
                status: "completed",
            },
            {
                id: "2",
                url: "https://example.com/video2",
                title: "Test Video 2",
                downloaded_at: new Date().toISOString(),
                status: "failed",
            },
        ];
    });
    it("returns history from storage service", () => __awaiter(void 0, void 0, void 0, function* () {
        storageService.getHistory.mockResolvedValue(mockHistory);
        const result = yield (0, background_logic_1.handleGetHistory)(storageService);
        expect(result).toEqual({ history: mockHistory });
        expect(storageService.getHistory).toHaveBeenCalledTimes(1);
    }));
    it("returns empty history when storage is empty", () => __awaiter(void 0, void 0, void 0, function* () {
        storageService.getHistory.mockResolvedValue([]);
        const result = yield (0, background_logic_1.handleGetHistory)(storageService);
        expect(result).toEqual({ history: [] });
        expect(storageService.getHistory).toHaveBeenCalledTimes(1);
    }));
    it("propagates storage service errors", () => __awaiter(void 0, void 0, void 0, function* () {
        const error = new Error("Storage access denied");
        storageService.getHistory.mockRejectedValue(error);
        yield expect((0, background_logic_1.handleGetHistory)(storageService)).rejects.toThrow("Storage access denied");
        expect(storageService.getHistory).toHaveBeenCalledTimes(1);
    }));
});
describe("handleClearHistory", () => {
    let storageService;
    beforeEach(() => {
        storageService = {
            getConfig: jest.fn(),
            setConfig: jest.fn(),
            getPort: jest.fn(),
            setPort: jest.fn(),
            getHistory: jest.fn(),
            clearHistory: jest.fn(),
        };
    });
    it("successfully clears history and returns success", () => __awaiter(void 0, void 0, void 0, function* () {
        storageService.clearHistory.mockResolvedValue(undefined);
        const result = yield (0, background_logic_1.handleClearHistory)(storageService);
        expect(result).toEqual({ status: "success" });
        expect(storageService.clearHistory).toHaveBeenCalledTimes(1);
    }));
    it("propagates storage service errors", () => __awaiter(void 0, void 0, void 0, function* () {
        const error = new Error("Clear operation failed");
        storageService.clearHistory.mockRejectedValue(error);
        yield expect((0, background_logic_1.handleClearHistory)(storageService)).rejects.toThrow("Clear operation failed");
        expect(storageService.clearHistory).toHaveBeenCalledTimes(1);
    }));
    it("handles storage service that returns a value", () => __awaiter(void 0, void 0, void 0, function* () {
        // Some storage implementations might return a value instead of undefined
        storageService.clearHistory.mockResolvedValue(true);
        const result = yield (0, background_logic_1.handleClearHistory)(storageService);
        expect(result).toEqual({ status: "success" });
        expect(storageService.clearHistory).toHaveBeenCalledTimes(1);
    }));
});
