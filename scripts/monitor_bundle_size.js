#!/usr/bin/env node

/**
 * Bundle Size Monitoring Script
 * Continuously monitors bundle size and tracks optimization progress
 */

const fs = require("fs");
const path = require("path");

class BundleSizeMonitor {
  constructor() {
    this.distPath = path.join(__dirname, "../extension/dist");
    this.historyFile = path.join(__dirname, "../reports/bundle_size_history.json");
    this.baselineFile = path.join(__dirname, "../reports/bundle_size_baseline.json");
    this.history = this.loadHistory();
    this.baseline = this.loadBaseline();
  }

  loadHistory() {
    try {
      if (fs.existsSync(this.historyFile)) {
        return JSON.parse(fs.readFileSync(this.historyFile, "utf8"));
      }
    } catch (error) {
      console.warn("Could not load history file:", error.message);
    }
    return [];
  }

  loadBaseline() {
    try {
      if (fs.existsSync(this.baselineFile)) {
        return JSON.parse(fs.readFileSync(this.baselineFile, "utf8"));
      }
    } catch (error) {
      console.warn("Could not load baseline file:", error.message);
    }
    return null;
  }

  saveHistory() {
    try {
      fs.mkdirSync(path.dirname(this.historyFile), { recursive: true });
      fs.writeFileSync(this.historyFile, JSON.stringify(this.history, null, 2));
    } catch (error) {
      console.error("Failed to save history:", error.message);
    }
  }

  saveBaseline() {
    try {
      fs.mkdirSync(path.dirname(this.baselineFile), { recursive: true });
      fs.writeFileSync(this.baselineFile, JSON.stringify(this.baseline, null, 2));
    } catch (error) {
      console.error("Failed to save baseline:", error.message);
    }
  }

  analyzeCurrentBundle() {
    const files = [];

    function getFiles(dir) {
      const items = fs.readdirSync(dir);
      items.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          getFiles(fullPath);
        } else if (item.endsWith(".js")) {
          const size = fs.statSync(fullPath).size;
          const relativePath = path.relative(this.distPath, fullPath);
          files.push({
            path: relativePath,
            size,
            formattedSize: this.formatBytes(size),
          });
        }
      });
    }

    getFiles.call(this, this.distPath);

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const timestamp = new Date().toISOString();

    return {
      timestamp,
      totalSize,
      totalFiles: files.length,
      files: files.sort((a, b) => b.size - a.size),
      summary: {
        largeFiles: files.filter(f => f.size > 10 * 1024).length,
        mediumFiles: files.filter(f => f.size > 5 * 1024 && f.size <= 10 * 1024).length,
        smallFiles: files.filter(f => f.size <= 5 * 1024).length,
      }
    };
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  compareWithBaseline(currentAnalysis) {
    if (!this.baseline) {
      console.log("No baseline found. Setting current analysis as baseline.");
      this.baseline = currentAnalysis;
      this.saveBaseline();
      return { isFirstRun: true };
    }

    const sizeDiff = currentAnalysis.totalSize - this.baseline.totalSize;
    const sizeDiffPercent = ((sizeDiff / this.baseline.totalSize) * 100).toFixed(2);
    const isImprovement = sizeDiff < 0;

    return {
      isFirstRun: false,
      sizeDiff,
      sizeDiffPercent,
      isImprovement,
      baselineSize: this.baseline.totalSize,
      currentSize: currentAnalysis.totalSize,
      change: isImprovement ? "decreased" : "increased",
    };
  }

  generateReport(currentAnalysis, comparison) {
    console.log("Bundle Size Monitoring Report");
    console.log("=============================");
    console.log(`Timestamp: ${currentAnalysis.timestamp}`);
    console.log(`Total Size: ${this.formatBytes(currentAnalysis.totalSize)}`);
    console.log(`Total Files: ${currentAnalysis.totalFiles}`);

    if (!comparison.isFirstRun) {
      console.log(`\nChange from Baseline:`);
      console.log(`  Size: ${comparison.change} by ${this.formatBytes(Math.abs(comparison.sizeDiff))}`);
      console.log(`  Percentage: ${comparison.sizeDiffPercent}%`);
      console.log(`  Baseline: ${this.formatBytes(comparison.baselineSize)}`);

      if (comparison.isImprovement) {
        console.log("  ✅ Bundle size improved!");
      } else {
        console.log("  ⚠️  Bundle size increased");
      }
    }

    console.log(`\nFile Breakdown:`);
    console.log(`  Large files (>10KB): ${currentAnalysis.summary.largeFiles}`);
    console.log(`  Medium files (5-10KB): ${currentAnalysis.summary.mediumFiles}`);
    console.log(`  Small files (<5KB): ${currentAnalysis.summary.smallFiles}`);

    console.log(`\nTop 5 Largest Files:`);
    currentAnalysis.files.slice(0, 5).forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.formattedSize.padEnd(10)} ${file.path}`);
    });

    // Add to history
    this.history.push({
      ...currentAnalysis,
      comparison: comparison.isFirstRun ? null : comparison,
    });

    // Keep only last 50 entries
    if (this.history.length > 50) {
      this.history = this.history.slice(-50);
    }

    this.saveHistory();

    return {
      currentAnalysis,
      comparison,
      history: this.history,
    };
  }

  run() {
    const currentAnalysis = this.analyzeCurrentBundle();
    const comparison = this.compareWithBaseline(currentAnalysis);
    const report = this.generateReport(currentAnalysis, comparison);

    // Save detailed report
    const reportPath = path.join(__dirname, "../reports/bundle_monitoring_report.json");
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`\nDetailed report saved to: reports/bundle_monitoring_report.json`);

    return report;
  }
}

if (require.main === module) {
  const monitor = new BundleSizeMonitor();
  monitor.run();
}

module.exports = { BundleSizeMonitor };
