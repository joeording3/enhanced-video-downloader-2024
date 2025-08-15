/**
 * Consolidated Queue Manager for Enhanced Video Downloader
 *
 * This module provides a unified interface for managing the download queue,
 * with the server as the single source of truth. It eliminates the need
 * for local queue state duplication and provides better synchronization.
 */

import { logger } from "./core/logger";
import { MESSAGE_TYPES, NETWORK_CONSTANTS } from "./core/constants";

export interface QueueItem {
  downloadId: string;
  url: string;
  pageTitle?: string;
  filename?: string;
  status: "queued" | "downloading" | "paused" | "completed" | "error" | "canceled";
  progress?: number;
  timestamp?: number;
}

export interface QueueStatus {
  active: Record<string, QueueItem>;
  queued: QueueItem[];
  totalCount: number;
}

export interface QueueOperationResult {
  success: boolean;
  message?: string;
  data?: any;
}

/**
 * Consolidated Queue Manager that maintains server as source of truth
 */
export class ConsolidatedQueueManager {
  private serverPort: number | null = null;
  private statusCache: QueueStatus | null = null;
  private lastUpdateTime: number = 0;
  private updateListeners: Set<(status: QueueStatus) => void> = new Set();
  private isUpdating: boolean = false;
  private updateInterval: ReturnType<typeof setInterval> | null = null;
  private readonly CACHE_TTL_MS = 2000; // 2 seconds cache validity

  constructor() {
    // Don't start periodic updates immediately - let the background script control this
    // this.setupPeriodicUpdates();
  }

  /**
   * Set the server port for API calls
   */
  setServerPort(port: number): void {
    this.serverPort = port;
    this.invalidateCache();
  }

  /**
   * Get the current server port
   */
  getServerPort(): number | null {
    return this.serverPort;
  }

  /**
   * Add a listener for queue status updates
   */
  addUpdateListener(listener: (status: QueueStatus) => void): () => void {
    this.updateListeners.add(listener);

    // Immediately notify with current status if available
    if (this.statusCache) {
      listener(this.statusCache);
    }

    // Return unsubscribe function
    return () => {
      this.updateListeners.delete(listener);
    };
  }

  /**
   * Get current queue status (from cache if valid, otherwise fetch from server)
   */
    async getQueueStatus(forceRefresh: boolean = false): Promise<QueueStatus> {
    const now = Date.now();
    const cacheValid = this.statusCache &&
                      (now - this.lastUpdateTime) < this.CACHE_TTL_MS;

    if (!forceRefresh && cacheValid) {
      return this.statusCache!;
    }

    return this.refreshQueueStatus();
  }

