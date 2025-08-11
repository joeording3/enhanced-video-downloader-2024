/**
 * Options page functionality for the Enhanced Video Downloader extension.
 * Handles extension settings, configuration, and user preferences.
 */
// @ts-nocheck


import { safeParse } from "./lib/utils";
import { logger } from "./core/logger";
import { Theme, ServerConfig } from "./types";
import { clearHistoryAndNotify, fetchHistory, renderHistoryItems } from "./history";
import { getServerPort, getPortRange } from "./core/constants";

// Add type definitions for newer APIs
declare global {
  interface Window {
    showDirectoryPicker?: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
  }

  interface DirectoryPickerOptions {
    mode?: "read" | "readwrite";
  }
}

const setStatus = (elementId: string, message: string, isError = false, timeout = 3000): void => {
  const statusElement = document.getElementById(elementId);
  if (!statusElement) return;

  statusElement.textContent = message;
  statusElement.classList.toggle("success", !isError);
  statusElement.classList.toggle("error", isError);

  if (timeout > 0) {
    setTimeout(() => {
      statusElement.textContent = "";
      statusElement.classList.remove("success", "error");
    }, timeout);
  }
};

/**
 * Updates the server status indicator in the options page.
 * @param status - The server status ('connected', 'disconnected', or 'checking')
 */
export function updateOptionsServerStatus(status: "connected" | "disconnected" | "checking"): void {
  const indicator = document.getElementById("server-status-indicator");
  const text = document.getElementById("server-status-text");

  if (indicator && text) {
    // Remove all status classes
    indicator.classList.remove("connected", "disconnected");
    text.classList.remove("status-connected", "status-disconnected");

    switch (status) {
      case "connected":
        indicator.classList.add("connected");
        text.classList.add("status-connected");
        chrome.storage.local.get("serverPort", res => {
          const port = res.serverPort || "?";
          (text as HTMLElement).textContent = `Server: Connected @ ${port}`;
        });
        break;
      case "disconnected":
        indicator.classList.add("disconnected");
        text.classList.add("status-disconnected");
        (text as HTMLElement).textContent = "Server: Disconnected";
        break;
      case "checking":
        text.textContent = "Checking...";
        break;
    }
  }
}

/**
 * Initializes the options page, setting up event listeners and loading current settings.
 * This function runs when the options page is loaded.
 */
export function initOptionsPage(): void {
  // Apply console log level from stored config to reflect user selection
  chrome.storage.local.get("serverConfig", res => {
    const cfg = res.serverConfig || {};
    let level = (cfg.console_log_level || cfg.log_level || "info") as string;
    // Map server-style levels to extension logger levels
    const normalized = String(level).toLowerCase();
    if (normalized === "warning") level = "warn";
    if (normalized === "critical") level = "error";
    try {
      logger.setLevel(String(level).toLowerCase() as any);
    } catch {
      /* ignore */
    }
  });
  // Initialize theme first
  initializeOptionsTheme().catch(error => {
    console.error("Error initializing theme:", error);
  });

  loadSettings();
  setupEventListeners();
  setupValidation();
  setupInfoMessages();
  setupTabNavigation();
  setupMessageListener();
  setupLogsUI();
  loadErrorHistory();
  logger.debug("Options page initialized", { component: "options" });
}

/**
 * Loads the current settings from storage and populates the form fields.
 * Retrieves configuration from both local storage and the server when available.
 */
export function loadSettings(): void {
  // First try to load from storage
  chrome.storage.local.get(["serverConfig"], result => {
    const hadLocalConfig = Boolean(result.serverConfig);
    if (hadLocalConfig) {
      populateFormFields(result.serverConfig);
    }

    // Then try to get latest from server
    chrome.runtime.sendMessage({ type: "getConfig" }, response => {
      if (chrome.runtime.lastError) {
        logger.error(
          "Error getting config:",
          { component: "options" },
          chrome.runtime.lastError.message as any
        );
        // Do not proceed if there's an error
        return;
      }
      if (response && response.status === "success" && response.data) {
        // If we already had a local config (just saved or previously cached),
        // prefer that and avoid overwriting the user's selections from storage.
        if (!hadLocalConfig) {
          populateFormFields(response.data);
        } else {
          // When local config exists, still populate env-only fields from server (e.g., LOG_FILE)
          try {
            const serverData: any = response.data;
            const logFileInput = document.getElementById(
              "settings-log-file"
            ) as HTMLInputElement | null;
            if (
              logFileInput &&
              typeof serverData?.log_file === "string" &&
              logFileInput.value.trim() === ""
            ) {
              logFileInput.value = serverData.log_file;
            }
          } catch {
            // ignore UI population issues for env-only fields
          }
        }
        logger.debug("Loaded settings from server", { component: "options" });
      } else {
        logger.warn(
          "Could not load settings from server:",
          { component: "options" },
          response?.message as any
        );
        // Even if the fetch failed, the background may have provided cached data
        // Attempt to populate env-only fields like log_file when available
        try {
          const serverData: any = response?.data;
          const logFileInput = document.getElementById(
            "settings-log-file"
          ) as HTMLInputElement | null;
          if (
            logFileInput &&
            typeof serverData?.log_file === "string" &&
            logFileInput.value.trim() === ""
          ) {
            logFileInput.value = serverData.log_file;
          }
        } catch {
          // ignore UI population issues for env-only fields
        }
      }
    });
  });
}

/**
 * Populates the settings form fields with values from the provided configuration.
 *
 * @param config - The server configuration object
 */
