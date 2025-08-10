/**
 * Centralized error handling for the Enhanced Video Downloader extension.
 * Provides consistent error handling and logging across all components.
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
export interface ErrorInfo {
  component: string;
  operation: string;
  data?: any;
  userMessage?: string;
}
export interface ErrorResult {
  success: boolean;
  error?: string;
  data?: any;
  userMessage?: string;
}
export interface ErrorHandler {
  handle<T>(operation: () => T | Promise<T>, context: ErrorInfo): Promise<ErrorResult>;
  handleSync<T>(operation: () => T, context: ErrorInfo): ErrorResult;
  wrap<T>(operation: () => T | Promise<T>, context: ErrorInfo): Promise<T>;
  wrapSync<T>(operation: () => T, context: ErrorInfo): T;
}
export class CentralizedErrorHandler implements ErrorHandler {
  private static instance: CentralizedErrorHandler;
  private errorCallbacks: Set<(error: Error, context: ErrorInfo) => void> = new Set();
  private constructor() {}
  static getInstance(): CentralizedErrorHandler {
    if (stryMutAct_9fa48("2053")) {
      {}
    } else {
      stryCov_9fa48("2053");
      if (stryMutAct_9fa48("2056") ? false : stryMutAct_9fa48("2055") ? true : stryMutAct_9fa48("2054") ? CentralizedErrorHandler.instance : (stryCov_9fa48("2054", "2055", "2056"), !CentralizedErrorHandler.instance)) {
        if (stryMutAct_9fa48("2057")) {
          {}
        } else {
          stryCov_9fa48("2057");
          CentralizedErrorHandler.instance = new CentralizedErrorHandler();
        }
      }
      return CentralizedErrorHandler.instance;
    }
  }

  /**
   * Handle async operations with error handling
   */
  async handle<T>(operation: () => T | Promise<T>, context: ErrorInfo): Promise<ErrorResult> {
    if (stryMutAct_9fa48("2058")) {
      {}
    } else {
      stryCov_9fa48("2058");
      try {
        if (stryMutAct_9fa48("2059")) {
          {}
        } else {
          stryCov_9fa48("2059");
          const result = await operation();
          return stryMutAct_9fa48("2060") ? {} : (stryCov_9fa48("2060"), {
            success: stryMutAct_9fa48("2061") ? false : (stryCov_9fa48("2061"), true),
            data: result
          });
        }
      } catch (error) {
        if (stryMutAct_9fa48("2062")) {
          {}
        } else {
          stryCov_9fa48("2062");
          return this.handleError(error as Error, context);
        }
      }
    }
  }

  /**
   * Handle sync operations with error handling
   */
  handleSync<T>(operation: () => T, context: ErrorInfo): ErrorResult {
    if (stryMutAct_9fa48("2063")) {
      {}
    } else {
      stryCov_9fa48("2063");
      try {
        if (stryMutAct_9fa48("2064")) {
          {}
        } else {
          stryCov_9fa48("2064");
          const result = operation();
          return stryMutAct_9fa48("2065") ? {} : (stryCov_9fa48("2065"), {
            success: stryMutAct_9fa48("2066") ? false : (stryCov_9fa48("2066"), true),
            data: result
          });
        }
      } catch (error) {
        if (stryMutAct_9fa48("2067")) {
          {}
        } else {
          stryCov_9fa48("2067");
          return this.handleError(error as Error, context);
        }
      }
    }
  }

  /**
   * Wrap async operations - throws on error
   */
  async wrap<T>(operation: () => T | Promise<T>, context: ErrorInfo): Promise<T> {
    if (stryMutAct_9fa48("2068")) {
      {}
    } else {
      stryCov_9fa48("2068");
      try {
        if (stryMutAct_9fa48("2069")) {
          {}
        } else {
          stryCov_9fa48("2069");
          return await operation();
        }
      } catch (error) {
        if (stryMutAct_9fa48("2070")) {
          {}
        } else {
          stryCov_9fa48("2070");
          this.handleError(error as Error, context);
          throw error;
        }
      }
    }
  }

  /**
   * Wrap sync operations - throws on error
   */
  wrapSync<T>(operation: () => T, context: ErrorInfo): T {
    if (stryMutAct_9fa48("2071")) {
      {}
    } else {
      stryCov_9fa48("2071");
      try {
        if (stryMutAct_9fa48("2072")) {
          {}
        } else {
          stryCov_9fa48("2072");
          return operation();
        }
      } catch (error) {
        if (stryMutAct_9fa48("2073")) {
          {}
        } else {
          stryCov_9fa48("2073");
          this.handleError(error as Error, context);
          throw error;
        }
      }
    }
  }

  /**
   * Register error callback for custom error handling
   */
  onError(callback: (error: Error, context: ErrorInfo) => void): () => void {
    if (stryMutAct_9fa48("2074")) {
      {}
    } else {
      stryCov_9fa48("2074");
      this.errorCallbacks.add(callback);
      return () => {
        if (stryMutAct_9fa48("2075")) {
          {}
        } else {
          stryCov_9fa48("2075");
          this.errorCallbacks.delete(callback);
        }
      };
    }
  }

  /**
   * Internal error handling logic
   */
  private handleError(error: Error, context: ErrorInfo): ErrorResult {
    if (stryMutAct_9fa48("2076")) {
      {}
    } else {
      stryCov_9fa48("2076");
      // Log error with context
      console.error(stryMutAct_9fa48("2077") ? `` : (stryCov_9fa48("2077"), `[${context.component}] ${context.operation} failed:`), error);
      console.error(stryMutAct_9fa48("2078") ? "" : (stryCov_9fa48("2078"), "Context:"), context);

      // Notify error callbacks
      this.errorCallbacks.forEach(callback => {
        if (stryMutAct_9fa48("2079")) {
          {}
        } else {
          stryCov_9fa48("2079");
          try {
            if (stryMutAct_9fa48("2080")) {
              {}
            } else {
              stryCov_9fa48("2080");
              callback(error, context);
            }
          } catch (callbackError) {
            if (stryMutAct_9fa48("2081")) {
              {}
            } else {
              stryCov_9fa48("2081");
              console.error(stryMutAct_9fa48("2082") ? "" : (stryCov_9fa48("2082"), "Error in error callback:"), callbackError);
            }
          }
        }
      });

      // Return error result
      return stryMutAct_9fa48("2083") ? {} : (stryCov_9fa48("2083"), {
        success: stryMutAct_9fa48("2084") ? true : (stryCov_9fa48("2084"), false),
        error: error.message,
        userMessage: stryMutAct_9fa48("2087") ? context.userMessage && `Operation failed: ${context.operation}` : stryMutAct_9fa48("2086") ? false : stryMutAct_9fa48("2085") ? true : (stryCov_9fa48("2085", "2086", "2087"), context.userMessage || (stryMutAct_9fa48("2088") ? `` : (stryCov_9fa48("2088"), `Operation failed: ${context.operation}`)))
      });
    }
  }

  /**
   * Common error contexts for reuse
   */
  static contexts = stryMutAct_9fa48("2089") ? {} : (stryCov_9fa48("2089"), {
    background: stryMutAct_9fa48("2090") ? {} : (stryCov_9fa48("2090"), {
      serverCheck: stryMutAct_9fa48("2091") ? () => undefined : (stryCov_9fa48("2091"), (port: number) => stryMutAct_9fa48("2092") ? {} : (stryCov_9fa48("2092"), {
        component: stryMutAct_9fa48("2093") ? "" : (stryCov_9fa48("2093"), "background"),
        operation: stryMutAct_9fa48("2094") ? "" : (stryCov_9fa48("2094"), "serverCheck"),
        data: stryMutAct_9fa48("2095") ? {} : (stryCov_9fa48("2095"), {
          port
        }),
        userMessage: stryMutAct_9fa48("2096") ? "" : (stryCov_9fa48("2096"), "Failed to check server status")
      })),
      portDiscovery: stryMutAct_9fa48("2097") ? () => undefined : (stryCov_9fa48("2097"), () => stryMutAct_9fa48("2098") ? {} : (stryCov_9fa48("2098"), {
        component: stryMutAct_9fa48("2099") ? "" : (stryCov_9fa48("2099"), "background"),
        operation: stryMutAct_9fa48("2100") ? "" : (stryCov_9fa48("2100"), "portDiscovery"),
        userMessage: stryMutAct_9fa48("2101") ? "" : (stryCov_9fa48("2101"), "Failed to discover server port")
      })),
      downloadRequest: stryMutAct_9fa48("2102") ? () => undefined : (stryCov_9fa48("2102"), (url: string) => stryMutAct_9fa48("2103") ? {} : (stryCov_9fa48("2103"), {
        component: stryMutAct_9fa48("2104") ? "" : (stryCov_9fa48("2104"), "background"),
        operation: stryMutAct_9fa48("2105") ? "" : (stryCov_9fa48("2105"), "downloadRequest"),
        data: stryMutAct_9fa48("2106") ? {} : (stryCov_9fa48("2106"), {
          url
        }),
        userMessage: stryMutAct_9fa48("2107") ? "" : (stryCov_9fa48("2107"), "Failed to send download request")
      })),
      configUpdate: stryMutAct_9fa48("2108") ? () => undefined : (stryCov_9fa48("2108"), (config: any) => stryMutAct_9fa48("2109") ? {} : (stryCov_9fa48("2109"), {
        component: stryMutAct_9fa48("2110") ? "" : (stryCov_9fa48("2110"), "background"),
        operation: stryMutAct_9fa48("2111") ? "" : (stryCov_9fa48("2111"), "configUpdate"),
        data: stryMutAct_9fa48("2112") ? {} : (stryCov_9fa48("2112"), {
          config
        }),
        userMessage: stryMutAct_9fa48("2113") ? "" : (stryCov_9fa48("2113"), "Failed to update configuration")
      }))
    }),
    content: stryMutAct_9fa48("2114") ? {} : (stryCov_9fa48("2114"), {
      buttonInjection: stryMutAct_9fa48("2115") ? () => undefined : (stryCov_9fa48("2115"), (videoElement?: HTMLElement) => stryMutAct_9fa48("2116") ? {} : (stryCov_9fa48("2116"), {
        component: stryMutAct_9fa48("2117") ? "" : (stryCov_9fa48("2117"), "content"),
        operation: stryMutAct_9fa48("2118") ? "" : (stryCov_9fa48("2118"), "buttonInjection"),
        data: stryMutAct_9fa48("2119") ? {} : (stryCov_9fa48("2119"), {
          videoElement: stryMutAct_9fa48("2120") ? videoElement.tagName : (stryCov_9fa48("2120"), videoElement?.tagName)
        }),
        userMessage: stryMutAct_9fa48("2121") ? "" : (stryCov_9fa48("2121"), "Failed to inject download button")
      })),
      videoDetection: stryMutAct_9fa48("2122") ? () => undefined : (stryCov_9fa48("2122"), () => stryMutAct_9fa48("2123") ? {} : (stryCov_9fa48("2123"), {
        component: stryMutAct_9fa48("2124") ? "" : (stryCov_9fa48("2124"), "content"),
        operation: stryMutAct_9fa48("2125") ? "" : (stryCov_9fa48("2125"), "videoDetection"),
        userMessage: stryMutAct_9fa48("2126") ? "" : (stryCov_9fa48("2126"), "Failed to detect videos on page")
      })),
      dragOperation: stryMutAct_9fa48("2127") ? () => undefined : (stryCov_9fa48("2127"), () => stryMutAct_9fa48("2128") ? {} : (stryCov_9fa48("2128"), {
        component: stryMutAct_9fa48("2129") ? "" : (stryCov_9fa48("2129"), "content"),
        operation: stryMutAct_9fa48("2130") ? "" : (stryCov_9fa48("2130"), "dragOperation"),
        userMessage: stryMutAct_9fa48("2131") ? "" : (stryCov_9fa48("2131"), "Failed to handle button drag")
      }))
    }),
    popup: stryMutAct_9fa48("2132") ? {} : (stryCov_9fa48("2132"), {
      statusCheck: stryMutAct_9fa48("2133") ? () => undefined : (stryCov_9fa48("2133"), () => stryMutAct_9fa48("2134") ? {} : (stryCov_9fa48("2134"), {
        component: stryMutAct_9fa48("2135") ? "" : (stryCov_9fa48("2135"), "popup"),
        operation: stryMutAct_9fa48("2136") ? "" : (stryCov_9fa48("2136"), "statusCheck"),
        userMessage: stryMutAct_9fa48("2137") ? "" : (stryCov_9fa48("2137"), "Failed to check server status")
      })),
      configLoad: stryMutAct_9fa48("2138") ? () => undefined : (stryCov_9fa48("2138"), () => stryMutAct_9fa48("2139") ? {} : (stryCov_9fa48("2139"), {
        component: stryMutAct_9fa48("2140") ? "" : (stryCov_9fa48("2140"), "popup"),
        operation: stryMutAct_9fa48("2141") ? "" : (stryCov_9fa48("2141"), "configLoad"),
        userMessage: stryMutAct_9fa48("2142") ? "" : (stryCov_9fa48("2142"), "Failed to load configuration")
      })),
      downloadInitiation: stryMutAct_9fa48("2143") ? () => undefined : (stryCov_9fa48("2143"), (url: string) => stryMutAct_9fa48("2144") ? {} : (stryCov_9fa48("2144"), {
        component: stryMutAct_9fa48("2145") ? "" : (stryCov_9fa48("2145"), "popup"),
        operation: stryMutAct_9fa48("2146") ? "" : (stryCov_9fa48("2146"), "downloadInitiation"),
        data: stryMutAct_9fa48("2147") ? {} : (stryCov_9fa48("2147"), {
          url
        }),
        userMessage: stryMutAct_9fa48("2148") ? "" : (stryCov_9fa48("2148"), "Failed to initiate download")
      }))
    }),
    options: stryMutAct_9fa48("2149") ? {} : (stryCov_9fa48("2149"), {
      configSave: stryMutAct_9fa48("2150") ? () => undefined : (stryCov_9fa48("2150"), (config: any) => stryMutAct_9fa48("2151") ? {} : (stryCov_9fa48("2151"), {
        component: stryMutAct_9fa48("2152") ? "" : (stryCov_9fa48("2152"), "options"),
        operation: stryMutAct_9fa48("2153") ? "" : (stryCov_9fa48("2153"), "configSave"),
        data: stryMutAct_9fa48("2154") ? {} : (stryCov_9fa48("2154"), {
          config
        }),
        userMessage: stryMutAct_9fa48("2155") ? "" : (stryCov_9fa48("2155"), "Failed to save configuration")
      })),
      historyLoad: stryMutAct_9fa48("2156") ? () => undefined : (stryCov_9fa48("2156"), () => stryMutAct_9fa48("2157") ? {} : (stryCov_9fa48("2157"), {
        component: stryMutAct_9fa48("2158") ? "" : (stryCov_9fa48("2158"), "options"),
        operation: stryMutAct_9fa48("2159") ? "" : (stryCov_9fa48("2159"), "historyLoad"),
        userMessage: stryMutAct_9fa48("2160") ? "" : (stryCov_9fa48("2160"), "Failed to load download history")
      })),
      themeUpdate: stryMutAct_9fa48("2161") ? () => undefined : (stryCov_9fa48("2161"), (theme: string) => stryMutAct_9fa48("2162") ? {} : (stryCov_9fa48("2162"), {
        component: stryMutAct_9fa48("2163") ? "" : (stryCov_9fa48("2163"), "options"),
        operation: stryMutAct_9fa48("2164") ? "" : (stryCov_9fa48("2164"), "themeUpdate"),
        data: stryMutAct_9fa48("2165") ? {} : (stryCov_9fa48("2165"), {
          theme
        }),
        userMessage: stryMutAct_9fa48("2166") ? "" : (stryCov_9fa48("2166"), "Failed to update theme")
      }))
    })
  });
}

// Export singleton instance
export const errorHandler = CentralizedErrorHandler.getInstance();