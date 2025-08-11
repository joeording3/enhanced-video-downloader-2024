/**
 * @fileoverview
 * This file contains the core message handling logic for the background script.
 * It is designed to be testable and independent of the Chrome extension environment.
 * All functions in this file should be pure and rely on injected dependencies (services)
 * for any side effects (like API calls or storage access).
 */

import type { ServerConfig, HistoryEntry } from "./types";
import { getServerPort, getClientPort, getPortRange } from "./core/constants";

/**
 * Interface for API services used by the message handlers.
 * This allows for mocking API interactions in tests.
 */
export interface ApiService {
  fetchConfig(port: number): Promise<Partial<ServerConfig>>;
  saveConfig(port: number, config: Partial<ServerConfig>): Promise<boolean>;
  // Add other API methods here as they are refactored
}

/**
 * Interface for storage services.
 */
export interface StorageService {
  getConfig(): Promise<Partial<ServerConfig>>;
  setConfig(config: Partial<ServerConfig>): Promise<void>;
  getPort(): Promise<number | null>;
  setPort?(port: number | null): Promise<void>;
  getHistory(): Promise<HistoryEntry[]>;
  clearHistory(): Promise<void | boolean>;
  // Add other storage methods here
}

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
export async function handleSetConfig(
  port: number | null,
  config: Partial<ServerConfig>,
  apiService: ApiService,
  storageService: StorageService
): Promise<{ status: string; message?: string }> {
  if (!port) {
    return { status: "error", message: "Server port not found." };
  }

  try {
    // First, try to save to the server
    const serverSuccess = await apiService.saveConfig(port, config);
    if (!serverSuccess) {
      return { status: "error", message: "Failed to save config to server." };
    }

    // Then, save to local storage
    await storageService.setConfig(config);

    return { status: "success" };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
    console.error("[BG Logic] Error in handleSetConfig:", errorMessage);
    return { status: "error", message: errorMessage };
  }
}

/**
 * Handles the 'getHistory' message.
 * @param storageService - The service for accessing storage.
 * @returns A promise that resolves to the download history.
 */
export async function handleGetHistory(
  storageService: StorageService
): Promise<{ history: HistoryEntry[] }> {
  const history = await storageService.getHistory();
  return { history };
}

/**
 * Handles the 'clearHistory' message.
 * @param storageService - The service for accessing storage.
 * @returns A promise that resolves to a status object.
 */
export async function handleClearHistory(
  storageService: StorageService
): Promise<{ status: string }> {
  await storageService.clearHistory();
  return { status: "success" };
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
export async function discoverServerPort(
  storageService: StorageService,
  checkStatus: (port: number) => Promise<boolean>,
  defaultPort: number,
  maxPort: number,
  startScan: boolean = false,
  timeout: number = 2000,
  onProgress?: (current: number, total: number) => void
): Promise<number | null> {
  const totalPorts = maxPort - defaultPort + 1;
  let scannedPorts = 0;

  // Try cached port if not forcing scan
  if (!startScan) {
    const cached = await storageService.getPort();
    if (cached !== null) {
      try {
        const ok = await Promise.race([
          checkStatus(cached),
          new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), timeout)
          ),
        ]);
        if (ok) {
          return cached;
        }
      } catch (error) {
        // Cached port failed, continue to scan
      }
      // Expire cached port
      if (storageService.setPort) {
        await storageService.setPort(null);
      }
    }
  }

  // Deterministically check the default port first to satisfy callers/tests that
  // expect the canonical port when the server is available there.
  try {
    const ok = await Promise.race([
      checkStatus(defaultPort),
      new Promise<boolean>((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeout)),
    ]);
    if (ok) {
      if (storageService.setPort) {
        await storageService.setPort(defaultPort);
      }
      if (onProgress) onProgress(1, totalPorts);
      return defaultPort;
    }
  } catch {
    // Fall through to ranged scan
  }

  // Scan remaining port range (excluding default) with timeout and parallel checking for efficiency
  const portRange = Array.from({ length: totalPorts - 1 }, (_, i) => defaultPort + i + 1);

  // Check ports in batches to avoid overwhelming the system
  const batchSize = 5;
  for (let i = 0; i < portRange.length; i += batchSize) {
    const batch = portRange.slice(i, i + batchSize);

    // Check ports in parallel within the batch
    const promises = batch.map(async port => {
      try {
        const isAvailable = await Promise.race([
          checkStatus(port),
          new Promise<boolean>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), timeout)
          ),
        ]);
        return isAvailable ? port : null;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(promises);
    const foundPort = results.find(port => port !== null);

    if (foundPort !== null && foundPort !== undefined) {
      // Cache discovered port
      if (storageService.setPort) {
        await storageService.setPort(foundPort);
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
}
