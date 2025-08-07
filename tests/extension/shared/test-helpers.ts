/**
 * Shared test helpers for consistent testing patterns across the extension
 */

import { CentralizedLogger } from "../../../extension/src/core/logger";
import { ExtensionStateManager } from "../../../extension/src/core/state-manager";
import {
  setupChromeAPI,
  teardownChromeAPI,
  mockConfigs,
} from "./mock-chrome-api";

export interface TestSetup {
  logger: CentralizedLogger;
  stateManager: ExtensionStateManager;
  chromeMock: any;
}

export interface DOMSetup {
  container: HTMLElement;
  cleanup: () => void;
}

/**
 * Common test setup for extension tests
 */
export function setupTestEnvironment(): TestSetup {
  const logger = CentralizedLogger.getInstance();
  const stateManager = ExtensionStateManager.getInstance();

  // Clear previous state
  logger.clearLogs();
  stateManager.reset();

  // Setup Chrome API
  const chromeMock = setupChromeAPI();
  mockConfigs.default();

  return {
    logger,
    stateManager,
    chromeMock,
  };
}

/**
 * Common test teardown for extension tests
 */
export function teardownTestEnvironment(): void {
  teardownChromeAPI();
}

/**
 * Setup DOM environment for UI tests
 */
export function setupDOM(html: string = ""): DOMSetup {
  const container = document.createElement("div");
  container.id = "test-container";

  if (html) {
    container.innerHTML = html;
  }

  document.body.appendChild(container);

  const cleanup = () => {
    if (container.parentNode) {
      container.parentNode.removeChild(container);
    }
    document.body.innerHTML = "";
  };

  return { container, cleanup };
}

/**
 * Create a mock event for testing
 */
export function createMockEvent(type: string, target?: HTMLElement): Event {
  const event = new Event(type);

  if (target) {
    Object.defineProperty(event, "target", { value: target });
  }

  return event;
}

/**
 * Create a mock form submission event
 */
export function createMockFormEvent(form: HTMLFormElement): Event {
  const event = new Event("submit");
  Object.defineProperty(event, "target", { value: form });
  Object.defineProperty(event, "preventDefault", { value: jest.fn() });
  return event;
}

/**
 * Create a mock click event
 */
export function createMockClickEvent(element: HTMLElement): MouseEvent {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
  });

  Object.defineProperty(event, "target", { value: element });
  return event;
}

/**
 * Create a mock input event
 */
export function createMockInputEvent(
  element: HTMLInputElement,
  value: string
): Event {
  const event = new Event("input");
  element.value = value;
  Object.defineProperty(event, "target", { value: element });
  return event;
}

/**
 * Create a mock change event
 */
export function createMockChangeEvent(
  element: HTMLSelectElement,
  value: string
): Event {
  const event = new Event("change");
  element.value = value;
  Object.defineProperty(event, "target", { value: element });
  return event;
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms: number = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for DOM updates
 */
export function waitForDOMUpdate(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

/**
 * Mock fetch with predefined responses
 */
export function mockFetch(response: any, status: number = 200): jest.Mock {
  const mockFetch = jest.fn();

  mockFetch.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });

  (global as any).fetch = mockFetch;

  return mockFetch;
}

/**
 * Mock fetch with error
 */
export function mockFetchError(error: Error): jest.Mock {
  const mockFetch = jest.fn();
  mockFetch.mockRejectedValue(error);
  (global as any).fetch = mockFetch;
  return mockFetch;
}

/**
 * Create a mock console with spies
 */
export function createMockConsole() {
  const consoleSpy = {
    log: jest.spyOn(console, "log").mockImplementation(),
    warn: jest.spyOn(console, "warn").mockImplementation(),
    error: jest.spyOn(console, "error").mockImplementation(),
    info: jest.spyOn(console, "info").mockImplementation(),
  };

  return {
    ...consoleSpy,
    restore: () => {
      consoleSpy.log.mockRestore();
      consoleSpy.warn.mockRestore();
      consoleSpy.error.mockRestore();
      consoleSpy.info.mockRestore();
    },
  };
}

/**
 * Create test data for downloads
 */
export function createMockDownloadData(count: number = 5) {
  return Array.from({ length: count }, (_, i) => ({
    id: `download-${i}`,
    url: `https://example.com/video-${i}`,
    filename: `video-${i}.mp4`,
    status: i % 3 === 0 ? "completed" : i % 3 === 1 ? "downloading" : "queued",
    progress: i % 3 === 1 ? Math.random() * 100 : 0,
    timestamp: Date.now() - i * 60000,
  }));
}

