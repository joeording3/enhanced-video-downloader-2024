/**
 * DOM management utilities for the Enhanced Video Downloader extension.
 * Handles DOM manipulation, element queries, and UI interactions.
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
export interface DOMElement {
  id: string;
  selector: string;
  type: "id" | "class" | "attribute";
}
export interface DOMCache {
  [key: string]: HTMLElement | null;
}

/**
 * Centralized DOM Manager
 * Provides consistent DOM query patterns and caching
 */
export class DOMManager {
  private static instance: DOMManager;
  private cache: DOMCache = {};
  private selectors: Map<string, string> = new Map();
  private constructor() {
    if (stryMutAct_9fa48("1856")) {
      {}
    } else {
      stryCov_9fa48("1856");
      this.registerDefaultSelectors();
    }
  }

  /**
   * Get the singleton instance of the DOM manager
   */
  static getInstance(): DOMManager {
    if (stryMutAct_9fa48("1857")) {
      {}
    } else {
      stryCov_9fa48("1857");
      if (stryMutAct_9fa48("1860") ? false : stryMutAct_9fa48("1859") ? true : stryMutAct_9fa48("1858") ? DOMManager.instance : (stryCov_9fa48("1858", "1859", "1860"), !DOMManager.instance)) {
        if (stryMutAct_9fa48("1861")) {
          {}
        } else {
          stryCov_9fa48("1861");
          DOMManager.instance = new DOMManager();
        }
      }
      return DOMManager.instance;
    }
  }

