#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Simple CSS minification function
function minifyCSS(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "") // Remove comments
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .replace(/\s*{\s*/g, "{") // Remove spaces around braces
    .replace(/\s*}\s*/g, "}") // Remove spaces around braces
    .replace(/\s*:\s*/g, ":") // Remove spaces around colons
    .replace(/\s*;\s*/g, ";") // Remove spaces around semicolons
    .replace(/\s*,\s*/g, ",") // Remove spaces around commas
    .replace(/;\s*}/g, "}") // Remove semicolons before closing braces
    .trim();
}

// Process all CSS files in optimized directory
const optimizedDir = path.join(__dirname, "../extension/ui/optimized");
const minifiedDir = path.join(__dirname, "../extension/ui/minified");
const distDir = path.join(__dirname, "../extension/dist");

// Create minified directory if it doesn't exist
if (!fs.existsSync(minifiedDir)) {
  fs.mkdirSync(minifiedDir, { recursive: true });
}

// Create dist directory if it doesn't exist
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Read and minify each CSS file (skip deprecated styles.css)
const files = fs
  .readdirSync(optimizedDir)
  .filter(file => file.endsWith(".css") && file !== "styles.css");

files.forEach(file => {
  const inputPath = path.join(optimizedDir, file);
  const minifiedPath = path.join(minifiedDir, file);
  const distPath = path.join(distDir, file);

  const css = fs.readFileSync(inputPath, "utf8");
  const minified = minifyCSS(css);

  // Write to minified directory
  fs.writeFileSync(minifiedPath, minified);

  // Copy to dist directory for manifest.json
  fs.writeFileSync(distPath, minified);

  console.log(`Minified ${file}: ${css.length} -> ${minified.length} characters`);
  console.log(`Copied ${file} to dist directory`);
});

console.log("CSS minification and distribution complete!");
