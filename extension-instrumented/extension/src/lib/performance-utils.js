"use strict";
/**
 * Performance Utilities
 * Optimized functions for better performance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = exports.DOMBatcher = void 0;
exports.debounce = debounce;
exports.throttle = throttle;
exports.memoize = memoize;
/**
 * Debounce function to limit execution frequency
 */
function debounce(func, wait) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), wait);
    };
}
/**
 * Throttle function to limit execution frequency
 */
function throttle(func, limit) {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
/**
 * Memoize function results
 */
function memoize(func) {
    const cache = new Map();
    return ((...args) => {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = func(...args);
        cache.set(key, result);
        return result;
    });
}
/**
 * Batch DOM operations
 */
class DOMBatcher {
    constructor() {
        this.operations = [];
        this.scheduled = false;
    }
    add(operation) {
        this.operations.push(operation);
        if (!this.scheduled) {
            this.scheduled = true;
            requestAnimationFrame(() => this.flush());
        }
    }
    flush() {
        this.operations.forEach(op => op());
        this.operations = [];
        this.scheduled = false;
    }
}
exports.DOMBatcher = DOMBatcher;
/**
 * Cache for expensive operations
 */
class Cache {
    constructor(maxAgeMs = 5 * 60 * 1000) {
        this.cache = new Map();
        this.maxAge = maxAgeMs;
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return undefined;
        if (Date.now() - entry.timestamp > this.maxAge) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    }
    set(key, value) {
        this.cache.set(key, { value, timestamp: Date.now() });
    }
    clear() {
        this.cache.clear();
    }
}
exports.Cache = Cache;
