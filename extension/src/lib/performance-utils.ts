/**
 * Performance utilities for the Enhanced Video Downloader extension.
 * Provides performance monitoring and optimization tools.
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
export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
}

/**
 * Debounce function to limit execution frequency
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  if (stryMutAct_9fa48("3117")) {
    {}
  } else {
    stryCov_9fa48("3117");
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      if (stryMutAct_9fa48("3118")) {
        {}
      } else {
        stryCov_9fa48("3118");
        clearTimeout(timeoutId);
        timeoutId = setTimeout(stryMutAct_9fa48("3119") ? () => undefined : (stryCov_9fa48("3119"), () => func(...args)), wait);
      }
    };
  }
}

/**
 * Throttle function to limit execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => void {
  if (stryMutAct_9fa48("3120")) {
    {}
  } else {
    stryCov_9fa48("3120");
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (stryMutAct_9fa48("3121")) {
        {}
      } else {
        stryCov_9fa48("3121");
        if (stryMutAct_9fa48("3124") ? false : stryMutAct_9fa48("3123") ? true : stryMutAct_9fa48("3122") ? inThrottle : (stryCov_9fa48("3122", "3123", "3124"), !inThrottle)) {
          if (stryMutAct_9fa48("3125")) {
            {}
          } else {
            stryCov_9fa48("3125");
            func(...args);
            inThrottle = stryMutAct_9fa48("3126") ? false : (stryCov_9fa48("3126"), true);
            setTimeout(stryMutAct_9fa48("3127") ? () => undefined : (stryCov_9fa48("3127"), () => inThrottle = stryMutAct_9fa48("3128") ? true : (stryCov_9fa48("3128"), false)), limit);
          }
        }
      }
    };
  }
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(func: T): T {
  if (stryMutAct_9fa48("3129")) {
    {}
  } else {
    stryCov_9fa48("3129");
    const cache = new Map();
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  }
}

/**
 * Batch DOM operations
 */
export class DOMBatcher {
  private operations: (() => void)[] = stryMutAct_9fa48("3130") ? ["Stryker was here"] : (stryCov_9fa48("3130"), []);
  private scheduled = stryMutAct_9fa48("3131") ? true : (stryCov_9fa48("3131"), false);
  add(operation: () => void): void {
    if (stryMutAct_9fa48("3132")) {
      {}
    } else {
      stryCov_9fa48("3132");
      this.operations.push(operation);
      if (stryMutAct_9fa48("3135") ? false : stryMutAct_9fa48("3134") ? true : stryMutAct_9fa48("3133") ? this.scheduled : (stryCov_9fa48("3133", "3134", "3135"), !this.scheduled)) {
        if (stryMutAct_9fa48("3136")) {
          {}
        } else {
          stryCov_9fa48("3136");
          this.scheduled = stryMutAct_9fa48("3137") ? false : (stryCov_9fa48("3137"), true);
          requestAnimationFrame(stryMutAct_9fa48("3138") ? () => undefined : (stryCov_9fa48("3138"), () => this.flush()));
        }
      }
    }
  }
  private flush(): void {
    if (stryMutAct_9fa48("3139")) {
      {}
    } else {
      stryCov_9fa48("3139");
      this.operations.forEach(stryMutAct_9fa48("3140") ? () => undefined : (stryCov_9fa48("3140"), op => op()));
      this.operations = stryMutAct_9fa48("3141") ? ["Stryker was here"] : (stryCov_9fa48("3141"), []);
      this.scheduled = stryMutAct_9fa48("3142") ? true : (stryCov_9fa48("3142"), false);
    }
  }
}

/**
 * Cache for expensive operations
 */
export class Cache<T> {
  private cache = new Map<string, {
    value: T;
    timestamp: number;
  }>();
  private maxAge: number;
  constructor(maxAgeMs: number = stryMutAct_9fa48("3143") ? 5 * 60 / 1000 : (stryCov_9fa48("3143"), (stryMutAct_9fa48("3144") ? 5 / 60 : (stryCov_9fa48("3144"), 5 * 60)) * 1000)) {
    if (stryMutAct_9fa48("3145")) {
      {}
    } else {
      stryCov_9fa48("3145");
      this.maxAge = maxAgeMs;
    }
  }
  get(key: string): T | undefined {
    if (stryMutAct_9fa48("3146")) {
      {}
    } else {
      stryCov_9fa48("3146");
      const entry = this.cache.get(key);
      if (stryMutAct_9fa48("3149") ? false : stryMutAct_9fa48("3148") ? true : stryMutAct_9fa48("3147") ? entry : (stryCov_9fa48("3147", "3148", "3149"), !entry)) return undefined;
      if (stryMutAct_9fa48("3153") ? Date.now() - entry.timestamp <= this.maxAge : stryMutAct_9fa48("3152") ? Date.now() - entry.timestamp >= this.maxAge : stryMutAct_9fa48("3151") ? false : stryMutAct_9fa48("3150") ? true : (stryCov_9fa48("3150", "3151", "3152", "3153"), (stryMutAct_9fa48("3154") ? Date.now() + entry.timestamp : (stryCov_9fa48("3154"), Date.now() - entry.timestamp)) > this.maxAge)) {
        if (stryMutAct_9fa48("3155")) {
          {}
        } else {
          stryCov_9fa48("3155");
          this.cache.delete(key);
          return undefined;
        }
      }
      return entry.value;
    }
  }
  set(key: string, value: T): void {
    if (stryMutAct_9fa48("3156")) {
      {}
    } else {
      stryCov_9fa48("3156");
      this.cache.set(key, stryMutAct_9fa48("3157") ? {} : (stryCov_9fa48("3157"), {
        value,
        timestamp: Date.now()
      }));
    }
  }
  clear(): void {
    if (stryMutAct_9fa48("3158")) {
      {}
    } else {
      stryCov_9fa48("3158");
      this.cache.clear();
    }
  }
}