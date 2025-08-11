//
const { defineConfig, devices } = require("@playwright/test");

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: "./tests/extension",
  testMatch: "**/playwright-e2e.spec.js",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "list",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://127.0.0.1:3000",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects (default: chromium only). Override with EVD_BROWSERS env var, e.g. 'chromium,firefox,webkit' */
  projects: (() => {
    const enabled = (process.env.EVD_BROWSERS || "chromium")
      .split(",")
      .map(b => b.trim().toLowerCase())
      .filter(Boolean);
    /** @type {import('@playwright/test').Project[]} */
    const projects = [];
    if (enabled.includes("chromium")) {
      projects.push({ name: "chromium", use: { ...devices["Desktop Chrome"] } });
    }
    if (enabled.includes("firefox")) {
      projects.push({ name: "firefox", use: { ...devices["Desktop Firefox"] } });
    }
    if (enabled.includes("webkit")) {
      projects.push({ name: "webkit", use: { ...devices["Desktop Safari"] } });
    }
    return projects;
  })(),
});
