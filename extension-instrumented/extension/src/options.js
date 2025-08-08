"use strict";
/**
 * Options page controller for the Enhanced Video Downloader extension.
 * Manages the settings page UI, configuration options, and server communication
 * for the extension's user-configurable settings.
 *
 * @module options
 */
// @ts-nocheck
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOptionsServerStatus = updateOptionsServerStatus;
exports.initOptionsPage = initOptionsPage;
exports.loadSettings = loadSettings;
exports.populateFormFields = populateFormFields;
exports.setupEventListeners = setupEventListeners;
exports.setupValidation = setupValidation;
exports.validatePort = validatePort;
exports.validateFolder = validateFolder;
exports.validateLogLevel = validateLogLevel;
exports.validateFormat = validateFormat;
exports.showValidationMessage = showValidationMessage;
exports.setupInfoMessages = setupInfoMessages;
exports.setupTabNavigation = setupTabNavigation;
exports.setupMessageListener = setupMessageListener;
exports.saveSettings = saveSettings;
exports.selectDownloadDirectory = selectDownloadDirectory;
exports.restartServer = restartServer;
exports.loadErrorHistory = loadErrorHistory;
exports.applyOptionsTheme = applyOptionsTheme;
exports.handleThemeToggle = handleThemeToggle;
exports.initializeOptionsTheme = initializeOptionsTheme;
const utils_1 = require("./lib/utils");
const history_1 = require("./history");
const constants_1 = require("./core/constants");
const setStatus = (elementId, message, isError = false, timeout = 3000) => {
    const statusElement = document.getElementById(elementId);
    if (!statusElement)
        return;
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
function updateOptionsServerStatus(status) {
    const indicator = document.getElementById("server-status-indicator");
    const text = document.getElementById("server-status-text");
    if (indicator && text) {
        // Remove all status classes
        indicator.classList.remove("connected", "disconnected");
        switch (status) {
            case "connected":
                indicator.classList.add("connected");
                text.textContent = "Connected";
                break;
            case "disconnected":
                indicator.classList.add("disconnected");
                text.textContent = "Disconnected";
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
function initOptionsPage() {
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
    loadErrorHistory();
    utils_1.logger.debug("Options page initialized");
}
/**
 * Loads the current settings from storage and populates the form fields.
 * Retrieves configuration from both local storage and the server when available.
 */
function loadSettings() {
    // First try to load from storage
    chrome.storage.local.get(["serverConfig"], result => {
        if (result.serverConfig) {
            populateFormFields(result.serverConfig);
        }
        // Then try to get latest from server
        chrome.runtime.sendMessage({ type: "getConfig" }, response => {
            if (chrome.runtime.lastError) {
                utils_1.logger.error("Error getting config:", chrome.runtime.lastError.message);
                // Do not proceed if there's an error
                return;
            }
            if (response && response.status === "success" && response.data) {
                populateFormFields(response.data);
                utils_1.logger.debug("Loaded settings from server");
            }
            else {
                utils_1.logger.warn("Could not load settings from server:", response === null || response === void 0 ? void 0 : response.message);
            }
        });
    });
}
/**
 * Populates the settings form fields with values from the provided configuration.
 *
 * @param config - The server configuration object
 */
function populateFormFields(config) {
    var _a, _b, _c, _d;
    // Set form field values from config
    const elements = {
        port: document.getElementById("settings-server-port"),
        downloadDir: document.getElementById("settings-download-dir"),
        debugMode: document.getElementById("settings-enable-debug"),
        enableHistory: document.getElementById("settings-enable-history"),
        logLevel: document.getElementById("settings-log-level"),
        ytdlpFormat: document.getElementById("settings-ytdlp-format"),
        allowPlaylists: document.getElementById("settings-allow-playlists"),
    };
    if (elements.port && config.server_port !== undefined && config.server_port !== null) {
        elements.port.value = config.server_port.toString();
    }
    if (elements.downloadDir && config.download_dir) {
        elements.downloadDir.value = config.download_dir;
    }
    if (elements.debugMode) {
        elements.debugMode.checked = (_a = config.debug_mode) !== null && _a !== void 0 ? _a : false;
    }
    if (elements.enableHistory) {
        elements.enableHistory.checked = (_b = config.enable_history) !== null && _b !== void 0 ? _b : true;
    }
    if (elements.logLevel && config.log_level) {
        elements.logLevel.value = config.log_level;
    }
    if (elements.ytdlpFormat && ((_c = config.yt_dlp_options) === null || _c === void 0 ? void 0 : _c.format)) {
        elements.ytdlpFormat.value = config.yt_dlp_options.format;
    }
    if (elements.allowPlaylists) {
        elements.allowPlaylists.checked = (_d = config.allow_playlists) !== null && _d !== void 0 ? _d : false;
    }
    // Trigger validation after populating
    validateAllFields();
    // Update info messages to reflect current selections
    const logLevelSelect = document.getElementById("settings-log-level");
    const formatSelect = document.getElementById("settings-ytdlp-format");
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
function setupEventListeners() {
    const form = document.getElementById("settings-form");
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
                (0, history_1.clearHistoryAndNotify)().catch(error => {
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
                }
                else {
                    setStatus("settings-status", "Error: " + ((response === null || response === void 0 ? void 0 : response.message) || "Failed to resume downloads"), true);
                }
            });
        });
    }
}
/**
 * Sets up comprehensive validation for all form fields with helpful messages.
 */
function setupValidation() {
    // Port validation
    const portInput = document.getElementById("settings-server-port");
    if (portInput) {
        portInput.addEventListener("input", () => validatePort(portInput));
        portInput.addEventListener("blur", () => validatePort(portInput));
    }
    // Download directory validation
    const downloadDirInput = document.getElementById("settings-download-dir");
    if (downloadDirInput) {
        downloadDirInput.addEventListener("input", () => validateFolder(downloadDirInput));
        downloadDirInput.addEventListener("blur", () => validateFolder(downloadDirInput));
    }
    // Log level validation
    const logLevelSelect = document.getElementById("settings-log-level");
    if (logLevelSelect) {
        logLevelSelect.addEventListener("change", () => validateLogLevel(logLevelSelect));
    }
    // Format validation
    const formatSelect = document.getElementById("settings-ytdlp-format");
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
function validatePort(input) {
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
    const [minPort, maxPort] = (0, constants_1.getPortRange)();
    if (port < minPort || port > maxPort) {
        showValidationMessage(validationElement, `Port must be between ${minPort} and ${maxPort}`, "error");
        input.classList.add("invalid");
        input.classList.remove("valid");
        return false;
    }
    // Check for common port conflicts
    const commonPorts = [80, 443, 3000, 5000, 8000, 8080]; // Removed 9000 to allow 9090
    if (commonPorts.includes(port)) {
        showValidationMessage(validationElement, "Port " + port + " is commonly used by other services", "warning");
        input.classList.add("valid");
        input.classList.remove("invalid");
        return true;
    }
    // Special case for our server port
    if (port === 9090) {
        showValidationMessage(validationElement, "Port 9090 is the default server port for this application", "success");
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
function validateFolder(input) {
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
        showValidationMessage(validationElement, "Please provide an absolute path for best compatibility", "warning");
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
function validateLogLevel(select) {
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
function validateFormat(select) {
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
function validateField(field) {
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
        return validatePort(field);
    }
    else if (fieldName === "download-dir") {
        return validateFolder(field);
    }
    else if (fieldName === "log-level") {
        return validateLogLevel(field);
    }
    else if (fieldName === "ytdlp-format") {
        return validateFormat(field);
    }
    // Default success for other fields
    showFieldValidation(field, "Field is valid", "success");
    return true;
}
/**
 * Shows validation message for a specific field.
 */
function showFieldValidation(field, message, type) {
    const fieldId = field.id;
    const validationElement = document.getElementById(fieldId + "-validation");
    if (validationElement) {
        showValidationMessage(validationElement, message, type);
    }
    field.classList.remove("valid", "invalid");
    if (type === "success") {
        field.classList.add("valid");
    }
    else if (type === "error") {
        field.classList.add("invalid");
    }
}
/**
 * Shows validation message in the specified element.
 */
function showValidationMessage(element, message, type) {
    if (!element)
        return;
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
function validateAllFields() {
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
    const portInput = document.getElementById("settings-server-port");
    if (portInput && !validatePort(portInput)) {
        allValid = false;
    }
    const downloadDirInput = document.getElementById("settings-download-dir");
    if (downloadDirInput && !validateFolder(downloadDirInput)) {
        allValid = false;
    }
    const logLevelSelect = document.getElementById("settings-log-level");
    if (logLevelSelect && !validateLogLevel(logLevelSelect)) {
        allValid = false;
    }
    const formatSelect = document.getElementById("settings-ytdlp-format");
    if (formatSelect && !validateFormat(formatSelect)) {
        allValid = false;
    }
    return allValid;
}
/**
 * Sets up dynamic info messages for form fields.
 */
function setupInfoMessages() {
    const formatSelect = document.getElementById("settings-ytdlp-format");
    const logLevelSelect = document.getElementById("settings-log-level");
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
function updateFormatInfo(select) {
    const infoElement = document.getElementById("format-info");
    if (!infoElement)
        return;
    const infoText = infoElement.querySelector(".info-text");
    if (!infoText)
        return;
    const formatInfo = {
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
function updateLogLevelInfo(select) {
    const infoElement = document.getElementById("log-level-info");
    if (!infoElement)
        return;
    const infoText = infoElement.querySelector(".info-text");
    if (!infoText)
        return;
    const levelInfo = {
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
function setupTabNavigation() {
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
                if (content)
                    content.classList.add("active");
            }
        });
    });
}
/**
 * Sets up message listener to handle server discovery notifications.
 */
function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === "serverDiscovered") {
            utils_1.logger.debug("Server discovered notification received, refreshing settings");
            // Refresh settings when server is discovered
            loadSettings();
        }
        else if (message.type === "serverStatusUpdate") {
            updateOptionsServerStatus(message.status);
        }
    });
}
/**
 * Saves the current form settings to storage and server with enhanced visual feedback.
 */
function saveSettings(event) {
    return __awaiter(this, void 0, void 0, function* () {
        event.preventDefault();
        // Validate all fields before saving
        if (!validateAllFields()) {
            setStatus("settings-status", "Please fix validation errors before saving", true);
            return;
        }
        const saveButton = document.getElementById("save-settings");
        const originalText = saveButton.innerHTML;
        // Show saving state
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="btn-icon"></span>Saving...';
        setStatus("settings-status", "Saving settings...", false);
        try {
            // Collect form data
            const formData = new FormData(event.target);
            const config = {
                server_port: parseInt(formData.get("server-port"), 10),
                download_dir: formData.get("download-dir"),
                debug_mode: formData.get("enable-debug") === "on",
                enable_history: formData.get("enable-history") === "on",
                log_level: formData.get("log-level"),
                console_log_level: "info", // Default console log level
                yt_dlp_options: {
                    format: formData.get("ytdlp-format"),
                },
                allow_playlists: formData.get("allow-playlists") === "on",
            };
            // Save to local storage first
            yield new Promise((resolve, reject) => {
                chrome.storage.local.set({ serverConfig: config }, () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    }
                    else {
                        resolve();
                    }
                });
            });
            // Send to server
            const response = yield new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({ type: "setConfig", config }, response => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    }
                    else {
                        resolve(response);
                    }
                });
            });
            if (response && response.status === "success") {
                // Show success state with enhanced visual feedback
                showSaveSuccess();
                setStatus("settings-status", "Settings saved successfully!", false);
                // Log the successful save
                utils_1.logger.log("Settings saved successfully", { config });
            }
            else {
                throw new Error((response === null || response === void 0 ? void 0 : response.message) || "Failed to save settings to server");
            }
        }
        catch (error) {
            utils_1.logger.error("Failed to save settings:", error);
            setStatus("settings-status", "Error saving settings: " + (error instanceof Error ? error.message : "Unknown error"), true);
            // Show error state
            showSaveError();
        }
        finally {
            // Restore button state
            saveButton.disabled = false;
            saveButton.innerHTML = originalText;
        }
    });
}
/**
 * Shows enhanced success feedback when settings are saved.
 */