export function populateFormFields(config: ServerConfig): void {
  // Set form field values from config
  const elements = {
    port: document.getElementById("settings-server-port") as HTMLInputElement,
    downloadDir: document.getElementById("settings-download-dir") as HTMLInputElement,
    debugMode: document.getElementById("settings-enable-debug") as HTMLInputElement,
    enableHistory: document.getElementById("settings-enable-history") as HTMLInputElement,
    logLevel: document.getElementById("settings-log-level") as HTMLSelectElement,
    ytdlpFormat: document.getElementById("settings-ytdlp-format") as HTMLSelectElement,
    allowPlaylists: document.getElementById("settings-allow-playlists") as HTMLInputElement,
    logFile: document.getElementById("settings-log-file") as HTMLInputElement,
    ytdlpConcurrent: document.getElementById(
      "settings-ytdlp-concurrent-fragments"
    ) as HTMLInputElement,
  };

  if (elements.port && config.server_port !== undefined && config.server_port !== null) {
    elements.port.value = config.server_port.toString();
  }
  if (elements.downloadDir && config.download_dir) {
    elements.downloadDir.value = config.download_dir;
  }
  if (elements.debugMode) {
    elements.debugMode.checked = config.debug_mode ?? false;
  }
  if (elements.enableHistory) {
    elements.enableHistory.checked = config.enable_history ?? true;
  }
  if (elements.logLevel && config.log_level) {
    elements.logLevel.value = config.log_level;
  }
  if (elements.ytdlpFormat && config.yt_dlp_options?.format) {
    elements.ytdlpFormat.value = config.yt_dlp_options.format;
  }
  if (elements.allowPlaylists) {
    elements.allowPlaylists.checked = config.allow_playlists ?? false;
  }
  if (elements.logFile && (config as any).log_file) {
    elements.logFile.value = (config as any).log_file as string;
  }
  // Populate yt-dlp concurrent fragments from config or env overlay
  const conc =
    (config as any)?.yt_dlp_options?.concurrent_fragments ??
    (config as any)?.ytdlp_concurrent_fragments;
  if (elements.ytdlpConcurrent && conc !== undefined && conc !== null) {
    elements.ytdlpConcurrent.value = String(conc);
  }

  // Populate console log level select if present
  const consoleLogLevelSelectEl = document.getElementById(
    "settings-console-log-level"
  ) as HTMLSelectElement | null;
  if (consoleLogLevelSelectEl && (config as any).console_log_level) {
    consoleLogLevelSelectEl.value = String((config as any).console_log_level);
  }

  // Trigger validation after populating
  validateAllFields();

  // Update info messages to reflect current selections
  const logLevelSelect = document.getElementById("settings-log-level") as HTMLSelectElement;
  const consoleLogLevelSelect = document.getElementById("settings-console-log-level") as HTMLSelectElement;
  const formatSelect = document.getElementById("settings-ytdlp-format") as HTMLSelectElement;

  if (logLevelSelect) {
    updateLogLevelInfo(logLevelSelect);
  }
  if (consoleLogLevelSelect) {
    updateConsoleLogLevelInfo(consoleLogLevelSelect);
  }
  if (formatSelect) {
    updateFormatInfo(formatSelect);
  }
}

/**
 * Sets up event listeners for form submission and button clicks.
 */
export function setupEventListeners(): void {
  const form = document.getElementById("settings-form") as HTMLFormElement;
  if (form) {
    form.addEventListener("submit", saveSettings);
  }

  // Removed folder picker UI; users should input absolute paths directly

  const restartButton = document.getElementById("restart-server");
  if (restartButton) {
    restartButton.addEventListener("click", restartServer);
  }

  // Theme toggle functionality
  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", handleThemeToggle);
  }

  const clearHistoryButton = document.getElementById("settings-clear-history");
  if (clearHistoryButton) {
    clearHistoryButton.addEventListener("click", () => {
      if (confirm("Are you sure you want to permanently delete all download history?")) {
        clearHistoryAndNotify().catch(error => {
          console.error("Failed to clear history:", error);
          setStatus("settings-status", "Failed to clear history", true);
        });
      }
    });
  }

  const resumeDownloadsButton = document.getElementById("settings-resume-downloads");
  if (resumeDownloadsButton) {
    resumeDownloadsButton.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "resumeDownloads" }, response => {
        if (response && response.status === "success") {
          setStatus("settings-status", "Resume operation completed successfully!");
        } else {
          setStatus(
            "settings-status",
            "Error: " + (response?.message || "Failed to resume downloads"),
            true
          );
        }
      });
    });
  }

  // Optional: enable GalleryDL and Priority UI hooks if present in DOM
  const galleryBtn = document.getElementById("settings-gallery-download");
  if (galleryBtn) {
    galleryBtn.addEventListener("click", () => {
      const urlInput = document.getElementById("settings-gallery-url") as HTMLInputElement | null;
      const url = urlInput?.value?.trim();
      if (!url) {
        setStatus("settings-status", "Please enter a gallery URL", true);
        return;
      }
      chrome.runtime.sendMessage({ type: "galleryDownload", url }, (response: any) => {
        if (response && response.status === "success") {
          setStatus("settings-status", "Gallery download started");
        } else {
          setStatus(
            "settings-status",
            "Error: " + (response?.message || "Failed to start gallery"),
            true
          );
        }
      });
    });
  }

  // Clear all stored button positions across hosts
  const clearPositionsButton = document.getElementById("settings-clear-positions");
  if (clearPositionsButton) {
    clearPositionsButton.addEventListener("click", async () => {
      try {
        // Fetch all storage, remove keys that look like hostnames (contain a dot) with x/y/hidden
        const all = await chrome.storage.local.get(null as any);
        const keysToRemove: string[] = [];
        for (const [key, value] of Object.entries(all)) {
          // Heuristic: hostname-like keys or keys with position schema
          const looksLikeHost = key.includes(".");
          const v: any = value;
          const looksLikePosition =
            v && typeof v === "object" && "x" in v && "y" in v && "hidden" in v;
          if (looksLikeHost && looksLikePosition) {
            keysToRemove.push(key);
          }
        }
        if (keysToRemove.length === 0) {
          setStatus("settings-status", "No stored button positions found to clear");
          return;
        }
        await new Promise<void>(resolve =>
          (chrome.storage.local as any).remove(keysToRemove, () => resolve())
        );
        setStatus(
          "settings-status",
          `Cleared ${keysToRemove.length} stored button position${
            keysToRemove.length === 1 ? "" : "s"
          }`
        );
      } catch (e) {
        setStatus("settings-status", "Failed to clear button positions", true);
      }
    });
  }
}

/**
 * Sets up comprehensive validation for all form fields with helpful messages.
 */
