#!/usr/bin/env node

/**
 * Performance Profiling Script
 * Profiles extension performance and identifies optimization opportunities
 */

const fs = require("fs");
const path = require("path");

function analyzePerformanceHotPaths() {
  const srcPath = path.join(__dirname, "../extension/src");
  const files = [];

  // Get all TypeScript files
  function getTsFiles(dir) {
    const items = fs.readdirSync(dir);
    items.forEach((item) => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        getTsFiles(fullPath);
      } else if (item.endsWith(".ts") && !item.endsWith(".d.ts")) {
        const relativePath = path.relative(srcPath, fullPath);
        files.push(relativePath);
      }
    });
  }

  getTsFiles(srcPath);

  console.log("Performance Analysis\n");

  const performanceIssues = [];
  const hotPaths = [];

  // Analyze each file for performance issues
  files.forEach((file) => {
    const filePath = path.join(srcPath, file);
    const content = fs.readFileSync(filePath, "utf8");

    // Check for common performance issues
    const issues = analyzeFilePerformance(content, file);
    performanceIssues.push(...issues);

    // Identify hot paths (frequently called functions)
    const hotPathIssues = identifyHotPaths(content, file);
    hotPaths.push(...hotPathIssues);
  });

  return { performanceIssues, hotPaths };
}

function analyzeFilePerformance(content, fileName) {
  const issues = [];

  // Check for synchronous operations
  const syncOps = content.match(
    /fs\.readFileSync|fs\.writeFileSync|JSON\.parse|JSON\.stringify/g
  );
  if (syncOps) {
    issues.push({
      file: fileName,
      type: "synchronous_operation",
      description: "Synchronous operations can block the main thread",
      count: syncOps.length,
      examples: syncOps.slice(0, 3),
    });
  }

  // Check for expensive DOM operations
  const domOps = content.match(
    /querySelector|getElementById|getElementsByClassName|innerHTML/g
  );
  if (domOps && domOps.length > 5) {
    issues.push({
      file: fileName,
      type: "expensive_dom_operations",
      description: "Multiple DOM operations can cause performance issues",
      count: domOps.length,
      examples: domOps.slice(0, 3),
    });
  }

  // Check for event listeners without cleanup
  const eventListeners = content.match(/addEventListener/g);
  const removeListeners = content.match(/removeEventListener/g);
  if (
    eventListeners &&
    (!removeListeners || eventListeners.length > removeListeners.length)
  ) {
    issues.push({
      file: fileName,
      type: "memory_leak_risk",
      description: "Event listeners may not be properly cleaned up",
      count: eventListeners.length,
      removed: removeListeners ? removeListeners.length : 0,
    });
  }

  // Check for large loops
  const largeLoops = content.match(/for\s*\([^)]*\)\s*{[^}]*}/g);
  if (largeLoops) {
    issues.push({
      file: fileName,
      type: "large_loops",
      description: "Large loops can impact performance",
      count: largeLoops.length,
    });
  }

  // Check for frequent API calls
  const apiCalls = content.match(
    /fetch|XMLHttpRequest|chrome\.runtime\.sendMessage/g
  );
  if (apiCalls && apiCalls.length > 3) {
    issues.push({
      file: fileName,
      type: "frequent_api_calls",
      description: "Frequent API calls may need caching or debouncing",
      count: apiCalls.length,
    });
  }

  return issues;
}

function identifyHotPaths(content, fileName) {
  const hotPaths = [];

  // Find frequently called functions
  const functionCalls = content.match(/\w+\([^)]*\)/g);
  if (functionCalls) {
    const callCounts = {};
    functionCalls.forEach((call) => {
      const funcName = call.split("(")[0];
      callCounts[funcName] = (callCounts[funcName] || 0) + 1;
    });

    // Identify functions called more than 3 times
    Object.entries(callCounts).forEach(([funcName, count]) => {
      if (count > 3) {
        hotPaths.push({
          file: fileName,
          function: funcName,
          callCount: count,
          type: "frequently_called",
        });
      }
    });
  }

  // Find event handlers (potential hot paths)
  const eventHandlers = content.match(
    /addEventListener\s*\(\s*['"][^'"]*['"]\s*,\s*(\w+)/g
  );
  if (eventHandlers) {
    eventHandlers.forEach((handler) => {
      const funcName = handler.match(/(\w+)\s*\)/)?.[1];
      if (funcName) {
        hotPaths.push({
          file: fileName,
          function: funcName,
          type: "event_handler",
          description: "Event handler - potential hot path",
        });
      }
    });
  }

  return hotPaths;
}

