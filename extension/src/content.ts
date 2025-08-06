/**
 * Enhanced Video Downloader - Content Script
 * Injects download buttons, handles video discovery, and button interactions.
 */

import { ButtonState } from "./types";
import { logger, debounce, getHostname } from "./lib/utils";
import { enhanceYouTubeButton } from "./youtube_enhance";

// Skip location redefinition in test environment
if (!(typeof process !== "undefined" && process.env.JEST_WORKER_ID)) {
  try {
    const originalLocation = window.location;
    try {
      delete (window as any).location;
    } catch {
      // no-op
    }
    Object.defineProperty(window, "location", {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  } catch {
    // no-op if unable to redefine location
  }
}

// Constants for configuration and state management
const BUTTON_ID_PREFIX = "evd-download-button-";
const DRAG_HANDLE_CLASS = "evd-drag-handle";
const BUTTON_TEXT = "DOWNLOAD";
const CHECK_INTERVAL = 2000; // Interval for checking for new videos
const MAX_CHECKS = 5; // Maximum number of checks if no videos are found initially
const VIDEO_SELECTOR =
  'video, iframe[src*="youtube.com"], iframe[src*="vimeo.com"], iframe[src*="dailymotion.com"], iframe[src*="twitch.tv"]';

// Style guideline constants for the download button
const EVD_BUTTON_GUIDELINE_STYLES: Record<string, string> = {
  padding: "4px 8px",
  borderRadius: "4px",
  backgroundColor: "rgba(0, 0, 0, 0.3)", // Default background
  borderWidth: "1px",
  borderStyle: "solid",
};

// Temporary background colors used by the button for feedback
const EVD_BUTTON_TEMPORARY_BACKGROUNDS: string[] = [
  "rgba(255, 0, 0, 0.7)", // FAILED
  "rgb(255, 0, 0)", // FAILED - sometimes computed as rgb
  "rgba(0, 128, 0, 0.7)", // SENT/SUCCESS
  "rgb(0, 128, 0)", // SENT/SUCCESS - sometimes computed as rgb
  "rgba(255, 165, 0, 0.7)", // RETRY/WARNING
  "rgb(255, 165, 0)", // RETRY/WARNING - sometimes computed as rgb
];

// Global state variables
let downloadButton: HTMLElement | null = null;
let dragOffsetX: number = 0;
let dragOffsetY: number = 0;
let isDragging = false;
let lastClickTime = 0; // Used to distinguish single click from drag
const CLICK_THRESHOLD = 200; // Max time in ms to be considered a click
let checksDone = 0;
let checkIntervalId: number | null = null;
let buttonObserver: MutationObserver | null = null; // MutationObserver to watch for button removal
const injectedButtons = new Map<HTMLElement, HTMLElement>(); // Map to store buttons injected for specific videos

// Utility functions
const log = (...args: any[]): void => logger.log(...args);
const _warn = (...args: any[]): void => logger.warn(...args);
const error = (...args: any[]): void => logger.error(...args);

// Detect if running under Jest tests (skip async observers/logs in test environment)
const isJest =
  typeof process !== "undefined" &&
  process.env &&
  typeof process.env.JEST_WORKER_ID !== "undefined";

/**
 * Gets the stored button state (position and hidden status) for the current domain.
 * Uses dynamic window.location.hostname to determine the storage key.
 * @returns A promise that resolves with the button state.
 */
async function getButtonState(): Promise<ButtonState> {
  const domain = getHostname();
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(domain, (result) => {
        if (chrome.runtime.lastError) {
          error(
            "Error getting button state from storage:",
            chrome.runtime.lastError.message
          );
          resolve({ x: 10, y: 10, hidden: false });
          return;
        }
        resolve((result as any)[domain] || { x: 10, y: 10, hidden: false });
      });
    } catch (e) {
      error("Error getting button state from storage:", (e as Error).message);
      resolve({ x: 10, y: 10, hidden: false });
    }
  });
}

/**
 * Saves the button state (position and hidden status) for the current domain.
 * Uses dynamic window.location.hostname to determine the storage key.
 * @param state - The button state to save.
 * @returns A promise that resolves when saving completes.
 */
async function saveButtonState(state: ButtonState): Promise<void> {
  const host = getHostname();
  const data = { [host]: state };
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        error(
          "Error saving button state to storage:",
          chrome.runtime.lastError.message
        );
      }
      resolve();
    });
  });
}