export function setupValidation(): void {
  // Port validation
  const portInput = document.getElementById("settings-server-port") as HTMLInputElement;
  if (portInput) {
    portInput.addEventListener("input", () => validatePort(portInput));
    portInput.addEventListener("blur", () => validatePort(portInput));
  }

  // Download directory validation
  const downloadDirInput = document.getElementById("settings-download-dir") as HTMLInputElement;
  if (downloadDirInput) {
    downloadDirInput.addEventListener("input", () => validateFolder(downloadDirInput));
    downloadDirInput.addEventListener("blur", () => validateFolder(downloadDirInput));
  }

  // Log level validation
  const logLevelSelect = document.getElementById("settings-log-level") as HTMLSelectElement;
  if (logLevelSelect) {
    logLevelSelect.addEventListener("change", () => validateLogLevel(logLevelSelect));
  }

  // Console log level validation
  const consoleLogLevelSelect = document.getElementById("settings-console-log-level") as HTMLSelectElement;
  if (consoleLogLevelSelect) {
    consoleLogLevelSelect.addEventListener("change", () => validateConsoleLogLevel(consoleLogLevelSelect));
  }

  // Format validation
  const formatSelect = document.getElementById("settings-ytdlp-format") as HTMLSelectElement;
  if (formatSelect) {
    formatSelect.addEventListener("change", () => validateFormat(formatSelect));
  }

  // Real-time validation for all fields
  const allInputs = document.querySelectorAll("input, select");
  allInputs.forEach(input => {
    if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
      input.addEventListener("input", () => validateField(input));
      input.addEventListener("blur", () => validateField(input));
    }
  });
}

/**
 * Validates a port number input field.
 */
export function validatePort(input: HTMLInputElement): boolean {
  const value = input.value.trim();
  const validationElement = document.getElementById("port-validation");

  if (!value) {
    showValidationMessage(validationElement, "Port number is required", "error");
    input.classList.add("invalid");
    input.classList.remove("valid");
    return false;
  }

  const port = parseInt(value, 10);
  if (isNaN(port)) {
    showValidationMessage(validationElement, "Port must be a valid number", "error");
    input.classList.add("invalid");
    input.classList.remove("valid");
    return false;
  }

  const [minPort, maxPort] = getPortRange();
  if (port < minPort || port > maxPort) {
    showValidationMessage(
      validationElement,
      `Port must be between ${minPort} and ${maxPort}`,
      "error"
    );
    input.classList.add("invalid");
    input.classList.remove("valid");
    return false;
  }

  // Check for common port conflicts
  const commonPorts = [80, 443, 3000, 5000, 8000, 8080]; // Removed 9000 to allow 9090
  if (commonPorts.includes(port)) {
    showValidationMessage(
      validationElement,
      "Port " + port + " is commonly used by other services",
      "warning"
    );
    input.classList.add("valid");
    input.classList.remove("invalid");
    return true;
  }

  // Special case for our server port
  if (port === 9090) {
    showValidationMessage(
      validationElement,
      "Port 9090 is the default server port for this application",
      "success"
    );
    input.classList.add("valid");
    input.classList.remove("invalid");
    return true;
  }

  showValidationMessage(validationElement, "Port number is valid", "success");
  input.classList.add("valid");
  input.classList.remove("invalid");
  return true;
}

/**
 * Validates a download folder path input field.
 */
export function validateFolder(input: HTMLInputElement): boolean {
  const value = input.value.trim();
  const validationElement = document.getElementById("folder-validation");

  if (!value) {
    showValidationMessage(validationElement, "Download folder path is required", "error");
    input.classList.add("invalid");
    input.classList.remove("valid");
    return false;
  }

  // Basic path validation
  if (value.includes("..") || value.includes("//")) {
    showValidationMessage(validationElement, "Invalid path format detected", "error");
    input.classList.add("invalid");
    input.classList.remove("valid");
    return false;
  }

  // Check for absolute path (basic check), also allow home-relative (~) which the backend expands
  const isUnixAbsolute = value.startsWith("/");
  const isWindowsAbsolute = /^[A-Za-z]:/.test(value);
  const isHomeRelative = value.startsWith("~");
  if (!isUnixAbsolute && !isWindowsAbsolute && !isHomeRelative) {
    // This could be a folder name from the folder picker or a relative path
    // Allow it but show a warning that it should be an absolute path
    showValidationMessage(
      validationElement,
      "Please provide an absolute path for best compatibility",
      "warning"
    );
    input.classList.add("valid");
    input.classList.remove("invalid");
    return true;
  }

  showValidationMessage(validationElement, "Folder path looks valid", "success");
  input.classList.add("valid");
  input.classList.remove("invalid");
  return true;
}

/**
 * Validates log level selection.
 */
export function validateLogLevel(select: HTMLSelectElement): boolean {
  const value = select.value;
  const validationElement = document.getElementById("log-level-validation");

  if (!value) {
    showValidationMessage(validationElement, "Please select a log level", "error");
    select.classList.add("invalid");
    select.classList.remove("valid");
    return false;
  }

  const validLevels = ["error", "info", "debug", "ERROR", "INFO", "DEBUG"];
  if (!validLevels.includes(value)) {
    showValidationMessage(validationElement, "Invalid log level selected", "error");
    select.classList.add("invalid");
    select.classList.remove("valid");
    return false;
  }

  showValidationMessage(validationElement, "Log level is valid", "success");
  select.classList.add("valid");
  select.classList.remove("invalid");
  return true;
}

/**
 * Validates console log level selection.
 */
export function validateConsoleLogLevel(select: HTMLSelectElement): boolean {
  const value = select.value;
  const validationElement = document.getElementById("settings-console-log-level-validation");

  if (!value) {
    showValidationMessage(validationElement, "Please select a console log level", "error");
    select.classList.add("invalid");
    select.classList.remove("valid");
    return false;
  }

  const validLevels = ["debug", "info", "warning", "error", "critical"]; // per UI
  if (!validLevels.includes(value)) {
    showValidationMessage(validationElement, "Invalid console log level selected", "error");
    select.classList.add("invalid");
    select.classList.remove("valid");
    return false;
  }

  // Provide explanatory success with meaning of the selected level
  const levelInfo: Record<string, string> = {
    debug: "Verbose logging in the browser console (everything)",
    info: "General information and above",
    warning: "Only warnings and errors",
    error: "Only errors",
    critical: "Critical errors only",
  };
  showValidationMessage(
    validationElement,
    `Console log level set: ${value}. ${levelInfo[value] ?? ""}`.trim(),
    "success"
  );
  select.classList.add("valid");
  select.classList.remove("invalid");
  return true;
}

