/* eslint-env jest */

// Use the global chrome mock from jest.setup.js
import * as bg from "extension/src/background";

describe("debounce", () => {
  jest.useFakeTimers();
  it("delays execution", () => {
    const fn = jest.fn();
    const debounced = bg.debounce(fn, 1000);
    debounced(1, 2);
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(fn).toHaveBeenCalledWith(1, 2);
  });
});

describe("log, warn, error", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });
  it("log calls console.log with [BG] prefix", () => {
    bg.log("hello");
    expect(console.log).toHaveBeenCalledWith("[BG]", "hello");
  });
  it("warn calls console.warn with [BG] prefix", () => {
    bg.warn("warn");
    expect(console.warn).toHaveBeenCalledWith("[BG Warning]", "warn");
  });
  it("error calls console.error with [BG] prefix", () => {
    bg.error("oops");
    expect(console.error).toHaveBeenCalledWith("[BG Error]", "oops");
  });
});

describe("applyThemeToActionIcon", () => {
  it("sets dark theme icons", () => {
    bg.applyThemeToActionIcon("dark");
    expect(chrome.action.setIcon).toHaveBeenCalledWith(
      expect.objectContaining({ path: bg.actionIconPaths.dark }),
      expect.any(Function)
    );
  });
  it("falls back to light on invalid theme", () => {
    bg.applyThemeToActionIcon("unknown");
    expect(chrome.action.setIcon).toHaveBeenCalledWith(
      expect.objectContaining({ path: bg.actionIconPaths.light }),
      expect.any(Function)
    );
  });
});
