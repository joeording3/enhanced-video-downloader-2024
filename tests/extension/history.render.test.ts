/* eslint-env jest */

import { renderHistoryItems } from "../../extension/src/history";
import type { HistoryEntry } from "../../extension/src/types";
import { CSS_CLASSES, DOM_SELECTORS } from "../../extension/src/core/constants";

describe("renderHistoryItems", () => {
  let listEl: HTMLElement;
  let pageInfoEl: HTMLElement;
  let prevBtn: HTMLButtonElement;
  let nextBtn: HTMLButtonElement;

  beforeEach(() => {
    document.body.innerHTML =
      `<ul id="${DOM_SELECTORS.HISTORY_LIST.replace("#", "")}"></ul>` +
      `<div id="${DOM_SELECTORS.PAGE_INFO.replace("#", "")}"></div>` +
      '<button id="prev-btn"></button>' +
      '<button id="next-btn"></button>';
    listEl = document.getElementById(DOM_SELECTORS.HISTORY_LIST.replace("#", "")) as HTMLElement;
    pageInfoEl = document.getElementById(DOM_SELECTORS.PAGE_INFO.replace("#", "")) as HTMLElement;
    prevBtn = document.getElementById("prev-btn") as HTMLButtonElement;
    nextBtn = document.getElementById("next-btn") as HTMLButtonElement;
  });

  it("renders empty history correctly", () => {
    renderHistoryItems([], 1, 10, 0, listEl, pageInfoEl, prevBtn, nextBtn);
    const emptyItems = listEl.querySelectorAll(`li.${CSS_CLASSES.HISTORY_EMPTY}`);
    expect(emptyItems).toHaveLength(1);
    expect(pageInfoEl.textContent).toBe("No items");
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(true);
  });

  it("renders history items and pagination correctly", () => {
    const items: HistoryEntry[] = [
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
    renderHistoryItems(items, 1, 2, 2, listEl, pageInfoEl, prevBtn, nextBtn);
    const rendered = listEl.querySelectorAll(`li.${CSS_CLASSES.HISTORY_ITEM}`);
    expect(rendered).toHaveLength(2);
    expect(pageInfoEl.textContent).toBe("Showing 1-2 of 2 items");
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(true);
    // Check first item content
    const first = rendered[0];
    expect((first as HTMLElement).dataset.itemId).toBe("1");
    expect(first.querySelector("b")?.textContent).toBe("Title1");
  });

  it("renders items with missing optional fields correctly", () => {
    const items: HistoryEntry[] = [
      {
        id: "3",
        filename: "file3.mp4", // No page_title
        status: "failed",
        // No timestamp
        detail: "just a string detail", // detail as string
      },
    ];
    renderHistoryItems(items, 1, 1, 1, listEl, pageInfoEl, prevBtn, nextBtn);
    const rendered = listEl.querySelectorAll(`li.${CSS_CLASSES.HISTORY_ITEM}`);
    expect(rendered).toHaveLength(1);

    const itemEl = rendered[0];
    expect(itemEl.querySelector("b")?.textContent).toBe("file3.mp4"); // Fallback to filename
    expect(itemEl.querySelector(`.${CSS_CLASSES.HISTORY_ITEM_TIMESTAMP}`)?.textContent).toBe(""); // Empty timestamp
    expect(itemEl.querySelector(`.${CSS_CLASSES.HISTORY_ITEM_DETAIL}`)?.textContent).toBe("just a string detail");
  });
});
