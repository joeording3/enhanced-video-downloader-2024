"use strict";
/**
 * Unit tests for options page UI logic functions
 */
// @ts-nocheck
Object.defineProperty(exports, "__esModule", { value: true });
const options_1 = require("extension/src/options");
// Mock the constants to return a wider port range for testing
jest.mock("../../extension/src/core/constants", () => (Object.assign(Object.assign({}, jest.requireActual("../../extension/src/core/constants")), { getPortRange: jest.fn(() => [5001, 9099]) })));
describe("Options UI Logic Tests", () => {
    beforeEach(() => {
        // Set up DOM elements needed for tests
        document.body.innerHTML =
            '<div id="port-validation" class="validation-message"></div>' +
                '<div id="folder-validation" class="validation-message"></div>' +
                '<div id="log-level-validation" class="validation-message"></div>' +
                '<div id="format-validation" class="validation-message"></div>' +
                '<div class="settings-container">' +
                '<section class="settings-group" data-category="server">' +
                '<h2 class="section-title">Server Configuration</h2>' +
                '<div class="section-content">Server settings content</div>' +
                "</section>" +
                '<section class="settings-group" data-category="download">' +
                '<h2 class="section-title">Download Settings</h2>' +
                '<div class="section-content">Download settings content</div>' +
                "</section>" +
                "</div>";
        // Verify validation elements exist
        expect(document.getElementById("port-validation")).toBeTruthy();
        expect(document.getElementById("folder-validation")).toBeTruthy();
        expect(document.getElementById("log-level-validation")).toBeTruthy();
        expect(document.getElementById("format-validation")).toBeTruthy();
    });
    afterEach(() => {
        document.body.innerHTML = "";
        jest.clearAllTimers();
    });
    describe("Port Validation", () => {
        it("validates empty port as invalid", () => {
            const input = document.createElement("input");
            input.value = "";
            const result = (0, options_1.validatePort)(input);
            expect(result).toBe(false);
            expect(input.classList.contains("invalid")).toBe(true);
            expect(input.classList.contains("valid")).toBe(false);
        });
        it("validates non-numeric port as invalid", () => {
            const input = document.createElement("input");
            input.value = "abc";
            const result = (0, options_1.validatePort)(input);
            expect(result).toBe(false);
            expect(input.classList.contains("invalid")).toBe(true);
        });
        it("validates port below range as invalid", () => {
            const input = document.createElement("input");
            input.value = "1023";
            const result = (0, options_1.validatePort)(input);
            expect(result).toBe(false);
            expect(input.classList.contains("invalid")).toBe(true);
        });
        it("validates port above range as invalid", () => {
            const input = document.createElement("input");
            input.value = "65536";
            const result = (0, options_1.validatePort)(input);
            expect(result).toBe(false);
            expect(input.classList.contains("invalid")).toBe(true);
        });
        it("validates common port with warning", () => {
            const input = document.createElement("input");
            input.value = "8080";
            // Ensure validation element exists
            let validationElement = document.getElementById("port-validation");
            if (!validationElement) {
                validationElement = document.createElement("div");
                validationElement.id = "port-validation";
                validationElement.className = "validation-message";
                document.body.appendChild(validationElement);
            }
            const result = (0, options_1.validatePort)(input);
            // Port 8080 is within the allowed range (5001-9099), so it should be valid
            expect(result).toBe(true);
            expect(input.classList.contains("valid")).toBe(true);
            expect(input.classList.contains("invalid")).toBe(false);
        });
        it("validates valid port with success", () => {
            const input = document.createElement("input");
            input.value = "5001";
            // Ensure validation element exists
            let validationElement = document.getElementById("port-validation");
            if (!validationElement) {
                validationElement = document.createElement("div");
                validationElement.id = "port-validation";
                validationElement.className = "validation-message";
                document.body.appendChild(validationElement);
            }
            const result = (0, options_1.validatePort)(input);
            expect(result).toBe(true);
            expect(input.classList.contains("valid")).toBe(true);
            expect(input.classList.contains("invalid")).toBe(false);
        });
    });
    describe("Folder Validation", () => {
        it("validates empty folder path as invalid", () => {
            const input = document.createElement("input");
            input.value = "";
            const result = (0, options_1.validateFolder)(input);
            expect(result).toBe(false);
            expect(input.classList.contains("invalid")).toBe(true);
        });
        it("validates path with suspicious patterns as invalid", () => {
            const input = document.createElement("input");
            input.value = "/path/../secret";
            const result = (0, options_1.validateFolder)(input);
            expect(result).toBe(false);
            expect(input.classList.contains("invalid")).toBe(true);
        });
        it("validates relative path with warning", () => {
            const input = document.createElement("input");
            input.value = "downloads";
            const result = (0, options_1.validateFolder)(input);
            expect(result).toBe(true);
            expect(input.classList.contains("valid")).toBe(true);
        });
        it("validates absolute Unix path with success", () => {
            const input = document.createElement("input");
            input.value = "/home/user/downloads";
            const result = (0, options_1.validateFolder)(input);
            expect(result).toBe(true);
            expect(input.classList.contains("valid")).toBe(true);
        });
        it("validates absolute Windows path with success", () => {
            const input = document.createElement("input");
            input.value = "C:\\Users\\user\\Downloads";
            const result = (0, options_1.validateFolder)(input);
            expect(result).toBe(true);
            expect(input.classList.contains("valid")).toBe(true);
        });
    });
    describe("Log Level Validation", () => {
        beforeEach(() => {
            // Ensure the validation element exists for each test
            let validationDiv = document.getElementById("log-level-validation");
            if (!validationDiv) {
                validationDiv = document.createElement("div");
                validationDiv.id = "log-level-validation";
                document.body.appendChild(validationDiv);
            }
        });
        it("validates empty log level as invalid", () => {
            const select = document.createElement("select");
            select.value = "";
            const result = (0, options_1.validateLogLevel)(select);
            expect(result).toBe(false);
            expect(select.classList.contains("invalid")).toBe(true);
        });
        it("validates invalid log level as invalid", () => {
            const select = document.createElement("select");
            select.value = "INVALID";
            const result = (0, options_1.validateLogLevel)(select);
            expect(result).toBe(false);
            expect(select.classList.contains("invalid")).toBe(true);
        });
        it("validates ERROR level as valid", () => {
            const select = document.createElement("select");
            select.id = "settings-log-level";
            select.innerHTML = '<option value="ERROR">ERROR</option>';
            select.value = "ERROR";
            const result = (0, options_1.validateLogLevel)(select);
            expect(result).toBe(true);
            expect(select.classList.contains("valid")).toBe(true);
        });
        it("validates INFO level as valid", () => {
            const select = document.createElement("select");
            select.id = "settings-log-level";
            select.innerHTML = '<option value="INFO">INFO</option>';
            select.value = "INFO";
            const result = (0, options_1.validateLogLevel)(select);
            expect(result).toBe(true);
            expect(select.classList.contains("valid")).toBe(true);
        });
        it("validates DEBUG level as valid", () => {
            const select = document.createElement("select");
            select.id = "settings-log-level";
            select.innerHTML = '<option value="DEBUG">DEBUG</option>';
            select.value = "DEBUG";
            const result = (0, options_1.validateLogLevel)(select);
            expect(result).toBe(true);
            expect(select.classList.contains("valid")).toBe(true);
        });
    });
    describe("Format Validation", () => {
        beforeEach(() => {
            // Ensure the validation element exists for each test
            let validationDiv = document.getElementById("format-validation");
            if (!validationDiv) {
                validationDiv = document.createElement("div");
                validationDiv.id = "format-validation";
                document.body.appendChild(validationDiv);
            }
        });
        it("validates empty format as invalid", () => {
            const select = document.createElement("select");
            select.value = "";
            const result = (0, options_1.validateFormat)(select);
            expect(result).toBe(false);
            expect(select.classList.contains("invalid")).toBe(true);
        });
        it("validates invalid format as invalid", () => {
            const select = document.createElement("select");
            select.value = "invalid-format";
            const result = (0, options_1.validateFormat)(select);
            expect(result).toBe(false);
            expect(select.classList.contains("invalid")).toBe(true);
        });
        it("validates bestvideo+bestaudio/best as valid", () => {
            const select = document.createElement("select");
            select.id = "settings-ytdlp-format";
            select.innerHTML =
                '<option value="bestvideo+bestaudio/best">bestvideo+bestaudio/best</option>';
            select.value = "bestvideo+bestaudio/best";
            const result = (0, options_1.validateFormat)(select);
            expect(result).toBe(true);
            expect(select.classList.contains("valid")).toBe(true);
        });
        it("validates best as valid", () => {
            const select = document.createElement("select");
            select.id = "settings-ytdlp-format";
            select.innerHTML = '<option value="best">best</option>';
            select.value = "best";
            const result = (0, options_1.validateFormat)(select);
            expect(result).toBe(true);
            expect(select.classList.contains("valid")).toBe(true);
        });
        it("validates mp4 as valid", () => {
            const select = document.createElement("select");
            select.id = "settings-ytdlp-format";
            select.innerHTML = '<option value="mp4">mp4</option>';
            select.value = "mp4";
            const result = (0, options_1.validateFormat)(select);
            expect(result).toBe(true);
            expect(select.classList.contains("valid")).toBe(true);
        });
        it("validates webm as valid", () => {
            const select = document.createElement("select");
            select.id = "settings-ytdlp-format";
            select.innerHTML = '<option value="webm">webm</option>';
            select.value = "webm";
            const result = (0, options_1.validateFormat)(select);
            expect(result).toBe(true);
            expect(select.classList.contains("valid")).toBe(true);
        });
        it("validates bestaudio[ext=m4a] as valid", () => {
            const select = document.createElement("select");
            select.id = "settings-ytdlp-format";
            select.innerHTML = '<option value="bestaudio[ext=m4a]">bestaudio[ext=m4a]</option>';
            select.value = "bestaudio[ext=m4a]";
            const result = (0, options_1.validateFormat)(select);
            expect(result).toBe(true);
            expect(select.classList.contains("valid")).toBe(true);
        });
        it("validates bestaudio[ext=opus] as valid", () => {
            const select = document.createElement("select");
            select.id = "settings-ytdlp-format";
            select.innerHTML = '<option value="bestaudio[ext=opus]">bestaudio[ext=opus]</option>';
            select.value = "bestaudio[ext=opus]";
            const result = (0, options_1.validateFormat)(select);
            expect(result).toBe(true);
            expect(select.classList.contains("valid")).toBe(true);
        });
    });
    describe("Validation Message Display", () => {
        it("shows validation message with correct class", () => {
            const element = document.getElementById("port-validation");
            (0, options_1.showValidationMessage)(element, "Test message", "error");
            expect(element === null || element === void 0 ? void 0 : element.textContent).toBe("Test message");
            expect(element === null || element === void 0 ? void 0 : element.className).toBe("validation-message error");
        });
        it("handles null element gracefully", () => {
            expect(() => (0, options_1.showValidationMessage)(null, "Test message", "success")).not.toThrow();
        });
        it("auto-hides success messages after timeout", () => {
            jest.useFakeTimers();
            const element = document.getElementById("port-validation");
            (0, options_1.showValidationMessage)(element, "Success message", "success");
            expect(element === null || element === void 0 ? void 0 : element.textContent).toBe("Success message");
            jest.advanceTimersByTime(3000);
            expect(element === null || element === void 0 ? void 0 : element.textContent).toBe("");
            expect(element === null || element === void 0 ? void 0 : element.className).toBe("validation-message");
            jest.useRealTimers();
        });
        it("does not auto-hide error messages", () => {
            jest.useFakeTimers();
            const element = document.getElementById("port-validation");
            (0, options_1.showValidationMessage)(element, "Error message", "error");
            expect(element === null || element === void 0 ? void 0 : element.textContent).toBe("Error message");
            jest.advanceTimersByTime(3000);
            expect(element === null || element === void 0 ? void 0 : element.textContent).toBe("Error message");
            expect(element === null || element === void 0 ? void 0 : element.className).toBe("validation-message error");
            jest.useRealTimers();
        });
        it("does not auto-hide warning messages", () => {
            jest.useFakeTimers();
            const element = document.getElementById("port-validation");
            (0, options_1.showValidationMessage)(element, "Warning message", "warning");
            expect(element === null || element === void 0 ? void 0 : element.textContent).toBe("Warning message");
            jest.advanceTimersByTime(3000);
            expect(element === null || element === void 0 ? void 0 : element.textContent).toBe("Warning message");
            expect(element === null || element === void 0 ? void 0 : element.className).toBe("validation-message warning");
            jest.useRealTimers();
        });
    });
});
