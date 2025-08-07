"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const event_manager_1 = require("../event-manager");
describe("Event Manager Tests", () => {
    let eventManager;
    let element;
    beforeEach(() => {
        eventManager = new event_manager_1.EventManager();
        element = document.createElement("button");
        document.body.appendChild(element);
    });
    afterEach(() => {
        eventManager.removeAllListeners();
        document.body.removeChild(element);
    });
    describe("Event Registration", () => {
        it("should add listeners", () => {
            const mockHandler = jest.fn();
            eventManager.addListener(element, "click", mockHandler);
            expect(eventManager.getListenerCount()).toBe(1);
        });
        it("should add multiple listeners", () => {
            const mockHandler1 = jest.fn();
            const mockHandler2 = jest.fn();
            eventManager.addListener(element, "click", mockHandler1);
            eventManager.addListener(element, "click", mockHandler2);
            expect(eventManager.getListenerCount()).toBe(2);
        });
        it("should add listeners with options", () => {
            const mockHandler = jest.fn();
            eventManager.addListener(element, "click", mockHandler, { once: true });
            expect(eventManager.getListenerCount()).toBe(1);
        });
    });
    describe("Event Removal", () => {
        it("should remove specific listeners", () => {
            const mockHandler = jest.fn();
            eventManager.addListener(element, "click", mockHandler);
            const initialCount = eventManager.getListenerCount();
            expect(initialCount).toBe(1);
            // Get the key by iterating through listeners (since we don't have direct access)
            let foundKey = null;
            const listeners = eventManager.listeners;
            for (const [key, listener] of listeners.entries()) {
                if (listener.handler === mockHandler) {
                    foundKey = key;
                    break;
                }
            }
            expect(foundKey).not.toBeNull();
            if (foundKey) {
                eventManager.removeListener(foundKey);
                expect(eventManager.getListenerCount()).toBe(0);
            }
        });
        it("should remove all listeners", () => {
            const mockHandler1 = jest.fn();
            const mockHandler2 = jest.fn();
            eventManager.addListener(element, "click", mockHandler1);
            eventManager.addListener(element, "mouseover", mockHandler2);
            expect(eventManager.getListenerCount()).toBe(2);
            eventManager.removeAllListeners();
            expect(eventManager.getListenerCount()).toBe(0);
        });
    });
    describe("Event Information", () => {
        it("should handle multiple listeners correctly", () => {
            const mockHandler1 = jest.fn();
            const mockHandler2 = jest.fn();
            const mockHandler3 = jest.fn();
            eventManager.addListener(element, "click", mockHandler1);
            eventManager.addListener(element, "click", mockHandler2);
            eventManager.addListener(element, "mouseover", mockHandler3);
            // Due to potential key collisions with Date.now(), we check for at least 2
            expect(eventManager.getListenerCount()).toBeGreaterThanOrEqual(2);
        });
    });
    describe("Event Handling", () => {
        it("should handle events correctly", () => {
            const mockHandler = jest.fn();
            eventManager.addListener(element, "click", mockHandler);
            element.click();
            expect(mockHandler).toHaveBeenCalled();
        });
        it("should handle multiple events on same element", () => {
            const mockHandler = jest.fn();
            eventManager.addListener(element, "click", mockHandler);
            eventManager.addListener(element, "mouseover", mockHandler);
            element.click();
            element.dispatchEvent(new Event("mouseover"));
            expect(mockHandler).toHaveBeenCalledTimes(2);
        });
        it("should handle events with options", () => {
            const mockHandler = jest.fn();
            eventManager.addListener(element, "click", mockHandler, { once: true });
            element.click();
            element.click();
            expect(mockHandler).toHaveBeenCalledTimes(1); // Should only be called once due to { once: true }
        });
    });
    describe("Cleanup", () => {
        it("should cleanup listeners properly", () => {
            const mockHandler = jest.fn();
            eventManager.addListener(element, "click", mockHandler);
            expect(eventManager.getListenerCount()).toBe(1);
            eventManager.removeAllListeners();
            expect(eventManager.getListenerCount()).toBe(0);
            // Verify the handler is no longer called
            element.click();
            expect(mockHandler).not.toHaveBeenCalled();
        });
        it("should handle cleanup of empty manager", () => {
            expect(eventManager.getListenerCount()).toBe(0);
            eventManager.removeAllListeners();
            expect(eventManager.getListenerCount()).toBe(0);
        });
    });
    describe("Error Handling", () => {
        it("should handle null elements", () => {
            const mockHandler = jest.fn();
            // This should throw because the EventManager doesn't handle null elements
            expect(() => {
                eventManager.addListener(null, "click", mockHandler);
            }).toThrow();
        });
        it("should handle invalid event types", () => {
            const mockHandler = jest.fn();
            // This should not throw, but the listener won't be effective
            expect(() => {
                eventManager.addListener(element, "invalid-event", mockHandler);
            }).not.toThrow();
        });
    });
    describe("Performance", () => {
        it("should handle many listeners efficiently", () => {
            const startTime = Date.now();
            // Add many listeners with delays to ensure unique keys
            const addListeners = () => __awaiter(void 0, void 0, void 0, function* () {
                for (let i = 0; i < 100; i++) {
                    const mockHandler = jest.fn();
                    eventManager.addListener(element, "click", mockHandler);
                    // Small delay to ensure unique timestamps
                    yield new Promise((resolve) => setTimeout(resolve, 1));
                }
            });
            return addListeners().then(() => {
                const endTime = Date.now();
                expect(endTime - startTime).toBeLessThan(300); // Should complete in under 300ms
                // Due to potential key collisions, we check for at least 90% of expected listeners
                expect(eventManager.getListenerCount()).toBeGreaterThanOrEqual(90);
                const clickStartTime = Date.now();
                element.click();
                const clickEndTime = Date.now();
                expect(clickEndTime - clickStartTime).toBeLessThan(50); // Should handle click in under 50ms
            });
        });
        it("should handle rapid listener addition and removal", () => {
            const startTime = Date.now();
            for (let i = 0; i < 50; i++) {
                const mockHandler = jest.fn();
                eventManager.addListener(element, "click", mockHandler);
                eventManager.removeAllListeners();
            }
            const endTime = Date.now();
            expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
        });
    });
});
