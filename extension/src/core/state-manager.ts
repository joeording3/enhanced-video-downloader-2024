/**
 * Centralized state management for the Enhanced Video Downloader extension.
 * Manages server state, connection status, and UI state across components.
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
import { Theme, ServerConfig } from "../types";
import type { HistoryEntry } from "../types";

// State interfaces
export interface ServerState {
  port: number | null;
  status: "connected" | "disconnected" | "checking";
  scanInProgress: boolean;
  backoffInterval: number;
  config: Partial<ServerConfig>;
}
export interface UIState {
  buttonPosition: {
    x: number;
    y: number;
  };
  buttonVisible: boolean;
  isDragging: boolean;
  theme: Theme;
  dragSrcIndex: number | null;
  statusTimeout: ReturnType<typeof setTimeout> | null;
  lastClickTime: number;
  checksDone: number;
}
export interface DownloadState {
  queue: string[];
  active: Record<string, DownloadStatus>;
  history: HistoryEntry[];
}
export interface FormState {
  errors: Map<string, string>;
  data: Record<string, any>;
  validationErrors: Map<string, string>;
}
export interface DownloadStatus {
  status: string;
  progress: number;
  filename?: string;
  title?: string;
  id?: string;
  url: string;
  error?: string;
  message?: string;
}
export interface ExtensionState {
  server: ServerState;
  ui: UIState;
  downloads: DownloadState;
  form: FormState;
}

// Event types for state changes
export type StateChangeEvent = "serverStatusChanged" | "serverPortChanged" | "downloadQueueChanged" | "downloadActiveChanged" | "uiThemeChanged" | "buttonPositionChanged" | "formValidationChanged";

/**
 * Centralized State Manager for the extension
 * Provides a single source of truth for all state across the extension
 */
export class ExtensionStateManager {
  private static instance: ExtensionStateManager;
  private state: ExtensionState;
  private listeners: Map<StateChangeEvent, Set<(data: any) => void>> = new Map();
  private constructor() {
    if (stryMutAct_9fa48("2328")) {
      {}
    } else {
      stryCov_9fa48("2328");
      this.state = stryMutAct_9fa48("2329") ? {} : (stryCov_9fa48("2329"), {
        server: stryMutAct_9fa48("2330") ? {} : (stryCov_9fa48("2330"), {
          port: null,
          status: stryMutAct_9fa48("2331") ? "" : (stryCov_9fa48("2331"), "disconnected"),
          scanInProgress: stryMutAct_9fa48("2332") ? true : (stryCov_9fa48("2332"), false),
          backoffInterval: 1000,
          config: {}
        }),
        ui: stryMutAct_9fa48("2333") ? {} : (stryCov_9fa48("2333"), {
          buttonPosition: stryMutAct_9fa48("2334") ? {} : (stryCov_9fa48("2334"), {
            x: 10,
            y: 10
          }),
          buttonVisible: stryMutAct_9fa48("2335") ? false : (stryCov_9fa48("2335"), true),
          isDragging: stryMutAct_9fa48("2336") ? true : (stryCov_9fa48("2336"), false),
          theme: stryMutAct_9fa48("2337") ? "" : (stryCov_9fa48("2337"), "light"),
          dragSrcIndex: null,
          statusTimeout: null,
          lastClickTime: 0,
          checksDone: 0
        }),
        downloads: stryMutAct_9fa48("2338") ? {} : (stryCov_9fa48("2338"), {
          queue: stryMutAct_9fa48("2339") ? ["Stryker was here"] : (stryCov_9fa48("2339"), []),
          active: {},
          history: stryMutAct_9fa48("2340") ? ["Stryker was here"] : (stryCov_9fa48("2340"), [])
        }),
        form: stryMutAct_9fa48("2341") ? {} : (stryCov_9fa48("2341"), {
          errors: new Map(),
          data: {},
          validationErrors: new Map()
        })
      });
    }
  }

