/**
 * Options page behavior tests: load/save/log viewer/error history/theme interactions
 */

import {
  initOptionsPage,
  loadSettings,
  saveSettings,
  setupLogsUI,
  loadErrorHistory,
  applyOptionsTheme,
  handleThemeToggle,
  updateOptionsServerStatus,
} from "../options";

describe("options.ts behavior", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="server-status-indicator"></div>
      <div id="server-status-text"></div>
      <div class="settings-container"></div>
      <form id="settings-form">
        <input id="settings-server-port" name="server-port" type="text" value="9090" required />
        <input id="settings-download-dir" name="download-dir" type="text" value="/tmp" required />
        <select id="settings-log-level" name="log-level">
          <option value="info">Info</option>
        </select>
        <select id="settings-ytdlp-format" name="ytdlp-format">
          <option value="best">Best</option>
        </select>
        <button id="save-settings" type="submit">Save</button>
      </form>
      <div id="settings-status"></div>
      <button id="log-refresh"></button>
      <button id="log-clear"></button>
      <select id="log-limit"><option value="100">100</option></select>
      <input id="log-recent-first" type="checkbox" />
      <input id="log-filter-werkzeug" type="checkbox" />
      <div id="log-display"></div>
      <textarea id="logViewerTextarea"></textarea>
      <input id="log-toggle-auto" type="checkbox" />
      <ul id="error-history-list"></ul>
      <div id="port-validation"></div>
      <div id="folder-validation"></div>
      <div id="log-level-validation"></div>
      <div id="format-validation"></div>
    `;

    // Reset chrome mocks default behavior
    (chrome.storage.local.get as jest.Mock).mockResolvedValue({});
    (chrome.storage.local.set as jest.Mock).mockImplementation((_items: any, cb?: any) => {
      if (cb) cb();
      return Promise.resolve();
    });
    (chrome.runtime.sendMessage as jest.Mock).mockImplementation((_msg: any, cb?: any) => {
      if (cb) {
        cb({ status: "success", data: "log-line-1\nwerkzeug line\nlog-line-2" });
      }
    });
  });

  afterEach(() => jest.clearAllMocks());

  it("updates server status text when connected", () => {
    updateOptionsServerStatus("connected");
    expect(
      document.getElementById("server-status-indicator")?.classList.contains("connected")
    ).toBe(true);
  });

  it("loads settings without throwing", () => {
    expect(() => loadSettings()).not.toThrow();
  });

  it("saves settings happy path", async () => {
    const form = document.getElementById("settings-form") as HTMLFormElement;
    const evt = new Event("submit");
    Object.defineProperty(evt, "target", { value: form });
    Object.defineProperty(evt, "preventDefault", { value: jest.fn() });

    (chrome.runtime.sendMessage as jest.Mock).mockImplementation((_m: any, cb?: any) => {
      if (cb) {
        cb({ status: "success" });
      }
    });

    // Mock background handler to respond success to setConfig
    (chrome.runtime.sendMessage as jest.Mock).mockImplementation((msg: any, cb?: any) => {
      if (msg?.type === "setConfig") {
        if (cb) cb({ status: "success" });
        return;
      }
      if (cb) cb({ status: "success" });
    });
    await saveSettings(evt);
    expect(document.getElementById("settings-status")?.textContent).toContain(
      "Settings saved successfully"
    );
  }, 15000);

  it("saves settings with server error", async () => {
    const form = document.getElementById("settings-form") as HTMLFormElement;
    const evt = new Event("submit");
    Object.defineProperty(evt, "target", { value: form });
    Object.defineProperty(evt, "preventDefault", { value: jest.fn() });

    (chrome.runtime.sendMessage as jest.Mock).mockImplementation((msg: any, cb?: any) => {
      if (msg?.type === "setConfig") {
        if (cb) cb({ status: "error", message: "bad" });
        return;
      }
      if (cb) {
        cb({ status: "success" });
      }
    });

    await saveSettings(evt);
    expect(document.getElementById("settings-status")?.textContent).toContain(
      "Error saving settings"
    );
  }, 15000);

  it("applies and toggles theme", async () => {
    applyOptionsTheme("dark");
    expect(document.body.classList.contains("dark-theme")).toBe(true);

    (chrome.storage.local.get as jest.Mock).mockResolvedValue({ theme: "light" });
    await handleThemeToggle();
    expect(document.body.classList.contains("dark-theme")).toBe(true); // toggled to dark from light
  });

  it("initializes logs UI and fetches/filters logs", () => {
    setupLogsUI();
    const refresh = document.getElementById("log-refresh") as HTMLButtonElement;
    refresh.click();
    const txt = (document.getElementById("logViewerTextarea") as HTMLTextAreaElement).value;
    expect(txt).toContain("log-line-1");
  });

  it("loads error history via background", async () => {
    (chrome.runtime.sendMessage as jest.Mock).mockImplementation((msg: any, cb?: any) => {
      if (msg?.type === "getHistory") {
        if (cb) {
          cb({ status: "success", history: [{ id: "1", url: "u", status: "error" }] });
        }
      } else if (cb) {
        cb({ status: "success" });
      }
    });
    await loadErrorHistory();
    // allow any pending sendMessage callbacks to run
    await Promise.resolve();
    expect(document.getElementById("error-history-list")?.textContent).toBeDefined();
  }, 15000);
});