  /**
   * Add a new download to the queue
   */
  async addToQueue(url: string, options: {
    quality?: string;
    format?: string;
    isPlaylist?: boolean;
    pageTitle?: string;
  } = {}): Promise<QueueOperationResult> {
    if (!this.serverPort) {
      return { success: false, message: "Server not available" };
    }

    try {
      const response = await fetch(
        NETWORK_CONSTANTS.buildServerUrl(this.serverPort, "/api/download"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            quality: options.quality || "best",
            format: options.format || "mp4",
            download_playlist: options.isPlaylist || false,
            page_title: options.pageTitle || "",
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Server error: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();

      if (result.status === "success" || result.status === "queued") {
        // Invalidate cache to force refresh
        this.invalidateCache();
        // Force a fresh refresh to ensure we have the latest server state
        await this.refreshQueueStatus();
        // Notify listeners of the update
        await this.notifyListeners();

        return { success: true, data: result };
      } else {
        return { success: false, message: result.message || "Unknown error" };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      logger.error("Failed to add to queue", { component: "queue-manager" });
      return { success: false, message };
    }
  }

  /**
   * Remove an item from the queue
   */
  async removeFromQueue(downloadId: string): Promise<QueueOperationResult> {
    if (!this.serverPort) {
      return { success: false, message: "Server not available" };
    }

    try {
      // Try queue remove endpoint first, then fall back to cancel
      const endpoints = [
        `/api/queue/${encodeURIComponent(downloadId)}/remove`,
        `/api/download/${encodeURIComponent(downloadId)}/cancel`,
      ];

      let success = false;
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(
            NETWORK_CONSTANTS.buildServerUrl(this.serverPort, endpoint),
            { method: "POST" }
          );

          if (response.ok || response.status === 404) {
            success = true;
            break;
          }
        } catch {
          // Continue to next endpoint
        }
      }

      if (success) {
        this.invalidateCache();
        // Force a fresh refresh to ensure we have the latest server state
        await this.refreshQueueStatus();
        await this.notifyListeners();
        return { success: true };
      } else {
        return { success: false, message: "Failed to remove from queue" };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      logger.error("Failed to remove from queue", { component: "queue-manager" });
      return { success: false, message };
    }
  }

  /**
   * Reorder the queue
   */
  async reorderQueue(newOrder: string[]): Promise<QueueOperationResult> {
    if (!this.serverPort) {
      return { success: false, message: "Server not available" };
    }

    try {
      const response = await fetch(
        NETWORK_CONSTANTS.buildServerUrl(this.serverPort, "/api/queue/reorder"),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order: newOrder }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Server error: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();

      if (result.status === "success") {
        this.invalidateCache();
        // Force a fresh refresh to ensure we have the latest server state
        await this.refreshQueueStatus();
        await this.notifyListeners();
        return { success: true };
      } else {
        return { success: false, message: result.message || "Unknown error" };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      logger.error("Failed to reorder queue", { component: "queue-manager" });
      return { success: false, message };
    }
  }

  /**
   * Pause a download
   */
  async pauseDownload(downloadId: string): Promise<QueueOperationResult> {
    if (!this.serverPort) {
      return { success: false, message: "Server not available" };
    }

    try {
      const response = await fetch(
        NETWORK_CONSTANTS.buildServerUrl(this.serverPort, `/api/download/${downloadId}/pause`),
        { method: "POST" }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Server error: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();

      if (result.status === "success") {
        this.invalidateCache();
        // Force a fresh refresh to ensure we have the latest server state
        await this.refreshQueueStatus();
        await this.notifyListeners();
        return { success: true };
      } else {
        return { success: false, message: result.message || "Unknown error" };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      logger.error("Failed to pause download", { component: "queue-manager" });
      return { success: false, message };
    }
  }

  /**
   * Resume a download
   */
    async resumeDownload(downloadId: string): Promise<QueueOperationResult> {
    if (!this.serverPort) {
      return { success: false, message: "Server not available" };
    }

    try {
      const response = await fetch(
        NETWORK_CONSTANTS.buildServerUrl(this.serverPort, `/api/download/${downloadId}/resume`),
        { method: "POST" }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Server error: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();

      if (result.status === "success") {
        this.invalidateCache();
        // Force a fresh refresh to ensure we have the latest server state
        await this.refreshQueueStatus();
        await this.notifyListeners();
        return { success: true };
      } else {
        return { success: false, message: result.message || "Unknown error" };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      logger.error("Failed to resume download", { component: "queue-manager" });
      return { success: false, message };
    }
  }

  /**
   * Set priority for a download
   */
  async setPriority(downloadId: string, priority: number): Promise<QueueOperationResult> {
    if (!this.serverPort) {
      return { success: false, message: "Server not available" };
    }

    try {
      const response = await fetch(
        NETWORK_CONSTANTS.buildServerUrl(this.serverPort, `/api/download/${downloadId}/priority`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Server error: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();

      if (result.status === "success") {
        this.invalidateCache();
        // Force a fresh refresh to ensure we have the latest server state
        await this.refreshQueueStatus();
        await this.notifyListeners();
        return { success: true };
      } else {
        return { success: false, message: result.message || "Unknown error" };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      logger.error("Failed to set priority", { component: "queue-manager" });
      return { success: false, message };
    }
  }

  /**
   * Force start a queued download
   */
  async forceStart(downloadId: string): Promise<QueueOperationResult> {
    if (!this.serverPort) {
      return { success: false, message: "Server not available" };
    }

    try {
      const response = await fetch(
        NETWORK_CONSTANTS.buildServerUrl(this.serverPort, `/api/queue/${downloadId}/force-start`),
        { method: "POST" }
      );

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          message: `Server error: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json();

      if (result.status === "success") {
        this.invalidateCache();
        // Force a fresh refresh to ensure we have the latest server state
        await this.refreshQueueStatus();
        await this.notifyListeners();
        return { success: true };
      } else {
        return { success: false, message: result.message || "Unknown error" };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
      logger.error("Failed to force start download", { component: "queue-manager" });
      return { success: false, message };
    }
  }

  /**
   * Get the current badge count for the extension icon
   */
  getBadgeCount(): number {
    if (!this.statusCache) return 0;
    return this.statusCache.totalCount;
  }

  /**
   * Start periodic updates
   */
  startPeriodicUpdates(intervalMs: number = 5000): void {
    this.stopPeriodicUpdates();
    this.updateInterval = setInterval(() => {
      this.refreshQueueStatus().catch(error => {
        logger.error("Periodic queue update failed:", error);
      });
    }, intervalMs);
  }

  /**
   * Stop periodic updates
   */
  stopPeriodicUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopPeriodicUpdates();
    this.updateListeners.clear();
    this.statusCache = null;
  }

  // Private methods

  private async refreshQueueStatus(): Promise<QueueStatus> {
    if (!this.serverPort || this.isUpdating) {
      return this.statusCache || { active: {}, queued: [], totalCount: 0 };
    }

    this.isUpdating = true;

    try {
      const response = await fetch(
        NETWORK_CONSTANTS.buildServerUrl(this.serverPort, "/api/status?include_queue=1")
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Parse the response into our standardized format
      const active: Record<string, QueueItem> = {};
      const queued: QueueItem[] = [];

      Object.entries(data).forEach(([id, item]: [string, any]) => {
        const status = String(item?.status || "").toLowerCase();
        const queueItem: QueueItem = {
          downloadId: id,
          url: item?.url || "",
          pageTitle: item?.title || item?.page_title || "",
          filename: item?.filename || "",
          status: status as QueueItem["status"],
          progress: this.parseProgress(item),
          timestamp: Date.now(),
        };

        if (status === "queued") {
          queued.push(queueItem);
        } else if (["downloading", "paused", "starting"].includes(status)) {
          active[id] = queueItem;
        }
      });

      const status: QueueStatus = {
        active,
        queued,
        totalCount: Object.keys(active).length + queued.length,
      };

      this.statusCache = status;
      this.lastUpdateTime = Date.now();

      return status;
    } catch (error) {
      logger.error("Failed to refresh queue status", { component: "queue-manager" });
      // Return cached data if available, otherwise empty status
      return this.statusCache || { active: {}, queued: [], totalCount: 0 };
    } finally {
      this.isUpdating = false;
    }
  }

  private parseProgress(item: any): number {
    try {
      // Try to extract progress from various possible fields
      if (typeof item?.progress === "number" && Number.isFinite(item.progress)) {
        return Math.min(100, Math.max(0, item.progress));
      }

      if (typeof item?.percent === "string") {
        const parsed = parseFloat(item.percent.replace("%", ""));
        if (Number.isFinite(parsed)) {
          return Math.min(100, Math.max(0, parsed));
        }
      }

      // Check history for recent progress
      if (Array.isArray(item?.history) && item.history.length > 0) {
        const lastHistory = item.history[item.history.length - 1];
        if (typeof lastHistory?.percent === "string") {
          const parsed = parseFloat(lastHistory.percent.replace("%", ""));
          if (Number.isFinite(parsed)) {
            return Math.min(100, Math.max(0, parsed));
          }
        }
      }

      return 0;
    } catch {
      return 0;
    }
  }

  private invalidateCache(): void {
    this.statusCache = null;
  }

  private async notifyListeners(): Promise<void> {
    if (!this.statusCache) return;

    const promises = Array.from(this.updateListeners).map(listener => {
      try {
        listener(this.statusCache!);
      } catch (error) {
        logger.error("Error in queue update listener", { component: "queue-manager" });
      }
    });

    await Promise.allSettled(promises);
  }

  private setupPeriodicUpdates(): void {
    // Start with a reasonable default interval
    this.startPeriodicUpdates(5000);
  }
}

// Export singleton instance
export const queueManager = new ConsolidatedQueueManager();