/**
 * Validates format selection.
 */
export function validateFormat(select: HTMLSelectElement): boolean {
  const value = select.value;
  const validationElement = document.getElementById("format-validation");

  if (!value) {
    showValidationMessage(validationElement, "Please select a video format", "error");
    select.classList.add("invalid");
    select.classList.remove("valid");
    return false;
  }

  const validFormats = [
    "bestvideo+bestaudio/best",
    "best",
    "mp4",
    "webm",
    "bestaudio[ext=m4a]",
    "bestaudio[ext=opus]",
  ];

  if (!validFormats.includes(value)) {
    showValidationMessage(validationElement, "Invalid format selected", "error");
    select.classList.add("invalid");
    select.classList.remove("valid");
    return false;
  }

  showValidationMessage(validationElement, "Format is valid", "success");
  select.classList.add("valid");
  select.classList.remove("invalid");
  return true;
}

/**
 * Generic field validation function.
 */
function validateField(field: HTMLInputElement | HTMLSelectElement): boolean {
  const fieldName = field.name || field.id;

  // Skip validation for checkboxes and hidden fields
  if (field.type === "checkbox" || field.type === "hidden") {
    return true;
  }

  const value = field.value.trim();

  // Required field validation
  if (field.hasAttribute("required") && !value) {
    showFieldValidation(field, fieldName + " is required", "error");
    return false;
  }

  // Field-specific validation
  if (fieldName === "server-port") {
    return validatePort(field as HTMLInputElement);
  } else if (fieldName === "download-dir") {
    return validateFolder(field as HTMLInputElement);
  } else if (fieldName === "log-level") {
    return validateLogLevel(field as HTMLSelectElement);
  } else if (fieldName === "console-log-level") {
    return validateConsoleLogLevel(field as HTMLSelectElement);
  } else if (fieldName === "ytdlp-format") {
    return validateFormat(field as HTMLSelectElement);
  }

  // Default: do not show noisy success messages for passive fields; clear prior messages
  showFieldValidation(field, "", "success");
  return true;
}

/**
 * Shows validation message for a specific field.
 */
function showFieldValidation(
  field: HTMLInputElement | HTMLSelectElement,
  message: string,
  type: "success" | "error" | "warning"
): void {
  const fieldId = field.id;
  const validationElement = document.getElementById(fieldId + "-validation");

  if (validationElement) {
    showValidationMessage(validationElement, message, type);
  }

  field.classList.remove("valid", "invalid");
  if (type === "success") {
    field.classList.add("valid");
  } else if (type === "error") {
    field.classList.add("invalid");
  }
}

/**
 * Shows validation message in the specified element.
 */
export function showValidationMessage(
  element: HTMLElement | null,
  message: string,
  type: "success" | "error" | "warning"
): void {
  if (!element) return;

  element.textContent = message;
  element.className = "validation-message " + type;

  // Auto-hide success messages after 3 seconds
  if (type === "success") {
    setTimeout(() => {
      element.textContent = "";
      element.className = "validation-message";
    }, 3000);
  }
}

/**
 * Validates all form fields and returns overall validity.
 */
function validateAllFields(): boolean {
  const requiredFields = document.querySelectorAll("input[required], select[required]");
  let allValid = true;

  requiredFields.forEach(field => {
    if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
      if (!validateField(field)) {
        allValid = false;
      }
    }
  });

  // Also validate specific fields that have custom validation
  const portInput = document.getElementById("settings-server-port") as HTMLInputElement;
  if (portInput && !validatePort(portInput)) {
    allValid = false;
  }

  const downloadDirInput = document.getElementById("settings-download-dir") as HTMLInputElement;
  if (downloadDirInput && !validateFolder(downloadDirInput)) {
    allValid = false;
  }

  const logLevelSelect = document.getElementById("settings-log-level") as HTMLSelectElement;
  if (logLevelSelect && !validateLogLevel(logLevelSelect)) {
    allValid = false;
  }

  const formatSelect = document.getElementById("settings-ytdlp-format") as HTMLSelectElement;
  if (formatSelect && !validateFormat(formatSelect)) {
    allValid = false;
  }

  return allValid;
}

/**
 * Sets up dynamic info messages for form fields.
 */
export function setupInfoMessages(): void {
  const formatSelect = document.getElementById("settings-ytdlp-format") as HTMLSelectElement;
  const logLevelSelect = document.getElementById("settings-log-level") as HTMLSelectElement;
  const consoleLogLevelSelect = document.getElementById("settings-console-log-level") as HTMLSelectElement;

  if (formatSelect) {
    formatSelect.addEventListener("change", () => updateFormatInfo(formatSelect));
    updateFormatInfo(formatSelect); // Initial update
  }

  if (logLevelSelect) {
    logLevelSelect.addEventListener("change", () => updateLogLevelInfo(logLevelSelect));
    updateLogLevelInfo(logLevelSelect); // Initial update
  }

  if (consoleLogLevelSelect) {
    consoleLogLevelSelect.addEventListener("change", () => updateConsoleLogLevelInfo(consoleLogLevelSelect));
    updateConsoleLogLevelInfo(consoleLogLevelSelect); // Initial update
  }
}

/**
 * Updates the format info message based on selected format.
 */
function updateFormatInfo(select: HTMLSelectElement): void {
  const infoElement = document.getElementById("format-info");
  if (!infoElement) return;

  const infoText = infoElement.querySelector(".info-text") as HTMLElement;
  if (!infoText) return;

  const formatInfo: Record<string, string> = {
    "bestvideo+bestaudio/best": "Best quality with separate video and audio streams",
    best: "Best available single file (may be lower quality)",
    mp4: "MP4 format with best available quality",
    webm: "WebM format with best available quality",
    "bestaudio[ext=m4a]": "Audio only in M4A format",
    "bestaudio[ext=opus]": "Audio only in Opus format",
  };

  infoText.textContent = formatInfo[select.value] || "Select a format option";
}

