// @ts-nocheck
"use strict";
/**
 * Tests for advanced popup UI functionality.
 *
 * Covers: configuration loading, display updates, error handling,
 * list item creation, and user interaction elements.
 *
 * Tests both successful and error scenarios for popup UI components.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
/* eslint-env jest */
const popup = __importStar(require("../../extension/src/popup"));
describe("loadConfig", () => {
    beforeEach(() => {
        global.chrome = {
            runtime: {
                lastError: undefined,
                sendMessage: jest.fn((msg, cb) => cb({ serverConfig: { test: true } })),
            },
            storage: { local: { get: jest.fn() } },
        };
    });
    it("resolves serverConfig on success", () => __awaiter(void 0, void 0, void 0, function* () {
        const cfg = yield popup.loadConfig();
        expect(cfg).toEqual({ test: true });
    }));
    it("falls back to storage when runtime.lastError set", () => __awaiter(void 0, void 0, void 0, function* () {
        global.chrome.runtime.lastError = { message: "err" };
        global.chrome.storage.local.get = jest.fn((keys, cb) => cb({ extensionConfig: { foo: "bar" } }));
        const cfg = yield popup.loadConfig();
        expect(cfg).toEqual({ foo: "bar" });
    }));
});
describe("updateDownloadDirDisplay", () => {
    it("no-op when element missing", () => __awaiter(void 0, void 0, void 0, function* () {
        document.body.innerHTML = "";
        yield expect(popup.updateDownloadDirDisplay()).resolves.toBeUndefined();
    }));
    it("updates text when element present", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        document.body.innerHTML = '<div id="download-dir-display"></div>';
        // Stub chrome to force storage fallback with download_dir
        global.chrome = {
            runtime: {
                lastError: true,
                sendMessage: jest.fn((msg, cb) => cb({})),
            },
            storage: {
                local: {
                    get: jest.fn((keys, cb) => cb({ extensionConfig: { download_dir: "/tmp" } })),
                },
            },
        };
        yield popup.updateDownloadDirDisplay();
        expect((_a = document.getElementById("download-dir-display")) === null || _a === void 0 ? void 0 : _a.textContent).toBe("Saving to: /tmp");
    }));
});
describe("updatePortDisplay", () => {
    it("no-op when element missing", () => {
        document.body.innerHTML = "";
        expect(() => popup.updatePortDisplay()).not.toThrow();
    });
    it("updates text on presence", () => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        document.body.innerHTML = '<div id="server-port-display"></div>';
        // Stub chrome to return serverConfig via runtime
        global.chrome = {
            runtime: {
                lastError: false,
                sendMessage: jest.fn((msg, cb) => cb({ serverConfig: { server_port: 1234 }, status: "success" })),
            },
            storage: { local: { get: jest.fn() } },
        };
        yield popup.updatePortDisplay();
        expect((_a = document.getElementById("server-port-display")) === null || _a === void 0 ? void 0 : _a.textContent).toBe("Server Port: 1234");
    }));
});
describe("showConfigErrorIfPresent", () => {
    it("no-op when element missing", () => {
        document.body.innerHTML = "";
        expect(() => popup.showConfigErrorIfPresent()).not.toThrow();
    });
    it("displays error when configError set", () => {
        document.body.innerHTML = '<div id="config-error-display"></div>';
        global.chrome = {
            storage: {
                local: {
                    get: jest.fn((key, cb) => cb({ configError: "oops" })),
                },
            },
        };
        popup.showConfigErrorIfPresent();
        const el = document.getElementById("config-error-display");
        expect(el === null || el === void 0 ? void 0 : el.textContent).toBe("Configuration Error: oops");
        expect(el === null || el === void 0 ? void 0 : el.style.display).toBe("block");
    });
});
describe("createErrorListItem", () => {
    /**
     * Tests the creation of error list items with detailed error information.
     * Verifies DOM structure, error details display, and help link functionality.
     */
    it("builds list item with semantic details element and help link", () => {
        var _a;
        // Stub openOptionsPage for help link
        global.chrome = { runtime: { openOptionsPage: jest.fn() } };
        const info = {
            filename: "file.mp4",
            errorInfo: { type: "TypeX", message: "msg", original: "orig" },
        };
        const li = popup.createErrorListItem("id1", info);
        // Data attribute and title
        expect(li.dataset.downloadId).toBe("id1");
        expect((_a = li.querySelector(".item-title")) === null || _a === void 0 ? void 0 : _a.textContent).toContain("file.mp4");
        // Details element should be present
        const detailsEl = li.querySelector("details.error-details");
        expect(detailsEl).not.toBeNull();
        const summary = detailsEl === null || detailsEl === void 0 ? void 0 : detailsEl.querySelector("summary");
        expect(summary === null || summary === void 0 ? void 0 : summary.textContent).toBe("Details");
        // Initially collapsed (no open attribute)
        expect(detailsEl === null || detailsEl === void 0 ? void 0 : detailsEl.hasAttribute("open")).toBe(false);
        // Clicking summary toggles open attribute
        summary === null || summary === void 0 ? void 0 : summary.click();
        expect(detailsEl === null || detailsEl === void 0 ? void 0 : detailsEl.hasAttribute("open")).toBe(true);
        // Content should contain error info
        const content = detailsEl === null || detailsEl === void 0 ? void 0 : detailsEl.querySelector(".error-details-content");
        expect(content === null || content === void 0 ? void 0 : content.textContent).toContain("TypeX: msg (orig)");
        // Contextual help link should be present and callable
        const helpBtn = detailsEl === null || detailsEl === void 0 ? void 0 : detailsEl.querySelector("button.error-help-link");
        expect(helpBtn).not.toBeNull();
        helpBtn === null || helpBtn === void 0 ? void 0 : helpBtn.click();
        expect(global.chrome.runtime.openOptionsPage).toHaveBeenCalled();
    });
});
describe("createGenericListItem", () => {
    it("renders paused status with resume button", () => {
        const li = popup.createGenericListItem("id2", { status: "paused" });
        expect(li.classList.contains("status-paused")).toBe(true);
        const btn = li.querySelector("button.resume-button");
        expect(btn).not.toBeNull();
    });
});
describe("createQueuedListItem", () => {
    it("renders cancel button and sends message", () => {
        global.chrome = { runtime: { sendMessage: jest.fn() } };
        const item = { id: "id3", filename: "f.mp4" };
        const li = popup.createQueuedListItem(item);
        const btn = li.querySelector("button.cancel-button");
        btn === null || btn === void 0 ? void 0 : btn.click();
        expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "cancelDownload", downloadId: "id3" }, expect.any(Function));
    });
});
