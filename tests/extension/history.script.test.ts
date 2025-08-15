// @jest-environment jsdom
import { fetchHistory, renderHistoryItems } from "../../extension/src/history";
import { CSS_CLASSES, DOM_SELECTORS } from "../../extension/src/core/constants";

describe("history.ts core functions", () => {
  beforeEach(() => {
    document.body.innerHTML =
      `<ul id="${DOM_SELECTORS.HISTORY_LIST.replace("#", "")}"></ul>` +
      `<div id="${DOM_SELECTORS.PAGE_INFO.replace("#", "")}"></div>` +
      '<button id="prev-btn"></button>' +
      '<button id="next-btn"></button>';
    (global as any).chrome = {
      runtime: { lastError: undefined },
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn((items: any, cb: any) => cb && cb()),
        },
      },
    };
  });

  describe("fetchHistory", () => {
    it("returns empty history on runtime error", async () => {
      (global as any).chrome.runtime.lastError = { message: "fail" };
      ((global as any).chrome.storage.local.get as jest.Mock).mockImplementation(
        (keys: any, cb: any) => cb({})
      );
      const result = await fetchHistory(1, 5);
      expect(result.history).toEqual([]);
      expect(result.totalItems).toBe(0);
    });

    it("returns paginated and sorted history", async () => {
      (global as any).chrome.runtime.lastError = undefined;
      const entries = [
        { id: "1", timestamp: 100, page_title: "A" },
        { id: "2", timestamp: 200, page_title: "B" },
      ];
      ((global as any).chrome.storage.local.get as jest.Mock).mockImplementation(
        (keys: any, cb: any) => cb({ downloadHistory: entries })
      );
      const result = await fetchHistory(1, 1);
      expect(result.history).toEqual([entries[1]]);
      expect(result.totalItems).toBe(2);
    });
  });

  describe("renderHistoryItems", () => {
    it("renders empty state when no items", () => {
      const listEl = document.getElementById(DOM_SELECTORS.HISTORY_LIST.replace("#", ""));
      const pageInfoEl = document.getElementById(DOM_SELECTORS.PAGE_INFO.replace("#", ""));
      const prevBtn = document.getElementById("prev-btn") as HTMLButtonElement;
      const nextBtn = document.getElementById("next-btn") as HTMLButtonElement;

      if (!listEl || !pageInfoEl || !prevBtn || !nextBtn) {
        throw new Error("Required DOM elements not found");
      }

      renderHistoryItems([], 1, 5, 0, listEl, pageInfoEl, prevBtn, nextBtn);
      expect(listEl.innerHTML).toContain(CSS_CLASSES.HISTORY_EMPTY);
      expect(pageInfoEl.textContent).toBe("No items");
      expect(prevBtn.disabled).toBe(true);
      expect(nextBtn.disabled).toBe(true);
    });

    it("renders list of items", () => {
      const listEl = document.getElementById(DOM_SELECTORS.HISTORY_LIST.replace("#", ""));
      if (!listEl) {
        throw new Error("History list element not found");
      }

      renderHistoryItems(
        [{ id: "1", timestamp: 1000, page_title: "Test", status: "done" }],
        1,
        5,
        1,
        listEl
      );
      expect(listEl.querySelectorAll(`li.${CSS_CLASSES.HISTORY_ITEM}`).length).toBe(1);
      const titleElement = listEl.querySelector(`li.${CSS_CLASSES.HISTORY_ITEM} b`);
      expect(titleElement?.textContent).toBe("Test");
    });
  });
});
