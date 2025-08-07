/**
 * @fileoverview
 * Unit tests for the background script's message handling logic.
 */

import {
  handleSetConfig,
  handleGetHistory,
  handleClearHistory,
  discoverServerPort,
} from "extension/src/background-logic";
import type {
  ApiService,
  StorageService,
} from "extension/src/background-logic";
import type { ServerConfig, HistoryEntry } from "extension/src/types";
import {
  getServerPort,
  getClientPort,
  getPortRange,
} from "../../extension/src/constants";

// Mock services for testing
const createMockApiService = (
  overrides: Partial<ApiService> = {}
): ApiService => ({
  fetchConfig: jest.fn().mockResolvedValue({}),
  saveConfig: jest.fn().mockResolvedValue(true),
  ...overrides,
});

const createMockStorageService = (
  overrides: Partial<StorageService> = {}
): StorageService => ({
  getConfig: jest.fn().mockResolvedValue({}),
  setConfig: jest.fn().mockResolvedValue(undefined),
  getPort: jest.fn().mockResolvedValue(5013), // Use centralized default
  setPort: jest.fn().mockResolvedValue(undefined),
  getHistory: jest.fn().mockResolvedValue([]),
  clearHistory: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

// Mock console.error to capture error messages
const originalConsoleError = console.error;
let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});