/**
 * Updates the log level info message based on selected level.
 */
function updateLogLevelInfo(select: HTMLSelectElement): void {
  const infoElement = document.getElementById("log-level-info");
  if (!infoElement) return;

  const infoText = infoElement.querySelector(".info-text") as HTMLElement;
  if (!infoText) return;

  const levelInfo: Record<string, string> = {
    error: "Only error messages will be logged",
    info: "Normal level provides essential information",
    debug: "Verbose logging for troubleshooting",
  };

  infoText.textContent = levelInfo[select.value] || "Select a log level";
}

/**
 * Updates the console log level info message based on selected level.
 */
function updateConsoleLogLevelInfo(select: HTMLSelectElement): void {
  const infoElement = document.getElementById("console-log-level-info");
  if (!infoElement) return;

  const infoText = infoElement.querySelector(".info-text") as HTMLElement;
  if (!infoText) return;

  const levelInfo: Record<string, string> = {
    debug: "Everything printed in DevTools console (most verbose)",
    info: "General info, warnings, and errors",
    warning: "Only warnings and errors",
    error: "Only errors",
    critical: "Critical errors only",
  };

  infoText.textContent = levelInfo[select.value] || "Select a console log level";
}

/**
 * Sets up tab navigation for the options page.
 * Handles switching between different tabs in the options UI.
 */
export function setupTabNavigation(): void {
  const tabs = document.querySelectorAll(".tab-button");
  const tabContents = document.querySelectorAll(".tab-content");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove("active"));
      tabContents.forEach(content => content.classList.remove("active"));

      // Add active class to current tab
      tab.classList.add("active");

      // Show corresponding content
      const target = tab.getAttribute("data-tab");
      if (target) {
        const content = document.getElementById(target);
        if (content) content.classList.add("active");
      }
    });
  });
}

/**
 * Sets up message listener to handle server discovery notifications.
 */
export function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "serverDiscovered") {
      logger.debug("Server discovered notification received, refreshing settings");
      // Refresh settings when server is discovered
      loadSettings();
    } else if (message.type === "serverStatusUpdate") {
      updateOptionsServerStatus(message.status);
    }
  });
}

/**
 * Wire up the logs viewer controls and initial load.
 */
