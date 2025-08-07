/**
 * @type {import('@stryker-mutator/core').StrykerOptions}
 */
// @ts-nocheck

module.exports = {
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "jest",
  coverageAnalysis: "perTest",
  allowEmpty: true,
  inPlace: true,
  disableTypeChecks: true,
  jest: {
    configFile: "jest.config.js",
    projectType: "custom",
    enableFindRelatedTests: false,
  },
  // Comprehensive mutation testing for extension source files
  mutate: [
    "extension/src/**/*.ts",
    "!extension/src/**/*.test.ts",
    "!extension/src/**/*.spec.ts",
    "!extension/src/**/__tests__/**",
    "!extension/src/types/**",
    "!extension/src/global.d.ts",
    "!extension/src/extension-overview.md",
  ],
  thresholds: {
    high: 80,
    low: 60,
    break: 70,
  },
  timeoutMS: 3000, // Shorter timeout for faster feedback
  concurrency: 6, // Higher concurrency for better performance
  maxTestRunnerReuse: 20, // More test runner reuse
  ignoreStatic: true,
  logLevel: "info",
  tempDirName: ".stryker-tmp",
  symlinkNodeModules: false,
  // Use ignorePatterns instead of deprecated files option
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
  ],
};
