/**
 * Ultra-fast Stryker configuration for development workflow
 * @type {import('@stryker-mutator/core').StrykerOptions}
 */
// @ts-nocheck

module.exports = {
  packageManager: "npm",
  reporters: ["clear-text", "progress"],
  testRunner: "jest",
  coverageAnalysis: "off", // Disable coverage analysis for maximum speed
  allowEmpty: true,
  inPlace: true,
  disableTypeChecks: true,
  jest: {
    configFile: "jest.stryker.config.js",
    projectType: "custom",
    enableFindRelatedTests: false,
  },
  // Ultra-minimal scope - only the most critical file
  mutate: [
    "extension/src/background-logic.ts",
    "!extension/src/**/*.test.ts",
    "!extension/src/**/*.spec.ts",
    "!extension/src/**/__tests__/**",
    "!extension/src/types/**",
    "!extension/src/global.d.ts",
  ],
  thresholds: {
    high: 80,
    low: 60,
    break: null, // Disabled for fast testing
  },
  // Ultra-aggressive performance settings
  timeoutMS: 2000, // Very short timeout for faster feedback
  concurrency: 16, // Maximum concurrency for speed
  maxTestRunnerReuse: 200, // Maximum test runner reuse
  ignoreStatic: false, // Disable for speed
  logLevel: "error", // Minimal logging for speed
  tempDirName: ".stryker-fast-tmp",
  symlinkNodeModules: false,
  // Minimal ignore patterns
  ignorePatterns: [
    "**/node_modules/**",
    "**/.venv/**",
    "**/venv/**",
    "**/htmlcov/**",
    "**/coverage/**",
    "**/mutants/**",
    "**/build/**",
    "**/dist/**",
    "**/*.html",
    "**/*.css",
    "**/*.json",
    "**/extension-instrumented/**",
    "**/tmp/**",
    "**/reports/**",
    "**/logs/**",
  ],
  // Performance optimizations
  testRunnerNodeArgs: ["--max-old-space-size=8192"], // 8GB memory
  disableBail: true,
};
