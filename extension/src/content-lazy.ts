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
export const lazyLoadContent = async (): Promise<void> => {
  if (isLoaded) {
    return;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      logger.debug("Lazy loading content script functionality", {
        component: "content-lazy",
        operation: "lazyLoadContent"
      });

      // Dynamic import of the main content script
      const contentModule = await import("./content");

      // The content module initializes automatically, so we just need to ensure it's loaded
      // No need to call initContent since it doesn't exist
      logger.debug("Content module loaded successfully", {
        component: "content-lazy",
        operation: "lazyLoadContent"
      });

      isLoaded = true;
      logger.info("Content script functionality loaded successfully", {
        component: "content-lazy",
        operation: "lazyLoadContent"
      });
    } catch (error) {
      logger.error("Failed to lazy load content script", {
        component: "content-lazy",
        operation: "lazyLoadContent",
        data: error
      });
      throw error;
    }
  })();

  return loadPromise;
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
