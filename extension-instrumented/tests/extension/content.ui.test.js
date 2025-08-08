// @ts-nocheck
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
// @jest-environment jsdom
const content_1 = require("../../extension/src/content");
describe("content.ts UI functions", () => {
    beforeEach(() => {
        document.body.innerHTML =
            '<div id="video-container"><video id="video"></video></div>';
        global.chrome = {
            storage: {
                local: {
                    get: jest.fn((key, cb) => cb({})),
                    set: jest.fn((items, cb) => cb && cb()),
                },
            },
            runtime: { lastError: undefined },
        };
    });
    describe("createOrUpdateButton", () => {
        it("injects a download button into the DOM when no video element is provided", () => __awaiter(void 0, void 0, void 0, function* () {
            // Ensure no existing button
            document.body.innerHTML = "";
            yield (0, content_1.createOrUpdateButton)();
            const btn = document.body.querySelector("button");
            expect(btn).not.toBeNull();
            // ID should start with our prefix
            expect(btn === null || btn === void 0 ? void 0 : btn.id).toMatch(/^evd-download-button-/);
        }));
    });
    describe("ensureDownloadButtonStyle", () => {
        it("applies guideline styles to the button", () => {
            const btn = document.createElement("button");
            document.body.appendChild(btn);
            (0, content_1.ensureDownloadButtonStyle)(btn);
            expect(btn.style.padding).toBe("4px 8px");
            expect(btn.style.borderRadius).toBe("4px");
            expect(btn.style.backgroundColor).toBe("rgba(0, 0, 0, 0.3)");
            expect(btn.style.borderWidth).toBe("1px");
            expect(btn.style.borderStyle).toBe("solid");
        });
    });
    // Note: setButtonHiddenState and resetButtonPosition handle storage and are covered by storage tests
});
