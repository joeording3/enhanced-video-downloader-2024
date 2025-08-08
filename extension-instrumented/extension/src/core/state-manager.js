"use strict";
/**
 * Enhanced Video Downloader - Centralized State Manager
 * Provides a single source of truth for all extension state
 */
// @ts-nocheck
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stateManager = exports.ExtensionStateManager = void 0;
/**
 * Centralized State Manager for the extension
 * Provides a single source of truth for all state across the extension
 */
class ExtensionStateManager {
    constructor() {
        this.listeners = new Map();
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
    static getInstance() {
        if (!ExtensionStateManager.instance) {
            ExtensionStateManager.instance = new ExtensionStateManager();
        }
        return ExtensionStateManager.instance;
    }
    /**
     * Get the current state
     */
    getState() {
        return Object.assign({}, this.state);
    }
    /**
     * Get a specific part of the state
     */
    getServerState() {
        return Object.assign({}, this.state.server);
    }
    getUIState() {
        return Object.assign({}, this.state.ui);
    }
    getDownloadState() {
        return Object.assign({}, this.state.downloads);
    }
    getFormState() {
        return Object.assign({}, this.state.form);
    }
    /**
     * Update server state
     */
    updateServerState(updates) {
        this.state.server = Object.assign(Object.assign({}, this.state.server), updates);
        this.notifyListeners("serverStatusChanged", this.state.server);
    }
    /**
     * Update UI state
     */
    updateUIState(updates) {
        this.state.ui = Object.assign(Object.assign({}, this.state.ui), updates);
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
    updateDownloadState(updates) {
        this.state.downloads = Object.assign(Object.assign({}, this.state.downloads), updates);
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
    updateFormState(updates) {
        this.state.form = Object.assign(Object.assign({}, this.state.form), updates);
        this.notifyListeners("formValidationChanged", this.state.form);
    }
    /**
     * Subscribe to state changes
     */
    subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        // Return unsubscribe function
        return () => {
            var _a;
            (_a = this.listeners.get(event)) === null || _a === void 0 ? void 0 : _a.delete(callback);
        };
    }
    /**
     * Notify listeners of state changes
     */
    notifyListeners(event, data) {
        const eventListeners = this.listeners.get(event);
        if (eventListeners) {
            eventListeners.forEach(callback => {
                try {
                    callback(data);
                }
                catch (error) {
                    console.error(`Error in state change listener for ${event}:`, error);
                }
            });
        }
    }
    /**
     * Load state from storage
     */
    loadFromStorage() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield chrome.storage.local.get([
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
            }
            catch (error) {
                console.error("Error loading state from storage:", error);
            }
        });
    }
    /**
     * Save state to storage
     */
    saveToStorage() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield chrome.storage.local.set({
                    serverPort: this.state.server.port,
                    serverConfig: this.state.server.config,
                    theme: this.state.ui.theme,
                    buttonState: {
                        position: this.state.ui.buttonPosition,
                        visible: this.state.ui.buttonVisible,
                    },
                    downloadHistory: this.state.downloads.history,
                });
            }
            catch (error) {
                console.error("Error saving state to storage:", error);
            }
        });
    }
    /**
     * Reset state to defaults
     */
    reset() {
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
exports.ExtensionStateManager = ExtensionStateManager;
// Export singleton instance
exports.stateManager = ExtensionStateManager.getInstance();
