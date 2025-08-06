/**
 * @file jest.setup.js
 * @description Jest global setup file.
 *
 * This file is executed before each test file is run.
 * It is the ideal place to set up global mocks and other test environment setup.
 */

console.log(
  "Jest setup file loaded - suppressing console messages during tests"
);

// Suppress console messages during tests to clean up output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeEach(() => {
  // Suppress console messages during tests
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterEach(() => {
  // Restore console messages after tests
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
});

// Mock the Chrome extension APIs
global.chrome = {
  action: {
    setIcon: jest.fn(),
  },
  runtime: {
    getURL: jest.fn((path) => path),
    sendMessage: jest.fn((message, callback) => {
      if (callback) {
        // Handle both sync and async callbacks
        if (typeof callback === "function") {
          callback({ status: "success" });
        }
      }
      // Return a promise for async usage
      return Promise.resolve({ status: "success" });
    }),
    onMessage: {
      addListener: jest.fn(),
    },
    getManifest: jest.fn(() => ({
      name: "Enhanced Video Downloader",
      version: "1.0.0",
    })),
    lastError: null,
  },
  storage: {
    local: {
      get: jest.fn().mockImplementation((keys, callback) => {
        if (typeof keys === "function") {
          callback = keys;
          keys = null;
        }
        // Handle both sync and async callbacks
        if (typeof callback === "function") {
          callback({});
        }
        // Return a promise for async usage
        return Promise.resolve({});
      }),
      set: jest.fn().mockImplementation((items, callback) => {
        if (typeof callback === "function") {
          callback();
        }
        // Return a promise for async usage
        return Promise.resolve();
      }),
    },
  },
  notifications: {
    create: jest.fn(),
  },
  tabs: {
    create: jest.fn(),
    query: jest.fn(),
  },
};

// Mock for matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});
