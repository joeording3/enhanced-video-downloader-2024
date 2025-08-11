/**
 * Enhanced Video Downloader - Content Script
 * Handles DOM manipulation, video detection, and UI injection
 */

import { ButtonState } from "./types";
import { debounce, getHostname } from "./lib/utils";
import { enhanceYouTubeButton } from "./youtube_enhance";
import { stateManager } from "./core/state-manager";
import { domManager } from "./core/dom-manager";
import { errorHandler, CentralizedErrorHandler } from "./core/error-handler";
import { logger, CentralizedLogger } from "./core/logger";
import {
  UI_CONSTANTS,
  NETWORK_CONSTANTS,
  DOM_SELECTORS,
  CSS_CLASSES,
  MESSAGE_TYPES,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from "./core/constants";

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

// Constants for configuration and state management - now using centralized constants
const BUTTON_ID_PREFIX = UI_CONSTANTS.BUTTON_ID_PREFIX;
const DRAG_HANDLE_CLASS = UI_CONSTANTS.DRAG_HANDLE_CLASS;
const BUTTON_TEXT = UI_CONSTANTS.BUTTON_TEXT;
const CHECK_INTERVAL = UI_CONSTANTS.VIDEO_CHECK_INTERVAL;
const MAX_CHECKS = UI_CONSTANTS.MAX_VIDEO_CHECKS;
const VIDEO_SELECTOR = DOM_SELECTORS.VIDEO_SELECTORS;
const MIN_VIDEO_WIDTH = UI_CONSTANTS.MIN_VIDEO_WIDTH;
const MIN_VIDEO_HEIGHT = UI_CONSTANTS.MIN_VIDEO_HEIGHT;

// Visual guidelines are enforced via CSS classes in content.css

// Temporary background colors used by the button for feedback
const EVD_BUTTON_TEMPORARY_BACKGROUNDS: string[] = [
  "rgba(255, 0, 0, 0.7)", // FAILED
  "rgb(255, 0, 0)", // FAILED - sometimes computed as rgb
  "rgba(0, 128, 0, 0.7)", // SENT/SUCCESS
  "rgb(0, 128, 0)", // SENT/SUCCESS - sometimes computed as rgb
  "rgba(255, 165, 0, 0.7)", // RETRY/WARNING
  "rgb(255, 165, 0)", // RETRY/WARNING - sometimes computed as rgb
];

// Global state variables - now managed by centralized state manager
const CLICK_THRESHOLD = UI_CONSTANTS.CLICK_THRESHOLD;
let checkIntervalId: number | null = null;
let buttonObserver: MutationObserver | null = null; // MutationObserver to watch for button removal
const injectedButtons = new Map<HTMLElement, HTMLElement>(); // Map to store buttons injected for specific videos

// State managed by centralized state manager
let downloadButton: HTMLElement | null = null;
let activeDragButton: HTMLElement | null = null;

// Utility functions - now using centralized logger
const log = (...args: any[]): void => logger.info(args.join(" "), { component: "content" });
const _warn = (...args: any[]): void => logger.warn(args.join(" "), { component: "content" });
const error = (...args: any[]): void => logger.error(args.join(" "), { component: "content" });

// Detect if running under Jest tests (skip async observers/logs in test environment)
const isJest =
  typeof process !== "undefined" &&
  process.env &&
  typeof process.env.JEST_WORKER_ID !== "undefined";

/**
 * Compute a score for a potential media element. Higher is better.
 * Prefers larger, longer, and metadata-ready HTMLVideoElements. For iframes, prefers larger area.
 */
function scoreMediaElement(element: HTMLElement): number {
  try {
    const rect = element.getBoundingClientRect();
    const areaScore = Math.max(0, rect.width) * Math.max(0, rect.height);

    if (element instanceof HTMLVideoElement) {
      const video = element as HTMLVideoElement;
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const hasMetadata = Number.isFinite(video.readyState) && video.readyState >= 1 ? 1 : 0;
      const hasSrc =
        (video.currentSrc && !video.currentSrc.startsWith("blob:")) || !!video.src ? 1 : 0;
      // Weighted sum: area dominates, then duration, then metadata/src bonuses
      return areaScore + duration * 1000 + hasMetadata * 50000 + hasSrc * 25000;
    }

    if (element instanceof HTMLIFrameElement) {
      // If known video host, give a small bonus
      const src = (element as HTMLIFrameElement).src || "";
      const knownHostBonus =
        /youtube|vimeo|dailymotion|twitch|streamable|wistia|brightcove|jwplayer|xhamster|xvideos|pornhub|redtube|youporn|eporner|porntrex|youjizz|hclips/i.test(
          src
        )
          ? 50000
          : 0;
      return areaScore + knownHostBonus;
    }

    return areaScore;
  } catch {
    return 0;
  }
}

/**
 * Select the primary media candidate from a list of significant elements.
 */
function selectPrimaryMediaCandidate(candidates: HTMLElement[]): HTMLElement | null {
  if (!candidates || candidates.length === 0) return null;
  let best: HTMLElement | null = null;
  let bestScore = -1;
  for (const el of candidates) {
    const s = scoreMediaElement(el);
    if (s > bestScore) {
      bestScore = s;
      best = el;
    }
  }
  return best;
}

/**
 * Gets the stored button state (position and hidden status) for the current domain.
 * Uses dynamic window.location.hostname to determine the storage key.
 * @returns A promise that resolves with the button state.
 */
async function getButtonState(): Promise<ButtonState> {
  const domain = getHostname();
  return new Promise(resolve => {
    try {
      chrome.storage.local.get(domain, result => {
        if (chrome.runtime.lastError) {
          error("Error getting button state from storage:", chrome.runtime.lastError.message);
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
  return new Promise(resolve => {
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        error("Error saving button state to storage:", chrome.runtime.lastError.message);
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
  const isYouTubeEnhanced = buttonElement.classList.contains("youtube-enhanced");

  // Utility: parse rgb/rgba string to [r,g,b]
  const parseColor = (color: string): [number, number, number] | null => {
    const m = color.replace(/\s+/g, "").match(/^rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)$/i);
    if (!m) return null;
    return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  };

  // Utility: estimate luminance
  const luminance = (rgb: [number, number, number]): number =>
    0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];

  // Phase 1: Ensure visibility via class toggles (no inline fallbacks)
  if (computedStyle.display === "none" || buttonElement.classList.contains("hidden")) {
    buttonElement.classList.remove("hidden");
    buttonElement.classList.add("evd-visible");
    _styleAdjusted = true;
    log("EVD button was hidden; made visible via class.");
  } else if (!buttonElement.classList.contains("evd-visible")) {
    buttonElement.classList.add("evd-visible");
  }

  // Force stacking and hit-testing dominance
  try {
    buttonElement.style.setProperty("position", "fixed", "important");
    buttonElement.style.setProperty("z-index", "2147483647", "important");
    buttonElement.style.setProperty("pointer-events", "auto", "important");
    // Improve drag reliability on touch/pointer devices and block native drags
    buttonElement.style.setProperty("touch-action", "none", "important");
    buttonElement.style.setProperty("-webkit-user-drag", "none", "important");
    // Defensive: neutralize site-wide CSS that disables pointer events on descendants
    buttonElement.style.setProperty("-webkit-tap-highlight-color", "transparent", "important");
  } catch {
    // ignore
  }

  // Phase 2: Enforce guideline styles for the button's DEFAULT state
  const currentInlineBg = buttonElement.style.backgroundColor;
  const isTemporaryFeedbackState = EVD_BUTTON_TEMPORARY_BACKGROUNDS.some(
    tmpBg => currentInlineBg.replace(/\s/g, "") === tmpBg.replace(/\s/g, "")
  );

  // Phase 2: Base look & feel handled by CSS class `.download-button`
  // But some sites/extensions may inject inline font sizing onto all buttons.
  // Force essential typography and spacing with inline !important to avoid tiny text.
  try {
    buttonElement.style.setProperty("font-size", "1.5rem", "important");
    buttonElement.style.setProperty("line-height", "1", "important");
    buttonElement.style.setProperty("padding", "5px", "important");
    buttonElement.style.setProperty("border-radius", "10px", "important");
    // Keep border width visible for contrast variants
    buttonElement.style.setProperty("border-width", "2px", "important");
    buttonElement.style.setProperty("border-style", "solid", "important");
  } catch {
    // ignore inline style enforcement errors
  }

  // Phase 2b: Choose contrast-aware colors based on page background
  try {
    // Respect temporary feedback colors; do not override background during feedback
    if (!isTemporaryFeedbackState) {
      const pageBg = window.getComputedStyle(document.body).backgroundColor || "rgb(0,0,0)";
      const rgb = parseColor(pageBg) || [0, 0, 0];
      const isDarkBg = luminance(rgb) < 128; // rough threshold
      buttonElement.classList.remove("evd-on-dark", "evd-on-light");
      buttonElement.classList.add(isDarkBg ? "evd-on-dark" : "evd-on-light");
      _styleAdjusted = true;
    }
  } catch {
    // ignore color detection errors
  }

  // Phase 3: Keep button within viewport bounds (avoid off-screen positioning)
  try {
    const rect = buttonElement.getBoundingClientRect();
    let clamped = false;
    const margin = 16;
    const maxLeft = Math.max(0, window.innerWidth - Math.max(rect.width, 100) - margin);
    const maxTop = Math.max(0, window.innerHeight - Math.max(rect.height, 40) - margin);

    const currentLeft = Math.max(0, parseInt(buttonElement.style.left || "0", 10) || 0);
    const currentTop = Math.max(0, parseInt(buttonElement.style.top || "0", 10) || 0);

    if (currentLeft > maxLeft) {
      buttonElement.style.left = String(maxLeft) + "px";
      clamped = true;
    }
    if (currentTop > maxTop) {
      buttonElement.style.top = String(maxTop) + "px";
      clamped = true;
    }
    if (currentTop < 0) {
      buttonElement.style.top = "10px";
      clamped = true;
    }
    if (clamped) {
      _styleAdjusted = true;
      log("EVD button position clamped to viewport bounds.");
    }
  } catch {
    // Ignore positioning errors
  }
}

/**
 * Creates or updates the download button for a video element.
 * @param videoElement - Optional video element to create a button for.
 * @returns Promise resolving to the created or updated button element.
 */
async function createOrUpdateButton(videoElement: HTMLElement | null = null): Promise<HTMLElement> {
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
  btn.classList.add("download-button");
  btn.classList.add("evd-visible");

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
  // Ensure we do not leave stale GLOBAL buttons around, but keep any injected buttons for videos
  try {
    const existing = Array.from(
      document.querySelectorAll<HTMLButtonElement>("button.evd-drag-handle.download-button")
    );
    const injectedButtonSet = new Set<HTMLElement>(Array.from(injectedButtons.values()));
    existing.forEach(el => {
      const isCurrent = el === btn;
      const isInjected = injectedButtonSet.has(el);
      const isInBody = el.parentElement === document.body;
      if (!isCurrent && isInBody && !isInjected) {
        el.remove();
      }
    });
  } catch {
    // ignore DOM scan errors
  }
  document.body.appendChild(btn);

  // Apply YouTube-specific enhancements if applicable
  enhanceYouTubeButton(btn);

  // Ensure button has correct style
  ensureDownloadButtonStyle(btn);
  // Re-append to end of body to ensure it is above later siblings for stacking contexts
  try {
    if (btn.parentElement === document.body) {
      document.body.removeChild(btn);
      document.body.appendChild(btn);
    }
  } catch {
    // ignore
  }

  // Add event listeners for dragging
  btn.addEventListener("mousedown", e => {
    if (e.button !== 0) return; // Only left mouse button

    const rect = btn.getBoundingClientRect();
    // Track which element is being dragged
    activeDragButton = btn;
    stateManager.updateUIState({
      isDragging: true,
      buttonPosition: {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      },
      // Track drag start to distinguish clicks from drags
      lastClickTime: Date.now(),
    });

    // Visual drag cursor
    try {
      btn.classList.add("dragging");
    } catch {
      /* no-op */
    }

    // Add document-level listeners if not already attached
    document.addEventListener("mousemove", onDrag, { passive: false });
    document.addEventListener("mouseup", onDragEnd, { passive: false, once: true });

    // Prevent site handlers and text selection during drag
    e.preventDefault();
    e.stopImmediatePropagation();
  });

  // Pointer Events fallback (covers stylus/touch and cases where mouse events are suppressed)
  try {
    if (typeof window !== "undefined" && "PointerEvent" in window) {
      btn.addEventListener("pointerdown", e => {
        // Primary pointer only
        if ((e as PointerEvent).isPrimary === false) return;

        const rect = btn.getBoundingClientRect();
        activeDragButton = btn;
        stateManager.updateUIState({
          isDragging: true,
          buttonPosition: {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          },
          lastClickTime: Date.now(),
        });

        try {
          btn.classList.add("dragging");
        } catch {
          /* no-op */
        }

        // Capture pointer so moves continue even if pointer leaves the element
        try {
          (btn as any).setPointerCapture?.((e as PointerEvent).pointerId);
        } catch {
          /* no-op */
        }

        document.addEventListener("pointermove", onPointerMove as any, { passive: false });
        document.addEventListener("pointerup", onPointerEnd as any, { passive: false, once: true });

        // Prevent site handlers and default gestures
        e.preventDefault();
        e.stopImmediatePropagation();
      });
    }
  } catch {
    /* no-op */
  }

  // Add click listener for download action (capture-phase to preempt site handlers)
  btn.addEventListener(
    "click",
    async e => {
    // Only handle as click if not dragged significantly
    const currentState = stateManager.getUIState();
    const now = Date.now();
    const timeSinceLastClick = now - currentState.lastClickTime;

    // Treat as click only when not dragging and sufficient time since drag started
      if (!currentState.isDragging && timeSinceLastClick > CLICK_THRESHOLD) {
      // Update last click time
      stateManager.updateUIState({ lastClickTime: now });
        e.preventDefault();
        e.stopImmediatePropagation();

      // Add visual feedback without hiding the button
      btn.classList.add("clicked");
      btn.classList.add("download-sending");
      // Remove the transient clicked class after the animation
      setTimeout(() => btn.classList.remove("clicked"), 150);

      try {
        // Determine download URL. Prefer currentSrc, then src; avoid blob URLs by falling back to page URL
        let rawUrl = window.location.href;
        if (videoElement && videoElement.tagName === "VIDEO") {
          const ve = videoElement as HTMLVideoElement;
          rawUrl = ve.currentSrc || ve.src || rawUrl;
        }
        const url = rawUrl.startsWith("blob:") ? window.location.href : rawUrl;

        // Send message to background script; include a client-side dedupe token to avoid rapid duplicates
        const dedupeToken = `${url}::${Date.now()}`;
        chrome.runtime.sendMessage(
          { type: "downloadVideo", url: url, downloadId: dedupeToken, pageTitle: document.title },
          response => {
            if (chrome.runtime.lastError) {
              error("Error sending download request:", chrome.runtime.lastError.message);
              btn.classList.remove("download-sending");
              btn.classList.add("download-error");
              setTimeout(() => {
                btn.classList.remove("download-error");
              }, 2000);
              return;
            }

            if (response && (response.status === "success" || response.status === "queued")) {
              // Success feedback
              btn.classList.remove("download-sending");
              btn.classList.add("download-success");
              setTimeout(() => {
                btn.classList.remove("download-success");
              }, 1200);
            } else {
              // Error feedback
              btn.classList.remove("download-sending");
              btn.classList.add("download-error");
              setTimeout(() => {
                btn.classList.remove("download-error");
              }, 1200);
            }
          }
        );
      } catch (err) {
        error("Error initiating download:", err);
        try {
          btn.classList.remove("download-sending");
          btn.classList.add("download-error");
          setTimeout(() => {
            btn.classList.remove("download-error");
          }, 1200);
        } catch {
          // no-op: visual feedback cleanup best-effort
        }
      }
    }
    },
    { capture: true }
  );

  // If this is for a specific video, store in our map
  if (videoElement) {
    injectedButtons.set(videoElement, btn);
  } else {
    // Store in centralized state and assign to global button
    stateManager.updateUIState({ buttonPosition: { x: 10, y: 10 } });
    downloadButton = btn;
  }

  // Apply hidden state if needed
  if (state.hidden) {
    btn.classList.add("hidden");
    btn.classList.remove("evd-visible");
  }

  // Set up observer to detect button removal
  if (!buttonObserver && !isJest) {
    // Only observe DOM mutations outside of Jest tests to avoid async logs
    buttonObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.removedNodes)) {
          if (node instanceof HTMLElement && node.id && node.id.startsWith(BUTTON_ID_PREFIX)) {
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
  const uiState = stateManager.getUIState();
  const target = activeDragButton || downloadButton;
  if (!uiState.isDragging || !target) {
    // Ensure no stale drag visual
    try {
      (activeDragButton || downloadButton)?.classList.remove("dragging");
    } catch {
      /* no-op */
    }
    return;
  }

  event.preventDefault();

  // Calculate new position using centralized state
  const x = event.clientX - uiState.buttonPosition.x;
  const y = event.clientY - uiState.buttonPosition.y;

  // Update button position
  target.style.left = String(x) + "px";
  target.style.top = String(y) + "px";

  // Mark a movement threshold to suppress click after drag
  const dx = Math.abs(event.movementX || 0);
  const dy = Math.abs(event.movementY || 0);
  if (dx + dy > 0) {
    try {
      stateManager.updateUIState({ lastClickTime: Date.now() });
    } catch {
      /* no-op */
    }
  }
}

// Bridge PointerEvent -> existing drag logic
function onPointerMove(event: PointerEvent): void {
  onDrag(event as unknown as MouseEvent);
}

async function onPointerEnd(): Promise<void> {
  await onDragEnd();
}

/**
 * Handle end of dragging and save the new position
 */
async function onDragEnd(): Promise<void> {
  const uiState = stateManager.getUIState();
  const target = activeDragButton || downloadButton;
  if (!uiState.isDragging || !target) return;

  // Update centralized state
  stateManager.updateUIState({ isDragging: false });

  // Remove document-level listeners
  document.removeEventListener("mousemove", onDrag);
  document.removeEventListener("mouseup", onDragEnd);

  // Remove drag visual
  try {
    target.classList.remove("dragging");
  } catch {
    /* no-op */
  }

  // Get current position
  const rect = target.getBoundingClientRect();
  const x = rect.left;
  const y = rect.top;

  // Update centralized state with new position
  stateManager.updateUIState({
    buttonPosition: { x, y },
    isDragging: false,
  });

  // Get current hidden state (shouldn't change during drag)
  const state = await getButtonState();

  // Save new position
  await saveButtonState({
    x,
    y,
    hidden: state.hidden,
  });

  // Also persist under a stable per-host key to survive SPA navigations
  try {
    const host = getHostname();
    await new Promise<void>(resolve => {
      chrome.storage.local.set({ [host]: { x, y, hidden: state.hidden } }, () => resolve());
    });
  } catch {
    // ignore
  }

  // Clear active drag reference
  activeDragButton = null;
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

  // Toggle visibility classes instead of inline styles
  if (hidden) {
    downloadButton.classList.add("hidden");
    downloadButton.classList.remove("evd-visible");
  } else {
    downloadButton.classList.remove("hidden");
    downloadButton.classList.add("evd-visible");
  }

  if (!hidden) {
    // When showing the button, ensure safe position if offscreen
    try {
      const rect = downloadButton.getBoundingClientRect();
      const offscreen =
        rect.width === 0 ||
        rect.height === 0 ||
        rect.left < 0 ||
        rect.top < 0 ||
        rect.left > window.innerWidth - Math.max(rect.width, 100) ||
        rect.top > window.innerHeight - Math.max(rect.height, 40);
      if (offscreen || !downloadButton.style.left || !downloadButton.style.top) {
        downloadButton.style.left = "10px";
        downloadButton.style.top = "70px";
      }
      // Re-apply style guidelines via classes
      ensureDownloadButtonStyle(downloadButton);
    } catch {
      // ignore
    }
  }

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
    const isSignificantSize = rect.width >= MIN_VIDEO_WIDTH && rect.height >= MIN_VIDEO_HEIGHT;
    const ve = video as HTMLVideoElement;
    const hasSrc = Boolean(ve.currentSrc || ve.src || video.querySelector("source[src]"));
    const hasLoadedMetadata = Number.isFinite(ve.readyState) && ve.readyState >= 1; // HAVE_METADATA
    return isVisible && isSignificantSize && (hasSrc || hasLoadedMetadata);
  } else if (video instanceof HTMLIFrameElement) {
    // Keep permissive behavior: iframes that match selectors are treated as significant.
    // Robustness is primarily handled by DOM_SELECTORS.VIDEO_SELECTORS scoping.
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

  // Count each scan attempt to allow interval shutdown when nothing is found
  {
    const currentState = stateManager.getUIState();
    stateManager.updateUIState({ checksDone: currentState.checksDone + 1 });
  }

  // Create global button if not already present
  if (!downloadButton) {
    downloadButton = await createOrUpdateButton();
  }

  // Find all video elements and significant iframes, including within open shadow roots
  const collectCandidates = (root: Document | ShadowRoot): HTMLElement[] => {
    const list = Array.from(root.querySelectorAll<HTMLElement>(VIDEO_SELECTOR)).filter(
      isSignificantVideo
    );
    // Traverse shallow, open shadow roots
    const hosts = Array.from(root.querySelectorAll<HTMLElement>("*")).filter(
      el => (el as any).shadowRoot && (el as any).shadowRoot.mode === "open"
    );
    for (const host of hosts) {
      try {
        const sr = (host as any).shadowRoot as ShadowRoot;
        list.push(...collectCandidates(sr));
      } catch {
        // ignore shadow traversal errors
      }
    }
    return list;
  };
  const allCandidates = collectCandidates(document);

  let foundSignificantVideo = allCandidates.length > 0;
  if (foundSignificantVideo) {
    const primary = selectPrimaryMediaCandidate(allCandidates);
    if (primary && !injectedButtons.has(primary)) {
      await createOrUpdateButton(primary);
    }

    // If a global button exists, remove it to avoid duplicates when a primary media is present
    if (downloadButton && document.body.contains(downloadButton)) {
      try {
        downloadButton.remove();
      } catch {
        // ignore
      }
      downloadButton = null;
    }

    // Ensure only one injected button tied to media exists; remove others
    for (const [el, btn] of Array.from(injectedButtons.entries())) {
      if (el !== primary) {
        if (btn && document.body.contains(btn)) {
          btn.remove();
        }
        injectedButtons.delete(el);
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
  const currentState = stateManager.getUIState();
  if (!foundSignificantVideo && currentState.checksDone >= MAX_CHECKS && checkIntervalId) {
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
      // Ensure a global button exists even if no <video> is detected
      if (!downloadButton) {
        createOrUpdateButton().catch(() => {});
      } else {
        // If the global button was removed externally, recreate it
        if (!document.body.contains(downloadButton)) {
          createOrUpdateButton().catch(() => {});
        }
      }
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
  stateManager.reset();
  downloadButton = null;
  injectedButtons.clear();
  if (buttonObserver) {
    buttonObserver.disconnect();
    buttonObserver = null;
  }
}

// Global listeners - initialize once
if (typeof window !== "undefined") {
  document.addEventListener("dragover", event => {
    const uiState = stateManager.getUIState();
    if (uiState.isDragging) {
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
  selectPrimaryMediaCandidate,
  debounce,
  getButtonState,
  saveButtonState,
  ensureDownloadButtonStyle,
  _resetStateForTesting,
};

// Initialize content script (robust Jest detection to avoid runtime errors in browser)
try {
  const isJestEnv =
    typeof process !== "undefined" &&
    typeof (process as any).env !== "undefined" &&
    typeof (process as any).env.JEST_WORKER_ID !== "undefined";
  if (!isJestEnv) {
    init();
  }
} catch {
  // If any detection fails, default to initializing in browser
  init();
}
