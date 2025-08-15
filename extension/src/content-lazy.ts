/**
 * Lazy Loading Content Script Wrapper
 * Reduces initial bundle size by loading content script features on demand
 */

import { logger } from "./core/logger";

// Lazy loading state
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Lazy load the main content script functionality
 */
export const lazyLoadContent = async (priority: 'high' | 'medium' | 'low' = 'medium') => {
  const loadHighPriority = async () => {
    // Load essential functionality immediately
    const { createOrUpdateButton, ensureDownloadButtonStyle } = await import('./content');
    return { createOrUpdateButton, ensureDownloadButtonStyle };
  };

  const loadMediumPriority = async () => {
    // Load secondary functionality after a delay
    await new Promise(resolve => setTimeout(resolve, 100));
    const { getButtonState, saveButtonState } = await import('./content');
    return { getButtonState, saveButtonState };
  };

  const loadLowPriority = async () => {
    // Load non-critical functionality after user interaction
    await new Promise(resolve => setTimeout(resolve, 500));
    const { resetButtonPosition, setButtonHiddenState } = await import('./content');
    return { resetButtonPosition, setButtonHiddenState };
  };

  switch (priority) {
    case 'high':
      return await loadHighPriority();
    case 'medium':
      return await loadMediumPriority();
    case 'low':
      return await loadLowPriority();
    default:
      return await loadMediumPriority();
  }
};

/**
 * Check if content script is loaded
 */
export const isContentLoaded = (): boolean => isLoaded;

/**
 * Initialize lazy loading when DOM is ready
 */
export const initLazyLoading = (): void => {
  // Load content script when user interacts with the page
  const loadOnInteraction = () => {
    lazyLoadContent().catch(() => {
      // Ignore errors, will retry on next interaction
    });
  };

  // Load on user interaction events
  const events = ["click", "scroll", "mousemove", "keydown"];
  events.forEach(event => {
    document.addEventListener(event, loadOnInteraction, { once: true, passive: true });
  });

  // Load after a delay if no interaction
  setTimeout(() => {
    if (!isLoaded) {
      lazyLoadContent().catch(() => {
        // Ignore errors
      });
    }
  }, 5000); // 5 second delay

  logger.debug("Lazy loading initialized", {
    component: "content-lazy",
    operation: "initLazyLoading"
  });
};

// Auto-initialize when script loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLazyLoading);
} else {
  initLazyLoading();
}
