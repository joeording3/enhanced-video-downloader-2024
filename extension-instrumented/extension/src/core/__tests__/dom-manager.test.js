"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dom_manager_1 = require("../dom-manager");
describe("DOM Manager Tests", () => {
    let domManager;
    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = `
      <div id="test-container">
        <button id="test-button">Test Button</button>
        <input id="test-input" type="text" value="test" />
        <div id="test-content">
          <p>Test content</p>
        </div>
      </div>
    `;
        domManager = dom_manager_1.DOMManager.getInstance();
    });
    afterEach(() => {
        document.body.innerHTML = "";
        domManager.clearCache();
    });
    describe("Element Queries", () => {
        it("should get element by key", () => {
            domManager.registerSelector("test-button", "#test-button");
            const element = domManager.getElement("test-button");
            expect(element).toBeInstanceOf(HTMLButtonElement);
            expect(element === null || element === void 0 ? void 0 : element.id).toBe("test-button");
        });
        it("should get multiple elements by key", () => {
            domManager.registerSelector("buttons", "button");
            const elements = domManager.getElements("buttons");
            expect(elements).toHaveLength(1);
            expect(elements[0]).toBeInstanceOf(HTMLButtonElement);
        });
        it("should query selector directly", () => {
            const element = domManager.querySelector("#test-button");
            expect(element).toBeInstanceOf(HTMLButtonElement);
            expect(element === null || element === void 0 ? void 0 : element.id).toBe("test-button");
        });
        it("should query all elements with selector", () => {
            const elements = domManager.querySelectorAll("button");
            expect(elements).toHaveLength(1);
            expect(elements[0]).toBeInstanceOf(HTMLButtonElement);
        });
        it("should return null for non-existent elements", () => {
            const element = domManager.querySelector("#non-existent");
            expect(element).toBeNull();
        });
    });
    describe("Element Creation", () => {
        it("should create elements with attributes", () => {
            const element = domManager.createElement("div", {
                id: "new-element",
                class: "test-class",
            }, "Test content");
            expect(element).toBeInstanceOf(HTMLDivElement);
            expect(element.id).toBe("new-element");
            expect(element.classList.contains("test-class")).toBe(true);
            expect(element.textContent).toBe("Test content");
        });
        it("should create elements without attributes", () => {
            const element = domManager.createElement("span");
            expect(element).toBeInstanceOf(HTMLSpanElement);
        });
    });
    describe("Event Handling", () => {
        it("should add event listeners", () => {
            const button = document.getElementById("test-button");
            const mockHandler = jest.fn();
            const success = domManager.addEventListener("test-button", "click", mockHandler);
            expect(success).toBe(true);
            button.click();
            expect(mockHandler).toHaveBeenCalled();
        });
        it("should remove event listeners", () => {
            const button = document.getElementById("test-button");
            const mockHandler = jest.fn();
            domManager.addEventListener("test-button", "click", mockHandler);
            const success = domManager.removeEventListener("test-button", "click", mockHandler);
            expect(success).toBe(true);
            button.click();
            expect(mockHandler).not.toHaveBeenCalled();
        });
        it("should handle non-existent elements", () => {
            const mockHandler = jest.fn();
            const success = domManager.addEventListener("non-existent", "click", mockHandler);
            expect(success).toBe(false);
        });
    });
    describe("Content Manipulation", () => {
        it("should set text content", () => {
            const success = domManager.setTextContent("test-button", "New Text");
            expect(success).toBe(true);
            const button = document.getElementById("test-button");
            expect(button === null || button === void 0 ? void 0 : button.textContent).toBe("New Text");
        });
        it("should set inner HTML", () => {
            domManager.registerSelector("test-content", "#test-content");
            const success = domManager.setInnerHTML("test-content", "<span>New content</span>");
            expect(success).toBe(true);
            const container = document.getElementById("test-content");
            expect(container === null || container === void 0 ? void 0 : container.innerHTML).toBe("<span>New content</span>");
        });
        it("should handle non-existent elements for content", () => {
            const success = domManager.setTextContent("non-existent", "text");
            expect(success).toBe(false);
        });
    });
    describe("Class Management", () => {
        it("should add classes", () => {
            const success = domManager.addClass("test-button", "active");
            expect(success).toBe(true);
            const button = document.getElementById("test-button");
            expect(button === null || button === void 0 ? void 0 : button.classList.contains("active")).toBe(true);
        });
        it("should remove classes", () => {
            const button = document.getElementById("test-button");
            button.classList.add("active");
            const success = domManager.removeClass("test-button", "active");
            expect(success).toBe(true);
            expect(button.classList.contains("active")).toBe(false);
        });
        it("should toggle classes", () => {
            const success1 = domManager.toggleClass("test-button", "active");
            expect(success1).toBe(true);
            const button = document.getElementById("test-button");
            expect(button === null || button === void 0 ? void 0 : button.classList.contains("active")).toBe(true);
            const success2 = domManager.toggleClass("test-button", "active");
            expect(success2).toBe(true);
            expect(button === null || button === void 0 ? void 0 : button.classList.contains("active")).toBe(false);
        });
        it("should check if element has class", () => {
            const button = document.getElementById("test-button");
            button.classList.add("active");
            const hasClass = domManager.hasClass("test-button", "active");
            expect(hasClass).toBe(true);
        });
    });
    describe("Attribute Management", () => {
        it("should set attributes", () => {
            const success = domManager.setAttribute("test-button", "data-test", "value");
            expect(success).toBe(true);
            const button = document.getElementById("test-button");
            expect(button === null || button === void 0 ? void 0 : button.getAttribute("data-test")).toBe("value");
        });
        it("should get attributes", () => {
            const button = document.getElementById("test-button");
            button.setAttribute("data-test", "value");
            const value = domManager.getAttribute("test-button", "data-test");
            expect(value).toBe("value");
        });
        it("should remove attributes", () => {
            const button = document.getElementById("test-button");
            button.setAttribute("data-test", "value");
            const success = domManager.removeAttribute("test-button", "data-test");
            expect(success).toBe(true);
            expect(button.hasAttribute("data-test")).toBe(false);
        });
    });
    describe("Visibility Management", () => {
        it("should show elements", () => {
            const button = document.getElementById("test-button");
            button.style.display = "none";
            const success = domManager.show("test-button");
            expect(success).toBe(true);
            expect(button.style.display).not.toBe("none");
        });
        it("should hide elements", () => {
            const success = domManager.hide("test-button");
            expect(success).toBe(true);
            const button = document.getElementById("test-button");
            expect(button === null || button === void 0 ? void 0 : button.style.display).toBe("none");
        });
        it("should check visibility", () => {
            const isVisible = domManager.isVisible("test-button");
            expect(isVisible).toBe(true);
        });
    });
    describe("Cache Management", () => {
        it("should cache elements", () => {
            domManager.registerSelector("test-button", "#test-button");
            // First call should cache
            const element1 = domManager.getElement("test-button");
            const element2 = domManager.getElement("test-button");
            expect(element1).toBe(element2); // Same reference due to caching
        });
        it("should clear cache", () => {
            domManager.registerSelector("test-button", "#test-button");
            domManager.getElement("test-button");
            domManager.clearCache();
            const selectors = domManager.getRegisteredSelectors();
            expect(selectors).toContain("test-button");
        });
        it("should clear specific cache key", () => {
            domManager.registerSelector("test-button", "#test-button");
            domManager.getElement("test-button");
            domManager.clearCacheKey("test-button");
            // Cache should be cleared for this key
            const element = domManager.getElement("test-button");
            expect(element).toBeInstanceOf(HTMLButtonElement);
        });
    });
    describe("Selector Management", () => {
        it("should register selectors", () => {
            domManager.registerSelector("custom-element", "#test-button");
            const hasSelector = domManager.hasSelector("custom-element");
            expect(hasSelector).toBe(true);
        });
        it("should get registered selectors", () => {
            const selectors = domManager.getRegisteredSelectors();
            expect(selectors).toContain("popup.status");
            expect(selectors).toContain("options.serverStatus");
            expect(selectors).toContain("content.video");
        });
        it("should check if selector exists", () => {
            const hasSelector = domManager.hasSelector("popup.status");
            expect(hasSelector).toBe(true);
        });
    });
    describe("Error Handling", () => {
        it("should handle non-existent elements gracefully", () => {
            const element = domManager.getElement("non-existent");
            expect(element).toBeNull();
        });
        it("should handle operations on non-existent elements", () => {
            const success = domManager.setTextContent("non-existent", "text");
            expect(success).toBe(false);
        });
        it("should handle invalid selectors", () => {
            const element = domManager.querySelector("invalid[selector");
            expect(element).toBeNull();
        });
    });
    describe("Default Selectors", () => {
        it("should have popup selectors registered", () => {
            const hasPopupStatus = domManager.hasSelector("popup.status");
            const hasPopupHistory = domManager.hasSelector("popup.history");
            expect(hasPopupStatus).toBe(true);
            expect(hasPopupHistory).toBe(true);
        });
        it("should have options selectors registered", () => {
            const hasOptionsServerStatus = domManager.hasSelector("options.serverStatus");
            const hasOptionsServerPort = domManager.hasSelector("options.serverPort");
            expect(hasOptionsServerStatus).toBe(true);
            expect(hasOptionsServerPort).toBe(true);
        });
        it("should have content selectors registered", () => {
            const hasContentVideo = domManager.hasSelector("content.video");
            const hasContentDownloadButton = domManager.hasSelector("content.downloadButton");
            expect(hasContentVideo).toBe(true);
            expect(hasContentDownloadButton).toBe(true);
        });
    });
});
