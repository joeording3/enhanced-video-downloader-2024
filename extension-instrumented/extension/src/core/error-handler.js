// @ts-nocheck
"use strict";
/**
 * Enhanced Video Downloader - Centralized Error Handler
 * Eliminates duplicate try-catch patterns across the codebase
 */
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
exports.errorHandler = exports.CentralizedErrorHandler = void 0;
class CentralizedErrorHandler {
    constructor() {
        this.errorCallbacks = new Set();
    }
    static getInstance() {
        if (!CentralizedErrorHandler.instance) {
            CentralizedErrorHandler.instance = new CentralizedErrorHandler();
        }
        return CentralizedErrorHandler.instance;
    }
    /**
     * Handle async operations with error handling
     */
    handle(operation, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const result = yield operation();
                return {
                    success: true,
                    data: result,
                };
            }
            catch (error) {
                return this.handleError(error, context);
            }
        });
    }
    /**
     * Handle sync operations with error handling
     */
    handleSync(operation, context) {
        try {
            const result = operation();
            return {
                success: true,
                data: result,
            };
        }
        catch (error) {
            return this.handleError(error, context);
        }
    }
    /**
     * Wrap async operations - throws on error
     */
    wrap(operation, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield operation();
            }
            catch (error) {
                this.handleError(error, context);
                throw error;
            }
        });
    }
    /**
     * Wrap sync operations - throws on error
     */
    wrapSync(operation, context) {
        try {
            return operation();
        }
        catch (error) {
            this.handleError(error, context);
            throw error;
        }
    }
    /**
     * Register error callback for custom error handling
     */
    onError(callback) {
        this.errorCallbacks.add(callback);
        return () => {
            this.errorCallbacks.delete(callback);
        };
    }
    /**
     * Internal error handling logic
     */
    handleError(error, context) {
        // Log error with context
        console.error(`[${context.component}] ${context.operation} failed:`, error);
        console.error("Context:", context);
        // Notify error callbacks
        this.errorCallbacks.forEach((callback) => {
            try {
                callback(error, context);
            }
            catch (callbackError) {
                console.error("Error in error callback:", callbackError);
            }
        });
        // Return error result
        return {
            success: false,
            error: error.message,
            userMessage: context.userMessage || `Operation failed: ${context.operation}`,
        };
    }
}
exports.CentralizedErrorHandler = CentralizedErrorHandler;
/**
 * Common error contexts for reuse
 */
CentralizedErrorHandler.contexts = {
    background: {
        serverCheck: (port) => ({
            component: "background",
            operation: "serverCheck",
            data: { port },
            userMessage: "Failed to check server status",
        }),
        portDiscovery: () => ({
            component: "background",
            operation: "portDiscovery",
            userMessage: "Failed to discover server port",
        }),
        downloadRequest: (url) => ({
            component: "background",
            operation: "downloadRequest",
            data: { url },
            userMessage: "Failed to send download request",
        }),
        configUpdate: (config) => ({
            component: "background",
            operation: "configUpdate",
            data: { config },
            userMessage: "Failed to update configuration",
        }),
    },
    content: {
        buttonInjection: (videoElement) => ({
            component: "content",
            operation: "buttonInjection",
            data: { videoElement: videoElement === null || videoElement === void 0 ? void 0 : videoElement.tagName },
            userMessage: "Failed to inject download button",
        }),
        videoDetection: () => ({
            component: "content",
            operation: "videoDetection",
            userMessage: "Failed to detect videos on page",
        }),
        dragOperation: () => ({
            component: "content",
            operation: "dragOperation",
            userMessage: "Failed to handle button drag",
        }),
    },
    popup: {
        statusCheck: () => ({
            component: "popup",
            operation: "statusCheck",
            userMessage: "Failed to check server status",
        }),
        configLoad: () => ({
            component: "popup",
            operation: "configLoad",
            userMessage: "Failed to load configuration",
        }),
        downloadInitiation: (url) => ({
            component: "popup",
            operation: "downloadInitiation",
            data: { url },
            userMessage: "Failed to initiate download",
        }),
    },
    options: {
        configSave: (config) => ({
            component: "options",
            operation: "configSave",
            data: { config },
            userMessage: "Failed to save configuration",
        }),
        historyLoad: () => ({
            component: "options",
            operation: "historyLoad",
            userMessage: "Failed to load download history",
        }),
        themeUpdate: (theme) => ({
            component: "options",
            operation: "themeUpdate",
            data: { theme },
            userMessage: "Failed to update theme",
        }),
    },
};
// Export singleton instance
exports.errorHandler = CentralizedErrorHandler.getInstance();
