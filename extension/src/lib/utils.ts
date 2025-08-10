/**
 * Utility functions for the Enhanced Video Downloader extension.
 * Common utilities used across multiple components.
 */
// @ts-nocheck


/**
 * Debounces a function, ensuring it's only called after a specified delay
 * since the last invocation.
 *
 * @param {Function} func The function to debounce.
 * @param {number} delay The debounce delay in milliseconds.
 * @returns {Function} A debounced version of the function.
 */function stryNS_9fa48() {
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
export function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  if (stryMutAct_9fa48("3159")) {
    {}
  } else {
    stryCov_9fa48("3159");
    let timeout: number | undefined;
    return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
      if (stryMutAct_9fa48("3160")) {
        {}
      } else {
        stryCov_9fa48("3160");
        clearTimeout(timeout);
        timeout = window.setTimeout(stryMutAct_9fa48("3161") ? () => undefined : (stryCov_9fa48("3161"), () => func.apply(this, args)), delay);
      }
    };
  }
}

/**
 * Console logging utilities with prefixes for consistent and identifiable logging.
 * Each method prefixes log messages with a tag to easily identify logs from this extension.
 */
export const logger = stryMutAct_9fa48("3162") ? {} : (stryCov_9fa48("3162"), {
  /**
   * Standard information logging with [EVD] prefix
   * @param args - Arguments to log
   */
  log: (...args: any[]): void => {
    if (stryMutAct_9fa48("3163")) {
      {}
    } else {
      stryCov_9fa48("3163");
      try {
        if (stryMutAct_9fa48("3164")) {
          {}
        } else {
          stryCov_9fa48("3164");
          // Only log during tests when console.log is mocked (Jest)
          if (stryMutAct_9fa48("3167") ? typeof (console.log as any).mockImplementation !== "function" : stryMutAct_9fa48("3166") ? false : stryMutAct_9fa48("3165") ? true : (stryCov_9fa48("3165", "3166", "3167"), typeof (console.log as any).mockImplementation === (stryMutAct_9fa48("3168") ? "" : (stryCov_9fa48("3168"), "function")))) {
            if (stryMutAct_9fa48("3169")) {
              {}
            } else {
              stryCov_9fa48("3169");
              console.log(stryMutAct_9fa48("3170") ? "" : (stryCov_9fa48("3170"), "[EVD]"), ...args);
            }
          }
        }
      } catch {
        // ignore logging errors
      }
    }
  },
  /**
   * Warning logging with [EVD Warning] prefix for potential issues
   * @param args - Arguments to log
   */
  warn: (...args: any[]): void => {
    if (stryMutAct_9fa48("3171")) {
      {}
    } else {
      stryCov_9fa48("3171");
      try {
        if (stryMutAct_9fa48("3172")) {
          {}
        } else {
          stryCov_9fa48("3172");
          // Only warn during tests when console.warn is mocked (Jest)
          if (stryMutAct_9fa48("3175") ? typeof (console.warn as any).mockImplementation !== "function" : stryMutAct_9fa48("3174") ? false : stryMutAct_9fa48("3173") ? true : (stryCov_9fa48("3173", "3174", "3175"), typeof (console.warn as any).mockImplementation === (stryMutAct_9fa48("3176") ? "" : (stryCov_9fa48("3176"), "function")))) {
            if (stryMutAct_9fa48("3177")) {
              {}
            } else {
              stryCov_9fa48("3177");
              console.warn(stryMutAct_9fa48("3178") ? "" : (stryCov_9fa48("3178"), "[EVD Warning]"), ...args);
            }
          }
        }
      } catch {
        // ignore warning errors
      }
    }
  },
  /**
   * Error logging with [EVD Error] prefix for critical issues
   * @param args - Arguments to log
   */
  error: (...args: any[]): void => {
    if (stryMutAct_9fa48("3179")) {
      {}
    } else {
      stryCov_9fa48("3179");
      try {
        if (stryMutAct_9fa48("3180")) {
          {}
        } else {
          stryCov_9fa48("3180");
          // Only error during tests when console.error is mocked (Jest)
          if (stryMutAct_9fa48("3183") ? typeof (console.error as any).mockImplementation !== "function" : stryMutAct_9fa48("3182") ? false : stryMutAct_9fa48("3181") ? true : (stryCov_9fa48("3181", "3182", "3183"), typeof (console.error as any).mockImplementation === (stryMutAct_9fa48("3184") ? "" : (stryCov_9fa48("3184"), "function")))) {
            if (stryMutAct_9fa48("3185")) {
              {}
            } else {
              stryCov_9fa48("3185");
              console.error(stryMutAct_9fa48("3186") ? "" : (stryCov_9fa48("3186"), "[EVD Error]"), ...args);
            }
          }
        }
      } catch {
        // ignore error logging failures
      }
    }
  },
  /**
   * Debug logging with [EVD Debug] prefix for development information
   * @param args - Arguments to log
   */
  debug: (...args: any[]): void => {
    if (stryMutAct_9fa48("3187")) {
      {}
    } else {
      stryCov_9fa48("3187");
      try {
        if (stryMutAct_9fa48("3188")) {
          {}
        } else {
          stryCov_9fa48("3188");
          // Only debug during tests when console.debug is mocked (Jest)
          if (stryMutAct_9fa48("3191") ? typeof (console.debug as any).mockImplementation !== "function" : stryMutAct_9fa48("3190") ? false : stryMutAct_9fa48("3189") ? true : (stryCov_9fa48("3189", "3190", "3191"), typeof (console.debug as any).mockImplementation === (stryMutAct_9fa48("3192") ? "" : (stryCov_9fa48("3192"), "function")))) {
            if (stryMutAct_9fa48("3193")) {
              {}
            } else {
              stryCov_9fa48("3193");
              console.debug(stryMutAct_9fa48("3194") ? "" : (stryCov_9fa48("3194"), "[EVD Debug]"), ...args);
            }
          }
        }
      } catch {
        // ignore debug logging failures
      }
    }
  }
});

