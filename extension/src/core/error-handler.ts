/**
 * Enhanced Video Downloader - Centralized Error Handler
 * Eliminates duplicate try-catch patterns across the codebase
 */

export interface ErrorContext {
  component: string;
  operation: string;
  data?: any;
  userMessage?: string;
}

export interface ErrorResult {
  success: boolean;
  error?: string;
  data?: any;
  userMessage?: string;
}

export interface ErrorHandler {
  handle<T>(
    operation: () => T | Promise<T>,
    context: ErrorContext
  ): Promise<ErrorResult>;
  handleSync<T>(operation: () => T, context: ErrorContext): ErrorResult;
  wrap<T>(operation: () => T | Promise<T>, context: ErrorContext): Promise<T>;
  wrapSync<T>(operation: () => T, context: ErrorContext): T;
}

export class CentralizedErrorHandler implements ErrorHandler {
  private static instance: CentralizedErrorHandler;
  private errorCallbacks: Set<(error: Error, context: ErrorContext) => void> =
    new Set();

  private constructor() {}

  static getInstance(): CentralizedErrorHandler {
    if (!CentralizedErrorHandler.instance) {
      CentralizedErrorHandler.instance = new CentralizedErrorHandler();
    }
    return CentralizedErrorHandler.instance;
  }

  /**
   * Handle async operations with error handling
   */
  async handle<T>(
    operation: () => T | Promise<T>,
    context: ErrorContext
  ): Promise<ErrorResult> {
    try {
      const result = await operation();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return this.handleError(error as Error, context);
    }
  }

  /**
   * Handle sync operations with error handling
   */
  handleSync<T>(operation: () => T, context: ErrorContext): ErrorResult {
    try {
      const result = operation();
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return this.handleError(error as Error, context);
    }
  }

  /**
   * Wrap async operations - throws on error
   */
  async wrap<T>(
    operation: () => T | Promise<T>,
    context: ErrorContext
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error as Error, context);
      throw error;
    }
  }

  /**
   * Wrap sync operations - throws on error
   */
  wrapSync<T>(operation: () => T, context: ErrorContext): T {
    try {
      return operation();
    } catch (error) {
      this.handleError(error as Error, context);
      throw error;
    }
  }

  /**
   * Register error callback for custom error handling
   */
  onError(callback: (error: Error, context: ErrorContext) => void): () => void {
    this.errorCallbacks.add(callback);
    return () => {
      this.errorCallbacks.delete(callback);
    };
  }

  /**
   * Internal error handling logic
   */
  private handleError(error: Error, context: ErrorContext): ErrorResult {
    // Log error with context
    console.error(`[${context.component}] ${context.operation} failed:`, error);
    console.error("Context:", context);

    // Notify error callbacks
    this.errorCallbacks.forEach((callback) => {
      try {
        callback(error, context);
      } catch (callbackError) {
        console.error("Error in error callback:", callbackError);
      }
    });

    // Return error result
    return {
      success: false,
      error: error.message,
      userMessage:
        context.userMessage || `Operation failed: ${context.operation}`,
    };
  }

  /**
   * Common error contexts for reuse
   */
  static contexts = {
    background: {
      serverCheck: (port: number) => ({
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
      downloadRequest: (url: string) => ({
        component: "background",
        operation: "downloadRequest",
        data: { url },
        userMessage: "Failed to send download request",
      }),
      configUpdate: (config: any) => ({
        component: "background",
        operation: "configUpdate",
        data: { config },
        userMessage: "Failed to update configuration",
      }),
    },
    content: {
      buttonInjection: (videoElement?: HTMLElement) => ({
        component: "content",
        operation: "buttonInjection",
        data: { videoElement: videoElement?.tagName },
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
      downloadInitiation: (url: string) => ({
        component: "popup",
        operation: "downloadInitiation",
        data: { url },
        userMessage: "Failed to initiate download",
      }),
    },
    options: {
      configSave: (config: any) => ({
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
      themeUpdate: (theme: string) => ({
        component: "options",
        operation: "themeUpdate",
        data: { theme },
        userMessage: "Failed to update theme",
      }),
    },
  };
}

// Export singleton instance
export const errorHandler = CentralizedErrorHandler.getInstance();