  /**
   * Register default selectors used across the extension
   */
  private registerDefaultSelectors(): void {
    if (stryMutAct_9fa48("1862")) {
      {}
    } else {
      stryCov_9fa48("1862");
      // Popup selectors
      this.selectors.set(stryMutAct_9fa48("1863") ? "" : (stryCov_9fa48("1863"), "popup.status"), stryMutAct_9fa48("1864") ? "" : (stryCov_9fa48("1864"), "#status"));
      this.selectors.set(stryMutAct_9fa48("1865") ? "" : (stryCov_9fa48("1865"), "popup.history"), stryMutAct_9fa48("1866") ? "" : (stryCov_9fa48("1866"), "#history-items"));
      this.selectors.set(stryMutAct_9fa48("1867") ? "" : (stryCov_9fa48("1867"), "popup.downloadStatus"), stryMutAct_9fa48("1868") ? "" : (stryCov_9fa48("1868"), "#download-status"));
      this.selectors.set(stryMutAct_9fa48("1869") ? "" : (stryCov_9fa48("1869"), "popup.queue"), stryMutAct_9fa48("1870") ? "" : (stryCov_9fa48("1870"), "#download-queue"));
      this.selectors.set(stryMutAct_9fa48("1871") ? "" : (stryCov_9fa48("1871"), "popup.serverStatus"), stryMutAct_9fa48("1872") ? "" : (stryCov_9fa48("1872"), "#server-status-indicator"));
      this.selectors.set(stryMutAct_9fa48("1873") ? "" : (stryCov_9fa48("1873"), "popup.serverStatusText"), stryMutAct_9fa48("1874") ? "" : (stryCov_9fa48("1874"), "#server-status-text"));
      this.selectors.set(stryMutAct_9fa48("1875") ? "" : (stryCov_9fa48("1875"), "popup.pageInfo"), stryMutAct_9fa48("1876") ? "" : (stryCov_9fa48("1876"), "#page-info"));
      this.selectors.set(stryMutAct_9fa48("1877") ? "" : (stryCov_9fa48("1877"), "popup.disclaimer"), stryMutAct_9fa48("1878") ? "" : (stryCov_9fa48("1878"), "#disclaimer"));

      // Options selectors
      this.selectors.set(stryMutAct_9fa48("1879") ? "" : (stryCov_9fa48("1879"), "options.serverStatus"), stryMutAct_9fa48("1880") ? "" : (stryCov_9fa48("1880"), "#server-status-indicator"));
      this.selectors.set(stryMutAct_9fa48("1881") ? "" : (stryCov_9fa48("1881"), "options.serverStatusText"), stryMutAct_9fa48("1882") ? "" : (stryCov_9fa48("1882"), "#server-status-text"));
      this.selectors.set(stryMutAct_9fa48("1883") ? "" : (stryCov_9fa48("1883"), "options.searchInput"), stryMutAct_9fa48("1884") ? "" : (stryCov_9fa48("1884"), "#settings-search"));
      this.selectors.set(stryMutAct_9fa48("1885") ? "" : (stryCov_9fa48("1885"), "options.serverPort"), stryMutAct_9fa48("1886") ? "" : (stryCov_9fa48("1886"), "#server-port"));
      this.selectors.set(stryMutAct_9fa48("1887") ? "" : (stryCov_9fa48("1887"), "options.downloadDir"), stryMutAct_9fa48("1888") ? "" : (stryCov_9fa48("1888"), "#download-dir"));
      this.selectors.set(stryMutAct_9fa48("1889") ? "" : (stryCov_9fa48("1889"), "options.logLevel"), stryMutAct_9fa48("1890") ? "" : (stryCov_9fa48("1890"), "#log-level"));
      this.selectors.set(stryMutAct_9fa48("1891") ? "" : (stryCov_9fa48("1891"), "options.format"), stryMutAct_9fa48("1892") ? "" : (stryCov_9fa48("1892"), "#format"));
      this.selectors.set(stryMutAct_9fa48("1893") ? "" : (stryCov_9fa48("1893"), "options.logContainer"), stryMutAct_9fa48("1894") ? "" : (stryCov_9fa48("1894"), "#log-container"));
      this.selectors.set(stryMutAct_9fa48("1895") ? "" : (stryCov_9fa48("1895"), "options.logDisplay"), stryMutAct_9fa48("1896") ? "" : (stryCov_9fa48("1896"), "#log-display"));
      this.selectors.set(stryMutAct_9fa48("1897") ? "" : (stryCov_9fa48("1897"), "options.logViewerTextarea"), stryMutAct_9fa48("1898") ? "" : (stryCov_9fa48("1898"), "#logViewerTextarea"));

      // Content selectors
      this.selectors.set(stryMutAct_9fa48("1899") ? "" : (stryCov_9fa48("1899"), "content.video"), stryMutAct_9fa48("1900") ? "" : (stryCov_9fa48("1900"), 'video, iframe[src*="youtube.com"], iframe[src*="vimeo.com"]'));
      this.selectors.set(stryMutAct_9fa48("1901") ? "" : (stryCov_9fa48("1901"), "content.downloadButton"), stryMutAct_9fa48("1902") ? "" : (stryCov_9fa48("1902"), ".download-button"));
      this.selectors.set(stryMutAct_9fa48("1903") ? "" : (stryCov_9fa48("1903"), "content.dragHandle"), stryMutAct_9fa48("1904") ? "" : (stryCov_9fa48("1904"), ".evd-drag-handle"));

      // Common selectors
      this.selectors.set(stryMutAct_9fa48("1905") ? "" : (stryCov_9fa48("1905"), "common.container"), stryMutAct_9fa48("1906") ? "" : (stryCov_9fa48("1906"), ".container"));
      this.selectors.set(stryMutAct_9fa48("1907") ? "" : (stryCov_9fa48("1907"), "common.header"), stryMutAct_9fa48("1908") ? "" : (stryCov_9fa48("1908"), ".header"));
      this.selectors.set(stryMutAct_9fa48("1909") ? "" : (stryCov_9fa48("1909"), "common.button"), stryMutAct_9fa48("1910") ? "" : (stryCov_9fa48("1910"), "button"));
      this.selectors.set(stryMutAct_9fa48("1911") ? "" : (stryCov_9fa48("1911"), "common.input"), stryMutAct_9fa48("1912") ? "" : (stryCov_9fa48("1912"), "input"));
      this.selectors.set(stryMutAct_9fa48("1913") ? "" : (stryCov_9fa48("1913"), "common.select"), stryMutAct_9fa48("1914") ? "" : (stryCov_9fa48("1914"), "select"));
      this.selectors.set(stryMutAct_9fa48("1915") ? "" : (stryCov_9fa48("1915"), "common.textarea"), stryMutAct_9fa48("1916") ? "" : (stryCov_9fa48("1916"), "textarea"));
    }
  }

  /**
   * Register a new selector
   */
  registerSelector(key: string, selector: string): void {
    if (stryMutAct_9fa48("1917")) {
      {}
    } else {
      stryCov_9fa48("1917");
      this.selectors.set(key, selector);
    }
  }

