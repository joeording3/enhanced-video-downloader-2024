/**
 * @fileoverview
 * This file contains the core message handling logic for the background script.
 * It is designed to be testable and independent of the Chrome extension environment.
 * All functions in this file should be pure and rely on injected dependencies (services)
 * for any side effects (like API calls or storage access).
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
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
export async function handleSetConfig(port: number | null, config: Partial<ServerConfig>, apiService: ApiService, storageService: StorageService): Promise<{
  status: string;
  message?: string;
}> {
  if (stryMutAct_9fa48("76")) {
    {}
  } else {
    stryCov_9fa48("76");
    if (stryMutAct_9fa48("79") ? false : stryMutAct_9fa48("78") ? true : stryMutAct_9fa48("77") ? port : (stryCov_9fa48("77", "78", "79"), !port)) {
      if (stryMutAct_9fa48("80")) {
        {}
      } else {
        stryCov_9fa48("80");
        return stryMutAct_9fa48("81") ? {} : (stryCov_9fa48("81"), {
          status: stryMutAct_9fa48("82") ? "" : (stryCov_9fa48("82"), "error"),
          message: stryMutAct_9fa48("83") ? "" : (stryCov_9fa48("83"), "Server port not found.")
        });
      }
    }
    try {
      if (stryMutAct_9fa48("84")) {
        {}
      } else {
        stryCov_9fa48("84");
        // First, try to save to the server
        const serverSuccess = await apiService.saveConfig(port, config);
        if (stryMutAct_9fa48("87") ? false : stryMutAct_9fa48("86") ? true : stryMutAct_9fa48("85") ? serverSuccess : (stryCov_9fa48("85", "86", "87"), !serverSuccess)) {
          if (stryMutAct_9fa48("88")) {
            {}
          } else {
            stryCov_9fa48("88");
            return stryMutAct_9fa48("89") ? {} : (stryCov_9fa48("89"), {
              status: stryMutAct_9fa48("90") ? "" : (stryCov_9fa48("90"), "error"),
              message: stryMutAct_9fa48("91") ? "" : (stryCov_9fa48("91"), "Failed to save config to server.")
            });
          }
        }

        // Then, save to local storage
        await storageService.setConfig(config);
        return stryMutAct_9fa48("92") ? {} : (stryCov_9fa48("92"), {
          status: stryMutAct_9fa48("93") ? "" : (stryCov_9fa48("93"), "success")
        });
      }
    } catch (err) {
      if (stryMutAct_9fa48("94")) {
        {}
      } else {
        stryCov_9fa48("94");
        const errorMessage = err instanceof Error ? err.message : stryMutAct_9fa48("95") ? "" : (stryCov_9fa48("95"), "An unknown error occurred.");
        console.error(stryMutAct_9fa48("96") ? "" : (stryCov_9fa48("96"), "[BG Logic] Error in handleSetConfig:"), errorMessage);
        return stryMutAct_9fa48("97") ? {} : (stryCov_9fa48("97"), {
          status: stryMutAct_9fa48("98") ? "" : (stryCov_9fa48("98"), "error"),
          message: errorMessage
        });
      }
    }
  }
}

/**
 * Handles the 'getHistory' message.
 * @param storageService - The service for accessing storage.
 * @returns A promise that resolves to the download history.
 */
export async function handleGetHistory(storageService: StorageService): Promise<{
  history: HistoryEntry[];
}> {
  if (stryMutAct_9fa48("99")) {
    {}
  } else {
    stryCov_9fa48("99");
    const history = await storageService.getHistory();
    return stryMutAct_9fa48("100") ? {} : (stryCov_9fa48("100"), {
      history
    });
  }
}

/**
 * Handles the 'clearHistory' message.
 * @param storageService - The service for accessing storage.
 * @returns A promise that resolves to a status object.
 */
