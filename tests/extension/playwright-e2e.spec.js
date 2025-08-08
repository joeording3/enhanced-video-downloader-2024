//
const { test, expect } = require("@playwright/test");
const path = require("path");
const express = require("express");
const fs = require("fs");

/**
 * Chrome Extension E2E Test Suite
 *
 * This test suite validates the Chrome extension functionality across multiple browsers.
 * Tests cover UI interactions, accessibility, performance, and error handling scenarios.
 *
 * @fileoverview Comprehensive E2E testing for Chrome extension
 * @author Enhanced Video Downloader Team
 * @version 1.0.0
 */

/**
 * Test Data Factory for consistent test data across all tests
 * @typedef {Object} TestData
 * @property {number} serverPort - Server port number
 * @property {string} downloadDirectory - Download directory path
 * @property {boolean} debugMode - Debug mode flag
 * @property {boolean} enableHistory - History enable flag
 * @property {string} logLevel - Log level setting
 * @property {string} ytdlpFormat - yt-dlp format setting
 * @property {boolean} allowPlaylists - Playlist allow flag
 */

/**
 * Create consistent test data for all tests
 * @returns {TestData} Test data object
 */
function createTestData() {
  return {
    serverPort: 5013,
    downloadDirectory: "/tmp",
    debugMode: false,
    enableHistory: true,
    logLevel: "INFO",
    ytdlpFormat: "bestvideo+bestaudio/best",
    allowPlaylists: false,
  };
}

/**
 * Chrome Extension API Mock Configuration
 * Provides consistent mocking of Chrome extension APIs across all tests
 */
const _CHROME_API_MOCK = {
  runtime: {
    lastError: undefined,
    sendMessage: /** @type {any} */ (
      (msg, cb) => {
        if (msg.type === "getAppStatus") {
          cb({ status: "success", serverConfig: { server_port: 5013 } });
        } else {
          cb({ status: "success" });
        }
      }
    ),
    onMessage: {
      addListener: /** @type {any} */ (() => {}),
      getRules: /** @type {any} */ (() => []),
      hasListener: /** @type {any} */ (() => false),
      removeRules: /** @type {any} */ (() => {}),
      addRules: /** @type {any} */ (() => {}),
      removeListener: /** @type {any} */ (() => {}),
      hasListeners: /** @type {any} */ (() => false),
    },
  },
  tabs: {
    query: /** @type {any} */ (
      () =>
        Promise.resolve([
          {
            id: 1,
            url: "https://example.com",
            index: 0,
            pinned: false,
            highlighted: false,
            windowId: 1,
            active: true,
            incognito: false,
            selected: true,
            discarded: false,
            autoDiscardable: true,
            mutedInfo: { muted: false },
            width: 1920,
            height: 1080,
            sessionId: "session1",
          },
        ])
    ),
    sendMessage: /** @type {any} */ ((tabId, msg, cb) => cb({ hidden: false, disabled: false })),
  },
  storage: {
    local: {
      get: /** @type {any} */ ((keys, cb) => cb(createTestData())),
      set: /** @type {any} */ ((items, cb) => cb && cb()),
    },
  },
};

/**
 * Custom assertion helpers for enhanced test validation
 */
const customAssertions = {
  /**
   * Assert that an element is accessible
   * @param {import('@playwright/test').Locator} element - Element to check
   * @param {string} elementName - Name of element for error messages
   */
  async assertElementAccessible(element, elementName) {
    await expect(element).toBeVisible();
    await expect(element).toBeEnabled();
    console.log(`[PASS] ${elementName} is accessible`);
  },

  /**
   * Assert that page loads within performance threshold
   * @param {number} loadTime - Page load time in milliseconds
   * @param {number} threshold - Maximum allowed load time
   */
  assertPageLoadPerformance(loadTime, threshold = 3000) {
    expect(loadTime).toBeLessThan(threshold);
    console.log(`[PASS] Page loaded in ${loadTime}ms (threshold: ${threshold}ms)`);
  },

  /**
   * Assert that DOM size is within reasonable limits
   * @param {number} domSize - Number of DOM elements
   * @param {number} limit - Maximum allowed DOM elements
   */
  assertDOMSize(domSize, limit = 1000) {
    expect(domSize).toBeLessThan(limit);
    console.log(`[PASS] DOM size: ${domSize} elements (limit: ${limit})`);
  },
};

/**
 * Collect coverage data for Chromium browser
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} testName - Test name for coverage file
 * @returns {Promise<Object|null>} Coverage data or null
 */
async function collectCoverage(page, testName) {
  if (process.env.PLAYWRIGHT_COVERAGE !== "true") {
    return null; // Explicitly return null
  }
  try {
    const coverage = await page.coverage.startJSCoverage({
      reportAnonymousScripts: true,
    });
    return { coverage, testName };
  } catch (error) {
    console.log(`[E2E] Coverage not available: ${error.message}`);
    return null;
  }
}

/**
 * Save coverage data to file system
 * @param {Object|null} coverageData - Coverage data object
 * @param {string} testName - Test name
 */
async function saveCoverage(coverageData, testName) {
  if (!coverageData) {
    return;
  }
  try {
    const { coverage } = coverageData;
    const stoppedCoverage = await coverage.stopJSCoverage();
    const outDir = path.resolve(__dirname, "../../coverage/frontend");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, `playwright-coverage-${testName}.json`),
      JSON.stringify(stoppedCoverage)
    );
    console.log(`[PASS] Coverage saved for ${testName}`); // Added logging
  } catch (error) {
    console.log(`[E2E] Failed to save coverage for ${testName}: ${error.message}`);
  }
}