  /**
   * Get the singleton instance of the state manager
   */
  static getInstance(): ExtensionStateManager {
    if (stryMutAct_9fa48("2342")) {
      {}
    } else {
      stryCov_9fa48("2342");
      if (stryMutAct_9fa48("2345") ? false : stryMutAct_9fa48("2344") ? true : stryMutAct_9fa48("2343") ? ExtensionStateManager.instance : (stryCov_9fa48("2343", "2344", "2345"), !ExtensionStateManager.instance)) {
        if (stryMutAct_9fa48("2346")) {
          {}
        } else {
          stryCov_9fa48("2346");
          ExtensionStateManager.instance = new ExtensionStateManager();
        }
      }
      return ExtensionStateManager.instance;
    }
  }

  /**
   * Get the current state
   */
  getState(): ExtensionState {
    if (stryMutAct_9fa48("2347")) {
      {}
    } else {
      stryCov_9fa48("2347");
      return stryMutAct_9fa48("2348") ? {} : (stryCov_9fa48("2348"), {
        ...this.state
      });
    }
  }

  /**
   * Get a specific part of the state
   */
  getServerState(): ServerState {
    if (stryMutAct_9fa48("2349")) {
      {}
    } else {
      stryCov_9fa48("2349");
      return stryMutAct_9fa48("2350") ? {} : (stryCov_9fa48("2350"), {
        ...this.state.server
      });
    }
  }
  getUIState(): UIState {
    if (stryMutAct_9fa48("2351")) {
      {}
    } else {
      stryCov_9fa48("2351");
      return stryMutAct_9fa48("2352") ? {} : (stryCov_9fa48("2352"), {
        ...this.state.ui
      });
    }
  }
  getDownloadState(): DownloadState {
    if (stryMutAct_9fa48("2353")) {
      {}
    } else {
      stryCov_9fa48("2353");
      return stryMutAct_9fa48("2354") ? {} : (stryCov_9fa48("2354"), {
        ...this.state.downloads
      });
    }
  }
  getFormState(): FormState {
    if (stryMutAct_9fa48("2355")) {
      {}
    } else {
      stryCov_9fa48("2355");
      return stryMutAct_9fa48("2356") ? {} : (stryCov_9fa48("2356"), {
        ...this.state.form
      });
    }
  }

  /**
   * Update server state
   */
  updateServerState(updates: Partial<ServerState>): void {
    if (stryMutAct_9fa48("2357")) {
      {}
    } else {
      stryCov_9fa48("2357");
      this.state.server = stryMutAct_9fa48("2358") ? {} : (stryCov_9fa48("2358"), {
        ...this.state.server,
        ...updates
      });
      this.notifyListeners(stryMutAct_9fa48("2359") ? "" : (stryCov_9fa48("2359"), "serverStatusChanged"), this.state.server);
    }
  }

  /**
   * Update UI state
   */
  updateUIState(updates: Partial<UIState>): void {
    if (stryMutAct_9fa48("2360")) {
      {}
    } else {
      stryCov_9fa48("2360");
      this.state.ui = stryMutAct_9fa48("2361") ? {} : (stryCov_9fa48("2361"), {
        ...this.state.ui,
        ...updates
      });
      if (stryMutAct_9fa48("2364") ? updates.theme === undefined : stryMutAct_9fa48("2363") ? false : stryMutAct_9fa48("2362") ? true : (stryCov_9fa48("2362", "2363", "2364"), updates.theme !== undefined)) {
        if (stryMutAct_9fa48("2365")) {
          {}
        } else {
          stryCov_9fa48("2365");
          this.notifyListeners(stryMutAct_9fa48("2366") ? "" : (stryCov_9fa48("2366"), "uiThemeChanged"), this.state.ui.theme);
        }
      }
      if (stryMutAct_9fa48("2369") ? updates.buttonPosition === undefined : stryMutAct_9fa48("2368") ? false : stryMutAct_9fa48("2367") ? true : (stryCov_9fa48("2367", "2368", "2369"), updates.buttonPosition !== undefined)) {
        if (stryMutAct_9fa48("2370")) {
          {}
        } else {
          stryCov_9fa48("2370");
          this.notifyListeners(stryMutAct_9fa48("2371") ? "" : (stryCov_9fa48("2371"), "buttonPositionChanged"), this.state.ui.buttonPosition);
        }
      }
    }
  }

