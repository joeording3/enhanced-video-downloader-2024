"use strict";
/**
 * Enhanced Video Downloader - Centralized Logger
 * Eliminates duplicate logging patterns across the codebase
 */
// @ts-nocheck
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.CentralizedLogger = void 0;
class CentralizedLogger {
    constructor() {
        this.logs = [];
        this.level = "info";
        this.maxLogs = 1000; // Prevent memory leaks
        this.logCallbacks = new Set();
        // Set up console logging in development
        if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
            this.onLog(entry => {
                const prefix = `[${entry.context.component}]`;
                const timestamp = entry.timestamp.toISOString();
                const message = `${prefix} ${entry.message}`;
                switch (entry.level) {
                    case "debug":
                        console.debug(message, entry.data);
                        break;
                    case "info":
                        console.info(message, entry.data);
                        break;
                    case "warn":
                        console.warn(message, entry.data);
                        break;
                    case "error":
                        console.error(message, entry.data);
                        break;
                }
            });
        }
    }
    static getInstance() {
        if (!CentralizedLogger.instance) {
            CentralizedLogger.instance = new CentralizedLogger();
        }
        return CentralizedLogger.instance;
    }
    /**
     * Set minimum log level
     */
    setLevel(level) {
        this.level = level;
    }
    /**
     * Get all stored logs
     */
    getLogs() {
        return [...this.logs];
    }
    /**
     * Clear all stored logs
     */
    clearLogs() {
        this.logs = [];
    }
    /**
     * Register log callback
     */
    onLog(callback) {
        this.logCallbacks.add(callback);
        return () => {
            this.logCallbacks.delete(callback);
        };
    }
    /**
     * Main logging method
     */
    log(level, message, context = { component: "unknown" }, data) {
        // Check if we should log this level
        if (CentralizedLogger.LEVELS[level] < CentralizedLogger.LEVELS[this.level]) {
            return;
        }
        const entry = {
            timestamp: new Date(),
            level,
            message,
            context,
            data,
        };
        // Add to logs array
        this.logs.push(entry);
        // Prevent memory leaks
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs / 2);
        }
        // Notify callbacks
        this.logCallbacks.forEach(callback => {
            try {
                callback(entry);
            }
            catch (error) {
                console.error("Error in log callback:", error);
            }
        });
    }
    /**
     * Debug level logging
     */
    debug(message, context, data) {
        this.log("debug", message, context, data);
    }
    /**
     * Info level logging
     */
    info(message, context, data) {
        this.log("info", message, context, data);
    }
    /**
     * Warn level logging
     */
    warn(message, context, data) {
        this.log("warn", message, context, data);
    }
    /**
     * Error level logging
     */
    error(message, context, data) {
        this.log("error", message, context, data);
    }
}
exports.CentralizedLogger = CentralizedLogger;
/**
 * Log levels with numeric values for comparison
 */
CentralizedLogger.LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
/**
 * Common logging contexts for reuse
 */
CentralizedLogger.contexts = {
    background: {
        serverCheck: (port) => ({
            component: "background",
            operation: "serverCheck",
            data: { port },
        }),
        portDiscovery: () => ({
            component: "background",
            operation: "portDiscovery",
        }),
        downloadRequest: (url) => ({
            component: "background",
            operation: "downloadRequest",
            data: { url },
        }),
        configUpdate: (config) => ({
            component: "background",
            operation: "configUpdate",
            data: { config },
        }),
        initialization: () => ({
            component: "background",
            operation: "initialization",
        }),
    },
    content: {
        buttonInjection: (videoElement) => ({
            component: "content",
            operation: "buttonInjection",
            data: { videoElement: videoElement === null || videoElement === void 0 ? void 0 : videoElement.tagName },
        }),
        videoDetection: () => ({
            component: "content",
            operation: "videoDetection",
        }),
        dragOperation: () => ({
            component: "content",
            operation: "dragOperation",
        }),
        pageLoad: () => ({
            component: "content",
            operation: "pageLoad",
        }),
    },
    popup: {
        statusCheck: () => ({
            component: "popup",
            operation: "statusCheck",
        }),
        configLoad: () => ({
            component: "popup",
            operation: "configLoad",
        }),
        downloadInitiation: (url) => ({
            component: "popup",
            operation: "downloadInitiation",
            data: { url },
        }),
        uiUpdate: () => ({
            component: "popup",
            operation: "uiUpdate",
        }),
    },
    options: {
        configSave: (config) => ({
            component: "options",
            operation: "configSave",
            data: { config },
        }),
        historyLoad: () => ({
            component: "options",
            operation: "historyLoad",
        }),
        themeUpdate: (theme) => ({
            component: "options",
            operation: "themeUpdate",
            data: { theme },
        }),
        pageLoad: () => ({
            component: "options",
            operation: "pageLoad",
        }),
    },
};
/**
 * Utility methods for common logging patterns
 */
CentralizedLogger.utils = {
    /**
     * Log function entry
     */
    functionEntry: (functionName, component, data) => {
        const logger = CentralizedLogger.getInstance();
        logger.debug(`Entering ${functionName}`, { component, operation: functionName }, data);
    },
    /**
     * Log function exit
     */
    functionExit: (functionName, component, data) => {
        const logger = CentralizedLogger.getInstance();
        logger.debug(`Exiting ${functionName}`, { component, operation: functionName }, data);
    },
    /**
     * Log async operation start
     */
    asyncStart: (operationName, component, data) => {
        const logger = CentralizedLogger.getInstance();
        logger.info(`Starting ${operationName}`, { component, operation: operationName }, data);
    },
    /**
     * Log async operation completion
     */
    asyncComplete: (operationName, component, data) => {
        const logger = CentralizedLogger.getInstance();
        logger.info(`Completed ${operationName}`, { component, operation: operationName }, data);
    },
    /**
     * Log async operation failure
     */
    asyncError: (operationName, component, error, data) => {
        const logger = CentralizedLogger.getInstance();
        logger.error(`Failed ${operationName}: ${error.message}`, { component, operation: operationName }, Object.assign({ error }, data));
    },
};
// Export singleton instance
exports.logger = CentralizedLogger.getInstance();
