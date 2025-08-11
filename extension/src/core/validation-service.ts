/**
 * Centralized validation service for the Enhanced Video Downloader extension.
 * Provides consistent validation logic across all components.
 */

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
    // Port validation
    this.validators.set("port", {
      validate: (value: any): ValidationResult => {
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

    // Path validation
    this.validators.set("path", {
      validate: (value: any): ValidationResult => {
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

    // Select validation
    this.validators.set("select", {
      validate: (value: any, context?: { options?: string[] }): ValidationResult => {
        if (!value || value.trim() === "") {
          return { valid: false, error: "Selection is required" };
        }

        if (context?.options && !context.options.includes(value)) {
          return { valid: false, error: "Invalid selection" };
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
}

// Export singleton instance
export const validationService = ValidationService.getInstance();
