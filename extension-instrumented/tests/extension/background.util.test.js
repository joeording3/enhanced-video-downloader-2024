"use strict";
/* eslint-env jest */
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
Object.defineProperty(exports, "__esModule", { value: true });
// Use the global chrome mock from jest.setup.js
const bg = __importStar(require("../../extension/src/background"));
// Mock the centralized logger
jest.mock("../../extension/src/core/logger", () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
    CentralizedLogger: {
        getInstance: jest.fn(() => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        })),
    },
}));
describe("debounce", () => {
    jest.useFakeTimers();
    it("delays execution", () => {
        const fn = jest.fn();
        const debounced = bg.debounce(fn, 1000);
        debounced(1, 2);
        expect(fn).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1000);
        expect(fn).toHaveBeenCalledWith(1, 2);
    });
});
describe("log, warn, error", () => {
    let logger;
    beforeEach(() => {
        // Get the mocked logger
        const { logger: mockLogger } = require("../../extension/src/core/logger");
        logger = mockLogger;
        // Clear all mocks
        logger.info.mockClear();
        logger.warn.mockClear();
        logger.error.mockClear();
    });
    it("log calls logger.info with background component", () => {
        bg.log("hello");
        expect(logger.info).toHaveBeenCalledWith("hello", {
            component: "background",
        });
    });
    it("warn calls logger.warn with background component", () => {
        bg.warn("warn");
        expect(logger.warn).toHaveBeenCalledWith("warn", {
            component: "background",
        });
    });
    it("error calls logger.error with background component", () => {
        bg.error("oops");
        expect(logger.error).toHaveBeenCalledWith("oops", {
            component: "background",
        });
    });
});
describe("applyThemeToActionIcon", () => {
    it("sets dark theme icons", () => {
        bg.applyThemeToActionIcon("dark");
        expect(chrome.action.setIcon).toHaveBeenCalledWith(expect.objectContaining({ path: bg.actionIconPaths.dark }), expect.any(Function));
    });
    it("falls back to light on invalid theme", () => {
        bg.applyThemeToActionIcon("unknown");
        expect(chrome.action.setIcon).toHaveBeenCalledWith(expect.objectContaining({ path: bg.actionIconPaths.light }), expect.any(Function));
    });
});
