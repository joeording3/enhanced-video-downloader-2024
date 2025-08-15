/**
 * Dynamic Loading Options Page Wrapper
 * Reduces initial bundle size by loading options page features on demand
 */

import { logger } from "./core/logger";

// Dynamic loading state
let isLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Dynamically load the main options page functionality
 */
export const dynamicLoadOptions = async (): Promise<void> => {
  if (isLoaded) {
    return;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    try {
      logger.debug("Dynamically loading options page functionality", {
        component: "options-dynamic",
        operation: "dynamicLoadOptions"
      });

      // Dynamic import of the main options module
      const optionsModule = await import("./options");

      // Initialize the options page
      if (typeof optionsModule.initOptionsPage === "function") {
        await optionsModule.initOptionsPage();
      }

      isLoaded = true;
      logger.info("Options page functionality loaded successfully", {
        component: "options-dynamic",
        operation: "dynamicLoadOptions"
      });
    } catch (error) {
      logger.error("Failed to dynamically load options page", {
        component: "options-dynamic",
        operation: "dynamicLoadOptions",
        data: error
      });
      throw error;
    }
  })();

  return loadPromise;
};

/**
 * Check if options page is loaded
 */
export const isOptionsLoaded = (): boolean => isLoaded;

/**
 * Initialize dynamic loading when options page loads
 */
export const initDynamicLoading = (): void => {
  // Load options functionality when user interacts with the page
  const loadOnInteraction = () => {
    dynamicLoadOptions().catch(() => {
      // Ignore errors, will retry on next interaction
    });
  };

  // Load on user interaction events
  const events = ["click", "input", "change", "focus"];
  events.forEach(event => {
    document.addEventListener(event, loadOnInteraction, { once: true, passive: true });
  });

  // Load after a short delay if no interaction
  setTimeout(() => {
    if (!isLoaded) {
      dynamicLoadOptions().catch(() => {
        // Ignore errors
      });
    }
  }, 1000); // 1 second delay for options page

  logger.debug("Dynamic loading initialized for options page", {
    component: "options-dynamic",
    operation: "initDynamicLoading"
  });
};

// Auto-initialize when script loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDynamicLoading);
} else {
  initDynamicLoading();
}

// Export a simple initialization function for immediate use
export const initOptions = (): void => {
  // Show loading state
  const loadingElement = document.getElementById("options-loading");
  if (loadingElement) {
    loadingElement.textContent = "Loading options...";
  }

  // Load options functionality
  dynamicLoadOptions().then(() => {
    if (loadingElement) {
      loadingElement.style.display = "none";
    }
  }).catch(() => {
    if (loadingElement) {
      loadingElement.textContent = "Failed to load options. Please refresh the page.";
    }
  });
};