  /**
   * Update download state
   */
  updateDownloadState(updates: Partial<DownloadState>): void {
    if (stryMutAct_9fa48("2372")) {
      {}
    } else {
      stryCov_9fa48("2372");
      this.state.downloads = stryMutAct_9fa48("2373") ? {} : (stryCov_9fa48("2373"), {
        ...this.state.downloads,
        ...updates
      });
      if (stryMutAct_9fa48("2376") ? updates.queue === undefined : stryMutAct_9fa48("2375") ? false : stryMutAct_9fa48("2374") ? true : (stryCov_9fa48("2374", "2375", "2376"), updates.queue !== undefined)) {
        if (stryMutAct_9fa48("2377")) {
          {}
        } else {
          stryCov_9fa48("2377");
          this.notifyListeners(stryMutAct_9fa48("2378") ? "" : (stryCov_9fa48("2378"), "downloadQueueChanged"), this.state.downloads.queue);
        }
      }
      if (stryMutAct_9fa48("2381") ? updates.active === undefined : stryMutAct_9fa48("2380") ? false : stryMutAct_9fa48("2379") ? true : (stryCov_9fa48("2379", "2380", "2381"), updates.active !== undefined)) {
        if (stryMutAct_9fa48("2382")) {
          {}
        } else {
          stryCov_9fa48("2382");
          this.notifyListeners(stryMutAct_9fa48("2383") ? "" : (stryCov_9fa48("2383"), "downloadActiveChanged"), this.state.downloads.active);
        }
      }
    }
  }

  /**
   * Update form state
   */
  updateFormState(updates: Partial<FormState>): void {
    if (stryMutAct_9fa48("2384")) {
      {}
    } else {
      stryCov_9fa48("2384");
      this.state.form = stryMutAct_9fa48("2385") ? {} : (stryCov_9fa48("2385"), {
        ...this.state.form,
        ...updates
      });
      this.notifyListeners(stryMutAct_9fa48("2386") ? "" : (stryCov_9fa48("2386"), "formValidationChanged"), this.state.form);
    }
  }

  /**
   * Subscribe to state changes
   */
  subscribe(event: StateChangeEvent, callback: (data: any) => void): () => void {
    if (stryMutAct_9fa48("2387")) {
      {}
    } else {
      stryCov_9fa48("2387");
      if (stryMutAct_9fa48("2390") ? false : stryMutAct_9fa48("2389") ? true : stryMutAct_9fa48("2388") ? this.listeners.has(event) : (stryCov_9fa48("2388", "2389", "2390"), !this.listeners.has(event))) {
        if (stryMutAct_9fa48("2391")) {
          {}
        } else {
          stryCov_9fa48("2391");
          this.listeners.set(event, new Set());
        }
      }
      this.listeners.get(event)!.add(callback);

      // Return unsubscribe function
      return () => {
        if (stryMutAct_9fa48("2392")) {
          {}
        } else {
          stryCov_9fa48("2392");
          stryMutAct_9fa48("2393") ? this.listeners.get(event).delete(callback) : (stryCov_9fa48("2393"), this.listeners.get(event)?.delete(callback));
        }
      };
    }
  }

  /**
   * Notify listeners of state changes
   */
  private notifyListeners(event: StateChangeEvent, data: any): void {
    if (stryMutAct_9fa48("2394")) {
      {}
    } else {
      stryCov_9fa48("2394");
      const eventListeners = this.listeners.get(event);
      if (stryMutAct_9fa48("2396") ? false : stryMutAct_9fa48("2395") ? true : (stryCov_9fa48("2395", "2396"), eventListeners)) {
        if (stryMutAct_9fa48("2397")) {
          {}
        } else {
          stryCov_9fa48("2397");
          eventListeners.forEach(callback => {
            if (stryMutAct_9fa48("2398")) {
              {}
            } else {
              stryCov_9fa48("2398");
              try {
                if (stryMutAct_9fa48("2399")) {
                  {}
                } else {
                  stryCov_9fa48("2399");
                  callback(data);
                }
              } catch (error) {
                if (stryMutAct_9fa48("2400")) {
                  {}
                } else {
                  stryCov_9fa48("2400");
                  console.error(stryMutAct_9fa48("2401") ? `` : (stryCov_9fa48("2401"), `Error in state change listener for ${event}:`), error);
                }
              }
            }
          });
        }
      }
    }
  }

