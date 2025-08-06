/**
 * Tests for advanced popup UI functionality.
 *
 * Covers: configuration loading, display updates, error handling,
 * list item creation, and user interaction elements.
 *
 * Tests both successful and error scenarios for popup UI components.
 */

/* eslint-env jest */

import * as popup from "extension/src/popup";

describe("loadConfig", () => {
  beforeEach(() => {
    global.chrome = {
      runtime: {
        lastError: undefined,
        sendMessage: jest.fn((msg, cb) => cb({ serverConfig: { test: true } })),
      },
      storage: { local: { get: jest.fn() } },
    };
  });

  it("resolves serverConfig on success", async () => {
    const cfg = await popup.loadConfig();
    expect(cfg).toEqual({ test: true });
  });

  it("falls back to storage when runtime.lastError set", async () => {
    global.chrome.runtime.lastError = { message: "err" };
    global.chrome.storage.local.get = jest.fn((keys, cb) =>
      cb({ extensionConfig: { foo: "bar" } })
    );
    const cfg = await popup.loadConfig();
    expect(cfg).toEqual({ foo: "bar" });
  });
});

describe("updateDownloadDirDisplay", () => {
  it("no-op when element missing", async () => {
    document.body.innerHTML = "";
    await expect(popup.updateDownloadDirDisplay()).resolves.toBeUndefined();
  });

  it("updates text when element present", async () => {
    document.body.innerHTML = '<div id="download-dir-display"></div>';
    // Stub chrome to force storage fallback with download_dir
    global.chrome = {
      runtime: { lastError: true, sendMessage: jest.fn((msg, cb) => cb({})) },
      storage: {
        local: {
          get: jest.fn((keys, cb) =>
            cb({ extensionConfig: { download_dir: "/tmp" } })
          ),
        },
      },
    };
    await popup.updateDownloadDirDisplay();
    expect(document.getElementById("download-dir-display").textContent).toBe(
      "Saving to: /tmp"
    );
  });
});

describe("updatePortDisplay", () => {
  it("no-op when element missing", () => {
    document.body.innerHTML = "";
    expect(() => popup.updatePortDisplay()).not.toThrow();
  });

  it("updates text on presence", async () => {
    document.body.innerHTML = '<div id="server-port-display"></div>';
    // Stub chrome to return serverConfig via runtime
    global.chrome = {
      runtime: {
        lastError: false,
        sendMessage: jest.fn((msg, cb) =>
          cb({ serverConfig: { server_port: 1234 }, status: "success" })
        ),
      },
      storage: { local: { get: jest.fn() } },
    };
    await popup.updatePortDisplay();
    expect(document.getElementById("server-port-display").textContent).toBe(
      "Server Port: 1234"
    );
  });
});

describe("showConfigErrorIfPresent", () => {
  it("no-op when element missing", () => {
    document.body.innerHTML = "";
    expect(() => popup.showConfigErrorIfPresent()).not.toThrow();
  });

  it("displays error when configError set", () => {
    document.body.innerHTML = '<div id="config-error-display"></div>';
    global.chrome = {
      storage: {
        local: { get: jest.fn((key, cb) => cb({ configError: "oops" })) },
      },
    };
    popup.showConfigErrorIfPresent();
    const el = document.getElementById("config-error-display");
    expect(el.textContent).toBe("Configuration Error: oops");
    expect(el.style.display).toBe("block");
  });
});

describe("createErrorListItem", () => {
  /**
   * Tests the creation of error list items with detailed error information.
   * Verifies DOM structure, error details display, and help link functionality.
   */
  it("builds list item with semantic details element and help link", () => {
    // Stub openOptionsPage for help link
    global.chrome = { runtime: { openOptionsPage: jest.fn() } };
    const info = {
      filename: "file.mp4",
      errorInfo: { type: "TypeX", message: "msg", original: "orig" },
    };
    const li = popup.createErrorListItem("id1", info);
    // Data attribute and title
    expect(li.dataset.downloadId).toBe("id1");
    expect(li.querySelector(".item-title").textContent).toContain("file.mp4");
    // Details element should be present
    const detailsEl = li.querySelector("details.error-details");
    expect(detailsEl).not.toBeNull();
    const summary = detailsEl.querySelector("summary");
    expect(summary.textContent).toBe("Details");
    // Initially collapsed (no open attribute)
    expect(detailsEl.hasAttribute("open")).toBe(false);
    // Clicking summary toggles open attribute
    summary.click();
    expect(detailsEl.hasAttribute("open")).toBe(true);
    // Content should contain error info
    const content = detailsEl.querySelector(".error-details-content");
    expect(content.textContent).toContain("TypeX: msg (orig)");
    // Contextual help link should be present and callable
    const helpBtn = detailsEl.querySelector("button.error-help-link");
    expect(helpBtn).not.toBeNull();
    helpBtn.click();
    expect(global.chrome.runtime.openOptionsPage).toHaveBeenCalled();
  });
});

describe("createGenericListItem", () => {
  it("renders paused status with resume button", () => {
    const li = popup.createGenericListItem("id2", { status: "paused" });
    expect(li.classList.contains("status-paused")).toBe(true);
    const btn = li.querySelector("button.resume-button");
    expect(btn).not.toBeNull();
  });
});

describe("createQueuedListItem", () => {
  it("renders cancel button and sends message", () => {
    global.chrome = { runtime: { sendMessage: jest.fn() } };
    const item = { id: "id3", filename: "f.mp4" };
    const li = popup.createQueuedListItem(item);
    const btn = li.querySelector("button.cancel-button");
    btn.click();
    expect(global.chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: "cancelDownload", downloadId: "id3" },
      expect.any(Function)
    );
  });
});
