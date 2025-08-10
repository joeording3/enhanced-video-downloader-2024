/**
 * Shared Chrome API mock utilities for consistent testing across the extension
 */
// @ts-nocheck


export interface ChromeAPIMock {
  runtime: {
    openOptionsPage: jest.Mock;
    getURL: jest.Mock;
    sendMessage: jest.Mock;
    onMessage: {
      addListener: jest.Mock;
      removeListener: jest.Mock;
    };
    lastError?: any;
  };
  storage: {
    local: {
      get: jest.Mock;
      set: jest.Mock;
      remove: jest.Mock;
      clear: jest.Mock;
    };
    sync: {
      get: jest.Mock;
      set: jest.Mock;
      remove: jest.Mock;
      clear: jest.Mock;
    };
  };
  tabs: {
    query: jest.Mock;
    sendMessage: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  webNavigation: {
    onCompleted: {
      addListener: jest.Mock;
      removeListener: jest.Mock;
    };
  };
  contentScripts: {
    register: jest.Mock;
    unregister: jest.Mock;
  };
}

export class ChromeAPIMocker {
  private originalChrome: any;
  private mock: ChromeAPIMock;

  constructor() {
    this.mock = this.createMock();
  }

  private createMock(): ChromeAPIMock {
    return {
      runtime: {
        openOptionsPage: jest.fn(),
        getURL: jest.fn((path: string) => path),
        sendMessage: jest.fn(),
        onMessage: {
          addListener: jest.fn(),
          removeListener: jest.fn(),
        },
      },
      storage: {
        local: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue(undefined),
          remove: jest.fn().mockResolvedValue(undefined),
          clear: jest.fn().mockResolvedValue(undefined),
        },
        sync: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue(undefined),
          remove: jest.fn().mockResolvedValue(undefined),
          clear: jest.fn().mockResolvedValue(undefined),
        },
      },
      tabs: {
        query: jest.fn().mockResolvedValue([]),
        sendMessage: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        remove: jest.fn().mockResolvedValue({}),
      },
      webNavigation: {
        onCompleted: {
          addListener: jest.fn(),
          removeListener: jest.fn(),
        },
      },
      contentScripts: {
        register: jest.fn().mockResolvedValue({}),
        unregister: jest.fn().mockResolvedValue({}),
      },
    };
  }

  setup(): void {
    this.originalChrome = (global as any).chrome;
    (global as any).chrome = this.mock;
  }

  teardown(): void {
    (global as any).chrome = this.originalChrome;
  }

  getMock(): ChromeAPIMock {
    return this.mock;
  }

  // Storage helpers
  mockStorageGet(data: any): void {
    this.mock.storage.local.get.mockResolvedValue(data);
    this.mock.storage.sync.get.mockResolvedValue(data);
  }

  mockStorageSet(): void {
    this.mock.storage.local.set.mockResolvedValue(undefined);
    this.mock.storage.sync.set.mockResolvedValue(undefined);
  }

  mockStorageError(error: any): void {
    this.mock.storage.local.get.mockImplementation((key, callback) => {
      if (callback) {
        callback(error);
      }
      return Promise.reject(error);
    });
  }

  // Runtime helpers
  mockRuntimeSendMessage(response: any): void {
    this.mock.runtime.sendMessage.mockImplementation((message, callback) => {
      if (callback) {
        callback(response);
      }
      return Promise.resolve(response);
    });
  }

  mockRuntimeError(error: any): void {
    this.mock.runtime.lastError = error;
  }

  // Tabs helpers
  mockTabsQuery(tabs: any[]): void {
    this.mock.tabs.query.mockResolvedValue(tabs);
  }

  mockTabsSendMessage(response: any): void {
    this.mock.tabs.sendMessage.mockResolvedValue(response);
  }

  // Message helpers
  mockMessageListener(handler: (message: any, sender: any, sendResponse: any) => void): void {
    this.mock.runtime.onMessage.addListener.mockImplementation(handler);
  }

  // Navigation helpers
  mockWebNavigationListener(handler: (details: any) => void): void {
    this.mock.webNavigation.onCompleted.addListener.mockImplementation(handler);
  }

  // Reset all mocks
  resetMocks(): void {
    jest.clearAllMocks();
    this.mock = this.createMock();
    (global as any).chrome = this.mock;
  }

  // Get call counts
  getCallCount(apiPath: string): number {
    const path = apiPath.split(".");
    let current: any = this.mock;

    for (const key of path) {
      current = current[key];
    }

    return current.mock.calls.length;
  }

  // Get last call arguments
  getLastCallArgs(apiPath: string): any[] {
    const path = apiPath.split(".");
    let current: any = this.mock;

    for (const key of path) {
      current = current[key];
    }

    const calls = current.mock.calls;
    return calls.length > 0 ? calls[calls.length - 1] : [];
  }
}

// Default mock instance
export const chromeAPIMocker = new ChromeAPIMocker();

// Helper function to setup Chrome API for tests
export function setupChromeAPI(): ChromeAPIMock {
  chromeAPIMocker.setup();
  return chromeAPIMocker.getMock();
}

// Helper function to teardown Chrome API after tests
export function teardownChromeAPI(): void {
  chromeAPIMocker.teardown();
}

// Predefined mock configurations
export const mockConfigs = {
  default: () => {
    chromeAPIMocker.mockStorageGet({ theme: "light" });
    chromeAPIMocker.mockStorageSet();
    chromeAPIMocker.mockRuntimeSendMessage({ status: "success" });
  },

  withError: () => {
    chromeAPIMocker.mockStorageError({ message: "Storage error" });
    chromeAPIMocker.mockRuntimeError({ message: "Runtime error" });
  },

  withTheme: (theme: string) => {
    chromeAPIMocker.mockStorageGet({ theme });
    chromeAPIMocker.mockStorageSet();
  },

  withHistory: (history: any[]) => {
    chromeAPIMocker.mockStorageGet({ downloadHistory: history });
    chromeAPIMocker.mockStorageSet();
  },

  withConfig: (config: any) => {
    chromeAPIMocker.mockStorageGet({ extensionConfig: config });
    chromeAPIMocker.mockStorageSet();
  },
};
