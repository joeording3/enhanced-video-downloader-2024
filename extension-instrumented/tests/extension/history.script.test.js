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
const history_1 = require("../../extension/src/history");
describe("history.ts core functions", () => {
    beforeEach(() => {
        document.body.innerHTML =
            '<ul id="history-list"></ul>' +
                '<div id="page-info"></div>' +
                '<button id="prev-btn"></button>' +
                '<button id="next-btn"></button>';
        global.chrome = {
            runtime: { lastError: undefined },
            storage: {
                local: {
                    get: jest.fn(),
                    set: jest.fn((items, cb) => cb && cb()),
                },
            },
        };
    });
    describe("fetchHistory", () => {
        it("returns empty history on runtime error", () => __awaiter(void 0, void 0, void 0, function* () {
            global.chrome.runtime.lastError = { message: "fail" };
            global.chrome.storage.local.get.mockImplementation((keys, cb) => cb({}));
            const result = yield (0, history_1.fetchHistory)(1, 5);
            expect(result.history).toEqual([]);
            expect(result.totalItems).toBe(0);
        }));
        it("returns paginated and sorted history", () => __awaiter(void 0, void 0, void 0, function* () {
            global.chrome.runtime.lastError = undefined;
            const entries = [
                { id: "1", timestamp: 100, page_title: "A" },
                { id: "2", timestamp: 200, page_title: "B" },
            ];
            global.chrome.storage.local.get.mockImplementation((keys, cb) => cb({ downloadHistory: entries }));
            const result = yield (0, history_1.fetchHistory)(1, 1);
            expect(result.history).toEqual([entries[1]]);
            expect(result.totalItems).toBe(2);
        }));
    });
    describe("renderHistoryItems", () => {
        it("renders empty state when no items", () => {
            const listEl = document.getElementById("history-list");
            const pageInfoEl = document.getElementById("page-info");
            const prevBtn = document.getElementById("prev-btn");
            const nextBtn = document.getElementById("next-btn");
            if (!listEl || !pageInfoEl || !prevBtn || !nextBtn) {
                throw new Error("Required DOM elements not found");
            }
            (0, history_1.renderHistoryItems)([], 1, 5, 0, listEl, pageInfoEl, prevBtn, nextBtn);
            expect(listEl.innerHTML).toContain("empty-history");
            expect(pageInfoEl.textContent).toBe("No items");
            expect(prevBtn.disabled).toBe(true);
            expect(nextBtn.disabled).toBe(true);
        });
        it("renders list of items", () => {
            const listEl = document.getElementById("history-list");
            if (!listEl) {
                throw new Error("History list element not found");
            }
            (0, history_1.renderHistoryItems)([{ id: "1", timestamp: 1000, page_title: "Test", status: "done" }], 1, 5, 1, listEl);
            expect(listEl.querySelectorAll("li.history-item").length).toBe(1);
            const titleElement = listEl.querySelector("li.history-item b");
            expect(titleElement === null || titleElement === void 0 ? void 0 : titleElement.textContent).toBe("Test");
        });
    });
});
