/**
 * Jest configuration for the Enhanced Video Downloader extension
 */
module.exports = {
  // Use jsdom environment for DOM testing
  testEnvironment: "jsdom",

  // Transform TypeScript and JavaScript files
  transform: {
    "^.+\\.ts$": "ts-jest",
    "^.+\\.js$": "babel-jest",
  },

  // Coverage configuration
  coverageProvider: "babel",

  // Test patterns
  // testMatch: ["**/tests/extension/**/*.js", "**/tests/extension/**/*.ts"],

  // Files and directories to ignore
  testPathIgnorePatterns: [
    "/*.egg-info",
    "/.eggs",
    "/.git",
    "/.github",
    "/.husky",
    "/.mypy_cache",
    "/.pytest_cache",
    "/.ruff_cache",
    "/.stryker-tmp",
    "/.venv",
    "/__pycache__",
    "/build",
    "/coverage",
    "/dist",
    "/etc",
    "/extension-instrumented",
    "/extension/dist",
    "/htmlcov",
    "/logs",
    "/mutants",
    "/node_modules",
    "/server.lock",
    "/tests/extension/test_extension_ui_e2e.js",
    "/tests/extension/test_extension_ui_e2e.spec.ts",
    "/tests/extension/playwright-e2e.spec.js",
    "/venv",
  ],

  // Collect coverage from extension code
  collectCoverage: true,
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

  // Make TypeScript paths work with Jest
  moduleNameMapper: {
    "^extension/(.*)$": "<rootDir>/extension/$1",
    "^extension/src/(.*)$": "<rootDir>/extension/src/$1",
  },

  setupFilesAfterEnv: [
    "<rootDir>/tests/jest/jest.setup.js",
    "@testing-library/jest-dom",
  ],
};