/**
 * Generates an ID for a button.
 * @param videoElement - Optional video element.
 * @returns The button ID.
 */
function getButtonId(videoElement: HTMLElement | null = null): string {
  if (videoElement) {
    return BUTTON_ID_PREFIX + Date.now();
  } else {
    return "evd-download-button-main";
  }
}

/**
 * Ensures the download button's style adheres to guidelines and is visible,
 * especially against interference from other extensions like DarkReader.
 * @param {HTMLElement} buttonElement - The button to style.
 * @returns {void}
 */
function ensureDownloadButtonStyle(buttonElement: HTMLElement): void {
  if (!document || !document.body || !document.body.contains(buttonElement)) {
    return;
  }
  const computedStyle = window.getComputedStyle(buttonElement);
  let _styleAdjusted = false; // For logging

  // Phase 1: Ensure critical visibility (display, opacity) regardless of state
  if (computedStyle.display === "none") {
    buttonElement.style.display = "block";
    _styleAdjusted = true;
    log('EVD button computed display was "none", forced to "block".');
  }
  if (parseFloat(computedStyle.opacity) < 0.8) {
    buttonElement.style.opacity = "1";
    _styleAdjusted = true;
    log('EVD button computed opacity was low, forced to "1".');
  }

  // Phase 2: Enforce guideline styles for the button's DEFAULT state
  const currentInlineBg = buttonElement.style.backgroundColor;
  const isTemporaryFeedbackState = EVD_BUTTON_TEMPORARY_BACKGROUNDS.some(
    (tmpBg) => {
      const normalizedInline = currentInlineBg.replace(/\s/g, "");
      const normalizedTmp = tmpBg.replace(/\s/g, "");
      return normalizedInline === normalizedTmp;
    }
  );

  if (!isTemporaryFeedbackState) {
    // Apply guideline styles
    Object.entries(EVD_BUTTON_GUIDELINE_STYLES).forEach(([prop, value]) => {
      if ((computedStyle as any)[prop] !== value) {
        (buttonElement.style as any)[prop] = value;
        _styleAdjusted = true;
      }
    });
  }
}

/**
 * Creates or updates the download button for a video element.
 * @param videoElement - Optional video element to create a button for.
 * @returns Promise resolving to the created or updated button element.
 */
