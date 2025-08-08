// @ts-nocheck
"use strict";
/**
 * Event Manager
 * Manages event listeners with automatic cleanup
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalEventManager = exports.EventManager = void 0;
class EventManager {
    constructor() {
        this.listeners = new Map();
        this.counter = 0;
    }
    addListener(element, type, handler, options) {
        const key = `${element.tagName}-${type}-${Date.now()}-${++this.counter}`;
        this.listeners.set(key, { element, type, handler });
        element.addEventListener(type, handler, options);
    }
    removeListener(key) {
        const listener = this.listeners.get(key);
        if (listener) {
            listener.element.removeEventListener(listener.type, listener.handler);
            this.listeners.delete(key);
        }
    }
    removeAllListeners() {
        this.listeners.forEach((listener, key) => {
            listener.element.removeEventListener(listener.type, listener.handler);
        });
        this.listeners.clear();
    }
    getListenerCount() {
        return this.listeners.size;
    }
}
exports.EventManager = EventManager;
// Global event manager instance
exports.globalEventManager = new EventManager();