describe("Background Logic: handleSetConfig", () => {
  const mockConfig: Partial<ServerConfig> = { download_dir: "/new/path" };

  it("should return success when both server and storage saves succeed", async () => {
    const apiService = createMockApiService();
    const storageService = createMockStorageService();
    const port = 5013; // Use centralized default

    const result = await handleSetConfig(
      port,
      mockConfig,
      apiService,
      storageService
    );

    expect(apiService.saveConfig).toHaveBeenCalledWith(port, mockConfig);
    expect(storageService.setConfig).toHaveBeenCalledWith(mockConfig);
    expect(result).toEqual({ status: "success" });
  });

  it("should return an error if the server port is not available", async () => {
    const apiService = createMockApiService();
    const storageService = createMockStorageService();

    const result = await handleSetConfig(
      null,
      mockConfig,
      apiService,
      storageService
    );

    expect(apiService.saveConfig).not.toHaveBeenCalled();
    expect(storageService.setConfig).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "error",
      message: "Server port not found.",
    });
  });

  it("should return an error if saving to the server fails", async () => {
    const apiService = createMockApiService({
      saveConfig: jest.fn().mockResolvedValue(false),
    });
    const storageService = createMockStorageService();
    const port = 5013; // Use centralized default

    const result = await handleSetConfig(
      port,
      mockConfig,
      apiService,
      storageService
    );

    expect(apiService.saveConfig).toHaveBeenCalledWith(port, mockConfig);
    expect(storageService.setConfig).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "error",
      message: "Failed to save config to server.",
    });
  });

  it("should return an error if saving to storage throws an exception", async () => {
    const testError = new Error("Storage is full");
    const apiService = createMockApiService();
    const storageService = createMockStorageService({
      setConfig: jest.fn().mockRejectedValue(testError),
    });
    const port = 5001;

    const result = await handleSetConfig(
      port,
      mockConfig,
      apiService,
      storageService
    );

    expect(apiService.saveConfig).toHaveBeenCalledWith(port, mockConfig);
    expect(storageService.setConfig).toHaveBeenCalledWith(mockConfig);
    expect(result).toEqual({ status: "error", message: "Storage is full" });

    // Verify error message is logged with correct prefix
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[BG Logic] Error in handleSetConfig:",
      "Storage is full"
    );
  });

  it("should handle unknown errors gracefully", async () => {
    const apiService = createMockApiService({
      saveConfig: jest.fn().mockRejectedValue("Unknown error"),
    });
    const storageService = createMockStorageService();
    const port = 5001;

    const result = await handleSetConfig(
      port,
      mockConfig,
      apiService,
      storageService
    );

    expect(result).toEqual({
      status: "error",
      message: "An unknown error occurred.",
    });

    // Verify error message is logged with correct prefix
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[BG Logic] Error in handleSetConfig:",
      "An unknown error occurred."
    );
  });

  // Additional tests to address survived mutants
  it("should handle API service errors that throw non-Error objects", async () => {
    const apiService = createMockApiService({
      saveConfig: jest.fn().mockRejectedValue("String error"),
    });
    const storageService = createMockStorageService();
    const port = 5001;

    const result = await handleSetConfig(
      port,
      mockConfig,
      apiService,
      storageService
    );

    expect(result).toEqual({
      status: "error",
      message: "An unknown error occurred.",
    });

    // Verify error message is logged with correct prefix
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[BG Logic] Error in handleSetConfig:",
      "An unknown error occurred."
    );
  });

  it("should handle API service errors that throw null", async () => {
    const apiService = createMockApiService({
      saveConfig: jest.fn().mockRejectedValue(null),
    });
    const storageService = createMockStorageService();
    const port = 5001;

    const result = await handleSetConfig(
      port,
      mockConfig,
      apiService,
      storageService
    );

    expect(result).toEqual({
      status: "error",
      message: "An unknown error occurred.",
    });

    // Verify error message is logged with correct prefix
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[BG Logic] Error in handleSetConfig:",
      "An unknown error occurred."
    );
  });

  it("should handle API service errors that throw undefined", async () => {
    const apiService = createMockApiService({
      saveConfig: jest.fn().mockRejectedValue(undefined),
    });
    const storageService = createMockStorageService();
    const port = 5001;

    const result = await handleSetConfig(
      port,
      mockConfig,
      apiService,
      storageService
    );

    expect(result).toEqual({
      status: "error",
      message: "An unknown error occurred.",
    });

    // Verify error message is logged with correct prefix
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[BG Logic] Error in handleSetConfig:",
      "An unknown error occurred."
    );
  });

  // Boundary condition tests
  it("should handle empty config object", async () => {
    const apiService = createMockApiService();
    const storageService = createMockStorageService();
    const port = 5013;
    const emptyConfig = {};

    const result = await handleSetConfig(
      port,
      emptyConfig,
      apiService,
      storageService
    );

    expect(apiService.saveConfig).toHaveBeenCalledWith(port, emptyConfig);
    expect(storageService.setConfig).toHaveBeenCalledWith(emptyConfig);
    expect(result).toEqual({ status: "success" });
  });

  it("should handle null config", async () => {
    const apiService = createMockApiService();
    const storageService = createMockStorageService();
    const port = 5013;

    const result = await handleSetConfig(
      port,
      null as any,
      apiService,
      storageService
    );

    expect(apiService.saveConfig).toHaveBeenCalledWith(port, null);
    expect(storageService.setConfig).toHaveBeenCalledWith(null);
    expect(result).toEqual({ status: "success" });
  });

  it("should handle undefined config", async () => {
    const apiService = createMockApiService();
    const storageService = createMockStorageService();
    const port = 5013;

    const result = await handleSetConfig(
      port,
      undefined as any,
      apiService,
      storageService
    );

    expect(apiService.saveConfig).toHaveBeenCalledWith(port, undefined);
    expect(storageService.setConfig).toHaveBeenCalledWith(undefined);
    expect(result).toEqual({ status: "success" });
  });

  // Enhanced error message validation tests
  it("should validate error message content for storage errors", async () => {
    const specificError = new Error("Specific storage error message");
    const apiService = createMockApiService();
    const storageService = createMockStorageService({
      setConfig: jest.fn().mockRejectedValue(specificError),
    });
    const port = 5001;

    const result = await handleSetConfig(
      port,
      mockConfig,
      apiService,
      storageService
    );

    expect(result).toEqual({
      status: "error",
      message: "Specific storage error message",
    });
  });

  it("should validate error message content for API errors", async () => {
    const specificError = new Error("API connection failed");
    const apiService = createMockApiService({
      saveConfig: jest.fn().mockRejectedValue(specificError),
    });
    const storageService = createMockStorageService();
    const port = 5001;

    const result = await handleSetConfig(
      port,
      mockConfig,
      apiService,
      storageService
    );

    expect(result).toEqual({
      status: "error",
      message: "API connection failed",
    });
  });

  // Null/undefined scenario testing
  it("should handle null port with null config", async () => {
    const apiService = createMockApiService();
    const storageService = createMockStorageService();

    const result = await handleSetConfig(
      null,
      null as any,
      apiService,
      storageService
    );

    expect(result).toEqual({
      status: "error",
      message: "Server port not found.",
    });
  });

  it("should handle undefined port with undefined config", async () => {
    const apiService = createMockApiService();
    const storageService = createMockStorageService();

    const result = await handleSetConfig(
      undefined as any,
      undefined as any,
      apiService,
      storageService
    );

    expect(result).toEqual({
      status: "error",
      message: "Server port not found.",
    });
  });
});

