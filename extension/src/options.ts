/**
 * Options page functionality for the Enhanced Video Downloader extension.
 * Handles extension settings, configuration, and user preferences.
 */

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
    const level = cfg.console_log_level || cfg.log_level || "info";
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
    if (result.serverConfig) {
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
        populateFormFields(response.data);
        logger.debug("Loaded settings from server", { component: "options" });
      } else {
        logger.warn(
          "Could not load settings from server:",
          { component: "options" },
          response?.message as any
        );
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

  // Trigger validation after populating
  validateAllFields();

  // Update info messages to reflect current selections
  const logLevelSelect = document.getElementById("settings-log-level") as HTMLSelectElement;
  const formatSelect = document.getElementById("settings-ytdlp-format") as HTMLSelectElement;

  if (logLevelSelect) {
    updateLogLevelInfo(logLevelSelect);
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

  const folderPickerButton = document.getElementById("settings-folder-picker");
  if (folderPickerButton) {
    folderPickerButton.addEventListener("click", selectDownloadDirectory);
  }

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

  // Check for absolute path (basic check)
  if (!value.startsWith("/") && !value.match(/^[A-Za-z]:/)) {
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
  } else if (fieldName === "ytdlp-format") {
    return validateFormat(field as HTMLSelectElement);
  }

  // Default success for other fields
  showFieldValidation(field, "Field is valid", "success");
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

  if (formatSelect) {
    formatSelect.addEventListener("change", () => updateFormatInfo(formatSelect));
    updateFormatInfo(formatSelect); // Initial update
  }

  if (logLevelSelect) {
    logLevelSelect.addEventListener("change", () => updateLogLevelInfo(logLevelSelect));
    updateLogLevelInfo(logLevelSelect); // Initial update
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
  const textarea = document.getElementById("logViewerTextarea") as HTMLTextAreaElement | null;
  const autoCheckbox = document.getElementById("log-toggle-auto") as HTMLInputElement | null;

  if (!displayDiv && !textarea) {
    return;
  }

  let autoTimer: number | null = null;

  const applyFilters = (text: string): string => {
    let t = text;
    if (filterWerkzeugCheckbox?.checked) {
      t = t
        .split("\n")
        .filter(line => !/werkzeug/i.test(line))
        .join("\n");
    }
    return t;
  };

  const renderLogs = (text: string): void => {
    const filtered = applyFilters(text);
    if (textarea) {
      textarea.value = filtered;
    }
    if (displayDiv) {
      displayDiv.textContent = "";
      const pre = document.createElement("pre");
      pre.textContent = filtered || "(no logs)";
      displayDiv.appendChild(pre);
    }
  };

  const fetchAndRender = (): void => {
    const lines = limitSelect ? parseInt(limitSelect.value, 10) : 500;
    const recent = recentFirstCheckbox ? !!recentFirstCheckbox.checked : true;
    chrome.runtime.sendMessage({ type: "getLogs", lines, recent }, (response: any) => {
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

  refreshBtn?.addEventListener("click", fetchAndRender);
  limitSelect?.addEventListener("change", fetchAndRender);
  recentFirstCheckbox?.addEventListener("change", fetchAndRender);
  filterWerkzeugCheckbox?.addEventListener("change", fetchAndRender);

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

    const config: ServerConfig = {
      server_port: parseInt(formData.get("server-port") as string, 10),
      download_dir: formData.get("download-dir") as string,
      debug_mode: formData.get("enable-debug") === "on",
      enable_history: formData.get("enable-history") === "on",
      log_level: formData.get("log-level") as string,
      console_log_level: "info", // Default console log level
      yt_dlp_options: {
        format: formData.get("ytdlp-format") as string,
      },
      allow_playlists: formData.get("allow-playlists") === "on",
    };

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

      // Log the successful save
      logger.info(
        "Settings saved successfully",
        { component: "options", operation: "configSave" },
        { config }
      );
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
export async function selectDownloadDirectory(): Promise<void> {
  const downloadDirInput = document.getElementById("settings-download-dir") as HTMLInputElement;

  //  showDirectoryPicker is not available on all browsers
  if (!window.showDirectoryPicker) {
    setStatus(
      "settings-status",
      "Your browser does not support directory selection. Please manually enter the path.",
      true
    );
    return;
  }

  try {
    //  showDirectoryPicker is not available on all browsers
    const dirHandle = await window.showDirectoryPicker();
    if (downloadDirInput) {
      // Note: This returns a handle, not a path. For security, browsers don't
      // expose the full path. We'll use the name as a display placeholder.
      // The actual path is handled internally by the browser.
      downloadDirInput.value = dirHandle.name;
      validateFolder(downloadDirInput);

      // Provide user feedback about the limitation
      setStatus(
        "settings-status",
        "Selected folder: " +
          dirHandle.name +
          ". For full compatibility, please manually enter the absolute path to this folder.",
        false
      );
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      logger.info("User aborted directory selection.", {
        component: "options",
        operation: "selectDownloadDirectory",
      });
    } else {
      logger.error("Error selecting directory:", { component: "options" }, error);
      setStatus(
        "settings-status",
        "Failed to select directory. Please manually enter the path.",
        true
      );
    }
  }
}

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
