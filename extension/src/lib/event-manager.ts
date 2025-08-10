/**
 * Event management utilities for the Enhanced Video Downloader extension.
 * Handles event binding, unbinding, and event delegation.
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
export interface EventHandler {
  element: Element;
  type: string;
  handler: EventListener;
}
export class EventManager {
  private listeners: Map<string, EventHandler> = new Map();
  private counter = 0;
  addListener(element: Element, type: string, handler: EventListener, options?: AddEventListenerOptions): void {
    if (stryMutAct_9fa48("3106")) {
      {}
    } else {
      stryCov_9fa48("3106");
      const key = stryMutAct_9fa48("3107") ? `` : (stryCov_9fa48("3107"), `${element.tagName}-${type}-${Date.now()}-${stryMutAct_9fa48("3108") ? --this.counter : (stryCov_9fa48("3108"), ++this.counter)}`);
      this.listeners.set(key, stryMutAct_9fa48("3109") ? {} : (stryCov_9fa48("3109"), {
        element,
        type,
        handler
      }));
      element.addEventListener(type, handler, options);
    }
  }
  removeListener(key: string): void {
    if (stryMutAct_9fa48("3110")) {
      {}
    } else {
      stryCov_9fa48("3110");
      const listener = this.listeners.get(key);
      if (stryMutAct_9fa48("3112") ? false : stryMutAct_9fa48("3111") ? true : (stryCov_9fa48("3111", "3112"), listener)) {
        if (stryMutAct_9fa48("3113")) {
          {}
        } else {
          stryCov_9fa48("3113");
          listener.element.removeEventListener(listener.type, listener.handler);
          this.listeners.delete(key);
        }
      }
    }
  }
  removeAllListeners(): void {
    if (stryMutAct_9fa48("3114")) {
      {}
    } else {
      stryCov_9fa48("3114");
      this.listeners.forEach((listener, key) => {
        if (stryMutAct_9fa48("3115")) {
          {}
        } else {
          stryCov_9fa48("3115");
          listener.element.removeEventListener(listener.type, listener.handler);
        }
      });
      this.listeners.clear();
    }
  }
  getListenerCount(): number {
    if (stryMutAct_9fa48("3116")) {
      {}
    } else {
      stryCov_9fa48("3116");
      return this.listeners.size;
    }
  }
}

// Global event manager instance
export const globalEventManager = new EventManager();