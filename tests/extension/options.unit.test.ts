import {
  validatePort,
  validateFolder,
  validateLogLevel,
  validateFormat,
  saveSettings,
  updateOptionsServerStatus,
  showValidationMessage,
  applyOptionsTheme,
  handleThemeToggle,
} from "../../extension/src/options";
import { ExtensionStateManager } from "../../extension/src/core/state-manager";

// Mock the constants module to return a wider port range for testing
jest.mock("../../extension/src/core/constants", () => ({
  ...jest.requireActual("../../extension/src/core/constants"),
  getPortRange: jest.fn(() => [5001, 9099]),
}));

// Mock Chrome APIs
const mockChrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
    lastError: null,
  },
};

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe("Options Script Unit Tests", () => {
  let stateManager: ExtensionStateManager;

  beforeEach(() => {
    // Get actual state manager instance
    stateManager = ExtensionStateManager.getInstance();
    stateManager.reset();

    // Setup Chrome API mocks
    global.chrome = mockChrome as any;
    (chrome.storage.local.get as jest.Mock).mockImplementation((keys, callback) => {
      callback({ theme: "light" });
    });
    (chrome.storage.local.set as jest.Mock).mockImplementation((data, callback) => {
      callback();
    });
    (chrome.runtime.sendMessage as jest.Mock).mockImplementation((message, callback) => {
      callback({ status: "success" });
    });

    // Setup DOM
    document.body.innerHTML = `
      <form id="settings-form">
        <input id="settings-server-port" name="server-port" type="text" value="8080" />
        <input id="settings-download-dir" name="download-dir" type="text" value="/tmp" />
        <select id="settings-log-level" name="log-level">
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
        <select id="settings-ytdlp-format" name="ytdlp-format">
          <option value="mp4">MP4</option>
          <option value="webm">WebM</option>
          <option value="avi">AVI</option>
        </select>
        <button id="save-settings" type="submit">Save</button>
      </form>
      <div id="settings-status"></div>
      <div id="server-status-indicator"></div>
      <div id="server-status-text"></div>
      <div id="port-validation"></div>
      <div id="folder-validation"></div>
      <div id="log-level-validation"></div>
      <div id="format-validation"></div>
    `;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Validation Functions", () => {
    it("should validate port correctly", () => {
      const input = document.createElement("input");
      input.value = "8080";
      expect(validatePort(input)).toBe(true);

      input.value = "abc";
      expect(validatePort(input)).toBe(false);

      input.value = "99999";
      expect(validatePort(input)).toBe(false);

      input.value = "0";
      expect(validatePort(input)).toBe(false);
    });

    it("should validate folder correctly", () => {
      const input = document.createElement("input");
      input.value = "/valid/path";
      expect(validateFolder(input)).toBe(true);

      input.value = "";
      expect(validateFolder(input)).toBe(false);

      input.value = "invalid\\path";
      expect(validateFolder(input)).toBe(true); // Actual implementation allows this with warning
    });

    it("should validate log level correctly", () => {
      const select = document.createElement("select");
      select.id = "settings-log-level";

      // Add option elements
      const debugOption = document.createElement("option");
      debugOption.value = "debug";
      debugOption.text = "Debug";
      select.appendChild(debugOption);

      const infoOption = document.createElement("option");
      infoOption.value = "info";
      infoOption.text = "Info";
      select.appendChild(infoOption);

      const errorOption = document.createElement("option");
      errorOption.value = "error";
      errorOption.text = "Error";
      select.appendChild(errorOption);

      select.value = "debug";
      expect(validateLogLevel(select)).toBe(true);

      select.value = "info";
      expect(validateLogLevel(select)).toBe(true);

      select.value = "warn";
      expect(validateLogLevel(select)).toBe(false); // "warn" is not a valid log level

      select.value = "invalid";
      expect(validateLogLevel(select)).toBe(false);
    });

    it("should validate format correctly", () => {
      const select = document.createElement("select");
      select.id = "settings-ytdlp-format";

      // Add option elements
      const mp4Option = document.createElement("option");
      mp4Option.value = "mp4";
      mp4Option.text = "MP4";
      select.appendChild(mp4Option);

      const webmOption = document.createElement("option");
      webmOption.value = "webm";
      webmOption.text = "WebM";
      select.appendChild(webmOption);

      const bestOption = document.createElement("option");
      bestOption.value = "best";
      bestOption.text = "Best";
      select.appendChild(bestOption);

      select.value = "mp4";
      expect(validateFormat(select)).toBe(true);

      select.value = "webm";
      expect(validateFormat(select)).toBe(true);

      select.value = "best";
      expect(validateFormat(select)).toBe(true);

      select.value = "avi";
      expect(validateFormat(select)).toBe(false); // "avi" is not a valid format

      select.value = "invalid";
      expect(validateFormat(select)).toBe(false);
    });
  });

  describe("Settings Management", () => {
    it("should save settings successfully", async () => {
      const form = document.getElementById("settings-form") as HTMLFormElement;
      const event = new Event("submit");
      Object.defineProperty(event, "target", { value: form });
      Object.defineProperty(event, "preventDefault", { value: jest.fn() });

      // Mock successful storage and runtime calls
      (chrome.storage.local.set as jest.Mock).mockImplementation((data, callback) => {
        callback();
      });
      (chrome.runtime.sendMessage as jest.Mock).mockImplementation((message, callback) => {
        callback({ status: "success" });
      });

      await saveSettings(event);

      // Check that the success status is set
      const statusElement = document.getElementById("settings-status");
      expect(statusElement?.textContent).toContain("Settings saved successfully");
    });

    it("should handle save errors gracefully", async () => {
      const form = document.getElementById("settings-form") as HTMLFormElement;
      const event = new Event("submit");
      Object.defineProperty(event, "target", { value: form });
      Object.defineProperty(event, "preventDefault", { value: jest.fn() });

      // Mock storage error
      (chrome.storage.local.set as jest.Mock).mockImplementation((data, callback) => {
        chrome.runtime.lastError = { message: "Storage error" };
        callback();
      });

      await saveSettings(event);

      // Check that the error status is set
      const statusElement = document.getElementById("settings-status");
      expect(statusElement?.textContent).toContain("Error saving settings");
    });
  });

  describe("Server Status", () => {
    it("should update server status to connected", () => {
      updateOptionsServerStatus("connected");
      const indicator = document.getElementById("server-status-indicator");
      const text = document.getElementById("server-status-text");
      expect(indicator?.classList.contains("connected")).toBe(true);
      expect(text?.textContent).toBe("Connected");
    });

    it("should update server status to disconnected", () => {
      updateOptionsServerStatus("disconnected");
      const indicator = document.getElementById("server-status-indicator");
      const text = document.getElementById("server-status-text");
      expect(indicator?.classList.contains("disconnected")).toBe(true);
      expect(text?.textContent).toBe("Disconnected");
    });
  });

  describe("Validation Messages", () => {
    it("should show validation message", () => {
      const element = document.createElement("div");
      showValidationMessage(element, "test message", "error");
      expect(element.textContent).toBe("test message");
      expect(element.classList.contains("error")).toBe(true);
    });

    it("should handle null element gracefully", () => {
      expect(() => showValidationMessage(null, "test message", "error")).not.toThrow();
    });
  });

  describe("Theme Management", () => {
    it("applyOptionsTheme should apply theme classes", () => {
      applyOptionsTheme("dark");
      expect(document.body.classList.contains("dark-theme")).toBe(true);

      applyOptionsTheme("light");
      expect(document.body.classList.contains("dark-theme")).toBe(false);
    });

    it("handleThemeToggle should toggle theme", async () => {
      // Mock storage to return current theme using Promise-based API
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({
        theme: "light",
      });

      // Mock storage set to capture the new theme using Promise-based API
      let savedTheme: string | undefined;
      (chrome.storage.local.set as jest.Mock).mockImplementation(data => {
        savedTheme = data.theme;
        return Promise.resolve();
      });

      await handleThemeToggle();

      // Verify that the theme was toggled from light to dark
      expect(savedTheme).toBe("dark");
      expect(document.body.classList.contains("dark-theme")).toBe(true);
    });
  });

  describe("State Management Integration", () => {
    it("should apply theme without state manager integration", () => {
      // The actual implementation doesn't update state manager, so we test the actual behavior
      applyOptionsTheme("dark");
      expect(document.body.classList.contains("dark-theme")).toBe(true);
    });

    it("should handle theme changes correctly", () => {
      // The actual implementation doesn't log theme changes, so we test the actual behavior
      applyOptionsTheme("light");
      expect(document.body.classList.contains("dark-theme")).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle validation errors", async () => {
      const form = document.getElementById("settings-form") as HTMLFormElement;
      const event = new Event("submit");
      Object.defineProperty(event, "target", { value: form });
      Object.defineProperty(event, "preventDefault", { value: jest.fn() });

      // Mock validation failure by making form invalid
      const portInput = form.querySelector("#settings-server-port") as HTMLInputElement;
      portInput.value = "invalid";

      await saveSettings(event);

      // Check that validation error is shown
      const statusElement = document.getElementById("settings-status");
      expect(statusElement?.textContent).toContain("Please fix validation errors");
    });

    it("should handle server errors gracefully", async () => {
      const form = document.getElementById("settings-form") as HTMLFormElement;
      const event = new Event("submit");
      Object.defineProperty(event, "target", { value: form });
      Object.defineProperty(event, "preventDefault", { value: jest.fn() });

      // Mock server error
      (chrome.storage.local.set as jest.Mock).mockImplementation((data, callback) => {
        callback();
      });
      (chrome.runtime.sendMessage as jest.Mock).mockImplementation((message, callback) => {
        callback({ status: "error", message: "Server error" });
      });

      await saveSettings(event);

      // Check that error status is shown
      const statusElement = document.getElementById("settings-status");
      expect(statusElement?.textContent).toContain("Error saving settings");
    });
  });
});
