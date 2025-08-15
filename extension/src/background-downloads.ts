/**
 * Background Download Management Module
 * Extracted from background.ts to reduce bundle size
 */

import { logger } from "./core/logger";
import { NETWORK_CONSTANTS } from "./core/constants";
import type { ActiveDownloadEntry } from "./types";

// Types for active downloads and queue
// Use ActiveDownloadEntry directly since it already has all the properties we need

// Download state management
export let downloadQueue: string[] = []; // Stores URLs of queued videos
export const activeDownloads: Record<string, ActiveDownloadEntry> = {}; // Store {url: {status, progress, filename}}
export const queuedDetails: Record<string, { url?: string; title?: string; filename?: string }> =
  {};

/**
 * Update queue UI and persist to storage
 */
export const updateQueueUI = (): void => {
  // Persist queue to storage
  persistQueue();
  try {
    chrome.runtime.sendMessage(
      {
        type: "queueUpdated",
        data: {
          queue: downloadQueue,
          active: activeDownloads,
          queuedDetails,
        },
      },
      () => {
        try {
          const _ = (chrome.runtime as any)?.lastError?.message;
          void _;
        } catch {}
      }
    );
  } catch {}
};

/**
 * Persist queue to storage
 */
const persistQueue = (): void => {
  try {
    chrome.storage.local.set({
      downloadQueue,
      activeDownloads,
      queuedDetails,
    });
  } catch {
    // ignore storage errors
  }
};

/**
 * Load queue from storage
 */
/*
export const loadQueueFromStorage = async (): Promise<void> => {
  try {
    const result = await chrome.storage.local.get([
      "downloadQueue",
      "activeDownloads",
      "queuedDetails",
    ]);

    if (result.downloadQueue) downloadQueue = result.downloadQueue;
    if (result.activeDownloads) Object.assign(activeDownloads, result.activeDownloads);
    if (result.queuedDetails) Object.assign(queuedDetails, result.queuedDetails);
  } catch {
    // ignore storage errors
  }
};
*/

/**
 * Add download to queue
 */
export const addToQueue = (url: string, title?: string, filename?: string): void => {
  if (!downloadQueue.includes(url)) {
    downloadQueue.push(url);
    if (title || filename) {
      queuedDetails[url] = { title, filename };
    }
    updateQueueUI();
  }
};

/**
 * Remove download from queue
 */
export const removeFromQueue = (url: string): void => {
  const index = downloadQueue.indexOf(url);
  if (index > -1) {
    downloadQueue.splice(index, 1);
    delete queuedDetails[url];
    updateQueueUI();
  }
};

/**
 * Clear entire queue
 */
export const clearQueue = (): void => {
  downloadQueue = [];
  Object.keys(queuedDetails).forEach(key => delete queuedDetails[key]);
  updateQueueUI();
};

/**
 * Update download status
 */
export const updateDownloadStatus = (url: string, status: Partial<ActiveDownloadEntry>): void => {
  if (activeDownloads[url]) {
    Object.assign(activeDownloads[url], status);
  } else {
    activeDownloads[url] = { url, status: "starting", progress: 0, ...status };
  }
  updateQueueUI();
};

/**
 * Remove completed download
 */
export const removeCompletedDownload = (url: string): void => {
  delete activeDownloads[url];
  updateQueueUI();
};

/**
 * Get queue status
 */
export const getQueueStatus = () => ({
  queue: downloadQueue,
  active: activeDownloads,
  queuedDetails,
});
