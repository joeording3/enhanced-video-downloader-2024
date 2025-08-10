/**
 * Jest configuration optimized for Stryker mutation testing
 * Based on Jest documentation: https://jestjs.io/docs/getting-started
 */
// @ts-nocheck

module.exports = {
  // Use Stryker-specific node environment for backend logic testing
  testEnvironment: "@stryker-mutator/jest-runner/jest-env/node",

  // Transform TypeScript and JavaScript files
  transform: {
    "^.+\\.ts$": "ts-jest",
    "^.+\\.js$": "babel-jest",
  },

  // Coverage configuration (disable jest's own coverage; Stryker collects per-test coverage)
  coverageProvider: "v8",
  collectCoverage: false,

  // Test patterns - focus on core functionality tests
  testMatch: [
    "**/extension/src/__tests__/background-logic.test.ts",
    "**/extension/src/__tests__/background-helpers.test.ts",
    "**/extension/src/__tests__/core/validation-service.test.ts",
  ],

  // Files and directories to ignore
  testPathIgnorePatterns: [
    "/*.egg-info",
    "/*.env",
    "/*.envrc",
    "/.coverage",
    "/.coverage.*",
    "/.eggs",
    "/.env",
    "/.envrc",
    "/.git",
    "/.github",
    "/.github/actions",
    "/.github/workflows",
    "/.husky",
    "/.hypothesis",
    "/.mypy_cache",
    "/.pytest_cache",
    "/.ruff_cache",
    "/.stryker-tmp",
    "/.venv",
    "/__pycache__",
    "/build",
    "/ci",
    "/coverage",
    "/coverage_html",
    "/dist",
    "/docs/.doctrees",
    "/docs/_build",
    "/etc",
    "/extension-instrumented",
    "/extension/dist",
    "/htmlcov",
    "/logs",
    "/mutants",
    "/node_modules",
    "/package-lock.json",
    "/pnpm-lock.yaml",
    "/reports",
    "/server.lock",
    "/tests/extension/test_extension_ui_e2e.js",
    "/tests/extension/test_extension_ui_e2e.spec.ts",
    "/tests/extension/playwright-e2e.spec.js",
    "/uv.lock",
    "/venv",
    "/yarn.lock",
  ],

  // Collect coverage is disabled for mutation runs
  collectCoverageFrom: ["extension/src/**/*.{js,ts}"],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/tests/",
    "/dist/",
    "/extension-instrumented/",
    "/.vscode/",
    "/.git/",
    "/.venv/",
    "/venv/",
    "/.husky/",
    "/.github/",
    "/server/",
    "types/.*\\.d\\.ts",
  ],

  // Coverage thresholds - set to current levels to prevent regression while allowing gradual improvement
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 49,
      lines: 53,
      statements: 52,
    },
  },

  // Performance optimizations for faster test execution
  maxWorkers: "75%", // Use more CPU cores for faster execution
  workerIdleMemoryLimit: "256MB", // Lower memory limit for faster startup
  testTimeout: 3000,
  bail: 0,

  // Make TypeScript paths work with Jest
  moduleNameMapper: {
    "^extension/(.*)$": "<rootDir>/extension/$1",
    "^extension/src/(.*)$": "<rootDir>/extension/src/$1",
  },

  setupFilesAfterEnv: ["<rootDir>/tests/jest/jest.setup.js", "@testing-library/jest-dom"],

  // Additional performance optimizations
  verbose: false, // Reduce output verbosity
  silent: false, // Keep some output for debugging
  detectOpenHandles: false, // Disable for speed
  forceExit: false,
};