/**
 * Create test data for server config
 */
export function createMockServerConfig() {
  return {
    serverPort: 9090,
    downloadDir: "/home/user/downloads",
    logLevel: "info",
    format: "mp4",
    maxConcurrentDownloads: 3,
    timeout: 30000,
  };
}

/**
 * Create test data for extension config
 */
export function createMockExtensionConfig() {
  return {
    theme: "light",
    autoStart: true,
    notifications: true,
    historyEnabled: true,
    maxHistoryItems: 100,
  };
}

/**
 * Assert that a function throws with specific error
 */
export async function expectAsyncError(
  fn: () => Promise<any>,
  errorMessage?: string
): Promise<void> {
  try {
    await fn();
    throw new Error("Expected function to throw");
  } catch (error) {
    if (errorMessage) {
      expect(error).toHaveProperty("message", errorMessage);
    }
  }
}

/**
 * Assert that logs contain specific messages
 */
export function expectLogsContain(
  logger: CentralizedLogger,
  messages: string[]
): void {
  const logs = logger.getLogs();

  messages.forEach((message) => {
    expect(logs.some((log) => log.message.includes(message))).toBe(true);
  });
}

/**
 * Assert that logs don't contain specific messages
 */
export function expectLogsNotContain(
  logger: CentralizedLogger,
  messages: string[]
): void {
  const logs = logger.getLogs();

  messages.forEach((message) => {
    expect(logs.some((log) => log.message.includes(message))).toBe(false);
  });
}

/**
 * Create a mock storage with predefined data
 */
export function createMockStorage(data: Record<string, any> = {}) {
  const storage = new Map(Object.entries(data));

  return {
    get: jest.fn((keys: string | string[]) => {
      if (typeof keys === "string") {
        return Promise.resolve({ [keys]: storage.get(keys) });
      }

      const result: Record<string, any> = {};
      keys.forEach((key) => {
        result[key] = storage.get(key);
      });
      return Promise.resolve(result);
    }),

    set: jest.fn((data: Record<string, any>) => {
      Object.entries(data).forEach(([key, value]) => {
        storage.set(key, value);
      });
      return Promise.resolve();
    }),

    remove: jest.fn((keys: string | string[]) => {
      const keyArray = Array.isArray(keys) ? keys : [keys];
      keyArray.forEach((key) => storage.delete(key));
      return Promise.resolve();
    }),

    clear: jest.fn(() => {
      storage.clear();
      return Promise.resolve();
    }),
  };
}

/**
 * Create a mock runtime with predefined responses
 */
export function createMockRuntime() {
  return {
    sendMessage: jest.fn().mockResolvedValue({ status: "success" }),
    getURL: jest.fn((path: string) => path),
    openOptionsPage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    lastError: undefined,
  };
}

/**
 * Create a mock tabs API
 */
export function createMockTabs() {
  return {
    query: jest.fn().mockResolvedValue([]),
    sendMessage: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
    update: jest.fn().mockResolvedValue({}),
    remove: jest.fn().mockResolvedValue({}),
  };
}

/**
 * Test utilities for common assertions
 */
export const testUtils = {
  /**
   * Assert that an element has specific classes
   */
  expectElementClasses(element: HTMLElement, classes: string[]): void {
    classes.forEach((className) => {
      expect(element.classList.contains(className)).toBe(true);
    });
  },

  /**
   * Assert that an element doesn't have specific classes
   */
  expectElementNotClasses(element: HTMLElement, classes: string[]): void {
    classes.forEach((className) => {
      expect(element.classList.contains(className)).toBe(false);
    });
  },

  /**
   * Assert that an element has specific attributes
   */
  expectElementAttributes(
    element: HTMLElement,
    attributes: Record<string, string>
  ): void {
    Object.entries(attributes).forEach(([attr, value]) => {
      expect(element.getAttribute(attr)).toBe(value);
    });
  },

  /**
   * Assert that an element is visible
   */
  expectElementVisible(element: HTMLElement): void {
    expect(element.style.display).not.toBe("none");
    expect(element.style.visibility).not.toBe("hidden");
  },

  /**
   * Assert that an element is hidden
   */
  expectElementHidden(element: HTMLElement): void {
    expect(element.style.display).toBe("none");
  },

  /**
   * Assert that an element is disabled
   */
  expectElementDisabled(element: HTMLElement): void {
    expect(element.hasAttribute("disabled")).toBe(true);
  },

  /**
   * Assert that an element is enabled
   */
  expectElementEnabled(element: HTMLElement): void {
    expect(element.hasAttribute("disabled")).toBe(false);
  },
};
