// @ts-nocheck
// 
// eslint.config.cjs
const { defineConfig } = require("eslint/config");
const js = require("@eslint/js");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const prettierPlugin = require("eslint-plugin-prettier");
const globals = require("globals");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");

module.exports = defineConfig([
  {
    ignores: [
      "**/*.egg-info/",
      "**/*.env",
      "**/*.envrc",
      "**/.coverage",
      "**/.coverage.*",
      "**/.eggs/**",
      "**/.env",
      "**/.envrc",
      "**/.flake8",
      "**/.git/**",
      "**/.github/**",
      "**/.github/actions/**",
      "**/.github/workflows/**",
      "**/.husky/**",
      "**/.hypothesis/**",
      "**/.mypy_cache/**",
      "**/.prettierrc",
      "**/.pytest_cache/**",
      "**/.ruff_cache/**",
      "**/.stryker-tmp/**",
      "**/.stylelintrc.json",
      "**/.venv/**",
      "**/__pycache__/**",
      "**/babel.config.js",
      "**/build/**",
      "**/ci/**",
      "**/coverage/**",
      "**/coverage_html/**",
      "**/dist/**",
      "**/docs/.doctrees/**",
      "**/docs/_build/**",
      "**/eslint.config.cjs",
      "**/etc/**",
      "**/extension-instrumented/**",
      "**/extension/dist/**",
      "**/htmlcov/**",
      "**/jest.config.js",
      "**/logs/**",
      "**/mutants/**",
      "**/mutmut.ini",
      "**/node_modules/**",
      "**/package-lock.json",
      "**/pnpm-lock.yaml",
      "**/pyproject.toml",
      "**/reports/**",
      "**/server.lock",
      "**/stryker.conf.js",
      "**/tsconfig.json",
      "**/uv.lock",
      "**/venv/**",
      "**/yarn.lock",
    ],
  },

  // Base: JS and TS recommended rules + Prettier enforcement
  {
    plugins: {
      "@typescript-eslint": tsPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // JS rules
      ...js.configs.recommended.rules,
      // TS rules
      ...tsPlugin.configs.recommended.rules,
      // Prettier rule
      "prettier/prettier": "error",
      // Turn off base no-unused-vars to avoid conflict with TS version globally
      "no-unused-vars": "off",
      // Allow unused variables in test files
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          vars: "all",
          args: "after-used",
          ignoreRestSiblings: false,
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      // Custom rule: No emojis allowed
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u]",
          message:
            "Emojis are not allowed in code. Use clear, descriptive language instead.",
        },
        {
          selector:
            "TemplateLiteral[quasis.0.value=/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u]",
          message:
            "Emojis are not allowed in template literals. Use clear, descriptive language instead.",
        },
      ],
    },
  },

  // Disable ESLint core rules that conflict with Prettier
  {
    rules: {
      "arrow-parens": "off",
      "comma-dangle": "off",
      "comma-spacing": "off",
      "eol-last": "off",
      "func-call-spacing": "off",
      indent: "off",
      "key-spacing": "off",
      "keyword-spacing": "off",
      "no-extra-semi": "off",
      "object-curly-spacing": "off",
      quotes: "off",
      semi: "off",
      "space-before-function-paren": "off",
      "space-in-parens": "off",
      "space-infix-ops": "off",
    },
  },

  // Global browser + node + chrome globals
  {
    files: ["**/*.{js,mjs,cjs,ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, chrome: true },
    },
  },

  // TS-specific custom rules
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "arrow-body-style": ["error", "as-needed"],
      camelcase: ["error", { properties: "never" }],
    },
  },

  // Configuration for JavaScript files
  {
    files: ["**/*.{js,cjs,mjs}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },

  // Jest test environment for JS tests
  {
    files: ["**/tests/**/*.js"],
    languageOptions: {
      globals: globals.jest,
    },
  },

  // Test-specific rules
  {
    files: ["**/tests/**/*.{js,ts}"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // TypeScript-specific configuration
  {
    files: ["**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        chrome: "readonly",
      },
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // Disable unused variable checks for TS files (handled by plugin rules or code cleanup)
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "prefer-const": "warn",
      "no-console": "off",
      "block-spacing": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
]);
