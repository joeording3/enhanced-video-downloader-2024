"use strict";
/**
 * Unit tests for options page UI logic functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
const options_1 = require("extension/src/options");
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
            const result = (0, options_1.validatePort)(input);
            // Port 8080 is outside the allowed range (5001-5099), so it should be invalid
            expect(result).toBe(false);
            expect(input.classList.contains("valid")).toBe(false);
            expect(input.classList.contains("invalid")).toBe(true);
        });
        it("validates valid port with success", () => {
            const input = document.createElement("input");
            input.value = "5001";
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
            select.innerHTML =
                '<option value="bestaudio[ext=m4a]">bestaudio[ext=m4a]</option>';
            select.value = "bestaudio[ext=m4a]";
            const result = (0, options_1.validateFormat)(select);
            expect(result).toBe(true);
            expect(select.classList.contains("valid")).toBe(true);
        });
        it("validates bestaudio[ext=opus] as valid", () => {
            const select = document.createElement("select");
            select.id = "settings-ytdlp-format";
            select.innerHTML =
                '<option value="bestaudio[ext=opus]">bestaudio[ext=opus]</option>';
            select.value = "bestaudio[ext=opus]";
            const result = (0, options_1.validateFormat)(select);
            expect(result).toBe(true);
            expect(select.classList.contains("valid")).toBe(true);
        });
    });
    describe("Search Functionality", () => {
        it("shows all sections when search query is empty", () => {
            const sections = document.querySelectorAll(".settings-group");
            (0, options_1.performSearch)("");
            sections.forEach((section) => {
                expect(section.classList.contains("hidden")).toBe(false);
                expect(section.classList.contains("highlighted")).toBe(false);
            });
        });
        it("hides non-matching sections and highlights matching ones", () => {
            const sections = document.querySelectorAll(".settings-group");
            (0, options_1.performSearch)("server");
            const serverSection = document.querySelector('[data-category="server"]');
            const downloadSection = document.querySelector('[data-category="download"]');
            expect(serverSection === null || serverSection === void 0 ? void 0 : serverSection.classList.contains("hidden")).toBe(false);
            expect(serverSection === null || serverSection === void 0 ? void 0 : serverSection.classList.contains("highlighted")).toBe(true);
            expect(downloadSection === null || downloadSection === void 0 ? void 0 : downloadSection.classList.contains("hidden")).toBe(true);
            expect(downloadSection === null || downloadSection === void 0 ? void 0 : downloadSection.classList.contains("highlighted")).toBe(false);
        });
        it("shows no results message when no sections match", () => {
            (0, options_1.performSearch)("nonexistent");
            const noResultsElement = document.getElementById("no-results-message");
            expect(noResultsElement === null || noResultsElement === void 0 ? void 0 : noResultsElement.style.display).toBe("block");
        });
        it("hides no results message when sections match", () => {
            var _a, _b;
            // First show no results
            (0, options_1.performSearch)("nonexistent");
            expect((_a = document.getElementById("no-results-message")) === null || _a === void 0 ? void 0 : _a.style.display).toBe("block");
            // Then search for something that matches
            (0, options_1.performSearch)("server");
            expect((_b = document.getElementById("no-results-message")) === null || _b === void 0 ? void 0 : _b.style.display).toBe("none");
        });
        it("handles multiple search terms", () => {
            (0, options_1.performSearch)("server configuration");
            const serverSection = document.querySelector('[data-category="server"]');
            expect(serverSection === null || serverSection === void 0 ? void 0 : serverSection.classList.contains("hidden")).toBe(false);
            expect(serverSection === null || serverSection === void 0 ? void 0 : serverSection.classList.contains("highlighted")).toBe(true);
        });
    });
    describe("Text Highlighting", () => {
        it("highlights matching text in section titles", () => {
            const section = document.querySelector('[data-category="server"]');
            const searchTerms = ["server"];
            (0, options_1.highlightMatchingText)(section, searchTerms);
            const titleElement = section.querySelector(".section-title");
            expect(titleElement === null || titleElement === void 0 ? void 0 : titleElement.innerHTML).toContain('<mark class="search-highlight">Server</mark>');
        });
        it("removes existing highlights before adding new ones", () => {
            var _a, _b, _c;
            const section = document.querySelector('[data-category="server"]');
            // Add initial highlight
            (0, options_1.highlightMatchingText)(section, ["server"]);
            expect((_a = section.querySelector(".section-title")) === null || _a === void 0 ? void 0 : _a.innerHTML).toContain('<mark class="search-highlight">Server</mark>');
            // Add new highlight
            (0, options_1.highlightMatchingText)(section, ["configuration"]);
            expect((_b = section.querySelector(".section-title")) === null || _b === void 0 ? void 0 : _b.innerHTML).toContain('<mark class="search-highlight">Configuration</mark>');
            expect((_c = section.querySelector(".section-title")) === null || _c === void 0 ? void 0 : _c.innerHTML).not.toContain('<mark class="search-highlight">Server</mark>');
        });
        it("handles case-insensitive highlighting", () => {
            const section = document.querySelector('[data-category="server"]');
            const searchTerms = ["SERVER"];
            (0, options_1.highlightMatchingText)(section, searchTerms);
            const titleElement = section.querySelector(".section-title");
            expect(titleElement === null || titleElement === void 0 ? void 0 : titleElement.innerHTML).toContain('<mark class="search-highlight">Server</mark>');
        });
        it("does nothing when section has no title", () => {
            const section = document.createElement("div");
            const searchTerms = ["test"];
            // Should not throw an error
            expect(() => (0, options_1.highlightMatchingText)(section, searchTerms)).not.toThrow();
        });
    });
    describe("No Results Message", () => {
        it("creates and shows no results message when show is true", () => {
            (0, options_1.showNoResultsMessage)(true);
            const noResultsElement = document.getElementById("no-results-message");
            expect(noResultsElement).toBeTruthy();
            expect(noResultsElement === null || noResultsElement === void 0 ? void 0 : noResultsElement.style.display).toBe("block");
            expect(noResultsElement === null || noResultsElement === void 0 ? void 0 : noResultsElement.className).toBe("no-results-message");
        });
        it("hides existing no results message when show is false", () => {
            var _a, _b;
            // First create the message
            (0, options_1.showNoResultsMessage)(true);
            expect((_a = document.getElementById("no-results-message")) === null || _a === void 0 ? void 0 : _a.style.display).toBe("block");
            // Then hide it
            (0, options_1.showNoResultsMessage)(false);
            expect((_b = document.getElementById("no-results-message")) === null || _b === void 0 ? void 0 : _b.style.display).toBe("none");
        });
        it("reuses existing no results element", () => {
            // Create message twice
            (0, options_1.showNoResultsMessage)(true);
            const firstElement = document.getElementById("no-results-message");
            (0, options_1.showNoResultsMessage)(false);
            (0, options_1.showNoResultsMessage)(true);
            const secondElement = document.getElementById("no-results-message");
            expect(firstElement).toBe(secondElement);
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