async function createOrUpdateButton(
  videoElement: HTMLElement | null = null
): Promise<HTMLElement> {
  // If we already have a button and no video is specified, return existing button
  if (downloadButton && !videoElement) {
    ensureDownloadButtonStyle(downloadButton);
    return downloadButton;
  }

  // If we have a video and already injected a button for it, return that button
  if (videoElement && injectedButtons.has(videoElement)) {
    const existingButton = injectedButtons.get(videoElement);
    if (existingButton && document.body.contains(existingButton)) {
      ensureDownloadButtonStyle(existingButton);
      return existingButton;
    }
  }

  // Create a new button
  const btn = document.createElement("button");
  btn.id = getButtonId(videoElement);
  btn.textContent = BUTTON_TEXT;
  btn.className = DRAG_HANDLE_CLASS;

  // Set initial position and style
  btn.style.position = "fixed";
  btn.style.zIndex = "2147483647"; // Maximum z-index value
  btn.classList.add("download-button");

  // Get stored state or default
  const state = await getButtonState();

  // Apply position (respect hidden state later)
  if (typeof state.x === "number" && typeof state.y === "number") {
    btn.style.left = String(state.x) + "px";
    btn.style.top = String(state.y) + "px";
  } else {
    // Default position in top-left
    btn.style.left = "10px";
    btn.style.top = "10px";
  }

  // Add to document
  document.body.appendChild(btn);

  // Apply YouTube-specific enhancements if applicable
  enhanceYouTubeButton(btn);

  // Ensure button has correct style
  ensureDownloadButtonStyle(btn);

  // Add event listeners for dragging
  btn.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return; // Only left mouse button

    lastClickTime = Date.now();
    isDragging = true;
    dragOffsetX = e.clientX - btn.getBoundingClientRect().left;
    dragOffsetY = e.clientY - btn.getBoundingClientRect().top;

    // Add document-level listeners
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", onDragEnd);

    // Prevent text selection during drag
    e.preventDefault();
  });

  // Add click listener for download action
  btn.addEventListener("click", async (e) => {
    // Only handle as click if not dragged significantly
    if (Date.now() - lastClickTime < CLICK_THRESHOLD) {
      e.preventDefault();
      e.stopPropagation();

      // Add visual feedback
      btn.classList.add("download-sending");

      try {
        // Determine download URL, avoid blob URLs by falling back to page URL
        const rawUrl =
          videoElement &&
          videoElement.tagName === "VIDEO" &&
          (videoElement as HTMLVideoElement).src
            ? (videoElement as HTMLVideoElement).src
            : window.location.href;
        const url = rawUrl.startsWith("blob:") ? window.location.href : rawUrl;

        // Send message to background script
        chrome.runtime.sendMessage(
          { type: "downloadVideo", url: url },
          (response) => {
            if (chrome.runtime.lastError) {
              error(
                "Error sending download request:",
                chrome.runtime.lastError.message
              );
              btn.classList.remove("download-sending");
              btn.classList.add("download-error");
              setTimeout(() => {
                btn.classList.remove("download-error");
              }, 2000);
              return;
            }

            if (response && response.status === "success") {
              // Success feedback
              btn.classList.remove("download-sending");
              btn.classList.add("download-success");
              setTimeout(() => {
                btn.classList.remove("download-success");
              }, 2000);
            } else {
              // Error feedback
              btn.classList.remove("download-sending");
              btn.classList.add("download-error");
              setTimeout(() => {
                btn.classList.remove("download-error");
              }, 2000);
            }
          }
        );
      } catch (err) {
        error("Error initiating download:", err);
        btn.classList.remove("download-sending");
        btn.classList.add("download-error");
        setTimeout(() => {
          btn.classList.remove("download-error");
        }, 2000);
      }
    }
  });

  // If this is for a specific video, store in our map
  if (videoElement) {
    injectedButtons.set(videoElement, btn);
  } else {
    downloadButton = btn;
  }

  // Apply hidden state if needed
  if (state.hidden) {
    btn.style.display = "none";
  }

  // Set up observer to detect button removal
  if (!buttonObserver && !isJest) {
    // Only observe DOM mutations outside of Jest tests to avoid async logs
    buttonObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.removedNodes)) {
          if (
            node instanceof HTMLElement &&
            node.id &&
            node.id.startsWith(BUTTON_ID_PREFIX)
          ) {
            log("Button was removed, re-adding");
            createOrUpdateButton();
            return;
          }
        }
      }
    });

    buttonObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  return btn;
}

/**
 * Handle dragging of the button
 * @param event - The mouse move event
 */
function onDrag(event: MouseEvent): void {
  if (!isDragging || !downloadButton) return;

  event.preventDefault();

  // Calculate new position
  const x = event.clientX - dragOffsetX;
  const y = event.clientY - dragOffsetY;

  // Update button position
  downloadButton.style.left = String(x) + "px";
  downloadButton.style.top = String(y) + "px";
}

/**
 * Handle end of dragging and save the new position
 */
async function onDragEnd(): Promise<void> {
  if (!isDragging || !downloadButton) return;

  isDragging = false;

  // Remove document-level listeners
  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", onDragEnd);

  // Get current position
  const rect = downloadButton.getBoundingClientRect();
  const x = rect.left;
  const y = rect.top;

  // Get current hidden state (shouldn't change during drag)
  const state = await getButtonState();

  // Save new position
  await saveButtonState({
    x,
    y,
    hidden: state.hidden,
  });
}

/**
 * Reset button position to default (top-left)
 */
async function resetButtonPosition(): Promise<void> {
  if (!downloadButton) return;

  // Reset to default position
  downloadButton.style.left = "10px";
  downloadButton.style.top = "10px";

  // Get current hidden state
  const state = await getButtonState();

  // Save new position
  await saveButtonState({
    x: 10,
    y: 10,
    hidden: state.hidden,
  });
}

/**
 * Set whether the button is hidden or shown
 * @param hidden - Whether to hide the button
 */
async function setButtonHiddenState(hidden: boolean): Promise<void> {
  if (!downloadButton) return;

  // Set display style
  downloadButton.style.display = hidden ? "none" : "block";

  // Get current position
  const rect = downloadButton.getBoundingClientRect();
  const x = rect.left;
  const y = rect.top;

  // Save state
  await saveButtonState({
    x,
    y,
    hidden,
  });
}

