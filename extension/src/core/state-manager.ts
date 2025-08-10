/**
 * Centralized state management for the Enhanced Video Downloader extension.
 * Manages server state, connection status, and UI state across components.
 */
// @ts-nocheck


import { Theme, ServerConfig } from "../types";
import type { HistoryEntry } from "../types";

// State interfaces
export interface ServerState {
  port: number | null;
  status: "connected" | "disconnected" | "checking";
  scanInProgress: boolean;
  backoffInterval: number;
  config: Partial<ServerConfig>;
}

export interface UIState {
  buttonPosition: { x: number; y: number };
  buttonVisible: boolean;
  isDragging: boolean;
  theme: Theme;
  dragSrcIndex: number | null;
  statusTimeout: ReturnType<typeof setTimeout> | null;
  lastClickTime: number;
  checksDone: number;
}

export interface DownloadState {
  queue: string[];
  active: Record<string, DownloadStatus>;
  history: HistoryEntry[];
}

export interface FormState {
  errors: Map<string, string>;
  data: Record<string, any>;
  validationErrors: Map<string, string>;
}

export interface DownloadStatus {
  status: string;
  progress: number;
  filename?: string;
  title?: string;
  id?: string;
  url: string;
  error?: string;
  message?: string;
}

export interface ExtensionState {
  server: ServerState;
  ui: UIState;
  downloads: DownloadState;
  form: FormState;
}

// Event types for state changes
export type StateChangeEvent =
  | "serverStatusChanged"
  | "serverPortChanged"
  | "downloadQueueChanged"
  | "downloadActiveChanged"
  | "uiThemeChanged"
  | "buttonPositionChanged"
  | "formValidationChanged";

/**
 * Centralized State Manager for the extension
 * Provides a single source of truth for all state across the extension
 */
export class ExtensionStateManager {
  private static instance: ExtensionStateManager;
  private state: ExtensionState;
  private listeners: Map<StateChangeEvent, Set<(data: any) => void>> = new Map();

  private constructor() {
    this.state = {
      server: {
        port: null,
        status: "disconnected",
        scanInProgress: false,
        backoffInterval: 1000,
        config: {},
      },
      ui: {
        buttonPosition: { x: 10, y: 10 },
        buttonVisible: true,
        isDragging: false,
        theme: "light",
        dragSrcIndex: null,
        statusTimeout: null,
        lastClickTime: 0,
        checksDone: 0,
      },
      downloads: {
        queue: [],
        active: {},
        history: [],
      },
      form: {
        errors: new Map(),
        data: {},
        validationErrors: new Map(),
      },
    };
  }

  /**
   * Get the singleton instance of the state manager
   */
  static getInstance(): ExtensionStateManager {
    if (!ExtensionStateManager.instance) {
      ExtensionStateManager.instance = new ExtensionStateManager();
    }
    return ExtensionStateManager.instance;
  }

  /**
   * Get the current state
   */
  getState(): ExtensionState {
    return { ...this.state };
  }

  /**
   * Get a specific part of the state
   */
  getServerState(): ServerState {
    return { ...this.state.server };
  }

  getUIState(): UIState {
    return { ...this.state.ui };
  }

  getDownloadState(): DownloadState {
    return { ...this.state.downloads };
  }

  getFormState(): FormState {
    return { ...this.state.form };
  }

  /**
   * Update server state
   */
  updateServerState(updates: Partial<ServerState>): void {
    this.state.server = { ...this.state.server, ...updates };
    this.notifyListeners("serverStatusChanged", this.state.server);
  }

  /**
   * Update UI state
   */
  updateUIState(updates: Partial<UIState>): void {
    this.state.ui = { ...this.state.ui, ...updates };

    if (updates.theme !== undefined) {
      this.notifyListeners("uiThemeChanged", this.state.ui.theme);
    }
    if (updates.buttonPosition !== undefined) {
      this.notifyListeners("buttonPositionChanged", this.state.ui.buttonPosition);
    }
  }

  /**
   * Update download state
   */
  updateDownloadState(updates: Partial<DownloadState>): void {
    this.state.downloads = { ...this.state.downloads, ...updates };

    if (updates.queue !== undefined) {
      this.notifyListeners("downloadQueueChanged", this.state.downloads.queue);
    }
    if (updates.active !== undefined) {
      this.notifyListeners("downloadActiveChanged", this.state.downloads.active);
    }
  }

  /**
   * Update form state
   */
  updateFormState(updates: Partial<FormState>): void {
    this.state.form = { ...this.state.form, ...updates };
    this.notifyListeners("formValidationChanged", this.state.form);
  }

  /**
   * Subscribe to state changes
   */
  subscribe(event: StateChangeEvent, callback: (data: any) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Notify listeners of state changes
   */
  private notifyListeners(event: StateChangeEvent, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in state change listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Load state from storage
   */
  async loadFromStorage(): Promise<void> {
    try {
      const result = await chrome.storage.local.get([
        "serverPort",
        "serverConfig",
        "downloadHistory",
        "theme",
        "buttonState",
      ]);

      // Load server state
      if (result.serverPort) {
        this.updateServerState({ port: result.serverPort });
      }

      if (result.serverConfig) {
        this.updateServerState({ config: result.serverConfig });
      }

      // Load UI state
      if (result.theme) {
        this.updateUIState({ theme: result.theme });
      }

      if (result.buttonState) {
        this.updateUIState({
          buttonPosition: result.buttonState.position || { x: 10, y: 10 },
          buttonVisible: result.buttonState.visible !== false,
        });
      }

      // Load download state
      if (result.downloadHistory) {
        this.updateDownloadState({ history: result.downloadHistory });
      }
    } catch (error) {
      console.error("Error loading state from storage:", error);
    }
  }

  /**
   * Save state to storage
   */
  async saveToStorage(): Promise<void> {
    try {
      await chrome.storage.local.set({
        serverPort: this.state.server.port,
        serverConfig: this.state.server.config,
        theme: this.state.ui.theme,
        buttonState: {
          position: this.state.ui.buttonPosition,
          visible: this.state.ui.buttonVisible,
        },
        downloadHistory: this.state.downloads.history,
      });
    } catch (error) {
      console.error("Error saving state to storage:", error);
    }
  }

  /**
   * Reset state to defaults
   */
  reset(): void {
    this.state = {
      server: {
        port: null,
        status: "disconnected",
        scanInProgress: false,
        backoffInterval: 1000,
        config: {},
      },
      ui: {
        buttonPosition: { x: 10, y: 10 },
        buttonVisible: true,
        isDragging: false,
        theme: "light",
        dragSrcIndex: null,
        statusTimeout: null,
        lastClickTime: 0,
        checksDone: 0,
      },
      downloads: {
        queue: [],
        active: {},
        history: [],
      },
      form: {
        errors: new Map(),
        data: {},
        validationErrors: new Map(),
      },
    };
  }
}

// Export singleton instance
export const stateManager = ExtensionStateManager.getInstance();
