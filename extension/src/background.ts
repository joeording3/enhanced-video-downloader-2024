/**
 * Enhanced Video Downloader - Background Script
 * Handles port discovery, server communication, and download management
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
import { Theme, ServerConfig } from "./types";
import type { HistoryEntry } from "./types";
import { applyThemeToActionIcon, actionIconPaths, getActionIconPaths } from "./background-helpers";
import { debounce } from "./lib/utils";
import { handleSetConfig, ApiService, StorageService, handleGetHistory, handleClearHistory, discoverServerPort } from "./background-logic";
import { getServerPort, getPortRange } from "./core/constants";
import { stateManager } from "./core/state-manager";
import { validationService } from "./core/validation-service";
import { errorHandler, CentralizedErrorHandler } from "./core/error-handler";
import { logger, CentralizedLogger } from "./core/logger";
import { STORAGE_KEYS, NETWORK_CONSTANTS, CONFIG_CONSTANTS, MESSAGE_TYPES, STATUS_CONSTANTS, THEME_CONSTANTS, ERROR_MESSAGES, SUCCESS_MESSAGES, NOTIFICATION_MESSAGES, getNotificationMessage } from "./core/constants";

// --- START CONSTANTS AND STORAGE KEYS ---
// Use centralized constants instead of local duplicates
const _configStorageKey = STORAGE_KEYS.SERVER_CONFIG;
const _portStorageKey = STORAGE_KEYS.SERVER_PORT;
const _historyStorageKey = STORAGE_KEYS.DOWNLOAD_HISTORY;
const serverStatusKey = STORAGE_KEYS.SERVER_STATUS;
const networkStatusKey = STORAGE_KEYS.NETWORK_STATUS;
const _queueStorageKey = STORAGE_KEYS.DOWNLOAD_QUEUE;

// Use centralized port configuration
const _defaultServerPort = getServerPort();
const _maxPortScan = getPortRange()[1]; // Use the end of the port range
const _serverCheckInterval = NETWORK_CONSTANTS.SERVER_CHECK_INTERVAL;
const _statusPollIntervalMs = 3000;

// Expected application name for server identification (from manifest)
const expectedAppName = stryMutAct_9fa48("165") ? (chrome.runtime && chrome.runtime.getManifest ? chrome.runtime.getManifest().name : null) && "Enhanced Video Downloader" : stryMutAct_9fa48("164") ? false : stryMutAct_9fa48("163") ? true : (stryCov_9fa48("163", "164", "165"), ((stryMutAct_9fa48("168") ? chrome.runtime || chrome.runtime.getManifest : stryMutAct_9fa48("167") ? false : stryMutAct_9fa48("166") ? true : (stryCov_9fa48("166", "167", "168"), chrome.runtime && chrome.runtime.getManifest)) ? chrome.runtime.getManifest().name : null) || (stryMutAct_9fa48("169") ? "" : (stryCov_9fa48("169"), "Enhanced Video Downloader")));

// Initialize background script when loaded (skip in Jest)
const isTestEnvironment = stryMutAct_9fa48("172") ? typeof process !== "undefined" || process.env.JEST_WORKER_ID || process.env.NODE_ENV === "test" : stryMutAct_9fa48("171") ? false : stryMutAct_9fa48("170") ? true : (stryCov_9fa48("170", "171", "172"), (stryMutAct_9fa48("174") ? typeof process === "undefined" : stryMutAct_9fa48("173") ? true : (stryCov_9fa48("173", "174"), typeof process !== (stryMutAct_9fa48("175") ? "" : (stryCov_9fa48("175"), "undefined")))) && (stryMutAct_9fa48("177") ? process.env.JEST_WORKER_ID && process.env.NODE_ENV === "test" : stryMutAct_9fa48("176") ? true : (stryCov_9fa48("176", "177"), process.env.JEST_WORKER_ID || (stryMutAct_9fa48("179") ? process.env.NODE_ENV !== "test" : stryMutAct_9fa48("178") ? false : (stryCov_9fa48("178", "179"), process.env.NODE_ENV === (stryMutAct_9fa48("180") ? "" : (stryCov_9fa48("180"), "test")))))));
// --- END CONSTANTS AND STORAGE KEYS ---

// Utility logging functions - now using centralized logger
const applyConsoleLogLevelFromStorage = async (): Promise<void> => {
  if (stryMutAct_9fa48("181")) {
    {}
  } else {
    stryCov_9fa48("181");
    try {
      if (stryMutAct_9fa48("182")) {
        {}
      } else {
        stryCov_9fa48("182");
        const res = await chrome.storage.local.get(STORAGE_KEYS.SERVER_CONFIG);
        const cfg = stryMutAct_9fa48("185") ? (res as any)[STORAGE_KEYS.SERVER_CONFIG] && {} : stryMutAct_9fa48("184") ? false : stryMutAct_9fa48("183") ? true : (stryCov_9fa48("183", "184", "185"), (res as any)[STORAGE_KEYS.SERVER_CONFIG] || {});
        const level = stryMutAct_9fa48("188") ? (cfg.log_level as any || cfg.console_log_level as any) && "info" : stryMutAct_9fa48("187") ? false : stryMutAct_9fa48("186") ? true : (stryCov_9fa48("186", "187", "188"), (stryMutAct_9fa48("190") ? cfg.log_level as any && cfg.console_log_level as any : stryMutAct_9fa48("189") ? false : (stryCov_9fa48("189", "190"), cfg.log_level as any || cfg.console_log_level as any)) || (stryMutAct_9fa48("191") ? "" : (stryCov_9fa48("191"), "info")));
        if (stryMutAct_9fa48("194") ? typeof level !== "string" : stryMutAct_9fa48("193") ? false : stryMutAct_9fa48("192") ? true : (stryCov_9fa48("192", "193", "194"), typeof level === (stryMutAct_9fa48("195") ? "" : (stryCov_9fa48("195"), "string")))) {
          if (stryMutAct_9fa48("196")) {
            {}
          } else {
            stryCov_9fa48("196");
            logger.setLevel(level.toLowerCase() as any);
          }
        }
      }
    } catch {
      // ignore
    }
  }
};

// Initialize console log level at startup
applyConsoleLogLevelFromStorage();
const log = (...args: any[]): void => {
  if (stryMutAct_9fa48("197")) {
    {}
  } else {
    stryCov_9fa48("197");
    logger.info(args.join(stryMutAct_9fa48("198") ? "" : (stryCov_9fa48("198"), " ")), stryMutAct_9fa48("199") ? {} : (stryCov_9fa48("199"), {
      component: stryMutAct_9fa48("200") ? "" : (stryCov_9fa48("200"), "background")
    }));
  }
};
const warn = (...args: any[]): void => {
  if (stryMutAct_9fa48("201")) {
    {}
  } else {
    stryCov_9fa48("201");
    logger.warn(args.join(stryMutAct_9fa48("202") ? "" : (stryCov_9fa48("202"), " ")), stryMutAct_9fa48("203") ? {} : (stryCov_9fa48("203"), {
      component: stryMutAct_9fa48("204") ? "" : (stryCov_9fa48("204"), "background")
    }));
  }
};
const error = (...args: any[]): void => {
  if (stryMutAct_9fa48("205")) {
    {}
  } else {
    stryCov_9fa48("205");
    logger.error(args.join(stryMutAct_9fa48("206") ? "" : (stryCov_9fa48("206"), " ")), stryMutAct_9fa48("207") ? {} : (stryCov_9fa48("207"), {
      component: stryMutAct_9fa48("208") ? "" : (stryCov_9fa48("208"), "background")
    }));
  }
};

// --- START SERVICE IMPLEMENTATIONS ---

const apiService: ApiService = stryMutAct_9fa48("209") ? {} : (stryCov_9fa48("209"), {
  async fetchConfig(port: number): Promise<Partial<ServerConfig>> {
    if (stryMutAct_9fa48("210")) {
      {}
    } else {
      stryCov_9fa48("210");
      const response = await fetch((stryMutAct_9fa48("211") ? "" : (stryCov_9fa48("211"), "http://127.0.0.1:")) + port + (stryMutAct_9fa48("212") ? "" : (stryCov_9fa48("212"), "/api/config")));
      if (stryMutAct_9fa48("215") ? false : stryMutAct_9fa48("214") ? true : stryMutAct_9fa48("213") ? response.ok : (stryCov_9fa48("213", "214", "215"), !response.ok)) {
        if (stryMutAct_9fa48("216")) {
          {}
        } else {
          stryCov_9fa48("216");
          throw new Error((stryMutAct_9fa48("217") ? "" : (stryCov_9fa48("217"), "Failed to fetch config from server: ")) + response.statusText);
        }
      }
      return response.json();
    }
  },
  async saveConfig(port: number, config: Partial<ServerConfig>): Promise<boolean> {
    if (stryMutAct_9fa48("218")) {
      {}
    } else {
      stryCov_9fa48("218");
      const response = await fetch((stryMutAct_9fa48("219") ? "" : (stryCov_9fa48("219"), "http://127.0.0.1:")) + port + (stryMutAct_9fa48("220") ? "" : (stryCov_9fa48("220"), "/api/config")), stryMutAct_9fa48("221") ? {} : (stryCov_9fa48("221"), {
        method: stryMutAct_9fa48("222") ? "" : (stryCov_9fa48("222"), "POST"),
        headers: stryMutAct_9fa48("223") ? {} : (stryCov_9fa48("223"), {
          "Content-Type": stryMutAct_9fa48("224") ? "" : (stryCov_9fa48("224"), "application/json")
        }),
        body: JSON.stringify(config)
      }));
      return response.ok;
    }
  }
});
const storageService: StorageService = stryMutAct_9fa48("225") ? {} : (stryCov_9fa48("225"), {
  async getConfig(): Promise<Partial<ServerConfig>> {
    if (stryMutAct_9fa48("226")) {
      {}
    } else {
      stryCov_9fa48("226");
      const result = await chrome.storage.local.get(_configStorageKey);
      return stryMutAct_9fa48("229") ? result[_configStorageKey] && {} : stryMutAct_9fa48("228") ? false : stryMutAct_9fa48("227") ? true : (stryCov_9fa48("227", "228", "229"), result[_configStorageKey] || {});
    }
  },
  async setConfig(config: Partial<ServerConfig>): Promise<void> {
    if (stryMutAct_9fa48("230")) {
      {}
    } else {
      stryCov_9fa48("230");
      // Merge with existing config and persist
      const currentConfig = await this.getConfig();
      const newConfig: Partial<ServerConfig> = stryMutAct_9fa48("231") ? {} : (stryCov_9fa48("231"), {
        ...currentConfig,
        ...config
      });
      await chrome.storage.local.set(stryMutAct_9fa48("232") ? {} : (stryCov_9fa48("232"), {
        [_configStorageKey]: newConfig
      }));
      // Apply log level immediately so the UI reflects persistence without reload
      try {
        if (stryMutAct_9fa48("233")) {
          {}
        } else {
          stryCov_9fa48("233");
          const level = stryMutAct_9fa48("236") ? newConfig.log_level as any && newConfig.console_log_level as any : stryMutAct_9fa48("235") ? false : stryMutAct_9fa48("234") ? true : (stryCov_9fa48("234", "235", "236"), newConfig.log_level as any || newConfig.console_log_level as any);
          if (stryMutAct_9fa48("239") ? typeof level !== "string" : stryMutAct_9fa48("238") ? false : stryMutAct_9fa48("237") ? true : (stryCov_9fa48("237", "238", "239"), typeof level === (stryMutAct_9fa48("240") ? "" : (stryCov_9fa48("240"), "string")))) {
            if (stryMutAct_9fa48("241")) {
              {}
            } else {
              stryCov_9fa48("241");
              logger.setLevel(level.toLowerCase() as any);
            }
          }
        }
      } catch {
        /* ignore */
      }
    }
  },
  async getPort(): Promise<number | null> {
    if (stryMutAct_9fa48("242")) {
      {}
    } else {
      stryCov_9fa48("242");
      const result = await chrome.storage.local.get(_portStorageKey);
      return stryMutAct_9fa48("245") ? result[_portStorageKey] && null : stryMutAct_9fa48("244") ? false : stryMutAct_9fa48("243") ? true : (stryCov_9fa48("243", "244", "245"), result[_portStorageKey] || null);
    }
  },
  async setPort(port: number | null): Promise<void> {
    if (stryMutAct_9fa48("246")) {
      {}
    } else {
      stryCov_9fa48("246");
      try {
        if (stryMutAct_9fa48("247")) {
          {}
        } else {
          stryCov_9fa48("247");
          await chrome.storage.local.set(stryMutAct_9fa48("248") ? {} : (stryCov_9fa48("248"), {
            [_portStorageKey]: port
          }));
        }
      } catch (e) {
        if (stryMutAct_9fa48("249")) {
          {}
        } else {
          stryCov_9fa48("249");
          warn(stryMutAct_9fa48("250") ? "" : (stryCov_9fa48("250"), "Failed to cache server port:"), e);
        }
      }
    }
  },
  async getHistory(): Promise<HistoryEntry[]> {
    if (stryMutAct_9fa48("251")) {
      {}
    } else {
      stryCov_9fa48("251");
      const result = await chrome.storage.local.get(stryMutAct_9fa48("252") ? {} : (stryCov_9fa48("252"), {
        [_historyStorageKey]: stryMutAct_9fa48("253") ? ["Stryker was here"] : (stryCov_9fa48("253"), [])
      }));
      return result[_historyStorageKey];
    }
  },
  async clearHistory(): Promise<void> {
    if (stryMutAct_9fa48("254")) {
      {}
    } else {
      stryCov_9fa48("254");
      return chrome.storage.local.set(stryMutAct_9fa48("255") ? {} : (stryCov_9fa48("255"), {
        [_historyStorageKey]: stryMutAct_9fa48("256") ? ["Stryker was here"] : (stryCov_9fa48("256"), [])
      }));
    }
  }
});

// --- END SERVICE IMPLEMENTATIONS ---