export async function handleClearHistory(storageService: StorageService): Promise<{
  status: string;
}> {
  if (stryMutAct_9fa48("101")) {
    {}
  } else {
    stryCov_9fa48("101");
    await storageService.clearHistory();
    return stryMutAct_9fa48("102") ? {} : (stryCov_9fa48("102"), {
      status: stryMutAct_9fa48("103") ? "" : (stryCov_9fa48("103"), "success")
    });
  }
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
export async function discoverServerPort(storageService: StorageService, checkStatus: (port: number) => Promise<boolean>, defaultPort: number, maxPort: number, startScan: boolean = stryMutAct_9fa48("104") ? true : (stryCov_9fa48("104"), false), timeout: number = 2000, onProgress?: (current: number, total: number) => void): Promise<number | null> {
  if (stryMutAct_9fa48("105")) {
    {}
  } else {
    stryCov_9fa48("105");
    const totalPorts = stryMutAct_9fa48("106") ? maxPort - defaultPort - 1 : (stryCov_9fa48("106"), (stryMutAct_9fa48("107") ? maxPort + defaultPort : (stryCov_9fa48("107"), maxPort - defaultPort)) + 1);
    let scannedPorts = 0;

    // Try cached port if not forcing scan
    if (stryMutAct_9fa48("110") ? false : stryMutAct_9fa48("109") ? true : stryMutAct_9fa48("108") ? startScan : (stryCov_9fa48("108", "109", "110"), !startScan)) {
      if (stryMutAct_9fa48("111")) {
        {}
      } else {
        stryCov_9fa48("111");
        const cached = await storageService.getPort();
        if (stryMutAct_9fa48("114") ? cached === null : stryMutAct_9fa48("113") ? false : stryMutAct_9fa48("112") ? true : (stryCov_9fa48("112", "113", "114"), cached !== null)) {
          if (stryMutAct_9fa48("115")) {
            {}
          } else {
            stryCov_9fa48("115");
            try {
              if (stryMutAct_9fa48("116")) {
                {}
              } else {
                stryCov_9fa48("116");
                const ok = await Promise.race(stryMutAct_9fa48("117") ? [] : (stryCov_9fa48("117"), [checkStatus(cached), new Promise<boolean>(stryMutAct_9fa48("118") ? () => undefined : (stryCov_9fa48("118"), (_, reject) => setTimeout(stryMutAct_9fa48("119") ? () => undefined : (stryCov_9fa48("119"), () => reject(new Error(stryMutAct_9fa48("120") ? "" : (stryCov_9fa48("120"), "Timeout")))), timeout)))]));
                if (stryMutAct_9fa48("122") ? false : stryMutAct_9fa48("121") ? true : (stryCov_9fa48("121", "122"), ok)) {
                  if (stryMutAct_9fa48("123")) {
                    {}
                  } else {
                    stryCov_9fa48("123");
                    return cached;
                  }
                }
              }
            } catch (error) {
              // Cached port failed, continue to scan
            }
            // Expire cached port
            if (stryMutAct_9fa48("125") ? false : stryMutAct_9fa48("124") ? true : (stryCov_9fa48("124", "125"), storageService.setPort)) {
              if (stryMutAct_9fa48("126")) {
                {}
              } else {
                stryCov_9fa48("126");
                await storageService.setPort(null);
              }
            }
          }
        }
      }
    }

    // Scan port range with timeout and parallel checking for efficiency
    const portRange = Array.from(stryMutAct_9fa48("127") ? {} : (stryCov_9fa48("127"), {
      length: totalPorts
    }), stryMutAct_9fa48("128") ? () => undefined : (stryCov_9fa48("128"), (_, i) => stryMutAct_9fa48("129") ? defaultPort - i : (stryCov_9fa48("129"), defaultPort + i)));

    // Check ports in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; stryMutAct_9fa48("132") ? i >= portRange.length : stryMutAct_9fa48("131") ? i <= portRange.length : stryMutAct_9fa48("130") ? false : (stryCov_9fa48("130", "131", "132"), i < portRange.length); stryMutAct_9fa48("133") ? i -= batchSize : (stryCov_9fa48("133"), i += batchSize)) {
      if (stryMutAct_9fa48("134")) {
        {}
      } else {
        stryCov_9fa48("134");
        const batch = stryMutAct_9fa48("135") ? portRange : (stryCov_9fa48("135"), portRange.slice(i, stryMutAct_9fa48("136") ? i - batchSize : (stryCov_9fa48("136"), i + batchSize)));

        // Check ports in parallel within the batch
        const promises = batch.map(async port => {
          if (stryMutAct_9fa48("137")) {
            {}
          } else {
            stryCov_9fa48("137");
            try {
              if (stryMutAct_9fa48("138")) {
                {}
              } else {
                stryCov_9fa48("138");
                const isAvailable = await Promise.race(stryMutAct_9fa48("139") ? [] : (stryCov_9fa48("139"), [checkStatus(port), new Promise<boolean>(stryMutAct_9fa48("140") ? () => undefined : (stryCov_9fa48("140"), (_, reject) => setTimeout(stryMutAct_9fa48("141") ? () => undefined : (stryCov_9fa48("141"), () => reject(new Error(stryMutAct_9fa48("142") ? "" : (stryCov_9fa48("142"), "Timeout")))), timeout)))]));
                return isAvailable ? port : null;
              }
            } catch {
              if (stryMutAct_9fa48("143")) {
                {}
              } else {
                stryCov_9fa48("143");
                return null;
              }
            }
          }
        });
        const results = await Promise.all(promises);
        const foundPort = results.find(stryMutAct_9fa48("144") ? () => undefined : (stryCov_9fa48("144"), port => stryMutAct_9fa48("147") ? port === null : stryMutAct_9fa48("146") ? false : stryMutAct_9fa48("145") ? true : (stryCov_9fa48("145", "146", "147"), port !== null)));
        if (stryMutAct_9fa48("150") ? foundPort !== null || foundPort !== undefined : stryMutAct_9fa48("149") ? false : stryMutAct_9fa48("148") ? true : (stryCov_9fa48("148", "149", "150"), (stryMutAct_9fa48("152") ? foundPort === null : stryMutAct_9fa48("151") ? true : (stryCov_9fa48("151", "152"), foundPort !== null)) && (stryMutAct_9fa48("154") ? foundPort === undefined : stryMutAct_9fa48("153") ? true : (stryCov_9fa48("153", "154"), foundPort !== undefined)))) {
          if (stryMutAct_9fa48("155")) {
            {}
          } else {
            stryCov_9fa48("155");
            // Cache discovered port
            if (stryMutAct_9fa48("157") ? false : stryMutAct_9fa48("156") ? true : (stryCov_9fa48("156", "157"), storageService.setPort)) {
              if (stryMutAct_9fa48("158")) {
                {}
              } else {
                stryCov_9fa48("158");
                await storageService.setPort(foundPort);
              }
            }
            return foundPort;
          }
        }

        // Update progress
        stryMutAct_9fa48("159") ? scannedPorts -= batch.length : (stryCov_9fa48("159"), scannedPorts += batch.length);
        if (stryMutAct_9fa48("161") ? false : stryMutAct_9fa48("160") ? true : (stryCov_9fa48("160", "161"), onProgress)) {
          if (stryMutAct_9fa48("162")) {
            {}
          } else {
            stryCov_9fa48("162");
            onProgress(scannedPorts, totalPorts);
          }
        }
      }
    }
    return null;
  }
}