describe("Background Logic: History Handlers", () => {
  it("handleGetHistory should retrieve history from the storage service", async () => {
    const mockHistory: HistoryEntry[] = [
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

    const result = await handleGetHistory(storageService);

    expect(storageService.getHistory).toHaveBeenCalled();
    expect(result).toEqual({ history: mockHistory });
  });

  it("handleClearHistory should call the storage service to clear history", async () => {
    const storageService = createMockStorageService();

    const result = await handleClearHistory(storageService);

    expect(storageService.clearHistory).toHaveBeenCalled();
    expect(result).toEqual({ status: "success" });
  });
});

describe("Background Logic: discoverServerPort", () => {
  const mockCheckStatus = jest.fn();
  const mockStorageService = createMockStorageService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return cached port if it's still valid", async () => {
    const cachedPort = 5013;
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(cachedPort),
    });
    mockCheckStatus.mockResolvedValue(true);

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5020,
      false,
      2000
    );

    expect(storageService.getPort).toHaveBeenCalled();
    expect(mockCheckStatus).toHaveBeenCalledWith(cachedPort);
    expect(result).toBe(cachedPort);
  });

  it("should clear cached port if it's no longer valid", async () => {
    const cachedPort = 5013;
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(cachedPort),
      setPort: jest.fn().mockResolvedValue(undefined),
    });
    mockCheckStatus.mockRejectedValue(new Error("Connection failed"));

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5020,
      false,
      2000
    );

    expect(storageService.setPort).toHaveBeenCalledWith(null);
    expect(result).toBeNull();
  });

  it("should scan ports when no cached port exists", async () => {
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
    });
    mockCheckStatus
      .mockResolvedValueOnce(false) // First port fails
      .mockResolvedValueOnce(true); // Second port succeeds

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5002,
      false,
      2000
    );

    expect(mockCheckStatus).toHaveBeenCalledWith(5001);
    expect(mockCheckStatus).toHaveBeenCalledWith(5002);
    expect(result).toBe(5002);
  });

  it("should force scan when startScan is true", async () => {
    const cachedPort = 5013;
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(cachedPort),
    });
    mockCheckStatus.mockResolvedValue(true);

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5020,
      true, // Force scan
      2000
    );

    // Should not use cached port when startScan is true
    expect(mockCheckStatus).toHaveBeenCalledWith(5001);
    expect(result).toBe(5001);
  });

  // Optimized timeout testing - using immediate rejection instead of setTimeout
  it("should handle timeout for cached port check", async () => {
    mockCheckStatus.mockImplementation(
      () => new Promise((_, reject) => reject(new Error("Timeout")))
    );
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(5013),
      setPort: jest.fn().mockResolvedValue(undefined),
    });

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5010,
      false,
      1000 // Short timeout
    );

    expect(result).toBeNull();
    expect(storageService.setPort).toHaveBeenCalledWith(null);
  });

  it("should handle timeout during port scanning", async () => {
    mockCheckStatus.mockImplementation(
      () => new Promise((_, reject) => reject(new Error("Timeout")))
    );
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
    });

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5005,
      false,
      1000 // Short timeout
    );

    expect(result).toBeNull();
  });

  it("should call onProgress callback during scanning", async () => {
    mockCheckStatus.mockResolvedValue(false);
    const onProgress = jest.fn();
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
    });

    await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5005,
      false,
      1000,
      onProgress
    );

    expect(onProgress).toHaveBeenCalled();
  });

  // Boundary condition tests
  it("should return null when no port is found in range", async () => {
    mockCheckStatus.mockResolvedValue(false);
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
    });

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5003,
      false,
      1000
    );

    expect(result).toBeNull();
  });

  it("should handle storage service without setPort method", async () => {
    mockCheckStatus.mockResolvedValue(true);
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(5013),
      setPort: undefined, // Remove setPort method
    });

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5010,
      false,
      1000
    );

    expect(result).toBe(5013);
  });

  it("should handle storage service without setPort method during scan", async () => {
    mockCheckStatus.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
      setPort: undefined, // Remove setPort method
    });

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5002,
      false,
      1000
    );

    expect(result).toBe(5002);
  });

  // Exception handling tests
  it("should handle errors during port scanning gracefully", async () => {
    mockCheckStatus.mockRejectedValue(new Error("Network error"));
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
    });

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5003,
      false,
      1000
    );

    expect(result).toBeNull();
  });

  // Batch processing tests
  it("should handle batch processing edge case with exact batch size", async () => {
    mockCheckStatus.mockResolvedValue(false);
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
    });

    await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5005, // 5 ports, batch size is 5
      false,
      1000
    );

    expect(mockCheckStatus).toHaveBeenCalledTimes(5);
  });

  it("should handle batch processing with remainder ports", async () => {
    mockCheckStatus.mockResolvedValue(false);
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
    });

    await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5007, // 7 ports, batch size is 5, remainder is 2
      false,
      1000
    );

    expect(mockCheckStatus).toHaveBeenCalledTimes(7);
  });

  it("should scan ports in batches efficiently", async () => {
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
    });
    mockCheckStatus.mockResolvedValue(false);

    await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5010, // 10 ports, 2 batches of 5
      false,
      1000
    );

    expect(mockCheckStatus).toHaveBeenCalledTimes(10);
  });

  // Null/undefined handling tests
  it("should handle null port discovery in batch processing", async () => {
    mockCheckStatus.mockResolvedValue(null);
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
    });

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5003,
      false,
      1000
    );

    expect(result).toBeNull();
  });

  it("should handle undefined port discovery in batch processing", async () => {
    mockCheckStatus.mockResolvedValue(undefined);
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
    });

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5003,
      false,
      1000
    );

    expect(result).toBeNull();
  });

  it("should handle mixed null/undefined results in batch processing", async () => {
    mockCheckStatus
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
    });

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5003,
      false,
      1000
    );

    expect(result).toBe(5003); // Third port (5003) should be found
  });

  it("should handle port scanning when no port is found", async () => {
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
    });
    mockCheckStatus.mockResolvedValue(false);

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5005,
      false,
      1000
    );

    expect(result).toBeNull();
  });

  it("should handle storage service without setPort method during scan", async () => {
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
      setPort: undefined, // Remove setPort method
    });
    mockCheckStatus.mockResolvedValue(true);

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5005,
      false,
      1000
    );

    expect(result).toBe(5001);
  });

  it("should handle errors during port scanning gracefully", async () => {
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
    });
    mockCheckStatus.mockRejectedValue(new Error("Network error"));

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5005,
      false,
      1000
    );

    expect(result).toBeNull();
  });

  // Progress tracking tests
  it("should handle progress tracking with empty range", async () => {
    mockCheckStatus.mockResolvedValue(false);
    const onProgress = jest.fn();
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
    });

    await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5001, // Single port range
      false,
      1000,
      onProgress
    );

    expect(onProgress).toHaveBeenCalled();
  });

  it("should handle progress tracking with negative batch length", async () => {
    const storageService = createMockStorageService({
      getPort: jest.fn().mockResolvedValue(null),
    });
    mockCheckStatus.mockResolvedValue(false);
    const onProgress = jest.fn();

    const result = await discoverServerPort(
      storageService,
      mockCheckStatus,
      5001,
      5000, // Invalid range (negative)
      false,
      1000,
      onProgress
    );

    expect(result).toBeNull();
  });
});
