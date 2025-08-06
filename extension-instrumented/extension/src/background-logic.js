"use strict";
/**
 * @fileoverview
 * This file contains the core message handling logic for the background script.
 * It is designed to be testable and independent of the Chrome extension environment.
 * All functions in this file should be pure and rely on injected dependencies (services)
 * for any side effects (like API calls or storage access).
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
exports.handleSetConfig = handleSetConfig;
exports.handleGetHistory = handleGetHistory;
exports.handleClearHistory = handleClearHistory;
exports.discoverServerPort = discoverServerPort;
/**
 * Handles the 'setConfig' message. It saves the configuration to both the
 * local server and chrome.storage.
 *
 * @param port - The server port.
 * @param config - The new configuration to save.
 * @param apiService - The service for making API calls.
 * @param storageService - The service for accessing storage.
 * @returns A promise that resolves to an object with status and an optional message.
 */
function handleSetConfig(port, config, apiService, storageService) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!port) {
            return { status: "error", message: "Server port not found." };
        }
        try {
            // First, try to save to the server
            const serverSuccess = yield apiService.saveConfig(port, config);
            if (!serverSuccess) {
                return { status: "error", message: "Failed to save config to server." };
            }
            // Then, save to local storage
            yield storageService.setConfig(config);
            return { status: "success" };
        }
        catch (err) {
            const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
            console.error("[BG Logic] Error in handleSetConfig:", errorMessage);
            return { status: "error", message: errorMessage };
        }
    });
}
/**
 * Handles the 'getHistory' message.
 * @param storageService - The service for accessing storage.
 * @returns A promise that resolves to the download history.
 */
function handleGetHistory(storageService) {
    return __awaiter(this, void 0, void 0, function* () {
        const history = yield storageService.getHistory();
        return { history };
    });
}
/**
 * Handles the 'clearHistory' message.
 * @param storageService - The service for accessing storage.
 * @returns A promise that resolves to a status object.
 */
function handleClearHistory(storageService) {
    return __awaiter(this, void 0, void 0, function* () {
        yield storageService.clearHistory();
        return { status: "success" };
    });
}
/**
 * Discover the server port by checking a cached value or scanning a range.
 * @param storageService - Service for accessing stored port
 * @param checkStatus - Function to check server availability for a port
 * @param defaultPort - Starting port for scan
 * @param maxPort - Maximum port for scan
 * @param startScan - If true, force scanning even if cached port exists
 * @param timeout - Timeout for individual port checks (ms)
 * @param onProgress - Optional callback for scanning progress updates
 * @returns The discovered port or null if not found
 */
function discoverServerPort(storageService_1, checkStatus_1, defaultPort_1, maxPort_1) {
    return __awaiter(this, arguments, void 0, function* (storageService, checkStatus, defaultPort, maxPort, startScan = false, timeout = 2000, onProgress) {
        const totalPorts = maxPort - defaultPort + 1;
        let scannedPorts = 0;
        // Try cached port if not forcing scan
        if (!startScan) {
            const cached = yield storageService.getPort();
            if (cached !== null) {
                try {
                    const ok = yield Promise.race([
                        checkStatus(cached),
                        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout)),
                    ]);
                    if (ok) {
                        return cached;
                    }
                }
                catch (error) {
                    // Cached port failed, continue to scan
                }
                // Expire cached port
                if (storageService.setPort) {
                    yield storageService.setPort(null);
                }
            }
        }
        // Scan port range with timeout and parallel checking for efficiency
        const portRange = Array.from({ length: totalPorts }, (_, i) => defaultPort + i);
        // Check ports in batches to avoid overwhelming the system
        const batchSize = 5;
        for (let i = 0; i < portRange.length; i += batchSize) {
            const batch = portRange.slice(i, i + batchSize);
            // Check ports in parallel within the batch
            const promises = batch.map((port) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const isAvailable = yield Promise.race([
                        checkStatus(port),
                        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout)),
                    ]);
                    return isAvailable ? port : null;
                }
                catch (_a) {
                    return null;
                }
            }));
            const results = yield Promise.all(promises);
            const foundPort = results.find((port) => port !== null);
            if (foundPort !== null && foundPort !== undefined) {
                // Cache discovered port
                if (storageService.setPort) {
                    yield storageService.setPort(foundPort);
                }
                return foundPort;
            }
            // Update progress
            scannedPorts += batch.length;
            if (onProgress) {
                onProgress(scannedPorts, totalPorts);
            }
        }
        return null;
    });
}
