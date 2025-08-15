import { CentralizedLogger, logger } from "extension/src/core/logger";

describe("CentralizedLogger", () => {
  beforeEach(() => {
    logger.clearLogs();
    logger.setLevel("debug");
    jest.restoreAllMocks();
  });

  it("is a singleton", () => {
    const a = CentralizedLogger.getInstance();
    const b = CentralizedLogger.getInstance();
    expect(a).toBe(b);
  });

  it("respects log level filtering", () => {
    logger.clearLogs();
    logger.setLevel("warn");
    logger.debug("dbg", { component: "c" });
    logger.info("inf", { component: "c" });
    logger.warn("wrn", { component: "c" });
    logger.error("err", { component: "c" });
    const entries = logger.getLogs();
    expect(entries.map(e => e.level)).toEqual(["warn", "error"]);
  });

  it("invokes onLog callbacks and supports unsubscribe", () => {
    const received: string[] = [];
    const unsubscribe = logger.onLog((entry: any) => {
      received.push(`${entry.level}:${entry.message}`);
    });
    logger.info("hello", { component: "comp" });
    expect(received).toContain("info:hello");
    unsubscribe();
    logger.info("world", { component: "comp" });
    expect(received).not.toContain("info:world");
  });

  it("handles errors thrown by log callbacks gracefully", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    logger.onLog(() => {
      throw new Error("callback-fail");
    });
    logger.warn("test-warn", { component: "comp" });
    expect(spy).toHaveBeenCalled();
  });

  it("mirrors all levels to console via internal callback when available", () => {
    // The constructor registers a callback that mirrors to console.* if chrome.runtime exists (jest.setup provides it)
    const debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
    const infoSpy = jest.spyOn(console, "info").mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    logger.debug("d", { component: "comp" });
    logger.info("i", { component: "comp" });
    logger.warn("w", { component: "comp" });
    logger.error("e", { component: "comp" });

    expect(debugSpy).toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("trims logs to prevent memory leaks when exceeding capacity", () => {
    // Generate many logs and ensure oldest entries are discarded
    const total = 1100;
    for (let i = 0; i < total; i++) {
      logger.info(`m${i}`, { component: "comp" });
    }
    const entries = logger.getLogs();
    // Capacity enforcement keeps logs well under total and not empty
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.length).toBeLessThan(total);
    // Oldest messages should be trimmed out
    expect(entries.some(e => e.message === "m0")).toBe(false);
    expect(entries.some(e => e.message === `m${total - 1}`)).toBe(true);
  });

  describe("utils helpers", () => {
    it("emits debug for functionEntry/Exit", () => {
      CentralizedLogger.utils.functionEntry("fnA", "comp", { a: 1 });
      CentralizedLogger.utils.functionExit("fnA", "comp", { b: 2 });
      const msgs = logger.getLogs().map(e => `${e.level}:${e.message}`);
      expect(msgs).toContain("debug:Entering fnA");
      expect(msgs).toContain("debug:Exiting fnA");
    });

    it("emits info for asyncStart/asyncComplete and error for asyncError", () => {
      CentralizedLogger.utils.asyncStart("op", "comp", { s: true });
      CentralizedLogger.utils.asyncComplete("op", "comp", { s: true });
      CentralizedLogger.utils.asyncError("op", "comp", new Error("x"), { m: 1 });
      const levels = logger.getLogs().map(e => e.level);
      expect(levels).toEqual(["info", "info", "error"]);
      const messages = logger.getLogs().map(e => e.message);
      expect(messages[0]).toBe("Starting op");
      expect(messages[1]).toBe("Completed op");
      expect(messages[2]).toContain("Failed op: x");
    });
  });
});
