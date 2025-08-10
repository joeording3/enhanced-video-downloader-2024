#!/usr/bin/env node
// @ts-nocheck

const fs = require("fs");
const path = require("path");

// Copy HTML files from ui directory to dist directory
const uiDir = path.join(__dirname, "../extension/ui");
const distDir = path.join(__dirname, "../extension/dist");

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy HTML files
const htmlFiles = ["popup.html", "options.html"];

htmlFiles.forEach(file => {
  const sourcePath = path.join(uiDir, file);
  const destPath = path.join(distDir, file);

  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Copied ${file} to dist directory`);
  } else {
    console.warn(`Warning: ${file} not found in ui directory`);
  }
});

console.log("HTML files copied to dist directory!");
