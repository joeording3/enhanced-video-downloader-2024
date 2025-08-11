/* eslint-env jest */

// Use the global chrome mock from jest.setup.js
import * as bg from "../../extension/src/background";

// Mock the centralized logger
jest.mock("../../extension/src/core/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  CentralizedLogger: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

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
  let logger: {
    info: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };

  beforeEach(() => {
    // Get the mocked logger
    const { logger: mockLogger } = require("../../extension/src/core/logger");
    logger = mockLogger;

    // Clear all mocks
    logger.info.mockClear();
    logger.warn.mockClear();
    logger.error.mockClear();
  });

  it("log calls logger.info with background component", () => {
    bg.log("hello");
    expect(logger.info).toHaveBeenCalledWith("hello", {
      component: "background",
    });
  });

  it("warn calls logger.warn with background component", () => {
    bg.warn("warn");
    expect(logger.warn).toHaveBeenCalledWith("warn", {
      component: "background",
    });
  });

  it("error calls logger.error with background component", () => {
    bg.error("oops");
    expect(logger.error).toHaveBeenCalledWith("oops", {
      component: "background",
    });
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
    bg.applyThemeToActionIcon("unknown" as any);
    expect(chrome.action.setIcon).toHaveBeenCalledWith(
      expect.objectContaining({ path: bg.actionIconPaths.light }),
      expect.any(Function)
    );
  });
});