  /**
   * Get an element by key (cached)
   */
  getElement(key: string): HTMLElement | null {
    if (stryMutAct_9fa48("1918")) {
      {}
    } else {
      stryCov_9fa48("1918");
      // Check cache first
      if (stryMutAct_9fa48("1921") ? this.cache[key] === undefined : stryMutAct_9fa48("1920") ? false : stryMutAct_9fa48("1919") ? true : (stryCov_9fa48("1919", "1920", "1921"), this.cache[key] !== undefined)) {
        if (stryMutAct_9fa48("1922")) {
          {}
        } else {
          stryCov_9fa48("1922");
          return this.cache[key];
        }
      }

      // Get selector
      const selector = this.selectors.get(key);
      if (stryMutAct_9fa48("1925") ? false : stryMutAct_9fa48("1924") ? true : stryMutAct_9fa48("1923") ? selector : (stryCov_9fa48("1923", "1924", "1925"), !selector)) {
        if (stryMutAct_9fa48("1926")) {
          {}
        } else {
          stryCov_9fa48("1926");
          console.warn(stryMutAct_9fa48("1927") ? `` : (stryCov_9fa48("1927"), `No selector registered for key: ${key}`));
          return null;
        }
      }

      // Query DOM
      const element = document.querySelector(selector) as HTMLElement | null;

      // Cache result (including null)
      this.cache[key] = element;
      return element;
    }
  }

  /**
   * Get multiple elements by key
   */
  getElements(key: string): HTMLElement[] {
    if (stryMutAct_9fa48("1928")) {
      {}
    } else {
      stryCov_9fa48("1928");
      const selector = this.selectors.get(key);
      if (stryMutAct_9fa48("1931") ? false : stryMutAct_9fa48("1930") ? true : stryMutAct_9fa48("1929") ? selector : (stryCov_9fa48("1929", "1930", "1931"), !selector)) {
        if (stryMutAct_9fa48("1932")) {
          {}
        } else {
          stryCov_9fa48("1932");
          console.warn(stryMutAct_9fa48("1933") ? `` : (stryCov_9fa48("1933"), `No selector registered for key: ${key}`));
          return stryMutAct_9fa48("1934") ? ["Stryker was here"] : (stryCov_9fa48("1934"), []);
        }
      }
      return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
    }
  }

  /**
   * Get an element by direct selector (not cached)
   */
  querySelector(selector: string): HTMLElement | null {
    if (stryMutAct_9fa48("1935")) {
      {}
    } else {
      stryCov_9fa48("1935");
      return document.querySelector(selector) as HTMLElement | null;
    }
  }

  /**
   * Get multiple elements by direct selector (not cached)
   */
  querySelectorAll(selector: string): HTMLElement[] {
    if (stryMutAct_9fa48("1936")) {
      {}
    } else {
      stryCov_9fa48("1936");
      return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
    }
  }

  /**
   * Create an element with specified tag and attributes
   */
  createElement(tag: string, attributes: Record<string, string> = {}, textContent?: string): HTMLElement {
    if (stryMutAct_9fa48("1937")) {
      {}
    } else {
      stryCov_9fa48("1937");
      const element = document.createElement(tag);

      // Set attributes
      for (const [key, value] of Object.entries(attributes)) {
        if (stryMutAct_9fa48("1938")) {
          {}
        } else {
          stryCov_9fa48("1938");
          element.setAttribute(key, value);
        }
      }

      // Set text content if provided
      if (stryMutAct_9fa48("1940") ? false : stryMutAct_9fa48("1939") ? true : (stryCov_9fa48("1939", "1940"), textContent)) {
        if (stryMutAct_9fa48("1941")) {
          {}
        } else {
          stryCov_9fa48("1941");
          element.textContent = textContent;
        }
      }
      return element;
    }
  }

  /**
   * Add event listener to an element
   */
  addEventListener(key: string, event: string, handler: EventListener): boolean {
    if (stryMutAct_9fa48("1942")) {
      {}
    } else {
      stryCov_9fa48("1942");
      const element = this.getElement(key);
      if (stryMutAct_9fa48("1945") ? false : stryMutAct_9fa48("1944") ? true : stryMutAct_9fa48("1943") ? element : (stryCov_9fa48("1943", "1944", "1945"), !element)) {
        if (stryMutAct_9fa48("1946")) {
          {}
        } else {
          stryCov_9fa48("1946");
          console.warn(stryMutAct_9fa48("1947") ? `` : (stryCov_9fa48("1947"), `Element not found for key: ${key}`));
          return stryMutAct_9fa48("1948") ? true : (stryCov_9fa48("1948"), false);
        }
      }
      element.addEventListener(event, handler);
      return stryMutAct_9fa48("1949") ? false : (stryCov_9fa48("1949"), true);
    }
  }