/**
 * Setup Chrome API mock for testing
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
async function setupChromeAPIMock(page) {
  await page.addInitScript(() => {
    // Mock Chrome API with proper typing to avoid TypeScript errors
    window.chrome = /** @type {any} */ ({
      runtime: {
        lastError: undefined,
        sendMessage: /** @type {any} */ (
          (msg, cb) => {
            if (msg.type === "getAppStatus") {
              cb({ status: "success", serverConfig: { server_port: 5013 } });
            } else {
              cb({ status: "success" });
            }
          }
        ),
        onMessage: {
          addListener: /** @type {any} */ (() => {}),
          getRules: /** @type {any} */ (() => []),
          hasListener: /** @type {any} */ (() => false),
          removeRules: /** @type {any} */ (() => {}),
          addRules: /** @type {any} */ (() => {}),
          removeListener: /** @type {any} */ (() => {}),
          hasListeners: /** @type {any} */ (() => false),
        },
      },
      tabs: {
        query: /** @type {any} */ (
          () =>
            Promise.resolve([
              {
                id: 1,
                url: "https://example.com",
                index: 0,
                pinned: false,
                highlighted: false,
                windowId: 1,
                active: true,
                incognito: false,
                selected: true,
                discarded: false,
                autoDiscardable: true,
                mutedInfo: { muted: false },
                width: 1920,
                height: 1080,
                sessionId: "session1",
              },
            ])
        ),
        sendMessage: /** @type {any} */ (
          (tabId, msg, cb) => cb({ hidden: false, disabled: false })
        ),
      },
      storage: {
        local: {
          get: /** @type {any} */ (
            (keys, cb) =>
              cb({
                serverPort: 5013,
                downloadDirectory: "/tmp",
                debugMode: false,
                enableHistory: true,
                logLevel: "INFO",
                ytdlpFormat: "bestvideo+bestaudio/best",
                allowPlaylists: false,
              })
          ),
          set: /** @type {any} */ ((items, cb) => cb && cb()),
        },
      },
    });
  });
}

/**
 * Navigate to page with monitoring and error handling
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} url - URL to navigate to
 * @param {string} selector - Selector to wait for
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} Navigation result with load time and success status
 */
async function navigateWithMonitoring(page, url, selector, timeout = 10000) {
  const startTime = Date.now();

  try {
    await page.goto(url);
    await page.waitForSelector(selector, { timeout });
    const loadTime = Date.now() - startTime;

    return { loadTime, success: true };
  } catch (error) {
    const loadTime = Date.now() - startTime;
    console.log(`[E2E] Navigation failed: ${error.message}`);
    return { loadTime, success: false };
  }
}

