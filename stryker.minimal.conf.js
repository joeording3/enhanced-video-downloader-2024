/**
 * Minimal Stryker configuration for ultra-fast testing
 * @type {import('@stryker-mutator/core').StrykerOptions}
 */
// @ts-nocheck

module.exports = {
    packageManager: "npm",
    reporters: ["clear-text"],
    testRunner: "jest",
    coverageAnalysis: "off",
    allowEmpty: true,
    inPlace: true,
    disableTypeChecks: true,
      jest: {
    configFile: "jest.stryker.config.js",
    projectType: "custom",
    enableFindRelatedTests: false,
  },
    // Single file testing for maximum speed
    mutate: [
        "extension/src/background-logic.ts",
    ],
    thresholds: {
        high: 80,
        low: 60,
        break: null,
    },
    // Ultra-aggressive settings
    timeoutMS: 1000,
    concurrency: 20,
    maxTestRunnerReuse: 500,
    ignoreStatic: false,
    logLevel: "error",
    tempDirName: ".stryker-minimal-tmp",
    symlinkNodeModules: false,
    ignorePatterns: [
        "**/node_modules/**",
        "**/coverage/**",
        "**/mutants/**",
        "**/build/**",
        "**/dist/**",
    ],
    testRunnerNodeArgs: ["--max-old-space-size=8192"],
    disableBail: true,
};