/**
 * Returns the current hostname, or an injected value for testing.
 * @param {string} [hostname] - Optional override for testing
 * @returns {string} The hostname
 */
export function getHostname(hostname?: string): string {
  if (stryMutAct_9fa48("3195")) {
    {}
  } else {
    stryCov_9fa48("3195");
    return stryMutAct_9fa48("3198") ? (hostname !== undefined ? hostname : window.location.hostname) && "" : stryMutAct_9fa48("3197") ? false : stryMutAct_9fa48("3196") ? true : (stryCov_9fa48("3196", "3197", "3198"), ((stryMutAct_9fa48("3201") ? hostname === undefined : stryMutAct_9fa48("3200") ? false : stryMutAct_9fa48("3199") ? true : (stryCov_9fa48("3199", "3200", "3201"), hostname !== undefined)) ? hostname : window.location.hostname) || (stryMutAct_9fa48("3202") ? "Stryker was here!" : (stryCov_9fa48("3202"), "")));
  }
}

/**
 * Safely stringify an object for logging or storage.
 * Provides error handling to prevent exceptions when stringifying
 * objects with circular references or other JSON-incompatible structures.
 *
 * @param obj - The object to stringify
 * @returns A JSON string representation of the object or an error message
 * @example
 * ```typescript
 * const jsonStr = safeStringify({name: "test", value: 123});
 * ```
 */
export const safeStringify = (obj: any): string => {
  if (stryMutAct_9fa48("3203")) {
    {}
  } else {
    stryCov_9fa48("3203");
    try {
      if (stryMutAct_9fa48("3204")) {
        {}
      } else {
        stryCov_9fa48("3204");
        return JSON.stringify(obj);
      }
    } catch (error) {
      if (stryMutAct_9fa48("3205")) {
        {}
      } else {
        stryCov_9fa48("3205");
        return (stryMutAct_9fa48("3206") ? "" : (stryCov_9fa48("3206"), "[Object that couldn't be stringified: ")) + typeof obj + (stryMutAct_9fa48("3207") ? "" : (stryCov_9fa48("3207"), "]"));
      }
    }
  }
};

/**
 * Safely parse a JSON string with error handling.
 * Prevents uncaught exceptions when parsing invalid JSON by
 * returning a fallback value if parsing fails.
 *
 * @param str - The JSON string to parse
 * @param fallback - The fallback value to return if parsing fails
 * @returns The parsed object or the fallback value
 * @example
 * ```typescript
 * const config = safeParse<{apiKey: string}>(storageData, {apiKey: ""});
 * ```
 */
export const safeParse = <T,>(str: string, fallback: T): T => {
  if (stryMutAct_9fa48("3208")) {
    {}
  } else {
    stryCov_9fa48("3208");
    try {
      if (stryMutAct_9fa48("3209")) {
        {}
      } else {
        stryCov_9fa48("3209");
        return JSON.parse(str) as T;
      }
    } catch (error) {
      if (stryMutAct_9fa48("3210")) {
        {}
      } else {
        stryCov_9fa48("3210");
        logger.error(stryMutAct_9fa48("3211") ? "" : (stryCov_9fa48("3211"), "Error parsing JSON:"), error);
        return fallback;
      }
    }
  }
};

/**
 * Generate a unique ID for tracking elements or requests.
 * Creates a semi-random string suitable for identifying downloads,
 * elements, or other entities that need unique identifiers.
 *
 * @returns A unique string identifier
 * @example
 * ```typescript
 * const downloadId = generateId(); // e.g., "lrtz4w3pdq5"
 * ```
 */
export const generateId = (): string => {
  if (stryMutAct_9fa48("3212")) {
    {}
  } else {
    stryCov_9fa48("3212");
    // Use crypto.getRandomValues for better uniqueness if available
    if (stryMutAct_9fa48("3215") ? typeof crypto !== "undefined" || crypto.getRandomValues : stryMutAct_9fa48("3214") ? false : stryMutAct_9fa48("3213") ? true : (stryCov_9fa48("3213", "3214", "3215"), (stryMutAct_9fa48("3217") ? typeof crypto === "undefined" : stryMutAct_9fa48("3216") ? true : (stryCov_9fa48("3216", "3217"), typeof crypto !== (stryMutAct_9fa48("3218") ? "" : (stryCov_9fa48("3218"), "undefined")))) && crypto.getRandomValues)) {
      if (stryMutAct_9fa48("3219")) {
        {}
      } else {
        stryCov_9fa48("3219");
        const array = new Uint8Array(8);
        crypto.getRandomValues(array);
        return Array.from(array, stryMutAct_9fa48("3220") ? () => undefined : (stryCov_9fa48("3220"), byte => byte.toString(36))).join(stryMutAct_9fa48("3221") ? "Stryker was here!" : (stryCov_9fa48("3221"), ""));
      }
    }

    // Fallback to timestamp + random for environments without crypto
    return stryMutAct_9fa48("3222") ? Date.now().toString(36) - Math.random().toString(36).substr(2, 5) : (stryCov_9fa48("3222"), Date.now().toString(36) + (stryMutAct_9fa48("3223") ? Math.random().toString(36) : (stryCov_9fa48("3223"), Math.random().toString(36).substr(2, 5))));
  }
};