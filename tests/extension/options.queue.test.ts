/**
 * Tests for Options page Queue Admin wiring.
 */

import "../jest/jest.setup";
import { CSS_CLASSES, DOM_SELECTORS } from "../../extension/src/core/constants";

describe("Options Queue Admin", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="queue-refresh"></button>
      <button id="queue-clear"></button>
      <ul id="queue-list"></ul>
    `;
    // Reset mocks
    (chrome.runtime.sendMessage as jest.Mock).mockReset();
    jest.isolateModules(() => {
      require("extension/src/options");
    });
  });

  it("refresh button requests queue and renders items", () => {
    (chrome.runtime.sendMessage as jest.Mock).mockImplementation((msg, cb) => {
      if (msg && msg.type === "getQueue") {
        cb({ queue: ["id1", "id2"] });
      }
    });

    const btn = document.getElementById("queue-refresh") as HTMLButtonElement;
    btn.click();

    const list = document.getElementById("queue-list") as HTMLUListElement;
    const items = list.querySelectorAll("li");
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain("id1");
  });

  it("clear button sends reorderQueue with empty order", () => {
    const btn = document.getElementById("queue-clear") as HTMLButtonElement;
    btn.click();
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: "reorderQueue", queue: [] },
      expect.any(Function)
    );
  });
});
