// eslint-env jest
/**
 * Headless browser tests for Chrome extension UI using Playwright.
 * Requires Playwright to be installed: `npm install -D playwright`
 */

// Polyfill setImmediate for Node 20+/24+
if (typeof global.setImmediate === "undefined") {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}

const express = require("express");
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
// Determine if running coverage tests
const isCoverage = process.env.PLAYWRIGHT_COVERAGE === "true";
const _v8toIstanbul = require("v8-to-istanbul");
const { createCoverageMap: _createCoverageMap } = require("istanbul-lib-coverage");
// Import centralized port configuration
const { getServerPort, getClientPort, _getPortRange } = require("../extension/src/constants");

// Increase default Jest timeout and declare dynamic server port
jest.setTimeout(240000);
// Declare HTTP server port (0 = dynamic) and UI base URL placeholder
let serverPort = process.env.E2E_PORT ? parseInt(process.env.E2E_PORT, 10) : 0;
let UI_BASE;

// HTTP server instance
let server;

describe("Chrome Extension UI E2E", () => {
  let browser;
  let page;

  beforeAll(async () => {
    // Start Express static server for extension files
    await new Promise(resolve => {
      const app = express();
      const baseDir = path.resolve(__dirname, "../../extension");
      // When collecting coverage, serve instrumented JS first, then static UI/assets
      if (isCoverage) {
        const instDir = path.resolve(__dirname, "../../extension-instrumented");
        app.use(express.static(instDir));
      }
      app.use(express.static(baseDir));
      const srv = app.listen(serverPort, () => {
        server = srv;
        // Capture actual listening port and set UI_BASE
        serverPort = srv.address().port;
        UI_BASE = `http://127.0.0.1:${serverPort}/ui`;
        console.log(`[E2E] Server listening on port ${serverPort}`);
        resolve();
      });
      srv.on("error", err => {
        server = srv;
        console.error("[E2E] Server failed to start:", err);
        // Fallback to assigned port if available
        try {
          serverPort = srv.address().port;
        } catch {
          // Ignore error
        }
        UI_BASE = `http://127.0.0.1:${serverPort}/ui`;
        resolve();
      });
    });
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
    // Start JS coverage collection if enabled
    if (isCoverage) {
      await page.coverage.startJSCoverage({ reportAnonymousScripts: true });
    }
    // Inject basic chrome API stub so popup.js can initialize without errors
    await page.addInitScript(() => {
      window.chrome = {
        runtime: {
          lastError: undefined,
          sendMessage: (_msg, cb) => cb({ status: "success", message: "" }),
        },
        tabs: {
          query: () => Promise.resolve([{ id: 1, url: window.location.href }]),
        },
        storage: {
          local: {
            get: (_keys, cb) => cb({ extensionConfig: {} }),
            set: (_items, cb) => cb && cb(),
          },
        },
      };
    });
    // Playwright does not support JS coverage collection out of the box
    // (Remove Puppeteer coverage collection for now)
  }, 60000);

  afterAll(async () => {
    // Export coverage data when running coverage tests
    if (isCoverage) {
      const coverage = await page.evaluate(() => window.__coverage__);
      const outDir = path.resolve(__dirname, "../../coverage/frontend");
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, "playwright-coverage.json"), JSON.stringify(coverage));
    }
    if (browser) {
      await browser.close();
    }
    // Shutdown Express server
    if (server) {
      server.close();
    }
  });

  it("popup.html loads successfully", async () => {
    const popupPath = `${UI_BASE}/popup.html`;
    await page.goto(popupPath);
    await page.waitForSelector("#enhanced-download-button");
    const btn = await page.$("#enhanced-download-button");
    expect(btn).not.toBeNull();
  }, 30000);

  it("options.html loads and contains form elements", async () => {
    const optionsPath = `${UI_BASE}/options.html`;
    await page.goto(optionsPath);
    await page.waitForSelector("#settings-form");
    const form = await page.$("#settings-form");
    expect(form).not.toBeNull();
  }, 30000);

  it("options.html live-saves settings on change", async () => {
    const optionsPath = `${UI_BASE}/options.html`;
    await page.goto(optionsPath);
    await page.waitForSelector("#settings-server-port");
    // Override sendMessage to capture messages
    await page.addInitScript(() => {
      window._savedSettingsMsg = null;
      const orig = chrome.runtime.sendMessage;
      chrome.runtime.sendMessage = (msg, cb) => {
        window._savedSettingsMsg = msg;
        return orig(msg, cb);
      };
    });
    // Change server port
    await page.fill("#settings-server-port", getServerPort().toString());
    await page.dispatchEvent("#settings-server-port", "input");
    // Wait for message capture
    await page.waitForFunction(() => window._savedSettingsMsg !== null);
    const msg = await page.evaluate(() => window._savedSettingsMsg);
    expect(msg.type).toBe("saveSettings");
    expect(msg.settings.server_port).toBe(getServerPort());
  }, 30000);

  it("options.html toggles light/dark theme via theme toggle button", async () => {
    const optionsPath = `${UI_BASE}/options.html`;
    await page.goto(optionsPath);
    await page.waitForSelector("#theme-toggle");
    const initialIsDark = await page.evaluate(() => document.body.classList.contains("dark-theme"));
    // Click theme toggle
    await page.click("#theme-toggle");
    // Verify theme class toggled
    const newIsDark = await page.evaluate(() => document.body.classList.contains("dark-theme"));
    expect(newIsDark).toBe(!initialIsDark);
  }, 30000);

  describe("User Workflows", () => {
    it("T1: Initiate a single video download", async () => {
      const popupPath = `${UI_BASE}/popup.html`;
      // Stub chrome API for download
      await page.addInitScript(() => {
        window.chrome = {
          runtime: {
            lastError: undefined,
            sendMessage: (msg, cb) => {
              if (msg.type === "getAppStatus") {
                cb({
                  status: "success",
                  serverConfig: {
                    server_port: getServerPort(),
                    debug_mode: false,
                  },
                });
              } else if (msg.type === "proxyDownload") {
                cb({ status: "success", message: "Download started." });
              } else {
                cb({});
              }
            },
            onMessage: { addListener: _fn => {} },
          },
          tabs: {
            query: () => Promise.resolve([{ id: 1, url: "https://example.com/video" }]),
            sendMessage: (_tabId, _msg, cb) => cb({ hidden: false, disabled: false }),
          },
          storage: {
            local: {
              get: (_keys, cb) => cb({ extensionConfig: {} }),
            },
          },
        };
      });
      await page.goto(popupPath);
      await page.waitForSelector("#enhanced-download-button");
      await page.click("#enhanced-download-button");
      // Wait until the status shows the download message
      await page.waitForFunction(() => {
        const el = document.getElementById("status");
        return el && el.textContent.includes("Download started.");
      });
    }, 30000);
    it("T2: Pause and resume an active download", async () => {
      // Stub chrome APIs for activeDownloads and pause/resume flows
      await page.addInitScript(() => {
        window.chrome = {
          runtime: {
            lastError: undefined,
            // Listeners registered via onMessage.addListener
            _listeners: [],
            addListener: function (_fn) {},
            onMessage: {
              _listeners: [],
              addListener(fn) {
                this._listeners.push(fn);
              },
            },
            sendMessage(msg, cb) {
              if (msg.type === "getActiveDownloads") {
                // Initial active download state: one downloading item
                cb({
                  active: {
                    video1: {
                      status: "downloading",
                      progress: 50,
                      filename: "video1",
                    },
                  },
                  queue: [],
                });
              } else if (msg.type === "pauseDownload") {
                // Simulate sending status update to paused
                this.onMessage._listeners.forEach(fn =>
                  fn({
                    type: "downloadStatusUpdate",
                    data: {
                      active: {
                        video1: {
                          status: "paused",
                          progress: 50,
                          filename: "video1",
                        },
                      },
                    },
                  })
                );
                cb({});
              } else if (msg.type === "resumeDownload") {
                // Simulate sending status update to downloading
                this.onMessage._listeners.forEach(fn =>
                  fn({
                    type: "downloadStatusUpdate",
                    data: {
                      active: {
                        video1: {
                          status: "downloading",
                          progress: 50,
                          filename: "video1",
                        },
                      },
                    },
                  })
                );
                cb({});
              }
            },
          },
          tabs: {
            query: () => Promise.resolve([{ id: 1, url: "https://example.com/video1" }]),
          },
          storage: {
            local: { get: (_keys, cb) => cb({ extensionConfig: {} }) },
          },
        };
        // Wire onMessage.addListener alias
        // No-op assignment for compatibility
        window.chrome.runtime.onMessage.addListener =
          window.chrome.runtime.onMessage.addListener.bind(window.chrome.runtime.onMessage);
      });
      // Navigate to popup
      const popupPath = `${UI_BASE}/popup.html`;
      await page.goto(popupPath);
      // Wait for Pause button to appear
      await page.waitForSelector(".pause-button");
      // Click Pause
      await page.click(".pause-button");
      // After pause, resume button should appear
      await page.waitForSelector(".resume-button");
      // Verify paused class applied
      const pausedClass = await page
        .$eval("li.active-item.status-paused", () => true)
        .catch(() => false);
      expect(pausedClass).toBe(true);
      // Click Resume
      await page.click(".resume-button");
      // After resume, Pause button should reappear
      await page.waitForSelector(".pause-button");
    }, 60000);
    it("T3: Cancel a queued download", async () => {
      // Stub chrome APIs for queued downloads and cancel flow
      await page.addInitScript(() => {
        window.chrome = {
          runtime: {
            lastError: undefined,
            _listeners: [],
            onMessage: {
              _listeners: [],
              addListener(fn) {
                this._listeners.push(fn);
              },
            },
            sendMessage(msg, cb) {
              if (msg.type === "getActiveDownloads") {
                // Initial state: one queued item
                cb({ active: {}, queue: ["video2"] });
              } else if (msg.type === "cancelDownload") {
                // Simulate removal of queued item
                this.onMessage._listeners.forEach(fn =>
                  fn({ type: "queueUpdated", active: {}, queue: [] })
                );
                cb({});
              }
            },
          },
          tabs: {
            query: () => Promise.resolve([{ id: 1, url: "https://example.com/video2" }]),
          },
          storage: {
            local: { get: (_keys, cb) => cb({ extensionConfig: {} }) },
          },
        };
        // Wire onMessage listener
        window.chrome.runtime.onMessage.addListener =
          window.chrome.runtime.onMessage.addListener.bind(window.chrome.runtime.onMessage);
      });
      const popupPath = `${UI_BASE}/popup.html`;
      await page.goto(popupPath);
      // Wait for queued item and cancel button
      await page.waitForSelector(".queued-item");
      await page.waitForSelector(".cancel-button");
      // Click Cancel
      await page.click(".cancel-button");
      // After cancel, no-downloads message should appear
      await page.waitForSelector(".no-downloads-message");
      const noDownloadsText = await page.$eval(".no-downloads-message", el => el.textContent);
      expect(noDownloadsText).toMatch(/No active or queued downloads\./);
    }, 60000);
    it("T4: View download history", async () => {
      // Stub chrome APIs for history
      await page.addInitScript(() => {
        window.chrome = {
          runtime: {
            lastError: undefined,
            onMessage: {
              _listeners: [],
              addListener(fn) {
                this._listeners.push(fn);
              },
            },
          },
          storage: {
            local: {
              get: (keys, cb) => {
                // Return two history entries
                cb({
                  downloadHistory: [
                    {
                      id: "1",
                      page_title: "Old Video",
                      timestamp: 1620000000000,
                      status: "completed",
                      url: "https://test/old",
                      filename: "old.mp4",
                    },
                    {
                      id: "2",
                      page_title: "New Video",
                      timestamp: 1620000100000,
                      status: "failed",
                      url: "https://test/new",
                      filename: "new.mp4",
                    },
                  ],
                });
              },
            },
          },
          tabs: {
            query: () => Promise.resolve([{ id: 1, url: "https://example.com" }]),
          },
        };
        // Ensure messaging for initial active downloads
        window.chrome.runtime.sendMessage = (msg, cb) => cb({ active: {}, queue: [] });
      });
      const popupPath = `${UI_BASE}/popup.html`;
      await page.goto(popupPath);
      // Wait for history items
      await page.waitForSelector("#download-history .history-item");
      const items = await page.$$("#download-history .history-item");
      expect(items.length).toBe(2);
      // Check the first (newest) item's title and status
      const firstTitle = await page.evaluate(el => el.querySelector("b").textContent, items[0]);
      expect(firstTitle).toBe("New Video");
      const statusText = await page.evaluate(
        el => el.querySelectorAll("b")[1].textContent,
        items[0]
      );
      expect(statusText).toBe("failed");
    }, 60000);
    it("T5: Change server port with invalid input", async () => {
      // Stub chrome APIs for options page initial settings
      await page.addInitScript(() => {
        window.chrome = {
          runtime: {
            lastError: undefined,
            sendMessage: (msg, cb) => {
              if (msg.type === "getAppStatus") {
                cb({
                  status: "success",
                  serverConfig: {
                    server_port: getServerPort(),
                    debug_mode: false,
                  },
                });
              } else {
                cb({});
              }
            },
            onMessage: { addListener: _fn => {} },
          },
          storage: {
            local: {
              get: (_keys, cb) =>
                cb({
                  serverPort: getServerPort(),
                  downloadDirectory: "/tmp",
                  debugMode: false,
                  enableHistory: true,
                  logLevel: "INFO",
                  ytdlpFormat: "bestvideo+bestaudio/best",
                  allowPlaylists: false,
                  logAutoRefresh: false,
                  logAutoScroll: false,
                  logLimit: "500",
                  logRecentFirst: false,
                }),
              set: (_items, cb) => cb && cb(),
            },
          },
          tabs: {
            query: () => Promise.resolve([{ id: 1, url: "https://example.com" }]),
          },
        };
      });
      const optionsPath = `${UI_BASE}/options.html`;
      await page.goto(optionsPath);
      // Wait for options UI to be fully initialized
      await page.waitForSelector("body[data-evd-ready]");
      await page.click("#settings-server-port", { clickCount: 3 });
      await page.type("#settings-server-port", getClientPort().toString());
      // Validate inline port error
      await page.waitForFunction(
        () => document.getElementById("settings-status").textContent.includes("Invalid Port"),
        { timeout: 60000 }
      );
    }, 60000);
    it("T6: Update download directory", async () => {
      // Stub chrome APIs for initial settings
      await page.addInitScript(() => {
        window.chrome = {
          storage: {
            local: {
              get: (_keys, cb) =>
                cb({
                  serverPort: getServerPort(),
                  downloadDirectory: "/tmp/old",
                  debugMode: false,
                  enableHistory: true,
                  logLevel: "INFO",
                  ytdlpFormat: "bestvideo+bestaudio/best",
                  allowPlaylists: false,
                  logRecentFirst: false,
                  logLimit: "500",
                }),
              set: (_items, cb) => cb && cb(),
            },
          },
          runtime: {
            lastError: undefined,
            sendMessage: (msg, cb) => {
              if (msg.type === "getAppStatus") {
                cb({
                  status: "success",
                  serverConfig: { server_port: getServerPort() },
                });
              } else if (msg.type === "saveSettings") {
                cb({ status: "success" });
              } else {
                cb({});
              }
            },
          },
          tabs: {
            query: () => Promise.resolve([{ id: 1, url: "https://example.com" }]),
          },
        };
      });
      const optionsPath = `${UI_BASE}/options.html`;
      await page.goto(optionsPath);
      await page.waitForSelector("#settings-download-dir");
      // Change download directory
      await page.click("#settings-download-dir", { clickCount: 3 });
      await page.type("#settings-download-dir", "/tmp/newdir");
      // Trigger live-save via input event and wait for save to complete
      await page.waitForFunction(
        () =>
          document
            .getElementById("settings-status")
            .textContent.includes("Settings saved successfully!"),
        { timeout: 30000 }
      );
      const statusText = await page.$eval("#settings-status", el => el.textContent);
      expect(statusText).toBe("Settings saved successfully!");
    }, 30000);
    it("T7: View and filter logs", async () => {
      // Stub chrome APIs and settings to enable logs section and stub fetch
      await page.addInitScript(() => {
        window.chrome = {
          runtime: {
            lastError: undefined,
            sendMessage: (msg, cb) => {
              if (msg.type === "getAppStatus") {
                cb({
                  status: "success",
                  serverConfig: {
                    server_port: getServerPort(),
                    debug_mode: true,
                  },
                });
              } else {
                cb({});
              }
            },
            onMessage: { addListener: _fn => {} },
          },
          storage: {
            local: {
              get: (_keys, cb) =>
                cb({
                  serverPort: getServerPort(),
                  downloadDirectory: "/tmp/dir",
                  debugMode: true,
                  enableHistory: true,
                  logLevel: "INFO",
                  ytdlpFormat: "bestvideo+bestaudio/best",
                  allowPlaylists: false,
                  logAutoRefresh: false,
                  logAutoScroll: false,
                  logLimit: "100",
                  logRecentFirst: false,
                }),
              set: (_items, cb) => cb && cb(),
            },
          },
          tabs: {
            query: () => Promise.resolve([{ id: 1, url: "https://example.com" }]),
          },
        };
        // Stub fetch to return logs directly
        window.fetch = () =>
          Promise.resolve({
            ok: true,
            text: () => Promise.resolve("INFO First line\nERROR Second line\n"),
          });
      });
      const optionsPath = `${UI_BASE}/options.html`;
      await page.goto(optionsPath);
      // Wait for options UI to be fully initialized
      await page.waitForSelector("body[data-evd-ready]");
      // Refresh logs
      await page.click("#log-refresh");
      await page.waitForSelector("#logViewerTextarea", { timeout: 60000 });
      await page.waitForFunction(
        () => document.querySelector("#logViewerTextarea").value.includes("First line"),
        { timeout: 60000 }
      );
      const logs = await page.$eval("#logViewerTextarea", el => el.value);
      expect(logs).toContain("ERROR Second line");
      // Clear logs and verify
      await page.click("#log-clear");
      await page.waitForFunction(() => document.querySelector("#logViewerTextarea").value === "", {
        timeout: 60000,
      });
      const statusText = await page.$eval("#log-display", el => el.textContent);
      expect(statusText).toBe("Logs cleared by user.");
    }, 60000);
    it("T8: Simulate network/server/download/permission errors", async () => {
      const popupPath = `${UI_BASE}/popup.html`;
      // Scenario 1: Network error on download request
      await page.addInitScript(() => {
        window.chrome = {
          runtime: {
            lastError: { message: "Network unreachable" },
            sendMessage: (msg, cb) => {
              if (msg.type === "getAppStatus") {
                cb({
                  status: "success",
                  serverConfig: {
                    server_port: getServerPort(),
                    debug_mode: false,
                  },
                });
              } else {
                if (cb) cb();
              }
            },
            onMessage: { addListener: _fn => {} },
          },
          tabs: {
            query: () => Promise.resolve([{ id: 1, url: "https://example.com" }]),
            sendMessage: (_tabId, _msg, cb) => cb({ hidden: false, disabled: false }),
          },
          storage: {
            local: { get: (_keys, cb) => cb({ extensionConfig: {} }) },
          },
        };
      });
      await page.goto(popupPath);
      await page.click("#enhanced-download-button");
      // Wait for network error message to appear
      await page.waitForFunction(() => {
        const el = document.getElementById("status");
        return el && el.textContent.includes("Network unreachable");
      });
      let text = await page.$eval("#status", el => el.textContent.trim());
      expect(text).toContain("Network unreachable");
      // Scenario 2: Server-side error response
      await page.evaluate(() => {
        window.chrome.runtime.lastError = undefined;
        window.chrome.runtime.sendMessage = (msg, cb) => {
          if (msg.type === "proxyDownload") {
            cb({ status: "error", message: "Server error occurred" });
          }
        };
      });
      await page.click("#enhanced-download-button");
      await page.waitForFunction(() => {
        const statusEl = document.getElementById("status");
        return statusEl && statusEl.textContent.includes("Server error occurred");
      });
      text = await page.$eval("#status", el => el.textContent);
      expect(text).toContain("Server error occurred");
    }, 60000);

    describe("Error Display Responsiveness", () => {
      const sizes = [
        { width: 320, height: 480 },
        { width: 1920, height: 1080 },
      ];
      for (const size of sizes) {
        it(`displays error correctly at ${size.width}x${size.height}`, async () => {
          const popupPath = `${UI_BASE}/popup.html`;
          await page.setViewportSize(size);
          // Stub network error
          await page.addInitScript(() => {
            window.chrome.runtime.lastError = {
              message: "Network unreachable",
            };
            window.chrome.runtime.sendMessage = (msg, cb) => {
              if (cb) cb();
            };
            window.chrome.tabs.query = () =>
              Promise.resolve([{ id: 1, url: "https://example.com" }]);
            window.chrome.storage.local.get = (_keys, cb) => cb({ extensionConfig: {} });
          });
          await page.goto(popupPath);
          await page.click("#enhanced-download-button");
          await page.waitForSelector("#status");
          const fits = await page.evaluate(() => {
            const el = document.getElementById("status");
            const rect = el.getBoundingClientRect();
            return rect.width <= window.innerWidth;
          });
          // On small screens, text may wrap; on large screens, it should fit
          if (size.width < 500) {
            expect(fits).toBe(false);
          } else {
            expect(fits).toBe(true);
          }
          // Reset viewport
          await page.setViewportSize({ width: 1280, height: 800 });
        });
      }
    });

    it("T9: Review Popup UI for clarity and workflow", async () => {
      const popupPath = `${UI_BASE}/popup.html`;
      // Stub chrome APIs for comprehensive popup testing
      await page.addInitScript(() => {
        window.chrome = {
          runtime: {
            lastError: undefined,
            sendMessage: (msg, cb) => {
              if (msg.type === "getAppStatus") {
                cb({
                  status: "success",
                  serverConfig: {
                    server_port: getServerPort(),
                    debug_mode: false,
                  },
                });
              } else if (msg.type === "getActiveDownloads") {
                // Return active download with error for testing error UI
                cb({
                  active: {
                    video1: {
                      status: "error",
                      progress: 0,
                      filename: "test-video.mp4",
                      errorInfo: {
                        type: "NetworkError",
                        message: "Connection failed",
                        original: "ERR_CONNECTION_REFUSED",
                      },
                    },
                  },
                  queue: ["video2", "video3"],
                });
              } else {
                cb({});
              }
            },
            onMessage: {
              _listeners: [],
              addListener(fn) {
                this._listeners.push(fn);
              },
            },
          },
          tabs: {
            query: () => Promise.resolve([{ id: 1, url: "https://example.com/video" }]),
          },
          storage: {
            local: {
              get: (_keys, cb) => cb({ extensionConfig: {} }),
              set: (_items, cb) => cb && cb(),
            },
          },
        };
      });
      await page.goto(popupPath);

      // 1. Verify labels on download, pause, resume, and cancel controls
      await page.waitForSelector("#enhanced-download-button");
      const downloadBtn = await page.$("#enhanced-download-button");
      expect(downloadBtn).not.toBeNull();

      // Check for active download controls
      await page.waitForSelector(".active-item");
      const pauseBtn = await page.$(".pause-button");
      const resumeBtn = await page.$(".resume-button");
      const cancelBtn = await page.$(".cancel-button");

      // Verify control labels are intuitive
      if (pauseBtn) {
        const pauseText = await page.evaluate(el => el.textContent, pauseBtn);
        expect(pauseText.toLowerCase()).toContain("pause");
      }
      if (resumeBtn) {
        const resumeText = await page.evaluate(el => el.textContent, resumeBtn);
        expect(resumeText.toLowerCase()).toContain("resume");
      }
      if (cancelBtn) {
        const cancelText = await page.evaluate(el => el.textContent, cancelBtn);
        expect(cancelText.toLowerCase()).toContain("cancel");
      }

      // 2. Test drag-and-drop queue reordering
      const queuedItems = await page.$$(".queued-item");
      if (queuedItems.length > 1) {
        // Verify drag handles are present
        const dragHandles = await page.$$(".drag-handle");
        expect(dragHandles.length).toBeGreaterThan(0);

        // Test that drag handles are visually distinct
        const firstHandle = dragHandles[0];
        const cursor = await page.evaluate(el => getComputedStyle(el).cursor, firstHandle);
        expect(cursor).toBe("grab");
      }

      // 3. Click error details and Help link
      const errorItem = await page.$(".severity-error");
      if (errorItem) {
        // Click on error details to expand
        const detailsToggle = await page.$(".error-details summary");
        if (detailsToggle) {
          await detailsToggle.click();
          await page.waitForSelector(".error-details[open]");

          // Verify error details are displayed
          const errorContent = await page.$(".error-details-content");
          expect(errorContent).not.toBeNull();

          // Test Help link functionality
          const helpLink = await page.$(".error-help-link");
          if (helpLink) {
            const helpText = await page.evaluate(el => el.textContent, helpLink);
            expect(helpText.toLowerCase()).toContain("help");

            // Verify help link opens options page (stub the openOptionsPage call)
            await page.evaluate(() => {
              window.chrome.runtime.openOptionsPage = () => {
                window._optionsPageOpened = true;
              };
            });
            await helpLink.click();
            const optionsOpened = await page.evaluate(() => window._optionsPageOpened);
            expect(optionsOpened).toBe(true);
          }
        }
      }

      // 4. Verify all UI elements are intuitive
      const mainControls = await page.$$(".main-controls button");
      expect(mainControls.length).toBeGreaterThan(0);

      // Check that status messages are clear
      const statusEl = await page.$("#status");
      if (statusEl) {
        const statusText = await page.evaluate(el => el.textContent, statusEl);
        expect(statusText.length).toBeGreaterThan(0);
      }

      // Verify history section is accessible
      const historySection = await page.$("#history-section");
      expect(historySection).not.toBeNull();

      const historyHeading = await page.$("#history-heading");
      if (historyHeading) {
        const headingText = await page.evaluate(el => el.textContent, historyHeading);
        expect(headingText.toLowerCase()).toContain("history");
      }
    }, 60000);

    it("T10: Review Options UI for clarity and workflow", async () => {
      const optionsPath = `${UI_BASE}/options.html`;
      // Stub chrome APIs for comprehensive options testing
      await page.addInitScript(() => {
        window.chrome = {
          runtime: {
            lastError: undefined,
            sendMessage: (msg, cb) => {
              if (msg.type === "getAppStatus") {
                cb({
                  status: "success",
                  serverConfig: {
                    server_port: getServerPort(),
                    debug_mode: true,
                  },
                });
              } else if (msg.type === "saveSettings") {
                cb({ status: "success" });
              } else {
                cb({});
              }
            },
            onMessage: { addListener: _fn => {} },
          },
          storage: {
            local: {
              get: (_keys, cb) =>
                cb({
                  serverPort: getServerPort(),
                  downloadDirectory: "/tmp/downloads",
                  debugMode: true,
                  enableHistory: true,
                  logLevel: "INFO",
                  ytdlpFormat: "bestvideo+bestaudio/best",
                  allowPlaylists: false,
                  logAutoRefresh: false,
                  logAutoScroll: false,
                  logLimit: "500",
                  logRecentFirst: false,
                  errorHistory: [
                    {
                      timestamp: Date.now() - 3600000,
                      error: "Network error",
                      url: "https://example.com/video1",
                      filename: "video1.mp4",
                    },
                    {
                      timestamp: Date.now() - 7200000,
                      error: "Server error",
                      url: "https://example.com/video2",
                      filename: "video2.mp4",
                    },
                  ],
                }),
              set: (_items, cb) => cb && cb(),
            },
          },
          tabs: {
            query: () => Promise.resolve([{ id: 1, url: "https://example.com" }]),
          },
        };
        // Stub fetch for logs
        window.fetch = () =>
          Promise.resolve({
            ok: true,
            text: () => Promise.resolve("INFO Test log line 1\nERROR Test log line 2\n"),
          });
      });
      await page.goto(optionsPath);

      // Wait for options UI to be fully initialized
      await page.waitForSelector("body[data-evd-ready]");

      // 1. Navigate tabs (General, Logs, Error History)
      const generalTab = await page.$('button[data-tab="general"]');
      const logsTab = await page.$('button[data-tab="logs"]');
      const errorHistoryTab = await page.$('button[data-tab="error-history"]');

      expect(generalTab).not.toBeNull();
      expect(logsTab).not.toBeNull();
      expect(errorHistoryTab).not.toBeNull();

      // Test tab navigation
      await logsTab.click();
      await page.waitForSelector("#logs-section:not([style*='display: none'])");

      await errorHistoryTab.click();
      await page.waitForSelector("#error-history-section:not([style*='display: none'])");

      await generalTab.click();
      await page.waitForSelector("#general-section:not([style*='display: none'])");

      // 2. Modify settings and test inline validation
      const portInput = await page.$("#settings-server-port");
      expect(portInput).not.toBeNull();

      // Test invalid port validation
      await portInput.click({ clickCount: 3 });
      await portInput.type(getClientPort().toString()); // Invalid port
      await page.waitForFunction(
        () => document.getElementById("settings-status").textContent.includes("Invalid Port"),
        { timeout: 30000 }
      );

      // Test valid port
      await portInput.click({ clickCount: 3 });
      await portInput.type(getServerPort().toString());
      await page.waitForFunction(
        () =>
          document
            .getElementById("settings-status")
            .textContent.includes("Settings saved successfully!"),
        { timeout: 30000 }
      );

      // 3. Refresh and clear logs
      await logsTab.click();
      await page.waitForSelector("#logs-section:not([style*='display: none'])");

      const refreshBtn = await page.$("#log-refresh");
      const clearBtn = await page.$("#log-clear");

      expect(refreshBtn).not.toBeNull();
      expect(clearBtn).not.toBeNull();

      // Test refresh functionality
      await refreshBtn.click();
      await page.waitForSelector("#logViewerTextarea");
      await page.waitForFunction(
        () => document.querySelector("#logViewerTextarea").value.includes("Test log line"),
        { timeout: 30000 }
      );

      // Test clear functionality
      await clearBtn.click();
      await page.waitForFunction(() => document.querySelector("#logViewerTextarea").value === "", {
        timeout: 30000,
      });

      // 4. Inspect Error History list
      await errorHistoryTab.click();
      await page.waitForSelector("#error-history-section:not([style*='display: none'])");

      const errorHistoryItems = await page.$$(".error-history-item");
      expect(errorHistoryItems.length).toBeGreaterThan(0);

      // Verify error history entries display correctly
      if (errorHistoryItems.length > 0) {
        const firstItem = errorHistoryItems[0];
        const errorText = await page.evaluate(el => el.textContent, firstItem);
        expect(errorText).toContain("Network error");
        expect(errorText).toContain("video1.mp4");
      }

      // 5. Test theme toggle functionality
      const themeToggle = await page.$("#theme-toggle");
      expect(themeToggle).not.toBeNull();

      const initialTheme = await page.evaluate(() =>
        document.body.classList.contains("dark-theme")
      );

      await themeToggle.click();
      await page.waitForTimeout(100); // Wait for theme change

      const newTheme = await page.evaluate(() => document.body.classList.contains("dark-theme"));
      expect(newTheme).toBe(!initialTheme);

      // 6. Verify all controls are clear and consistent
      const allInputs = await page.$$("input, select, textarea");
      expect(allInputs.length).toBeGreaterThan(0);

      // Check that form labels are present and clear
      const labels = await page.$$("label");
      expect(labels.length).toBeGreaterThan(0);

      // Verify save status feedback
      const statusEl = await page.$("#settings-status");
      if (statusEl) {
        const statusText = await page.evaluate(el => el.textContent, statusEl);
        expect(statusText.length).toBeGreaterThan(0);
      }

      // Test pagination if implemented
      const paginationControls = await page.$$(".pagination-controls");
      if (paginationControls.length > 0) {
        const prevBtn = await page.$(".pagination-prev");
        const nextBtn = await page.$(".pagination-next");

        if (prevBtn) {
          const prevDisabled = await page.evaluate(el => el.disabled, prevBtn);
          expect(typeof prevDisabled).toBe("boolean");
        }

        if (nextBtn) {
          const nextDisabled = await page.evaluate(el => el.disabled, nextBtn);
          expect(typeof nextDisabled).toBe("boolean");
        }
      }
    }, 60000);
  });
  // Add content script tests
  describe("Content Script", () => {
    it("injects download button on pages with video element", async () => {
      // Stub basic chrome API for content script
      await page.addInitScript(() => {
        window.chrome = {
          storage: {
            local: {
              get: (_keys, cb) => cb({}),
              set: (_items, cb) => cb && cb(),
            },
          },
          runtime: {
            sendMessage: (_msg, cb) => cb && cb(),
            lastError: undefined,
            onMessage: { addListener: () => {} },
          },
          tabs: {
            query: () => Promise.resolve([]),
            sendMessage: (_tabId, _msg, cb) => cb && cb(),
          },
        };
      });
      // Determine script base URL and navigate to test video page
      const scriptBase = UI_BASE.replace("/ui", "");
      await page.goto(`${scriptBase}/test-video.html`);
      // Inject compiled content scripts from dist
      await page.addScriptTag({
        url: `${scriptBase}/dist/youtube_enhance.js`,
        type: "module",
      });
      await page.addScriptTag({
        url: `${scriptBase}/dist/content.js`,
        type: "module",
      });
      // Manually initialize content script
      await page.evaluate(() => {
        if (typeof window.init === "function") {
          window.init();
        }
      });
      // Wait for download button to be injected
      await page.waitForSelector('button[id^="evd-download-button-"]');
      const btn = await page.$('button[id^="evd-download-button-"]');
      expect(btn).not.toBeNull();
    }, 30000);
  });
});