// --- START NETWORK STATUS MONITORING ---
/** Handle changes in network connectivity */
const handleNetworkChange = async (online: boolean): Promise<void> => {
  if (stryMutAct_9fa48("257")) {
    {}
  } else {
    stryCov_9fa48("257");
    try {
      if (stryMutAct_9fa48("258")) {
        {}
      } else {
        stryCov_9fa48("258");
        await chrome.storage.local.set(stryMutAct_9fa48("259") ? {} : (stryCov_9fa48("259"), {
          [networkStatusKey]: online
        }));
      }
    } catch (err) {
      if (stryMutAct_9fa48("260")) {
        {}
      } else {
        stryCov_9fa48("260");
        log(stryMutAct_9fa48("261") ? "" : (stryCov_9fa48("261"), "Failed to update network status in storage:"), err);
      }
    }

    // Notify the user
    if (stryMutAct_9fa48("263") ? false : stryMutAct_9fa48("262") ? true : (stryCov_9fa48("262", "263"), online)) {
      if (stryMutAct_9fa48("264")) {
        {}
      } else {
        stryCov_9fa48("264");
        showNotification(stryMutAct_9fa48("265") ? "" : (stryCov_9fa48("265"), "Network Connected"), stryMutAct_9fa48("266") ? "" : (stryCov_9fa48("266"), "Browser is back online. Extension functions are restored."));
        // Automatically attempt server reconnection on network restore
        try {
          if (stryMutAct_9fa48("267")) {
            {}
          } else {
            stryCov_9fa48("267");
            // Show scanning indicator
            if (stryMutAct_9fa48("270") ? (chrome.action as any).setBadgeText : stryMutAct_9fa48("269") ? false : stryMutAct_9fa48("268") ? true : (stryCov_9fa48("268", "269", "270"), (chrome.action as any)?.setBadgeText)) {
              if (stryMutAct_9fa48("271")) {
                {}
              } else {
                stryCov_9fa48("271");
                try {
                  if (stryMutAct_9fa48("272")) {
                    {}
                  } else {
                    stryCov_9fa48("272");
                    (chrome.action as any).setBadgeBackgroundColor(stryMutAct_9fa48("273") ? {} : (stryCov_9fa48("273"), {
                      color: stryMutAct_9fa48("274") ? "" : (stryCov_9fa48("274"), "#ffc107")
                    }));
                    (chrome.action as any).setBadgeText(stryMutAct_9fa48("275") ? {} : (stryCov_9fa48("275"), {
                      text: stryMutAct_9fa48("276") ? "" : (stryCov_9fa48("276"), "SCAN")
                    })); // Use plain ASCII string
                  }
                } catch (e) {
                  /* ignore errors setting badge */
                }
              }
            }
            const port = await findServerPort(stryMutAct_9fa48("277") ? false : (stryCov_9fa48("277"), true));
            if (stryMutAct_9fa48("280") ? port === null : stryMutAct_9fa48("279") ? false : stryMutAct_9fa48("278") ? true : (stryCov_9fa48("278", "279", "280"), port !== null)) {
              if (stryMutAct_9fa48("281")) {
                {}
              } else {
                stryCov_9fa48("281");
                log((stryMutAct_9fa48("282") ? "" : (stryCov_9fa48("282"), "Server reconnected on port ")) + port);
                showNotification(stryMutAct_9fa48("283") ? "" : (stryCov_9fa48("283"), "Server Reconnected"), (stryMutAct_9fa48("284") ? "" : (stryCov_9fa48("284"), "Enhanced Video Downloader server is back online on port ")) + port + (stryMutAct_9fa48("285") ? "" : (stryCov_9fa48("285"), ".")));
                // Broadcast server status after reconnection
                broadcastServerStatus();
              }
            } else {
              if (stryMutAct_9fa48("286")) {
                {}
              } else {
                stryCov_9fa48("286");
                log(stryMutAct_9fa48("287") ? "" : (stryCov_9fa48("287"), "Server reconnection failed upon network restore."));
                showNotification(stryMutAct_9fa48("288") ? "" : (stryCov_9fa48("288"), "Server Unavailable"), stryMutAct_9fa48("289") ? "" : (stryCov_9fa48("289"), "Could not reconnect to the Enhanced Video Downloader server. Please check if it's running."));
                // Broadcast disconnected status
                broadcastServerStatus();
              }
            }
          }
        } catch (reconnectErr) {
          if (stryMutAct_9fa48("290")) {
            {}
          } else {
            stryCov_9fa48("290");
            log(stryMutAct_9fa48("291") ? "" : (stryCov_9fa48("291"), "Error during server reconnection attempt:"), reconnectErr);
          }
        }
      }
    } else {
      if (stryMutAct_9fa48("292")) {
        {}
      } else {
        stryCov_9fa48("292");
        showNotification(stryMutAct_9fa48("293") ? "" : (stryCov_9fa48("293"), "Network Disconnected"), stryMutAct_9fa48("294") ? "" : (stryCov_9fa48("294"), "Browser is offline. Download functionality may be unavailable."));

        // Persist current state when going offline
        try {
          if (stryMutAct_9fa48("295")) {
            {}
          } else {
            stryCov_9fa48("295");
            await persistQueue();
            // Also persist active downloads
            await chrome.storage.local.set(stryMutAct_9fa48("296") ? {} : (stryCov_9fa48("296"), {
              activeDownloads: activeDownloads
            }));
            log(stryMutAct_9fa48("297") ? "" : (stryCov_9fa48("297"), "Persisted queue and active downloads due to network disconnect"));
          }
        } catch (persistErr) {
          if (stryMutAct_9fa48("298")) {
            {}
          } else {
            stryCov_9fa48("298");
            warn(stryMutAct_9fa48("299") ? "" : (stryCov_9fa48("299"), "Failed to persist state during network disconnect:"), persistErr);
          }
        }

        // Broadcast disconnected status when going offline
        broadcastServerStatus();
      }
    }
  }
};
// Initialize network status in storage
if (stryMutAct_9fa48("302") ? false : stryMutAct_9fa48("301") ? true : stryMutAct_9fa48("300") ? isTestEnvironment : (stryCov_9fa48("300", "301", "302"), !isTestEnvironment)) {
  if (stryMutAct_9fa48("303")) {
    {}
  } else {
    stryCov_9fa48("303");
    chrome.storage.local.get(networkStatusKey, res => {
      if (stryMutAct_9fa48("304")) {
        {}
      } else {
        stryCov_9fa48("304");
        const current = (stryMutAct_9fa48("307") ? typeof res[networkStatusKey] !== "boolean" : stryMutAct_9fa48("306") ? false : stryMutAct_9fa48("305") ? true : (stryCov_9fa48("305", "306", "307"), typeof res[networkStatusKey] === (stryMutAct_9fa48("308") ? "" : (stryCov_9fa48("308"), "boolean")))) ? res[networkStatusKey] : navigator.onLine;
        handleNetworkChange(current);
      }
    });
    // Listen for browser online/offline events
    try {
      if (stryMutAct_9fa48("309")) {
        {}
      } else {
        stryCov_9fa48("309");
        self.addEventListener(stryMutAct_9fa48("310") ? "" : (stryCov_9fa48("310"), "online"), stryMutAct_9fa48("311") ? () => undefined : (stryCov_9fa48("311"), () => handleNetworkChange(stryMutAct_9fa48("312") ? false : (stryCov_9fa48("312"), true))));
        self.addEventListener(stryMutAct_9fa48("313") ? "" : (stryCov_9fa48("313"), "offline"), stryMutAct_9fa48("314") ? () => undefined : (stryCov_9fa48("314"), () => handleNetworkChange(stryMutAct_9fa48("315") ? true : (stryCov_9fa48("315"), false))));
        log(stryMutAct_9fa48("316") ? "" : (stryCov_9fa48("316"), "Registered network connectivity listeners"));
      }
    } catch (e) {
      if (stryMutAct_9fa48("317")) {
        {}
      } else {
        stryCov_9fa48("317");
        warn(stryMutAct_9fa48("318") ? "" : (stryCov_9fa48("318"), "Could not register network status listeners:"), e);
      }
    }
  }
}
// --- END NETWORK STATUS MONITORING ---

// Helper for initial theme setup
const initializeActionIconTheme = async (): Promise<void> => {
  if (stryMutAct_9fa48("319")) {
    {}
  } else {
    stryCov_9fa48("319");
    try {
      if (stryMutAct_9fa48("320")) {
        {}
      } else {
        stryCov_9fa48("320");
        log(stryMutAct_9fa48("321") ? "" : (stryCov_9fa48("321"), "Initializing action icon theme..."));
        const result = await chrome.storage.local.get(stryMutAct_9fa48("322") ? "" : (stryCov_9fa48("322"), "theme"));
        const storedTheme = result.theme as Theme | undefined;
        if (stryMutAct_9fa48("324") ? false : stryMutAct_9fa48("323") ? true : (stryCov_9fa48("323", "324"), storedTheme)) {
          if (stryMutAct_9fa48("325")) {
            {}
          } else {
            stryCov_9fa48("325");
            log((stryMutAct_9fa48("326") ? "" : (stryCov_9fa48("326"), "Found stored theme: ")) + storedTheme);
            applyThemeToActionIcon(storedTheme);
          }
        } else {
          if (stryMutAct_9fa48("327")) {
            {}
          } else {
            stryCov_9fa48("327");
            log(stryMutAct_9fa48("328") ? "" : (stryCov_9fa48("328"), "No theme stored. Checking system preference."));
            if (stryMutAct_9fa48("331") ? typeof self !== "undefined" || self.matchMedia : stryMutAct_9fa48("330") ? false : stryMutAct_9fa48("329") ? true : (stryCov_9fa48("329", "330", "331"), (stryMutAct_9fa48("333") ? typeof self === "undefined" : stryMutAct_9fa48("332") ? true : (stryCov_9fa48("332", "333"), typeof self !== (stryMutAct_9fa48("334") ? "" : (stryCov_9fa48("334"), "undefined")))) && self.matchMedia)) {
              if (stryMutAct_9fa48("335")) {
                {}
              } else {
                stryCov_9fa48("335");
                const darkModeMediaQuery = self.matchMedia(stryMutAct_9fa48("336") ? "" : (stryCov_9fa48("336"), "(prefers-color-scheme: dark)"));
                const systemPrefersDark = darkModeMediaQuery.matches;
                log((stryMutAct_9fa48("337") ? "" : (stryCov_9fa48("337"), "System prefers dark: ")) + systemPrefersDark);
                applyThemeToActionIcon(systemPrefersDark ? stryMutAct_9fa48("338") ? "" : (stryCov_9fa48("338"), "dark") : stryMutAct_9fa48("339") ? "" : (stryCov_9fa48("339"), "light"));

                // Add listener for system theme changes
                try {
                  if (stryMutAct_9fa48("340")) {
                    {}
                  } else {
                    stryCov_9fa48("340");
                    darkModeMediaQuery.addEventListener(stryMutAct_9fa48("341") ? "" : (stryCov_9fa48("341"), "change"), e => {
                      if (stryMutAct_9fa48("342")) {
                        {}
                      } else {
                        stryCov_9fa48("342");
                        const newSystemPrefersDark = e.matches;
                        log((stryMutAct_9fa48("343") ? "" : (stryCov_9fa48("343"), "System theme changed, now prefers dark: ")) + newSystemPrefersDark);

                        // Check if user has manually set a theme
                        chrome.storage.local.get(stryMutAct_9fa48("344") ? "" : (stryCov_9fa48("344"), "theme"), themeResult => {
                          if (stryMutAct_9fa48("345")) {
                            {}
                          } else {
                            stryCov_9fa48("345");
                            if (stryMutAct_9fa48("348") ? false : stryMutAct_9fa48("347") ? true : stryMutAct_9fa48("346") ? themeResult.theme : (stryCov_9fa48("346", "347", "348"), !themeResult.theme)) {
                              if (stryMutAct_9fa48("349")) {
                                {}
                              } else {
                                stryCov_9fa48("349");
                                // Only update automatically if user hasn't set a preference
                                applyThemeToActionIcon(newSystemPrefersDark ? stryMutAct_9fa48("350") ? "" : (stryCov_9fa48("350"), "dark") : stryMutAct_9fa48("351") ? "" : (stryCov_9fa48("351"), "light"));
                              }
                            } else {
                              if (stryMutAct_9fa48("352")) {
                                {}
                              } else {
                                stryCov_9fa48("352");
                                log(stryMutAct_9fa48("353") ? "" : (stryCov_9fa48("353"), "Not updating theme automatically as user has set a preference."));
                              }
                            }
                          }
                        });
                      }
                    });
                    log(stryMutAct_9fa48("354") ? "" : (stryCov_9fa48("354"), "Added listener for system theme changes"));
                  }
                } catch (listenerError) {
                  if (stryMutAct_9fa48("355")) {
                    {}
                  } else {
                    stryCov_9fa48("355");
                    warn((stryMutAct_9fa48("356") ? "" : (stryCov_9fa48("356"), "Could not add listener for system theme changes: ")) + (listenerError as Error).message);
                  }
                }
              }
            } else {
              if (stryMutAct_9fa48("357")) {
                {}
              } else {
                stryCov_9fa48("357");
                warn((stryMutAct_9fa48("358") ? "" : (stryCov_9fa48("358"), "self.matchMedia not available. ")) + (stryMutAct_9fa48("359") ? "" : (stryCov_9fa48("359"), "Defaulting action icon to light theme.")));
                applyThemeToActionIcon(stryMutAct_9fa48("360") ? "" : (stryCov_9fa48("360"), "light")); // Fallback if matchMedia is not available
              }
            }
          }
        }
      }
    } catch (e) {
      if (stryMutAct_9fa48("361")) {
        {}
      } else {
        stryCov_9fa48("361");
        error(stryMutAct_9fa48("362") ? "" : (stryCov_9fa48("362"), "Error initializing action icon theme:"), e);
        applyThemeToActionIcon(stryMutAct_9fa48("363") ? "" : (stryCov_9fa48("363"), "light")); // Fallback to a default if storage access fails
      }
    }
  }
};

// Types for active downloads and queue
interface DownloadStatus {
  status: string;
  progress: number;
  filename?: string;
  title?: string;
  id?: string;
  url: string;
}

// Forward declaration for functions used by debouncedUpdateQueueUI or early setup
let downloadQueue: string[] = stryMutAct_9fa48("364") ? ["Stryker was here"] : (stryCov_9fa48("364"), []); // Stores URLs of queued videos
const activeDownloads: Record<string, DownloadStatus> = {}; // Store {url: {status, progress, filename}}

// Export the variables to ensure they're not optimized out
export { downloadQueue, activeDownloads };

// Define updateQueueUI before it's used by debouncedUpdateQueueUI
const updateQueueUI = (): void => {
  if (stryMutAct_9fa48("365")) {
    {}
  } else {
    stryCov_9fa48("365");
    // Persist queue to storage
    persistQueue();
    chrome.runtime.sendMessage(stryMutAct_9fa48("366") ? {} : (stryCov_9fa48("366"), {
      type: stryMutAct_9fa48("367") ? "" : (stryCov_9fa48("367"), "queueUpdated"),
      queue: downloadQueue,
      active: activeDownloads
    })).catch(() => {
      // Catch errors if the popup is not open or the receiver doesn't exist.
    });
  }
};
const debouncedUpdateQueueUI = debounce(updateQueueUI, 300);

// Function to update both badge and queue UI (called frequently)
const _updateQueueAndBadge = (): void => {
  if (stryMutAct_9fa48("368")) {
    {}
  } else {
    stryCov_9fa48("368");
    updateBadge();
    debouncedUpdateQueueUI();
  }
};

// Show a browser notification with optional tag
const showNotification = (title: string, message: string, tag: string | null = null): void => {
  if (stryMutAct_9fa48("369")) {
    {}
  } else {
    stryCov_9fa48("369");
    if (stryMutAct_9fa48("372") ? false : stryMutAct_9fa48("371") ? true : stryMutAct_9fa48("370") ? chrome.notifications : (stryCov_9fa48("370", "371", "372"), !chrome.notifications)) {
      if (stryMutAct_9fa48("373")) {
        {}
      } else {
        stryCov_9fa48("373");
        warn(stryMutAct_9fa48("374") ? "" : (stryCov_9fa48("374"), "Chrome notifications API not available"));
        return;
      }
    }

    // Determine icon URL if available
    const iconUrl = (stryMutAct_9fa48("377") ? chrome.runtime || typeof chrome.runtime.getURL === "function" : stryMutAct_9fa48("376") ? false : stryMutAct_9fa48("375") ? true : (stryCov_9fa48("375", "376", "377"), chrome.runtime && (stryMutAct_9fa48("379") ? typeof chrome.runtime.getURL !== "function" : stryMutAct_9fa48("378") ? true : (stryCov_9fa48("378", "379"), typeof chrome.runtime.getURL === (stryMutAct_9fa48("380") ? "" : (stryCov_9fa48("380"), "function")))))) ? chrome.runtime.getURL(stryMutAct_9fa48("381") ? "" : (stryCov_9fa48("381"), "extension/icons/icon128.png")) : stryMutAct_9fa48("382") ? "Stryker was here!" : (stryCov_9fa48("382"), "");
    const options: chrome.NotificationOptions = stryMutAct_9fa48("383") ? {} : (stryCov_9fa48("383"), {
      type: stryMutAct_9fa48("384") ? "" : (stryCov_9fa48("384"), "basic"),
      iconUrl,
      title,
      message
    });

    // Use tag as notificationId for grouping, if provided
    if (stryMutAct_9fa48("386") ? false : stryMutAct_9fa48("385") ? true : (stryCov_9fa48("385", "386"), tag)) {
      if (stryMutAct_9fa48("387")) {
        {}
      } else {
        stryCov_9fa48("387");
        chrome.notifications.create(tag, options);
      }
    } else {
      if (stryMutAct_9fa48("388")) {
        {}
      } else {
        stryCov_9fa48("388");
        chrome.notifications.create(stryMutAct_9fa48("389") ? "Stryker was here!" : (stryCov_9fa48("389"), ""), options);
      }
    }
  }
};

// Server state variables - now managed by centralized state manager
const PORT_CHECK_TIMEOUT = NETWORK_CONSTANTS.SERVER_CHECK_TIMEOUT;
const _configRefreshIntervalCount = CONFIG_CONSTANTS.CONFIG_REFRESH_INTERVAL_COUNT;
const _maxPortBackoffInterval = NETWORK_CONSTANTS.MAX_PORT_BACKOFF_INTERVAL;

// Reset function for testing
const resetServerState = (): void => {
  if (stryMutAct_9fa48("390")) {
    {}
  } else {
    stryCov_9fa48("390");
    stateManager.updateServerState(stryMutAct_9fa48("391") ? {} : (stryCov_9fa48("391"), {
      status: stryMutAct_9fa48("392") ? "" : (stryCov_9fa48("392"), "disconnected"),
      scanInProgress: stryMutAct_9fa48("393") ? true : (stryCov_9fa48("393"), false),
      backoffInterval: 1000
    }));
  }
};

