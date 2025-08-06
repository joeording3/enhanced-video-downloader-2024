"use strict";
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
const content_1 = require("../../extension/src/content");
const ytEnhance = __importStar(require("../../extension/src/youtube_enhance"));
const utils_1 = require("../../extension/src/lib/utils");
describe("Content.ts additional branch coverage", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        jest.clearAllMocks();
        chrome.runtime.lastError = null;
        jest.spyOn(utils_1.logger, "error");
    });
    describe("getButtonState error handling", () => {
        it("returns default on storage lastError", () => __awaiter(void 0, void 0, void 0, function* () {
            // Simulate lastError in callback
            chrome.storage.local.get.mockImplementation((key, cb) => {
                chrome.runtime.lastError = {
                    message: "fail",
                };
                cb({});
            });
            const state = yield (0, content_1.getButtonState)();
            expect(state).toEqual({
                x: 10,
                y: 10,
                hidden: false,
            });
            expect(utils_1.logger.error).toHaveBeenCalledWith("Error getting button state from storage:", "fail");
        }));
        it("returns default on exception", () => __awaiter(void 0, void 0, void 0, function* () {
            // Throw an exception in storage.get
            chrome.storage.local.get.mockImplementation(() => {
                throw new Error("boom");
            });
            const state = yield (0, content_1.getButtonState)();
            expect(state).toEqual({
                x: 10,
                y: 10,
                hidden: false,
            });
            expect(utils_1.logger.error).toHaveBeenCalledWith("Error getting button state from storage:", "boom");
        }));
    });
    describe("saveButtonState error handling", () => {
        it("logs error when saving state fails", () => __awaiter(void 0, void 0, void 0, function* () {
            // Simulate lastError after set
            chrome.runtime.lastError = {
                message: "savefail",
            };
            yield (0, content_1.saveButtonState)({
                x: 5,
                y: 5,
                hidden: true,
            });
            expect(utils_1.logger.error).toHaveBeenCalledWith("Error saving button state to storage:", "savefail");
        }));
    });
    describe("ensureDownloadButtonStyle adjustments", () => {
        it("fixes display and opacity and applies guideline styles", () => {
            const btn = document.createElement("button");
            document.body.appendChild(btn);
            // Stub computed style
            jest.spyOn(window, "getComputedStyle").mockReturnValue({
                display: "none",
                opacity: "0.5",
                padding: "0px",
                borderRadius: "0px",
                backgroundColor: "red",
                borderWidth: "2px",
                borderStyle: "dashed",
            });
            (0, content_1.ensureDownloadButtonStyle)(btn);
            expect(btn.style.display).toBe("block");
            expect(btn.style.opacity).toBe("1");
            // Check guideline props
            expect(btn.style.padding).toBe("4px 8px");
            expect(btn.style.borderRadius).toBe("4px");
            expect(btn.style.backgroundColor).toBe("rgba(0, 0, 0, 0.3)");
            expect(btn.style.borderWidth).toBe("1px");
            expect(btn.style.borderStyle).toBe("solid");
        });
        it("skips if element not in DOM", () => {
            const orphan = document.createElement("button");
            // Should not throw
            expect(() => (0, content_1.ensureDownloadButtonStyle)(orphan)).not.toThrow();
        });
    });
    describe("createOrUpdateButton existing instance", () => {
        it("reuses the same button and reapplies styles", () => __awaiter(void 0, void 0, void 0, function* () {
            const styleSpy = jest.spyOn(ytEnhance, "enhanceYouTubeButton");
            const first = yield (0, content_1.createOrUpdateButton)();
            const second = yield (0, content_1.createOrUpdateButton)();
            expect(second).toBe(first);
            expect(styleSpy).toHaveBeenCalled();
        }));
    });
});
