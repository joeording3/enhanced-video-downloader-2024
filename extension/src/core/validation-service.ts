/**
 * Centralized validation service for the Enhanced Video Downloader extension.
 * Provides consistent validation logic across all components.
 */

import { CSS_CLASSES } from "./constants";

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export interface Validator {
  validate(value: any, context?: any): ValidationResult;
}

export interface FieldConfig {
  name: string;
  type: "text" | "number" | "select" | "checkbox" | "url" | "path";
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => ValidationResult;
}

/**
 * Centralized Validation Service
 * Provides consistent validation across all extension components
 */
export class ValidationService {
  private static instance: ValidationService;
  private validators: Map<string, Validator> = new Map();
  private fieldConfigs: Map<string, FieldConfig> = new Map();

  private constructor() {
    this.registerDefaultValidators();
  }

  /**
   * Get the singleton instance of the validation service
   */
  static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  /**
   * Register default validators
   */
  private registerDefaultValidators(): void {
    // Port validation with business logic
    this.validators.set("port", {
      validate: (
        value: any,
        context?: {
          allowRange?: boolean;
          specialPorts?: number[];
          excludePorts?: number[];
          minPort?: number;
          maxPort?: number;
        }
      ): ValidationResult => {
        const port = parseInt(value, 10);

        if (value === "" || value === null || value === undefined) {
          return { valid: false, error: "Port is required" };
        }

        if (isNaN(port)) {
          return { valid: false, error: "Port must be a valid number" };
        }

        // Basic port range validation
        if (port < 1 || port > 65535) {
          return { valid: false, error: "Port must be between 1 and 65535" };
        }

        // Business logic: 9090 is the default server port
        if (port === 9090 && context?.specialPorts?.includes(9090)) {
          return { valid: true, warnings: ["Port 9090 is the default server port"] };
        }

        // Business logic: exclude common conflicting ports
        const commonConflicts = [80, 443, 3000, 5000, 8000, 8080, 9000, 9090];
        const excludePorts = context?.excludePorts || commonConflicts;
        if (excludePorts.includes(port)) {
          return {
            valid: false,
            error: `Port ${port} is commonly used by other services. Consider using a different port.`,
          };
        }

        // Business logic: port range validation
        if (context?.minPort !== undefined && port < context.minPort) {
          return {
            valid: false,
            error: `Port must be at least ${context.minPort}`,
          };
        }

        if (context?.maxPort !== undefined && port > context.maxPort) {
          return {
            valid: false,
            error: `Port must be at most ${context.maxPort}`,
          };
        }

        return { valid: true };
      },
    });

    // URL validation
    this.validators.set("url", {
      validate: (value: any): ValidationResult => {
        if (!value || value.trim() === "") {
          return { valid: false, error: "URL is required" };
        }

        try {
          new URL(value);
          return { valid: true };
        } catch {
          return { valid: false, error: "Invalid URL format" };
        }
      },
    });

    // Path validation with business logic
    this.validators.set("path", {
      validate: (
        value: any,
        context?: {
          requireAbsolute?: boolean;
          allowHomeRelative?: boolean;
          allowedExtensions?: string[];
          maxLength?: number;
        }
      ): ValidationResult => {
        if (!value || value.trim() === "") {
          return { valid: false, error: "Path is required" };
        }

        const path = value.trim();

        // Business logic: path length validation
        if (context?.maxLength !== undefined && path.length > context.maxLength) {
          return {
            valid: false,
            error: `Path is too long (${path.length} characters). Maximum allowed: ${context.maxLength}`,
          };
        }

        // Business logic: absolute path requirement
        if (context?.requireAbsolute && !path.startsWith("/")) {
          return {
            valid: false,
            error: "Absolute path is required (must start with '/')",
          };
        }

        // Business logic: home-relative path support
        if (context?.allowHomeRelative && path.startsWith("~")) {
          // Home directory paths are valid
          return { valid: true };
        }

        // Basic path validation - can be enhanced based on platform
        if (path.includes("..") || path.includes("//")) {
          return { valid: false, error: "Invalid path format" };
        }

        // Business logic: file extension validation
        if (context?.allowedExtensions) {
          const hasValidExtension = context.allowedExtensions.some(ext =>
            path.toLowerCase().endsWith(ext.toLowerCase())
          );
          if (!hasValidExtension) {
            return {
              valid: false,
              error: `File must have one of these extensions: ${context.allowedExtensions.join(
                ", "
              )}`,
            };
          }
        }

        return { valid: true };
      },
    });

    // Number range validation
    this.validators.set("number", {
      validate: (value: any, context?: { min?: number; max?: number }): ValidationResult => {
        const num = parseFloat(value);

        if (isNaN(num)) {
          return { valid: false, error: "Must be a valid number" };
        }

        if (context?.min !== undefined && num < context.min) {
          return {
            valid: false,
            error: `Value must be at least ${context.min}`,
          };
        }

        if (context?.max !== undefined && num > context.max) {
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
      validate: (
        value: any,
        context?: { minLength?: number; maxLength?: number; pattern?: RegExp }
      ): ValidationResult => {
        if (!value || value.trim() === "") {
          return { valid: false, error: "Text is required" };
        }

        const trimmedValue = value.trim();

        if (context?.minLength !== undefined && trimmedValue.length < context.minLength) {
          return {
            valid: false,
            error: `Text must be at least ${context.minLength} characters`,
          };
        }

        if (context?.maxLength !== undefined && trimmedValue.length > context.maxLength) {
          return {
            valid: false,
            error: `Text must be at most ${context.maxLength} characters`,
          };
        }

        if (context?.pattern && !context.pattern.test(trimmedValue)) {
          return { valid: false, error: "Text format is invalid" };
        }

        return { valid: true };
      },
    });

    // Select validation with business logic
    this.validators.set("select", {
      validate: (
        value: any,
        context?: {
          options?: string[];
          formatWhitelist?: string[];
          allowEmpty?: boolean;
          caseSensitive?: boolean;
        }
      ): ValidationResult => {
        if (!value || value.trim() === "") {
          if (context?.allowEmpty) {
            return { valid: true };
          }
          return { valid: false, error: "Selection is required" };
        }

        const trimmedValue = value.trim();

        // Business logic: format whitelist validation
        if (context?.formatWhitelist) {
          const isWhitelisted = context.formatWhitelist.some(format => {
            if (context.caseSensitive) {
              return trimmedValue === format;
            }
            return trimmedValue.toLowerCase() === format.toLowerCase();
          });

          if (!isWhitelisted) {
            return {
              valid: false,
              error: `Invalid format. Allowed formats: ${context.formatWhitelist.join(", ")}`,
            };
          }
        }

        // Business logic: options validation
        if (context?.options) {
          const isValidOption = context.options.some(option => {
            if (context.caseSensitive) {
              return trimmedValue === option;
            }
            return trimmedValue.toLowerCase() === option.toLowerCase();
          });

          if (!isValidOption) {
            return {
              valid: false,
              error: `Invalid selection. Valid options: ${context.options.join(", ")}`,
            };
          }
        }

        return { valid: true };
      },
    });
  }

  /**
   * Register a custom validator
   */
  registerValidator(name: string, validator: Validator): void {
    this.validators.set(name, validator);
  }

  /**
   * Register a field configuration
   */
  registerField(name: string, config: FieldConfig): void {
    this.fieldConfigs.set(name, config);
  }

  /**
   * Validate a value using a specific validator
   */
  validate(validatorName: string, value: any, context?: any): ValidationResult {
    const validator = this.validators.get(validatorName);
    if (!validator) {
      return { valid: true }; // Default to valid if no validator found
    }

    return validator.validate(value, context);
  }

  /**
   * Validate a field using its configuration
   */
  validateField(fieldName: string, value: any): ValidationResult {
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
    const context: any = {};
    if (config.min !== undefined) {
      // For text type, map min/max to minLength/maxLength
      if (config.type === "text") {
        context.minLength = config.min;
      } else {
        context.min = config.min;
      }
    }
    if (config.max !== undefined) {
      // For text type, map min/max to minLength/maxLength
      if (config.type === "text") {
        context.maxLength = config.max;
      } else {
        context.max = config.max;
      }
    }
    if (config.pattern) context.pattern = config.pattern;

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
  validateFields(fields: Record<string, any>): Record<string, ValidationResult> {
    const results: Record<string, ValidationResult> = {};

    for (const [fieldName, value] of Object.entries(fields)) {
      results[fieldName] = this.validateField(fieldName, value);
    }

    return results;
  }

  /**
   * Check if all validations pass
   */
  isValid(results: Record<string, ValidationResult>): boolean {
    return Object.values(results).every(result => result.valid);
  }

  /**
   * Get all validation errors
   */
  getErrors(results: Record<string, ValidationResult>): Record<string, string> {
    const errors: Record<string, string> = {};

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
  configureCommonFields(): void {
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
      customValidator: (value: any) => {
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
      customValidator: (value: any) => {
        const validFormats = ["mp4", "webm", "mkv", "avi"];
        if (!validFormats.includes(value)) {
          return { valid: false, error: "Invalid format" };
        }
        return { valid: true };
      },
    });
  }

  /**
   * Validate port input element (for backward compatibility)
   */
  validatePortInput(input: HTMLInputElement): boolean {
    const result = this.validate("port", input.value);
    if (!result.valid) {
      this.showValidationMessage(input, result.error || "Invalid port");
      input.classList.add(CSS_CLASSES.INVALID);
      input.classList.remove(CSS_CLASSES.VALID);
      return false;
    }

    this.showValidationMessage(input, "Port is valid", "success");
    input.classList.add(CSS_CLASSES.VALID);
    input.classList.remove(CSS_CLASSES.INVALID);
    return true;
  }

  /**
   * Validate folder input element (for backward compatibility)
   */
  validateFolderInput(input: HTMLInputElement): boolean {
    const result = this.validate("path", input.value);
    if (!result.valid) {
      this.showValidationMessage(input, result.error || "Invalid folder path");
      input.classList.add(CSS_CLASSES.INVALID);
      input.classList.remove(CSS_CLASSES.VALID);
      return false;
    }

    this.showValidationMessage(input, "Folder path is valid", "success");
    input.classList.add(CSS_CLASSES.VALID);
    input.classList.remove(CSS_CLASSES.INVALID);
    return true;
  }

  /**
   * Validate format select element (for backward compatibility)
   */
  validateFormatSelect(select: HTMLSelectElement): boolean {
    const result = this.validate("select", select.value, {
      options: ["mp4", "webm", "mkv", "avi"],
    });
    if (!result.valid) {
      this.showValidationMessage(select, result.error || "Invalid format");
      select.classList.add(CSS_CLASSES.INVALID);
      select.classList.remove(CSS_CLASSES.VALID);
      return false;
    }

    this.showValidationMessage(select, "Format is valid", "success");
    select.classList.add(CSS_CLASSES.VALID);
    select.classList.remove(CSS_CLASSES.INVALID);
    return true;
  }

  /**
   * Show validation message for an input element
   */
  private showValidationMessage(
    element: HTMLElement,
    message: string,
    type: "success" | "error" = "error"
  ): void {
    // Find or create validation message element
    let validationElement = element.parentElement?.querySelector(".validation-message");
    if (!validationElement) {
      validationElement = document.createElement("div");
      validationElement.className = "validation-message";
      element.parentElement?.appendChild(validationElement);
    }

    validationElement.textContent = message;
    validationElement.className = `validation-message ${
      type === "success" ? CSS_CLASSES.STATUS_SUCCESS : CSS_CLASSES.STATUS_ERROR
    }`;
  }
}

// Export singleton instance
export const validationService = ValidationService.getInstance();