// Server Communication
const getServerStatus = async (): Promise<"connected" | "disconnected" | "checking"> => {
  if (stryMutAct_9fa48("394")) {
    {}
  } else {
    stryCov_9fa48("394");
    try {
      if (stryMutAct_9fa48("395")) {
        {}
      } else {
        stryCov_9fa48("395");
        const port = await storageService.getPort();
        if (stryMutAct_9fa48("398") ? false : stryMutAct_9fa48("397") ? true : stryMutAct_9fa48("396") ? port : (stryCov_9fa48("396", "397", "398"), !port)) {
          if (stryMutAct_9fa48("399")) {
            {}
          } else {
            stryCov_9fa48("399");
            return stryMutAct_9fa48("400") ? "" : (stryCov_9fa48("400"), "disconnected");
          }
        }
        const response = await fetch(stryMutAct_9fa48("401") ? `` : (stryCov_9fa48("401"), `http://127.0.0.1:${port}/api/health`), stryMutAct_9fa48("402") ? {} : (stryCov_9fa48("402"), {
          method: stryMutAct_9fa48("403") ? "" : (stryCov_9fa48("403"), "GET"),
          headers: stryMutAct_9fa48("404") ? {} : (stryCov_9fa48("404"), {
            "Content-Type": stryMutAct_9fa48("405") ? "" : (stryCov_9fa48("405"), "application/json")
          })
        }));
        if (stryMutAct_9fa48("407") ? false : stryMutAct_9fa48("406") ? true : (stryCov_9fa48("406", "407"), response.ok)) {
          if (stryMutAct_9fa48("408")) {
            {}
          } else {
            stryCov_9fa48("408");
            return stryMutAct_9fa48("409") ? "" : (stryCov_9fa48("409"), "connected");
          }
        } else {
          if (stryMutAct_9fa48("410")) {
            {}
          } else {
            stryCov_9fa48("410");
            return stryMutAct_9fa48("411") ? "" : (stryCov_9fa48("411"), "disconnected");
          }
        }
      }
    } catch (error) {
      if (stryMutAct_9fa48("412")) {
        {}
      } else {
        stryCov_9fa48("412");
        return stryMutAct_9fa48("413") ? "" : (stryCov_9fa48("413"), "disconnected");
      }
    }
  }
};
const getCurrentTheme = async (): Promise<Theme> => {
  if (stryMutAct_9fa48("414")) {
    {}
  } else {
    stryCov_9fa48("414");
    try {
      if (stryMutAct_9fa48("415")) {
        {}
      } else {
        stryCov_9fa48("415");
        const result = await chrome.storage.local.get(stryMutAct_9fa48("416") ? "" : (stryCov_9fa48("416"), "theme"));
        return stryMutAct_9fa48("419") ? result.theme as Theme && "light" : stryMutAct_9fa48("418") ? false : stryMutAct_9fa48("417") ? true : (stryCov_9fa48("417", "418", "419"), result.theme as Theme || (stryMutAct_9fa48("420") ? "" : (stryCov_9fa48("420"), "light")));
      }
    } catch (error) {
      if (stryMutAct_9fa48("421")) {
        {}
      } else {
        stryCov_9fa48("421");
        return stryMutAct_9fa48("422") ? "" : (stryCov_9fa48("422"), "light");
      }
    }
  }
};
const broadcastServerStatus = async (): Promise<void> => {
  if (stryMutAct_9fa48("423")) {
    {}
  } else {
    stryCov_9fa48("423");
    const status = await getServerStatus();

    // Update icon based on server status
    if (stryMutAct_9fa48("426") ? status !== "connected" : stryMutAct_9fa48("425") ? false : stryMutAct_9fa48("424") ? true : (stryCov_9fa48("424", "425", "426"), status === (stryMutAct_9fa48("427") ? "" : (stryCov_9fa48("427"), "connected")))) {
      if (stryMutAct_9fa48("428")) {
        {}
      } else {
        stryCov_9fa48("428");
        // Use the current theme's icon paths
        const iconPaths = getActionIconPaths();
        const currentTheme = await getCurrentTheme();
        chrome.action.setIcon(stryMutAct_9fa48("429") ? {} : (stryCov_9fa48("429"), {
          path: iconPaths[currentTheme]
        }));
        stryMutAct_9fa48("430") ? (chrome.action as any).setBadgeText({
          text: ""
        }) : (stryCov_9fa48("430"), (chrome.action as any).setBadgeText?.(stryMutAct_9fa48("431") ? {} : (stryCov_9fa48("431"), {
          text: stryMutAct_9fa48("432") ? "Stryker was here!" : (stryCov_9fa48("432"), "")
        })));
      }
    } else {
      if (stryMutAct_9fa48("433")) {
        {}
      } else {
        stryCov_9fa48("433");
        // Use error icon (could be a different icon or just the current theme with badge)
        const iconPaths = getActionIconPaths();
        const currentTheme = await getCurrentTheme();
        chrome.action.setIcon(stryMutAct_9fa48("434") ? {} : (stryCov_9fa48("434"), {
          path: iconPaths[currentTheme]
        }));
        stryMutAct_9fa48("435") ? (chrome.action as any).setBadgeText({
          text: "!"
        }) : (stryCov_9fa48("435"), (chrome.action as any).setBadgeText?.(stryMutAct_9fa48("436") ? {} : (stryCov_9fa48("436"), {
          text: stryMutAct_9fa48("437") ? "" : (stryCov_9fa48("437"), "!")
        })));
        stryMutAct_9fa48("438") ? (chrome.action as any).setBadgeBackgroundColor({
          color: "#f44336"
        }) : (stryCov_9fa48("438"), (chrome.action as any).setBadgeBackgroundColor?.(stryMutAct_9fa48("439") ? {} : (stryCov_9fa48("439"), {
          color: stryMutAct_9fa48("440") ? "" : (stryCov_9fa48("440"), "#f44336")
        })));
      }
    }

    // Broadcast status to all UI components
    chrome.runtime.sendMessage(stryMutAct_9fa48("441") ? {} : (stryCov_9fa48("441"), {
      type: stryMutAct_9fa48("442") ? "" : (stryCov_9fa48("442"), "serverStatusUpdate"),
      status
    })).catch(() => {
      // Ignore errors when no listeners are available
    });
  }
};
const checkServerStatus = stryMutAct_9fa48("443") ? () => undefined : (stryCov_9fa48("443"), (() => {
  const checkServerStatus = async (port: number): Promise<boolean> => errorHandler.wrap(async () => {
    if (stryMutAct_9fa48("444")) {
      {}
    } else {
      stryCov_9fa48("444");
      const serverState = stateManager.getServerState();
      const oldAvailable = stryMutAct_9fa48("447") ? serverState.status !== "connected" : stryMutAct_9fa48("446") ? false : stryMutAct_9fa48("445") ? true : (stryCov_9fa48("445", "446", "447"), serverState.status === (stryMutAct_9fa48("448") ? "" : (stryCov_9fa48("448"), "connected")));

      // Skip server status checks when fetch API is unavailable (e.g., non-browser or test env)
      if (stryMutAct_9fa48("451") ? typeof fetch === "function" : stryMutAct_9fa48("450") ? false : stryMutAct_9fa48("449") ? true : (stryCov_9fa48("449", "450", "451"), typeof fetch !== (stryMutAct_9fa48("452") ? "" : (stryCov_9fa48("452"), "function")))) {
        if (stryMutAct_9fa48("453")) {
          {}
        } else {
          stryCov_9fa48("453");
          return stryMutAct_9fa48("454") ? true : (stryCov_9fa48("454"), false);
        }
      }
      if (stryMutAct_9fa48("457") ? false : stryMutAct_9fa48("456") ? true : stryMutAct_9fa48("455") ? port : (stryCov_9fa48("455", "456", "457"), !port)) {
        if (stryMutAct_9fa48("458")) {
          {}
        } else {
          stryCov_9fa48("458");
          stateManager.updateServerState(stryMutAct_9fa48("459") ? {} : (stryCov_9fa48("459"), {
            status: stryMutAct_9fa48("460") ? "" : (stryCov_9fa48("460"), "disconnected")
          }));
          await errorHandler.handle(stryMutAct_9fa48("461") ? () => undefined : (stryCov_9fa48("461"), () => chrome.storage.local.set(stryMutAct_9fa48("462") ? {} : (stryCov_9fa48("462"), {
            [serverStatusKey]: stryMutAct_9fa48("463") ? true : (stryCov_9fa48("463"), false)
          }))), CentralizedErrorHandler.contexts.background.serverCheck(port));
          updateIcon();
          // Notify if availability changed
          if (stryMutAct_9fa48("465") ? false : stryMutAct_9fa48("464") ? true : (stryCov_9fa48("464", "465"), oldAvailable)) {
            if (stryMutAct_9fa48("466")) {
              {}
            } else {
              stryCov_9fa48("466");
              showNotification(stryMutAct_9fa48("467") ? "" : (stryCov_9fa48("467"), "Server Disconnected"), stryMutAct_9fa48("468") ? "" : (stryCov_9fa48("468"), "The Enhanced Video Downloader server is not available. Downloads won't work until it's reconnected."));
            }
          }
          return stryMutAct_9fa48("469") ? true : (stryCov_9fa48("469"), false);
        }
      }

      // Fetch server status with timeout, with localhost fallback and robust error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(stryMutAct_9fa48("470") ? () => undefined : (stryCov_9fa48("470"), () => controller.abort()), PORT_CHECK_TIMEOUT);
      let response: Response | undefined;
      try {
        if (stryMutAct_9fa48("471")) {
          {}
        } else {
          stryCov_9fa48("471");
          // Try 127.0.0.1 first
          response = await fetch(stryMutAct_9fa48("472") ? `` : (stryCov_9fa48("472"), `http://127.0.0.1:${port}/api/health`), stryMutAct_9fa48("473") ? {} : (stryCov_9fa48("473"), {
            signal: controller.signal
          }));
        }
      } catch {
        if (stryMutAct_9fa48("474")) {
          {}
        } else {
          stryCov_9fa48("474");
          try {
            if (stryMutAct_9fa48("475")) {
              {}
            } else {
              stryCov_9fa48("475");
              // Fallback to localhost
              response = await fetch(stryMutAct_9fa48("476") ? `` : (stryCov_9fa48("476"), `http://localhost:${port}/api/health`), stryMutAct_9fa48("477") ? {} : (stryCov_9fa48("477"), {
                signal: controller.signal
              }));
            }
          } catch {
            if (stryMutAct_9fa48("478")) {
              {}
            } else {
              stryCov_9fa48("478");
              response = undefined;
            }
          }
        }
      } finally {
        if (stryMutAct_9fa48("479")) {
          {}
        } else {
          stryCov_9fa48("479");
          clearTimeout(timeoutId);
        }
      }
      if (stryMutAct_9fa48("482") ? response || response.ok : stryMutAct_9fa48("481") ? false : stryMutAct_9fa48("480") ? true : (stryCov_9fa48("480", "481", "482"), response && response.ok)) {
        if (stryMutAct_9fa48("483")) {
          {}
        } else {
          stryCov_9fa48("483");
          const data = await response.json();
          // Verify the server is our app by checking app_name
          if (stryMutAct_9fa48("486") ? data.app_name !== expectedAppName : stryMutAct_9fa48("485") ? false : stryMutAct_9fa48("484") ? true : (stryCov_9fa48("484", "485", "486"), data.app_name === expectedAppName)) {
            if (stryMutAct_9fa48("487")) {
              {}
            } else {
              stryCov_9fa48("487");
              stateManager.updateServerState(stryMutAct_9fa48("488") ? {} : (stryCov_9fa48("488"), {
                status: stryMutAct_9fa48("489") ? "" : (stryCov_9fa48("489"), "connected")
              }));
              // If server just came online, refresh config
              if (stryMutAct_9fa48("492") ? false : stryMutAct_9fa48("491") ? true : stryMutAct_9fa48("490") ? oldAvailable : (stryCov_9fa48("490", "491", "492"), !oldAvailable)) {
                if (stryMutAct_9fa48("493")) {
                  {}
                } else {
                  stryCov_9fa48("493");
                  logger.info((stryMutAct_9fa48("494") ? "" : (stryCov_9fa48("494"), "Server now available on port ")) + port + (stryMutAct_9fa48("495") ? "" : (stryCov_9fa48("495"), ", refreshing config")), CentralizedLogger.contexts.background.serverCheck(port));
                  await fetchServerConfig(port);
                }
              }
            }
          } else {
            if (stryMutAct_9fa48("496")) {
              {}
            } else {
              stryCov_9fa48("496");
              logger.warn((stryMutAct_9fa48("497") ? "" : (stryCov_9fa48("497"), "Wrong server on port ")) + port + (stryMutAct_9fa48("498") ? "" : (stryCov_9fa48("498"), ": ")) + data.app_name, CentralizedLogger.contexts.background.serverCheck(port));
              stateManager.updateServerState(stryMutAct_9fa48("499") ? {} : (stryCov_9fa48("499"), {
                status: stryMutAct_9fa48("500") ? "" : (stryCov_9fa48("500"), "disconnected")
              }));
            }
          }
        }
      } else if (stryMutAct_9fa48("502") ? false : stryMutAct_9fa48("501") ? true : (stryCov_9fa48("501", "502"), response)) {
        if (stryMutAct_9fa48("503")) {
          {}
        } else {
          stryCov_9fa48("503");
          logger.warn((stryMutAct_9fa48("504") ? "" : (stryCov_9fa48("504"), "Server check failed on port ")) + port + (stryMutAct_9fa48("505") ? "" : (stryCov_9fa48("505"), ": ")) + response.status, CentralizedLogger.contexts.background.serverCheck(port));
          stateManager.updateServerState(stryMutAct_9fa48("506") ? {} : (stryCov_9fa48("506"), {
            status: stryMutAct_9fa48("507") ? "" : (stryCov_9fa48("507"), "disconnected")
          }));
        }
      } else {
        if (stryMutAct_9fa48("508")) {
          {}
        } else {
          stryCov_9fa48("508");
          // No response (network/timeout). Treat as disconnected quietly.
          stateManager.updateServerState(stryMutAct_9fa48("509") ? {} : (stryCov_9fa48("509"), {
            status: stryMutAct_9fa48("510") ? "" : (stryCov_9fa48("510"), "disconnected")
          }));
        }
      }

      // Update storage
      const currentState = stateManager.getServerState();
      await errorHandler.handle(stryMutAct_9fa48("511") ? () => undefined : (stryCov_9fa48("511"), () => chrome.storage.local.set(stryMutAct_9fa48("512") ? {} : (stryCov_9fa48("512"), {
        [serverStatusKey]: stryMutAct_9fa48("515") ? currentState.status !== "connected" : stryMutAct_9fa48("514") ? false : stryMutAct_9fa48("513") ? true : (stryCov_9fa48("513", "514", "515"), currentState.status === (stryMutAct_9fa48("516") ? "" : (stryCov_9fa48("516"), "connected")))
      }))), CentralizedErrorHandler.contexts.background.serverCheck(port));

      // Update badge/icon to reflect server status
      updateIcon();

      // If server availability changed, show notification
      const currentAvailable = stryMutAct_9fa48("519") ? currentState.status !== "connected" : stryMutAct_9fa48("518") ? false : stryMutAct_9fa48("517") ? true : (stryCov_9fa48("517", "518", "519"), currentState.status === (stryMutAct_9fa48("520") ? "" : (stryCov_9fa48("520"), "connected")));
      if (stryMutAct_9fa48("523") ? currentAvailable === oldAvailable : stryMutAct_9fa48("522") ? false : stryMutAct_9fa48("521") ? true : (stryCov_9fa48("521", "522", "523"), currentAvailable !== oldAvailable)) {
        if (stryMutAct_9fa48("524")) {
          {}
        } else {
          stryCov_9fa48("524");
          if (stryMutAct_9fa48("526") ? false : stryMutAct_9fa48("525") ? true : (stryCov_9fa48("525", "526"), currentAvailable)) {
            if (stryMutAct_9fa48("527")) {
              {}
            } else {
              stryCov_9fa48("527");
              showNotification(stryMutAct_9fa48("528") ? "" : (stryCov_9fa48("528"), "Server Connected"), (stryMutAct_9fa48("529") ? "" : (stryCov_9fa48("529"), "Enhanced Video Downloader server is now online on port ")) + port + (stryMutAct_9fa48("530") ? "" : (stryCov_9fa48("530"), ".")));
              // Reset backoff interval when server is found
              stateManager.updateServerState(stryMutAct_9fa48("531") ? {} : (stryCov_9fa48("531"), {
                backoffInterval: 1000
              }));
            }
          } else {
            if (stryMutAct_9fa48("532")) {
              {}
            } else {
              stryCov_9fa48("532");
              showNotification(stryMutAct_9fa48("533") ? "" : (stryCov_9fa48("533"), "Server Disconnected"), stryMutAct_9fa48("534") ? "" : (stryCov_9fa48("534"), "The Enhanced Video Downloader server is not available. Downloads won't work until it's reconnected."));
            }
          }
        }
      }
      return currentAvailable;
    }
  }, CentralizedErrorHandler.contexts.background.serverCheck(port));
  return checkServerStatus;
})());

