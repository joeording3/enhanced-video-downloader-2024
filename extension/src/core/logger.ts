/**
 * Centralized logging system for the Enhanced Video Downloader extension.
 * Provides consistent logging across all components with structured output.
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
export type LogLevel = "debug" | "info" | "warn" | "error";
export interface LogContext {
  component: string;
  operation?: string;
  data?: any;
}
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context: LogContext;
  data?: any;
}
export interface Logger {
  debug(message: string, context?: LogContext, data?: any): void;
  info(message: string, context?: LogContext, data?: any): void;
  warn(message: string, context?: LogContext, data?: any): void;
  error(message: string, context?: LogContext, data?: any): void;
  log(level: LogLevel, message: string, context?: LogContext, data?: any): void;
  setLevel(level: LogLevel): void;
  getLogs(): LogEntry[];
  clearLogs(): void;
}
export class CentralizedLogger implements Logger {
  private static instance: CentralizedLogger;
  private logs: LogEntry[] = stryMutAct_9fa48("2167") ? ["Stryker was here"] : (stryCov_9fa48("2167"), []);
  private level: LogLevel = stryMutAct_9fa48("2168") ? "" : (stryCov_9fa48("2168"), "info");
  private maxLogs = 1000; // Prevent memory leaks
  private logCallbacks: Set<(entry: LogEntry) => void> = new Set();
  private constructor() {
    if (stryMutAct_9fa48("2169")) {
      {}
    } else {
      stryCov_9fa48("2169");
      // Mirror logs to browser console when running inside the extension runtime
      // (service worker, options, popup). This ensures visibility regardless of build env.
      if (stryMutAct_9fa48("2172") ? typeof chrome !== "undefined" || (chrome as any).runtime : stryMutAct_9fa48("2171") ? false : stryMutAct_9fa48("2170") ? true : (stryCov_9fa48("2170", "2171", "2172"), (stryMutAct_9fa48("2174") ? typeof chrome === "undefined" : stryMutAct_9fa48("2173") ? true : (stryCov_9fa48("2173", "2174"), typeof chrome !== (stryMutAct_9fa48("2175") ? "" : (stryCov_9fa48("2175"), "undefined")))) && (chrome as any).runtime)) {
        if (stryMutAct_9fa48("2176")) {
          {}
        } else {
          stryCov_9fa48("2176");
          this.onLog(entry => {
            if (stryMutAct_9fa48("2177")) {
              {}
            } else {
              stryCov_9fa48("2177");
              const prefix = stryMutAct_9fa48("2178") ? `` : (stryCov_9fa48("2178"), `[${entry.context.component}]`);
              const timestamp = entry.timestamp.toISOString();
              const message = stryMutAct_9fa48("2179") ? `` : (stryCov_9fa48("2179"), `${prefix} ${entry.message}`);
              switch (entry.level) {
                case stryMutAct_9fa48("2181") ? "" : (stryCov_9fa48("2181"), "debug"):
                  if (stryMutAct_9fa48("2180")) {} else {
                    stryCov_9fa48("2180");
                    console.debug(message, entry.data);
                    break;
                  }
                case stryMutAct_9fa48("2183") ? "" : (stryCov_9fa48("2183"), "info"):
                  if (stryMutAct_9fa48("2182")) {} else {
                    stryCov_9fa48("2182");
                    console.info(message, entry.data);
                    break;
                  }
                case stryMutAct_9fa48("2185") ? "" : (stryCov_9fa48("2185"), "warn"):
                  if (stryMutAct_9fa48("2184")) {} else {
                    stryCov_9fa48("2184");
                    console.warn(message, entry.data);
                    break;
                  }
                case stryMutAct_9fa48("2187") ? "" : (stryCov_9fa48("2187"), "error"):
                  if (stryMutAct_9fa48("2186")) {} else {
                    stryCov_9fa48("2186");
                    console.error(message, entry.data);
                    break;
                  }
              }
            }
          });
        }
      }
    }
  }
  static getInstance(): CentralizedLogger {
    if (stryMutAct_9fa48("2188")) {
      {}
    } else {
      stryCov_9fa48("2188");
      if (stryMutAct_9fa48("2191") ? false : stryMutAct_9fa48("2190") ? true : stryMutAct_9fa48("2189") ? CentralizedLogger.instance : (stryCov_9fa48("2189", "2190", "2191"), !CentralizedLogger.instance)) {
        if (stryMutAct_9fa48("2192")) {
          {}
        } else {
          stryCov_9fa48("2192");
          CentralizedLogger.instance = new CentralizedLogger();
        }
      }
      return CentralizedLogger.instance;
    }
  }

  /**
   * Log levels with numeric values for comparison
   */
  private static readonly LEVELS: Record<LogLevel, number> = stryMutAct_9fa48("2193") ? {} : (stryCov_9fa48("2193"), {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  });

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    if (stryMutAct_9fa48("2194")) {
      {}
    } else {
      stryCov_9fa48("2194");
      this.level = level;
    }
  }

  /**
   * Get all stored logs
   */
  getLogs(): LogEntry[] {
    if (stryMutAct_9fa48("2195")) {
      {}
    } else {
      stryCov_9fa48("2195");
      return stryMutAct_9fa48("2196") ? [] : (stryCov_9fa48("2196"), [...this.logs]);
    }
  }

  /**
   * Clear all stored logs
   */
  clearLogs(): void {
    if (stryMutAct_9fa48("2197")) {
      {}
    } else {
      stryCov_9fa48("2197");
      this.logs = stryMutAct_9fa48("2198") ? ["Stryker was here"] : (stryCov_9fa48("2198"), []);
    }
  }

  /**
   * Register log callback
   */
  onLog(callback: (entry: LogEntry) => void): () => void {
    if (stryMutAct_9fa48("2199")) {
      {}
    } else {
      stryCov_9fa48("2199");
      this.logCallbacks.add(callback);
      return () => {
        if (stryMutAct_9fa48("2200")) {
          {}
        } else {
          stryCov_9fa48("2200");
          this.logCallbacks.delete(callback);
        }
      };
    }
  }

  /**
   * Main logging method
   */
  log(level: LogLevel, message: string, context: LogContext = stryMutAct_9fa48("2201") ? {} : (stryCov_9fa48("2201"), {
    component: stryMutAct_9fa48("2202") ? "" : (stryCov_9fa48("2202"), "unknown")
  }), data?: any): void {
    if (stryMutAct_9fa48("2203")) {
      {}
    } else {
      stryCov_9fa48("2203");
      // Check if we should log this level
      if (stryMutAct_9fa48("2207") ? CentralizedLogger.LEVELS[level] >= CentralizedLogger.LEVELS[this.level] : stryMutAct_9fa48("2206") ? CentralizedLogger.LEVELS[level] <= CentralizedLogger.LEVELS[this.level] : stryMutAct_9fa48("2205") ? false : stryMutAct_9fa48("2204") ? true : (stryCov_9fa48("2204", "2205", "2206", "2207"), CentralizedLogger.LEVELS[level] < CentralizedLogger.LEVELS[this.level])) {
        if (stryMutAct_9fa48("2208")) {
          {}
        } else {
          stryCov_9fa48("2208");
          return;
        }
      }
      const entry: LogEntry = stryMutAct_9fa48("2209") ? {} : (stryCov_9fa48("2209"), {
        timestamp: new Date(),
        level,
        message,
        context,
        data
      });

      // Add to logs array
      this.logs.push(entry);

      // Prevent memory leaks
      if (stryMutAct_9fa48("2213") ? this.logs.length <= this.maxLogs : stryMutAct_9fa48("2212") ? this.logs.length >= this.maxLogs : stryMutAct_9fa48("2211") ? false : stryMutAct_9fa48("2210") ? true : (stryCov_9fa48("2210", "2211", "2212", "2213"), this.logs.length > this.maxLogs)) {
        if (stryMutAct_9fa48("2214")) {
          {}
        } else {
          stryCov_9fa48("2214");
          this.logs = stryMutAct_9fa48("2215") ? this.logs : (stryCov_9fa48("2215"), this.logs.slice(stryMutAct_9fa48("2216") ? -this.maxLogs * 2 : (stryCov_9fa48("2216"), (stryMutAct_9fa48("2217") ? +this.maxLogs : (stryCov_9fa48("2217"), -this.maxLogs)) / 2)));
        }
      }

      // Notify callbacks
      this.logCallbacks.forEach(callback => {
        if (stryMutAct_9fa48("2218")) {
          {}
        } else {
          stryCov_9fa48("2218");
          try {
            if (stryMutAct_9fa48("2219")) {
              {}
            } else {
              stryCov_9fa48("2219");
              callback(entry);
            }
          } catch (error) {
            if (stryMutAct_9fa48("2220")) {
              {}
            } else {
              stryCov_9fa48("2220");
              console.error(stryMutAct_9fa48("2221") ? "" : (stryCov_9fa48("2221"), "Error in log callback:"), error);
            }
          }
        }
      });
    }
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: LogContext, data?: any): void {
    if (stryMutAct_9fa48("2222")) {
      {}
    } else {
      stryCov_9fa48("2222");
      this.log(stryMutAct_9fa48("2223") ? "" : (stryCov_9fa48("2223"), "debug"), message, context, data);
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext, data?: any): void {
    if (stryMutAct_9fa48("2224")) {
      {}
    } else {
      stryCov_9fa48("2224");
      this.log(stryMutAct_9fa48("2225") ? "" : (stryCov_9fa48("2225"), "info"), message, context, data);
    }
  }

  /**
   * Warn level logging
   */
  warn(message: string, context?: LogContext, data?: any): void {
    if (stryMutAct_9fa48("2226")) {
      {}
    } else {
      stryCov_9fa48("2226");
      this.log(stryMutAct_9fa48("2227") ? "" : (stryCov_9fa48("2227"), "warn"), message, context, data);
    }
  }

  /**
   * Error level logging
   */
  error(message: string, context?: LogContext, data?: any): void {
    if (stryMutAct_9fa48("2228")) {
      {}
    } else {
      stryCov_9fa48("2228");
      this.log(stryMutAct_9fa48("2229") ? "" : (stryCov_9fa48("2229"), "error"), message, context, data);
    }
  }

  /**
   * Common logging contexts for reuse
   */
  static contexts = stryMutAct_9fa48("2230") ? {} : (stryCov_9fa48("2230"), {
    background: stryMutAct_9fa48("2231") ? {} : (stryCov_9fa48("2231"), {
      serverCheck: stryMutAct_9fa48("2232") ? () => undefined : (stryCov_9fa48("2232"), (port: number) => stryMutAct_9fa48("2233") ? {} : (stryCov_9fa48("2233"), {
        component: stryMutAct_9fa48("2234") ? "" : (stryCov_9fa48("2234"), "background"),
        operation: stryMutAct_9fa48("2235") ? "" : (stryCov_9fa48("2235"), "serverCheck"),
        data: stryMutAct_9fa48("2236") ? {} : (stryCov_9fa48("2236"), {
          port
        })
      })),
      portDiscovery: stryMutAct_9fa48("2237") ? () => undefined : (stryCov_9fa48("2237"), () => stryMutAct_9fa48("2238") ? {} : (stryCov_9fa48("2238"), {
        component: stryMutAct_9fa48("2239") ? "" : (stryCov_9fa48("2239"), "background"),
        operation: stryMutAct_9fa48("2240") ? "" : (stryCov_9fa48("2240"), "portDiscovery")
      })),
      downloadRequest: stryMutAct_9fa48("2241") ? () => undefined : (stryCov_9fa48("2241"), (url: string) => stryMutAct_9fa48("2242") ? {} : (stryCov_9fa48("2242"), {
        component: stryMutAct_9fa48("2243") ? "" : (stryCov_9fa48("2243"), "background"),
        operation: stryMutAct_9fa48("2244") ? "" : (stryCov_9fa48("2244"), "downloadRequest"),
        data: stryMutAct_9fa48("2245") ? {} : (stryCov_9fa48("2245"), {
          url
        })
      })),
      configUpdate: stryMutAct_9fa48("2246") ? () => undefined : (stryCov_9fa48("2246"), (config: any) => stryMutAct_9fa48("2247") ? {} : (stryCov_9fa48("2247"), {
        component: stryMutAct_9fa48("2248") ? "" : (stryCov_9fa48("2248"), "background"),
        operation: stryMutAct_9fa48("2249") ? "" : (stryCov_9fa48("2249"), "configUpdate"),
        data: stryMutAct_9fa48("2250") ? {} : (stryCov_9fa48("2250"), {
          config
        })
      })),
      initialization: stryMutAct_9fa48("2251") ? () => undefined : (stryCov_9fa48("2251"), () => stryMutAct_9fa48("2252") ? {} : (stryCov_9fa48("2252"), {
        component: stryMutAct_9fa48("2253") ? "" : (stryCov_9fa48("2253"), "background"),
        operation: stryMutAct_9fa48("2254") ? "" : (stryCov_9fa48("2254"), "initialization")
      }))
    }),
    content: stryMutAct_9fa48("2255") ? {} : (stryCov_9fa48("2255"), {
      buttonInjection: stryMutAct_9fa48("2256") ? () => undefined : (stryCov_9fa48("2256"), (videoElement?: HTMLElement) => stryMutAct_9fa48("2257") ? {} : (stryCov_9fa48("2257"), {
        component: stryMutAct_9fa48("2258") ? "" : (stryCov_9fa48("2258"), "content"),
        operation: stryMutAct_9fa48("2259") ? "" : (stryCov_9fa48("2259"), "buttonInjection"),
        data: stryMutAct_9fa48("2260") ? {} : (stryCov_9fa48("2260"), {
          videoElement: stryMutAct_9fa48("2261") ? videoElement.tagName : (stryCov_9fa48("2261"), videoElement?.tagName)
        })
      })),
      videoDetection: stryMutAct_9fa48("2262") ? () => undefined : (stryCov_9fa48("2262"), () => stryMutAct_9fa48("2263") ? {} : (stryCov_9fa48("2263"), {
        component: stryMutAct_9fa48("2264") ? "" : (stryCov_9fa48("2264"), "content"),
        operation: stryMutAct_9fa48("2265") ? "" : (stryCov_9fa48("2265"), "videoDetection")
      })),
      dragOperation: stryMutAct_9fa48("2266") ? () => undefined : (stryCov_9fa48("2266"), () => stryMutAct_9fa48("2267") ? {} : (stryCov_9fa48("2267"), {
        component: stryMutAct_9fa48("2268") ? "" : (stryCov_9fa48("2268"), "content"),
        operation: stryMutAct_9fa48("2269") ? "" : (stryCov_9fa48("2269"), "dragOperation")
      })),
      pageLoad: stryMutAct_9fa48("2270") ? () => undefined : (stryCov_9fa48("2270"), () => stryMutAct_9fa48("2271") ? {} : (stryCov_9fa48("2271"), {
        component: stryMutAct_9fa48("2272") ? "" : (stryCov_9fa48("2272"), "content"),
        operation: stryMutAct_9fa48("2273") ? "" : (stryCov_9fa48("2273"), "pageLoad")
      }))
    }),
    popup: stryMutAct_9fa48("2274") ? {} : (stryCov_9fa48("2274"), {
      statusCheck: stryMutAct_9fa48("2275") ? () => undefined : (stryCov_9fa48("2275"), () => stryMutAct_9fa48("2276") ? {} : (stryCov_9fa48("2276"), {
        component: stryMutAct_9fa48("2277") ? "" : (stryCov_9fa48("2277"), "popup"),
        operation: stryMutAct_9fa48("2278") ? "" : (stryCov_9fa48("2278"), "statusCheck")
      })),
      configLoad: stryMutAct_9fa48("2279") ? () => undefined : (stryCov_9fa48("2279"), () => stryMutAct_9fa48("2280") ? {} : (stryCov_9fa48("2280"), {
        component: stryMutAct_9fa48("2281") ? "" : (stryCov_9fa48("2281"), "popup"),
        operation: stryMutAct_9fa48("2282") ? "" : (stryCov_9fa48("2282"), "configLoad")
      })),
      downloadInitiation: stryMutAct_9fa48("2283") ? () => undefined : (stryCov_9fa48("2283"), (url: string) => stryMutAct_9fa48("2284") ? {} : (stryCov_9fa48("2284"), {
        component: stryMutAct_9fa48("2285") ? "" : (stryCov_9fa48("2285"), "popup"),
        operation: stryMutAct_9fa48("2286") ? "" : (stryCov_9fa48("2286"), "downloadInitiation"),
        data: stryMutAct_9fa48("2287") ? {} : (stryCov_9fa48("2287"), {
          url
        })
      })),
      uiUpdate: stryMutAct_9fa48("2288") ? () => undefined : (stryCov_9fa48("2288"), () => stryMutAct_9fa48("2289") ? {} : (stryCov_9fa48("2289"), {
        component: stryMutAct_9fa48("2290") ? "" : (stryCov_9fa48("2290"), "popup"),
        operation: stryMutAct_9fa48("2291") ? "" : (stryCov_9fa48("2291"), "uiUpdate")
      }))
    }),
    options: stryMutAct_9fa48("2292") ? {} : (stryCov_9fa48("2292"), {
      configSave: stryMutAct_9fa48("2293") ? () => undefined : (stryCov_9fa48("2293"), (config: any) => stryMutAct_9fa48("2294") ? {} : (stryCov_9fa48("2294"), {
        component: stryMutAct_9fa48("2295") ? "" : (stryCov_9fa48("2295"), "options"),
        operation: stryMutAct_9fa48("2296") ? "" : (stryCov_9fa48("2296"), "configSave"),
        data: stryMutAct_9fa48("2297") ? {} : (stryCov_9fa48("2297"), {
          config
        })
      })),
      historyLoad: stryMutAct_9fa48("2298") ? () => undefined : (stryCov_9fa48("2298"), () => stryMutAct_9fa48("2299") ? {} : (stryCov_9fa48("2299"), {
        component: stryMutAct_9fa48("2300") ? "" : (stryCov_9fa48("2300"), "options"),
        operation: stryMutAct_9fa48("2301") ? "" : (stryCov_9fa48("2301"), "historyLoad")
      })),
      themeUpdate: stryMutAct_9fa48("2302") ? () => undefined : (stryCov_9fa48("2302"), (theme: string) => stryMutAct_9fa48("2303") ? {} : (stryCov_9fa48("2303"), {
        component: stryMutAct_9fa48("2304") ? "" : (stryCov_9fa48("2304"), "options"),
        operation: stryMutAct_9fa48("2305") ? "" : (stryCov_9fa48("2305"), "themeUpdate"),
        data: stryMutAct_9fa48("2306") ? {} : (stryCov_9fa48("2306"), {
          theme
        })
      })),
      pageLoad: stryMutAct_9fa48("2307") ? () => undefined : (stryCov_9fa48("2307"), () => stryMutAct_9fa48("2308") ? {} : (stryCov_9fa48("2308"), {
        component: stryMutAct_9fa48("2309") ? "" : (stryCov_9fa48("2309"), "options"),
        operation: stryMutAct_9fa48("2310") ? "" : (stryCov_9fa48("2310"), "pageLoad")
      }))
    })
  });

  /**
   * Utility methods for common logging patterns
   */
  static utils = stryMutAct_9fa48("2311") ? {} : (stryCov_9fa48("2311"), {
    /**
     * Log function entry
     */
    functionEntry: (functionName: string, component: string, data?: any) => {
      if (stryMutAct_9fa48("2312")) {
        {}
      } else {
        stryCov_9fa48("2312");
        const logger = CentralizedLogger.getInstance();
        logger.debug(stryMutAct_9fa48("2313") ? `` : (stryCov_9fa48("2313"), `Entering ${functionName}`), stryMutAct_9fa48("2314") ? {} : (stryCov_9fa48("2314"), {
          component,
          operation: functionName
        }), data);
      }
    },
    /**
     * Log function exit
     */
    functionExit: (functionName: string, component: string, data?: any) => {
      if (stryMutAct_9fa48("2315")) {
        {}
      } else {
        stryCov_9fa48("2315");
        const logger = CentralizedLogger.getInstance();
        logger.debug(stryMutAct_9fa48("2316") ? `` : (stryCov_9fa48("2316"), `Exiting ${functionName}`), stryMutAct_9fa48("2317") ? {} : (stryCov_9fa48("2317"), {
          component,
          operation: functionName
        }), data);
      }
    },
    /**
     * Log async operation start
     */
    asyncStart: (operationName: string, component: string, data?: any) => {
      if (stryMutAct_9fa48("2318")) {
        {}
      } else {
        stryCov_9fa48("2318");
        const logger = CentralizedLogger.getInstance();
        logger.info(stryMutAct_9fa48("2319") ? `` : (stryCov_9fa48("2319"), `Starting ${operationName}`), stryMutAct_9fa48("2320") ? {} : (stryCov_9fa48("2320"), {
          component,
          operation: operationName
        }), data);
      }
    },
    /**
     * Log async operation completion
     */
    asyncComplete: (operationName: string, component: string, data?: any) => {
      if (stryMutAct_9fa48("2321")) {
        {}
      } else {
        stryCov_9fa48("2321");
        const logger = CentralizedLogger.getInstance();
        logger.info(stryMutAct_9fa48("2322") ? `` : (stryCov_9fa48("2322"), `Completed ${operationName}`), stryMutAct_9fa48("2323") ? {} : (stryCov_9fa48("2323"), {
          component,
          operation: operationName
        }), data);
      }
    },
    /**
     * Log async operation failure
     */
    asyncError: (operationName: string, component: string, error: Error, data?: any) => {
      if (stryMutAct_9fa48("2324")) {
        {}
      } else {
        stryCov_9fa48("2324");
        const logger = CentralizedLogger.getInstance();
        logger.error(stryMutAct_9fa48("2325") ? `` : (stryCov_9fa48("2325"), `Failed ${operationName}: ${error.message}`), stryMutAct_9fa48("2326") ? {} : (stryCov_9fa48("2326"), {
          component,
          operation: operationName
        }), stryMutAct_9fa48("2327") ? {} : (stryCov_9fa48("2327"), {
          error,
          ...data
        }));
      }
    }
  });
}

// Export singleton instance
export const logger = CentralizedLogger.getInstance();