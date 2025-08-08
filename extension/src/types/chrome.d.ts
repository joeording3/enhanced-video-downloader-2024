/**
 * Chrome extension API type definitions.
 * Extends the Chrome extension APIs with additional type safety.
 */

// Extend Chrome extension APIs with additional type safety
interface ChromeStorageLocal {
  get(
    keys: string | string[] | object | null,
    callback: (items: Record<string, any>) => void
  ): void;
  /** Promise-based get for async/await support */
  get(keys: string | string[] | object | null): Promise<Record<string, any>>;
  set(items: object, callback?: () => void): void;
  /** Promise-based set for async/await support */
  set(items: object): Promise<void>;
}

interface ChromeStorage {
  local: ChromeStorageLocal;
}

interface ChromeRuntimeLastError {
  message?: string;
}

interface ChromeRuntime {
  lastError?: ChromeRuntimeLastError;
  sendMessage(message: any, callback?: (response: any) => void): void;
  /** Promise-based sendMessage for async/await support */
  sendMessage(message: any): Promise<any>;
  onMessage: {
    addListener(
      callback: (
        message: any,
        sender: any,
        sendResponse: (response?: any) => void
      ) => void
    ): void;
  };
  getManifest(): { [key: string]: any };
  getURL(path: string): string;
}

interface ChromeTabs {
  query(queryInfo: object, callback: (tabs: any[]) => void): void;
  sendMessage(
    tabId: number,
    message: any,
    callback?: (response: any) => void
  ): void;
}

interface ChromeAction {
  setIcon(details: { path: object }, callback?: () => void): void;
}

interface ChromeNotifications {
  create(
    notificationId: string,
    options: { type: string; iconUrl: string; title: string; message: string },
    callback?: () => void
  ): void;
}

interface Chrome {
  storage: ChromeStorage;
  runtime: ChromeRuntime;
  tabs: ChromeTabs;
  action: ChromeAction;
  notifications: ChromeNotifications;
}