// Additional functions (stub implementations to be completed)
const fetchServerConfig = async (port: number): Promise<Partial<ServerConfig>> => {
  if (stryMutAct_9fa48("535")) {
    {}
  } else {
    stryCov_9fa48("535");
    try {
      if (stryMutAct_9fa48("536")) {
        {}
      } else {
        stryCov_9fa48("536");
        const response = await fetch(stryMutAct_9fa48("537") ? `` : (stryCov_9fa48("537"), `http://127.0.0.1:${port}/api/config`));
        if (stryMutAct_9fa48("539") ? false : stryMutAct_9fa48("538") ? true : (stryCov_9fa48("538", "539"), response.ok)) {
          if (stryMutAct_9fa48("540")) {
            {}
          } else {
            stryCov_9fa48("540");
            const config = await response.json();
            return config;
          }
        } else {
          if (stryMutAct_9fa48("541")) {
            {}
          } else {
            stryCov_9fa48("541");
            log(stryMutAct_9fa48("542") ? `` : (stryCov_9fa48("542"), `Failed to fetch config from server: ${response.status}`));
            return {};
          }
        }
      }
    } catch (error) {
      if (stryMutAct_9fa48("543")) {
        {}
      } else {
        stryCov_9fa48("543");
        log(stryMutAct_9fa48("544") ? `` : (stryCov_9fa48("544"), `Error fetching server config: ${error}`));
        return {};
      }
    }
  }
};
const saveServerConfig = async (port: number, configToSave: Partial<ServerConfig>): Promise<boolean> => {
  if (stryMutAct_9fa48("545")) {
    {}
  } else {
    stryCov_9fa48("545");
    try {
      if (stryMutAct_9fa48("546")) {
        {}
      } else {
        stryCov_9fa48("546");
        const response = await fetch(stryMutAct_9fa48("547") ? `` : (stryCov_9fa48("547"), `http://127.0.0.1:${port}/api/config`), stryMutAct_9fa48("548") ? {} : (stryCov_9fa48("548"), {
          method: stryMutAct_9fa48("549") ? "" : (stryCov_9fa48("549"), "POST"),
          headers: stryMutAct_9fa48("550") ? {} : (stryCov_9fa48("550"), {
            "Content-Type": stryMutAct_9fa48("551") ? "" : (stryCov_9fa48("551"), "application/json")
          }),
          body: JSON.stringify(configToSave)
        }));
        if (stryMutAct_9fa48("553") ? false : stryMutAct_9fa48("552") ? true : (stryCov_9fa48("552", "553"), response.ok)) {
          if (stryMutAct_9fa48("554")) {
            {}
          } else {
            stryCov_9fa48("554");
            log(stryMutAct_9fa48("555") ? `` : (stryCov_9fa48("555"), `Config saved successfully to server on port ${port}`));
            return stryMutAct_9fa48("556") ? false : (stryCov_9fa48("556"), true);
          }
        } else {
          if (stryMutAct_9fa48("557")) {
            {}
          } else {
            stryCov_9fa48("557");
            log(stryMutAct_9fa48("558") ? `` : (stryCov_9fa48("558"), `Failed to save config to server: ${response.status}`));
            return stryMutAct_9fa48("559") ? true : (stryCov_9fa48("559"), false);
          }
        }
      }
    } catch (error) {
      if (stryMutAct_9fa48("560")) {
        {}
      } else {
        stryCov_9fa48("560");
        log(stryMutAct_9fa48("561") ? `` : (stryCov_9fa48("561"), `Error saving server config: ${error}`));
        return stryMutAct_9fa48("562") ? true : (stryCov_9fa48("562"), false);
      }
    }
  }
};
type FindServerPortDeps = {
  discoverServerPort: typeof discoverServerPort;
  storageService: typeof storageService;
  checkServerStatus: typeof checkServerStatus;
  log: typeof log;
  warn: typeof warn;
};
const findServerPort = async (startScan = stryMutAct_9fa48("563") ? true : (stryCov_9fa48("563"), false), deps?: Partial<FindServerPortDeps>): Promise<number | null> => {
  if (stryMutAct_9fa48("564")) {
    {}
  } else {
    stryCov_9fa48("564");
    const {
      discoverServerPort: discover = discoverServerPort,
      storageService: storage = storageService,
      checkServerStatus: checkStatus = checkServerStatus,
      log: logFn = log,
      warn: warnFn = warn
    } = stryMutAct_9fa48("567") ? deps && {} : stryMutAct_9fa48("566") ? false : stryMutAct_9fa48("565") ? true : (stryCov_9fa48("565", "566", "567"), deps || {});

    // Show badge indicator if forcing scan
    if (stryMutAct_9fa48("570") ? startScan || (chrome.action as any)?.setBadgeText : stryMutAct_9fa48("569") ? false : stryMutAct_9fa48("568") ? true : (stryCov_9fa48("568", "569", "570"), startScan && (stryMutAct_9fa48("571") ? (chrome.action as any).setBadgeText : (stryCov_9fa48("571"), (chrome.action as any)?.setBadgeText)))) {
      if (stryMutAct_9fa48("572")) {
        {}
      } else {
        stryCov_9fa48("572");
        try {
          if (stryMutAct_9fa48("573")) {
            {}
          } else {
            stryCov_9fa48("573");
            (chrome.action as any).setBadgeBackgroundColor(stryMutAct_9fa48("574") ? {} : (stryCov_9fa48("574"), {
              color: stryMutAct_9fa48("575") ? "" : (stryCov_9fa48("575"), "#ffc107")
            }));
            (chrome.action as any).setBadgeText(stryMutAct_9fa48("576") ? {} : (stryCov_9fa48("576"), {
              text: stryMutAct_9fa48("577") ? "" : (stryCov_9fa48("577"), "SCAN")
            })); // Use plain ASCII string
          }
        } catch (e) {
          /* ignore errors setting badge */
        }
      }
    }

    // Set scanning state
    stateManager.updateServerState(stryMutAct_9fa48("578") ? {} : (stryCov_9fa48("578"), {
      scanInProgress: stryMutAct_9fa48("579") ? false : (stryCov_9fa48("579"), true)
    }));
    try {
      if (stryMutAct_9fa48("580")) {
        {}
      } else {
        stryCov_9fa48("580");
        // Progress callback for user feedback
        const onProgress = (current: number, total: number) => {
          if (stryMutAct_9fa48("581")) {
            {}
          } else {
            stryCov_9fa48("581");
            if (stryMutAct_9fa48("584") ? startScan || (chrome.action as any)?.setBadgeText : stryMutAct_9fa48("583") ? false : stryMutAct_9fa48("582") ? true : (stryCov_9fa48("582", "583", "584"), startScan && (stryMutAct_9fa48("585") ? (chrome.action as any).setBadgeText : (stryCov_9fa48("585"), (chrome.action as any)?.setBadgeText)))) {
              if (stryMutAct_9fa48("586")) {
                {}
              } else {
                stryCov_9fa48("586");
                try {
                  if (stryMutAct_9fa48("587")) {
                    {}
                  } else {
                    stryCov_9fa48("587");
                    const percentage = Math.round(stryMutAct_9fa48("588") ? current / total / 100 : (stryCov_9fa48("588"), (stryMutAct_9fa48("589") ? current * total : (stryCov_9fa48("589"), current / total)) * 100));
                    (chrome.action as any).setBadgeText(stryMutAct_9fa48("590") ? {} : (stryCov_9fa48("590"), {
                      text: String(percentage) + (stryMutAct_9fa48("591") ? "" : (stryCov_9fa48("591"), "%"))
                    })); // Use string concatenation
                  }
                } catch (e) {
                  /* ignore errors setting badge */
                }
              }
            }
          }
        };

        // Perform discovery with timeout and progress
        const port = await discover(storage, checkStatus, _defaultServerPort, _maxPortScan, startScan, PORT_CHECK_TIMEOUT, onProgress);
        if (stryMutAct_9fa48("594") ? port === null : stryMutAct_9fa48("593") ? false : stryMutAct_9fa48("592") ? true : (stryCov_9fa48("592", "593", "594"), port !== null)) {
          if (stryMutAct_9fa48("595")) {
            {}
          } else {
            stryCov_9fa48("595");
            logFn((stryMutAct_9fa48("596") ? "" : (stryCov_9fa48("596"), "Server discovered on port ")) + port);
            // Reset backoff interval when server is found
            stateManager.updateServerState(stryMutAct_9fa48("597") ? {} : (stryCov_9fa48("597"), {
              backoffInterval: 1000
            }));

            // Notify options page about server discovery
            try {
              if (stryMutAct_9fa48("598")) {
                {}
              } else {
                stryCov_9fa48("598");
                chrome.runtime.sendMessage(stryMutAct_9fa48("599") ? {} : (stryCov_9fa48("599"), {
                  type: stryMutAct_9fa48("600") ? "" : (stryCov_9fa48("600"), "serverDiscovered"),
                  port
                }), response => {
                  if (stryMutAct_9fa48("601")) {
                    {}
                  } else {
                    stryCov_9fa48("601");
                    // Ignore any errors - this is just a notification
                    if (stryMutAct_9fa48("603") ? false : stryMutAct_9fa48("602") ? true : (stryCov_9fa48("602", "603"), chrome.runtime.lastError)) {
                      if (stryMutAct_9fa48("604")) {
                        {}
                      } else {
                        stryCov_9fa48("604");
                        // This is expected when options page is not open
                        logFn(stryMutAct_9fa48("605") ? "" : (stryCov_9fa48("605"), "Server discovery notification sent (options page may not be open)"));
                      }
                    }
                  }
                });
              }
            } catch (e) {
              if (stryMutAct_9fa48("606")) {
                {}
              } else {
                stryCov_9fa48("606");
                // Ignore errors if no listeners are available
                logFn(stryMutAct_9fa48("607") ? "" : (stryCov_9fa48("607"), "Server discovery notification failed (expected if options page not open)"));
              }
            }
          }
        } else {
          if (stryMutAct_9fa48("608")) {
            {}
          } else {
            stryCov_9fa48("608");
            warnFn(stryMutAct_9fa48("609") ? "" : (stryCov_9fa48("609"), "Server port discovery failed after scanning range.")); // No emoji, just text
            // Increase backoff interval for next attempt
            const currentState = stateManager.getServerState();
            const newBackoffInterval = stryMutAct_9fa48("610") ? Math.max(currentState.backoffInterval * 2, _maxPortBackoffInterval) : (stryCov_9fa48("610"), Math.min(stryMutAct_9fa48("611") ? currentState.backoffInterval / 2 : (stryCov_9fa48("611"), currentState.backoffInterval * 2), _maxPortBackoffInterval));
            stateManager.updateServerState(stryMutAct_9fa48("612") ? {} : (stryCov_9fa48("612"), {
              backoffInterval: newBackoffInterval
            }));
          }
        }
        return port;
      }
    } catch (e) {
      if (stryMutAct_9fa48("613")) {
        {}
      } else {
        stryCov_9fa48("613");
        // Handle any errors from the discover function
        warnFn(stryMutAct_9fa48("614") ? "" : (stryCov_9fa48("614"), "Error during server port discovery:"), e); // No emoji, just text
        // Increase backoff interval for next attempt
        const currentState = stateManager.getServerState();
        const newBackoffInterval = stryMutAct_9fa48("615") ? Math.max(currentState.backoffInterval * 2, _maxPortBackoffInterval) : (stryCov_9fa48("615"), Math.min(stryMutAct_9fa48("616") ? currentState.backoffInterval / 2 : (stryCov_9fa48("616"), currentState.backoffInterval * 2), _maxPortBackoffInterval));
        stateManager.updateServerState(stryMutAct_9fa48("617") ? {} : (stryCov_9fa48("617"), {
          backoffInterval: newBackoffInterval
        }));
        return null;
      }
    } finally {
      if (stryMutAct_9fa48("618")) {
        {}
      } else {
        stryCov_9fa48("618");
        // Clear badge after scanning
        if (stryMutAct_9fa48("621") ? startScan || (chrome.action as any)?.setBadgeText : stryMutAct_9fa48("620") ? false : stryMutAct_9fa48("619") ? true : (stryCov_9fa48("619", "620", "621"), startScan && (stryMutAct_9fa48("622") ? (chrome.action as any).setBadgeText : (stryCov_9fa48("622"), (chrome.action as any)?.setBadgeText)))) {
          if (stryMutAct_9fa48("623")) {
            {}
          } else {
            stryCov_9fa48("623");
            try {
              if (stryMutAct_9fa48("624")) {
                {}
              } else {
                stryCov_9fa48("624");
                (chrome.action as any).setBadgeText(stryMutAct_9fa48("625") ? {} : (stryCov_9fa48("625"), {
                  text: stryMutAct_9fa48("626") ? "Stryker was here!" : (stryCov_9fa48("626"), "")
                })); // Clear badge text, no emoji
              }
            } catch (e) {
              /* ignore errors clearing badge */
            }
          }
        }

        // Clear scanning state
        stateManager.updateServerState(stryMutAct_9fa48("627") ? {} : (stryCov_9fa48("627"), {
          scanInProgress: stryMutAct_9fa48("628") ? true : (stryCov_9fa48("628"), false)
        }));
      }
    }
  }
};
const updateIcon = (): void => {
  if (stryMutAct_9fa48("629")) {
    {}
  } else {
    stryCov_9fa48("629");
    try {
      if (stryMutAct_9fa48("630")) {
        {}
      } else {
        stryCov_9fa48("630");
        const serverState = stateManager.getServerState();
        const iconPaths = getActionIconPaths();

        // Get current theme
        getCurrentTheme().then(currentTheme => {
          if (stryMutAct_9fa48("631")) {
            {}
          } else {
            stryCov_9fa48("631");
            const iconPath = iconPaths[currentTheme];

            // Update icon based on server status
            if (stryMutAct_9fa48("634") ? serverState.status !== "connected" : stryMutAct_9fa48("633") ? false : stryMutAct_9fa48("632") ? true : (stryCov_9fa48("632", "633", "634"), serverState.status === (stryMutAct_9fa48("635") ? "" : (stryCov_9fa48("635"), "connected")))) {
              if (stryMutAct_9fa48("636")) {
                {}
              } else {
                stryCov_9fa48("636");
                chrome.action.setIcon(stryMutAct_9fa48("637") ? {} : (stryCov_9fa48("637"), {
                  path: iconPath
                }));
                // Clear badge when connected
                stryMutAct_9fa48("638") ? (chrome.action as any).setBadgeText({
                  text: ""
                }) : (stryCov_9fa48("638"), (chrome.action as any).setBadgeText?.(stryMutAct_9fa48("639") ? {} : (stryCov_9fa48("639"), {
                  text: stryMutAct_9fa48("640") ? "Stryker was here!" : (stryCov_9fa48("640"), "")
                })));
              }
            } else {
              if (stryMutAct_9fa48("641")) {
                {}
              } else {
                stryCov_9fa48("641");
                chrome.action.setIcon(stryMutAct_9fa48("642") ? {} : (stryCov_9fa48("642"), {
                  path: iconPath
                }));
                // Show error badge when disconnected
                stryMutAct_9fa48("643") ? (chrome.action as any).setBadgeText({
                  text: "!"
                }) : (stryCov_9fa48("643"), (chrome.action as any).setBadgeText?.(stryMutAct_9fa48("644") ? {} : (stryCov_9fa48("644"), {
                  text: stryMutAct_9fa48("645") ? "" : (stryCov_9fa48("645"), "!")
                })));
                stryMutAct_9fa48("646") ? (chrome.action as any).setBadgeBackgroundColor({
                  color: "#f44336"
                }) : (stryCov_9fa48("646"), (chrome.action as any).setBadgeBackgroundColor?.(stryMutAct_9fa48("647") ? {} : (stryCov_9fa48("647"), {
                  color: stryMutAct_9fa48("648") ? "" : (stryCov_9fa48("648"), "#f44336")
                })));
              }
            }
          }
        }).catch(error => {
          if (stryMutAct_9fa48("649")) {
            {}
          } else {
            stryCov_9fa48("649");
            warn(stryMutAct_9fa48("650") ? "" : (stryCov_9fa48("650"), "Failed to update icon:"), error);
          }
        });
      }
    } catch (error) {
      if (stryMutAct_9fa48("651")) {
        {}
      } else {
        stryCov_9fa48("651");
        warn(stryMutAct_9fa48("652") ? "" : (stryCov_9fa48("652"), "Error updating icon:"), error);
      }
    }
  }
};
const updateBadge = (): void => {
  if (stryMutAct_9fa48("653")) {
    {}
  } else {
    stryCov_9fa48("653");
    try {
      if (stryMutAct_9fa48("654")) {
        {}
      } else {
        stryCov_9fa48("654");
        // Get current queue length
        const queueLength = downloadQueue.length;
        const activeCount = Object.keys(activeDownloads).length;
        if (stryMutAct_9fa48("657") ? queueLength > 0 && activeCount > 0 : stryMutAct_9fa48("656") ? false : stryMutAct_9fa48("655") ? true : (stryCov_9fa48("655", "656", "657"), (stryMutAct_9fa48("660") ? queueLength <= 0 : stryMutAct_9fa48("659") ? queueLength >= 0 : stryMutAct_9fa48("658") ? false : (stryCov_9fa48("658", "659", "660"), queueLength > 0)) || (stryMutAct_9fa48("663") ? activeCount <= 0 : stryMutAct_9fa48("662") ? activeCount >= 0 : stryMutAct_9fa48("661") ? false : (stryCov_9fa48("661", "662", "663"), activeCount > 0)))) {
          if (stryMutAct_9fa48("664")) {
            {}
          } else {
            stryCov_9fa48("664");
            const totalCount = stryMutAct_9fa48("665") ? queueLength - activeCount : (stryCov_9fa48("665"), queueLength + activeCount);
            const badgeText = (stryMutAct_9fa48("669") ? totalCount <= 99 : stryMutAct_9fa48("668") ? totalCount >= 99 : stryMutAct_9fa48("667") ? false : stryMutAct_9fa48("666") ? true : (stryCov_9fa48("666", "667", "668", "669"), totalCount > 99)) ? stryMutAct_9fa48("670") ? "" : (stryCov_9fa48("670"), "99+") : String(totalCount);
            stryMutAct_9fa48("671") ? (chrome.action as any).setBadgeText({
              text: badgeText
            }) : (stryCov_9fa48("671"), (chrome.action as any).setBadgeText?.(stryMutAct_9fa48("672") ? {} : (stryCov_9fa48("672"), {
              text: badgeText
            })));
            stryMutAct_9fa48("673") ? (chrome.action as any).setBadgeBackgroundColor({
              color: "#4CAF50"
            }) : (stryCov_9fa48("673"), (chrome.action as any).setBadgeBackgroundColor?.(stryMutAct_9fa48("674") ? {} : (stryCov_9fa48("674"), {
              color: stryMutAct_9fa48("675") ? "" : (stryCov_9fa48("675"), "#4CAF50")
            })));
          }
        } else {
          if (stryMutAct_9fa48("676")) {
            {}
          } else {
            stryCov_9fa48("676");
            // Clear badge when no downloads
            stryMutAct_9fa48("677") ? (chrome.action as any).setBadgeText({
              text: ""
            }) : (stryCov_9fa48("677"), (chrome.action as any).setBadgeText?.(stryMutAct_9fa48("678") ? {} : (stryCov_9fa48("678"), {
              text: stryMutAct_9fa48("679") ? "Stryker was here!" : (stryCov_9fa48("679"), "")
            })));
          }
        }
      }
    } catch (error) {
      if (stryMutAct_9fa48("680")) {
        {}
      } else {
        stryCov_9fa48("680");
        warn(stryMutAct_9fa48("681") ? "" : (stryCov_9fa48("681"), "Error updating badge:"), error);
      }
    }
  }
};
const addOrUpdateHistory = async (url: string, status: string, filename?: string, filepath?: string, thumbnailUrl?: string, sourceUrl?: string, title?: string): Promise<void> => {
  if (stryMutAct_9fa48("682")) {
    {}
  } else {
    stryCov_9fa48("682");
    try {
      if (stryMutAct_9fa48("683")) {
        {}
      } else {
        stryCov_9fa48("683");
        // Check if history is enabled
        const result = await chrome.storage.local.get(stryMutAct_9fa48("684") ? "" : (stryCov_9fa48("684"), "isHistoryEnabled"));
        const isHistoryEnabled = stryMutAct_9fa48("687") ? result.isHistoryEnabled === false : stryMutAct_9fa48("686") ? false : stryMutAct_9fa48("685") ? true : (stryCov_9fa48("685", "686", "687"), result.isHistoryEnabled !== (stryMutAct_9fa48("688") ? true : (stryCov_9fa48("688"), false))); // Default to true

        if (stryMutAct_9fa48("691") ? false : stryMutAct_9fa48("690") ? true : stryMutAct_9fa48("689") ? isHistoryEnabled : (stryCov_9fa48("689", "690", "691"), !isHistoryEnabled)) {
          if (stryMutAct_9fa48("692")) {
            {}
          } else {
            stryCov_9fa48("692");
            return; // Skip if history is disabled
          }
        }

        // Get existing history
        const historyResult = await chrome.storage.local.get(_historyStorageKey);
        const history: HistoryEntry[] = stryMutAct_9fa48("695") ? historyResult[_historyStorageKey] && [] : stryMutAct_9fa48("694") ? false : stryMutAct_9fa48("693") ? true : (stryCov_9fa48("693", "694", "695"), historyResult[_historyStorageKey] || (stryMutAct_9fa48("696") ? ["Stryker was here"] : (stryCov_9fa48("696"), [])));

        // Create new history entry
        const newEntry: HistoryEntry = stryMutAct_9fa48("697") ? {} : (stryCov_9fa48("697"), {
          id: Date.now().toString(),
          url,
          status,
          timestamp: Date.now(),
          filename,
          filepath,
          page_title: title,
          thumbnailUrl,
          sourceUrl
        });

        // Add to beginning of history (most recent first)
        history.unshift(newEntry);

        // Limit history to last 100 entries
        const limitedHistory = stryMutAct_9fa48("698") ? history : (stryCov_9fa48("698"), history.slice(0, 100));

        // Save updated history
        await chrome.storage.local.set(stryMutAct_9fa48("699") ? {} : (stryCov_9fa48("699"), {
          [_historyStorageKey]: limitedHistory
        }));

        // Notify other components about history update (ignore when no listeners)
        try {
          if (stryMutAct_9fa48("700")) {
            {}
          } else {
            stryCov_9fa48("700");
            const maybePromise = chrome.runtime.sendMessage(stryMutAct_9fa48("701") ? {} : (stryCov_9fa48("701"), {
              type: stryMutAct_9fa48("702") ? "" : (stryCov_9fa48("702"), "historyUpdated")
            }));
            // In some environments sendMessage may return a Promise; guard against unhandled rejections
            if (stryMutAct_9fa48("705") ? maybePromise || typeof (maybePromise as any).catch === "function" : stryMutAct_9fa48("704") ? false : stryMutAct_9fa48("703") ? true : (stryCov_9fa48("703", "704", "705"), maybePromise && (stryMutAct_9fa48("707") ? typeof (maybePromise as any).catch !== "function" : stryMutAct_9fa48("706") ? true : (stryCov_9fa48("706", "707"), typeof (maybePromise as any).catch === (stryMutAct_9fa48("708") ? "" : (stryCov_9fa48("708"), "function")))))) {
              if (stryMutAct_9fa48("709")) {
                {}
              } else {
                stryCov_9fa48("709");
                (maybePromise as any).catch(() => {});
              }
            }
          }
        } catch (e) {
          // Ignore errors if no listeners are available
        }
        log(stryMutAct_9fa48("710") ? "" : (stryCov_9fa48("710"), "Added download to history:"), stryMutAct_9fa48("711") ? {} : (stryCov_9fa48("711"), {
          url,
          status,
          filename
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("712")) {
        {}
      } else {
        stryCov_9fa48("712");
        warn(stryMutAct_9fa48("713") ? "" : (stryCov_9fa48("713"), "Failed to add download to history:"), error);
      }
    }
  }
};
const clearDownloadHistory = async (): Promise<void> => {
  if (stryMutAct_9fa48("714")) {
    {}
  } else {
    stryCov_9fa48("714");
    try {
      if (stryMutAct_9fa48("715")) {
        {}
      } else {
        stryCov_9fa48("715");
        await chrome.storage.local.set(stryMutAct_9fa48("716") ? {} : (stryCov_9fa48("716"), {
          [_historyStorageKey]: stryMutAct_9fa48("717") ? ["Stryker was here"] : (stryCov_9fa48("717"), [])
        }));

        // Notify other components about history update (ignore when no listeners)
        try {
          if (stryMutAct_9fa48("718")) {
            {}
          } else {
            stryCov_9fa48("718");
            const maybePromise = chrome.runtime.sendMessage(stryMutAct_9fa48("719") ? {} : (stryCov_9fa48("719"), {
              type: stryMutAct_9fa48("720") ? "" : (stryCov_9fa48("720"), "historyUpdated")
            }));
            if (stryMutAct_9fa48("723") ? maybePromise || typeof (maybePromise as any).catch === "function" : stryMutAct_9fa48("722") ? false : stryMutAct_9fa48("721") ? true : (stryCov_9fa48("721", "722", "723"), maybePromise && (stryMutAct_9fa48("725") ? typeof (maybePromise as any).catch !== "function" : stryMutAct_9fa48("724") ? true : (stryCov_9fa48("724", "725"), typeof (maybePromise as any).catch === (stryMutAct_9fa48("726") ? "" : (stryCov_9fa48("726"), "function")))))) {
              if (stryMutAct_9fa48("727")) {
                {}
              } else {
                stryCov_9fa48("727");
                (maybePromise as any).catch(() => {});
              }
            }
          }
        } catch (e) {
          // Ignore errors if no listeners are available
        }
        log(stryMutAct_9fa48("728") ? "" : (stryCov_9fa48("728"), "Download history cleared"));
      }
    } catch (error) {
      if (stryMutAct_9fa48("729")) {
        {}
      } else {
        stryCov_9fa48("729");
        warn(stryMutAct_9fa48("730") ? "" : (stryCov_9fa48("730"), "Failed to clear download history:"), error);
      }
    }
  }
};
const toggleHistorySetting = async (): Promise<void> => {
  if (stryMutAct_9fa48("731")) {
    {}
  } else {
    stryCov_9fa48("731");
    try {
      if (stryMutAct_9fa48("732")) {
        {}
      } else {
        stryCov_9fa48("732");
        const result = await chrome.storage.local.get(stryMutAct_9fa48("733") ? "" : (stryCov_9fa48("733"), "isHistoryEnabled"));
        const enabled = result.isHistoryEnabled as boolean;
        await chrome.storage.local.set(stryMutAct_9fa48("734") ? {} : (stryCov_9fa48("734"), {
          isHistoryEnabled: stryMutAct_9fa48("735") ? enabled : (stryCov_9fa48("735"), !enabled)
        }));
      }
    } catch (e) {
      if (stryMutAct_9fa48("736")) {
        {}
      } else {
        stryCov_9fa48("736");
        warn(stryMutAct_9fa48("737") ? "" : (stryCov_9fa48("737"), "Failed to toggle history setting:"), e);
      }
    }
  }
};
const sendDownloadRequest = async (videoUrl: string, tabId?: number, isPlaylist = stryMutAct_9fa48("738") ? true : (stryCov_9fa48("738"), false), quality?: string | null, format?: string | null, pageTitle = stryMutAct_9fa48("739") ? "" : (stryCov_9fa48("739"), "video"), customDownloadId?: string | null): Promise<any> => {
  if (stryMutAct_9fa48("740")) {
    {}
  } else {
    stryCov_9fa48("740");
    try {
      if (stryMutAct_9fa48("741")) {
        {}
      } else {
        stryCov_9fa48("741");
        const port = await storageService.getPort();
        if (stryMutAct_9fa48("744") ? false : stryMutAct_9fa48("743") ? true : stryMutAct_9fa48("742") ? port : (stryCov_9fa48("742", "743", "744"), !port)) {
          if (stryMutAct_9fa48("745")) {
            {}
          } else {
            stryCov_9fa48("745");
            return stryMutAct_9fa48("746") ? {} : (stryCov_9fa48("746"), {
              status: stryMutAct_9fa48("747") ? "" : (stryCov_9fa48("747"), "error"),
              message: stryMutAct_9fa48("748") ? "" : (stryCov_9fa48("748"), "Server not available")
            });
          }
        }

        // Create download request payload
        const downloadRequest = stryMutAct_9fa48("749") ? {} : (stryCov_9fa48("749"), {
          url: videoUrl,
          quality: stryMutAct_9fa48("752") ? quality && "best" : stryMutAct_9fa48("751") ? false : stryMutAct_9fa48("750") ? true : (stryCov_9fa48("750", "751", "752"), quality || (stryMutAct_9fa48("753") ? "" : (stryCov_9fa48("753"), "best"))),
          format: stryMutAct_9fa48("756") ? format && "mp4" : stryMutAct_9fa48("755") ? false : stryMutAct_9fa48("754") ? true : (stryCov_9fa48("754", "755", "756"), format || (stryMutAct_9fa48("757") ? "" : (stryCov_9fa48("757"), "mp4"))),
          is_playlist: isPlaylist,
          page_title: pageTitle,
          download_id: stryMutAct_9fa48("760") ? customDownloadId && null : stryMutAct_9fa48("759") ? false : stryMutAct_9fa48("758") ? true : (stryCov_9fa48("758", "759", "760"), customDownloadId || null)
        });

        // Send request to server
        const response = await fetch(stryMutAct_9fa48("761") ? `` : (stryCov_9fa48("761"), `http://127.0.0.1:${port}/api/download`), stryMutAct_9fa48("762") ? {} : (stryCov_9fa48("762"), {
          method: stryMutAct_9fa48("763") ? "" : (stryCov_9fa48("763"), "POST"),
          headers: stryMutAct_9fa48("764") ? {} : (stryCov_9fa48("764"), {
            "Content-Type": stryMutAct_9fa48("765") ? "" : (stryCov_9fa48("765"), "application/json")
          }),
          body: JSON.stringify(downloadRequest)
        }));
        if (stryMutAct_9fa48("768") ? false : stryMutAct_9fa48("767") ? true : stryMutAct_9fa48("766") ? response.ok : (stryCov_9fa48("766", "767", "768"), !response.ok)) {
          if (stryMutAct_9fa48("769")) {
            {}
          } else {
            stryCov_9fa48("769");
            const errorText = await response.text();
            return stryMutAct_9fa48("770") ? {} : (stryCov_9fa48("770"), {
              status: stryMutAct_9fa48("771") ? "" : (stryCov_9fa48("771"), "error"),
              message: stryMutAct_9fa48("772") ? `` : (stryCov_9fa48("772"), `Server error: ${response.status} - ${errorText}`)
            });
          }
        }
        const result = await response.json();

        // Add to history if successful
        if (stryMutAct_9fa48("775") ? result.status === "success" && result.status === "queued" : stryMutAct_9fa48("774") ? false : stryMutAct_9fa48("773") ? true : (stryCov_9fa48("773", "774", "775"), (stryMutAct_9fa48("777") ? result.status !== "success" : stryMutAct_9fa48("776") ? false : (stryCov_9fa48("776", "777"), result.status === (stryMutAct_9fa48("778") ? "" : (stryCov_9fa48("778"), "success")))) || (stryMutAct_9fa48("780") ? result.status !== "queued" : stryMutAct_9fa48("779") ? false : (stryCov_9fa48("779", "780"), result.status === (stryMutAct_9fa48("781") ? "" : (stryCov_9fa48("781"), "queued")))))) {
          if (stryMutAct_9fa48("782")) {
            {}
          } else {
            stryCov_9fa48("782");
            await addOrUpdateHistory(videoUrl, result.status, result.filename, result.filepath, result.thumbnail_url, result.source_url, stryMutAct_9fa48("785") ? result.title && pageTitle : stryMutAct_9fa48("784") ? false : stryMutAct_9fa48("783") ? true : (stryCov_9fa48("783", "784", "785"), result.title || pageTitle));

            // Also reflect in the extension's queue UI for immediate feedback
            try {
              if (stryMutAct_9fa48("786")) {
                {}
              } else {
                stryCov_9fa48("786");
                if (stryMutAct_9fa48("789") ? false : stryMutAct_9fa48("788") ? true : stryMutAct_9fa48("787") ? downloadQueue.includes(videoUrl) : (stryCov_9fa48("787", "788", "789"), !downloadQueue.includes(videoUrl))) {
                  if (stryMutAct_9fa48("790")) {
                    {}
                  } else {
                    stryCov_9fa48("790");
                    downloadQueue.push(videoUrl);
                    _updateQueueAndBadge();
                  }
                }
              }
            } catch {
              /* ignore UI update issues */
            }
          }
        }
        return result;
      }
    } catch (err) {
      if (stryMutAct_9fa48("791")) {
        {}
      } else {
        stryCov_9fa48("791");
        const errorMessage = err instanceof Error ? err.message : stryMutAct_9fa48("792") ? "" : (stryCov_9fa48("792"), "Unknown error occurred");
        error(stryMutAct_9fa48("793") ? "" : (stryCov_9fa48("793"), "Error sending download request:"), errorMessage);
        return stryMutAct_9fa48("794") ? {} : (stryCov_9fa48("794"), {
          status: stryMutAct_9fa48("795") ? "" : (stryCov_9fa48("795"), "error"),
          message: errorMessage
        });
      }
    }
  }
};

// Consolidated initialization function
const initializeExtension = async (): Promise<void> => {
  if (stryMutAct_9fa48("796")) {
    {}
  } else {
    stryCov_9fa48("796");
    // Prevent multiple simultaneous initializations
    const serverState = stateManager.getServerState();
    if (stryMutAct_9fa48("798") ? false : stryMutAct_9fa48("797") ? true : (stryCov_9fa48("797", "798"), serverState.scanInProgress)) {
      if (stryMutAct_9fa48("799")) {
        {}
      } else {
        stryCov_9fa48("799");
        log(stryMutAct_9fa48("800") ? "" : (stryCov_9fa48("800"), "Initialization already in progress, skipping..."));
        return;
      }
    }
    stateManager.updateServerState(stryMutAct_9fa48("801") ? {} : (stryCov_9fa48("801"), {
      scanInProgress: stryMutAct_9fa48("802") ? false : (stryCov_9fa48("802"), true)
    }));
    try {
      if (stryMutAct_9fa48("803")) {
        {}
      } else {
        stryCov_9fa48("803");
        // Initialize action icon theme
        await initializeActionIconTheme();

        // Perform initial server discovery
        const port = await findServerPort(stryMutAct_9fa48("804") ? false : (stryCov_9fa48("804"), true));
        if (stryMutAct_9fa48("807") ? port === null : stryMutAct_9fa48("806") ? false : stryMutAct_9fa48("805") ? true : (stryCov_9fa48("805", "806", "807"), port !== null)) {
          if (stryMutAct_9fa48("808")) {
            {}
          } else {
            stryCov_9fa48("808");
            log((stryMutAct_9fa48("809") ? "" : (stryCov_9fa48("809"), "Discovered server on port ")) + port);
            // Broadcast server status after discovery
            await broadcastServerStatus();
          }
        } else {
          if (stryMutAct_9fa48("810")) {
            {}
          } else {
            stryCov_9fa48("810");
            warn(stryMutAct_9fa48("811") ? "" : (stryCov_9fa48("811"), "Server port discovery failed after scanning range."));
            // Broadcast disconnected status
            await broadcastServerStatus();
          }
        }

        // Set up periodic server status checks
        setInterval(broadcastServerStatus, _serverCheckInterval);

        // Initial server status check
        await broadcastServerStatus();

        // Start status polling to feed popup UI
        if (stryMutAct_9fa48("814") ? false : stryMutAct_9fa48("813") ? true : stryMutAct_9fa48("812") ? isTestEnvironment : (stryCov_9fa48("812", "813", "814"), !isTestEnvironment)) {
          if (stryMutAct_9fa48("815")) {
            {}
          } else {
            stryCov_9fa48("815");
            setInterval(async () => {
              if (stryMutAct_9fa48("816")) {
                {}
              } else {
                stryCov_9fa48("816");
                try {
                  if (stryMutAct_9fa48("817")) {
                    {}
                  } else {
                    stryCov_9fa48("817");
                    const port = await storageService.getPort();
                    if (stryMutAct_9fa48("820") ? false : stryMutAct_9fa48("819") ? true : stryMutAct_9fa48("818") ? port : (stryCov_9fa48("818", "819", "820"), !port)) return;
                    const res = await fetch(stryMutAct_9fa48("821") ? `` : (stryCov_9fa48("821"), `http://127.0.0.1:${port}/api/status`));
                    if (stryMutAct_9fa48("824") ? false : stryMutAct_9fa48("823") ? true : stryMutAct_9fa48("822") ? res.ok : (stryCov_9fa48("822", "823", "824"), !res.ok)) return;
                    const data = await res.json();
                    const active: Record<string, any> = {};
                    Object.entries(stryMutAct_9fa48("827") ? data && {} : stryMutAct_9fa48("826") ? false : stryMutAct_9fa48("825") ? true : (stryCov_9fa48("825", "826", "827"), data || {})).forEach(([id, obj]) => {
                      if (stryMutAct_9fa48("828")) {
                        {}
                      } else {
                        stryCov_9fa48("828");
                        active[id] = obj;
                      }
                    });
                    chrome.runtime.sendMessage(stryMutAct_9fa48("829") ? {} : (stryCov_9fa48("829"), {
                      type: stryMutAct_9fa48("830") ? "" : (stryCov_9fa48("830"), "downloadStatusUpdate"),
                      data: stryMutAct_9fa48("831") ? {} : (stryCov_9fa48("831"), {
                        active,
                        queue: downloadQueue
                      })
                    }));
                  }
                } catch {
                  // ignore
                }
              }
            }, _statusPollIntervalMs);
          }
        }
      }
    } catch (err: unknown) {
      if (stryMutAct_9fa48("832")) {
        {}
      } else {
        stryCov_9fa48("832");
        error(stryMutAct_9fa48("833") ? "" : (stryCov_9fa48("833"), "Error during extension initialization:"), err);
      }
    } finally {
      if (stryMutAct_9fa48("834")) {
        {}
      } else {
        stryCov_9fa48("834");
        stateManager.updateServerState(stryMutAct_9fa48("835") ? {} : (stryCov_9fa48("835"), {
          scanInProgress: stryMutAct_9fa48("836") ? true : (stryCov_9fa48("836"), false)
        }));
      }
    }
  }
};

// Message handling for background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (stryMutAct_9fa48("837")) {
    {}
  } else {
    stryCov_9fa48("837");
    // Use an IIFE to handle async logic and always return true for async responses
    (async () => {
      if (stryMutAct_9fa48("838")) {
        {}
      } else {
        stryCov_9fa48("838");
        try {
          if (stryMutAct_9fa48("839")) {
            {}
          } else {
            stryCov_9fa48("839");
            const port = await storageService.getPort();
            switch (message.type) {
              case stryMutAct_9fa48("841") ? "" : (stryCov_9fa48("841"), "downloadVideo"):
                if (stryMutAct_9fa48("840")) {} else {
                  stryCov_9fa48("840");
                  {
                    if (stryMutAct_9fa48("842")) {
                      {}
                    } else {
                      stryCov_9fa48("842");
                      log(stryMutAct_9fa48("843") ? "" : (stryCov_9fa48("843"), "Received download request for:"), message.url);
                      // Ensure we have a server port; if not, try to discover it immediately
                      let effectivePort = port;
                      if (stryMutAct_9fa48("846") ? false : stryMutAct_9fa48("845") ? true : stryMutAct_9fa48("844") ? effectivePort : (stryCov_9fa48("844", "845", "846"), !effectivePort)) {
                        if (stryMutAct_9fa48("847")) {
                          {}
                        } else {
                          stryCov_9fa48("847");
                          try {
                            if (stryMutAct_9fa48("848")) {
                              {}
                            } else {
                              stryCov_9fa48("848");
                              effectivePort = await findServerPort(stryMutAct_9fa48("849") ? false : (stryCov_9fa48("849"), true));
                            }
                          } catch (e) {
                            // ignore and fall through to error response below
                          }
                        }
                      }

                      // If still no port, return a clear error right away
                      if (stryMutAct_9fa48("852") ? false : stryMutAct_9fa48("851") ? true : stryMutAct_9fa48("850") ? effectivePort : (stryCov_9fa48("850", "851", "852"), !effectivePort)) {
                        if (stryMutAct_9fa48("853")) {
                          {}
                        } else {
                          stryCov_9fa48("853");
                          sendResponse(stryMutAct_9fa48("854") ? {} : (stryCov_9fa48("854"), {
                            status: stryMutAct_9fa48("855") ? "" : (stryCov_9fa48("855"), "error"),
                            message: stryMutAct_9fa48("856") ? "" : (stryCov_9fa48("856"), "Server not available")
                          }));
                          break;
                        }
                      }
                      const response = await sendDownloadRequest(message.url, stryMutAct_9fa48("857") ? sender.tab.id : (stryCov_9fa48("857"), sender.tab?.id), message.isPlaylist, message.quality, message.format, message.pageTitle, message.downloadId);
                      sendResponse(response);
                      break;
                    }
                  }
                }
              case stryMutAct_9fa48("859") ? "" : (stryCov_9fa48("859"), "getQueue"):
                if (stryMutAct_9fa48("858")) {} else {
                  stryCov_9fa48("858");
                  // This logic remains untouched
                  sendResponse(stryMutAct_9fa48("860") ? {} : (stryCov_9fa48("860"), {
                    queue: downloadQueue,
                    active: activeDownloads
                  }));
                  break;
                }
              case stryMutAct_9fa48("862") ? "" : (stryCov_9fa48("862"), "clearHistory"):
                if (stryMutAct_9fa48("861")) {} else {
                  stryCov_9fa48("861");
                  {
                    if (stryMutAct_9fa48("863")) {
                      {}
                    } else {
                      stryCov_9fa48("863");
                      const result = await handleClearHistory(storageService);
                      sendResponse(result);
                      break;
                    }
                  }
                }
              case stryMutAct_9fa48("865") ? "" : (stryCov_9fa48("865"), "toggleHistory"):
                if (stryMutAct_9fa48("864")) {} else {
                  stryCov_9fa48("864");
                  {
                    if (stryMutAct_9fa48("866")) {
                      {}
                    } else {
                      stryCov_9fa48("866");
                      await toggleHistorySetting();
                      sendResponse(stryMutAct_9fa48("867") ? {} : (stryCov_9fa48("867"), {
                        status: stryMutAct_9fa48("868") ? "" : (stryCov_9fa48("868"), "success")
                      }));
                      break;
                    }
                  }
                }
              case stryMutAct_9fa48("870") ? "" : (stryCov_9fa48("870"), "getHistory"):
                if (stryMutAct_9fa48("869")) {} else {
                  stryCov_9fa48("869");
                  {
                    if (stryMutAct_9fa48("871")) {
                      {}
                    } else {
                      stryCov_9fa48("871");
                      const result = await handleGetHistory(storageService);
                      sendResponse(result);
                      break;
                    }
                  }
                }
              case stryMutAct_9fa48("873") ? "" : (stryCov_9fa48("873"), "setConfig"):
                if (stryMutAct_9fa48("872")) {} else {
                  stryCov_9fa48("872");
                  {
                    if (stryMutAct_9fa48("874")) {
                      {}
                    } else {
                      stryCov_9fa48("874");
                      // *** This is the new, refactored logic ***
                      const result = await handleSetConfig(port, message.config, apiService, storageService);
                      sendResponse(result);
                      break;
                    }
                  }
                }
              case stryMutAct_9fa48("876") ? "" : (stryCov_9fa48("876"), "getConfig"):
                if (stryMutAct_9fa48("875")) {} else {
                  stryCov_9fa48("875");
                  // Fetch server config when a port is known; otherwise return current cached state
                  if (stryMutAct_9fa48("878") ? false : stryMutAct_9fa48("877") ? true : (stryCov_9fa48("877", "878"), port)) {
                    if (stryMutAct_9fa48("879")) {
                      {}
                    } else {
                      stryCov_9fa48("879");
                      const config = await fetchServerConfig(port);
                      sendResponse(stryMutAct_9fa48("880") ? {} : (stryCov_9fa48("880"), {
                        status: stryMutAct_9fa48("881") ? "" : (stryCov_9fa48("881"), "success"),
                        data: config
                      }));
                    }
                  } else {
                    if (stryMutAct_9fa48("882")) {
                      {}
                    } else {
                      stryCov_9fa48("882");
                      const serverState = stateManager.getServerState();
                      sendResponse(stryMutAct_9fa48("883") ? {} : (stryCov_9fa48("883"), {
                        status: stryMutAct_9fa48("884") ? "" : (stryCov_9fa48("884"), "error"),
                        message: stryMutAct_9fa48("885") ? "" : (stryCov_9fa48("885"), "Server not available"),
                        data: serverState.config
                      }));
                    }
                  }
                  break;
                }
              case stryMutAct_9fa48("887") ? "" : (stryCov_9fa48("887"), "getServerStatus"):
                if (stryMutAct_9fa48("886")) {} else {
                  stryCov_9fa48("886");
                  {
                    if (stryMutAct_9fa48("888")) {
                      {}
                    } else {
                      stryCov_9fa48("888");
                      const status = await getServerStatus();
                      sendResponse(stryMutAct_9fa48("889") ? {} : (stryCov_9fa48("889"), {
                        status
                      }));
                      break;
                    }
                  }
                }
              case stryMutAct_9fa48("891") ? "" : (stryCov_9fa48("891"), "resumeDownloads"):
                if (stryMutAct_9fa48("890")) {} else {
                  stryCov_9fa48("890");
                  {
                    if (stryMutAct_9fa48("892")) {
                      {}
                    } else {
                      stryCov_9fa48("892");
                      // Trigger server-side resume operation
                      if (stryMutAct_9fa48("894") ? false : stryMutAct_9fa48("893") ? true : (stryCov_9fa48("893", "894"), port)) {
                        if (stryMutAct_9fa48("895")) {
                          {}
                        } else {
                          stryCov_9fa48("895");
                          try {
                            if (stryMutAct_9fa48("896")) {
                              {}
                            } else {
                              stryCov_9fa48("896");
                              const res = await fetch((stryMutAct_9fa48("897") ? "" : (stryCov_9fa48("897"), "http://127.0.0.1:")) + port + (stryMutAct_9fa48("898") ? "" : (stryCov_9fa48("898"), "/api/resume")), stryMutAct_9fa48("899") ? {} : (stryCov_9fa48("899"), {
                                method: stryMutAct_9fa48("900") ? "" : (stryCov_9fa48("900"), "POST"),
                                headers: stryMutAct_9fa48("901") ? {} : (stryCov_9fa48("901"), {
                                  "Content-Type": stryMutAct_9fa48("902") ? "" : (stryCov_9fa48("902"), "application/json")
                                }),
                                // Optional payload; server will validate
                                body: JSON.stringify({})
                              }));
                              const json = await res.json();
                              sendResponse(json);
                            }
                          } catch (e) {
                            if (stryMutAct_9fa48("903")) {
                              {}
                            } else {
                              stryCov_9fa48("903");
                              sendResponse(stryMutAct_9fa48("904") ? {} : (stryCov_9fa48("904"), {
                                status: stryMutAct_9fa48("905") ? "" : (stryCov_9fa48("905"), "error"),
                                message: (e as Error).message
                              }));
                            }
                          }
                        }
                      } else {
                        if (stryMutAct_9fa48("906")) {
                          {}
                        } else {
                          stryCov_9fa48("906");
                          sendResponse(stryMutAct_9fa48("907") ? {} : (stryCov_9fa48("907"), {
                            status: stryMutAct_9fa48("908") ? "" : (stryCov_9fa48("908"), "error"),
                            message: stryMutAct_9fa48("909") ? "" : (stryCov_9fa48("909"), "Server not available")
                          }));
                        }
                      }
                      break;
                    }
                  }
                }
              case stryMutAct_9fa48("911") ? "" : (stryCov_9fa48("911"), "setPriority"):
                if (stryMutAct_9fa48("910")) {} else {
                  stryCov_9fa48("910");
                  {
                    if (stryMutAct_9fa48("912")) {
                      {}
                    } else {
                      stryCov_9fa48("912");
                      // Adjust OS priority (nice value) for a download process
                      const downloadId: string | undefined = message.downloadId;
                      const priority: number | undefined = message.priority;
                      if (stryMutAct_9fa48("915") ? !downloadId && typeof priority !== "number" : stryMutAct_9fa48("914") ? false : stryMutAct_9fa48("913") ? true : (stryCov_9fa48("913", "914", "915"), (stryMutAct_9fa48("916") ? downloadId : (stryCov_9fa48("916"), !downloadId)) || (stryMutAct_9fa48("918") ? typeof priority === "number" : stryMutAct_9fa48("917") ? false : (stryCov_9fa48("917", "918"), typeof priority !== (stryMutAct_9fa48("919") ? "" : (stryCov_9fa48("919"), "number")))))) {
                        if (stryMutAct_9fa48("920")) {
                          {}
                        } else {
                          stryCov_9fa48("920");
                          sendResponse(stryMutAct_9fa48("921") ? {} : (stryCov_9fa48("921"), {
                            status: stryMutAct_9fa48("922") ? "" : (stryCov_9fa48("922"), "error"),
                            message: stryMutAct_9fa48("923") ? "" : (stryCov_9fa48("923"), "Missing downloadId or priority")
                          }));
                          break;
                        }
                      }
                      if (stryMutAct_9fa48("925") ? false : stryMutAct_9fa48("924") ? true : (stryCov_9fa48("924", "925"), port)) {
                        if (stryMutAct_9fa48("926")) {
                          {}
                        } else {
                          stryCov_9fa48("926");
                          try {
                            if (stryMutAct_9fa48("927")) {
                              {}
                            } else {
                              stryCov_9fa48("927");
                              const res = await fetch(stryMutAct_9fa48("928") ? `` : (stryCov_9fa48("928"), `http://127.0.0.1:${port}/api/download/${downloadId}/priority`), stryMutAct_9fa48("929") ? {} : (stryCov_9fa48("929"), {
                                method: stryMutAct_9fa48("930") ? "" : (stryCov_9fa48("930"), "POST"),
                                headers: stryMutAct_9fa48("931") ? {} : (stryCov_9fa48("931"), {
                                  "Content-Type": stryMutAct_9fa48("932") ? "" : (stryCov_9fa48("932"), "application/json")
                                }),
                                body: JSON.stringify(stryMutAct_9fa48("933") ? {} : (stryCov_9fa48("933"), {
                                  priority
                                }))
                              }));
                              const json = await res.json();
                              sendResponse(json);
                            }
                          } catch (e) {
                            if (stryMutAct_9fa48("934")) {
                              {}
                            } else {
                              stryCov_9fa48("934");
                              sendResponse(stryMutAct_9fa48("935") ? {} : (stryCov_9fa48("935"), {
                                status: stryMutAct_9fa48("936") ? "" : (stryCov_9fa48("936"), "error"),
                                message: (e as Error).message
                              }));
                            }
                          }
                        }
                      } else {
                        if (stryMutAct_9fa48("937")) {
                          {}
                        } else {
                          stryCov_9fa48("937");
                          sendResponse(stryMutAct_9fa48("938") ? {} : (stryCov_9fa48("938"), {
                            status: stryMutAct_9fa48("939") ? "" : (stryCov_9fa48("939"), "error"),
                            message: stryMutAct_9fa48("940") ? "" : (stryCov_9fa48("940"), "Server not available")
                          }));
                        }
                      }
                      break;
                    }
                  }
                }
              case stryMutAct_9fa48("942") ? "" : (stryCov_9fa48("942"), "galleryDownload"):
                if (stryMutAct_9fa48("941")) {} else {
                  stryCov_9fa48("941");
                  {
                    if (stryMutAct_9fa48("943")) {
                      {}
                    } else {
                      stryCov_9fa48("943");
                      const url: string | undefined = message.url;
                      if (stryMutAct_9fa48("946") ? false : stryMutAct_9fa48("945") ? true : stryMutAct_9fa48("944") ? url : (stryCov_9fa48("944", "945", "946"), !url)) {
                        if (stryMutAct_9fa48("947")) {
                          {}
                        } else {
                          stryCov_9fa48("947");
                          sendResponse(stryMutAct_9fa48("948") ? {} : (stryCov_9fa48("948"), {
                            status: stryMutAct_9fa48("949") ? "" : (stryCov_9fa48("949"), "error"),
                            message: stryMutAct_9fa48("950") ? "" : (stryCov_9fa48("950"), "Missing url")
                          }));
                          break;
                        }
                      }
                      if (stryMutAct_9fa48("952") ? false : stryMutAct_9fa48("951") ? true : (stryCov_9fa48("951", "952"), port)) {
                        if (stryMutAct_9fa48("953")) {
                          {}
                        } else {
                          stryCov_9fa48("953");
                          try {
                            if (stryMutAct_9fa48("954")) {
                              {}
                            } else {
                              stryCov_9fa48("954");
                              const res = await fetch(stryMutAct_9fa48("955") ? `` : (stryCov_9fa48("955"), `http://127.0.0.1:${port}/api/gallery-dl`), stryMutAct_9fa48("956") ? {} : (stryCov_9fa48("956"), {
                                method: stryMutAct_9fa48("957") ? "" : (stryCov_9fa48("957"), "POST"),
                                headers: stryMutAct_9fa48("958") ? {} : (stryCov_9fa48("958"), {
                                  "Content-Type": stryMutAct_9fa48("959") ? "" : (stryCov_9fa48("959"), "application/json")
                                }),
                                body: JSON.stringify(stryMutAct_9fa48("960") ? {} : (stryCov_9fa48("960"), {
                                  url
                                }))
                              }));
                              const json = await res.json();
                              sendResponse(json);
                            }
                          } catch (e) {
                            if (stryMutAct_9fa48("961")) {
                              {}
                            } else {
                              stryCov_9fa48("961");
                              sendResponse(stryMutAct_9fa48("962") ? {} : (stryCov_9fa48("962"), {
                                status: stryMutAct_9fa48("963") ? "" : (stryCov_9fa48("963"), "error"),
                                message: (e as Error).message
                              }));
                            }
                          }
                        }
                      } else {
                        if (stryMutAct_9fa48("964")) {
                          {}
                        } else {
                          stryCov_9fa48("964");
                          sendResponse(stryMutAct_9fa48("965") ? {} : (stryCov_9fa48("965"), {
                            status: stryMutAct_9fa48("966") ? "" : (stryCov_9fa48("966"), "error"),
                            message: stryMutAct_9fa48("967") ? "" : (stryCov_9fa48("967"), "Server not available")
                          }));
                        }
                      }
                      break;
                    }
                  }
                }
              case stryMutAct_9fa48("969") ? "" : (stryCov_9fa48("969"), "restartServer"):
                if (stryMutAct_9fa48("968")) {} else {
                  stryCov_9fa48("968");
                  // Request server restart via API and trigger port rediscovery
                  log(stryMutAct_9fa48("970") ? "" : (stryCov_9fa48("970"), "Received restart request"));
                  if (stryMutAct_9fa48("972") ? false : stryMutAct_9fa48("971") ? true : (stryCov_9fa48("971", "972"), port)) {
                    if (stryMutAct_9fa48("973")) {
                      {}
                    } else {
                      stryCov_9fa48("973");
                      try {
                        if (stryMutAct_9fa48("974")) {
                          {}
                        } else {
                          stryCov_9fa48("974");
                          const base = (stryMutAct_9fa48("975") ? "" : (stryCov_9fa48("975"), "http://127.0.0.1:")) + port;
                          let ok = stryMutAct_9fa48("976") ? true : (stryCov_9fa48("976"), false);
                          let lastStatus: number | null = null;
                          const restartCandidates = stryMutAct_9fa48("977") ? [] : (stryCov_9fa48("977"), [base + (stryMutAct_9fa48("978") ? "" : (stryCov_9fa48("978"), "/api/restart")), base + (stryMutAct_9fa48("979") ? "" : (stryCov_9fa48("979"), "/restart"))]);
                          const managedCandidates = stryMutAct_9fa48("980") ? [] : (stryCov_9fa48("980"), [base + (stryMutAct_9fa48("981") ? "" : (stryCov_9fa48("981"), "/api/restart/managed")), base + (stryMutAct_9fa48("982") ? "" : (stryCov_9fa48("982"), "/restart/managed"))]);
                          // Try dev restart endpoints first
                          for (const url of restartCandidates) {
                            if (stryMutAct_9fa48("983")) {
                              {}
                            } else {
                              stryCov_9fa48("983");
                              try {
                                if (stryMutAct_9fa48("984")) {
                                  {}
                                } else {
                                  stryCov_9fa48("984");
                                  const r = await fetch(url, stryMutAct_9fa48("985") ? {} : (stryCov_9fa48("985"), {
                                    method: stryMutAct_9fa48("986") ? "" : (stryCov_9fa48("986"), "POST")
                                  }));
                                  lastStatus = r.status;
                                  if (stryMutAct_9fa48("988") ? false : stryMutAct_9fa48("987") ? true : (stryCov_9fa48("987", "988"), r.ok)) {
                                    if (stryMutAct_9fa48("989")) {
                                      {}
                                    } else {
                                      stryCov_9fa48("989");
                                      ok = stryMutAct_9fa48("990") ? false : (stryCov_9fa48("990"), true);
                                      break;
                                    }
                                  }
                                }
                              } catch {
                                // continue to next candidate
                              }
                            }
                          }
                          // Fallback to managed restart endpoints
                          if (stryMutAct_9fa48("993") ? false : stryMutAct_9fa48("992") ? true : stryMutAct_9fa48("991") ? ok : (stryCov_9fa48("991", "992", "993"), !ok)) {
                            if (stryMutAct_9fa48("994")) {
                              {}
                            } else {
                              stryCov_9fa48("994");
                              for (const url of managedCandidates) {
                                if (stryMutAct_9fa48("995")) {
                                  {}
                                } else {
                                  stryCov_9fa48("995");
                                  try {
                                    if (stryMutAct_9fa48("996")) {
                                      {}
                                    } else {
                                      stryCov_9fa48("996");
                                      const r = await fetch(url, stryMutAct_9fa48("997") ? {} : (stryCov_9fa48("997"), {
                                        method: stryMutAct_9fa48("998") ? "" : (stryCov_9fa48("998"), "POST")
                                      }));
                                      lastStatus = r.status;
                                      if (stryMutAct_9fa48("1000") ? false : stryMutAct_9fa48("999") ? true : (stryCov_9fa48("999", "1000"), r.ok)) {
                                        if (stryMutAct_9fa48("1001")) {
                                          {}
                                        } else {
                                          stryCov_9fa48("1001");
                                          ok = stryMutAct_9fa48("1002") ? false : (stryCov_9fa48("1002"), true);
                                          break;
                                        }
                                      }
                                    }
                                  } catch {
                                    // continue to next candidate
                                  }
                                }
                              }
                            }
                          }
                          if (stryMutAct_9fa48("1004") ? false : stryMutAct_9fa48("1003") ? true : (stryCov_9fa48("1003", "1004"), ok)) {
                            if (stryMutAct_9fa48("1005")) {
                              {}
                            } else {
                              stryCov_9fa48("1005");
                              sendResponse(stryMutAct_9fa48("1006") ? {} : (stryCov_9fa48("1006"), {
                                status: stryMutAct_9fa48("1007") ? "" : (stryCov_9fa48("1007"), "success")
                              }));
                              if (stryMutAct_9fa48("1010") ? false : stryMutAct_9fa48("1009") ? true : stryMutAct_9fa48("1008") ? isTestEnvironment : (stryCov_9fa48("1008", "1009", "1010"), !isTestEnvironment)) {
                                if (stryMutAct_9fa48("1011")) {
                                  {}
                                } else {
                                  stryCov_9fa48("1011");
                                  setTimeout(stryMutAct_9fa48("1012") ? () => undefined : (stryCov_9fa48("1012"), () => findServerPort(stryMutAct_9fa48("1013") ? false : (stryCov_9fa48("1013"), true))), 2000);
                                }
                              }
                            }
                          } else {
                            if (stryMutAct_9fa48("1014")) {
                              {}
                            } else {
                              stryCov_9fa48("1014");
                              sendResponse(stryMutAct_9fa48("1015") ? {} : (stryCov_9fa48("1015"), {
                                status: stryMutAct_9fa48("1016") ? "" : (stryCov_9fa48("1016"), "error"),
                                message: (stryMutAct_9fa48("1017") ? "" : (stryCov_9fa48("1017"), "Server returned status ")) + (stryMutAct_9fa48("1018") ? lastStatus && "network error" : (stryCov_9fa48("1018"), lastStatus ?? (stryMutAct_9fa48("1019") ? "" : (stryCov_9fa48("1019"), "network error"))))
                              }));
                            }
                          }
                        }
                      } catch (e) {
                        if (stryMutAct_9fa48("1020")) {
                          {}
                        } else {
                          stryCov_9fa48("1020");
                          sendResponse(stryMutAct_9fa48("1021") ? {} : (stryCov_9fa48("1021"), {
                            status: stryMutAct_9fa48("1022") ? "" : (stryCov_9fa48("1022"), "error"),
                            message: (e as Error).message
                          }));
                        }
                      }
                    }
                  } else {
                    if (stryMutAct_9fa48("1023")) {
                      {}
                    } else {
                      stryCov_9fa48("1023");
                      sendResponse(stryMutAct_9fa48("1024") ? {} : (stryCov_9fa48("1024"), {
                        status: stryMutAct_9fa48("1025") ? "" : (stryCov_9fa48("1025"), "error"),
                        message: stryMutAct_9fa48("1026") ? "" : (stryCov_9fa48("1026"), "Server not found")
                      }));
                    }
                  }
                  break;
                }
              case stryMutAct_9fa48("1028") ? "" : (stryCov_9fa48("1028"), "pauseDownload"):
                if (stryMutAct_9fa48("1027")) {} else {
                  stryCov_9fa48("1027");
                  {
                    if (stryMutAct_9fa48("1029")) {
                      {}
                    } else {
                      stryCov_9fa48("1029");
                      if (stryMutAct_9fa48("1031") ? false : stryMutAct_9fa48("1030") ? true : (stryCov_9fa48("1030", "1031"), port)) {
                        if (stryMutAct_9fa48("1032")) {
                          {}
                        } else {
                          stryCov_9fa48("1032");
                          try {
                            if (stryMutAct_9fa48("1033")) {
                              {}
                            } else {
                              stryCov_9fa48("1033");
                              const res = await fetch((stryMutAct_9fa48("1034") ? "" : (stryCov_9fa48("1034"), "http://127.0.0.1:")) + port + (stryMutAct_9fa48("1035") ? "" : (stryCov_9fa48("1035"), "/api/download/")) + message.downloadId + (stryMutAct_9fa48("1036") ? "" : (stryCov_9fa48("1036"), "/pause")), stryMutAct_9fa48("1037") ? {} : (stryCov_9fa48("1037"), {
                                method: stryMutAct_9fa48("1038") ? "" : (stryCov_9fa48("1038"), "POST")
                              }));
                              const json = await res.json();
                              sendResponse(json);
                            }
                          } catch (e) {
                            if (stryMutAct_9fa48("1039")) {
                              {}
                            } else {
                              stryCov_9fa48("1039");
                              sendResponse(stryMutAct_9fa48("1040") ? {} : (stryCov_9fa48("1040"), {
                                status: stryMutAct_9fa48("1041") ? "" : (stryCov_9fa48("1041"), "error"),
                                message: (e as Error).message
                              }));
                            }
                          }
                        }
                      } else {
                        if (stryMutAct_9fa48("1042")) {
                          {}
                        } else {
                          stryCov_9fa48("1042");
                          sendResponse(stryMutAct_9fa48("1043") ? {} : (stryCov_9fa48("1043"), {
                            status: stryMutAct_9fa48("1044") ? "" : (stryCov_9fa48("1044"), "error"),
                            message: stryMutAct_9fa48("1045") ? "" : (stryCov_9fa48("1045"), "Server not available")
                          }));
                        }
                      }
                      break;
                    }
                  }
                }
              case stryMutAct_9fa48("1047") ? "" : (stryCov_9fa48("1047"), "getLogs"):
                if (stryMutAct_9fa48("1046")) {} else {
                  stryCov_9fa48("1046");
                  {
                    if (stryMutAct_9fa48("1048")) {
                      {}
                    } else {
                      stryCov_9fa48("1048");
                      if (stryMutAct_9fa48("1051") ? false : stryMutAct_9fa48("1050") ? true : stryMutAct_9fa48("1049") ? port : (stryCov_9fa48("1049", "1050", "1051"), !port)) {
                        if (stryMutAct_9fa48("1052")) {
                          {}
                        } else {
                          stryCov_9fa48("1052");
                          sendResponse(stryMutAct_9fa48("1053") ? {} : (stryCov_9fa48("1053"), {
                            status: stryMutAct_9fa48("1054") ? "" : (stryCov_9fa48("1054"), "error"),
                            message: stryMutAct_9fa48("1055") ? "" : (stryCov_9fa48("1055"), "Server not available")
                          }));
                          break;
                        }
                      }
                      try {
                        if (stryMutAct_9fa48("1056")) {
                          {}
                        } else {
                          stryCov_9fa48("1056");
                          const params = new URLSearchParams();
                          if (stryMutAct_9fa48("1059") ? typeof message.lines === "number" || message.lines >= 0 : stryMutAct_9fa48("1058") ? false : stryMutAct_9fa48("1057") ? true : (stryCov_9fa48("1057", "1058", "1059"), (stryMutAct_9fa48("1061") ? typeof message.lines !== "number" : stryMutAct_9fa48("1060") ? true : (stryCov_9fa48("1060", "1061"), typeof message.lines === (stryMutAct_9fa48("1062") ? "" : (stryCov_9fa48("1062"), "number")))) && (stryMutAct_9fa48("1065") ? message.lines < 0 : stryMutAct_9fa48("1064") ? message.lines > 0 : stryMutAct_9fa48("1063") ? true : (stryCov_9fa48("1063", "1064", "1065"), message.lines >= 0)))) params.set(stryMutAct_9fa48("1066") ? "" : (stryCov_9fa48("1066"), "lines"), String(message.lines));
                          if (stryMutAct_9fa48("1069") ? typeof message.recent !== "boolean" : stryMutAct_9fa48("1068") ? false : stryMutAct_9fa48("1067") ? true : (stryCov_9fa48("1067", "1068", "1069"), typeof message.recent === (stryMutAct_9fa48("1070") ? "" : (stryCov_9fa48("1070"), "boolean")))) params.set(stryMutAct_9fa48("1071") ? "" : (stryCov_9fa48("1071"), "recent"), message.recent ? stryMutAct_9fa48("1072") ? "" : (stryCov_9fa48("1072"), "true") : stryMutAct_9fa48("1073") ? "" : (stryCov_9fa48("1073"), "false"));
                          const qs = params.toString() ? stryMutAct_9fa48("1074") ? `` : (stryCov_9fa48("1074"), `?${params.toString()}`) : stryMutAct_9fa48("1075") ? "Stryker was here!" : (stryCov_9fa48("1075"), "");
                          const candidates = stryMutAct_9fa48("1076") ? [] : (stryCov_9fa48("1076"), [// Preferred new paths under /api
                          stryMutAct_9fa48("1077") ? `` : (stryCov_9fa48("1077"), `http://127.0.0.1:${port}/api/logs${qs}`), stryMutAct_9fa48("1078") ? `` : (stryCov_9fa48("1078"), `http://localhost:${port}/api/logs${qs}`), // Backward-compatible paths without /api
                          stryMutAct_9fa48("1079") ? `` : (stryCov_9fa48("1079"), `http://127.0.0.1:${port}/logs${qs}`), stryMutAct_9fa48("1080") ? `` : (stryCov_9fa48("1080"), `http://localhost:${port}/logs${qs}`)]);
                          let text: string | null = null;
                          let lastStatus: number | null = null;
                          for (const url of candidates) {
                            if (stryMutAct_9fa48("1081")) {
                              {}
                            } else {
                              stryCov_9fa48("1081");
                              try {
                                if (stryMutAct_9fa48("1082")) {
                                  {}
                                } else {
                                  stryCov_9fa48("1082");
                                  const r = await fetch(url);
                                  lastStatus = r.status;
                                  if (stryMutAct_9fa48("1084") ? false : stryMutAct_9fa48("1083") ? true : (stryCov_9fa48("1083", "1084"), r.ok)) {
                                    if (stryMutAct_9fa48("1085")) {
                                      {}
                                    } else {
                                      stryCov_9fa48("1085");
                                      text = await r.text();
                                      break;
                                    }
                                  }
                                }
                              } catch {
                                // try next
                              }
                            }
                          }
                          if (stryMutAct_9fa48("1088") ? text !== null : stryMutAct_9fa48("1087") ? false : stryMutAct_9fa48("1086") ? true : (stryCov_9fa48("1086", "1087", "1088"), text === null)) {
                            if (stryMutAct_9fa48("1089")) {
                              {}
                            } else {
                              stryCov_9fa48("1089");
                              sendResponse(stryMutAct_9fa48("1090") ? {} : (stryCov_9fa48("1090"), {
                                status: stryMutAct_9fa48("1091") ? "" : (stryCov_9fa48("1091"), "error"),
                                message: (stryMutAct_9fa48("1092") ? "" : (stryCov_9fa48("1092"), "Failed to fetch logs: ")) + (stryMutAct_9fa48("1093") ? lastStatus && "network error" : (stryCov_9fa48("1093"), lastStatus ?? (stryMutAct_9fa48("1094") ? "" : (stryCov_9fa48("1094"), "network error"))))
                              }));
                              break;
                            }
                          }
                          sendResponse(stryMutAct_9fa48("1095") ? {} : (stryCov_9fa48("1095"), {
                            status: stryMutAct_9fa48("1096") ? "" : (stryCov_9fa48("1096"), "success"),
                            data: text
                          }));
                        }
                      } catch (e) {
                        if (stryMutAct_9fa48("1097")) {
                          {}
                        } else {
                          stryCov_9fa48("1097");
                          sendResponse(stryMutAct_9fa48("1098") ? {} : (stryCov_9fa48("1098"), {
                            status: stryMutAct_9fa48("1099") ? "" : (stryCov_9fa48("1099"), "error"),
                            message: (e as Error).message
                          }));
                        }
                      }
                      break;
                    }
                  }
                }
              case stryMutAct_9fa48("1101") ? "" : (stryCov_9fa48("1101"), "clearLogs"):
                if (stryMutAct_9fa48("1100")) {} else {
                  stryCov_9fa48("1100");
                  {
                    if (stryMutAct_9fa48("1102")) {
                      {}
                    } else {
                      stryCov_9fa48("1102");
                      if (stryMutAct_9fa48("1105") ? false : stryMutAct_9fa48("1104") ? true : stryMutAct_9fa48("1103") ? port : (stryCov_9fa48("1103", "1104", "1105"), !port)) {
                        if (stryMutAct_9fa48("1106")) {
                          {}
                        } else {
                          stryCov_9fa48("1106");
                          sendResponse(stryMutAct_9fa48("1107") ? {} : (stryCov_9fa48("1107"), {
                            status: stryMutAct_9fa48("1108") ? "" : (stryCov_9fa48("1108"), "error"),
                            message: stryMutAct_9fa48("1109") ? "" : (stryCov_9fa48("1109"), "Server not available")
                          }));
                          break;
                        }
                      }
                      try {
                        if (stryMutAct_9fa48("1110")) {
                          {}
                        } else {
                          stryCov_9fa48("1110");
                          const candidates = stryMutAct_9fa48("1111") ? [] : (stryCov_9fa48("1111"), [// Preferred new paths under /api
                          stryMutAct_9fa48("1112") ? `` : (stryCov_9fa48("1112"), `http://127.0.0.1:${port}/api/logs/clear`), stryMutAct_9fa48("1113") ? `` : (stryCov_9fa48("1113"), `http://localhost:${port}/api/logs/clear`), // Backward-compatible paths without /api
                          stryMutAct_9fa48("1114") ? `` : (stryCov_9fa48("1114"), `http://127.0.0.1:${port}/logs/clear`), stryMutAct_9fa48("1115") ? `` : (stryCov_9fa48("1115"), `http://localhost:${port}/logs/clear`)]);
                          let ok = stryMutAct_9fa48("1116") ? true : (stryCov_9fa48("1116"), false);
                          let lastStatus: number | null = null;
                          for (const url of candidates) {
                            if (stryMutAct_9fa48("1117")) {
                              {}
                            } else {
                              stryCov_9fa48("1117");
                              try {
                                if (stryMutAct_9fa48("1118")) {
                                  {}
                                } else {
                                  stryCov_9fa48("1118");
                                  const r = await fetch(url, stryMutAct_9fa48("1119") ? {} : (stryCov_9fa48("1119"), {
                                    method: stryMutAct_9fa48("1120") ? "" : (stryCov_9fa48("1120"), "POST")
                                  }));
                                  lastStatus = r.status;
                                  if (stryMutAct_9fa48("1122") ? false : stryMutAct_9fa48("1121") ? true : (stryCov_9fa48("1121", "1122"), r.ok)) {
                                    if (stryMutAct_9fa48("1123")) {
                                      {}
                                    } else {
                                      stryCov_9fa48("1123");
                                      ok = stryMutAct_9fa48("1124") ? false : (stryCov_9fa48("1124"), true);
                                      break;
                                    }
                                  }
                                }
                              } catch {
                                // try next
                              }
                            }
                          }
                          if (stryMutAct_9fa48("1127") ? false : stryMutAct_9fa48("1126") ? true : stryMutAct_9fa48("1125") ? ok : (stryCov_9fa48("1125", "1126", "1127"), !ok)) {
                            if (stryMutAct_9fa48("1128")) {
                              {}
                            } else {
                              stryCov_9fa48("1128");
                              sendResponse(stryMutAct_9fa48("1129") ? {} : (stryCov_9fa48("1129"), {
                                status: stryMutAct_9fa48("1130") ? "" : (stryCov_9fa48("1130"), "error"),
                                message: (stryMutAct_9fa48("1131") ? "" : (stryCov_9fa48("1131"), "Failed to clear logs: ")) + (stryMutAct_9fa48("1132") ? lastStatus && "network error" : (stryCov_9fa48("1132"), lastStatus ?? (stryMutAct_9fa48("1133") ? "" : (stryCov_9fa48("1133"), "network error"))))
                              }));
                              break;
                            }
                          }
                          sendResponse(stryMutAct_9fa48("1134") ? {} : (stryCov_9fa48("1134"), {
                            status: stryMutAct_9fa48("1135") ? "" : (stryCov_9fa48("1135"), "success")
                          }));
                        }
                      } catch (e) {
                        if (stryMutAct_9fa48("1136")) {
                          {}
                        } else {
                          stryCov_9fa48("1136");
                          sendResponse(stryMutAct_9fa48("1137") ? {} : (stryCov_9fa48("1137"), {
                            status: stryMutAct_9fa48("1138") ? "" : (stryCov_9fa48("1138"), "error"),
                            message: (e as Error).message
                          }));
                        }
                      }
                      break;
                    }
                  }
                }
              case stryMutAct_9fa48("1140") ? "" : (stryCov_9fa48("1140"), "resumeDownload"):
                if (stryMutAct_9fa48("1139")) {} else {
                  stryCov_9fa48("1139");
                  {
                    if (stryMutAct_9fa48("1141")) {
                      {}
                    } else {
                      stryCov_9fa48("1141");
                      if (stryMutAct_9fa48("1143") ? false : stryMutAct_9fa48("1142") ? true : (stryCov_9fa48("1142", "1143"), port)) {
                        if (stryMutAct_9fa48("1144")) {
                          {}
                        } else {
                          stryCov_9fa48("1144");
                          try {
                            if (stryMutAct_9fa48("1145")) {
                              {}
                            } else {
                              stryCov_9fa48("1145");
                              const res = await fetch((stryMutAct_9fa48("1146") ? "" : (stryCov_9fa48("1146"), "http://127.0.0.1:")) + port + (stryMutAct_9fa48("1147") ? "" : (stryCov_9fa48("1147"), "/api/download/")) + message.downloadId + (stryMutAct_9fa48("1148") ? "" : (stryCov_9fa48("1148"), "/resume")), stryMutAct_9fa48("1149") ? {} : (stryCov_9fa48("1149"), {
                                method: stryMutAct_9fa48("1150") ? "" : (stryCov_9fa48("1150"), "POST")
                              }));
                              const json = await res.json();
                              sendResponse(json);
                            }
                          } catch (e) {
                            if (stryMutAct_9fa48("1151")) {
                              {}
                            } else {
                              stryCov_9fa48("1151");
                              sendResponse(stryMutAct_9fa48("1152") ? {} : (stryCov_9fa48("1152"), {
                                status: stryMutAct_9fa48("1153") ? "" : (stryCov_9fa48("1153"), "error"),
                                message: (e as Error).message
                              }));
                            }
                          }
                        }
                      } else {
                        if (stryMutAct_9fa48("1154")) {
                          {}
                        } else {
                          stryCov_9fa48("1154");
                          sendResponse(stryMutAct_9fa48("1155") ? {} : (stryCov_9fa48("1155"), {
                            status: stryMutAct_9fa48("1156") ? "" : (stryCov_9fa48("1156"), "error"),
                            message: stryMutAct_9fa48("1157") ? "" : (stryCov_9fa48("1157"), "Server not available")
                          }));
                        }
                      }
                      break;
                    }
                  }
                }
              case stryMutAct_9fa48("1159") ? "" : (stryCov_9fa48("1159"), "cancelDownload"):
                if (stryMutAct_9fa48("1158")) {} else {
                  stryCov_9fa48("1158");
                  {
                    if (stryMutAct_9fa48("1160")) {
                      {}
                    } else {
                      stryCov_9fa48("1160");
                      if (stryMutAct_9fa48("1162") ? false : stryMutAct_9fa48("1161") ? true : (stryCov_9fa48("1161", "1162"), port)) {
                        if (stryMutAct_9fa48("1163")) {
                          {}
                        } else {
                          stryCov_9fa48("1163");
                          try {
                            if (stryMutAct_9fa48("1164")) {
                              {}
                            } else {
                              stryCov_9fa48("1164");
                              const res = await fetch((stryMutAct_9fa48("1165") ? "" : (stryCov_9fa48("1165"), "http://127.0.0.1:")) + port + (stryMutAct_9fa48("1166") ? "" : (stryCov_9fa48("1166"), "/api/download/")) + message.downloadId + (stryMutAct_9fa48("1167") ? "" : (stryCov_9fa48("1167"), "/cancel")), stryMutAct_9fa48("1168") ? {} : (stryCov_9fa48("1168"), {
                                method: stryMutAct_9fa48("1169") ? "" : (stryCov_9fa48("1169"), "POST")
                              }));
                              const json = await res.json();
                              sendResponse(json);
                            }
                          } catch (e) {
                            if (stryMutAct_9fa48("1170")) {
                              {}
                            } else {
                              stryCov_9fa48("1170");
                              sendResponse(stryMutAct_9fa48("1171") ? {} : (stryCov_9fa48("1171"), {
                                status: stryMutAct_9fa48("1172") ? "" : (stryCov_9fa48("1172"), "error"),
                                message: (e as Error).message
                              }));
                            }
                          }
                        }
                      } else {
                        if (stryMutAct_9fa48("1173")) {
                          {}
                        } else {
                          stryCov_9fa48("1173");
                          sendResponse(stryMutAct_9fa48("1174") ? {} : (stryCov_9fa48("1174"), {
                            status: stryMutAct_9fa48("1175") ? "" : (stryCov_9fa48("1175"), "error"),
                            message: stryMutAct_9fa48("1176") ? "" : (stryCov_9fa48("1176"), "Server not available")
                          }));
                        }
                      }
                      break;
                    }
                  }
                }
              case stryMutAct_9fa48("1178") ? "" : (stryCov_9fa48("1178"), "reorderQueue"):
                if (stryMutAct_9fa48("1177")) {} else {
                  stryCov_9fa48("1177");
                  {
                    if (stryMutAct_9fa48("1179")) {
                      {}
                    } else {
                      stryCov_9fa48("1179");
                      // Update the download queue order and refresh UI
                      downloadQueue = message.queue;
                      updateQueueUI();
                      sendResponse(stryMutAct_9fa48("1180") ? {} : (stryCov_9fa48("1180"), {
                        status: stryMutAct_9fa48("1181") ? "" : (stryCov_9fa48("1181"), "success")
                      }));
                      break;
                    }
                  }
                }
              default:
                if (stryMutAct_9fa48("1182")) {} else {
                  stryCov_9fa48("1182");
                  warn(stryMutAct_9fa48("1183") ? "" : (stryCov_9fa48("1183"), "Received unknown message type:"), message.type);
                  sendResponse(stryMutAct_9fa48("1184") ? {} : (stryCov_9fa48("1184"), {
                    status: stryMutAct_9fa48("1185") ? "" : (stryCov_9fa48("1185"), "error"),
                    message: stryMutAct_9fa48("1186") ? "" : (stryCov_9fa48("1186"), "Unknown message type")
                  }));
                  break;
                }
            }
          }
        } catch (e) {
          if (stryMutAct_9fa48("1187")) {
            {}
          } else {
            stryCov_9fa48("1187");
            const errorMessage = e instanceof Error ? e.message : stryMutAct_9fa48("1188") ? "" : (stryCov_9fa48("1188"), "An unknown error occurred");
            error((stryMutAct_9fa48("1189") ? "" : (stryCov_9fa48("1189"), "Error processing message ")) + message.type + (stryMutAct_9fa48("1190") ? "" : (stryCov_9fa48("1190"), ":")), errorMessage);
            sendResponse(stryMutAct_9fa48("1191") ? {} : (stryCov_9fa48("1191"), {
              status: stryMutAct_9fa48("1192") ? "" : (stryCov_9fa48("1192"), "error"),
              message: errorMessage
            }));
          }
        }
      }
    })();

    // Return true to indicate that sendResponse will be called asynchronously
    return stryMutAct_9fa48("1193") ? false : (stryCov_9fa48("1193"), true);
  }
});
if (stryMutAct_9fa48("1196") ? false : stryMutAct_9fa48("1195") ? true : stryMutAct_9fa48("1194") ? isTestEnvironment : (stryCov_9fa48("1194", "1195", "1196"), !isTestEnvironment)) {
  if (stryMutAct_9fa48("1197")) {
    {}
  } else {
    stryCov_9fa48("1197");
    // Set up initialization on service worker lifecycle events
    chrome.runtime.onInstalled.addListener(() => {
      if (stryMutAct_9fa48("1198")) {
        {}
      } else {
        stryCov_9fa48("1198");
        initializeExtension();
      }
    });
    chrome.runtime.onStartup.addListener(() => {
      if (stryMutAct_9fa48("1199")) {
        {}
      } else {
        stryCov_9fa48("1199");
        initializeExtension();
      }
    });
  }
}

