#!/usr/bin/env node

/**
 * Frontend Simplification Implementation Script
 * Implements the simplification plan to reduce complexity while maintaining functionality
 */

const fs = require("fs");
const path = require("path");

class FrontendSimplifier {
  constructor() {
    this.srcPath = path.join(__dirname, "../extension/src");
    this.reportsPath = path.join(__dirname, "../reports");
    this.backupPath = path.join(__dirname, "../extension/src/backup");
    this.simplificationReport = [];
  }

  /**
   * Create backup of current state
   */
  createBackup() {
    console.log("Creating backup of current state...");

    try {
      if (!fs.existsSync(this.backupPath)) {
        fs.mkdirSync(this.backupPath, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupDir = path.join(this.backupPath, `pre-simplification-${timestamp}`);
      fs.mkdirSync(backupDir, { recursive: true });

      // Copy all source files
      this.copyDirectory(this.srcPath, backupDir);

      console.log(`✅ Backup created at: ${backupDir}`);
      return backupDir;
    } catch (error) {
      console.error("❌ Failed to create backup:", error.message);
      return null;
    }
  }

  /**
   * Copy directory recursively
   */
  copyDirectory(src, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    const items = fs.readdirSync(src);
    items.forEach(item => {
      const srcPath = path.join(src, item);
      const destPath = path.join(dest, item);

      const stat = fs.statSync(srcPath);
      if (stat.isDirectory()) {
        this.copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    });
  }

  /**
   * Phase 1: Remove Dead Code
   */
  async removeDeadCode() {
    console.log("\n🔍 Phase 1: Removing Dead Code");
    console.log("==================================");

    // Remove unused exports systematically
    await this.removeUnusedExports();

    // Remove unused functions
    await this.removeUnusedFunctions();

    // Remove unused types
    await this.removeUnusedTypes();

    // Clean up unused imports
    await this.cleanupUnusedImports();
  }

  /**
   * Remove unused exports based on tree shaking analysis
   */
  async removeUnusedExports() {
    console.log("\n📦 Removing unused exports...");

    const unusedExports = [
      // Background files
      { file: "background-downloads.ts", exports: [
        "activeDownloads", "queuedDetails", "updateQueueUI", "loadQueueFromStorage",
        "addToQueue", "removeFromQueue", "clearQueue", "updateDownloadStatus",
        "removeCompletedDownload", "getQueueStatus"
      ]},
      { file: "background-queue.ts", exports: [
        "QueueItem", "QueueStatus", "QueueOperationResult", "ConsolidatedQueueManager"
      ]},
      { file: "background-server.ts", exports: [
        "checkServerStatus", "fetchServerConfig", "saveServerConfig",
        "sendDownloadRequest", "getServerStatusWithQueue"
      ]},
      { file: "background.ts", exports: [
        "handleNetworkChange", "_updateQueueAndBadge", "showNotification",
        "broadcastServerStatus", "toggleHistorySetting", "sendDownloadRequest",
        "initializeActionIconTheme", "findServerPort", "checkServerStatus",
        "fetchServerConfig", "log", "warn", "error", "resetServerState", "expectedAppName"
      ]},
      // Content files
      { file: "content-lazy.ts", exports: [
        "lazyLoadContent", "isContentLoaded", "initLazyLoading"
      ]},
      { file: "content.ts", exports: [
        "createOrUpdateButton", "resetButtonPosition", "setButtonHiddenState",
        "isSignificantVideo", "selectPrimaryMediaCandidate", "getButtonState",
        "saveButtonState", "ensureDownloadButtonStyle", "_resetStateForTesting"
      ]},
      // Core files
      { file: "core/constants.ts", exports: [
        "UI_CONSTANTS", "DOM_SELECTORS", "THEME_CONSTANTS", "STATUS_CONSTANTS",
        "ERROR_MESSAGES", "SUCCESS_MESSAGES", "NOTIFICATION_MESSAGES",
        "MIN_PORT", "MAX_PORT", "getTestServerPort", "getTestClientPort",
        "getTestPortRange", "getDockerPort", "isValidPort", "DEFAULT_SERVER_PORT",
        "DEFAULT_CLIENT_PORT", "DEFAULT_DOCKER_PORT", "TEST_SERVER_PORT",
        "TEST_CLIENT_PORT", "PORT_CONFIG", "CURRENT_ENV", "getNotificationMessage",
        "getStorageKey", "getCSSSelector", "getMessageType", "StorageKey",
        "UIConstant", "NetworkConstant", "ConfigConstant", "DOMSelector",
        "CSSClass", "MessageType", "ThemeConstant", "StatusConstant",
        "ErrorMessage", "SuccessMessage", "NotificationMessage", "USED_CONSTANTS"
      ]},
      // Other files
      { file: "options.ts", exports: [
        "updateOptionsServerStatus", "initOptionsPage", "setupAccordion",
        "loadSettings", "populateFormFields", "setupEventListeners",
        "setupValidation", "validatePort", "validateFolder", "validateLogLevel",
        "validateConsoleLogLevel", "validateFormat", "showValidationMessage",
        "setupInfoMessages", "setupTabNavigation", "setupMessageListener",
        "setupLogsUI", "restartServer", "setupHistoryUI", "applyOptionsTheme"
      ]},
      { file: "popup.ts", exports: [
        "DownloadStatus", "setStatus", "updateToggleButtonState",
        "loadAndRenderHistory", "showConfigErrorIfPresent", "createErrorListItem",
        "createGenericListItem", "createQueuedListItem", "createActiveListItem",
        "handleDragStart", "handleDragOver", "handleDragLeave", "handleDrop",
        "handleDragEnd", "updatePopupServerStatus"
      ]}
    ];

    let totalRemoved = 0;

    for (const { file, exports } of unusedExports) {
      const filePath = path.join(this.srcPath, file);
      if (fs.existsSync(filePath)) {
        const removed = await this.removeExportsFromFile(filePath, exports);
        totalRemoved += removed;
        console.log(`  ${file}: Removed ${removed} unused exports`);
      }
    }

    console.log(`\n✅ Total unused exports removed: ${totalRemoved}`);
    this.simplificationReport.push({
      phase: "Phase 1",
      action: "Remove Dead Code",
      result: `Removed ${totalRemoved} unused exports`,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Remove specific exports from a file
   */
  async removeExportsFromFile(filePath, exportsToRemove) {
    try {
      let content = fs.readFileSync(filePath, "utf8");
      let removedCount = 0;

      for (const exportName of exportsToRemove) {
        // Remove named exports
        const namedExportRegex = new RegExp(`export\\s+\\{[^}]*\\b${exportName}\\b[^}]*\\}`, "g");
        if (namedExportRegex.test(content)) {
          content = content.replace(namedExportRegex, (match) => {
            // Remove the specific export from the list
            const newExports = match
              .replace(/export\s*{\s*/, "")
              .replace(/\s*}/, "")
              .split(",")
              .map(exp => exp.trim())
              .filter(exp => exp !== exportName && exp !== "")
              .join(", ");

            return newExports ? `export { ${newExports} }` : "";
          });
          removedCount++;
        }

        // Remove standalone exports
        const standaloneExportRegex = new RegExp(`export\\s+(?:const|function|class|interface|type)\\s+${exportName}\\b[^;]*;?\\s*`, "g");
        if (standaloneExportRegex.test(content)) {
          content = content.replace(standaloneExportRegex, "");
          removedCount++;
        }
      }

      // Clean up empty export statements
      content = content.replace(/export\s*{\s*}\s*;?\s*/g, "");
      content = content.replace(/export\s*{\s*,\s*}\s*;?\s*/g, "");

      if (removedCount > 0) {
        fs.writeFileSync(filePath, content);
      }

      return removedCount;
    } catch (error) {
      console.error(`  ❌ Error processing ${filePath}:`, error.message);
      return 0;
    }
  }

  /**
   * Remove unused functions
   */
  async removeUnusedFunctions() {
    console.log("\n🔧 Removing unused functions...");

    // This would require more sophisticated analysis
    // For now, we'll focus on obvious unused functions
    console.log("  ⚠️  Function removal requires deeper analysis - skipping for now");
  }

  /**
   * Remove unused types
   */
  async removeUnusedTypes() {
    console.log("\n📝 Removing unused types...");

    // Remove unused type definitions
    const unusedTypes = [
      "DownloadOptions", "QueuedItemDetails", "MessageType", "Message",
      "DownloadMessage", "ServerResponse", "QueueMessage", "ReorderQueueMessage"
    ];

    const typesFile = path.join(this.srcPath, "types/index.ts");
    if (fs.existsSync(typesFile)) {
      const removed = await this.removeExportsFromFile(typesFile, unusedTypes);
      console.log(`  types/index.ts: Removed ${removed} unused types`);
    }
  }

  /**
   * Clean up unused imports
   */
  async cleanupUnusedImports() {
    console.log("\n🧹 Cleaning up unused imports...");

    // This would require AST analysis to be fully accurate
    // For now, we'll focus on obvious cleanup
    console.log("  ⚠️  Import cleanup requires AST analysis - skipping for now");
  }

  /**
   * Phase 2: Consolidate Duplicate Logic
   */
  async consolidateDuplicateLogic() {
    console.log("\n🔗 Phase 2: Consolidating Duplicate Logic");
    console.log("==========================================");

    // Consolidate validation logic
    await this.consolidateValidationLogic();

    // Consolidate event handling
    await this.consolidateEventHandling();

    // Consolidate DOM utilities
    await this.consolidateDOMUtilities();
  }

  /**
   * Consolidate validation logic into single service
   */
  async consolidateValidationLogic() {
    console.log("\n✅ Consolidating validation logic...");

    // Create unified validation service
    const validationServicePath = path.join(this.srcPath, "core/validation-service.ts");
    if (fs.existsSync(validationServicePath)) {
      console.log("  📝 Updating validation service with consolidated logic");

      // This would involve merging validation functions from multiple files
      // For now, we'll mark it as planned
      this.simplificationReport.push({
        phase: "Phase 2",
        action: "Consolidate Validation Logic",
        result: "Planned - requires manual consolidation",
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Consolidate event handling patterns
   */
  async consolidateEventHandling() {
    console.log("\n🎯 Consolidating event handling...");

    // This would involve creating a unified event management system
    console.log("  📝 Planned - requires manual consolidation");

    this.simplificationReport.push({
      phase: "Phase 2",
      action: "Consolidate Event Handling",
      result: "Planned - requires manual consolidation",
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Consolidate DOM utilities
   */
  async consolidateDOMUtilities() {
    console.log("\n🌐 Consolidating DOM utilities...");

    // This would involve merging similar DOM manipulation functions
    console.log("  📝 Planned - requires manual consolidation");

    this.simplificationReport.push({
      phase: "Phase 2",
      action: "Consolidate DOM Utilities",
      result: "Planned - requires manual consolidation",
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Phase 3: Simplify File Structure
   */
  async simplifyFileStructure() {
    console.log("\n📁 Phase 3: Simplifying File Structure");
    console.log("========================================");

    // Merge background files
    await this.mergeBackgroundFiles();

    // Merge options files
    await this.mergeOptionsFiles();

    // Merge content files
    await this.mergeContentFiles();
  }

  /**
   * Merge background-related files
   */
  async mergeBackgroundFiles() {
    console.log("\n🔧 Merging background files...");

    const filesToMerge = [
      { source: "background-helpers.ts", target: "background.ts" },
      { source: "background-downloads.ts", target: "background-queue.ts" }
    ];

    for (const { source, target } of filesToMerge) {
      const sourcePath = path.join(this.srcPath, source);
      const targetPath = path.join(this.srcPath, target);

      if (fs.existsSync(sourcePath) && fs.existsSync(targetPath)) {
        console.log(`  📝 Merging ${source} into ${target}`);

        // This would involve careful merging of the files
        // For now, we'll mark it as planned
        this.simplificationReport.push({
          phase: "Phase 3",
          action: `Merge ${source} into ${target}`,
          result: "Planned - requires manual merging",
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Merge options-related files
   */
  async mergeOptionsFiles() {
    console.log("\n⚙️  Merging options files...");

    const sourcePath = path.join(this.srcPath, "options-dynamic.ts");
    const targetPath = path.join(this.srcPath, "options.ts");

    if (fs.existsSync(sourcePath) && fs.existsSync(targetPath)) {
      console.log("  📝 Merging options-dynamic.ts into options.ts");

      this.simplificationReport.push({
        phase: "Phase 3",
        action: "Merge options-dynamic.ts into options.ts",
        result: "Planned - requires manual merging",
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Merge content-related files
   */
  async mergeContentFiles() {
    console.log("\n🎬 Merging content files...");

    const sourcePath = path.join(this.srcPath, "content-lazy.ts");
    const targetPath = path.join(this.srcPath, "content.ts");

    if (fs.existsSync(sourcePath) && fs.existsSync(targetPath)) {
      console.log("  📝 Merging content-lazy.ts into content.ts");

      this.simplificationReport.push({
        phase: "Phase 3",
        action: "Merge content-lazy.ts into content.ts",
        result: "Planned - requires manual merging",
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Generate simplification report
   */
  generateReport() {
    console.log("\n📊 Simplification Report");
    console.log("=========================");

    const reportPath = path.join(this.reportsPath, "frontend_simplification_report.json");

    try {
      fs.mkdirSync(this.reportsPath, { recursive: true });
      fs.writeFileSync(reportPath, JSON.stringify(this.simplificationReport, null, 2));

      console.log(`✅ Report saved to: ${reportPath}`);

      // Display summary
      console.log("\n📋 Summary of Actions:");
      this.simplificationReport.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.action}: ${item.result}`);
      });

    } catch (error) {
      console.error("❌ Failed to save report:", error.message);
    }
  }

  /**
   * Run the complete simplification process
   */
  async run() {
    console.log("🚀 Frontend Simplification Process");
    console.log("===================================");
    console.log("Goal: Reduce complexity by 40-60% while maintaining functionality");
    console.log("");

    // Create backup
    const backupDir = this.createBackup();
    if (!backupDir) {
      console.error("❌ Cannot proceed without backup");
      return;
    }

    try {
      // Phase 1: Remove Dead Code
      await this.removeDeadCode();

      // Phase 2: Consolidate Duplicate Logic
      await this.consolidateDuplicateLogic();

      // Phase 3: Simplify File Structure
      await this.simplifyFileStructure();

      // Generate report
      this.generateReport();

      console.log("\n🎉 Simplification process completed!");
      console.log("📁 Backup available at:", backupDir);
      console.log("\n⚠️  Next Steps:");
      console.log("  1. Review the changes made");
      console.log("  2. Test functionality thoroughly");
      console.log("  3. Complete manual consolidation tasks");
      console.log("  4. Run build to verify improvements");

    } catch (error) {
      console.error("❌ Simplification process failed:", error.message);
      console.log("📁 Restore from backup:", backupDir);
    }
  }
}

if (require.main === module) {
  const simplifier = new FrontendSimplifier();
  simplifier.run();
}

module.exports = { FrontendSimplifier };
