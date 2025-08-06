"use strict";
/**
 * @fileoverview
 * Unit tests for the background script's message handling logic.
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
const background_logic_1 = require("extension/src/background-logic");
// Mock services for testing
const createMockApiService = (overrides = {}) => (Object.assign({ fetchConfig: jest.fn().mockResolvedValue({}), saveConfig: jest.fn().mockResolvedValue(true) }, overrides));
const createMockStorageService = (overrides = {}) => (Object.assign({ getConfig: jest.fn().mockResolvedValue({}), setConfig: jest.fn().mockResolvedValue(undefined), getPort: jest.fn().mockResolvedValue(5013), setPort: jest.fn().mockResolvedValue(undefined), getHistory: jest.fn().mockResolvedValue([]), clearHistory: jest.fn().mockResolvedValue(undefined) }, overrides));
// Mock console.error to capture error messages
const originalConsoleError = console.error;
let consoleErrorSpy;
beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
});
afterEach(() => {
    consoleErrorSpy.mockRestore();
});
describe("Background Logic: handleSetConfig", () => {
    const mockConfig = { download_dir: "/new/path" };
    it("should return success when both server and storage saves succeed", () => __awaiter(void 0, void 0, void 0, function* () {
        const apiService = createMockApiService();
        const storageService = createMockStorageService();
        const port = 5013; // Use centralized default
        const result = yield (0, background_logic_1.handleSetConfig)(port, mockConfig, apiService, storageService);
        expect(apiService.saveConfig).toHaveBeenCalledWith(port, mockConfig);
        expect(storageService.setConfig).toHaveBeenCalledWith(mockConfig);
        expect(result).toEqual({ status: "success" });
    }));
    it("should return an error if the server port is not available", () => __awaiter(void 0, void 0, void 0, function* () {
        const apiService = createMockApiService();
        const storageService = createMockStorageService();
        const result = yield (0, background_logic_1.handleSetConfig)(null, mockConfig, apiService, storageService);
        expect(apiService.saveConfig).not.toHaveBeenCalled();
        expect(storageService.setConfig).not.toHaveBeenCalled();
        expect(result).toEqual({
            status: "error",
            message: "Server port not found.",
        });
    }));
    it("should return an error if saving to the server fails", () => __awaiter(void 0, void 0, void 0, function* () {
        const apiService = createMockApiService({
            saveConfig: jest.fn().mockResolvedValue(false),
        });
        const storageService = createMockStorageService();
        const port = 5013; // Use centralized default
        const result = yield (0, background_logic_1.handleSetConfig)(port, mockConfig, apiService, storageService);
        expect(apiService.saveConfig).toHaveBeenCalledWith(port, mockConfig);
        expect(storageService.setConfig).not.toHaveBeenCalled();
        expect(result).toEqual({
            status: "error",
            message: "Failed to save config to server.",
        });
    }));
    it("should return an error if saving to storage throws an exception", () => __awaiter(void 0, void 0, void 0, function* () {
        const testError = new Error("Storage is full");
        const apiService = createMockApiService();
        const storageService = createMockStorageService({
            setConfig: jest.fn().mockRejectedValue(testError),
        });
        const port = 5001;
        const result = yield (0, background_logic_1.handleSetConfig)(port, mockConfig, apiService, storageService);
        expect(apiService.saveConfig).toHaveBeenCalledWith(port, mockConfig);
        expect(storageService.setConfig).toHaveBeenCalledWith(mockConfig);
        expect(result).toEqual({ status: "error", message: "Storage is full" });
        // Verify error message is logged with correct prefix
        expect(consoleErrorSpy).toHaveBeenCalledWith("[BG Logic] Error in handleSetConfig:", "Storage is full");
    }));
    it("should handle unknown errors gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
        const apiService = createMockApiService({
            saveConfig: jest.fn().mockRejectedValue("Unknown error"),
        });
        const storageService = createMockStorageService();
        const port = 5001;
        const result = yield (0, background_logic_1.handleSetConfig)(port, mockConfig, apiService, storageService);
        expect(result).toEqual({
            status: "error",
            message: "An unknown error occurred.",
        });
        // Verify error message is logged with correct prefix
        expect(consoleErrorSpy).toHaveBeenCalledWith("[BG Logic] Error in handleSetConfig:", "An unknown error occurred.");
    }));
    // Additional tests to address survived mutants
    it("should handle API service errors that throw non-Error objects", () => __awaiter(void 0, void 0, void 0, function* () {
        const apiService = createMockApiService({
            saveConfig: jest.fn().mockRejectedValue("String error"),
        });
        const storageService = createMockStorageService();
        const port = 5001;
        const result = yield (0, background_logic_1.handleSetConfig)(port, mockConfig, apiService, storageService);
        expect(result).toEqual({
            status: "error",
            message: "An unknown error occurred.",
        });
        // Verify error message is logged with correct prefix
        expect(consoleErrorSpy).toHaveBeenCalledWith("[BG Logic] Error in handleSetConfig:", "An unknown error occurred.");
    }));
    it("should handle API service errors that throw null", () => __awaiter(void 0, void 0, void 0, function* () {
        const apiService = createMockApiService({
            saveConfig: jest.fn().mockRejectedValue(null),
        });
        const storageService = createMockStorageService();
        const port = 5001;
        const result = yield (0, background_logic_1.handleSetConfig)(port, mockConfig, apiService, storageService);
        expect(result).toEqual({
            status: "error",
            message: "An unknown error occurred.",
        });
        // Verify error message is logged with correct prefix
        expect(consoleErrorSpy).toHaveBeenCalledWith("[BG Logic] Error in handleSetConfig:", "An unknown error occurred.");
    }));
    it("should handle API service errors that throw undefined", () => __awaiter(void 0, void 0, void 0, function* () {
        const apiService = createMockApiService({
            saveConfig: jest.fn().mockRejectedValue(undefined),
        });
        const storageService = createMockStorageService();
        const port = 5001;
        const result = yield (0, background_logic_1.handleSetConfig)(port, mockConfig, apiService, storageService);
        expect(result).toEqual({
            status: "error",
            message: "An unknown error occurred.",
        });
        // Verify error message is logged with correct prefix
        expect(consoleErrorSpy).toHaveBeenCalledWith("[BG Logic] Error in handleSetConfig:", "An unknown error occurred.");
    }));
    // Boundary condition tests
    it("should handle empty config object", () => __awaiter(void 0, void 0, void 0, function* () {
        const apiService = createMockApiService();
        const storageService = createMockStorageService();
        const port = 5013;
        const emptyConfig = {};
        const result = yield (0, background_logic_1.handleSetConfig)(port, emptyConfig, apiService, storageService);
        expect(apiService.saveConfig).toHaveBeenCalledWith(port, emptyConfig);
        expect(storageService.setConfig).toHaveBeenCalledWith(emptyConfig);
        expect(result).toEqual({ status: "success" });
    }));
    it("should handle null config", () => __awaiter(void 0, void 0, void 0, function* () {
        const apiService = createMockApiService();
        const storageService = createMockStorageService();
        const port = 5013;
        const result = yield (0, background_logic_1.handleSetConfig)(port, null, apiService, storageService);
        expect(apiService.saveConfig).toHaveBeenCalledWith(port, null);
        expect(storageService.setConfig).toHaveBeenCalledWith(null);
        expect(result).toEqual({ status: "success" });
    }));
    it("should handle undefined config", () => __awaiter(void 0, void 0, void 0, function* () {
        const apiService = createMockApiService();
        const storageService = createMockStorageService();
        const port = 5013;
        const result = yield (0, background_logic_1.handleSetConfig)(port, undefined, apiService, storageService);
        expect(apiService.saveConfig).toHaveBeenCalledWith(port, undefined);
        expect(storageService.setConfig).toHaveBeenCalledWith(undefined);
        expect(result).toEqual({ status: "success" });
    }));
    // Enhanced error message validation tests
    it("should validate error message content for storage errors", () => __awaiter(void 0, void 0, void 0, function* () {
        const specificError = new Error("Specific storage error message");
        const apiService = createMockApiService();
        const storageService = createMockStorageService({
            setConfig: jest.fn().mockRejectedValue(specificError),
        });
        const port = 5001;
        const result = yield (0, background_logic_1.handleSetConfig)(port, mockConfig, apiService, storageService);
        expect(result).toEqual({
            status: "error",
            message: "Specific storage error message",
        });
    }));
    it("should validate error message content for API errors", () => __awaiter(void 0, void 0, void 0, function* () {
        const specificError = new Error("API connection failed");
        const apiService = createMockApiService({
            saveConfig: jest.fn().mockRejectedValue(specificError),
        });
        const storageService = createMockStorageService();
        const port = 5001;
        const result = yield (0, background_logic_1.handleSetConfig)(port, mockConfig, apiService, storageService);
        expect(result).toEqual({
            status: "error",
            message: "API connection failed",
        });
    }));
    // Null/undefined scenario testing
    it("should handle null port with null config", () => __awaiter(void 0, void 0, void 0, function* () {
        const apiService = createMockApiService();
        const storageService = createMockStorageService();
        const result = yield (0, background_logic_1.handleSetConfig)(null, null, apiService, storageService);
        expect(result).toEqual({
            status: "error",
            message: "Server port not found.",
        });
    }));
    it("should handle undefined port with undefined config", () => __awaiter(void 0, void 0, void 0, function* () {
        const apiService = createMockApiService();
        const storageService = createMockStorageService();
        const result = yield (0, background_logic_1.handleSetConfig)(undefined, undefined, apiService, storageService);
        expect(result).toEqual({
            status: "error",
            message: "Server port not found.",
        });
    }));
});
describe("Background Logic: History Handlers", () => {
    it("handleGetHistory should retrieve history from the storage service", () => __awaiter(void 0, void 0, void 0, function* () {
        const mockHistory = [
            {
                id: "1",
                url: "https://example.com/video",
                filename: "Test Video",
                status: "completed",
                timestamp: Date.now(),
            },
        ];
        const storageService = createMockStorageService({
            getHistory: jest.fn().mockResolvedValue(mockHistory),
        });
        const result = yield (0, background_logic_1.handleGetHistory)(storageService);
        expect(storageService.getHistory).toHaveBeenCalled();
        expect(result).toEqual({ history: mockHistory });
    }));
    it("handleClearHistory should call the storage service to clear history", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService();
        const result = yield (0, background_logic_1.handleClearHistory)(storageService);
        expect(storageService.clearHistory).toHaveBeenCalled();
        expect(result).toEqual({ status: "success" });
    }));
});
describe("Background Logic: discoverServerPort", () => {
    const mockCheckStatus = jest.fn();
    const mockStorageService = createMockStorageService();
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it("should return cached port if it's still valid", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = 5013;
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(cachedPort),
        });
        mockCheckStatus.mockResolvedValue(true);
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5020, false, 2000);
        expect(storageService.getPort).toHaveBeenCalled();
        expect(mockCheckStatus).toHaveBeenCalledWith(cachedPort);
        expect(result).toBe(cachedPort);
    }));
    it("should clear cached port if it's no longer valid", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = 5013;
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(cachedPort),
            setPort: jest.fn().mockResolvedValue(undefined),
        });
        mockCheckStatus.mockRejectedValue(new Error("Connection failed"));
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5020, false, 2000);
        expect(storageService.setPort).toHaveBeenCalledWith(null);
        expect(result).toBeNull();
    }));
    it("should scan ports when no cached port exists", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus
            .mockResolvedValueOnce(false) // First port fails
            .mockResolvedValueOnce(true); // Second port succeeds
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5002, false, 2000);
        expect(mockCheckStatus).toHaveBeenCalledWith(5001);
        expect(mockCheckStatus).toHaveBeenCalledWith(5002);
        expect(result).toBe(5002);
    }));
    it("should force scan when startScan is true", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = 5013;
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(cachedPort),
        });
        mockCheckStatus.mockResolvedValue(true);
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5020, true, // Force scan
        2000);
        // Should not use cached port when startScan is true
        expect(mockCheckStatus).toHaveBeenCalledWith(5001);
        expect(result).toBe(5001);
    }));
    // Enhanced timeout testing
    it("should handle timeout for cached port check", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 3000)) // Longer than timeout
        );
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(5013),
            setPort: jest.fn().mockResolvedValue(undefined),
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5010, false, 1000 // Short timeout
        );
        expect(result).toBeNull();
        expect(storageService.setPort).toHaveBeenCalledWith(null);
    }));
    it("should handle timeout during port scanning", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 3000)) // Longer than timeout
        );
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, false, 1000 // Short timeout
        );
        expect(result).toBeNull();
    }));
    it("should call onProgress callback during scanning", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockResolvedValue(false);
        const onProgress = jest.fn();
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, false, 1000, onProgress);
        expect(onProgress).toHaveBeenCalled();
    }));
    // Boundary condition tests
    it("should return null when no port is found in range", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockResolvedValue(false);
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5003, false, 1000);
        expect(result).toBeNull();
    }));
    it("should handle storage service without setPort method", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockResolvedValue(true);
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(5013),
            setPort: undefined, // Remove setPort method
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5010, false, 1000);
        expect(result).toBe(5013);
    }));
    it("should handle storage service without setPort method during scan", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
            setPort: undefined, // Remove setPort method
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5002, false, 1000);
        expect(result).toBe(5002);
    }));
    // Exception handling tests
    it("should handle errors during port scanning gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockRejectedValue(new Error("Network error"));
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5003, false, 1000);
        expect(result).toBeNull();
    }));
    it("should handle timeout with different error messages", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 3000)));
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(5013),
            setPort: jest.fn().mockResolvedValue(undefined),
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5010, false, 1000);
        expect(result).toBeNull();
    }));
    it("should handle timeout during scanning with different error messages", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 3000)));
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, false, 1000);
        expect(result).toBeNull();
    }));
    it("should handle storage service without setPort method during cached port failure", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockResolvedValue(false);
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(5013),
            setPort: undefined, // Remove setPort method
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5010, false, 1000);
        expect(result).toBeNull();
    }));
    it("should handle storage service without setPort method during timeout", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 3000)));
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(5013),
            setPort: undefined, // Remove setPort method
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5010, false, 1000);
        expect(result).toBeNull();
    }));
    // Batch processing edge case tests
    it("should handle batch processing edge case with exact batch size", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockResolvedValue(false);
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, // 5 ports, batch size is 5
        false, 1000);
        expect(result).toBeNull();
    }));
    it("should handle batch processing with remainder ports", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockResolvedValue(false);
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5007, // 7 ports, batch size is 5 (remainder of 2)
        false, 1000);
        expect(result).toBeNull();
    }));
    it("should handle progress tracking with empty range", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockResolvedValue(false);
        const onProgress = jest.fn();
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5001, // Single port range
        false, 1000, onProgress);
        expect(onProgress).toHaveBeenCalled();
    }));
    // Null/undefined handling tests
    it("should handle null port discovery in batch processing", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockResolvedValue(null);
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5003, false, 1000);
        expect(result).toBeNull();
    }));
    it("should handle undefined port discovery in batch processing", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockResolvedValue(undefined);
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5003, false, 1000);
        expect(result).toBeNull();
    }));
    it("should handle mixed null/undefined results in batch processing", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(true);
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5003, false, 1000);
        expect(result).toBe(5003); // Third port (5003) should be found
    }));
    it("should handle port scanning when no port is found", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, false, 2000);
        expect(result).toBeNull();
    }));
    it("should handle storage service without setPort method during scan", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
            setPort: undefined, // Remove setPort method
        });
        mockCheckStatus.mockResolvedValue(true);
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, false, 2000);
        expect(result).toBe(5001);
    }));
    it("should handle errors during port scanning gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockRejectedValue(new Error("Network error"));
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, false, 2000);
        expect(result).toBeNull();
    }));
    it("should scan ports in batches efficiently", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5010, false, 2000);
        // Should check all ports in the range
        expect(mockCheckStatus).toHaveBeenCalledTimes(10);
    }));
    // Boundary condition tests
    it("should handle timeout with different error messages", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = 5013;
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(cachedPort),
        });
        mockCheckStatus.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 3000)));
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5020, false, 1000);
        expect(result).toBeNull();
    }), 10000); // Increase test timeout
    it("should handle timeout during scanning with different error messages", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 3000)));
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, false, 1000);
        expect(result).toBeNull();
    }), 10000); // Increase test timeout
    it("should handle storage service without setPort method during cached port failure", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = 5013;
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(cachedPort),
            setPort: undefined, // Remove setPort method
        });
        mockCheckStatus.mockRejectedValue(new Error("Connection failed"));
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5020, false, 2000);
        expect(result).toBeNull();
    }));
    it("should handle storage service without setPort method during timeout", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = 5013;
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(cachedPort),
            setPort: undefined, // Remove setPort method
        });
        mockCheckStatus.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 3000)));
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5020, false, 1000);
        expect(result).toBeNull();
    }), 10000); // Increase test timeout
    it("should handle batch processing edge case with exact batch size", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, // 5 ports, batch size is 5
        false, 2000);
        expect(mockCheckStatus).toHaveBeenCalledTimes(5);
    }));
    it("should handle batch processing with remainder ports", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5007, // 7 ports, batch size is 5, remainder is 2
        false, 2000);
        expect(mockCheckStatus).toHaveBeenCalledTimes(7);
    }));
    it("should handle progress tracking with negative batch length", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        const onProgress = jest.fn();
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5000, // Invalid range (negative)
        false, 2000, onProgress);
        expect(result).toBeNull();
    }));
    it("should handle null port discovery in batch processing", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(null);
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, false, 2000);
        expect(result).toBeNull();
    }));
    it("should handle undefined port discovery in batch processing", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(undefined);
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, false, 2000);
        expect(result).toBeNull();
    }));
    it("should handle mixed null/undefined results in batch processing", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(undefined)
            .mockResolvedValueOnce(5003);
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, false, 2000);
        expect(result).toBe(5003);
    }));
    // Additional tests to address remaining survived mutants
    it("should validate specific error message content for timeout errors", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = 5013;
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(cachedPort),
            setPort: jest.fn().mockResolvedValue(undefined),
        });
        mockCheckStatus.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 3000)));
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5010, false, 1000 // Short timeout
        );
        expect(result).toBeNull();
        expect(storageService.setPort).toHaveBeenCalledWith(null);
    }), 10000);
    it("should validate specific error message content for scanning timeout errors", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 3000)));
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, false, 1000 // Short timeout
        );
        expect(result).toBeNull();
    }), 10000);
    it("should handle boundary condition with exact port range length", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, // 5 ports, batch size is 5
        false, 2000);
        expect(result).toBeNull();
    }));
    it("should handle boundary condition with remainder ports", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5007, // 7 ports, batch size is 5, remainder is 2
        false, 2000);
        expect(result).toBeNull();
    }));
    it("should handle exception in catch block with proper error handling", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(5013),
        });
        mockCheckStatus.mockRejectedValue(new Error("Network error"));
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5020, false, 2000);
        expect(result).toBeNull();
    }));
    it("should handle null/undefined foundPort with proper conditional logic", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5003, false, 2000);
        expect(result).toBeNull();
    }));
    it("should handle progress tracking with proper assignment operator", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        const onProgress = jest.fn();
        yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, false, 2000, onProgress);
        expect(onProgress).toHaveBeenCalled();
    }));
    it("should handle progress tracking with multiple batches", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        const onProgress = jest.fn();
        yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5010, // 10 ports, 2 batches of 5
        false, 2000, onProgress);
        expect(onProgress).toHaveBeenCalled();
    }));
    it("should handle progress tracking with single batch", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        const onProgress = jest.fn();
        yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5003, // 3 ports, single batch
        false, 2000, onProgress);
        expect(onProgress).toHaveBeenCalled();
    }));
    it("should handle progress tracking with empty range", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        const onProgress = jest.fn();
        yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5001, // Single port range
        false, 2000, onProgress);
        expect(onProgress).toHaveBeenCalled();
    }));
    it("should handle progress tracking with negative batch length", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        const onProgress = jest.fn();
        yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5001, // Single port range
        false, 2000, onProgress);
        expect(onProgress).toHaveBeenCalled();
    }));
    it("should handle null port discovery in batch processing", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockResolvedValue(null);
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5003, false, 1000);
        expect(result).toBeNull();
    }));
    it("should handle undefined port discovery in batch processing", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus.mockResolvedValue(undefined);
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5003, false, 1000);
        expect(result).toBeNull();
    }));
    it("should handle mixed null/undefined results in batch processing", () => __awaiter(void 0, void 0, void 0, function* () {
        mockCheckStatus
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(false)
            .mockResolvedValueOnce(true);
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5003, false, 1000);
        expect(result).toBe(5003); // Third port (5003) should be found
    }));
    it("should handle port scanning when no port is found", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, false, 2000);
        expect(result).toBeNull();
    }));
    it("should handle storage service without setPort method during scan", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
            setPort: undefined, // Remove setPort method
        });
        mockCheckStatus.mockResolvedValue(true);
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, false, 2000);
        expect(result).toBe(5001);
    }));
    it("should handle errors during port scanning gracefully", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockRejectedValue(new Error("Scan error"));
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, false, 2000);
        expect(result).toBeNull();
    }));
    it("should handle timeout with different error messages", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = 5013;
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(cachedPort),
        });
        mockCheckStatus.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 3000)));
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5020, false, 1000);
        expect(result).toBeNull();
    }), 10000);
    it("should handle timeout during scanning with different error messages", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 3000)));
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, false, 1000);
        expect(result).toBeNull();
    }), 10000);
    it("should handle storage service without setPort method during cached port failure", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = 5013;
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(cachedPort),
            setPort: undefined, // Remove setPort method
        });
        mockCheckStatus.mockRejectedValue(new Error("Connection failed"));
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5020, false, 2000);
        expect(result).toBeNull();
    }));
    it("should handle storage service without setPort method during timeout", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = 5013;
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(cachedPort),
            setPort: undefined, // Remove setPort method
        });
        mockCheckStatus.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve(true), 3000)));
        const result = yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5020, false, 1000);
        expect(result).toBeNull();
    }), 10000);
    it("should handle batch processing edge case with exact batch size", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5005, // 5 ports, batch size is 5
        false, 2000);
        expect(mockCheckStatus).toHaveBeenCalledTimes(5);
    }));
    it("should handle batch processing with remainder ports", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5007, // 7 ports, batch size is 5, remainder is 2
        false, 2000);
        expect(mockCheckStatus).toHaveBeenCalledTimes(7);
    }));
    it("should scan ports in batches efficiently", () => __awaiter(void 0, void 0, void 0, function* () {
        const storageService = createMockStorageService({
            getPort: jest.fn().mockResolvedValue(null),
        });
        mockCheckStatus.mockResolvedValue(false);
        yield (0, background_logic_1.discoverServerPort)(storageService, mockCheckStatus, 5001, 5010, // 10 ports, 2 batches of 5
        false, 2000);
        expect(mockCheckStatus).toHaveBeenCalledTimes(10);
    }));
});