  /**
   * Remove event listener from an element
   */
  removeEventListener(key: string, event: string, handler: EventListener): boolean {
    if (stryMutAct_9fa48("1950")) {
      {}
    } else {
      stryCov_9fa48("1950");
      const element = this.getElement(key);
      if (stryMutAct_9fa48("1953") ? false : stryMutAct_9fa48("1952") ? true : stryMutAct_9fa48("1951") ? element : (stryCov_9fa48("1951", "1952", "1953"), !element)) {
        if (stryMutAct_9fa48("1954")) {
          {}
        } else {
          stryCov_9fa48("1954");
          return stryMutAct_9fa48("1955") ? true : (stryCov_9fa48("1955"), false);
        }
      }
      element.removeEventListener(event, handler);
      return stryMutAct_9fa48("1956") ? false : (stryCov_9fa48("1956"), true);
    }
  }

  /**
   * Set text content of an element
   */
  setTextContent(key: string, text: string): boolean {
    if (stryMutAct_9fa48("1957")) {
      {}
    } else {
      stryCov_9fa48("1957");
      const element = this.getElement(key);
      if (stryMutAct_9fa48("1960") ? false : stryMutAct_9fa48("1959") ? true : stryMutAct_9fa48("1958") ? element : (stryCov_9fa48("1958", "1959", "1960"), !element)) {
        if (stryMutAct_9fa48("1961")) {
          {}
        } else {
          stryCov_9fa48("1961");
          return stryMutAct_9fa48("1962") ? true : (stryCov_9fa48("1962"), false);
        }
      }
      element.textContent = text;
      return stryMutAct_9fa48("1963") ? false : (stryCov_9fa48("1963"), true);
    }
  }

  /**
   * Set inner HTML of an element
   */
  setInnerHTML(key: string, html: string): boolean {
    if (stryMutAct_9fa48("1964")) {
      {}
    } else {
      stryCov_9fa48("1964");
      const element = this.getElement(key);
      if (stryMutAct_9fa48("1967") ? false : stryMutAct_9fa48("1966") ? true : stryMutAct_9fa48("1965") ? element : (stryCov_9fa48("1965", "1966", "1967"), !element)) {
        if (stryMutAct_9fa48("1968")) {
          {}
        } else {
          stryCov_9fa48("1968");
          return stryMutAct_9fa48("1969") ? true : (stryCov_9fa48("1969"), false);
        }
      }
      element.innerHTML = html;
      return stryMutAct_9fa48("1970") ? false : (stryCov_9fa48("1970"), true);
    }
  }

  /**
   * Add CSS class to an element
   */
  addClass(key: string, className: string): boolean {
    if (stryMutAct_9fa48("1971")) {
      {}
    } else {
      stryCov_9fa48("1971");
      const element = this.getElement(key);
      if (stryMutAct_9fa48("1974") ? false : stryMutAct_9fa48("1973") ? true : stryMutAct_9fa48("1972") ? element : (stryCov_9fa48("1972", "1973", "1974"), !element)) {
        if (stryMutAct_9fa48("1975")) {
          {}
        } else {
          stryCov_9fa48("1975");
          return stryMutAct_9fa48("1976") ? true : (stryCov_9fa48("1976"), false);
        }
      }
      element.classList.add(className);
      return stryMutAct_9fa48("1977") ? false : (stryCov_9fa48("1977"), true);
    }
  }

  /**
   * Remove CSS class from an element
   */
  removeClass(key: string, className: string): boolean {
    if (stryMutAct_9fa48("1978")) {
      {}
    } else {
      stryCov_9fa48("1978");
      const element = this.getElement(key);
      if (stryMutAct_9fa48("1981") ? false : stryMutAct_9fa48("1980") ? true : stryMutAct_9fa48("1979") ? element : (stryCov_9fa48("1979", "1980", "1981"), !element)) {
        if (stryMutAct_9fa48("1982")) {
          {}
        } else {
          stryCov_9fa48("1982");
          return stryMutAct_9fa48("1983") ? true : (stryCov_9fa48("1983"), false);
        }
      }
      element.classList.remove(className);
      return stryMutAct_9fa48("1984") ? false : (stryCov_9fa48("1984"), true);
    }
  }

