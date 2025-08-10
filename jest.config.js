/**
 * Jest configuration for the Enhanced Video Downloader extension
 */
// @ts-nocheck

// 

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

  // Test patterns - include both source and integration tests, exclude Playwright tests
  testMatch: [
    "**/extension/src/__tests__/**/*.test.ts",
    "**/extension/src/__tests__/**/*.test.js",
    "**/tests/extension/**/*.test.js",
    "**/tests/extension/**/*.test.ts",
    "**/tests/extension/**/*.spec.js",
    "**/tests/extension/**/*.spec.ts",
    "!**/tests/extension/**/*.e2e.*",
    "!**/tests/extension/**/playwright-*",
    "!**/tests/extension/**/test_extension_ui_e2e*",
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
    "/uv.lock",
    "/venv",
    "/yarn.lock",
  ],

  // Collect coverage from extension code
  collectCoverage: true,
  collectCoverageFrom: ["extension/src/**/*.{js,ts}", "!extension/src/global.d.ts"],
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
  maxWorkers: "50%", // Use half of available CPU cores
  workerIdleMemoryLimit: "512MB", // Limit worker memory
  testTimeout: 5000, // 5 second timeout for individual tests

  // Make TypeScript paths work with Jest
  moduleNameMapper: {
    "^extension/(.*)$": "<rootDir>/extension/$1",
    "^extension/src/(.*)$": "<rootDir>/extension/src/$1",
  },

  setupFilesAfterEnv: ["<rootDir>/tests/jest/jest.setup.js", "@testing-library/jest-dom"],
};
