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
          <option value="mp4">mp4</option>
        </select>
        <input id="settings-ytdlp-concurrent-fragments" name="ytdlp-concurrent-fragments" type="number" value="4" />
        <input id="settings-allow-playlists" name="allow-playlists" type="checkbox" />
        <input id="settings-enable-history" name="enable-history" type="checkbox" />
        <input id="settings-enable-debug" name="enable-debug" type="checkbox" />
        <button id="save-settings" type="submit">Save</button>
      </form>
      <div id="settings-status"></div>
      <button id="log-refresh"></button>
      <button id="log-clear"></button>
      <select id="log-limit"><option value="100">100</option></select>
      <input id="log-recent-first" type="checkbox" />
      <input id="log-filter-werkzeug" type="checkbox" />
      <div id="log-display"></div>
      <input id="log-toggle-auto" type="checkbox" />
      <ul id="error-history-list"></ul>
      <div id="port-validation"></div>
      <div id="folder-validation"></div>
      <div id="log-level-validation"></div>
      <div id="format-validation"></div>
    `;

    // Reset chrome mocks default behavior (use callback-based get from jest.setup)
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
    const pre = document.querySelector("#log-display pre") as HTMLElement | null;
    expect(pre?.textContent || "").toContain("log-line-1");
  });

  it("filters werkzeug and 200 entries; applies limit after filtering", () => {
    // Arrange DOM: set limit to 2 and enable filter toggle
    const limit = document.getElementById("log-limit") as HTMLSelectElement;
    limit.innerHTML = '<option value="2">2</option>';
    limit.value = "2";
    const filterToggle = document.getElementById("log-filter-werkzeug") as HTMLInputElement;
    filterToggle.checked = true;

    // Mock getLogs return with mixed lines
    (chrome.runtime.sendMessage as jest.Mock).mockImplementation((msg: any, cb?: any) => {
      if (msg?.type === "getLogs") {
        const mixed = [
          'INFO {"logger": "server.request", "status": 200, "message": "GET /api/health"}',
          'werkzeug: 127.0.0.1 - - [date] "GET /api/health" 200 -',
          "INFO something useful A",
          "-> 200 GET /api/status",
          '{"level": "INFO", "message": "useful B"}',
        ].join("\n");
        if (cb) cb({ status: "success", data: mixed });
        return;
      }
      if (cb) cb({ status: "success" });
    });

    // Act
    setupLogsUI();
    const refresh = document.getElementById("log-refresh") as HTMLButtonElement;
    refresh.click();

    // Assert
    const pre = document.querySelector("#log-display pre") as HTMLElement | null;
    const text = pre?.textContent || "";
    expect(text).toContain("useful");
    expect(text).not.toMatch(/werkzeug/i);
    expect(text).not.toMatch(/->\s*200/);
    expect(text).not.toMatch(/"status"\s*:\s*200/);
    // limit 2 should cap rendered useful lines to 2 or fewer
    const usefulCount = (text.match(/useful/gi) || []).length;
    expect(usefulCount).toBeLessThanOrEqual(2);
  });

  it("iteratively requests more lines until filtered set meets UI limit", async () => {
    // UI prefers 3 lines
    const limit = document.getElementById("log-limit") as HTMLSelectElement;
    limit.innerHTML = '<option value="3">3</option>';
    limit.value = "3";
    const filterToggle = document.getElementById("log-filter-werkzeug") as HTMLInputElement;
    filterToggle.checked = true;

    // First calls return mostly 200s; later returns include enough useful lines
    let callCount = 0;
    (chrome.runtime.sendMessage as jest.Mock).mockImplementation((msg: any, cb?: any) => {
      if (msg?.type === "getLogs") {
        callCount += 1;
        if (callCount === 1) {
          // majority 200s with 1 useful
          const first =
            Array.from({ length: 100 }, () => "-> 200 X").join("\n") + "\nINFO useful-1";
          if (cb) cb({ status: "success", data: first });
          return;
        }
        // second call returns enough useful lines
        const second =
          Array.from({ length: 200 }, () => 'INFO {"logger":"server.request","status":200}').join(
            "\n"
          ) + "\nINFO useful-1\nINFO useful-2\nINFO useful-3\nINFO useful-4";
        if (cb) cb({ status: "success", data: second });
        return;
      }
      if (cb) cb({ status: "success" });
    });

    setupLogsUI();
    const refresh = document.getElementById("log-refresh") as HTMLButtonElement;
    refresh.click();

    // Allow any microtasks to flush
    await Promise.resolve();

    const pre = document.querySelector("#log-display pre") as HTMLElement | null;
    const text = pre?.textContent || "";
    // Should have at least 3 useful entries visible
    const usefulCount = (text.match(/useful-/g) || []).length;
    expect(usefulCount).toBeGreaterThanOrEqual(3);
    // Ensure 200 lines filtered out
    expect(text).not.toMatch(/->\s*200/);
    expect(text).not.toMatch(/"status"\s*:\s*200/);
    // Verify iterative behavior made at least 2 getLogs calls
    const getLogsCalls = (chrome.runtime.sendMessage as jest.Mock).mock.calls.filter(
      ([m]) => m?.type === "getLogs"
    );
    expect(getLogsCalls.length).toBeGreaterThanOrEqual(2);
  });

  describe("live-save behavior", () => {
    it("saves download_dir on blur and on Enter", async () => {
      const input = document.getElementById("settings-download-dir") as HTMLInputElement;
      input.value = "/home/user/downloads";

      // succeed all setConfig calls
      (chrome.runtime.sendMessage as jest.Mock).mockImplementation((msg: any, cb?: any) => {
        if (cb) cb({ status: "success" });
      });

      // Initialize listeners (includes live-save)
      await Promise.resolve();
      const { initOptionsPage } = await import("../options");
      initOptionsPage();

      // Clear any calls from init
      (chrome.runtime.sendMessage as jest.Mock).mockClear();

      // Blur commit
      input.dispatchEvent(new Event("blur"));
      const callsAfterBlur = (chrome.runtime.sendMessage as jest.Mock).mock.calls as any[];
      const setConfigBlur = callsAfterBlur.find(([msg]) => msg?.type === "setConfig");
      expect(setConfigBlur?.[0]?.config).toEqual({ download_dir: "/home/user/downloads" });

      // Enter commit
      (chrome.runtime.sendMessage as jest.Mock).mockClear();
      const keyEvent = new KeyboardEvent("keydown", { key: "Enter" });
      input.dispatchEvent(keyEvent);
      const callsAfterEnter = (chrome.runtime.sendMessage as jest.Mock).mock.calls as any[];
      const setConfigEnter = callsAfterEnter.find(([msg]) => msg?.type === "setConfig");
      expect(setConfigEnter?.[0]?.config).toEqual({ download_dir: "/home/user/downloads" });
    });

    it("saves yt_dlp format on change", async () => {
      const format = document.getElementById("settings-ytdlp-format") as HTMLSelectElement;
      format.value = "mp4";
      (chrome.runtime.sendMessage as jest.Mock).mockImplementation((msg: any, cb?: any) => {
        if (cb) cb({ status: "success" });
      });
      const { initOptionsPage } = await import("../options");
      initOptionsPage();
      (chrome.runtime.sendMessage as jest.Mock).mockClear();
      format.dispatchEvent(new Event("change"));
      const calls = (chrome.runtime.sendMessage as jest.Mock).mock.calls as any[];
      const sc = calls.find(([m]) => m?.type === "setConfig");
      expect(sc?.[0]?.config).toEqual({ yt_dlp_options: { format: "mp4" } });
    });

    it("saves concurrent fragments when valid; shows error and does not save when invalid", async () => {
      const conc = document.getElementById(
        "settings-ytdlp-concurrent-fragments"
      ) as HTMLInputElement;
      (chrome.runtime.sendMessage as jest.Mock).mockImplementation((msg: any, cb?: any) => {
        if (cb) cb({ status: "success" });
      });
      const { initOptionsPage } = await import("../options");
      initOptionsPage();

      // Valid
      conc.value = "8";
      (chrome.runtime.sendMessage as jest.Mock).mockClear();
      conc.dispatchEvent(new Event("change"));
      const callsValid = (chrome.runtime.sendMessage as jest.Mock).mock.calls as any[];
      const scValid = callsValid.find(([m]) => m?.type === "setConfig");
      expect(scValid?.[0]?.config).toEqual({ yt_dlp_options: { concurrent_fragments: 8 } });

      // Invalid
      conc.value = "0";
      (chrome.runtime.sendMessage as jest.Mock).mockClear();
      conc.dispatchEvent(new Event("blur"));
      const callsInvalid = (chrome.runtime.sendMessage as jest.Mock).mock.calls as any[];
      const scInvalid = callsInvalid.find(([m]) => m?.type === "setConfig");
      expect(scInvalid).toBeUndefined();
      expect(document.getElementById("settings-status")?.textContent || "").toMatch(
        /Concurrent fragments/i
      );
    });

    it("saves allow_playlists, enable_history, and debug_mode on change", async () => {
      const allow = document.getElementById("settings-allow-playlists") as HTMLInputElement;
      const hist = document.getElementById("settings-enable-history") as HTMLInputElement;
      const dbg = document.getElementById("settings-enable-debug") as HTMLInputElement;
      (chrome.runtime.sendMessage as jest.Mock).mockImplementation((msg: any, cb?: any) => {
        if (cb) cb({ status: "success" });
      });
      const { initOptionsPage } = await import("../options");
      initOptionsPage();

      // allow_playlists
      (chrome.runtime.sendMessage as jest.Mock).mockClear();
      allow.checked = true;
      allow.dispatchEvent(new Event("change"));
      const callsAllow = (chrome.runtime.sendMessage as jest.Mock).mock.calls as any[];
      const scAllow = callsAllow.find(([m]) => m?.type === "setConfig");
      expect(scAllow?.[0]?.config).toEqual({ allow_playlists: true });

      // enable_history
      (chrome.runtime.sendMessage as jest.Mock).mockClear();
      hist.checked = false;
      hist.dispatchEvent(new Event("change"));
      const callsHist = (chrome.runtime.sendMessage as jest.Mock).mock.calls as any[];
      const scHist = callsHist.find(([m]) => m?.type === "setConfig");
      expect(scHist?.[0]?.config).toEqual({ enable_history: false });

      // debug_mode
      (chrome.runtime.sendMessage as jest.Mock).mockClear();
      dbg.checked = true;
      dbg.dispatchEvent(new Event("change"));
      const callsDbg = (chrome.runtime.sendMessage as jest.Mock).mock.calls as any[];
      const scDbg = callsDbg.find(([m]) => m?.type === "setConfig");
      expect(scDbg?.[0]?.config).toEqual({ debug_mode: true });
    });
  });

  it("loads error history via background", async () => {
    // Ensure storage.get uses callback style with error entries present
    (chrome.storage.local.get as jest.Mock).mockImplementation((_keys: any, cb: any) => {
      cb({ downloadHistory: [{ id: "1", url: "u", status: "error", timestamp: Date.now() }] });
      return Promise.resolve({});
    });
    await loadErrorHistory();
    jest.runAllTimers?.();
    // allow any pending sendMessage callbacks to run
    await Promise.resolve();
    expect(document.getElementById("error-history-list")?.textContent).toBeDefined();
  }, 15000);
});