function showSaveSuccess() {
    const container = document.querySelector(".settings-container");
    if (!container)
        return;
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
function showSaveError() {
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
function selectDownloadDirectory() {
    return __awaiter(this, void 0, void 0, function* () {
        const downloadDirInput = document.getElementById("settings-download-dir");
        //  showDirectoryPicker is not available on all browsers
        if (!window.showDirectoryPicker) {
            setStatus("settings-status", "Your browser does not support directory selection. Please manually enter the path.", true);
            return;
        }
        try {
            //  showDirectoryPicker is not available on all browsers
            const dirHandle = yield window.showDirectoryPicker();
            if (downloadDirInput) {
                // Note: This returns a handle, not a path. For security, browsers don't
                // expose the full path. We'll use the name as a display placeholder.
                // The actual path is handled internally by the browser.
                downloadDirInput.value = dirHandle.name;
                validateFolder(downloadDirInput);
                // Provide user feedback about the limitation
                setStatus("settings-status", "Selected folder: " +
                    dirHandle.name +
                    ". For full compatibility, please manually enter the absolute path to this folder.", false);
            }
        }
        catch (error) {
            if (error instanceof DOMException && error.name === "AbortError") {
                utils_1.logger.log("User aborted directory selection.");
            }
            else {
                utils_1.logger.error("Error selecting directory:", error);
                setStatus("settings-status", "Failed to select directory. Please manually enter the path.", true);
            }
        }
    });
}
/**
 * Sends a request to restart the server.
 */
function restartServer() {
    const restartButton = document.getElementById("restart-server");
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
        }
        else {
            setStatus("settings-status", "Error: " + ((response === null || response === void 0 ? void 0 : response.message) || "Failed to restart server"), true);
        }
    });
}
/**
 * Loads and renders download errors from history storage
 * @param page Page number for pagination
 * @param perPage Items per page
 */
