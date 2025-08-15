/**
 * DOM management utilities for the Enhanced Video Downloader extension.
 * Handles DOM manipulation, element queries, and UI interactions.
 */

import { logger } from "./logger";

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
    this.registerDefaultSelectors();
  }

  /**
   * Get the singleton instance of the DOM manager
   */
  static getInstance(): DOMManager {
    if (!DOMManager.instance) {
      DOMManager.instance = new DOMManager();
    }
    return DOMManager.instance;
  }

  /**
   * Register default selectors used across the extension
   */
  private registerDefaultSelectors(): void {
    // Popup selectors
    this.selectors.set("popup.status", "#status");
    this.selectors.set("popup.history", "#history-items");
    this.selectors.set("popup.downloadStatus", "#download-status");
    this.selectors.set("popup.queue", "#download-queue");
    this.selectors.set("popup.serverStatus", "#server-status-indicator");
    this.selectors.set("popup.serverStatusText", "#server-status-text");
    this.selectors.set("popup.pageInfo", "#page-info");
    this.selectors.set("popup.disclaimer", "#disclaimer");

    // Options selectors
    this.selectors.set("options.serverStatus", "#server-status-indicator");
    this.selectors.set("options.serverStatusText", "#server-status-text");
    this.selectors.set("options.searchInput", "#settings-search");
    this.selectors.set("options.serverPort", "#server-port");
    this.selectors.set("options.downloadDir", "#download-dir");
    this.selectors.set("options.logLevel", "#log-level");
    this.selectors.set("options.format", "#format");
    this.selectors.set("options.logContainer", "#log-container");
    this.selectors.set("options.logDisplay", "#log-display");
    // textarea viewer removed; use #log-display only

    // Content selectors
    this.selectors.set(
      "content.video",
      // Reuse centralized selectors for consistency
      "video, " +
        'iframe[src*="youtube.com"], ' +
        'iframe[src*="youtube-nocookie.com"], ' +
        'iframe[src*="vimeo.com"], ' +
        'iframe[src*="player.vimeo.com"], ' +
        'iframe[src*="dailymotion.com"], ' +
        'iframe[src*="dmcdn.net"], ' +
        'iframe[src*="twitch.tv"], ' +
        'iframe[src*="player.twitch.tv"], ' +
        'iframe[src*="facebook.com/plugins/video"], ' +
        'iframe[src*="facebook.com/plugins/live"], ' +
        'iframe[src*="tiktok.com"], ' +
        'iframe[src*="twitter.com"], ' +
        'iframe[src*="x.com"], ' +
        'iframe[src*="redditmedia.com"], ' +
        'iframe[src*="reddit.com/media"], ' +
        'iframe[src*="streamable.com"], ' +
        'iframe[src*="wistia.com"], ' +
        'iframe[src*="fast.wistia.net"], ' +
        'iframe[src*="players.brightcove.net"], ' +
        'iframe[src*="jwplayer.com"], ' +
        'iframe[src*="cdn.jwplayer.com"], ' +
        'iframe[src*="player.videodelivery.net"], ' +
        'iframe[src*="w.soundcloud.com/player"], ' +
        'iframe[src*="pornhub.com"], ' +
        'iframe[src*="pornhubpremium.com"], ' +
        'iframe[src*="phncdn.com"], ' +
        'iframe[src*="redtube.com"], ' +
        'iframe[src*="youporn.com"], ' +
        'iframe[src*="ypncdn.com"], ' +
        'iframe[src*="xvideos.com"], ' +
        'iframe[src*="player.xvideos.com"], ' +
        'iframe[src*="xhamster.com"], ' +
        'iframe[src*="xhcdn.com"], ' +
        'iframe[src*="spankbang.com"], ' +
        'iframe[src*="spankwire.com"], ' +
        'iframe[src*="tube8.com"], ' +
        'iframe[src*="keezmovies.com"], ' +
        'iframe[src*="tnaflix.com"], ' +
        'iframe[src*="motherless.com"], ' +
        'iframe[src*="eporner.com"], ' +
        'iframe[src*="porntrex.com"], ' +
        'iframe[src*="youjizz.com"], ' +
        'iframe[src*="hclips.com"]'
    );
    this.selectors.set("content.downloadButton", ".download-button");
    this.selectors.set("content.dragHandle", ".evd-drag-handle");

    // Common selectors
    this.selectors.set("common.container", ".container");
    this.selectors.set("common.header", ".header");
    this.selectors.set("common.button", "button");
    this.selectors.set("common.input", "input");
    this.selectors.set("common.select", "select");
    this.selectors.set("common.textarea", "textarea");
  }

  /**
   * Register a new selector
   */
  registerSelector(key: string, selector: string): void {
    this.selectors.set(key, selector);
  }

  /**
   * Get an element by key (cached)
   */
  getElement(key: string): HTMLElement | null {
    // Validate key parameter
    if (!key || typeof key !== "string") {
      logger.warn(`Invalid key provided to getElement: ${key} (type: ${typeof key})`, {
        component: "dom-manager",
        operation: "getElement",
        data: { key, type: typeof key },
      });
      return null;
    }

    // Check cache first
    if (this.cache[key] !== undefined) {
      return this.cache[key];
    }

    // Get selector
    const selector = this.selectors.get(key);
    if (!selector) {
      logger.warn(`No selector registered for key: ${key}`, {
        component: "dom-manager",
        operation: "getElement",
        data: { key },
      });
      return null;
    }

    // Query DOM
    const element = document.querySelector(selector) as HTMLElement | null;

    // Cache result (including null)
    this.cache[key] = element;

    return element;
  }

  /**
   * Get multiple elements by key
   */
  getElements(key: string): HTMLElement[] {
    // Validate key parameter
    if (!key || typeof key !== "string") {
      logger.warn(`Invalid key provided to getElements: ${key} (type: ${typeof key})`, {
        component: "dom-manager",
        operation: "getElements",
        data: { key, type: typeof key },
      });
      return [];
    }

    const selector = this.selectors.get(key);
    if (!selector) {
      logger.warn(`No selector registered for key: ${key}`, {
        component: "dom-manager",
        operation: "getElements",
        data: { key },
      });
      return [];
    }

    return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  }

  /**
   * Get an element by direct selector (not cached)
   */
  querySelector(selector: string): HTMLElement | null {
    return document.querySelector(selector) as HTMLElement | null;
  }

  /**
   * Get multiple elements by direct selector (not cached)
   */
  querySelectorAll(selector: string): HTMLElement[] {
    return Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  }

  /**
   * Create an element with specified tag and attributes
   */
  createElement(
    tag: string,
    attributes: Record<string, string> = {},
    textContent?: string
  ): HTMLElement {
    const element = document.createElement(tag);

    // Set attributes
    for (const [key, value] of Object.entries(attributes)) {
      element.setAttribute(key, value);
    }

    // Set text content if provided
    if (textContent) {
      element.textContent = textContent;
    }

    return element;
  }

  /**
   * Add event listener to an element
   */
  addEventListener(key: string, event: string, handler: EventListener): boolean {
    // Validate key parameter
    if (!key || typeof key !== "string") {
      logger.warn(`Invalid key provided to addEventListener: ${key} (type: ${typeof key})`, {
        component: "dom-manager",
        operation: "addEventListener",
        data: { key, type: typeof key },
      });
      return false;
    }

    const element = this.getElement(key);
    if (!element) {
      logger.warn(`Element not found for key: ${key}`, {
        component: "dom-manager",
        operation: "addEventListener",
        data: { key },
      });
      return false;
    }

    element.addEventListener(event, handler);
    return true;
  }

  /**
   * Remove event listener from an element
   */
  removeEventListener(key: string, event: string, handler: EventListener): boolean {
    const element = this.getElement(key);
    if (!element) {
      return false;
    }

    element.removeEventListener(event, handler);
    return true;
  }

  /**
   * Set text content of an element
   */
  setTextContent(key: string, text: string): boolean {
    // Validate key parameter
    if (!key || typeof key !== "string") {
      logger.warn(`Invalid key provided to setTextContent: ${key} (type: ${typeof key})`, {
        component: "dom-manager",
        operation: "setTextContent",
        data: { key, type: typeof key },
      });
      return false;
    }

    const element = this.getElement(key);
    if (!element) {
      return false;
    }

    element.textContent = text;
    return true;
  }

  /**
   * Set inner HTML of an element
   */
  setInnerHTML(key: string, html: string): boolean {
    // Validate key parameter
    if (!key || typeof key !== "string") {
      logger.warn(`Invalid key provided to setInnerHTML: ${key} (type: ${typeof key})`, {
        component: "dom-manager",
        operation: "setInnerHTML",
        data: { key, type: typeof key },
      });
      return false;
    }

    const element = this.getElement(key);
    if (!element) {
      return false;
    }

    element.innerHTML = html;
    return true;
  }

  /**
   * Add CSS class to an element
   */
  addClass(key: string, className: string): boolean {
    // Validate key parameter
    if (!key || typeof key !== "string") {
      logger.warn(`Invalid key provided to addClass: ${key} (type: ${typeof key})`, {
        component: "dom-manager",
        operation: "addClass",
        data: { key, type: typeof key },
      });
      return false;
    }

    const element = this.getElement(key);
    if (!element) {
      return false;
    }

    element.classList.add(className);
    return true;
  }

  /**
   * Remove CSS class from an element
   */
  removeClass(key: string, className: string): boolean {
    // Validate key parameter
    if (!key || typeof key !== "string") {
      logger.warn(`Invalid key provided to removeClass: ${key} (type: ${typeof key})`, {
        component: "dom-manager",
        operation: "removeClass",
        data: { key, type: typeof key },
      });
      return false;
    }

    const element = this.getElement(key);
    if (!element) {
      return false;
    }

    element.classList.remove(className);
    return true;
  }

  /**
   * Toggle CSS class on an element
   */
  toggleClass(key: string, className: string): boolean {
    // Validate key parameter
    if (!key || typeof key !== "string") {
      logger.warn(`Invalid key provided to toggleClass: ${key} (type: ${typeof key})`, {
        component: "dom-manager",
        operation: "toggleClass",
        data: { key, type: typeof key },
      });
      return false;
    }

    const element = this.getElement(key);
    if (!element) {
      return false;
    }

    element.classList.toggle(className);
    return true;
  }

  /**
   * Check if element has CSS class
   */
  hasClass(key: string, className: string): boolean {
    // Validate key parameter
    if (!key || typeof key !== "string") {
      logger.warn(`Invalid key provided to hasClass: ${key} (type: ${typeof key})`, {
        component: "dom-manager",
        operation: "hasClass",
        data: { key, type: typeof key },
      });
      return false;
    }

    const element = this.getElement(key);
    if (!element) {
      return false;
    }

    return element.classList.contains(className);
  }

  /**
   * Set attribute on an element
   */
  setAttribute(key: string, attributeName: string, value: string): boolean {
    // Validate key parameter
    if (!key || typeof key !== "string") {
      logger.warn(`Invalid key provided to setAttribute: ${key} (type: ${typeof key})`, {
        component: "dom-manager",
        operation: "setAttribute",
        data: { key, type: typeof key },
      });
      return false;
    }

    const element = this.getElement(key);
    if (!element) {
      return false;
    }

    element.setAttribute(attributeName, value);
    return true;
  }

  /**
   * Get attribute from an element
   */
  getAttribute(key: string, attribute: string): string | null {
    const element = this.getElement(key);
    if (!element) {
      return null;
    }

    return element.getAttribute(attribute);
  }

  /**
   * Remove attribute from an element
   */
  removeAttribute(key: string, attribute: string): boolean {
    const element = this.getElement(key);
    if (!element) {
      return false;
    }

    element.removeAttribute(attribute);
    return true;
  }

  /**
   * Show an element (remove hidden class or style)
   */
  show(key: string): boolean {
    const element = this.getElement(key);
    if (!element) {
      return false;
    }

    element.style.display = "";
    element.classList.remove("hidden");
    return true;
  }

  /**
   * Hide an element (add hidden class or style)
   */
  hide(key: string): boolean {
    const element = this.getElement(key);
    if (!element) {
      return false;
    }

    element.style.display = "none";
    element.classList.add("hidden");
    return true;
  }

  /**
   * Check if element is visible
   */
  isVisible(key: string): boolean {
    const element = this.getElement(key);
    if (!element) {
      return false;
    }

    return element.style.display !== "none" && !element.classList.contains("hidden");
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache = {};
  }

  /**
   * Clear cache for a specific key
   */
  clearCacheKey(key: string): void {
    delete this.cache[key];
  }

  /**
   * Get all registered selectors
   */
  getRegisteredSelectors(): string[] {
    return Array.from(this.selectors.keys());
  }

  /**
   * Check if a selector is registered
   */
  hasSelector(key: string): boolean {
    return this.selectors.has(key);
  }
}

// Export singleton instance
export const domManager = DOMManager.getInstance();
