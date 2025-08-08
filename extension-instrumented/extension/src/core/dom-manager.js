"use strict";
/**
 * Enhanced Video Downloader - Centralized DOM Manager
 * Provides a single source of truth for all DOM operations
 */
// @ts-nocheck
Object.defineProperty(exports, "__esModule", { value: true });
exports.domManager = exports.DOMManager = void 0;
/**
 * Centralized DOM Manager
 * Provides consistent DOM query patterns and caching
 */
class DOMManager {
    constructor() {
        this.cache = {};
        this.selectors = new Map();
        this.registerDefaultSelectors();
    }
    /**
     * Get the singleton instance of the DOM manager
     */
    static getInstance() {
        if (!DOMManager.instance) {
            DOMManager.instance = new DOMManager();
        }
        return DOMManager.instance;
    }
    /**
     * Register default selectors used across the extension
     */
    registerDefaultSelectors() {
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
        this.selectors.set("options.logViewerTextarea", "#logViewerTextarea");
        // Content selectors
        this.selectors.set("content.video", 'video, iframe[src*="youtube.com"], iframe[src*="vimeo.com"]');
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
    registerSelector(key, selector) {
        this.selectors.set(key, selector);
    }
    /**
     * Get an element by key (cached)
     */
    getElement(key) {
        // Check cache first
        if (this.cache[key] !== undefined) {
            return this.cache[key];
        }
        // Get selector
        const selector = this.selectors.get(key);
        if (!selector) {
            console.warn(`No selector registered for key: ${key}`);
            return null;
        }
        // Query DOM
        const element = document.querySelector(selector);
        // Cache result (including null)
        this.cache[key] = element;
        return element;
    }
    /**
     * Get multiple elements by key
     */
    getElements(key) {
        const selector = this.selectors.get(key);
        if (!selector) {
            console.warn(`No selector registered for key: ${key}`);
            return [];
        }
        return Array.from(document.querySelectorAll(selector));
    }
    /**
     * Get an element by direct selector (not cached)
     */
    querySelector(selector) {
        return document.querySelector(selector);
    }
    /**
     * Get multiple elements by direct selector (not cached)
     */
    querySelectorAll(selector) {
        return Array.from(document.querySelectorAll(selector));
    }
    /**
     * Create an element with specified tag and attributes
     */
    createElement(tag, attributes = {}, textContent) {
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
    addEventListener(key, event, handler) {
        const element = this.getElement(key);
        if (!element) {
            console.warn(`Element not found for key: ${key}`);
            return false;
        }
        element.addEventListener(event, handler);
        return true;
    }
    /**
     * Remove event listener from an element
     */
    removeEventListener(key, event, handler) {
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
    setTextContent(key, text) {
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
    setInnerHTML(key, html) {
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
    addClass(key, className) {
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
    removeClass(key, className) {
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
    toggleClass(key, className) {
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
    hasClass(key, className) {
        const element = this.getElement(key);
        if (!element) {
            return false;
        }
        return element.classList.contains(className);
    }
    /**
     * Set attribute on an element
     */
    setAttribute(key, attribute, value) {
        const element = this.getElement(key);
        if (!element) {
            return false;
        }
        element.setAttribute(attribute, value);
        return true;
    }
    /**
     * Get attribute from an element
     */
    getAttribute(key, attribute) {
        const element = this.getElement(key);
        if (!element) {
            return null;
        }
        return element.getAttribute(attribute);
    }
    /**
     * Remove attribute from an element
     */
    removeAttribute(key, attribute) {
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
    show(key) {
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
    hide(key) {
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
    isVisible(key) {
        const element = this.getElement(key);
        if (!element) {
            return false;
        }
        return element.style.display !== "none" && !element.classList.contains("hidden");
    }
    /**
     * Clear the cache
     */
    clearCache() {
        this.cache = {};
    }
    /**
     * Clear cache for a specific key
     */
    clearCacheKey(key) {
        delete this.cache[key];
    }
    /**
     * Get all registered selectors
     */
    getRegisteredSelectors() {
        return Array.from(this.selectors.keys());
    }
    /**
     * Check if a selector is registered
     */
    hasSelector(key) {
        return this.selectors.has(key);
    }
}
exports.DOMManager = DOMManager;
// Export singleton instance
exports.domManager = DOMManager.getInstance();