  /**
   * Toggle CSS class on an element
   */
  toggleClass(key: string, className: string): boolean {
    if (stryMutAct_9fa48("1985")) {
      {}
    } else {
      stryCov_9fa48("1985");
      const element = this.getElement(key);
      if (stryMutAct_9fa48("1988") ? false : stryMutAct_9fa48("1987") ? true : stryMutAct_9fa48("1986") ? element : (stryCov_9fa48("1986", "1987", "1988"), !element)) {
        if (stryMutAct_9fa48("1989")) {
          {}
        } else {
          stryCov_9fa48("1989");
          return stryMutAct_9fa48("1990") ? true : (stryCov_9fa48("1990"), false);
        }
      }
      element.classList.toggle(className);
      return stryMutAct_9fa48("1991") ? false : (stryCov_9fa48("1991"), true);
    }
  }

  /**
   * Check if element has CSS class
   */
  hasClass(key: string, className: string): boolean {
    if (stryMutAct_9fa48("1992")) {
      {}
    } else {
      stryCov_9fa48("1992");
      const element = this.getElement(key);
      if (stryMutAct_9fa48("1995") ? false : stryMutAct_9fa48("1994") ? true : stryMutAct_9fa48("1993") ? element : (stryCov_9fa48("1993", "1994", "1995"), !element)) {
        if (stryMutAct_9fa48("1996")) {
          {}
        } else {
          stryCov_9fa48("1996");
          return stryMutAct_9fa48("1997") ? true : (stryCov_9fa48("1997"), false);
        }
      }
      return element.classList.contains(className);
    }
  }

  /**
   * Set attribute on an element
   */
  setAttribute(key: string, attribute: string, value: string): boolean {
    if (stryMutAct_9fa48("1998")) {
      {}
    } else {
      stryCov_9fa48("1998");
      const element = this.getElement(key);
      if (stryMutAct_9fa48("2001") ? false : stryMutAct_9fa48("2000") ? true : stryMutAct_9fa48("1999") ? element : (stryCov_9fa48("1999", "2000", "2001"), !element)) {
        if (stryMutAct_9fa48("2002")) {
          {}
        } else {
          stryCov_9fa48("2002");
          return stryMutAct_9fa48("2003") ? true : (stryCov_9fa48("2003"), false);
        }
      }
      element.setAttribute(attribute, value);
      return stryMutAct_9fa48("2004") ? false : (stryCov_9fa48("2004"), true);
    }
  }

  /**
   * Get attribute from an element
   */
  getAttribute(key: string, attribute: string): string | null {
    if (stryMutAct_9fa48("2005")) {
      {}
    } else {
      stryCov_9fa48("2005");
      const element = this.getElement(key);
      if (stryMutAct_9fa48("2008") ? false : stryMutAct_9fa48("2007") ? true : stryMutAct_9fa48("2006") ? element : (stryCov_9fa48("2006", "2007", "2008"), !element)) {
        if (stryMutAct_9fa48("2009")) {
          {}
        } else {
          stryCov_9fa48("2009");
          return null;
        }
      }
      return element.getAttribute(attribute);
    }
  }

  /**
   * Remove attribute from an element
   */
  removeAttribute(key: string, attribute: string): boolean {
    if (stryMutAct_9fa48("2010")) {
      {}
    } else {
      stryCov_9fa48("2010");
      const element = this.getElement(key);
      if (stryMutAct_9fa48("2013") ? false : stryMutAct_9fa48("2012") ? true : stryMutAct_9fa48("2011") ? element : (stryCov_9fa48("2011", "2012", "2013"), !element)) {
        if (stryMutAct_9fa48("2014")) {
          {}
        } else {
          stryCov_9fa48("2014");
          return stryMutAct_9fa48("2015") ? true : (stryCov_9fa48("2015"), false);
        }
      }
      element.removeAttribute(attribute);
      return stryMutAct_9fa48("2016") ? false : (stryCov_9fa48("2016"), true);
    }
  }

