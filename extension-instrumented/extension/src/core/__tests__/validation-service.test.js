// @ts-nocheck
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validation_service_1 = require("../validation-service");
describe("Validation Service Tests", () => {
    let validationService;
    beforeEach(() => {
        validationService = validation_service_1.ValidationService.getInstance();
    });
    describe("Port Validation", () => {
        it("should validate valid ports", () => {
            const validPorts = ["8080", "3000", "65535", "1"];
            validPorts.forEach((port) => {
                const result = validationService.validate("port", port);
                expect(result.valid).toBe(true);
            });
        });
        it("should reject invalid ports", () => {
            const invalidPorts = ["0", "65536", "abc", "-1"];
            invalidPorts.forEach((port) => {
                const result = validationService.validate("port", port);
                expect(result.valid).toBe(false);
                expect(result.error).toBeDefined();
            });
        });
        it("should handle empty port values", () => {
            const result = validationService.validate("port", "");
            expect(result.valid).toBe(false);
            expect(result.error).toBe("Port is required");
        });
    });
    describe("URL Validation", () => {
        it("should validate valid URLs", () => {
            const validUrls = [
                "https://example.com",
                "http://localhost:3000",
                "ftp://files.example.com",
            ];
            validUrls.forEach((url) => {
                const result = validationService.validate("url", url);
                expect(result.valid).toBe(true);
            });
        });
        it("should reject invalid URLs", () => {
            const invalidUrls = ["not-a-url", "http://", "ftp://"];
            invalidUrls.forEach((url) => {
                const result = validationService.validate("url", url);
                expect(result.valid).toBe(false);
                expect(result.error).toBe("Invalid URL format");
            });
        });
        it("should handle empty URL values", () => {
            const result = validationService.validate("url", "");
            expect(result.valid).toBe(false);
            expect(result.error).toBe("URL is required");
        });
    });
    describe("Path Validation", () => {
        it("should validate valid paths", () => {
            const validPaths = ["/home/user", "C:\\Users\\user", "./relative/path"];
            validPaths.forEach((path) => {
                const result = validationService.validate("path", path);
                expect(result.valid).toBe(true);
            });
        });
        it("should reject invalid paths", () => {
            const invalidPaths = ["path/../", "path//", "path/.."];
            invalidPaths.forEach((path) => {
                const result = validationService.validate("path", path);
                expect(result.valid).toBe(false);
                expect(result.error).toBe("Invalid path format");
            });
        });
        it("should handle empty path values", () => {
            const result = validationService.validate("path", "");
            expect(result.valid).toBe(false);
            expect(result.error).toBe("Path is required");
        });
    });
    describe("Field Validation", () => {
        beforeEach(() => {
            // Register test fields
            validationService.registerField("required-field", {
                name: "Required Field",
                type: "text",
                required: true,
            });
            validationService.registerField("length-field", {
                name: "Length Field",
                type: "text",
                required: true,
                customValidator: (value) => {
                    const trimmedValue = value.trim();
                    if (trimmedValue.length < 3) {
                        return {
                            valid: false,
                            error: "Text must be at least 3 characters",
                        };
                    }
                    if (trimmedValue.length > 10) {
                        return {
                            valid: false,
                            error: "Text must be at most 10 characters",
                        };
                    }
                    return { valid: true };
                },
            });
            validationService.registerField("pattern-field", {
                name: "Pattern Field",
                type: "text",
                required: true,
                pattern: /^[A-Za-z]+$/,
            });
        });
        it("should validate required fields", () => {
            const validResult = validationService.validateField("required-field", "value");
            expect(validResult.valid).toBe(true);
            const invalidResult = validationService.validateField("required-field", "");
            expect(invalidResult.valid).toBe(false);
            expect(invalidResult.error).toBe("Required Field is required");
        });
        it("should validate field length", () => {
            const validResult = validationService.validateField("length-field", "valid");
            expect(validResult.valid).toBe(true);
            const tooShortResult = validationService.validateField("length-field", "ab");
            expect(tooShortResult.valid).toBe(false);
            expect(tooShortResult.error).toBe("Text must be at least 3 characters");
            const tooLongResult = validationService.validateField("length-field", "verylongvalue");
            expect(tooLongResult.valid).toBe(false);
            expect(tooLongResult.error).toBe("Text must be at most 10 characters");
        });
        it("should validate field patterns", () => {
            const validResult = validationService.validateField("pattern-field", "abc");
            expect(validResult.valid).toBe(true);
            const invalidResult = validationService.validateField("pattern-field", "abc123");
            expect(invalidResult.valid).toBe(false);
            expect(invalidResult.error).toBe("Text format is invalid");
        });
    });
    describe("Multiple Field Validation", () => {
        beforeEach(() => {
            validationService.registerField("port", {
                name: "Port",
                type: "number",
                required: true,
                min: 1,
                max: 65535,
            });
            validationService.registerField("url", {
                name: "URL",
                type: "url",
                required: true,
            });
            validationService.registerField("path", {
                name: "Path",
                type: "path",
                required: true,
            });
        });
        it("should validate multiple fields", () => {
            const fields = {
                port: "8080",
                url: "https://example.com",
                path: "/home/user",
            };
            const results = validationService.validateFields(fields);
            expect(results.port.valid).toBe(true);
            expect(results.url.valid).toBe(true);
            expect(results.path.valid).toBe(true);
        });
        it("should identify invalid fields", () => {
            const fields = {
                port: "99999", // Invalid port
                url: "not-a-url", // Invalid URL
                path: "path/../", // Invalid path
            };
            const results = validationService.validateFields(fields);
            expect(results.port.valid).toBe(false);
            expect(results.url.valid).toBe(false);
            expect(results.path.valid).toBe(false);
        });
        it("should check overall validity", () => {
            const validFields = {
                port: "8080",
                url: "https://example.com",
                path: "/home/user",
            };
            const invalidFields = {
                port: "99999",
                url: "not-a-url",
                path: "path/../",
            };
            expect(validationService.isValid(validationService.validateFields(validFields))).toBe(true);
            expect(validationService.isValid(validationService.validateFields(invalidFields))).toBe(false);
        });
    });
    describe("Error Handling", () => {
        it("should get error messages", () => {
            const fields = {
                port: "99999",
                url: "not-a-url",
            };
            validationService.registerField("port", {
                name: "Port",
                type: "number",
                required: true,
                min: 1,
                max: 65535,
            });
            validationService.registerField("url", {
                name: "URL",
                type: "url",
                required: true,
            });
            const results = validationService.validateFields(fields);
            const errors = validationService.getErrors(results);
            expect(errors.port).toBeDefined();
            expect(errors.url).toBeDefined();
            expect(errors.port).toBe("Value must be at most 65535");
            expect(errors.url).toBe("Invalid URL format");
        });
        it("should handle unknown validators", () => {
            const result = validationService.validate("unknown-validator", "value");
            expect(result.valid).toBe(true); // Defaults to valid for unknown validators
        });
        it("should handle unknown fields", () => {
            const result = validationService.validateField("unknown-field", "value");
            expect(result.valid).toBe(true); // Defaults to valid for unknown fields
        });
    });
    describe("Custom Validators", () => {
        it("should register custom validators", () => {
            const customValidator = {
                validate: (value) => {
                    if (value === "valid") {
                        return { valid: true };
                    }
                    return { valid: false, error: "Invalid value" };
                },
            };
            validationService.registerValidator("custom", customValidator);
            const validResult = validationService.validate("custom", "valid");
            expect(validResult.valid).toBe(true);
            const invalidResult = validationService.validate("custom", "invalid");
            expect(invalidResult.valid).toBe(false);
            expect(invalidResult.error).toBe("Invalid value");
        });
        it("should use custom field validators", () => {
            validationService.registerField("custom-field", {
                name: "Custom Field",
                type: "text",
                required: true,
                customValidator: (value) => {
                    if (value === "special") {
                        return { valid: true };
                    }
                    return { valid: false, error: "Must be 'special'" };
                },
            });
            const validResult = validationService.validateField("custom-field", "special");
            expect(validResult.valid).toBe(true);
            const invalidResult = validationService.validateField("custom-field", "other");
            expect(invalidResult.valid).toBe(false);
            expect(invalidResult.error).toBe("Must be 'special'");
        });
    });
    describe("Context Validation", () => {
        it("should use context in validation", () => {
            const result = validationService.validate("number", "5", {
                min: 1,
                max: 10,
            });
            expect(result.valid).toBe(true);
            const tooSmallResult = validationService.validate("number", "0", {
                min: 1,
                max: 10,
            });
            expect(tooSmallResult.valid).toBe(false);
            expect(tooSmallResult.error).toBe("Value must be at least 1");
            const tooLargeResult = validationService.validate("number", "15", {
                min: 1,
                max: 10,
            });
            expect(tooLargeResult.valid).toBe(false);
            expect(tooLargeResult.error).toBe("Value must be at most 10");
        });
    });
    describe("Performance", () => {
        it("should handle many validations efficiently", () => {
            const start = performance.now();
            for (let i = 0; i < 1000; i++) {
                validationService.validate("port", "8080");
            }
            const end = performance.now();
            expect(end - start).toBeLessThan(100); // Should complete in under 100ms
        });
        it("should handle large field sets efficiently", () => {
            // Register many fields
            for (let i = 0; i < 100; i++) {
                validationService.registerField(`field-${i}`, {
                    name: `Field ${i}`,
                    type: "text",
                    required: true,
                });
            }
            const fields = {};
            for (let i = 0; i < 100; i++) {
                fields[`field-${i}`] = "value";
            }
            const start = performance.now();
            const results = validationService.validateFields(fields);
            const end = performance.now();
            expect(end - start).toBeLessThan(50); // Should complete in under 50ms
            expect(Object.keys(results)).toHaveLength(100);
        });
    });
    describe("Edge Cases", () => {
        it("should handle null and undefined values", () => {
            const nullResult = validationService.validate("port", null);
            expect(nullResult.valid).toBe(false);
            expect(nullResult.error).toBe("Port is required");
            const undefinedResult = validationService.validate("port", undefined);
            expect(undefinedResult.valid).toBe(false);
            expect(undefinedResult.error).toBe("Port is required");
        });
        it("should handle whitespace-only values", () => {
            const result = validationService.validate("text", "   ", {
                minLength: 1,
            });
            expect(result.valid).toBe(false);
            expect(result.error).toBe("Text is required");
        });
        it("should handle very long values", () => {
            const longValue = "a".repeat(10000);
            const result = validationService.validate("text", longValue, {
                maxLength: 100,
            });
            expect(result.valid).toBe(false);
            expect(result.error).toBe("Text must be at most 100 characters");
        });
    });
});
