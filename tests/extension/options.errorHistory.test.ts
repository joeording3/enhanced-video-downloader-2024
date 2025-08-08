import { loadErrorHistory } from "extension/src/options";
import * as historyModule from "extension/src/history";

describe("loadErrorHistory", () => {
  let listEl: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<ul id="error-history-list"></ul>';
    listEl = document.getElementById("error-history-list") as HTMLElement;
    jest.spyOn(historyModule, "fetchHistory").mockResolvedValue({
      history: [{ status: "error" }, { status: "complete" }],
      totalItems: 2,
    });
    jest.spyOn(historyModule, "renderHistoryItems").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("fetches history and renders only error entries", async () => {
    await loadErrorHistory(2, 5);
    expect(historyModule.fetchHistory).toHaveBeenCalledWith(2, 5);
    expect(historyModule.renderHistoryItems).toHaveBeenCalledWith(
      [{ status: "error" }],
      2,
      5,
      1,
      listEl
    );
  });
});
