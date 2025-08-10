#!/usr/bin/env node

/**
 * Bundle Size Analysis Script
 * Analyzes the current bundle sizes and identifies optimization opportunities
 */

const fs = require("fs");
const path = require("path");

function formatBytes(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function analyzeBundleSize() {
  const distPath = path.join(__dirname, "../extension/dist");
  const files = [];

  // Get all JS files
  function getFiles(dir) {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        getFiles(fullPath);
      } else if (item.endsWith(".js")) {
        const size = fs.statSync(fullPath).size;
        const relativePath = path.relative(distPath, fullPath);
        files.push({
          path: relativePath,
          size,
          formattedSize: formatBytes(size),
        });
      }
    });
  }

  getFiles(distPath);

  // Sort by size (largest first)
  files.sort((a, b) => b.size - a.size);

  console.log("Bundle Size Analysis\n");
  console.log("File Size Analysis:");
  console.log("==================");

  let totalSize = 0;
  files.forEach(file => {
    console.log(`${file.formattedSize.padEnd(10)} ${file.path}`);
    totalSize += file.size;
  });

  console.log("\nSummary:");
  console.log("===========");
  console.log(`Total bundle size: ${formatBytes(totalSize)}`);
  console.log(`Number of files: ${files.length}`);

  // Identify large files (>10KB)
  const largeFiles = files.filter(f => f.size > 10 * 1024);
  if (largeFiles.length > 0) {
    console.log("\nLarge files (>10KB):");
    largeFiles.forEach(file => {
      console.log(`  ${file.formattedSize.padEnd(10)} ${file.path}`);
    });
  }

  // Identify optimization opportunities
  console.log("\nOptimization Opportunities:");
  console.log("============================");

  const backgroundSize = files.find(f => f.path === "background.js")?.size || 0;
  const contentSize = files.find(f => f.path === "content.js")?.size || 0;
  const optionsSize = files.find(f => f.path === "options.js")?.size || 0;
  const popupSize = files.find(f => f.path === "popup.js")?.size || 0;

  if (backgroundSize > 30 * 1024) {
    console.log("  • Background script is large - consider code splitting");
  }

  if (contentSize > 20 * 1024) {
    console.log("  • Content script is large - consider lazy loading");
  }

  if (optionsSize > 30 * 1024) {
    console.log("  • Options page is large - consider dynamic imports");
  }

  if (popupSize > 20 * 1024) {
    console.log("  • Popup is large - consider component optimization");
  }

  // Check for duplicate code patterns
  console.log("\nCode Analysis:");
  console.log("================");

  const coreFiles = files.filter(f => f.path.startsWith("core/"));
  const coreSize = coreFiles.reduce((sum, f) => sum + f.size, 0);
  console.log(`Core services size: ${formatBytes(coreSize)}`);

  if (coreSize > totalSize * 0.3) {
    console.log("  • Core services are taking up significant space");
    console.log("  • Consider tree shaking unused exports");
  }

  // Generate optimization report
  const report = {
    timestamp: new Date().toISOString(),
    totalSize,
    totalFiles: files.length,
    largeFiles: largeFiles.map(f => ({ path: f.path, size: f.size })),
    recommendations: [],
  };

  if (backgroundSize > 30 * 1024) {
    report.recommendations.push("Split background script into smaller modules");
  }

  if (contentSize > 20 * 1024) {
    report.recommendations.push("Implement lazy loading for content script");
  }

  if (optionsSize > 30 * 1024) {
    report.recommendations.push("Use dynamic imports for options page");
  }

  if (coreSize > totalSize * 0.3) {
    report.recommendations.push("Implement tree shaking for core services");
  }

  // Save report
  const reportPath = path.join(__dirname, "../reports/bundle_analysis_report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\nReport saved to: reports/bundle_analysis_report.json`);
}

if (require.main === module) {
  analyzeBundleSize();
}

module.exports = { analyzeBundleSize };
