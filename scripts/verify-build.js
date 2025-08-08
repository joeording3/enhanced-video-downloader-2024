#!/usr/bin/env node

const fs = require("fs");

// Required files for the extension build
const requiredFiles = [
  // HTML files
  "extension/dist/popup.html",
  "extension/dist/options.html",

  // CSS files
  "extension/dist/content.css",
  "extension/dist/popup.css",
  "extension/dist/options.css",
  "extension/dist/options-logs.css",

  // JavaScript files
  "extension/dist/background.js",
  "extension/dist/content.js",
  "extension/dist/popup.js",
  "extension/dist/options.js",
  "extension/dist/history.js",
  "extension/dist/youtube_enhance.js",
  "extension/dist/background-logic.js",
  "extension/dist/background-helpers.js",

  // Core modules
  "extension/dist/core/constants.js",
  "extension/dist/core/dom-manager.js",
  "extension/dist/core/error-handler.js",
  "extension/dist/core/logger.js",
  "extension/dist/core/state-manager.js",
  "extension/dist/core/validation-service.js",

  // Lib modules
  "extension/dist/lib/event-manager.js",
  "extension/dist/lib/performance-utils.js",
  "extension/dist/lib/utils.js",

  // Types
  "extension/dist/types/index.js",
];

// Icon files
const requiredIcons = [
  "extension/icons/icon16.png",
  "extension/icons/icon48.png",
  "extension/icons/icon128.png",
  "extension/icons/darkicon16.png",
  "extension/icons/darkicon48.png",
  "extension/icons/darkicon128.png",
];

console.log("Verifying extension build...");

let allFilesPresent = true;
const missingFiles = [];

// Check required files
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    missingFiles.push(file);
    allFilesPresent = false;
  }
}

// Check icon files
for (const icon of requiredIcons) {
  if (!fs.existsSync(icon)) {
    missingFiles.push(icon);
    allFilesPresent = false;
  }
}

// Check manifest.json
if (!fs.existsSync("manifest.json")) {
  missingFiles.push("manifest.json");
  allFilesPresent = false;
}

// Report results
if (allFilesPresent) {
  console.log("SUCCESS: All required files are present!");
  console.log(`Found ${requiredFiles.length} extension files`);
  console.log(`Found ${requiredIcons.length} icon files`);
  console.log("Manifest.json is present");
} else {
  console.log("ERROR: Missing required files:");
  missingFiles.forEach(file => console.log(`   - ${file}`));
  process.exit(1);
}

// Additional checks
try {
  // Check if background.js has proper exports
  const backgroundContent = fs.readFileSync("extension/dist/background.js", "utf8");
  if (!backgroundContent.includes("export")) {
    console.log("WARNING: background.js may be missing exports");
  }

  // Check if CSS files are not empty
  const cssFiles = ["content.css", "popup.css", "options.css"];
  for (const cssFile of cssFiles) {
    const cssPath = `extension/dist/${cssFile}`;
    if (fs.existsSync(cssPath)) {
      const content = fs.readFileSync(cssPath, "utf8");
      if (content.trim().length === 0) {
        console.log(`WARNING: ${cssFile} appears to be empty`);
      }
    }
  }

  console.log("SUCCESS: Build verification complete!");
} catch (error) {
  console.log("WARNING: Could not perform additional checks:", error.message);
}