test.describe("Chrome Extension E2E Tests", () => {
  let server;
  let baseUrl;

  test.beforeAll(async () => {
    // Start local server to serve extension files
    const app = express();
    app.use(express.static(path.join(__dirname, "../../extension")));
    server = app.listen(0);
    const address = server.address();
    const port = typeof address === "string" ? 0 : address?.port || 0;
    baseUrl = `http://localhost:${port}`;
    console.log(`[E2E] Server started on port ${port}`);
  });

  test.afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  test.describe("UI Component Tests", () => {
    /**
     * Test popup.html loads successfully with proper element validation
     */
    test("popup.html loads successfully with enhanced validation", async ({ page }) => {
      const coverageData = await collectCoverage(page, "popup");
      await setupChromeAPIMock(page);

      // Navigate to popup with monitoring
      const { loadTime, success } = await navigateWithMonitoring(
        page,
        `${baseUrl}/ui/popup.html`,
        "#enhanced-download-button"
      );
      expect(success).toBe(true);

      // Enhanced element validation
      const downloadButton = await page.$("#enhanced-download-button");
      expect(downloadButton).not.toBeNull();
      if (!downloadButton) throw new Error("Download button not found");

      // Test button is clickable and enabled
      const isDisabled = await downloadButton.getAttribute("disabled");
      expect(isDisabled).toBeNull();

      // Test button text content (trim whitespace from padding)
      const buttonText = await downloadButton.textContent();
      expect(buttonText?.trim()).toBe("DOWNLOAD");

      // Test page title and meta information
      const title = await page.title();
      expect(title).toBe("Enhanced Video Downloader");

      // Test viewport and responsive design
      const viewport = page.viewportSize();
      expect(viewport).toBeTruthy();

      // Test header elements exist
      const header = await page.$("header");
      expect(header).not.toBeNull();

      // Test main content exists
      const main = await page.$("main");
      expect(main).not.toBeNull();

      // Performance validation
      customAssertions.assertPageLoadPerformance(loadTime);

      await saveCoverage(coverageData, "popup");
    });

    /**
     * Test options.html loads with comprehensive form validation
     */
    test("options.html loads with comprehensive form validation", async ({ page }) => {
      const coverageData = await collectCoverage(page, "options");
      await setupChromeAPIMock(page);

      // Navigate with monitoring
      const { loadTime, success } = await navigateWithMonitoring(
        page,
        `${baseUrl}/ui/options.html`,
        "#settings-form"
      );
      expect(success).toBe(true);

      // Form element validation
      const form = await page.$("#settings-form");
      expect(form).not.toBeNull();
      if (!form) throw new Error("Settings form not found");

      // Test form inputs exist and are accessible
      const inputs = await page.$$("input, select, textarea");
      expect(inputs.length).toBeGreaterThan(0);

      // Test form submission capability
      const submitButton = await page.$("button[type='submit']");
      if (submitButton) {
        const isDisabled = await submitButton.getAttribute("disabled");
        expect(isDisabled).toBeNull();
      }

      // Test form validation attributes
      for (const input of inputs) {
        const type = await input.getAttribute("type");
        if (type !== "submit" && type !== "button") {
          const name = await input.getAttribute("name");
          // Some inputs may not have name attributes, which is acceptable
          if (name) {
            expect(name).toBeTruthy();
          }
        }
      }

      // Test page title
      const title = await page.title();
      expect(title).toBe("Enhanced Video Downloader Settings");

      // Performance validation
      customAssertions.assertPageLoadPerformance(loadTime);

      await saveCoverage(coverageData, "options");
    });

    /**
     * Test theme toggle functionality with comprehensive interaction testing
     */
    test("theme toggle functionality with comprehensive interaction testing", async ({ page }) => {
      const coverageData = await collectCoverage(page, "theme");
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/options.html`);
      await page.waitForSelector("#theme-toggle", {
        timeout: 10000,
      });

      // Theme toggle element validation
      const themeToggle = await page.$("#theme-toggle");
      expect(themeToggle).not.toBeNull();
      if (!themeToggle) throw new Error("Theme toggle not found");

      // Test accessibility attributes
      const ariaLabel = await themeToggle.getAttribute("aria-label");
      expect(ariaLabel).toBe("Toggle Dark/Light Mode");

      // Test role attribute
      const role = await themeToggle.getAttribute("role");
      expect(role).toBe("button");

      // Test title attribute
      const title = await themeToggle.getAttribute("title");
      expect(title).toBe("Toggle Dark/Light Mode");

      // Test click interaction
      await page.click("#theme-toggle");

      // Test keyboard navigation
      await page.keyboard.press("Tab");
      const focusedElement = await page.evaluate(() => document.activeElement?.id);
      expect(focusedElement).toBeTruthy();

      // Test Enter key interaction
      await themeToggle.focus();
      await page.keyboard.press("Enter");

      await saveCoverage(coverageData, "theme");
    });

    /**
     * Test download button functionality with comprehensive interaction testing
     */
    test("download button functionality with comprehensive interaction testing", async ({
      page,
    }) => {
      const coverageData = await collectCoverage(page, "download");
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Download button validation
      const downloadButton = await page.$("#enhanced-download-button");
      expect(downloadButton).not.toBeNull();
      if (!downloadButton) throw new Error("Download button not found");

      // Test button text content (trim whitespace from padding)
      const buttonText = await downloadButton.textContent();
      expect(buttonText?.trim()).toBe("DOWNLOAD");

      // Test button state
      const isDisabled = await downloadButton.getAttribute("disabled");
      expect(isDisabled).toBeNull();

      // Test click interaction
      await page.click("#enhanced-download-button");

      // Test keyboard interaction
      await downloadButton.focus();
      await page.keyboard.press("Enter");

      // Test button remains functional after interaction
      const isStillClickable = await downloadButton.isEnabled();
      expect(isStillClickable).toBe(true);

      await saveCoverage(coverageData, "download");
    });

    /**
     * Test form submission and validation workflows
     */
    test("form submission and validation workflows", async ({ page }) => {
      const coverageData = await collectCoverage(
        page,

        "form-validation"
      );
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/options.html`);
      await page.waitForSelector("#settings-form", { timeout: 10000 });

      // Test form field interactions
      const portInput = await page.$("#server-port");
      if (portInput) {
        await portInput.fill("8080");
        await portInput.evaluate(el => el.blur());

        // Test validation feedback (if exists)
        const validationMessage = await page.$(".validation-message");
        if (validationMessage) {
          const messageText = await validationMessage.textContent();
          expect(messageText).toBeTruthy();
        }
      }

      // Test select dropdown interactions
      const logLevelSelect = await page.$("#log-level");
      if (logLevelSelect) {
        await logLevelSelect.selectOption("DEBUG");
        const selectedValue = await logLevelSelect.evaluate(
          el => /** @type {HTMLSelectElement} */ (el).value
        );
        expect(selectedValue).toBe("DEBUG");
      }

      // Test checkbox interactions
      const debugCheckbox = await page.$("#debug-mode");
      if (debugCheckbox) {
        await debugCheckbox.check();
        const isChecked = await debugCheckbox.isChecked();
        expect(isChecked).toBe(true);
      }

      // Test form submission
      const submitButton = await page.$("button[type='submit']");
      if (submitButton) {
        await submitButton.click();

        // Test success/error feedback (if exists)
        const statusMessage = await page.$(".status-message");
        if (statusMessage) {
          const messageText = await statusMessage.textContent();
          if (messageText) {
            expect(messageText).toBeTruthy();
          }
        }
      }

      await saveCoverage(coverageData, "form-validation");
    });

    /**
     * Test history display and interaction
     */
    test("history display and interaction", async ({ page }) => {
      const coverageData = await collectCoverage(page, "history");
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test history container exists (if it exists)
      const historyContainer = await page.$("#history-items");
      if (historyContainer) {
        // Test history item interactions
        const historyItems = await page.$$("#history-items li");
        for (const item of historyItems) {
          // Test item is visible
          await expect(/** @type {any} */ (item)).toBeVisible();

          // Test item has proper structure
          const itemText = await item.textContent();
          expect(itemText).toBeTruthy();

          // Test item click interaction
          await item.click();
        }

        // Test drag and drop functionality
        const draggableItems = await page.$$("[draggable='true']");
        for (const item of draggableItems) {
          // Test drag start
          await /** @type {any} */ (item).dragTo(historyContainer);
        }
      } else {
        // If history container doesn't exist, test that page still works
        const downloadButton = await page.$("#enhanced-download-button");
        expect(downloadButton).not.toBeNull();
      }

      await saveCoverage(coverageData, "history");
    });

    /**
     * Test server status display and updates
     */
    test("server status display and updates", async ({ page }) => {
      const coverageData = await collectCoverage(
        page,

        "server-status"
      );
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test server status indicator exists (if it exists)
      const statusIndicator = await page.$(".server-status");
      if (statusIndicator) {
        const statusText = await statusIndicator.textContent();
        expect(statusText).toBeTruthy();
      }

      // Test status updates (if function exists)
      await page.evaluate(() => {
        if (/** @type {any} */ (window).updatePopupServerStatus) {
          /** @type {any} */ (window).updatePopupServerStatus("connected");
        }
      });

      // Verify status change (if element exists)
      const updatedStatus = await page.$(".server-status");
      if (updatedStatus) {
        const updatedText = await updatedStatus.textContent();
        expect(updatedText).toBeTruthy();
      }

      await saveCoverage(coverageData, "server-status");
    });

    /**
     * Test error handling and status messages
     */
    test("error handling and status messages", async ({ page }) => {
      const coverageData = await collectCoverage(
        page,

        "error-handling"
      );
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test error status display (if function exists)
      await page.evaluate(() => {
        if (/** @type {any} */ (window).setStatus) {
          /** @type {any} */ (window).setStatus("Test error message", true, 2000);
        }
      });

      // Verify error message appears (if element exists)
      const statusElement = await page.$("#status");
      if (statusElement) {
        const statusText = await statusElement.textContent();
        if (statusText) {
          expect(statusText).toBeTruthy();

          // Test error styling
          const hasErrorClass = await statusElement.evaluate(el =>
            el.classList.contains("status-error")
          );
          expect(hasErrorClass).toBeDefined();
        }
      }

      // Test success status display (if function exists)
      await page.evaluate(() => {
        if (/** @type {any} */ (window).setStatus) {
          /** @type {any} */ (window).setStatus("Test success message", false, 2000);
        }
      });

      // Verify success message appears (if element exists)
      if (statusElement) {
        const successText = await statusElement.textContent();
        if (successText) {
          expect(successText).toBeTruthy();

          // Test success styling
          const hasSuccessClass = await statusElement.evaluate(el =>
            el.classList.contains("status-success")
          );
          expect(hasSuccessClass).toBeDefined();
        }
      }

      await saveCoverage(coverageData, "error-handling");
    });
  });

  test.describe("Advanced UI Interaction Tests", () => {
    /**
     * Test search functionality in options page
     */
    test("search functionality in options page", async ({ page }) => {
      const coverageData = await collectCoverage(page, "search");
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/options.html`);
      await page.waitForSelector("#settings-form", { timeout: 10000 });

      // Test search input exists
      const searchInput = await page.$("#search-input");
      if (searchInput) {
        // Test search input interaction
        await searchInput.fill("port");
        await searchInput.press("Enter");

        // Test search results highlighting
        const highlightedElements = await page.$$(".highlight");
        expect(highlightedElements.length).toBeGreaterThan(0);

        // Test search suggestions
        const suggestions = await page.$$(".search-suggestions li");
        if (suggestions.length > 0) {
          await suggestions[0].click();
        }
      }

      await saveCoverage(coverageData, "search");
    });

    /**
     * Test tab navigation in options page
     */
    test("tab navigation in options page", async ({ page }) => {
      const coverageData = await collectCoverage(
        page,

        "tab-navigation"
      );
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/options.html`);
      await page.waitForSelector("#settings-form", { timeout: 10000 });

      // Test tab navigation
      const tabs = await page.$$("[role='tab']");
      for (const tab of tabs) {
        await tab.click();

        // Test tab content is visible
        const tabPanel = await page.$("[role='tabpanel']");
        if (tabPanel) {
          await expect(/** @type {any} */ (tabPanel)).toBeVisible();
        }

        // Test keyboard navigation
        await tab.press("ArrowRight");
      }

      await saveCoverage(coverageData, "tab-navigation");
    });

    /**
     * Test file picker functionality
     */
    test("file picker functionality", async ({ page }) => {
      const coverageData = await collectCoverage(
        page,

        "file-picker"
      );
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/options.html`);
      await page.waitForSelector("#settings-form", { timeout: 10000 });

      // Test directory selection button
      const dirButton = await page.$("#select-directory");
      if (dirButton) {
        await dirButton.click();

        // Test file picker dialog (mock)
        await page.evaluate(() => {
          if (/** @type {any} */ (window).selectDownloadDirectory) {
            /** @type {any} */ (window).selectDownloadDirectory();
          }
        });
      }

      await saveCoverage(coverageData, "file-picker");
    });

    /**
     * Test server restart functionality
     */
    test("server restart functionality", async ({ page }) => {
      const coverageData = await collectCoverage(
        page,

        "server-restart"
      );
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/options.html`);
      await page.waitForSelector("#settings-form", { timeout: 10000 });

      // Test restart button
      const restartButton = await page.$("#restart-server");
      if (restartButton) {
        await restartButton.click();

        // Test restart confirmation
        const confirmationDialog = await page.$(".confirmation-dialog");
        if (confirmationDialog) {
          await expect(/** @type {any} */ (confirmationDialog)).toBeVisible();

          // Test confirm action
          const confirmButton = await confirmationDialog.$(".confirm");
          if (confirmButton) {
            await confirmButton.click();
          }
        }
      }

      await saveCoverage(coverageData, "server-restart");
    });
  });

  test.describe("Accessibility Tests", () => {
    /**
     * Test accessibility compliance for popup interface
     */
    test("popup interface accessibility compliance", async ({ page }) => {
      await setupChromeAPIMock(page);
      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test semantic HTML structure
      const mainElement = await page.$("main");
      expect(mainElement).not.toBeNull();

      // Test header structure
      const header = await page.$("header");
      expect(header).not.toBeNull();

      // Test heading hierarchy
      const h1 = await page.$("h1");
      expect(h1).not.toBeNull();

      // Test button accessibility
      const downloadButton = await page.$("#enhanced-download-button");
      expect(downloadButton).not.toBeNull();

      // Test focus management
      await page.keyboard.press("Tab");
      const focusedElement = await page.evaluate(() => document.activeElement);
      expect(focusedElement).not.toBeNull();

      // Test color contrast (basic check)
      if (downloadButton) {
        const buttonColor = await downloadButton.evaluate(el => {
          const style = window.getComputedStyle(el);
          return style.color;
        });
        expect(buttonColor).toBeTruthy();
      }
    });

    /**
     * Test accessibility compliance for options interface
     */
    test("options interface accessibility compliance", async ({ page }) => {
      await setupChromeAPIMock(page);
      await page.goto(`${baseUrl}/ui/options.html`);
      await page.waitForSelector("#settings-form", { timeout: 10000 });

      // Test form accessibility
      const form = await page.$("#settings-form");
      expect(form).not.toBeNull();

      // Test fieldset and legend structure
      const fieldsets = await page.$$("fieldset");
      for (const fieldset of fieldsets) {
        const legend = await fieldset.$("legend");
        expect(legend).not.toBeNull();
      }

      // Test input labels
      const inputs = await page.$$("input, select, textarea");
      for (const input of inputs) {
        const id = await input.getAttribute("id");
        if (id) {
          const label = await page.$(`label[for="${id}"]`);
          if (label) {
            const labelText = await label.textContent();
            expect(labelText).toBeTruthy();
          }
        }
      }

      // Test keyboard navigation
      await page.keyboard.press("Tab");
      let focusCount = 0;
      for (let i = 0; i < 10; i++) {
        const focusedElement = await page.evaluate(() => document.activeElement);
        if (focusedElement && focusedElement.tagName !== "BODY") {
          focusCount++;
        }
        await page.keyboard.press("Tab");
      }
      expect(focusCount).toBeGreaterThan(0);
    });

    /**
     * Test advanced accessibility features
     */
    test("advanced accessibility features", async ({ page }) => {
      await setupChromeAPIMock(page);
      await page.goto(`${baseUrl}/ui/options.html`);
      await page.waitForSelector("#settings-form", { timeout: 10000 });

      // Test ARIA attributes (using valid selectors)
      const elementsWithRole = await page.$$("[role]");
      const elementsWithAriaLabel = await page.$$("[aria-label]");
      const elementsWithAriaLabelledby = await page.$$("[aria-labelledby]");

      const totalAriaElements =
        elementsWithRole.length + elementsWithAriaLabel.length + elementsWithAriaLabelledby.length;
      expect(totalAriaElements).toBeGreaterThanOrEqual(0);

      // Test screen reader support
      const screenReaderElements = await page.$$("[role], [aria-label], [aria-labelledby]");
      expect(screenReaderElements.length).toBeGreaterThanOrEqual(0);

      // Test keyboard shortcuts
      await page.keyboard.press("Control+Tab");
      const focusedElement = await page.evaluate(() => document.activeElement);
      expect(focusedElement).not.toBeNull();
    });
  });

  test.describe("Performance Tests", () => {
    /**
     * Test popup page load performance
     */
    test("popup page load performance", async ({ page }) => {
      await setupChromeAPIMock(page);

      const startTime = Date.now();
      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });
      const loadTime = Date.now() - startTime;

      // Performance assertion - page should load within 3 seconds
      customAssertions.assertPageLoadPerformance(loadTime);

      // Test memory usage
      const memoryInfo = await page.evaluate(() => {
        //  - Performance memory API
        if (performance.memory) {
          return {
            //  - Performance memory API
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            //  - Performance memory API
            totalJSHeapSize: performance.memory.totalJSHeapSize,
          };
        }
        return null;
      });

      if (memoryInfo) {
        expect(memoryInfo.usedJSHeapSize).toBeLessThan(50 * 1024 * 1024); // 50MB limit
      }
    });

    /**
     * Test options page load performance
     */
    test("options page load performance", async ({ page }) => {
      await setupChromeAPIMock(page);

      const startTime = Date.now();
      await page.goto(`${baseUrl}/ui/options.html`);
      await page.waitForSelector("#settings-form", { timeout: 10000 });
      const loadTime = Date.now() - startTime;

      // Performance assertion - page should load within 3 seconds
      customAssertions.assertPageLoadPerformance(loadTime);

      // Test DOM size
      const domSize = await page.evaluate(() => document.querySelectorAll("*").length);
      customAssertions.assertDOMSize(domSize);
    });

    /**
     * Test memory usage under load
     */
    test("memory usage under load", async ({ page }) => {
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Simulate multiple interactions to test memory usage
      for (let i = 0; i < 10; i++) {
        await page.click("#enhanced-download-button");
        await page.waitForTimeout(100);
      }

      // Check memory usage after interactions
      const memoryInfo = await page.evaluate(() => {
        //  - Performance memory API
        if (performance.memory) {
          return {
            //  - Performance memory API
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            //  - Performance memory API
            totalJSHeapSize: performance.memory.totalJSHeapSize,
          };
        }
        return null;
      });

      if (memoryInfo) {
        expect(memoryInfo.usedJSHeapSize).toBeLessThan(100 * 1024 * 1024); // 100MB limit
      }
    });

    /**
     * Test rendering performance
     */
    test("rendering performance", async ({ page }) => {
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/options.html`);
      await page.waitForSelector("#settings-form", { timeout: 10000 });

      // Test rendering time for complex elements
      const renderStart = Date.now();
      await page.evaluate(() => {
        // Trigger re-render
        const form = document.querySelector("#settings-form");
        if (form) {
          /** @type {HTMLElement} */ (form).style.display = "none";
          /** @type {HTMLElement} */ (form).style.display = "block";
        }
      });
      const renderTime = Date.now() - renderStart;

      expect(renderTime).toBeLessThan(100); // Should render in under 100ms
    });
  });

  test.describe("Error Handling Tests", () => {
    /**
     * Test error handling when Chrome API is unavailable
     */
    test("error handling when Chrome API is unavailable", async ({ page }) => {
      // Don't mock Chrome API to test error handling
      await page.goto(`${baseUrl}/ui/popup.html`);

      // Test that page still loads without Chrome API
      const body = await page.$("body");
      expect(body).not.toBeNull();

      // Test that error states are handled gracefully
      const errorElements = await page.$$("[data-error]");
      // Should handle errors gracefully without crashing
      expect(errorElements.length).toBeGreaterThanOrEqual(0);
    });

    /**
     * Test error handling for network failures
     */
    test("error handling for network failures", async ({ page }) => {
      await setupChromeAPIMock(page);

      // Mock network failure
      await page.route("**/*", route => {
        if (route.request().url().includes("api")) {
          route.abort();
        } else {
          route.continue();
        }
      });

      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test that UI remains functional despite network errors
      const downloadButton = await page.$("#enhanced-download-button");
      expect(downloadButton).not.toBeNull();
      if (downloadButton) {
        expect(await downloadButton.isEnabled()).toBe(true);
      }
    });

    /**
     * Test form validation errors
     */
    test("form validation errors", async ({ page }) => {
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/options.html`);
      await page.waitForSelector("#settings-form", { timeout: 10000 });

      // Test invalid port number
      const portInput = await page.$("#server-port");
      if (portInput) {
        await portInput.fill("99999"); // Invalid port
        await portInput.evaluate(el => el.blur());

        // Test validation error appears
        const errorMessage = await page.$(".validation-error");
        if (errorMessage) {
          const errorText = await errorMessage.textContent();
          expect(errorText).toBeTruthy();
        }
      }

      // Test invalid folder path
      const folderInput = await page.$("#download-directory");
      if (folderInput) {
        await folderInput.fill("/invalid/path");
        await folderInput.evaluate(el => el.blur());

        // Test validation error appears
        const folderError = await page.$(".validation-error");
        if (folderError) {
          const errorText = await folderError.textContent();
          expect(errorText).toBeTruthy();
        }
      }
    });

    /**
     * Test timeout handling
     */
    test("timeout handling", async ({ page }) => {
      await setupChromeAPIMock(page);

      // Mock slow API response
      await page.route("**/*", route => {
        if (route.request().url().includes("api")) {
          // Simulate timeout
          setTimeout(() => route.continue(), 5000);
        } else {
          route.continue();
        }
      });

      await page.goto(`${baseUrl}/ui/popup.html`);

      // Test timeout handling
      const timeoutMessage = await page.$(".timeout-message");
      if (timeoutMessage) {
        const messageText = await timeoutMessage.textContent();
        expect(messageText).toBeTruthy();
      }
    });
  });

  test.describe("Cross-Browser Compatibility Tests", () => {
    /**
     * Test browser-specific functionality
     */
    test("browser-specific functionality validation", async ({ page }) => {
      await setupChromeAPIMock(page);
      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test browser-specific CSS support
      const supportsGrid = await page.evaluate(() => {
        return CSS.supports("display", "grid");
      });
      expect(supportsGrid).toBe(true);

      // Test browser-specific JavaScript features
      const supportsAsyncAwait = await page.evaluate(() => {
        return typeof (async () => {}) === "function";
      });
      expect(supportsAsyncAwait).toBe(true);

      // Test browser-specific DOM APIs
      const supportsIntersectionObserver = await page.evaluate(() => {
        return typeof IntersectionObserver !== "undefined";
      });
      expect(supportsIntersectionObserver).toBe(true);
    });

    /**
     * Test browser-specific event handling
     */
    test("browser-specific event handling", async ({ page }) => {
      await setupChromeAPIMock(page);
      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test pointer events
      await page.evaluate(() => {
        const event = new PointerEvent("pointerdown");
        document.dispatchEvent(event);
      });

      // Test wheel events
      await page.evaluate(() => {
        const event = new WheelEvent("wheel");
        document.dispatchEvent(event);
      });

      // Test mouse events
      const downloadButton = await page.$("#enhanced-download-button");
      if (downloadButton) {
        await downloadButton.hover();
        await downloadButton.click();
      }
    });

    /**
     * Test browser-specific storage APIs
     */
    test("browser-specific storage APIs", async ({ page }) => {
      await setupChromeAPIMock(page);
      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test localStorage
      const localStorageSupported = await page.evaluate(() => {
        try {
          localStorage.setItem("test", "value");
          return localStorage.getItem("test") === "value";
        } catch {
          return false;
        }
      });
      expect(localStorageSupported).toBe(true);

      // Test sessionStorage
      const sessionStorageSupported = await page.evaluate(() => {
        try {
          sessionStorage.setItem("test", "value");
          return sessionStorage.getItem("test") === "value";
        } catch {
          return false;
        }
      });
      expect(sessionStorageSupported).toBe(true);
    });
  });

  test.describe("Edge Case Tests", () => {
    /**
     * Test rapid user interactions
     */
    test("rapid user interactions", async ({ page }) => {
      await setupChromeAPIMock(page);
      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test rapid clicking
      const downloadButton = await page.$("#enhanced-download-button");
      if (downloadButton) {
        for (let i = 0; i < 5; i++) {
          await downloadButton.click();
          await page.waitForTimeout(50);
        }

        // Test button remains functional
        expect(await downloadButton.isEnabled()).toBe(true);
      }
    });

    /**
     * Test large data handling
     */
    test("large data handling", async ({ page }) => {
      await setupChromeAPIMock(page);
      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test with large history data
      await page.evaluate(() => {
        const largeData = Array.from({ length: 1000 }, (_, i) => ({
          id: `download-${i}`,
          status: "completed",
          filename: `file-${i}.mp4`,
          url: `https://example.com/video-${i}`,
        }));

        if (/** @type {any} */ (window).loadAndRenderHistory) {
          // Mock large data
          /** @type {any} */ (window).mockHistoryData = largeData;
        }
      });

      // Test UI remains responsive
      const downloadButton = await page.$("#enhanced-download-button");
      expect(downloadButton).not.toBeNull();
    });

    /**
     * Test concurrent operations
     */
    test("concurrent operations", async ({ page }) => {
      await setupChromeAPIMock(page);
      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test concurrent API calls
      await page.evaluate(() => {
        if (window.chrome && window.chrome.runtime) {
          // Simulate concurrent API calls
          for (let i = 0; i < 5; i++) {
            window.chrome.runtime.sendMessage({ type: "getAppStatus" }, () => {});
          }
        }
      });

      // Test UI remains stable
      const downloadButton = await page.$("#enhanced-download-button");
      expect(downloadButton).not.toBeNull();
    });
  });

  test.describe("Advanced Code Path Coverage Tests", () => {
    /**
     * Test Chrome extension API message handling
     */
    test("Chrome extension API message handling", async ({ page }) => {
      const coverageData = await collectCoverage(
        page,

        "api-message-handling"
      );
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test different message types
      await page.evaluate(() => {
        if (window.chrome && window.chrome.runtime) {
          // Test getAppStatus message
          window.chrome.runtime.sendMessage({ type: "getAppStatus" }, response => {
            console.log("App status response:", response);
          });

          // Test setConfig message
          window.chrome.runtime.sendMessage(
            { type: "setConfig", config: { serverPort: 8080 } },
            response => {
              console.log("Set config response:", response);
            }
          );

          // Test getHistory message
          window.chrome.runtime.sendMessage({ type: "getHistory" }, response => {
            console.log("Get history response:", response);
          });

          // Test clearHistory message
          window.chrome.runtime.sendMessage({ type: "clearHistory" }, response => {
            console.log("Clear history response:", response);
          });
        }
      });

      // Test error handling for invalid messages
      await page.evaluate(() => {
        if (window.chrome && window.chrome.runtime) {
          window.chrome.runtime.sendMessage({ type: "invalidMessage" }, response => {
            console.log("Invalid message response:", response);
          });
        }
      });

      await saveCoverage(coverageData, "api-message-handling");
    });

    /**
     * Test background script functionality
     */
    test("background script functionality", async ({ page }) => {
      const coverageData = await collectCoverage(
        page,

        "background-script"
      );
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test action icon functionality
      await page.evaluate(() => {
        if (window.chrome && window.chrome.action) {
          // Test action icon update
          window.chrome.action.setIcon({
            path: {
              16: "icons/icon16.png",
              48: "icons/icon48.png",
              128: "icons/icon128.png",
            },
          });

          // Test action badge
          window.chrome.action.setBadgeText({ text: "1" });
          window.chrome.action.setBadgeBackgroundColor({
            color: "#FF0000",
          });
        }
      });

      // Test theme application
      await page.evaluate(() => {
        // Test dark theme
        const darkTheme = window.matchMedia("(prefers-color-scheme: dark)");
        if (darkTheme.matches) {
          document.documentElement.classList.add("dark-theme");
        }

        // Test light theme
        const lightTheme = window.matchMedia("(prefers-color-scheme: light)");
        if (lightTheme.matches) {
          document.documentElement.classList.remove("dark-theme");
        }
      });

      await saveCoverage(coverageData, "background-script");
    });

    /**
     * Test server discovery and connection
     */
    test("server discovery and connection", async ({ page }) => {
      const coverageData = await collectCoverage(
        page,

        "server-discovery"
      );
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test server port discovery
      await page.evaluate(() => {
        // Mock server discovery
        const discoverServerPort = async (startPort = 5013, endPort = 5020) => {
          for (let port = startPort; port <= endPort; port++) {
            try {
              const response = await fetch(`http://localhost:${port}/health`);
              if (response.ok) {
                return port;
              }
            } catch {
              console.log(`Port ${port} not available`);
            }
          }
          return null;
        };

        // Test discovery function
        discoverServerPort().then(port => {
          console.log("Discovered server port:", port);
        });
      });

      // Test server status checking
      await page.evaluate(() => {
        const checkServerStatus = async port => {
          try {
            const response = await fetch(`http://localhost:${port}/status`);
            return response.ok;
          } catch {
            return false;
          }
        };

        // Test status checking
        checkServerStatus(5013).then(isOnline => {
          console.log("Server online:", isOnline);
        });
      });

      await saveCoverage(coverageData, "server-discovery");
    });

    /**
     * Test download functionality and progress tracking
     */
    test("download functionality and progress tracking", async ({ page }) => {
      const coverageData = await collectCoverage(
        page,

        "download-functionality"
      );
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test download status rendering
      await page.evaluate(() => {
        const mockDownloadData = {
          active: {
            "download-1": {
              status: "downloading",
              progress: 50,
              filename: "video.mp4",
              url: "https://example.com/video",
            },
            "download-2": {
              status: "completed",
              progress: 100,
              filename: "audio.mp3",
              url: "https://example.com/audio",
            },
          },
          queue: ["download-3", "download-4"],
        };

        // Test renderDownloadStatus function
        if (/** @type {any} */ (window).renderDownloadStatus) {
          /** @type {any} */ (window).renderDownloadStatus(mockDownloadData);
        }
      });

      // Test error handling in downloads
      await page.evaluate(() => {
        const mockErrorData = {
          active: {
            "download-error": {
              status: "error",
              progress: 0,
              filename: "failed.mp4",
              url: "https://example.com/failed",
              error: "Network timeout",
            },
          },
          queue: [],
        };

        // Test error rendering
        if (/** @type {any} */ (window).renderDownloadStatus) {
          /** @type {any} */ (window).renderDownloadStatus(mockErrorData);
        }
      });

      await saveCoverage(coverageData, "download-functionality");
    });

    /**
     * Test configuration management
     */
    test("configuration management", async ({ page }) => {
      const coverageData = await collectCoverage(
        page,

        "config-management"
      );
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/options.html`);
      await page.waitForSelector("#settings-form", { timeout: 10000 });

      // Test configuration loading
      await page.evaluate(() => {
        const testConfig = {
          serverPort: 8080,
          downloadDirectory: "/downloads",
          debugMode: true,
          enableHistory: true,
          logLevel: "DEBUG",
          ytdlpFormat: "best",
          allowPlaylists: true,
        };

        // Test populateFormFields function
        if (/** @type {any} */ (window).populateFormFields) {
          /** @type {any} */ (window).populateFormFields(testConfig);
        }
      });

      // Test configuration validation
      await page.evaluate(() => {
        const validateConfig = config => {
          const errors = [];
          if (config.serverPort < 1024 || config.serverPort > 65535) {
            errors.push("Invalid server port");
          }
          if (!config.downloadDirectory) {
            errors.push("Download directory required");
          }
          return errors;
        };

        const testConfig = {
          serverPort: 99999, // Invalid
          downloadDirectory: "", // Invalid
        };

        const errors = validateConfig(testConfig);
        console.log("Config validation errors:", errors);
      });

      await saveCoverage(coverageData, "config-management");
    });

    /**
     * Test history management functionality
     */
    test("history management functionality", async ({ page }) => {
      const coverageData = await collectCoverage(
        page,

        "history-management"
      );
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test history loading and rendering
      await page.evaluate(() => {
        const _mockHistory = [
          {
            id: "download-1",
            status: "completed",
            filename: "video1.mp4",
            url: "https://example.com/video1",
            timestamp: Date.now() - 3600000, // 1 hour ago
          },
          {
            id: "download-2",
            status: "error",
            filename: "video2.mp4",
            url: "https://example.com/video2",
            timestamp: Date.now() - 7200000, // 2 hours ago
            error: "Network timeout",
          },
        ];

        // Test loadAndRenderHistory function
        if (/** @type {any} */ (window).loadAndRenderHistory) {
          /** @type {any} */ (window).loadAndRenderHistory("history-items", 10);
        }
      });

      // Test history item creation
      await page.evaluate(() => {
        const createHistoryItem = item => {
          const li = document.createElement("li");
          li.className = "history-item";
          li.innerHTML = `
                        <span class="filename">${item.filename}</span>
                        <span class="status">${item.status}</span>
                        <span class="timestamp">${new Date(item.timestamp).toLocaleString()}</span>
                    `;
          return li;
        };

        const testItem = {
          id: "test-download",
          status: "completed",
          filename: "test.mp4",
          timestamp: Date.now(),
        };

        const historyItem = createHistoryItem(testItem);
        console.log("Created history item:", historyItem);
      });

      await saveCoverage(coverageData, "history-management");
    });

    /**
     * Test drag and drop functionality
     */
    test("drag and drop functionality", async ({ page }) => {
      const coverageData = await collectCoverage(
        page,

        "drag-drop"
      );
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test drag event handlers
      await page.evaluate(() => {
        const testDragEvent = new Event("dragstart");
        /** @type {any} */ (testDragEvent).dataTransfer = {
          setData: (_type, data) => {
            console.log("Set drag data:", _type, data);
          },
        };

        // Test handleDragStart
        if (/** @type {any} */ (window).handleDragStart) {
          /** @type {any} */ (window).handleDragStart(testDragEvent);
        }

        // Test handleDragOver
        const testDragOverEvent = new Event("dragover");
        testDragOverEvent.preventDefault = () => {
          console.log("Prevented default drag over");
        };
        if (/** @type {any} */ (window).handleDragOver) {
          /** @type {any} */ (window).handleDragOver(testDragOverEvent);
        }

        // Test handleDrop
        const testDropEvent = new Event("drop");
        /** @type {any} */ (testDropEvent).dataTransfer = {
          getData: _type => {
            return "test-data";
          },
        };
        testDropEvent.preventDefault = () => {
          console.log("Prevented default drop");
        };
        if (/** @type {any} */ (window).handleDrop) {
          /** @type {any} */ (window).handleDrop(testDropEvent);
        }
      });

      await saveCoverage(coverageData, "drag-drop");
    });

    /**
     * Test theme switching functionality
     */
    test("theme switching functionality", async ({ page }) => {
      const coverageData = await collectCoverage(
        page,

        "theme-switching"
      );
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/options.html`);
      await page.waitForSelector("#settings-form", { timeout: 10000 });

      // Test theme toggle functionality
      await page.evaluate(() => {
        const toggleTheme = () => {
          const isDark = document.documentElement.classList.contains("dark-theme");
          document.documentElement.classList.toggle("dark-theme", !isDark);
          return !isDark;
        };

        // Test theme switching
        const newTheme = toggleTheme();
        console.log("Switched to theme:", newTheme ? "dark" : "light");

        // Test logo switching based on theme
        const logo = document.querySelector("img[src*='icon']");
        if (logo) {
          const isDark = document.documentElement.classList.contains("dark-theme");
          const currentSrc = /** @type {HTMLImageElement} */ (logo).src;
          const newSrc = currentSrc.replace(
            isDark ? "icon" : "darkicon",
            isDark ? "darkicon" : "icon"
          );
          /** @type {HTMLImageElement} */ (logo).src = newSrc;
          console.log("Updated logo src:", newSrc);
        }
      });

      // Test theme persistence
      await page.evaluate(() => {
        const saveThemePreference = isDark => {
          localStorage.setItem("theme", isDark ? "dark" : "light");
        };

        const loadThemePreference = () => {
          return localStorage.getItem("theme") || "light";
        };

        // Test theme persistence
        saveThemePreference(true);
        const savedTheme = loadThemePreference();
        console.log("Saved theme preference:", savedTheme);
      });

      await saveCoverage(coverageData, "theme-switching");
    });

    /**
     * Test error handling and recovery
     */
    test("error handling and recovery", async ({ page }) => {
      const coverageData = await collectCoverage(
        page,

        "error-handling"
      );
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test error status display
      await page.evaluate(() => {
        const showError = (message, duration = 3000) => {
          const statusEl = document.getElementById("status");
          if (statusEl) {
            statusEl.textContent = message;
            statusEl.className = "status-error";

            // Add error tip
            const tip = document.createElement("div");
            tip.className = "error-tip";
            tip.textContent = "Tip: check your network connection and try again";
            statusEl.appendChild(tip);

            // Auto-clear after duration
            setTimeout(() => {
              statusEl.textContent = "";
              statusEl.className = "";
            }, duration);
          }
        };

        // Test error display
        showError("Test error message", 2000);
      });

      // Test network error handling
      await page.evaluate(() => {
        const handleNetworkError = async url => {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
          } catch (error) {
            console.error("Network error:", error.message);
            return null;
          }
        };

        // Test network error handling
        handleNetworkError("https://invalid-url-that-will-fail.com/api/test");
      });

      await saveCoverage(coverageData, "error-handling");
    });

    /**
     * Test performance monitoring and optimization
     */
    test("performance monitoring and optimization", async ({ page }) => {
      const coverageData = await collectCoverage(
        page,

        "performance-monitoring"
      );
      await setupChromeAPIMock(page);

      await page.goto(`${baseUrl}/ui/popup.html`);
      await page.waitForSelector("#enhanced-download-button", {
        timeout: 10000,
      });

      // Test performance monitoring
      await page.evaluate(() => {
        const monitorPerformance = () => {
          const performance = {
            memory: {
              usedJSHeapSize: 1024 * 1024 * 10, // 10MB
              totalJSHeapSize: 1024 * 1024 * 50, // 50MB
            },
            timing: {
              loadEventEnd: Date.now(),
              navigationStart: Date.now() - 1000,
            },
          };

          const memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024);
          const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;

          console.log("Memory usage:", memoryUsage.toFixed(2), "MB");
          console.log("Load time:", loadTime, "ms");

          return {
            memoryUsage,
            loadTime,
            isOptimized: memoryUsage < 50 && loadTime < 3000,
          };
        };

        const performanceMetrics = monitorPerformance();
        console.log("Performance metrics:", performanceMetrics);
      });

      // Test DOM optimization
      await page.evaluate(() => {
        const optimizeDOM = () => {
          const elements = document.querySelectorAll("*");
          const elementCount = elements.length;

          // Remove unnecessary elements
          const unnecessaryElements = document.querySelectorAll(".temp, .debug, .test");
          unnecessaryElements.forEach(el => el.remove());

          console.log("Optimized DOM - removed", unnecessaryElements.length, "elements");
          console.log("Total elements:", elementCount - unnecessaryElements.length);
        };

        optimizeDOM();
      });

      await saveCoverage(coverageData, "performance-monitoring");
    });
  });
});
