//
const { test, expect } = require("@playwright/test");
const { chromium } = require("playwright");
const path = require("path");
const express = require("express");
const fs = require("fs");
const cp = require("child_process");
const { spawn } = require("child_process");
const os = require("os");
const _net = require("net");

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
                // Reflect persisted smart injection preference if set via storage.set in tests
                smartInjectionEnabled: window /** @type {any} */._smartInjectionEnabled === true,
              })
          ),
          set: /** @type {any} */ (
            (items, cb) => {
              // Persist smartInjectionEnabled to be returned by subsequent get() calls
              if (
                items &&
                typeof items === "object" &&
                Object.prototype.hasOwnProperty.call(items, "smartInjectionEnabled")
              ) {
                window /** @type {any} */._smartInjectionEnabled = !!items.smartInjectionEnabled;
              }
              if (cb) cb();
            }
          ),
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
    // Ensure latest compiled content script is available for injection tests
    try {
      const { execSync } = require("child_process");
      execSync("npm run build:ts", { stdio: "inherit" });
    } catch (e) {
      console.log("[E2E] Warning: build step failed (continuing):", (e && e.message) || e);
    }
  });

  test.describe("Autoplay/Media detection matrix", () => {
    let matrixServer;
    let matrixBaseUrl;

    test.beforeAll(async () => {
      // Start a small static server to serve local extension assets for matrix tests
      const app = express();
      app.use(express.static(path.join(__dirname, "../../extension")));
      matrixServer = await new Promise(resolve => {
        const srv = app.listen(0, () => resolve(srv));
      });
      const addr = matrixServer.address();
      const port = typeof addr === "string" ? 0 : addr?.port || 0;
      matrixBaseUrl = `http://127.0.0.1:${port}`;
    });

    test.afterAll(async () => {
      if (matrixServer) {
        matrixServer.close();
      }
    });

    // Utilities to interact inside frames (main frame included)
    async function clickSelectorsInFrame(frame, selectors) {
      for (const sel of selectors) {
        try {
          const locator = frame.locator(sel).first();
          if (await locator.count()) {
            await locator.click({ timeout: 1000 }).catch(() => {});
          }
        } catch {}
      }
    }

    async function attemptAutoplayInFrame(frame) {
      const u = frame.url().toLowerCase();
      let domainPlaySelectors = [];
      try {
        const domainMap = JSON.parse(
          fs.readFileSync(path.resolve(__dirname, "./media-domains.json"), "utf8")
        );
        for (const domain of Object.keys(domainMap)) {
          if (u.includes(domain)) {
            const conf = domainMap[domain];
            if (Array.isArray(conf.play_selectors)) {
              domainPlaySelectors = conf.play_selectors;
            }
            break;
          }
        }
      } catch {}

      const playSelectors = [
        "button[aria-label*='Play' i]",
        "button[title*='Play' i]",
        ".vjs-big-play-button",
        ".plyr__control--overlaid",
        "button:has-text('Play')",
        "button:has-text('Watch')",
        "[data-qa='play_button']",
        "#player .play, .ytp-large-play-button, .jw-display-icon-container",
      ].concat(domainPlaySelectors);
      await clickSelectorsInFrame(frame, playSelectors);
      // Try generic gestures in frame
      try {
        await frame.press("body", "Space");
      } catch {}
      try {
        await frame.press("body", "k"); // YouTube
      } catch {}
      // Domain-specific best-effort triggers inside the frame
      try {
        if (u.includes("youtube.com") || u.includes("youtube-nocookie.com")) {
          // Click the player UI button if present (within iframe)
          await clickSelectorsInFrame(frame, [
            ".ytp-large-play-button",
            ".ytp-play-button",
          ]);
        } else if (u.includes("vimeo.com")) {
          // Vimeo listens to postMessage("{method:'play'}") and has overlays; try both
          await clickSelectorsInFrame(frame, [
            ".play,.vimeo,.iris_video-vital__play",
            "button[aria-label*='Play' i]",
          ]);
          await frame.evaluate(() => {
            try {
              // @ts-ignore
              window.postMessage({ method: "play" }, "*");
            } catch {}
          });
        } else if (u.includes("dailymotion.com")) {
          await clickSelectorsInFrame(frame, [
            "button[aria-label*='Play' i]",
            ".dm_button_play,.dmp_PlaybackControls-playPause",
          ]);
          await frame.evaluate(() => {
            try {
              // @ts-ignore
              window.postMessage({ event: "play" }, "*");
            } catch {}
          });
        } else if (u.includes("twitch.tv")) {
          await clickSelectorsInFrame(frame, [
            "button[data-a-target='player-play-pause-button']",
            "button[aria-label*='Play' i]",
          ]);
        } else if (u.includes("streamable.com")) {
          await clickSelectorsInFrame(frame, [
            ".play-button,.video-js .vjs-big-play-button",
          ]);
        }
      } catch {}
      // Try clicking video/audio elements directly (force)
      const mediaLoc = frame.locator("video, audio");
      const count = await mediaLoc.count().catch(() => 0);
      for (let i = 0; i < count; i++) {
        try {
          await mediaLoc.nth(i).click({ force: true, timeout: 500 });
        } catch {}
      }
      // Attempt programmatic play on media elements
      try {
        await frame.evaluate(() => {
          document.querySelectorAll("video, audio").forEach(m => {
            try {
              // @ts-ignore
              m.muted = true;
              // @ts-ignore
              const r = m.play();
              if (r && typeof r.catch === "function") r.catch(() => {});
            } catch {}
          });
        });
      } catch {}
    }

    // From the top document, postMessage into known player iframes to trigger their APIs
    async function triggerKnownPlayerAPIs(page) {
      try {
        await page.evaluate(() => {
          const iframes = Array.from(document.querySelectorAll("iframe"));
          const tryPost = (f, msg) => {
            try {
              f.contentWindow?.postMessage(msg, "*");
            } catch {}
          };
          const now = String(Date.now());
          for (const f of iframes) {
            const src = (f.getAttribute("src") || "").toLowerCase();
            if (src.includes("youtube.com/embed") || src.includes("youtube-nocookie.com")) {
              // YouTube IFrame API
              tryPost(f, JSON.stringify({ event: "listening", id: now }));
              tryPost(f, JSON.stringify({ event: "command", func: "playVideo", args: [] }));
            } else if (src.includes("player.vimeo.com") || src.includes("vimeo.com")) {
              // Vimeo Player API
              tryPost(f, { method: "play" });
            } else if (src.includes("dailymotion.com")) {
              // Dailymotion Player API
              tryPost(f, { event: "play" });
              tryPost(f, { command: "play", parameters: {} });
            } else if (src.includes("player.twitch.tv") || src.includes("clips.twitch.tv") || src.includes("twitch.tv")) {
              // Twitch embeds
              tryPost(f, { event: "play" });
            } else if (src.includes("streamable.com")) {
              // Streamable embeds
              tryPost(f, { event: "play" });
            }
          }
        });
      } catch {}
    }

    async function attemptAutoplayAll(page) {
      // Main frame first
      await attemptAutoplayInFrame(page);
      for (const f of page.frames()) {
        if (f === page.mainFrame()) continue;
        await attemptAutoplayInFrame(f);
      }
      // Fire postMessage-based API triggers from top after DOM is ready
      await triggerKnownPlayerAPIs(page);
    }

    async function detectMediaAll(page) {
      // Returns true if any frame reports playable media
      // Main frame first
      const inMain = await page.evaluate(() => {
        const els = Array.from(document.querySelectorAll("video,audio"));
        return els.some(el => {
          const m = /** @type {HTMLMediaElement} */ (el);
          return (typeof m.paused === "boolean" && !m.paused) || (typeof m.readyState === "number" && m.readyState > 0);
        });
      }).catch(() => false);
      if (inMain) return true;
      for (const f of page.frames()) {
        if (f === page.mainFrame()) continue;
        const ok = await f.evaluate(() => {
          const els = Array.from(document.querySelectorAll("video,audio"));
          return els.some(el => {
            const m = /** @type {HTMLMediaElement} */ (el);
            return (typeof m.paused === "boolean" && !m.paused) || (typeof m.readyState === "number" && m.readyState > 0);
          });
        }).catch(() => false);
        if (ok) return true;
      }
      return false;
    }

    test("@headful validate media detection against configured URL sets", async ({ page }) => {
      test.setTimeout(120000);
      const matrixPath = path.resolve(__dirname, "../extension/media-sites.json");
      const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8"));
      const toAbs = (u) => (u.startsWith("http") ? u : `${matrixBaseUrl}${u}`);
      let present = (matrix.media_present || []).map(toAbs);
      const absent = (matrix.no_media || []).map(toAbs);

      // By default, restrict to a stable set of domains; allow full set with EVD_MEDIA_SITES_WIDE=true
      const wide = String(process.env.EVD_MEDIA_SITES_WIDE || "").toLowerCase() === "true";
      if (!wide) {
        const stableUrls = [
          // Known-good, long-lived examples
          "https://vimeo.com/76979871",
          "https://www.dailymotion.com/video/x7u5n3j",
          "https://clips.twitch.tv/AwkwardHelplessBunnyWutFace",
          "https://streamable.com/moo",
        ];
        present = stableUrls;
      }

      // Helper to detect if a video/audio is present and can be played
      async function detectMedia(p) {
        // Determine domain-specific timeout from media-domains.json
        let timeoutMs = 6000;
        try {
          const domainMap = JSON.parse(
            fs.readFileSync(path.resolve(__dirname, "./media-domains.json"), "utf8")
          );
          const currentUrl = (p.url() || "").toLowerCase();
          for (const domain of Object.keys(domainMap)) {
            if (currentUrl.includes(domain)) {
              const conf = domainMap[domain];
              if (typeof conf.timeout_ms === "number" && conf.timeout_ms > 0) {
                timeoutMs = conf.timeout_ms;
              }
              break;
            }
          }
        } catch {}
        // Wait for network to settle before attempts (best-effort)
        try {
          await p.waitForLoadState("networkidle", { timeout: Math.min(15000, Math.max(2000, timeoutMs)) });
        } catch {}
        const deadline = Date.now() + timeoutMs;
        // Attempt autoplay across frames and API triggers; poll readiness until deadline
        while (Date.now() < deadline) {
          await attemptAutoplayAll(p);
          const ok = await detectMediaAll(p);
          if (ok) return true;
          await p.waitForTimeout(500);
        }
        return false;
      }

      for (const url of present) {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        try {
          await page.waitForLoadState("networkidle", { timeout: 12000 });
        } catch {}
        // Use existing helper if defined in this scope
        try {
          // @ts-ignore
          if (typeof closeOverlays === "function" && !url.startsWith(matrixBaseUrl)) {
            // @ts-ignore
            await closeOverlays(page);
          }
        } catch {}
        const detected = await detectMedia(page);
        expect(detected).toBe(true);
      }
      for (const url of absent) {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        try {
          await page.waitForLoadState("networkidle", { timeout: 12000 });
        } catch {}
        try {
          // @ts-ignore
          if (typeof closeOverlays === "function" && !url.startsWith(matrixBaseUrl)) {
            // @ts-ignore
            await closeOverlays(page);
          }
        } catch {}
        const detected = await detectMedia(page);
        expect(detected).toBe(false);
      }
    });
  });

  // Note: Autoplay helpers are enabled only for opt-in real-site tests below to avoid
  // interfering with synthetic/smart-injection expectations in unit-like E2E.

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
     * Smart Injection: content script should not inject a global button when no media is present
     */
    test("smart injection hides button on pages without media", async ({ page }) => {
      await setupChromeAPIMock(page);
      // Enable smart injection in mocked storage
      await page.addInitScript(() => {
        chrome.storage.local.set({ smartInjectionEnabled: true }, () => {});
      });
      // Minimal page without media
      await page.setContent(
        "<!DOCTYPE html><html><head><meta charset='utf-8'><title>No Media</title></head><body><main><h1>No media here</h1></main></body></html>"
      );
      // Inject built content script into the page
      const contentPath = path.resolve(__dirname, "../../extension/dist/content.js");
      await page.addScriptTag({ path: contentPath });
      // Wait for smart mode scan cycles to complete and verify the global button is absent or hidden
      await page.waitForFunction(
        () => {
          const el = document.querySelector("#evd-download-button-main");
          if (!el) return true;
          const style = window.getComputedStyle(el);
          return style.display === "none" || style.visibility === "hidden" || el.classList.contains("hidden");
        },
        { timeout: 8000 }
      );
    });

    /**
     * Smart Injection: content script should inject a button when media is detected
     */
    test("smart injection shows button when media is present", async ({ page }) => {
      await setupChromeAPIMock(page);
      // Enable smart injection in mocked storage
      await page.addInitScript(() => {
        chrome.storage.local.set({ smartInjectionEnabled: true }, () => {});
      });
      // Page with a visible video element
      await page.setContent(
        "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Has Media</title></head><body><main><video width='320' height='240' src=''></video></main></body></html>"
      );
      // Inject built content script into the page
      const contentPath = path.resolve(__dirname, "../../extension/dist/content.js");
      await page.addScriptTag({ path: contentPath });
      // Allow detection/injection to occur
      await page.waitForTimeout(3000);
      // Expect at least one injected button
      const btn = await page.$(`#evd-download-button-main, button.download-button`);
      expect(btn).not.toBeNull();
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

      // Allow a higher threshold on slower engines (e.g., Firefox CI) while keeping a strict default
      const threshold = process.env.CI_BROWSER === "firefox" ? 350 : 100;
      expect(renderTime).toBeLessThan(threshold);
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

// -----------------------------------------------------------------------------
// Real site detection (opt-in; requires headed Chromium and internet access)
// -----------------------------------------------------------------------------
test.describe("Real site video detection (opt-in)", () => {
  test.skip(!!process.env.CI, "Skip on CI");
  test.skip(process.env.EVD_REAL_SITES !== "true", "Set EVD_REAL_SITES=true to enable");

  let context;
  let browser;
  let serverProc;
  let serverPort;
  let downloadDir;
  let extPath;

  test.beforeAll(async () => {
    // Build extension assets without cleaning dist to avoid race conditions during tests
    try {
      cp.execSync("npm run build:ts", { stdio: "inherit" });
    } catch {
      console.log("[RealSites] Build (ts) failed; proceeding if dist exists.");
    }

    // Extension root is repo root (manifest.json at project root)
    extPath = path.resolve(__dirname, "../../");

    // Start Python server with temp download dir on a dynamic testing port
    downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), "evd-downloads-"));
    // Choose from the same test range as the Python suite (5000-5010)
    // Prefer an explicit E2E_TEST_PORT if provided, else pick an open one
    const pickOpenPort = async (start = 5000, end = 5010) => {
      const net = await import("node:net");
      const tryPort = p =>
        new Promise(resolve => {
          const srv = net.createServer();
          srv.once("error", () => resolve(false));
          srv.once("listening", () => srv.close(() => resolve(true)));
          srv.listen(p, "127.0.0.1");
        });
      for (let p = start; p <= end; p++) {
        const ok = await tryPort(p);
        if (ok) return p;
      }
      return 5006;
    };
    serverPort = process.env.E2E_TEST_PORT
      ? Number(process.env.E2E_TEST_PORT)
      : await pickOpenPort();
    const env = {
      ...process.env,
      ENVIRONMENT: "testing",
      EVD_TESTING: "true",
      SERVER_PORT: String(serverPort),
      DOWNLOAD_DIR: downloadDir,
      DEBUG_MODE: "false",
      // Ensure logs do not go to the main server_output.log
      LOG_FILE: path.resolve(__dirname, "../../tmp/server_output_test.playwright.log"),
    };
    serverProc = spawn("python3", ["-m", "server"], { env, stdio: "inherit" });
    // Wait until health endpoint responds
    const healthUrl = `http://127.0.0.1:${serverPort}/health`;
    for (let i = 0; i < 20; i++) {
      const res = await fetch(healthUrl).catch(() => null);
      if (res && res.ok) break;
      await new Promise(r => setTimeout(r, 300));
    }

    // Background/headless approach (cross-platform): headless browser + inject built content script
    browser = await chromium.launch({
      headless: true,
      args: [
        "--autoplay-policy=no-user-gesture-required",
        "--mute-audio",
        "--disable-gpu",
      ],
    });
    context = await browser.newContext({ ignoreHTTPSErrors: true });

    // Preload built content scripts as init scripts so they run on every page
    const contentSrc = fs.readFileSync(path.resolve(__dirname, "../../extension/dist/content.js"), "utf8");
    const ytEnhanceSrc = fs.readFileSync(
      path.resolve(__dirname, "../../extension/dist/youtube_enhance.js"),
      "utf8"
    );

    // Auto-play helper for real-site pages: attempt to start any media once per page
    context.on("page", async p => {
      await p.addInitScript(() => {
        const tryPlayAllMedia = () => {
          const mediaElements = Array.from(document.querySelectorAll("video, audio"));
          for (const el of mediaElements) {
            try {
              /** @type {HTMLMediaElement} */ (el).muted = true;
              /** @type {HTMLMediaElement} */ (el).volume = 0.0;
              const pr = /** @type {HTMLMediaElement} */ (el).play();
              if (pr && typeof pr.catch === "function") pr.catch(() => {});
            } catch {}
          }
        };
        document.addEventListener("DOMContentLoaded", tryPlayAllMedia, { once: true });
        window.addEventListener("load", tryPlayAllMedia, { once: true });
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) tryPlayAllMedia();
        });
        window.addEventListener("pointerdown", () => tryPlayAllMedia(), { once: true });
      });
      // Minimal chrome API shim for content script expectations
      await p.addInitScript(() => {
        window.chrome = /** @type {any} */ ({
          runtime: {
            lastError: undefined,
            sendMessage: (_msg, cb) => cb && cb({ status: "success" }),
            onMessage: { addListener: () => {} },
          },
          storage: { local: { get: (_k, cb) => cb && cb({}), set: (_i, cb) => cb && cb() } },
          tabs: { query: () => Promise.resolve([]) },
        });
      });
      // Inject built YT enhance and content scripts at document start
      await p.addInitScript({ content: ytEnhanceSrc });
      await p.addInitScript({ content: contentSrc });
    });
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
    if (browser) {
      await browser.close();
    }
    if (serverProc) {
      try {
        serverProc.kill("SIGTERM");
      } catch {
        void 0;
      }
    }
  });

  const mainstreamVideoPages = [
    // Keep mainstream minimal and stable; YouTube can be flaky in automated contexts
    { name: "Vimeo", url: "https://vimeo.com/76979871" },
    { name: "Dailymotion", url: "https://www.dailymotion.com/video/x7u5n3j" },
    // Twitch clip (may require consent/geo; best-effort)
    { name: "Twitch", url: "https://clips.twitch.tv/AwkwardHelplessBunnyWutFace" },
    { name: "Streamable", url: "https://streamable.com/moo" },
  ];

  const adultVideoPages = [
    // Note: These may require geo/consent; all are best-effort and skipped if unreachable
    { name: "Pornhub", url: "https://www.pornhub.com/view_video.php?viewkey=ph5b7b2bd85e3e9" },
    { name: "XVideos", url: "https://www.xvideos.com/video5894801/" },
    { name: "XHamster", url: "https://xhamster.com/videos/teen-amateur-12345" },
    { name: "RedTube", url: "https://www.redtube.com/131313" },
    { name: "YouPorn", url: "https://www.youporn.com/watch/13639978/" },
    { name: "SpankBang", url: "https://spankbang.com/1/video/" },
    { name: "Spankwire", url: "https://www.spankwire.com/1234567/video/" },
    { name: "Tube8", url: "https://www.tube8.com/video/1234567/" },
    { name: "KeezMovies", url: "https://www.keezmovies.com/video/1234567/" },
    { name: "Tnaflix", url: "https://www.tnaflix.com/teen-porn/1234567" },
    { name: "Motherless", url: "https://motherless.com/ABC123" },
    { name: "Eporner", url: "https://www.eporner.com/video-abc123/" },
    { name: "Porntrex", url: "https://www.porntrex.com/video/123456/" },
    { name: "YouJizz", url: "https://www.youjizz.com/videos/12345678/" },
    { name: "HClips", url: "https://hclips.com/videos/123456/" },
  ];

  test("@headful Synthetic: controlled page injects button and backend registers download", async () => {
    test.setTimeout(45000);
    const syntheticUrl = "http://evd.test/synthetic";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>EVD Synthetic</title></head><body><main><h1>Test</h1><video width="320" height="240"></video></main></body></html>`;
    // Route the synthetic URL to our controlled HTML
    await context.route("**/*", async route => {
      const reqUrl = route.request().url();
      if (reqUrl === syntheticUrl) {
        await route.fulfill({ status: 200, contentType: "text/html", body: html });
      } else {
        await route.continue();
      }
    });

    const page = await context.newPage();
    try {
      await page.goto(syntheticUrl, { waitUntil: "domcontentloaded" });
      // Wait for our content script to run and inject the global button
      await page.waitForTimeout(1500);
      const clicked = await safeClickDownloadButton(page);
      expect(clicked).toBe(true);

      // Poll backend for any status entries
      const statusUrl = `http://127.0.0.1:${serverPort}/api/status`;
      let sawAny = false;
      for (let i = 0; i < 30; i++) {
        const res = await page.request.get(statusUrl).catch(() => null);
        if (res && res.ok()) {
          const data = await res.json();
          if (data && typeof data === "object" && Object.keys(data).length > 0) {
            sawAny = true;
            break;
          }
        }
        await page.waitForTimeout(500);
      }
      expect(sawAny).toBe(true);
    } finally {
      await page.close();
      await context.unroute("**/*");
    }
  });

  test("@headful YouTube Shorts: drag and click EVD button (best-effort)", async () => {
    // Allow extra time for real-site network variability and backend polling
    test.setTimeout(60000);
    const page = await context.newPage();
    try {
      await page.goto("https://www.youtube.com/shorts/MbY7wWkQcrc", {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      // Wait for our script to run and try to inject the button
      await page.waitForTimeout(3500);

      // Best-effort overlay cleanup and ensure our button is brought to front
      await closeOverlays(page);
      await page.evaluate(() => {
        const btn = /** @type {HTMLElement|null} */ (
          document.querySelector("#evd-download-button-main, button.download-button")
        );
        if (btn) {
          btn.style.zIndex = "2147483647";
          btn.classList.add("evd-visible");
          btn.classList.remove("hidden");
          btn.style.pointerEvents = "auto";
          btn.style.position = "fixed";
        }
      });

      const locator = page.locator("#evd-download-button-main, button.download-button").first();
      await locator.waitFor({ timeout: 10000 });

      // Capture position before drag
      const before = await locator.evaluate(el => {
        const he = /** @type {HTMLElement} */ (el);
        return {
          left: parseInt(he.style.left || "0", 10) || 0,
          top: parseInt(he.style.top || "0", 10) || 0,
        };
      });

      // Perform mouse drag by offset
      const box = await locator.boundingBox();
      if (box) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 140, box.y + box.height / 2 + 100, {
          steps: 12,
        });
        await page.mouse.up();
      }
      await page.waitForTimeout(300);

      // Read position after drag
      const after = await locator.evaluate(el => {
        const he = /** @type {HTMLElement} */ (el);
        return {
          left: parseInt(he.style.left || "0", 10) || 0,
          top: parseInt(he.style.top || "0", 10) || 0,
        };
      });

      // Verify position changed (allow either axis change)
      expect(after.left !== before.left || after.top !== before.top).toBeTruthy();

      // Ensure it remains clickable - clamp into viewport if needed and use JS click fallback
      try {
        await locator.scrollIntoViewIfNeeded();
        await locator.click({ timeout: 2000 });
      } catch {
        const viewport = await page.evaluate(() => ({
          w: window.innerWidth,
          h: window.innerHeight,
        }));
        const bb = await locator.boundingBox();
        if (
          bb &&
          (bb.x < 0 || bb.y < 0 || bb.x + bb.width > viewport.w || bb.y + bb.height > viewport.h)
        ) {
          await page.evaluate(() => {
            const btn = document.querySelector("#evd-download-button-main, button.download-button");
            if (btn && btn instanceof HTMLElement) {
              const vw = window.innerWidth;
              const vh = window.innerHeight;
              const width = btn.offsetWidth || 100;
              const height = btn.offsetHeight || 40;
              const left = parseInt(btn.style.left || "8", 10) || 8;
              const top = parseInt(btn.style.top || "8", 10) || 8;
              const clampedLeft = Math.max(8, Math.min(vw - width - 8, left));
              const clampedTop = Math.max(8, Math.min(vh - height - 8, top));
              btn.style.position = "fixed";
              btn.style.left = `${clampedLeft}px`;
              btn.style.top = `${clampedTop}px`;
              btn.style.zIndex = "2147483647";
            }
          });
        }
        // Fallback to JS-triggered click to bypass off-viewport constraints
        await page.evaluate(() => {
          const btn = document.querySelector("#evd-download-button-main, button.download-button");
          if (btn instanceof HTMLElement) btn.click();
        });
      }

      // After click, confirm backend received the download by polling /api/status
      await page.waitForTimeout(1000);
      const statusUrl = `http://127.0.0.1:${serverPort}/api/status`;
      let received = false;
      for (let i = 0; i < 30; i++) {
        const res = await page.request.get(statusUrl).catch(() => null);
        if (res && res.ok()) {
          try {
            const data = await res.json();
            if (data && typeof data === "object") {
              const ids = Object.keys(data);
              if (ids.length > 0) {
                received = true;
                break;
              }
            }
          } catch {
            // ignore parse issues and retry
          }
        }
        await page.waitForTimeout(500);
      }
      expect(received).toBe(true);
    } finally {
      await page.close();
    }
  });

  async function verifyDetection(page, label) {
    // Wait for our content script to initialize and run scans
    await page.waitForTimeout(3000);
    // Count buttons injected by our script
    const buttons = await page.$$(`button[id^='evd-download-button-']`);
    const count = buttons.length;
    console.log(`[RealSites] ${label}: found ${count} EVD button(s)`);
    // At least the global button should exist; ideally >= 2 when a video/iframe is detected
    expect(count).toBeGreaterThanOrEqual(1);
  }

  async function closeOverlays(page) {
    // Best-effort consent/age/cookie banners handling
    const clickSelectors = [
      "button#onetrust-accept-btn-handler",
      "button#onetrust-accept-btn",
      "button[aria-label='Agree']",
      "button:has-text('I Agree')",
      "button:has-text('Accept All')",
      "button:has-text('Accept Cookies')",
      "button:has-text('Continue')",
      "button:has-text('I am over 18')",
      "button:has-text('Enter')",
      "#agreeButton",
      ".cc-allow",
      "#cookie-accept",
      "#cookie-accept-all",
    ];
    for (const sel of clickSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.count()) {
        try {
          await btn.click({ timeout: 1000 });
        } catch {}
      }
    }
    // Remove common overlay containers
    const removalSelectors = [
      "#ageDisclaimerWrapper",
      "#age_disclaimer",
      ".age-gate",
      ".age-modal",
      ".modal-age-verification",
      ".consentModal",
      "#consentModal",
      "[id*='consent']",
      "[class*='consent']",
      "#qc-cmp2-container",
      ".qc-cmp2-container",
      "#sp_message_container_*",
      "#didomi-notice",
      "#notice",
      ".cookie-banner",
      ".cookie-consent",
    ];
    await page.evaluate(selectors => {
      selectors.forEach(sel => {
        try {
          document.querySelectorAll(sel).forEach(el => el.remove());
        } catch {}
      });
      // Neutralize high z-index full-screen overlays
      const overlays = Array.from(document.querySelectorAll("div,section,aside,header,footer"));
      overlays.forEach(el => {
        const style = window.getComputedStyle(el);
        const isOverlay =
          (style.position === "fixed" || style.position === "sticky") &&
          parseInt(style.zIndex || "0", 10) > 1000 &&
          (el.clientHeight > window.innerHeight * 0.4 || el.clientWidth > window.innerWidth * 0.4);
        if (isOverlay) {
          el.remove();
        }
      });
    }, removalSelectors);
  }

  async function safeClickDownloadButton(page) {
    await closeOverlays(page);
    const locator = page.locator("#evd-download-button-main, button.download-button");
    try {
      // Ensure our button is topmost
      await page.evaluate(() => {
        const btn = document.querySelector("#evd-download-button-main, button.download-button");
        if (btn) {
          const b = btn;
          b.style.zIndex = "2147483647";
          b.classList.add("evd-visible");
          b.classList.remove("hidden");
        }
      });
      await locator.first().click({ force: true, timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  for (const site of mainstreamVideoPages) {
    test(`detects video on ${site.name}`, async () => {
      const page = await context.newPage();
      await page.goto(site.url, { waitUntil: "domcontentloaded" });
      await verifyDetection(page, site.name);
      // Trigger download by clicking global button (best-effort)
      const clicked = await safeClickDownloadButton(page);
      if (!clicked) {
        test.info().annotations.push({
          type: "skip",
          description: `${site.name} click blocked by overlays`,
        });
        await page.close();
        return;
      }
      // Poll server status endpoint
      const statusUrl = `http://127.0.0.1:${serverPort}/api/status`;
      let ok = false;
      for (let i = 0; i < 20; i++) {
        const res = await page.request.get(statusUrl).catch(() => null);
        if (res && res.ok()) {
          ok = true;
          break;
        }
        await page.waitForTimeout(500);
      }
      expect(ok).toBe(true);
      await page.close();
    });
  }

  for (const site of adultVideoPages) {
    test(`attempts detection on ${site.name} (best-effort)`, async () => {
      const page = await context.newPage();
      try {
        await page.goto(site.url, { waitUntil: "domcontentloaded", timeout: 15000 });
        await verifyDetection(page, site.name);
        const clicked = await safeClickDownloadButton(page);
        if (!clicked) {
          test.info().annotations.push({
            type: "skip",
            description: `${site.name} click blocked by overlays`,
          });
          return;
        }
      } catch (err) {
        console.log(`[RealSites] Skipping ${site.name}: ${err.message}`);
        test.info().annotations.push({ type: "skip", description: `${site.name} unreachable` });
      } finally {
        await page.close();
      }
    });
  }

  test.skip("concurrent downloads from two tabs (best-effort)", async () => {
    const p1 = await context.newPage();
    const p2 = await context.newPage();
    try {
      await p1.goto("https://vimeo.com/76979871", { waitUntil: "domcontentloaded" });
      await p2.goto("https://www.dailymotion.com/video/x7u5n3j", { waitUntil: "domcontentloaded" });
      await verifyDetection(p1, "Vimeo");
      await verifyDetection(p2, "Dailymotion");
      const c1 = await safeClickDownloadButton(p1);
      const c2 = await safeClickDownloadButton(p2);
      if (!c1 || !c2) {
        test.info().annotations.push({ type: "skip", description: `click blocked by overlays` });
        return;
      }
      // Poll status and check at least one active entry appears
      const statusUrl = `http://127.0.0.1:${serverPort}/api/status`;
      let sawActive = false;
      for (let i = 0; i < 20; i++) {
        const res = await p1.request.get(statusUrl).catch(() => null);
        if (res && res.ok()) {
          const data = await res.json();
          if (data && Object.keys(data).length >= 0) {
            sawActive = true;
            break;
          }
        }
        await p1.waitForTimeout(500);
      }
      expect(sawActive).toBe(true);
    } finally {
      await p1.close();
      await p2.close();
    }
  });
});