export function setupLogsUI(): void {
  const refreshBtn = document.getElementById("log-refresh");
  const clearBtn = document.getElementById("log-clear");
  const limitSelect = document.getElementById("log-limit") as HTMLSelectElement | null;
  const recentFirstCheckbox = document.getElementById(
    "log-recent-first"
  ) as HTMLInputElement | null;
  const filterWerkzeugCheckbox = document.getElementById(
    "log-filter-werkzeug"
  ) as HTMLInputElement | null;
  const displayDiv = document.getElementById("log-display");
  const textarea = null as unknown as HTMLTextAreaElement | null; // textarea removed from DOM
  const autoCheckbox = document.getElementById("log-toggle-auto") as HTMLInputElement | null;

  if (!displayDiv) {
    return;
  }

  let autoTimer: number | null = null;

  // Load persisted log viewer preferences
  (async () => {
    try {
      const res = await chrome.storage.local.get("logViewerPrefs");
      const prefs = (res as any).logViewerPrefs || {};
      if (recentFirstCheckbox && typeof prefs.recentFirst === "boolean") {
        recentFirstCheckbox.checked = prefs.recentFirst;
      }
      if (limitSelect && typeof prefs.limit === "number") {
        const v = String(prefs.limit);
        if (Array.from(limitSelect.options).some(o => o.value === v)) {
          limitSelect.value = v;
        }
      }
      if (autoCheckbox && typeof prefs.auto === "boolean") {
        autoCheckbox.checked = prefs.auto;
      }
      if (filterWerkzeugCheckbox && typeof prefs.filterWerkzeug === "boolean") {
        filterWerkzeugCheckbox.checked = prefs.filterWerkzeug;
      }
    } catch {
      // ignore
    }
  })();

  const persistPrefs = (): void => {
    const prefs = {
      recentFirst: !!recentFirstCheckbox?.checked,
      limit: limitSelect ? parseInt(limitSelect.value, 10) : 500,
      auto: !!autoCheckbox?.checked,
      filterWerkzeug: !!filterWerkzeugCheckbox?.checked,
    };
    try {
      chrome.storage.local.set({ logViewerPrefs: prefs });
    } catch {
      // ignore
    }
  };

  const applyFilters = (text: string): string => {
    let t = text;
    // Suppress server log clear/rotation banner lines
    t = t
      .split("\n")
      .filter(line => !/^\s*Log file cleared and archived to /i.test(line))
      .join("\n");
    if (filterWerkzeugCheckbox?.checked) {
      t = t
        .split("\n")
        .filter(line => {
          const isWerkzeug = /werkzeug/i.test(line);
          // JSON: "status": 200 or "status": "200"
          const isStatus200Json = /"status"\s*:\s*"?200"?(\b|\s|[,}])/.test(line);
          // Plain text within message: "-> 200" possibly followed by punctuation/space/EOL
          const isStatus200Arrow = /->\s*200(\b|\s|[,}])?/.test(line);
          // JSON for server.request logger with 200 status (robust across spacing)
          const isServerRequest200 = /"logger"\s*:\s*"server\.request"[\s\S]*?"status"\s*:\s*"?200"?/i.test(line);
          return !(isWerkzeug || isStatus200Json || isStatus200Arrow || isServerRequest200);
        })
        .join("\n");
    }
    return t;
  };

  const renderLogs = (text: string): void => {
    const filtered = applyFilters(text);
    if (displayDiv) {
      displayDiv.textContent = "";
      const pre = document.createElement("pre");
      const rawLines = (filtered || "(no logs)").split("\n");

      // First, try to parse as NDJSON (one JSON object per line)
      let entries = [] as Array<{
        timestamp?: string;
        logger?: string;
        level?: string;
        message: string;
        details: string[];
        _startTs?: number;
      }>;
      try {
        for (let i = 0; i < rawLines.length; i += 1) {
          const raw = rawLines[i] || "";
          const line = raw.trim();
          if (!line) continue;
          const firstBrace = line.indexOf("{");
          if (firstBrace === -1) continue;
          const jsonPart = line.slice(firstBrace);
          try {
            const obj: any = JSON.parse(jsonPart);
            const startTs: number | undefined = typeof obj.start_ts === "number" ? obj.start_ts : undefined;
            const iso = typeof obj.ts === "string" ? obj.ts : startTs ? new Date(startTs).toISOString() : undefined;
            // Derive level from JSON or from any prefix before the JSON
            let level: string | undefined = undefined;
            if (typeof obj.level === "string") {
              level = String(obj.level).toLowerCase();
            } else if (firstBrace > 0) {
              const prefix = line.slice(0, firstBrace).trim();
              const m = prefix.match(/\b(debug|info|warning|error|critical|trace|warn)\b/i);
              if (m) level = m[1].toLowerCase();
            }
            entries.push({
              timestamp: iso,
              logger: typeof obj.logger === "string" ? obj.logger : undefined,
              level,
              message: typeof obj.message === "string" ? obj.message : jsonPart,
              details: [],
              _startTs: startTs,
            });
          } catch {
            // ignore JSON parsing error on this line
          }
        }
        // If we have NDJSON entries, optionally sort by start_ts according to UI toggle
        if (entries.length > 0) {
          const recentFirst = !!(document.getElementById("log-recent-first") as HTMLInputElement | null)?.checked;
          const withStart = entries.filter(e => typeof e._startTs === "number");
          if (withStart.length > 0) {
            entries.sort((a, b) => (recentFirst ? (b._startTs ?? 0) - (a._startTs ?? 0) : (a._startTs ?? 0) - (b._startTs ?? 0)));
          }
        }
      } catch {
        // Ignore NDJSON block failures entirely; we'll fall back to legacy parsing
        entries = [];
      }

      // If NDJSON was not present, parse typical server log lines (legacy) and group continuation/trace lines
      if (entries.length === 0) {
        var lineRegex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:[,.]\d{3})?)\s*-\s*([^-]+?)\s*-\s*(DEBUG|INFO|WARNING|ERROR|CRITICAL|WARN|TRACE)\s*-\s*([\s\S]*)$/;
        var levelMap: Record<string, string> = {
          warn: "warning",
          warning: "warning",
          error: "error",
          critical: "critical",
          info: "info",
          debug: "debug",
          trace: "debug",
        };

        var current: any = null;
        for (var i = 0; i < rawLines.length; i += 1) {
          var line = rawLines[i] || "";
          var m = line.match(lineRegex);
          if (m) {
            if (current) entries.push(current);
            var lvlRaw = (m[3] || "").trim().toLowerCase();
            current = {
              timestamp: (m[1] || "").trim(),
              logger: (m[2] || "").trim(),
              level: levelMap[lvlRaw] || "info",
              message: (m[4] || "").trim(),
              details: [],
            } as any;
          } else if (
            current &&
            (line.indexOf(" ") === 0 ||
              line.indexOf("\t") === 0 ||
              /^(Traceback|File \"|\s*\.\.\.|\s*at )/.test(line))
          ) {
            current.details.push(line);
          } else if (line.trim().length > 0) {
            if (current) entries.push(current);
            current = { message: line, details: [], level: "info" } as any;
          } else if (current) {
            current.details.push("");
          }
        }
        if (current) entries.push(current);
      }
      if (entries.length === 0) {
      var lineRegex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:[,.]\d{3})?)\s*-\s*([^-]+?)\s*-\s*(DEBUG|INFO|WARNING|ERROR|CRITICAL|WARN|TRACE)\s*-\s*([\s\S]*)$/;
      var levelMap: Record<string, string> = {
        warn: "warning",
        warning: "warning",
        error: "error",
        critical: "critical",
        info: "info",
        debug: "debug",
        trace: "debug",
      };

      var current: any = null;
      for (var i = 0; i < rawLines.length; i += 1) {
        var line = rawLines[i] || "";
        var m = line.match(lineRegex);
        if (m) {
          if (current) entries.push(current);
          var lvlRaw = (m[3] || "").trim().toLowerCase();
          current = {
            timestamp: (m[1] || "").trim(),
            logger: (m[2] || "").trim(),
            level: levelMap[lvlRaw] || "info",
            message: (m[4] || "").trim(),
            details: [],
          };
        } else if (
          current &&
          (line.indexOf(" ") === 0 ||
            line.indexOf("\t") === 0 ||
            /^(Traceback|File \"|\s*\.{3}|\s*at )/.test(line))
        ) {
          current.details.push(line);
        } else if (line.trim().length > 0) {
          if (current) entries.push(current);
          current = { message: line, details: [], level: "info" };
        } else if (current) {
          current.details.push("");
        }
      }
      if (current) entries.push(current);
      }

      // After building entries, apply UI limit AFTER filtering
      const limitCount = limitSelect ? parseInt(limitSelect.value, 10) : 500;
      if (Number.isFinite(limitCount) && limitCount > 0 && entries.length > limitCount) {
        entries = entries.slice(0, limitCount);
      }

      if (entries.length === 0) {
        pre.textContent = "(no logs)";
      } else {
        for (var j = 0; j < entries.length; j += 1) {
          var entry = entries[j];
          var row = document.createElement("div");
          row.className = "log-line";
          if (entry.timestamp) {
            var ts = document.createElement("span");
            ts.className = "log-timestamp";
            ts.textContent = entry.timestamp as string;
            row.appendChild(ts);
            row.appendChild(document.createTextNode(" "));
          }
          if (entry.level) {
            var levelSpan = document.createElement("span");
            levelSpan.className = "log-level badge badge--" + entry.level;
            levelSpan.textContent = String(entry.level || "INFO").toUpperCase();
            row.appendChild(levelSpan);
            row.appendChild(document.createTextNode(" "));
          }
          if (entry.logger) {
            var loggerSpan = document.createElement("span");
            loggerSpan.className = "log-logger";
            loggerSpan.textContent = entry.logger as string;
            row.appendChild(loggerSpan);
            row.appendChild(document.createTextNode(" - "));
          }
          var msg = document.createElement("span");
          msg.className = "log-message";
          msg.textContent = entry.message || "";
          row.appendChild(msg);
          pre.appendChild(row);

          if (entry.details && entry.details.length > 0) {
            var trace = document.createElement("div");
            trace.className = "log-trace";
            trace.textContent = entry.details.join("\n");
            pre.appendChild(trace);
          }
        }
      }
      displayDiv.appendChild(pre);
    }
  };

  const fetchAndRender = (): void => {
    const uiLimit = limitSelect ? parseInt(limitSelect.value, 10) : 500;
    const recent = recentFirstCheckbox ? !!recentFirstCheckbox.checked : true;
    // Request more lines than UI limit so client-side filters don't empty the view
    const requestedLines = (() => {
      if (!Number.isFinite(uiLimit)) return 1000;
      if (uiLimit <= 0) return 5000; // "All" in UI: pull a generous chunk
      const scaled = uiLimit * 10;
      return Math.min(20000, Math.max(scaled, 1000));
    })();
    chrome.runtime.sendMessage({ type: "getLogs", lines: requestedLines, recent }, (response: any) => {
      if (chrome.runtime.lastError) {
        renderLogs("Error: " + chrome.runtime.lastError.message);
        return;
      }
      if (response && response.status === "success") {
        renderLogs(response.data || "");
      } else {
        renderLogs("Error: " + (response?.message || "Failed to fetch logs"));
      }
    });
  };

  refreshBtn?.addEventListener("click", () => {
    persistPrefs();
    fetchAndRender();
  });
  limitSelect?.addEventListener("change", () => {
    persistPrefs();
    fetchAndRender();
  });
  recentFirstCheckbox?.addEventListener("change", () => {
    persistPrefs();
    fetchAndRender();
  });
  filterWerkzeugCheckbox?.addEventListener("change", () => {
    persistPrefs();
    fetchAndRender();
  });

  clearBtn?.addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "clearLogs" }, (response: any) => {
      if (chrome.runtime.lastError) {
        renderLogs("Error: " + chrome.runtime.lastError.message);
        return;
      }
      if (response && response.status === "success") {
        fetchAndRender();
      } else {
        renderLogs("Error: " + (response?.message || "Failed to clear logs"));
      }
    });
  });

  autoCheckbox?.addEventListener("change", () => {
    if (autoTimer) {
      window.clearInterval(autoTimer);
      autoTimer = null;
    }
    if (autoCheckbox.checked) {
      autoTimer = window.setInterval(fetchAndRender, 3000);
    }
    persistPrefs();
  });

  // Initial load
  fetchAndRender();
}

