/* eslint-env jest */

import { renderHistoryItems } from "../../extension/src/history";
import type { HistoryEntry } from "../../extension/src/types";

describe("renderHistoryItems", () => {
  let listEl: HTMLElement;
  let pageInfoEl: HTMLElement;
  let prevBtn: HTMLButtonElement;
  let nextBtn: HTMLButtonElement;

  beforeEach(() => {
    document.body.innerHTML =
      '<ul id="history-list"></ul>' +
      '<div id="page-info"></div>' +
      '<button id="prev-btn"></button>' +
      '<button id="next-btn"></button>';
    listEl = document.getElementById("history-list") as HTMLElement;
    pageInfoEl = document.getElementById("page-info") as HTMLElement;
    prevBtn = document.getElementById("prev-btn") as HTMLButtonElement;
    nextBtn = document.getElementById("next-btn") as HTMLButtonElement;
  });

  it("renders empty history correctly", () => {
    renderHistoryItems([], 1, 10, 0, listEl, pageInfoEl, prevBtn, nextBtn);
    const emptyItems = listEl.querySelectorAll("li.empty-history");
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
    const rendered = listEl.querySelectorAll("li.history-item");
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
    const rendered = listEl.querySelectorAll("li.history-item");
    expect(rendered).toHaveLength(1);

    const itemEl = rendered[0];
    expect(itemEl.querySelector("b")?.textContent).toBe("file3.mp4"); // Fallback to filename
    expect(itemEl.querySelector(".history-item-timestamp")?.textContent).toBe(
      ""
    ); // Empty timestamp
    expect(itemEl.querySelector(".history-item-detail")?.textContent).toBe(
      "just a string detail"
    );
  });
});
