import {
  debounce,
  throttle,
  memoize,
  DOMBatcher,
  Cache,
} from "../../extension/src/lib/performance-utils";

describe("Performance Utils Tests", () => {
  describe("Debounce Function", () => {
    it("should debounce function calls", async () => {
      const mockFunction = jest.fn();
      const debouncedFunction = debounce(mockFunction, 100);

      // Call multiple times rapidly
      debouncedFunction();
      debouncedFunction();
      debouncedFunction();

      expect(mockFunction).not.toHaveBeenCalled();

      // Wait for debounce period
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockFunction).toHaveBeenCalledTimes(1);
    });

    it("should handle function arguments", async () => {
      const mockFunction = jest.fn();
      const debouncedFunction = debounce(mockFunction, 100);

      debouncedFunction("arg1", "arg2");

      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(mockFunction).toHaveBeenCalledWith("arg1", "arg2");
    });

    it("should reset timer on subsequent calls", async () => {
      const mockFunction = jest.fn();
      const debouncedFunction = debounce(mockFunction, 100);

      debouncedFunction();

      // Wait half the debounce time
      await new Promise((resolve) => setTimeout(resolve, 50));

      debouncedFunction(); // This should reset the timer

      // Wait less than the full debounce time
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(mockFunction).not.toHaveBeenCalled();

      // Wait for the full debounce time
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe("Throttle Function", () => {
    it("should throttle function calls", async () => {
      const mockFunction = jest.fn();
      const throttledFunction = throttle(mockFunction, 100);

      // Call multiple times rapidly
      throttledFunction();
      throttledFunction();
      throttledFunction();

      expect(mockFunction).toHaveBeenCalledTimes(1);

      // Wait for throttle period
      await new Promise((resolve) => setTimeout(resolve, 150));

      throttledFunction();
      expect(mockFunction).toHaveBeenCalledTimes(2);
    });

    it("should handle function arguments", async () => {
      const mockFunction = jest.fn();
      const throttledFunction = throttle(mockFunction, 100);

      throttledFunction("arg1", "arg2");

      expect(mockFunction).toHaveBeenCalledWith("arg1", "arg2");
    });

    it("should not call function during throttle period", async () => {
      const mockFunction = jest.fn();
      const throttledFunction = throttle(mockFunction, 100);

      throttledFunction();
      expect(mockFunction).toHaveBeenCalledTimes(1);

      // Call during throttle period
      throttledFunction();
      expect(mockFunction).toHaveBeenCalledTimes(1); // Should not call again

      await new Promise((resolve) => setTimeout(resolve, 150));
      throttledFunction();
      expect(mockFunction).toHaveBeenCalledTimes(2);
    });
  });

  describe("Memoize Function", () => {
    it("should memoize function results", () => {
      let callCount = 0;
      const expensiveFunction = (a: number, b: number) => {
        callCount++;
        return a + b;
      };

      const memoizedFunction = memoize(expensiveFunction);

      // First call
      const result1 = memoizedFunction(1, 2);
      expect(result1).toBe(3);
      expect(callCount).toBe(1);

      // Second call with same arguments
      const result2 = memoizedFunction(1, 2);
      expect(result2).toBe(3);
      expect(callCount).toBe(1); // Should not call again

      // Different arguments
      const result3 = memoizedFunction(2, 3);
      expect(result3).toBe(5);
      expect(callCount).toBe(2);
    });

    it("should handle complex arguments", () => {
      let callCount = 0;
      const complexFunction = (obj: any, arr: any[]) => {
        callCount++;
        return obj.value + arr.length;
      };

      const memoizedFunction = memoize(complexFunction);

      const obj1 = { value: 10 };
      const arr1 = [1, 2, 3];

      const result1 = memoizedFunction(obj1, arr1);
      expect(result1).toBe(13);
      expect(callCount).toBe(1);

      const result2 = memoizedFunction(obj1, arr1);
      expect(result2).toBe(13);
      expect(callCount).toBe(1);
    });

    it("should handle different argument types", () => {
      let callCount = 0;
      const mixedFunction = (str: string, num: number, bool: boolean) => {
        callCount++;
        return `${str}-${num}-${bool}`;
      };

      const memoizedFunction = memoize(mixedFunction);

      const result1 = memoizedFunction("test", 42, true);
      expect(result1).toBe("test-42-true");
      expect(callCount).toBe(1);

      const result2 = memoizedFunction("test", 42, true);
      expect(result2).toBe("test-42-true");
      expect(callCount).toBe(1);
    });
  });

  describe("DOM Batcher", () => {
    it("should batch DOM operations", () => {
      const batcher = new DOMBatcher();
      const operations: number[] = [];

      // Add operations
      batcher.add(() => operations.push(1));
      batcher.add(() => operations.push(2));
      batcher.add(() => operations.push(3));

      // Operations should not execute immediately
      expect(operations).toHaveLength(0);

      // Wait for next frame
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          expect(operations).toEqual([1, 2, 3]);
          resolve(undefined);
        });
      });
    });

    it("should handle empty batch", () => {
      const batcher = new DOMBatcher();

      // Should not throw when no operations are added
      expect(() => {
        requestAnimationFrame(() => {});
      }).not.toThrow();
    });

    it("should handle rapid additions", () => {
      const batcher = new DOMBatcher();
      const operations: number[] = [];

      // Add many operations rapidly
      for (let i = 0; i < 100; i++) {
        batcher.add(() => operations.push(i));
      }

      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          expect(operations).toHaveLength(100);
          expect(operations[0]).toBe(0);
          expect(operations[99]).toBe(99);
          resolve(undefined);
        });
      });
    });
  });

  describe("Cache", () => {
    it("should store and retrieve values", () => {
      const cache = new Cache<string>(1000); // 1 second max age

      cache.set("key1", "value1");
      cache.set("key2", "value2");

      expect(cache.get("key1")).toBe("value1");
      expect(cache.get("key2")).toBe("value2");
    });

    it("should return undefined for missing keys", () => {
      const cache = new Cache<string>();

      expect(cache.get("missing")).toBeUndefined();
    });

    it("should handle cache expiration", async () => {
      const cache = new Cache<string>(50); // 50ms max age

      cache.set("key", "value");
      expect(cache.get("key")).toBe("value");

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(cache.get("key")).toBeUndefined();
    });

    it("should clear cache", () => {
      const cache = new Cache<string>();

      cache.set("key1", "value1");
      cache.set("key2", "value2");

      cache.clear();

      expect(cache.get("key1")).toBeUndefined();
      expect(cache.get("key2")).toBeUndefined();
    });

    it("should handle different value types", () => {
      const stringCache = new Cache<string>();
      const numberCache = new Cache<number>();
      const objectCache = new Cache<{ value: string }>();

      stringCache.set("str", "hello");
      numberCache.set("num", 42);
      objectCache.set("obj", { value: "test" });

      expect(stringCache.get("str")).toBe("hello");
      expect(numberCache.get("num")).toBe(42);
      expect(objectCache.get("obj")).toEqual({ value: "test" });
    });

    it("should handle cache size limits", () => {
      const cache = new Cache<string>(1000);

      // Add many items
      for (let i = 0; i < 1000; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      // Should still be able to retrieve items
      expect(cache.get("key0")).toBe("value0");
      expect(cache.get("key999")).toBe("value999");
    });
  });

  describe("Performance", () => {
    it("should handle high-frequency debounce calls efficiently", async () => {
      const mockFunction = jest.fn();
      const debouncedFunction = debounce(mockFunction, 10);

      const startTime = Date.now();

      // Call many times rapidly
      for (let i = 0; i < 1000; i++) {
        debouncedFunction();
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      const endTime = Date.now();

      expect(mockFunction).toHaveBeenCalledTimes(1);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it("should handle high-frequency throttle calls efficiently", async () => {
      const mockFunction = jest.fn();
      const throttledFunction = throttle(mockFunction, 10);

      const startTime = Date.now();

      // Call many times rapidly
      for (let i = 0; i < 1000; i++) {
        throttledFunction();
      }

      const endTime = Date.now();

      expect(mockFunction).toHaveBeenCalledTimes(1);
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it("should handle many memoized calls efficiently", () => {
      let callCount = 0;
      const expensiveFunction = (a: number, b: number) => {
        callCount++;
        return a + b;
      };

      const memoizedFunction = memoize(expensiveFunction);

      const startTime = Date.now();

      // Call with same arguments many times
      for (let i = 0; i < 1000; i++) {
        memoizedFunction(1, 2);
      }

      const endTime = Date.now();

      expect(callCount).toBe(1); // Should only call once
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it("should handle many cache operations efficiently", () => {
      const cache = new Cache<string>();

      const startTime = Date.now();

      // Perform many cache operations
      for (let i = 0; i < 1000; i++) {
        cache.set(`key${i}`, `value${i}`);
        cache.get(`key${i}`);
      }

      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe("Error Handling", () => {
    it("should handle errors in memoized functions", () => {
      const errorFunction = jest.fn(() => {
        throw new Error("Test error");
      });

      const memoizedFunction = memoize(errorFunction);

      // Should throw on first call
      expect(() => memoizedFunction()).toThrow("Test error");

      // Should throw on subsequent calls too
      expect(() => memoizedFunction()).toThrow("Test error");
    });

    it("should handle null and undefined values in cache", () => {
      const cache = new Cache<any>();

      cache.set("null", null);
      cache.set("undefined", undefined);

      expect(cache.get("null")).toBeNull();
      expect(cache.get("undefined")).toBeUndefined();
    });
  });
});