/**
 * Saves the current form settings to storage and server with enhanced visual feedback.
 */
export async function saveSettings(event: Event): Promise<void> {
  event.preventDefault();

  // Validate all fields before saving
  if (!validateAllFields()) {
    setStatus("settings-status", "Please fix validation errors before saving", true);
    return;
  }

  const saveButton = document.getElementById("save-settings") as HTMLButtonElement;
  const originalText = saveButton.innerHTML;

  // Show saving state
  saveButton.disabled = true;
  saveButton.innerHTML = '<span class="btn-icon"></span>Saving...';
  setStatus("settings-status", "Saving settings...", false);

  try {
    // Collect form data
    const formData = new FormData(event.target as HTMLFormElement);

    const config: ServerConfig & Record<string, any> = {
      server_port: parseInt(formData.get("server-port") as string, 10),
      download_dir: formData.get("download-dir") as string,
      debug_mode: formData.get("enable-debug") === "on",
      enable_history: formData.get("enable-history") === "on",
      log_level: formData.get("log-level") as string,
      // Persist console log level from dedicated field if present; else mirror log_level
      console_log_level: ((formData.get("console-log-level") as string) || (formData.get("log-level") as string) || "info") as any,
      yt_dlp_options: {
        format: formData.get("ytdlp-format") as string,
        concurrent_fragments: (() => {
          const raw = formData.get("ytdlp-concurrent-fragments") as string | null;
          const n = raw ? parseInt(raw, 10) : undefined;
          return Number.isFinite(n as any) ? n : undefined;
        })(),
      },
      allow_playlists: formData.get("allow-playlists") === "on",
    };

    // Include env-backed runtime settings
    const logFile = formData.get("log-file") as string | null;
    if (logFile) (config as any).log_file = logFile;
    // Gunicorn UI removed; workers forced to 1 in backend

    // Save to local storage first
    await new Promise<void>((resolve, reject) => {
      chrome.storage.local.set({ serverConfig: config }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
    });

    // Send to server
    const response = await new Promise<any>((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "setConfig", config }, response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });

    if (response && response.status === "success") {
      // Show success state with enhanced visual feedback
      showSaveSuccess();
      setStatus("settings-status", "Settings saved successfully!", false);

      // If changes include restart-required keys, inform the user
      try {
        const changedKeys: string[] = Array.isArray(response.changed_keys)
          ? (response.changed_keys as string[])
          : [];
        const restartKeys = new Set([
          "server_port",
          "server_host",
          "max_concurrent_downloads",
          "log_level",
          "console_log_level",
          "log_path",
        ]);
        const requiresRestart = changedKeys.some(k => restartKeys.has(k));
        if (requiresRestart) {
          setStatus(
            "settings-status",
            "Some changes require a server restart. Click 'Restart Server' below to apply.",
            false,
            6000
          );
        }
      } catch {
        // ignore notification errors
      }

      // Log the successful save
      logger.info(
        "Settings saved successfully",
        { component: "options", operation: "configSave" },
        { config }
      );

      // Persist a normalized copy of config to storage so Options always reloads exact values
      try {
        await new Promise<void>((resolve, reject) => {
          chrome.storage.local.set({ serverConfig: config }, () => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve();
          });
        });
      } catch {
        // swallow
      }
    } else {
      throw new Error(response?.message || "Failed to save settings to server");
    }
  } catch (error) {
    logger.error(
      "Failed to save settings:",
      { component: "options", operation: "configSave" },
      error as any
    );
    setStatus(
      "settings-status",
      "Error saving settings: " + (error instanceof Error ? error.message : "Unknown error"),
      true
    );

    // Show error state
    showSaveError();
  } finally {
    // Restore button state
    saveButton.disabled = false;
    saveButton.innerHTML = originalText;
  }
}