  /**
   * Load state from storage
   */
  async loadFromStorage(): Promise<void> {
    if (stryMutAct_9fa48("2402")) {
      {}
    } else {
      stryCov_9fa48("2402");
      try {
        if (stryMutAct_9fa48("2403")) {
          {}
        } else {
          stryCov_9fa48("2403");
          const result = await chrome.storage.local.get(stryMutAct_9fa48("2404") ? [] : (stryCov_9fa48("2404"), [stryMutAct_9fa48("2405") ? "" : (stryCov_9fa48("2405"), "serverPort"), stryMutAct_9fa48("2406") ? "" : (stryCov_9fa48("2406"), "serverConfig"), stryMutAct_9fa48("2407") ? "" : (stryCov_9fa48("2407"), "downloadHistory"), stryMutAct_9fa48("2408") ? "" : (stryCov_9fa48("2408"), "theme"), stryMutAct_9fa48("2409") ? "" : (stryCov_9fa48("2409"), "buttonState")]));

          // Load server state
          if (stryMutAct_9fa48("2411") ? false : stryMutAct_9fa48("2410") ? true : (stryCov_9fa48("2410", "2411"), result.serverPort)) {
            if (stryMutAct_9fa48("2412")) {
              {}
            } else {
              stryCov_9fa48("2412");
              this.updateServerState(stryMutAct_9fa48("2413") ? {} : (stryCov_9fa48("2413"), {
                port: result.serverPort
              }));
            }
          }
          if (stryMutAct_9fa48("2415") ? false : stryMutAct_9fa48("2414") ? true : (stryCov_9fa48("2414", "2415"), result.serverConfig)) {
            if (stryMutAct_9fa48("2416")) {
              {}
            } else {
              stryCov_9fa48("2416");
              this.updateServerState(stryMutAct_9fa48("2417") ? {} : (stryCov_9fa48("2417"), {
                config: result.serverConfig
              }));
            }
          }

          // Load UI state
          if (stryMutAct_9fa48("2419") ? false : stryMutAct_9fa48("2418") ? true : (stryCov_9fa48("2418", "2419"), result.theme)) {
            if (stryMutAct_9fa48("2420")) {
              {}
            } else {
              stryCov_9fa48("2420");
              this.updateUIState(stryMutAct_9fa48("2421") ? {} : (stryCov_9fa48("2421"), {
                theme: result.theme
              }));
            }
          }
          if (stryMutAct_9fa48("2423") ? false : stryMutAct_9fa48("2422") ? true : (stryCov_9fa48("2422", "2423"), result.buttonState)) {
            if (stryMutAct_9fa48("2424")) {
              {}
            } else {
              stryCov_9fa48("2424");
              this.updateUIState(stryMutAct_9fa48("2425") ? {} : (stryCov_9fa48("2425"), {
                buttonPosition: stryMutAct_9fa48("2428") ? result.buttonState.position && {
                  x: 10,
                  y: 10
                } : stryMutAct_9fa48("2427") ? false : stryMutAct_9fa48("2426") ? true : (stryCov_9fa48("2426", "2427", "2428"), result.buttonState.position || (stryMutAct_9fa48("2429") ? {} : (stryCov_9fa48("2429"), {
                  x: 10,
                  y: 10
                }))),
                buttonVisible: stryMutAct_9fa48("2432") ? result.buttonState.visible === false : stryMutAct_9fa48("2431") ? false : stryMutAct_9fa48("2430") ? true : (stryCov_9fa48("2430", "2431", "2432"), result.buttonState.visible !== (stryMutAct_9fa48("2433") ? true : (stryCov_9fa48("2433"), false)))
              }));
            }
          }

          // Load download state
          if (stryMutAct_9fa48("2435") ? false : stryMutAct_9fa48("2434") ? true : (stryCov_9fa48("2434", "2435"), result.downloadHistory)) {
            if (stryMutAct_9fa48("2436")) {
              {}
            } else {
              stryCov_9fa48("2436");
              this.updateDownloadState(stryMutAct_9fa48("2437") ? {} : (stryCov_9fa48("2437"), {
                history: result.downloadHistory
              }));
            }
          }
        }
      } catch (error) {
        if (stryMutAct_9fa48("2438")) {
          {}
        } else {
          stryCov_9fa48("2438");
          console.error(stryMutAct_9fa48("2439") ? "" : (stryCov_9fa48("2439"), "Error loading state from storage:"), error);
        }
      }
    }
  }

