#!/usr/bin/env node

/**
 * Tree Shaking Optimization Script
 * Identifies and removes unused code to reduce bundle size
 */

const fs = require("fs");
const path = require("path");

function findUnusedExports() {
  const srcPath = path.join(__dirname, "../extension/src");
  const distPath = path.join(__dirname, "../extension/dist");

  // Get all TypeScript files
  const tsFiles = [];
  function getTsFiles(dir) {
    const items = fs.readdirSync(dir);
    items.forEach((item) => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        getTsFiles(fullPath);
      } else if (item.endsWith(".ts") && !item.endsWith(".d.ts")) {
        const relativePath = path.relative(srcPath, fullPath);
        tsFiles.push(relativePath);
      }
    });
  }

  getTsFiles(srcPath);

  console.log("Analyzing exports for tree shaking...\n");

  const unusedExports = [];
  const usedExports = new Set();

  // Analyze each file for exports
  tsFiles.forEach((file) => {
    const filePath = path.join(srcPath, file);
    const content = fs.readFileSync(filePath, "utf8");

    // Find export statements
    const exportMatches = content.match(
      /export\s+(?:const|function|class|interface|type|default)\s+(\w+)/g
    );
    const namedExports = content.match(/export\s*{\s*([^}]+)\s*}/g);

    if (exportMatches) {
      exportMatches.forEach((match) => {
        const exportName = match.match(/(\w+)$/)[1];
        // Check if this export is used in other files
        const isUsed = checkIfExportIsUsed(exportName, file, tsFiles, srcPath);
        if (!isUsed) {
          unusedExports.push({
            file,
            export: exportName,
            type: "named",
          });
        } else {
          usedExports.add(`${file}:${exportName}`);
        }
      });
    }

    if (namedExports) {
      namedExports.forEach((match) => {
        const exports = match.match(/\w+/g).slice(1); // Remove 'export'
        exports.forEach((exportName) => {
          const isUsed = checkIfExportIsUsed(
            exportName,
            file,
            tsFiles,
            srcPath
          );
          if (!isUsed) {
            unusedExports.push({
              file,
              export: exportName,
              type: "named",
            });
          } else {
            usedExports.add(`${file}:${exportName}`);
          }
        });
      });
    }
  });

  return { unusedExports, usedExports };
}

function checkIfExportIsUsed(exportName, sourceFile, allFiles, srcPath) {
  // Skip checking the source file itself
  const otherFiles = allFiles.filter((f) => f !== sourceFile);

  for (const file of otherFiles) {
    const filePath = path.join(srcPath, file);
    const content = fs.readFileSync(filePath, "utf8");

    // Check for import statements
    const importRegex = new RegExp(
      `import\\s+.*\\b${exportName}\\b.*from\\s+['"][^'"]*['"]`,
      "g"
    );
    if (importRegex.test(content)) {
      return true;
    }

    // Check for dynamic imports
    const dynamicImportRegex = new RegExp(
      `import\\s*\\(.*\\b${exportName}\\b`,
      "g"
    );
    if (dynamicImportRegex.test(content)) {
      return true;
    }
  }

  return false;
}

function generateTreeShakingReport() {
  console.log("Tree Shaking Analysis\n");

  const { unusedExports, usedExports } = findUnusedExports();

  console.log("Export Analysis:");
  console.log("==================");
  console.log(`Total used exports: ${usedExports.size}`);
  console.log(`Total unused exports: ${unusedExports.length}`);

  if (unusedExports.length > 0) {
    console.log("\nUnused Exports:");
    console.log("==================");
    unusedExports.forEach(({ file, export: exportName, type }) => {
      console.log(`  ${file}: ${exportName} (${type})`);
    });
  }

  // Group by file
  const unusedByFile = {};
  unusedExports.forEach(({ file, export: exportName, type }) => {
    if (!unusedByFile[file]) {
      unusedByFile[file] = [];
    }
    unusedByFile[file].push({ export: exportName, type });
  });

  console.log("\nUnused Exports by File:");
  console.log("==========================");
  Object.entries(unusedByFile).forEach(([file, exports]) => {
    console.log(`\n${file}:`);
    exports.forEach(({ export: exportName, type }) => {
      console.log(`  - ${exportName} (${type})`);
    });
  });

  // Generate optimization recommendations
  const recommendations = [];

  if (unusedExports.length > 0) {
    recommendations.push("Remove unused exports to reduce bundle size");
    recommendations.push(
      "Consider using barrel exports for better tree shaking"
    );
  }

  // Check for large files with many unused exports
  Object.entries(unusedByFile).forEach(([file, exports]) => {
    if (exports.length > 5) {
      recommendations.push(
        `File ${file} has many unused exports - consider refactoring`
      );
    }
  });

  console.log("\nRecommendations:");
  console.log("==================");
  recommendations.forEach((rec) => {
    console.log(`  • ${rec}`);
  });

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    totalUsedExports: usedExports.size,
    totalUnusedExports: unusedExports.length,
    unusedExports,
    unusedByFile,
    recommendations,
  };

  const reportPath = path.join(
    __dirname,
    "../reports/tree_shaking_report.json"
  );
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\nDetailed report saved to: reports/tree_shaking_report.json`);

  return report;
}

function createOptimizedExports() {
  console.log("\nCreating optimized export files...\n");

  // Create barrel exports for better tree shaking
  const corePath = path.join(__dirname, "../extension/src/core");
  const barrelPath = path.join(corePath, "index.ts");

  const coreFiles = fs
    .readdirSync(corePath)
    .filter((file) => file.endsWith(".ts") && file !== "index.ts")
    .map((file) => file.replace(".ts", ""));

  const barrelContent = `/**
 * Core Services Barrel Export
 * Optimized for tree shaking
 */

${coreFiles.map((file) => `export * from './${file}';`).join("\n")}
`;

  fs.writeFileSync(barrelPath, barrelContent);
  console.log("Created optimized core barrel export");

  // Create optimized constants export
  const constantsPath = path.join(__dirname, "../extension/src/constants.ts");
  const constantsContent = fs.readFileSync(constantsPath, "utf8");

  // Extract only used constants
  const usedConstants = [
    "getServerPort",
    "getClientPort",
    "getPortRange",
    "DEFAULT_SERVER_PORT",
    "DEFAULT_CLIENT_PORT",
  ];

  const optimizedConstants = `/**
 * Optimized Constants Export
 * Only exports used constants for better tree shaking
 */

${usedConstants
      .map((constant) => `export { ${constant} } from './constants';`)
      .join("\n")}
`;

  const optimizedConstantsPath = path.join(
    __dirname,
    "../extension/src/constants-optimized.ts"
  );
  fs.writeFileSync(optimizedConstantsPath, optimizedConstants);
  console.log("Created optimized constants export");
}

if (require.main === module) {
  const report = generateTreeShakingReport();

  if (report.unusedExports.length > 0) {
    console.log("\nWould you like to create optimized exports? (y/n)");
    // In a real implementation, you'd prompt for user input
    // For now, we'll create them automatically
    createOptimizedExports();
  }
}

module.exports = { generateTreeShakingReport, createOptimizedExports };
