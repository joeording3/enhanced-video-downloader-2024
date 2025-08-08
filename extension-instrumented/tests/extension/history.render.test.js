// @ts-nocheck
"use strict";
/* eslint-env jest */
Object.defineProperty(exports, "__esModule", { value: true });
const history_1 = require("../../extension/src/history");
describe("renderHistoryItems", () => {
    let listEl;
    let pageInfoEl;
    let prevBtn;
    let nextBtn;
    beforeEach(() => {
        document.body.innerHTML =
            '<ul id="history-list"></ul>' +
                '<div id="page-info"></div>' +
                '<button id="prev-btn"></button>' +
                '<button id="next-btn"></button>';
        listEl = document.getElementById("history-list");
        pageInfoEl = document.getElementById("page-info");
        prevBtn = document.getElementById("prev-btn");
        nextBtn = document.getElementById("next-btn");
    });
    it("renders empty history correctly", () => {
        (0, history_1.renderHistoryItems)([], 1, 10, 0, listEl, pageInfoEl, prevBtn, nextBtn);
        const emptyItems = listEl.querySelectorAll("li.empty-history");
        expect(emptyItems).toHaveLength(1);
        expect(pageInfoEl.textContent).toBe("No items");
        expect(prevBtn.disabled).toBe(true);
        expect(nextBtn.disabled).toBe(true);
    });
    it("renders history items and pagination correctly", () => {
        var _a;
        const items = [
            {
                id: "1",
                page_title: "Title1",
                filename: "file1.mp4",
                timestamp: 1000,
                status: "done",
            },
            {
                id: "2",
                page_title: "Title2",
                filename: "file2.mp4",
                timestamp: 2000,
                status: "pending",
                detail: ["detail1"],
                error: "error msg",
                url: "http://example.com",
            },
        ];
        (0, history_1.renderHistoryItems)(items, 1, 2, 2, listEl, pageInfoEl, prevBtn, nextBtn);
        const rendered = listEl.querySelectorAll("li.history-item");
        expect(rendered).toHaveLength(2);
        expect(pageInfoEl.textContent).toBe("Showing 1-2 of 2 items");
        expect(prevBtn.disabled).toBe(true);
        expect(nextBtn.disabled).toBe(true);
        // Check first item content
        const first = rendered[0];
        expect(first.dataset.itemId).toBe("1");
        expect((_a = first.querySelector("b")) === null || _a === void 0 ? void 0 : _a.textContent).toBe("Title1");
    });
    it("renders items with missing optional fields correctly", () => {
        var _a, _b, _c;
        const items = [
            {
                id: "3",
                filename: "file3.mp4", // No page_title
                status: "failed",
                // No timestamp
                detail: "just a string detail", // detail as string
            },
        ];
        (0, history_1.renderHistoryItems)(items, 1, 1, 1, listEl, pageInfoEl, prevBtn, nextBtn);
        const rendered = listEl.querySelectorAll("li.history-item");
        expect(rendered).toHaveLength(1);
        const itemEl = rendered[0];
        expect((_a = itemEl.querySelector("b")) === null || _a === void 0 ? void 0 : _a.textContent).toBe("file3.mp4"); // Fallback to filename
        expect((_b = itemEl.querySelector(".history-item-timestamp")) === null || _b === void 0 ? void 0 : _b.textContent).toBe(""); // Empty timestamp
        expect((_c = itemEl.querySelector(".history-item-detail")) === null || _c === void 0 ? void 0 : _c.textContent).toBe("just a string detail");
    });
});