// Export functions for testing
export { sendDownloadRequest, initializeActionIconTheme, findServerPort, checkServerStatus, fetchServerConfig, log, warn, error, debounce, applyThemeToActionIcon, actionIconPaths, resetServerState, expectedAppName };

/**
 * Persist the download queue to storage
 */
export const persistQueue = async (): Promise<void> => {
  if (stryMutAct_9fa48("1200")) {
    {}
  } else {
    stryCov_9fa48("1200");
    try {
      if (stryMutAct_9fa48("1201")) {
        {}
      } else {
        stryCov_9fa48("1201");
        await chrome.storage.local.set(stryMutAct_9fa48("1202") ? {} : (stryCov_9fa48("1202"), {
          [_queueStorageKey]: downloadQueue
        }));
      }
    } catch (e) {
      if (stryMutAct_9fa48("1203")) {
        {}
      } else {
        stryCov_9fa48("1203");
        warn(stryMutAct_9fa48("1204") ? "" : (stryCov_9fa48("1204"), "Failed to persist download queue:"), e);
      }
    }
  }
};

// Initialize persisted queue on startup
if (stryMutAct_9fa48("1207") ? false : stryMutAct_9fa48("1206") ? true : stryMutAct_9fa48("1205") ? isTestEnvironment : (stryCov_9fa48("1205", "1206", "1207"), !isTestEnvironment)) {
  if (stryMutAct_9fa48("1208")) {
    {}
  } else {
    stryCov_9fa48("1208");
    chrome.storage.local.get(_queueStorageKey, res => {
      if (stryMutAct_9fa48("1209")) {
        {}
      } else {
        stryCov_9fa48("1209");
        downloadQueue = stryMutAct_9fa48("1212") ? res[_queueStorageKey] && [] : stryMutAct_9fa48("1211") ? false : stryMutAct_9fa48("1210") ? true : (stryCov_9fa48("1210", "1211", "1212"), res[_queueStorageKey] || (stryMutAct_9fa48("1213") ? ["Stryker was here"] : (stryCov_9fa48("1213"), [])));
        updateQueueUI();
      }
    });

    // Initialize persisted active downloads on startup
    chrome.storage.local.get(stryMutAct_9fa48("1214") ? "" : (stryCov_9fa48("1214"), "activeDownloads"), res => {
      if (stryMutAct_9fa48("1215")) {
        {}
      } else {
        stryCov_9fa48("1215");
        if (stryMutAct_9fa48("1217") ? false : stryMutAct_9fa48("1216") ? true : (stryCov_9fa48("1216", "1217"), res.activeDownloads)) {
          if (stryMutAct_9fa48("1218")) {
            {}
          } else {
            stryCov_9fa48("1218");
            Object.assign(activeDownloads, res.activeDownloads);
            log(stryMutAct_9fa48("1219") ? "" : (stryCov_9fa48("1219"), "Restored active downloads from storage:"), Object.keys(activeDownloads).length);
            updateQueueUI();
          }
        }
      }
    });
  }
}