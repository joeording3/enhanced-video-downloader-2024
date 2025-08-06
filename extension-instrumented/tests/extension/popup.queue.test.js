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
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-env jest */
const popup = __importStar(require("extension/src/popup"));
describe("Popup Queue Controls", () => {
    beforeEach(() => {
        // Prepare minimal DOM container
        document.body.innerHTML = '<ul id="download-status"></ul>';
        // Stub chrome runtime
        // @ts-expect-error - Mocking Chrome API for testing
        global.chrome = { runtime: { sendMessage: jest.fn() } };
    });
    it("createActiveListItem pause button calls pauseDownload", () => {
        const li = popup.createActiveListItem("idPause", {
            status: "running",
            progress: 75,
            filename: "test.mp4",
        });
        const btn = li.querySelector("button.pause-button");
        expect(btn).not.toBeNull();
        btn.click();
        expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "pauseDownload", downloadId: "idPause" }, expect.any(Function));
    });
    it("renderDownloadStatus resume button calls resumeDownload for paused items", () => {
        // Simulate paused active item
        popup.renderDownloadStatus({
            active: { idResume: { status: "paused", progress: 0 } },
            queue: [],
        });
        const resumeBtn = document.querySelector("button.resume-button");
        expect(resumeBtn).not.toBeNull();
        resumeBtn.click();
        expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: "resumeDownload", downloadId: "idResume" }, expect.any(Function));
    });
});
