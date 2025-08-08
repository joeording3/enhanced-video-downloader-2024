/**
 * Tests for utility functions
 */
// @ts-nocheck

import {
  debounce,
  logger,
  safeParse,
  safeStringify,
  getHostname,
  generateId,
} from "../../lib/utils";

describe("Utility functions", () => {
  describe("debounce", () => {
    jest.useFakeTimers();

    it("should debounce function calls", () => {
      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 100);

      // Call multiple times
      debounced();
      debounced();
      debounced();

      // Function should not have been called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(100);

      // Function should have been called once
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it("should use the most recent arguments", () => {
      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 100);

      debounced("first");
      debounced("second");
      debounced("third");

      jest.advanceTimersByTime(100);

      expect(mockFn).toHaveBeenCalledWith("third");
    });

    it("should handle multiple rapid calls correctly", () => {
      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 100);

      // Call multiple times rapidly
      debounced("a");
      jest.advanceTimersByTime(50);
      debounced("b");
      jest.advanceTimersByTime(50);
      debounced("c");

      // Should not have been called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Advance to trigger the call
      jest.advanceTimersByTime(100);
      expect(mockFn).toHaveBeenCalledWith("c");
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe("logger", () => {
    const originalConsole = { ...console };

    beforeEach(() => {
      console.log = jest.fn();
      console.warn = jest.fn();
      console.error = jest.fn();
      console.debug = jest.fn();
    });

    afterEach(() => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.debug = originalConsole.debug;
    });

    it("should log with prefix when console.log is mocked", () => {
      logger.log("test message");
      expect(console.log).toHaveBeenCalledWith("[EVD]", "test message");
    });

    it("should warn with prefix when console.warn is mocked", () => {
      logger.warn("warning message");
      expect(console.warn).toHaveBeenCalledWith("[EVD Warning]", "warning message");
    });

    it("should error with prefix when console.error is mocked", () => {
      logger.error("error message");
      expect(console.error).toHaveBeenCalledWith("[EVD Error]", "error message");
    });

    it("should debug with prefix when console.debug is mocked", () => {
      logger.debug("debug message");
      expect(console.debug).toHaveBeenCalledWith("[EVD Debug]", "debug message");
    });

    it("should handle logging errors gracefully", () => {
      // Mock console.log to throw an error
      console.log = jest.fn().mockImplementation(() => {
        throw new Error("Logging failed");
      });

      // Should not throw
      expect(() => logger.log("test")).not.toThrow();
    });

    it("should handle warning errors gracefully", () => {
      console.warn = jest.fn().mockImplementation(() => {
        throw new Error("Warning failed");
      });

      expect(() => logger.warn("test")).not.toThrow();
    });

    it("should handle error logging failures gracefully", () => {
      console.error = jest.fn().mockImplementation(() => {
        throw new Error("Error logging failed");
      });

      expect(() => logger.error("test")).not.toThrow();
    });

    it("should handle debug logging failures gracefully", () => {
      console.debug = jest.fn().mockImplementation(() => {
        throw new Error("Debug logging failed");
      });

      expect(() => logger.debug("test")).not.toThrow();
    });
  });

  describe("getHostname", () => {
    it("should return the provided hostname", () => {
      expect(getHostname("example.com")).toBe("example.com");
    });

    it("should return empty string for empty hostname", () => {
      expect(getHostname("")).toBe("");
    });

    it("should return window.location.hostname if no argument is provided", () => {
      expect(getHostname()).toBe(window.location.hostname);
    });
  });

  describe("safeParse", () => {
    it("should parse valid JSON", () => {
      const result = safeParse('{"test": true}', null);
      expect(result).toEqual({
        test: true,
      });
    });

    it("should return fallback for invalid JSON", () => {
      const fallback = {
        default: true,
      };
      const result = safeParse("invalid json", fallback);
      expect(result).toBe(fallback);
    });

    it("should handle complex JSON objects", () => {
      const complexJson = '{"nested": {"array": [1,2,3], "string": "test"}}';
      const result = safeParse(complexJson, null);
      expect(result).toEqual({
        nested: {
          array: [1, 2, 3],
          string: "test",
        },
      });
    });

    it("should handle empty string as invalid JSON", () => {
      const fallback = { empty: true };
      const result = safeParse("", fallback);
      expect(result).toBe(fallback);
    });

    it("should handle null string as invalid JSON", () => {
      const fallback = { null: true };
      const result = safeParse(null as any, fallback);
      expect(result).toBe(null);
    });
  });

  describe("safeStringify", () => {
    it("should stringify objects", () => {
      const obj = {
        test: true,
      };
      expect(safeStringify(obj)).toBe('{"test":true}');
    });

    it("should handle circular references", () => {
      const circular: any = {};
      circular.self = circular;

      const result = safeStringify(circular);
      expect(result).toContain("[Object that couldn't be stringified");
    });

    it("should handle arrays", () => {
      const arr = [1, 2, 3, "test"];
      expect(safeStringify(arr)).toBe('[1,2,3,"test"]');
    });

    it("should handle primitive values", () => {
      expect(safeStringify("string")).toBe('"string"');
      expect(safeStringify(123)).toBe("123");
      expect(safeStringify(true)).toBe("true");
      expect(safeStringify(null)).toBe("null");
    });

    it("should handle undefined", () => {
      const result = safeStringify(undefined);
      expect(result).toBeUndefined();
    });

    it("should handle functions", () => {
      const func = () => "test";
      const result = safeStringify(func);
      expect(result).toBeUndefined();
    });
  });

  describe("generateId", () => {
    it("should generate a unique string", () => {
      const id1 = generateId();
      const id2 = generateId();

      expect(typeof id1).toBe("string");
      expect(typeof id2).toBe("string");
      expect(id1).not.toBe(id2);
    });

    it("should generate ids with expected format", () => {
      const id = generateId();

      // Should be a string
      expect(typeof id).toBe("string");

      // Should not be empty
      expect(id.length).toBeGreaterThan(0);

      // Should contain alphanumeric characters (base36)
      expect(id).toMatch(/^[a-z0-9]+$/);
    });

    it("should generate different ids on subsequent calls", () => {
      const ids = new Set();

      // Generate multiple ids
      for (let i = 0; i < 100; i++) {
        ids.add(generateId());
      }

      // All should be unique
      expect(ids.size).toBe(100);
    });

    it("should handle rapid successive calls", () => {
      const start = Date.now();
      const ids = [];

      // Generate many ids rapidly
      for (let i = 0; i < 1000; i++) {
        ids.push(generateId());
      }

      const end = Date.now();

      // Should complete quickly
      expect(end - start).toBeLessThan(1000);

      // All should be unique
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(1000);
    });
  });
});