function loadErrorHistory() {
    return __awaiter(this, arguments, void 0, function* (page = 1, perPage = 25) {
        const { history, totalItems } = yield (0, history_1.fetchHistory)(page, perPage);
        const errorEntries = history.filter(item => item.status === "error");
        const listEl = document.getElementById("error-history-list");
        if (!listEl)
            return;
        // Render only error entries
        (0, history_1.renderHistoryItems)(errorEntries, page, perPage, errorEntries.length, listEl);
    });
}
/**
 * Applies the appropriate theme (light/dark) to the options page UI.
 *
 * @param forceTheme - Optional theme to force (light/dark)
 */
function applyOptionsTheme(forceTheme) {
    const isDark = forceTheme === "dark" ||
        (!forceTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    // Applying theme
    document.body.classList.toggle("dark-theme", isDark);
    // Update header icon based on theme
    const headerIcon = document.getElementById("options-header-icon");
    if (headerIcon) {
        const currentSrc = headerIcon.src;
        const isCurrentlyDark = currentSrc.includes("darkicon");
        // Header icon update
        if (isDark !== isCurrentlyDark) {
            const newSrc = currentSrc.replace(isCurrentlyDark ? "darkicon48.png" : "icon48.png", isDark ? "darkicon48.png" : "icon48.png");
            // Updating icon
            headerIcon.src = newSrc;
        }
    }
}
/**
 * Handles theme toggle button click.
 * Switches between light and dark themes and persists the preference.
 */
function handleThemeToggle() {
    return __awaiter(this, void 0, void 0, function* () {
        // Theme toggle clicked
        try {
            // Get current theme from storage
            const result = yield chrome.storage.local.get("theme");
            const currentTheme = result.theme;
            // Current theme from storage
            // Determine new theme
            let newTheme;
            if (currentTheme === "dark") {
                newTheme = "light";
            }
            else if (currentTheme === "light") {
                newTheme = "dark";
            }
            else {
                // If no theme is stored, check system preference and invert it
                const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                newTheme = systemPrefersDark ? "light" : "dark";
            }
            // New theme will be
            // Save new theme to storage
            yield chrome.storage.local.set({ theme: newTheme });
            // Apply the new theme
            applyOptionsTheme(newTheme);
            // Log the theme change
            // Theme changed
        }
        catch (error) {
            console.error("Error toggling theme:", error);
        }
    });
}
/**
 * Initializes the theme for the options page.
 * Loads the stored theme preference or uses system preference.
 */
function initializeOptionsTheme() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Get stored theme preference
            const result = yield chrome.storage.local.get("theme");
            const storedTheme = result.theme;
            if (storedTheme) {
                // Use stored preference
                applyOptionsTheme(storedTheme);
            }
            else {
                // Use system preference
                applyOptionsTheme();
            }
        }
        catch (error) {
            console.error("Error initializing theme:", error);
            // Fallback to system preference
            applyOptionsTheme();
        }
    });
}
// Initialize options page when loaded
// In a test environment, DOMContentLoaded may have already fired.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOptionsPage);
}
else if (typeof initOptionsPage === "function") {
    // If used in tests or after page load, init directly
    initOptionsPage();
}
