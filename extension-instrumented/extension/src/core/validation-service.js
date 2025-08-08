"use strict";
/**
 * Enhanced Video Downloader - Centralized Validation Service
 * Provides a single source of truth for all validation logic
 */
// @ts-nocheck
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationService = exports.ValidationService = void 0;
/**
 * Centralized Validation Service
 * Provides consistent validation across all extension components
 */
class ValidationService {
    constructor() {
        this.validators = new Map();
        this.fieldConfigs = new Map();
        this.registerDefaultValidators();
    }
    /**
     * Get the singleton instance of the validation service
     */
    static getInstance() {
        if (!ValidationService.instance) {
            ValidationService.instance = new ValidationService();
        }
        return ValidationService.instance;
    }
    /**
     * Register default validators
     */
    registerDefaultValidators() {
        // Port validation
        this.validators.set("port", {
            validate: (value) => {
                const port = parseInt(value, 10);
                if (value === "" || value === null || value === undefined) {
                    return { valid: false, error: "Port is required" };
                }
                if (isNaN(port)) {
                    return { valid: false, error: "Port must be a valid number" };
                }
                if (port < 1 || port > 65535) {
                    return { valid: false, error: "Port must be between 1 and 65535" };
                }
                return { valid: true };
            },
        });
        // URL validation
        this.validators.set("url", {
            validate: (value) => {
                if (!value || value.trim() === "") {
                    return { valid: false, error: "URL is required" };
                }
                try {
                    new URL(value);
                    return { valid: true };
                }
                catch (_a) {
                    return { valid: false, error: "Invalid URL format" };
                }
            },
        });
        // Path validation
        this.validators.set("path", {
            validate: (value) => {
                if (!value || value.trim() === "") {
                    return { valid: false, error: "Path is required" };
                }
                // Basic path validation - can be enhanced based on platform
                if (value.includes("..") || value.includes("//")) {
                    return { valid: false, error: "Invalid path format" };
                }
                return { valid: true };
            },
        });
        // Number range validation
        this.validators.set("number", {
            validate: (value, context) => {
                const num = parseFloat(value);
                if (isNaN(num)) {
                    return { valid: false, error: "Must be a valid number" };
                }
                if ((context === null || context === void 0 ? void 0 : context.min) !== undefined && num < context.min) {
                    return {
                        valid: false,
                        error: `Value must be at least ${context.min}`,
                    };
                }
                if ((context === null || context === void 0 ? void 0 : context.max) !== undefined && num > context.max) {
                    return {
                        valid: false,
                        error: `Value must be at most ${context.max}`,
                    };
                }
                return { valid: true };
            },
        });
        // Text validation
        this.validators.set("text", {
            validate: (value, context) => {
                if (!value || value.trim() === "") {
                    return { valid: false, error: "Text is required" };
                }
                const trimmedValue = value.trim();
                if ((context === null || context === void 0 ? void 0 : context.minLength) !== undefined && trimmedValue.length < context.minLength) {
                    return {
                        valid: false,
                        error: `Text must be at least ${context.minLength} characters`,
                    };
                }
                if ((context === null || context === void 0 ? void 0 : context.maxLength) !== undefined && trimmedValue.length > context.maxLength) {
                    return {
                        valid: false,
                        error: `Text must be at most ${context.maxLength} characters`,
                    };
                }
                if ((context === null || context === void 0 ? void 0 : context.pattern) && !context.pattern.test(trimmedValue)) {
                    return { valid: false, error: "Text format is invalid" };
                }
                return { valid: true };
            },
        });
        // Select validation
        this.validators.set("select", {
            validate: (value, context) => {
                if (!value || value.trim() === "") {
                    return { valid: false, error: "Selection is required" };
                }
                if ((context === null || context === void 0 ? void 0 : context.options) && !context.options.includes(value)) {
                    return { valid: false, error: "Invalid selection" };
                }
                return { valid: true };
            },
        });
    }
    /**
     * Register a custom validator
     */
    registerValidator(name, validator) {
        this.validators.set(name, validator);
    }
    /**
     * Register a field configuration
     */
    registerField(name, config) {
        this.fieldConfigs.set(name, config);
    }
    /**
     * Validate a value using a specific validator
     */
    validate(validatorName, value, context) {
        const validator = this.validators.get(validatorName);
        if (!validator) {
            return { valid: true }; // Default to valid if no validator found
        }
        return validator.validate(value, context);
    }
    /**
     * Validate a field using its configuration
     */
    validateField(fieldName, value) {
        const config = this.fieldConfigs.get(fieldName);
        if (!config) {
            return { valid: true }; // Default to valid if no config found
        }
        // Check required
        if (config.required && (!value || value.toString().trim() === "")) {
            return { valid: false, error: `${config.name} is required` };
        }
        // If not required and empty, consider valid
        if (!config.required && (!value || value.toString().trim() === "")) {
            return { valid: true };
        }
        // Get the appropriate validator
        const validator = this.validators.get(config.type);
        if (!validator) {
            return { valid: true }; // Default to valid if no validator found
        }
        // Build context for validation
        const context = {};
        if (config.min !== undefined) {
            // For text type, map min/max to minLength/maxLength
            if (config.type === "text") {
                context.minLength = config.min;
            }
            else {
                context.min = config.min;
            }
        }
        if (config.max !== undefined) {
            // For text type, map min/max to minLength/maxLength
            if (config.type === "text") {
                context.maxLength = config.max;
            }
            else {
                context.max = config.max;
            }
        }
        if (config.pattern)
            context.pattern = config.pattern;
        // Run validation
        const result = validator.validate(value, context);
        // Run custom validator if provided
        if (config.customValidator && result.valid) {
            const customResult = config.customValidator(value);
            if (!customResult.valid) {
                return customResult;
            }
        }
        return result;
    }
    /**
     * Validate multiple fields at once
     */
    validateFields(fields) {
        const results = {};
        for (const [fieldName, value] of Object.entries(fields)) {
            results[fieldName] = this.validateField(fieldName, value);
        }
        return results;
    }
    /**
     * Check if all validations pass
     */
    isValid(results) {
        return Object.values(results).every(result => result.valid);
    }
    /**
     * Get all validation errors
     */
    getErrors(results) {
        const errors = {};
        for (const [fieldName, result] of Object.entries(results)) {
            if (!result.valid && result.error) {
                errors[fieldName] = result.error;
            }
        }
        return errors;
    }
    /**
     * Pre-configure common field types
     */
    configureCommonFields() {
        // Port field
        this.registerField("serverPort", {
            name: "Server Port",
            type: "number",
            required: true,
            min: 1,
            max: 65535,
        });
        // Download directory field
        this.registerField("downloadDir", {
            name: "Download Directory",
            type: "path",
            required: true,
        });
        // Log level field
        this.registerField("logLevel", {
            name: "Log Level",
            type: "select",
            required: true,
            customValidator: (value) => {
                const validLevels = ["DEBUG", "INFO", "WARNING", "ERROR"];
                if (!validLevels.includes(value)) {
                    return { valid: false, error: "Invalid log level" };
                }
                return { valid: true };
            },
        });
        // Format field
        this.registerField("format", {
            name: "Format",
            type: "select",
            required: true,
            customValidator: (value) => {
                const validFormats = ["mp4", "webm", "mkv", "avi"];
                if (!validFormats.includes(value)) {
                    return { valid: false, error: "Invalid format" };
                }
                return { valid: true };
            },
        });
    }
}
exports.ValidationService = ValidationService;
// Export singleton instance
exports.validationService = ValidationService.getInstance();