  /**
   * Save state to storage
   */
  async saveToStorage(): Promise<void> {
    if (stryMutAct_9fa48("2440")) {
      {}
    } else {
      stryCov_9fa48("2440");
      try {
        if (stryMutAct_9fa48("2441")) {
          {}
        } else {
          stryCov_9fa48("2441");
          await chrome.storage.local.set(stryMutAct_9fa48("2442") ? {} : (stryCov_9fa48("2442"), {
            serverPort: this.state.server.port,
            serverConfig: this.state.server.config,
            theme: this.state.ui.theme,
            buttonState: stryMutAct_9fa48("2443") ? {} : (stryCov_9fa48("2443"), {
              position: this.state.ui.buttonPosition,
              visible: this.state.ui.buttonVisible
            }),
            downloadHistory: this.state.downloads.history
          }));
        }
      } catch (error) {
        if (stryMutAct_9fa48("2444")) {
          {}
        } else {
          stryCov_9fa48("2444");
          console.error(stryMutAct_9fa48("2445") ? "" : (stryCov_9fa48("2445"), "Error saving state to storage:"), error);
        }
      }
    }
  }

  /**
   * Reset state to defaults
   */
  reset(): void {
    if (stryMutAct_9fa48("2446")) {
      {}
    } else {
      stryCov_9fa48("2446");
      this.state = stryMutAct_9fa48("2447") ? {} : (stryCov_9fa48("2447"), {
        server: stryMutAct_9fa48("2448") ? {} : (stryCov_9fa48("2448"), {
          port: null,
          status: stryMutAct_9fa48("2449") ? "" : (stryCov_9fa48("2449"), "disconnected"),
          scanInProgress: stryMutAct_9fa48("2450") ? true : (stryCov_9fa48("2450"), false),
          backoffInterval: 1000,
          config: {}
        }),
        ui: stryMutAct_9fa48("2451") ? {} : (stryCov_9fa48("2451"), {
          buttonPosition: stryMutAct_9fa48("2452") ? {} : (stryCov_9fa48("2452"), {
            x: 10,
            y: 10
          }),
          buttonVisible: stryMutAct_9fa48("2453") ? false : (stryCov_9fa48("2453"), true),
          isDragging: stryMutAct_9fa48("2454") ? true : (stryCov_9fa48("2454"), false),
          theme: stryMutAct_9fa48("2455") ? "" : (stryCov_9fa48("2455"), "light"),
          dragSrcIndex: null,
          statusTimeout: null,
          lastClickTime: 0,
          checksDone: 0
        }),
        downloads: stryMutAct_9fa48("2456") ? {} : (stryCov_9fa48("2456"), {
          queue: stryMutAct_9fa48("2457") ? ["Stryker was here"] : (stryCov_9fa48("2457"), []),
          active: {},
          history: stryMutAct_9fa48("2458") ? ["Stryker was here"] : (stryCov_9fa48("2458"), [])
        }),
        form: stryMutAct_9fa48("2459") ? {} : (stryCov_9fa48("2459"), {
          errors: new Map(),
          data: {},
          validationErrors: new Map()
        })
      });
    }
  }
}

// Export singleton instance
export const stateManager = ExtensionStateManager.getInstance();