  /**
   * Show an element (remove hidden class or style)
   */
  show(key: string): boolean {
    if (stryMutAct_9fa48("2017")) {
      {}
    } else {
      stryCov_9fa48("2017");
      const element = this.getElement(key);
      if (stryMutAct_9fa48("2020") ? false : stryMutAct_9fa48("2019") ? true : stryMutAct_9fa48("2018") ? element : (stryCov_9fa48("2018", "2019", "2020"), !element)) {
        if (stryMutAct_9fa48("2021")) {
          {}
        } else {
          stryCov_9fa48("2021");
          return stryMutAct_9fa48("2022") ? true : (stryCov_9fa48("2022"), false);
        }
      }
      element.style.display = stryMutAct_9fa48("2023") ? "Stryker was here!" : (stryCov_9fa48("2023"), "");
      element.classList.remove(stryMutAct_9fa48("2024") ? "" : (stryCov_9fa48("2024"), "hidden"));
      return stryMutAct_9fa48("2025") ? false : (stryCov_9fa48("2025"), true);
    }
  }

  /**
   * Hide an element (add hidden class or style)
   */
  hide(key: string): boolean {
    if (stryMutAct_9fa48("2026")) {
      {}
    } else {
      stryCov_9fa48("2026");
      const element = this.getElement(key);
      if (stryMutAct_9fa48("2029") ? false : stryMutAct_9fa48("2028") ? true : stryMutAct_9fa48("2027") ? element : (stryCov_9fa48("2027", "2028", "2029"), !element)) {
        if (stryMutAct_9fa48("2030")) {
          {}
        } else {
          stryCov_9fa48("2030");
          return stryMutAct_9fa48("2031") ? true : (stryCov_9fa48("2031"), false);
        }
      }
      element.style.display = stryMutAct_9fa48("2032") ? "" : (stryCov_9fa48("2032"), "none");
      element.classList.add(stryMutAct_9fa48("2033") ? "" : (stryCov_9fa48("2033"), "hidden"));
      return stryMutAct_9fa48("2034") ? false : (stryCov_9fa48("2034"), true);
    }
  }

  /**
   * Check if element is visible
   */
  isVisible(key: string): boolean {
    if (stryMutAct_9fa48("2035")) {
      {}
    } else {
      stryCov_9fa48("2035");
      const element = this.getElement(key);
      if (stryMutAct_9fa48("2038") ? false : stryMutAct_9fa48("2037") ? true : stryMutAct_9fa48("2036") ? element : (stryCov_9fa48("2036", "2037", "2038"), !element)) {
        if (stryMutAct_9fa48("2039")) {
          {}
        } else {
          stryCov_9fa48("2039");
          return stryMutAct_9fa48("2040") ? true : (stryCov_9fa48("2040"), false);
        }
      }
      return stryMutAct_9fa48("2043") ? element.style.display !== "none" || !element.classList.contains("hidden") : stryMutAct_9fa48("2042") ? false : stryMutAct_9fa48("2041") ? true : (stryCov_9fa48("2041", "2042", "2043"), (stryMutAct_9fa48("2045") ? element.style.display === "none" : stryMutAct_9fa48("2044") ? true : (stryCov_9fa48("2044", "2045"), element.style.display !== (stryMutAct_9fa48("2046") ? "" : (stryCov_9fa48("2046"), "none")))) && (stryMutAct_9fa48("2047") ? element.classList.contains("hidden") : (stryCov_9fa48("2047"), !element.classList.contains(stryMutAct_9fa48("2048") ? "" : (stryCov_9fa48("2048"), "hidden")))));
    }
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    if (stryMutAct_9fa48("2049")) {
      {}
    } else {
      stryCov_9fa48("2049");
      this.cache = {};
    }
  }

  /**
   * Clear cache for a specific key
   */
  clearCacheKey(key: string): void {
    if (stryMutAct_9fa48("2050")) {
      {}
    } else {
      stryCov_9fa48("2050");
      delete this.cache[key];
    }
  }

  /**
   * Get all registered selectors
   */
  getRegisteredSelectors(): string[] {
    if (stryMutAct_9fa48("2051")) {
      {}
    } else {
      stryCov_9fa48("2051");
      return Array.from(this.selectors.keys());
    }
  }

  /**
   * Check if a selector is registered
   */
  hasSelector(key: string): boolean {
    if (stryMutAct_9fa48("2052")) {
      {}
    } else {
      stryCov_9fa48("2052");
      return this.selectors.has(key);
    }
  }
}

// Export singleton instance
export const domManager = DOMManager.getInstance();