/**
 * Checks if a video is significant enough to inject a download button
 * @param video - The video element to check
 * @returns Whether the video is significant
 */
function isSignificantVideo(video: HTMLElement): boolean {
  // Only consider HTMLVideoElement and IFrameElement
  if (video instanceof HTMLVideoElement) {
    // Exclude ad containers
    const parent = video.parentElement;
    if (parent && parent.classList.contains("ad-banner")) {
      return false;
    }
    const rect = video.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0;
    const isSignificantSize = rect.width >= 200 && rect.height >= 150;
    const hasSrc = !!(video as HTMLVideoElement).src;
    return isVisible && isSignificantSize && hasSrc;
  } else if (video instanceof HTMLIFrameElement) {
    // Always consider iframes significant
    return true;
  }
  return false;
}

/**
 * Find videos on the page and inject download buttons
 */
async function findVideosAndInjectButtons(): Promise<void> {
  // Don't run on extension pages
  if (window.location.href.includes("chrome-extension://")) {
    return;
  }

  // Create global button if not already present
  if (!downloadButton) {
    downloadButton = await createOrUpdateButton();
    checksDone++; // Count the initial injection
  }

  // Find all video elements and significant iframes
  const videos = document.querySelectorAll<HTMLElement>(VIDEO_SELECTOR);
  let foundSignificantVideo = false;

  for (const video of Array.from(videos)) {
    if (isSignificantVideo(video)) {
      foundSignificantVideo = true;
      // Only inject if we haven't already for this video
      if (!injectedButtons.has(video)) {
        await createOrUpdateButton(video);
      }
    }
  }

  // Clean up removed videos from our map
  for (const [video] of injectedButtons) {
    if (!document.body.contains(video)) {
      const button = injectedButtons.get(video);
      if (button && document.body.contains(button)) {
        button.remove();
      }
      injectedButtons.delete(video);
    }
  }

  // If we've checked MAX_CHECKS times and found no videos, clear the interval
  if (!foundSignificantVideo && checksDone >= MAX_CHECKS && checkIntervalId) {
    clearInterval(checkIntervalId);
    checkIntervalId = null;
  }
}

/**
 * Main initialization function
 */
async function init(): Promise<void> {
  // Set up global event listeners for dragging
  // document.addEventListener("mousemove", onDrag); // This was moved to mousedown
  // document.addEventListener("mouseup", onDragEnd); // This was moved to mousedown

  await findVideosAndInjectButtons();

  // Set up interval to check for new videos
  if (!checkIntervalId) {
    checkIntervalId = window.setInterval(() => {
      findVideosAndInjectButtons();
    }, CHECK_INTERVAL);
  }

  // Listen for messages from background script or popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "resetButtonPosition") {
      resetButtonPosition().then(() => sendResponse({ success: true }));
      return true; // Keep channel open for async response
    } else if (message.type === "toggleButtonVisibility") {
      const hidden = message.hidden;
      setButtonHiddenState(hidden).then(() => sendResponse({ success: true }));
      return true; // Keep channel open for async response
    }
    return false;
  });
}

/**
 * For testing purposes only.
 * @private
 */
function _resetStateForTesting(): void {
  isDragging = false;
  dragOffsetX = 0;
  dragOffsetY = 0;
  lastClickTime = 0;
  downloadButton = null;
  injectedButtons.clear();
  if (buttonObserver) {
    buttonObserver.disconnect();
    buttonObserver = null;
  }
}

// Global listeners - initialize once
if (typeof window !== "undefined") {
  document.addEventListener("dragover", (event) => {
    if (isDragging) {
      event.preventDefault();
    }
  });
}

// Initialize the script
// init(); // Should not be called directly, but by the condition below

// Export functions for testing
export {
  createOrUpdateButton,
  resetButtonPosition,
  setButtonHiddenState,
  isSignificantVideo,
  debounce,
  getButtonState,
  saveButtonState,
  ensureDownloadButtonStyle,
  _resetStateForTesting,
};

// Initialize content script
if (!(typeof process !== "undefined" && process.env.JEST_WORKER_ID)) {
  init();
}
