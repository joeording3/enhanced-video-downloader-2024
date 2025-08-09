/**
 * Centralized logging system for the Enhanced Video Downloader extension.
 * Provides consistent logging across all components with structured output.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  component: string;
  operation?: string;
  data?: any;
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context: LogContext;
  data?: any;
}

export interface Logger {
  debug(message: string, context?: LogContext, data?: any): void;
  info(message: string, context?: LogContext, data?: any): void;
  warn(message: string, context?: LogContext, data?: any): void;
  error(message: string, context?: LogContext, data?: any): void;
  log(level: LogLevel, message: string, context?: LogContext, data?: any): void;
  setLevel(level: LogLevel): void;
  getLogs(): LogEntry[];
  clearLogs(): void;
}

export class CentralizedLogger implements Logger {
  private static instance: CentralizedLogger;
  private logs: LogEntry[] = [];
  private level: LogLevel = "info";
  private maxLogs = 1000; // Prevent memory leaks
  private logCallbacks: Set<(entry: LogEntry) => void> = new Set();

  private constructor() {
    // Mirror logs to browser console when running inside the extension runtime
    // (service worker, options, popup). This ensures visibility regardless of build env.
    if (typeof chrome !== "undefined" && (chrome as any).runtime) {
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

  static getInstance(): CentralizedLogger {
    if (!CentralizedLogger.instance) {
      CentralizedLogger.instance = new CentralizedLogger();
    }
    return CentralizedLogger.instance;
  }

  /**
   * Log levels with numeric values for comparison
   */
  private static readonly LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Get all stored logs
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Clear all stored logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Register log callback
   */
  onLog(callback: (entry: LogEntry) => void): () => void {
    this.logCallbacks.add(callback);
    return () => {
      this.logCallbacks.delete(callback);
    };
  }

  /**
   * Main logging method
   */
  log(
    level: LogLevel,
    message: string,
    context: LogContext = { component: "unknown" },
    data?: any
  ): void {
    // Check if we should log this level
    if (CentralizedLogger.LEVELS[level] < CentralizedLogger.LEVELS[this.level]) {
      return;
    }

    const entry: LogEntry = {
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
      } catch (error) {
        console.error("Error in log callback:", error);
      }
    });
  }

  /**
   * Debug level logging
   */
  debug(message: string, context?: LogContext, data?: any): void {
    this.log("debug", message, context, data);
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext, data?: any): void {
    this.log("info", message, context, data);
  }

  /**
   * Warn level logging
   */
  warn(message: string, context?: LogContext, data?: any): void {
    this.log("warn", message, context, data);
  }

  /**
   * Error level logging
   */
  error(message: string, context?: LogContext, data?: any): void {
    this.log("error", message, context, data);
  }

  /**
   * Common logging contexts for reuse
   */
  static contexts = {
    background: {
      serverCheck: (port: number) => ({
        component: "background",
        operation: "serverCheck",
        data: { port },
      }),
      portDiscovery: () => ({
        component: "background",
        operation: "portDiscovery",
      }),
      downloadRequest: (url: string) => ({
        component: "background",
        operation: "downloadRequest",
        data: { url },
      }),
      configUpdate: (config: any) => ({
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
      buttonInjection: (videoElement?: HTMLElement) => ({
        component: "content",
        operation: "buttonInjection",
        data: { videoElement: videoElement?.tagName },
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
      downloadInitiation: (url: string) => ({
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
      configSave: (config: any) => ({
        component: "options",
        operation: "configSave",
        data: { config },
      }),
      historyLoad: () => ({
        component: "options",
        operation: "historyLoad",
      }),
      themeUpdate: (theme: string) => ({
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
  static utils = {
    /**
     * Log function entry
     */
    functionEntry: (functionName: string, component: string, data?: any) => {
      const logger = CentralizedLogger.getInstance();
      logger.debug(`Entering ${functionName}`, { component, operation: functionName }, data);
    },

    /**
     * Log function exit
     */
    functionExit: (functionName: string, component: string, data?: any) => {
      const logger = CentralizedLogger.getInstance();
      logger.debug(`Exiting ${functionName}`, { component, operation: functionName }, data);
    },

    /**
     * Log async operation start
     */
    asyncStart: (operationName: string, component: string, data?: any) => {
      const logger = CentralizedLogger.getInstance();
      logger.info(`Starting ${operationName}`, { component, operation: operationName }, data);
    },

    /**
     * Log async operation completion
     */
    asyncComplete: (operationName: string, component: string, data?: any) => {
      const logger = CentralizedLogger.getInstance();
      logger.info(`Completed ${operationName}`, { component, operation: operationName }, data);
    },

    /**
     * Log async operation failure
     */
    asyncError: (operationName: string, component: string, error: Error, data?: any) => {
      const logger = CentralizedLogger.getInstance();
      logger.error(
        `Failed ${operationName}: ${error.message}`,
        { component, operation: operationName },
        { error, ...data }
      );
    },
  };
}

// Export singleton instance
export const logger = CentralizedLogger.getInstance();