function generatePerformanceReport() {
  console.log("Performance Analysis Report\n");

  const { performanceIssues, hotPaths } = analyzePerformanceHotPaths();

  console.log("Performance Issues:");
  console.log("======================");

  if (performanceIssues.length === 0) {
    console.log("No major performance issues found!");
  } else {
    performanceIssues.forEach((issue) => {
      console.log(`\nFile: ${issue.file}:`);
      console.log(`  Type: ${issue.type}`);
      console.log(`  Description: ${issue.description}`);
      if (issue.count) {
        console.log(`  Count: ${issue.count}`);
      }
      if (issue.examples) {
        console.log(`  Examples: ${issue.examples.join(", ")}`);
      }
    });
  }

  console.log("\nHot Paths:");
  console.log("==============");

  if (hotPaths.length === 0) {
    console.log("No obvious hot paths identified");
  } else {
    hotPaths.forEach((path) => {
      console.log(`\nFile: ${path.file}:`);
      console.log(`  Function: ${path.function}`);
      console.log(`  Type: ${path.type}`);
      if (path.callCount) {
        console.log(`  Call Count: ${path.callCount}`);
      }
      if (path.description) {
        console.log(`  Description: ${path.description}`);
      }
    });
  }

  // Generate optimization recommendations
  const recommendations = [];

  const syncOps = performanceIssues.filter(
    (i) => i.type === "synchronous_operation"
  );
  if (syncOps.length > 0) {
    recommendations.push(
      "Convert synchronous operations to asynchronous where possible"
    );
  }

  const domOps = performanceIssues.filter(
    (i) => i.type === "expensive_dom_operations"
  );
  if (domOps.length > 0) {
    recommendations.push("Cache DOM queries and batch DOM operations");
  }

  const memoryLeaks = performanceIssues.filter(
    (i) => i.type === "memory_leak_risk"
  );
  if (memoryLeaks.length > 0) {
    recommendations.push("Ensure all event listeners are properly cleaned up");
  }

  const apiCalls = performanceIssues.filter(
    (i) => i.type === "frequent_api_calls"
  );
  if (apiCalls.length > 0) {
    recommendations.push("Implement caching and debouncing for API calls");
  }

  const frequentFunctions = hotPaths.filter(
    (p) => p.type === "frequently_called"
  );
  if (frequentFunctions.length > 0) {
    recommendations.push(
      "Optimize frequently called functions with memoization"
    );
  }

  console.log("\nOptimization Recommendations:");
  console.log("================================");
  recommendations.forEach((rec) => {
    console.log(`  • ${rec}`);
  });

  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    performanceIssues,
    hotPaths,
    recommendations,
    summary: {
      totalIssues: performanceIssues.length,
      totalHotPaths: hotPaths.length,
      issueTypes: [...new Set(performanceIssues.map((i) => i.type))],
      hotPathTypes: [...new Set(hotPaths.map((p) => p.type))],
    },
  };

  const reportPath = path.join(__dirname, "../reports/performance_report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log(`\nDetailed report saved to: reports/performance_report.json`);

  return report;
}

function createPerformanceOptimizations() {
  console.log("\nCreating performance optimizations...\n");

  // Create a performance utilities file
  const perfUtilsPath = path.join(
    __dirname,
    "../extension/src/lib/performance-utils.ts"
  );
  const perfUtilsContent = `/**
 * Performance Utilities
 * Optimized functions for better performance
 */

/**
 * Debounce function to limit execution frequency
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function to limit execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(
  func: T
): T {
  const cache = new Map();
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = func(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Batch DOM operations
 */
export class DOMBatcher {
  private operations: (() => void)[] = [];
  private scheduled = false;

  add(operation: () => void): void {
    this.operations.push(operation);
    if (!this.scheduled) {
      this.scheduled = true;
      requestAnimationFrame(() => this.flush());
    }
  }

  private flush(): void {
    this.operations.forEach(op => op());
    this.operations = [];
    this.scheduled = false;
  }
}

/**
 * Cache for expensive operations
 */
export class Cache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private maxAge: number;

  constructor(maxAgeMs: number = 5 * 60 * 1000) {
    this.maxAge = maxAgeMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}
`;

  fs.writeFileSync(perfUtilsPath, perfUtilsContent);
  console.log("Created performance utilities");

  // Create optimized event listener manager
  const eventManagerPath = path.join(
    __dirname,
    "../extension/src/lib/event-manager.ts"
  );
  const eventManagerContent = `/**
 * Event Manager
 * Manages event listeners with automatic cleanup
 */

export class EventManager {
  private listeners: Map<string, { element: Element; type: string; handler: EventListener }> = new Map();

  addListener(
    element: Element,
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions
  ): void {
    const key = \`\${element.tagName}-\${type}-\${Date.now()}\`;
    this.listeners.set(key, { element, type, handler });
    element.addEventListener(type, handler, options);
  }

  removeListener(key: string): void {
    const listener = this.listeners.get(key);
    if (listener) {
      listener.element.removeEventListener(listener.type, listener.handler);
      this.listeners.delete(key);
    }
  }

  removeAllListeners(): void {
    this.listeners.forEach((listener, key) => {
      listener.element.removeEventListener(listener.type, listener.handler);
    });
    this.listeners.clear();
  }

  getListenerCount(): number {
    return this.listeners.size;
  }
}

// Global event manager instance
export const globalEventManager = new EventManager();
`;

  fs.writeFileSync(eventManagerPath, eventManagerContent);
  console.log("Created event manager for automatic cleanup");
}

if (require.main === module) {
  const report = generatePerformanceReport();

  if (report.performanceIssues.length > 0 || report.hotPaths.length > 0) {
    console.log("\nCreating performance optimizations...");
    createPerformanceOptimizations();
  }
}

module.exports = { generatePerformanceReport, createPerformanceOptimizations };
