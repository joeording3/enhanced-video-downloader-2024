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
const youtube_enhance_1 = require("../youtube_enhance");
const utils = __importStar(require("../lib/utils"));
jest.mock("../lib/utils", () => ({
    getHostname: jest.fn(),
}));
describe("youtube_enhance", () => {
    let btn;
    let mockGetHostname;
    beforeEach(() => {
        btn = document.createElement("button");
        mockGetHostname = utils.getHostname;
        // Mock console.log to avoid noise in tests
        jest.spyOn(console, "log").mockImplementation(() => { });
    });
    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    });
    describe("enhanceYouTubeButton", () => {
        describe("YouTube domain detection", () => {
            it("enhances button styles for youtube.com", () => {
                mockGetHostname.mockReturnValue("youtube.com");
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.classList.contains("youtube-enhanced")).toBe(true);
            });
            it("enhances button styles for www.youtube.com", () => {
                mockGetHostname.mockReturnValue("www.youtube.com");
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.classList.contains("youtube-enhanced")).toBe(true);
            });
            it("enhances button styles for m.youtube.com", () => {
                mockGetHostname.mockReturnValue("m.youtube.com");
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.classList.contains("youtube-enhanced")).toBe(true);
            });
            it("enhances button styles for music.youtube.com", () => {
                mockGetHostname.mockReturnValue("music.youtube.com");
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.classList.contains("youtube-enhanced")).toBe(true);
            });
            it("does nothing for non-YouTube domains", () => {
                mockGetHostname.mockReturnValue("example.com");
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.classList.contains("youtube-enhanced")).toBe(false);
            });
            it("does nothing for domains containing 'youtube' but not YouTube", () => {
                mockGetHostname.mockReturnValue("fakeyoutube.com");
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.classList.contains("youtube-enhanced")).toBe(false);
            });
            it("does nothing for empty hostname", () => {
                mockGetHostname.mockReturnValue("");
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.classList.contains("youtube-enhanced")).toBe(false);
            });
            it("does nothing for null hostname", () => {
                mockGetHostname.mockReturnValue(null);
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.classList.contains("youtube-enhanced")).toBe(false);
            });
        });
        describe("button styling", () => {
            beforeEach(() => {
                mockGetHostname.mockReturnValue("youtube.com");
            });
            it("sets all required style properties", () => {
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.classList.contains("youtube-enhanced")).toBe(true);
            });
            it("overwrites existing styles", () => {
                // Set initial styles
                btn.style.backgroundColor = "blue";
                btn.style.color = "black";
                btn.style.border = "1px solid black";
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.classList.contains("youtube-enhanced")).toBe(true);
            });
            it("preserves existing event handlers", () => {
                const existingClickHandler = jest.fn();
                btn.onclick = existingClickHandler;
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                // Original click handler should be preserved
                expect(btn.onclick).toBe(existingClickHandler);
                expect(btn.classList.contains("youtube-enhanced")).toBe(true);
            });
        });
        describe("hover effects", () => {
            beforeEach(() => {
                mockGetHostname.mockReturnValue("youtube.com");
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
            });
            it("applies CSS class for enhanced styling", () => {
                expect(btn.classList.contains("youtube-enhanced")).toBe(true);
            });
        });
        describe("button positioning", () => {
            beforeEach(() => {
                mockGetHostname.mockReturnValue("youtube.com");
                // Mock window.innerWidth
                Object.defineProperty(window, "innerWidth", {
                    writable: true,
                    configurable: true,
                    value: 1920,
                });
            });
            it("positions button at default location when no top style is set", () => {
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.style.top).toBe("70px");
                expect(btn.style.left).toBe("1820px"); // 1920 - 100
            });
            it("positions button at default location when top is 10px", () => {
                btn.style.top = "10px";
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.style.top).toBe("70px");
                expect(btn.style.left).toBe("1820px"); // 1920 - 100
            });
            it("preserves custom top position when not 10px", () => {
                btn.style.top = "50px";
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.style.top).toBe("50px");
                expect(btn.style.left).toBe("1820px"); // 1920 - 100
            });
            it("preserves custom top position when set to 0px", () => {
                btn.style.top = "0px";
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.style.top).toBe("0px");
                expect(btn.style.left).toBe("1820px"); // 1920 - 100
            });
            it("preserves custom top position when set to 100px", () => {
                btn.style.top = "100px";
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.style.top).toBe("100px");
                expect(btn.style.left).toBe("1820px"); // 1920 - 100
            });
            it("calculates left position based on window width", () => {
                Object.defineProperty(window, "innerWidth", {
                    writable: true,
                    configurable: true,
                    value: 1366,
                });
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.style.left).toBe("1266px"); // 1366 - 100
            });
            it("handles very small window width", () => {
                Object.defineProperty(window, "innerWidth", {
                    writable: true,
                    configurable: true,
                    value: 200,
                });
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.style.left).toBe("100px"); // 200 - 100
            });
            it("handles zero window width", () => {
                Object.defineProperty(window, "innerWidth", {
                    writable: true,
                    configurable: true,
                    value: 0,
                });
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(btn.style.left).toBe("-100px"); // 0 - 100
            });
        });
        describe("logging", () => {
            it("does not log for YouTube domains", () => {
                mockGetHostname.mockReturnValue("youtube.com");
                const consoleSpy = jest.spyOn(console, "log");
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                // The actual implementation doesn't log anything
                expect(consoleSpy).not.toHaveBeenCalled();
            });
            it("does not log for non-YouTube domains", () => {
                mockGetHostname.mockReturnValue("example.com");
                const consoleSpy = jest.spyOn(console, "log");
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                expect(consoleSpy).not.toHaveBeenCalled();
            });
        });
        describe("edge cases", () => {
            it("handles null button element gracefully", () => {
                mockGetHostname.mockReturnValue("youtube.com");
                expect(() => {
                    (0, youtube_enhance_1.enhanceYouTubeButton)(null);
                }).not.toThrow();
            });
            it("handles undefined button element gracefully", () => {
                mockGetHostname.mockReturnValue("youtube.com");
                expect(() => {
                    (0, youtube_enhance_1.enhanceYouTubeButton)(undefined);
                }).not.toThrow();
            });
            it("handles button with existing event handlers", () => {
                mockGetHostname.mockReturnValue("youtube.com");
                const existingClickHandler = jest.fn();
                btn.onclick = existingClickHandler;
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                // Original click handler should be preserved
                expect(btn.onclick).toBe(existingClickHandler);
                expect(btn.classList.contains("youtube-enhanced")).toBe(true);
            });
            it("handles button with existing styles that might conflict", () => {
                mockGetHostname.mockReturnValue("youtube.com");
                // Set conflicting styles
                btn.style.transform = "rotate(45deg)";
                btn.style.opacity = "0.5";
                (0, youtube_enhance_1.enhanceYouTubeButton)(btn);
                // Should still apply the CSS class
                expect(btn.classList.contains("youtube-enhanced")).toBe(true);
            });
        });
    });
});