/**
 * Shows enhanced success feedback when settings are saved.
 */
function showSaveSuccess(): void {
  const container = document.querySelector(".settings-container") as HTMLElement;
  if (!container) return;

  // Add success animation class
  container.classList.add("settings-saved");

  // Create success notification
  const notification = document.createElement("div");
  notification.className = "save-notification success";
  notification.innerHTML =
    '<div class="notification-content">' +
    '<span class="notification-icon">Success</span>' +
    '<div class="notification-text">' +
    "<h4>Settings Saved!</h4>" +
    "<p>Your configuration has been updated successfully.</p>" +
    "</div>" +
    "</div>";

  // Add to page
  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.classList.add("show");
  }, 100);

  // Remove after 4 seconds
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 4000);

  // Remove animation class after animation completes
  setTimeout(() => {
    container.classList.remove("settings-saved");
  }, 1000);
}

/**
 * Shows error feedback when settings save fails.
 */
function showSaveError(): void {
  const notification = document.createElement("div");
  notification.className = "save-notification error";
  notification.innerHTML =
    '<div class="notification-content">' +
    '<span class="notification-icon">Error</span>' +
    '<div class="notification-text">' +
    "<h4>Save Failed</h4>" +
    "<p>There was an error saving your settings. Please try again.</p>" +
    "</div>" +
    '<button class="notification-close" onclick="this.parentElement.parentElement.remove()"></button>' +
    "</div>";

  // Add to page
  document.body.appendChild(notification);

  // Animate in
  setTimeout(() => {
    notification.classList.add("show");
  }, 100);

  // Auto-remove after 6 seconds (longer for errors)
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, 6000);
}

/**
 * Opens a folder picker dialog to select the download directory.
 * Provides a fallback for browsers that do not support `showDirectoryPicker`.
 */
// Removed selectDownloadDirectory; chooser removed from UI

/**
 * Sends a request to restart the server.
 */
export function restartServer(): void {
  const restartButton = document.getElementById("restart-server") as HTMLButtonElement;
  if (restartButton) {
    restartButton.disabled = true;
    restartButton.innerHTML = "Restarting...";
  }

  chrome.runtime.sendMessage({ type: "restartServer" }, response => {
    if (restartButton) {
      restartButton.disabled = false;
      restartButton.innerHTML = "Restart Server";
    }

    if (response && response.status === "success") {
      setStatus("settings-status", "Server restarted successfully!");
    } else {
      setStatus(
        "settings-status",
        "Error: " + (response?.message || "Failed to restart server"),
        true
      );
    }
  });
}

/**
 * Loads and renders download errors from history storage
 * @param page Page number for pagination
 * @param perPage Items per page
 */
export async function loadErrorHistory(page = 1, perPage = 25): Promise<void> {
  const { history, totalItems } = await fetchHistory(page, perPage);
  const errorEntries = history.filter(item => item.status === "error");
  const listEl = document.getElementById("error-history-list");
  if (!listEl) return;
  // Render only error entries
  renderHistoryItems(errorEntries, page, perPage, errorEntries.length, listEl);
}

/**
 * Applies the appropriate theme (light/dark) to the options page UI.
 *
 * @param forceTheme - Optional theme to force (light/dark)
 */
export function applyOptionsTheme(forceTheme?: Theme): void {
  const isDark =
    forceTheme === "dark" ||
    (!forceTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);

  // Applying theme

  document.body.classList.toggle("dark-theme", isDark);

  // Update header icon based on theme
  const headerIcon = document.getElementById("options-header-icon") as HTMLImageElement;
  if (headerIcon) {
    const currentSrc = headerIcon.src;
    const isCurrentlyDark = currentSrc.includes("darkicon");
    // Header icon update

    if (isDark !== isCurrentlyDark) {
      const newSrc = currentSrc.replace(
        isCurrentlyDark ? "darkicon48.png" : "icon48.png",
        isDark ? "darkicon48.png" : "icon48.png"
      );
      // Updating icon
      headerIcon.src = newSrc;
    }
  }
}

/**
 * Handles theme toggle button click.
 * Switches between light and dark themes and persists the preference.
 */
export async function handleThemeToggle(): Promise<void> {
  // Theme toggle clicked

  try {
    // Get current theme from storage
    const result = await chrome.storage.local.get("theme");
    const currentTheme = result.theme as Theme | undefined;
    // Current theme from storage

    // Determine new theme
    let newTheme: Theme;
    if (currentTheme === "dark") {
      newTheme = "light";
    } else if (currentTheme === "light") {
      newTheme = "dark";
    } else {
      // If no theme is stored, check system preference and invert it
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      newTheme = systemPrefersDark ? "light" : "dark";
    }

    // New theme will be

    // Save new theme to storage
    await chrome.storage.local.set({ theme: newTheme });

    // Apply the new theme
    applyOptionsTheme(newTheme);

    // Log the theme change
    // Theme changed
  } catch (error) {
    console.error("Error toggling theme:", error);
  }
}

/**
 * Initializes the theme for the options page.
 * Loads the stored theme preference or uses system preference.
 */
export async function initializeOptionsTheme(): Promise<void> {
  try {
    // Get stored theme preference
    const result = await chrome.storage.local.get("theme");
    const storedTheme = result.theme as Theme | undefined;

    if (storedTheme) {
      // Use stored preference
      applyOptionsTheme(storedTheme);
    } else {
      // Use system preference
      applyOptionsTheme();
    }
  } catch (error) {
    console.error("Error initializing theme:", error);
    // Fallback to system preference
    applyOptionsTheme();
  }
}

// Initialize options page when loaded
// In a test environment, DOMContentLoaded may have already fired.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initOptionsPage);
} else if (typeof initOptionsPage === "function") {
  // If used in tests or after page load, init directly
  initOptionsPage();
}
