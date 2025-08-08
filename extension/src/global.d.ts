/**
 * Global type definitions for the Enhanced Video Downloader extension.
 * Declares global types and interfaces used throughout the extension.
 */

// Global type declarations

declare namespace chrome {
  export interface StorageArea {
    /** Promise-based get */
    get(
      keys: string | string[] | object | null
    ): Promise<{ [key: string]: any }>;
    /** Callback-based get */
    get(
      keys: string | string[] | object | null,
      callback: (items: any) => void
    ): void;
    /** Promise-based set */
    set(items: object): Promise<void>;
    /** Callback-based set */
    set(items: object, callback?: () => void): void;
  }

  export interface Storage {
    local: StorageArea;
    onChanged: {
      addListener(
        callback: (
          changes: Record<string, { oldValue?: any; newValue?: any }>,
          areaName: "sync" | "local" | "managed"
        ) => void
      ): void;
    };
  }

  export interface RuntimeLastError {
    message?: string;
  }

  export interface Runtime {
    /** Fired when the extension is first installed, updated, or Chrome is updated */
    onInstalled: {
      addListener(callback: (details: any) => void): void;
    };
    /** Fired when a profile that has the extension installed first starts up */
    onStartup: {
      addListener(callback: () => void): void;
    };
    /** Last error from runtime operations; null if none */
    lastError?: RuntimeLastError | null;
    /** Promisified sendMessage; returns a promise resolving to response */
    sendMessage(message: any): Promise<any>;
    /** Callback-based sendMessage */
    sendMessage(message: any, responseCallback: (response: any) => void): void;
    onMessage: {
      /**
       * Add listener for incoming messages; return true to keep channel open for async response
       */
      addListener(
        callback: (
          message: any,
          sender: any,
          sendResponse: (response?: any) => void
        ) => boolean | void
      ): void;
    };
    /** Get extension manifest */
    getManifest(): { [key: string]: any; name?: string };
    /** Get full URL for extension resource */
    getURL(path: string): string;
  }

  export interface Tab {
    id?: number;
    url?: string;
    title?: string;
    active: boolean;
    windowId: number;
  }

  export interface Tabs {
    query(
      queryInfo: { active: boolean; currentWindow: boolean },
      callback: (tabs: Tab[]) => void
    ): void;
    sendMessage(
      tabId: number,
      message: any,
      responseCallback?: (response: any) => void
    ): void;
  }

  export interface Action {
    setIcon(
      details: { path: Record<string, string> },
      callback?: () => void
    ): void;
  }

  /** Notification options for browser notifications */
  export interface NotificationOptions {
    type?: string;
    title?: string;
    message?: string;
    iconUrl?: string;
    // Additional fields as needed
  }

  /** Notifications API */
  export interface Notifications {
    create(
      notificationId: string,
      options: NotificationOptions,
      callback?: (notificationId: string) => void
    ): void;
  }

  export const storage: Storage;
  export const notifications: Notifications;
  export const runtime: Runtime;
  export const tabs: Tabs;
  export const action: Action;
}

// Additional globals for tests
interface Window {
  getHostname?: () => string;
  chrome?: typeof chrome;
  // Override location to any for tests
  location: any;
}

declare var process: {
  env: {
    JEST_WORKER_ID?: string;
    NODE_ENV?: string;
  };
};
