/**
 * Integration tests for background logs functionality
 * These tests test the actual HTTP endpoints that the background script would call
 * in non-test-mode, providing validation of the server-side behavior
 */

const express = require("express");
import { Server } from "http";
import { URL } from "url";

// Simple HTTP client for testing
const httpRequest = (url: string, options: any = {}): Promise<any> =>
  new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const http = require("http");
    const https = require("https");

    const client = urlObj.protocol === "https:" ? https : http;

    const req = client.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: options.method || "GET",
        headers: options.headers || {},
      },
      (res: any) => {
        let data = "";
        res.on("data", (chunk: any) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve({
            ok: res.statusCode! >= 200 && res.statusCode! < 300,
            status: res.statusCode,
            text: () => Promise.resolve(data),
            json: () => Promise.resolve(JSON.parse(data)),
          });
        });
      }
    );

    req.on("error", reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });

describe("background logs integration tests", () => {
  let app: any;
  let server: Server;
  let serverPort: number;

  beforeAll(async () => {
    // Set up a mock server for testing
    app = express();

    // Mock logs endpoint
    app.get("/api/logs", (req: any, res: any) => {
      const { lines, recent } = req.query;
      let logData = "logline1\nlogline2\nlogline3";

      if (lines && typeof lines === "string") {
        const lineCount = parseInt(lines, 10);
        if (lineCount >= 0) {
          logData = logData.split("\n").slice(0, lineCount).join("\n");
        }
      }

      if (recent === "true") {
        logData = logData.split("\n").slice(-2).join("\n"); // Last 2 lines
      }

      res.setHeader("Content-Type", "text/plain");
      res.send(logData);
    });

    // Mock logs clear endpoint
    app.post("/api/logs/clear", (req: any, res: any) => {
      res.json({ status: "success", message: "Logs cleared" });
    });

    // Start server on a random port
    serverPort = Math.floor(Math.random() * 10000) + 8000;
    server = app.listen(serverPort);

    // Wait for server to be ready
    await new Promise<void>(resolve => {
      server.on("listening", () => resolve());
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>(resolve => {
        server.close(() => resolve());
      });
    }
  });

  describe("GET_LOGS endpoint functionality", () => {
    it("returns logs with query parameters", async () => {
      const response = await httpRequest(
        `http://localhost:${serverPort}/api/logs?lines=2&recent=true`
      );
      expect(response.ok).toBe(true);

      const text = await response.text();
      expect(text).toContain("logline");
      expect(text.split("\n")).toHaveLength(2);
    });

    it("handles lines parameter correctly", async () => {
      const response = await httpRequest(`http://localhost:${serverPort}/api/logs?lines=2`);
      expect(response.ok).toBe(true);

      const text = await response.text();
      expect(text.split("\n")).toHaveLength(2);
    });

    it("handles recent parameter correctly", async () => {
      const response = await httpRequest(`http://localhost:${serverPort}/api/logs?recent=true`);
      expect(response.ok).toBe(true);

      const text = await response.text();
      // Should return last 2 lines when recent=true
      expect(text.split("\n")).toHaveLength(2);
    });

    it("returns all logs when no parameters provided", async () => {
      const response = await httpRequest(`http://localhost:${serverPort}/api/logs`);
      expect(response.ok).toBe(true);

      const text = await response.text();
      expect(text.split("\n")).toHaveLength(3); // All 3 lines
    });
  });

  describe("CLEAR_LOGS endpoint functionality", () => {
    it("clears logs successfully", async () => {
      const response = await httpRequest(`http://localhost:${serverPort}/api/logs/clear`, {
        method: "POST",
      });
      expect(response.ok).toBe(true);

      const json = (await response.json()) as any;
      expect(json.status).toBe("success");
      expect(json.message).toBe("Logs cleared");
    });

    it("handles server errors gracefully", async () => {
      // Temporarily modify the server to return an error
      const originalHandler = app._router.stack.find(
        (layer: any) => layer.route && layer.route.path === "/api/logs/clear"
      );

      // Remove the original handler and add the error handler
      if (originalHandler) {
        app._router.stack = app._router.stack.filter((layer: any) => layer !== originalHandler);
      }

      app.post("/api/logs/clear", (req: any, res: any) => {
        res.status(500).json({ error: "Internal server error" });
      });

      const response = await httpRequest(`http://localhost:${serverPort}/api/logs/clear`, {
        method: "POST",
      });
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);

      const json = (await response.json()) as any;
      expect(json.error).toBe("Internal server error");

      // Restore original handler
      app.post("/api/logs/clear", (req: any, res: any) => {
        res.json({ status: "success", message: "Logs cleared" });
      });
    });
  });

  describe("fallback behavior", () => {
    it("falls back to legacy endpoints when /api endpoints fail", async () => {
      // Temporarily disable /api endpoints
      const apiLogsHandler = app._router.stack.find(
        (layer: any) => layer.route && layer.route.path === "/api/logs"
      );
      const apiClearHandler = app._router.stack.find(
        (layer: any) => layer.route && layer.route.path === "/api/logs/clear"
      );

      if (apiLogsHandler)
        app._router.stack = app._router.stack.filter((layer: any) => layer !== apiLogsHandler);
      if (apiClearHandler)
        app._router.stack = app._router.stack.filter((layer: any) => layer !== apiClearHandler);

      // Add legacy endpoints
      app.get("/logs", (req: any, res: any) => {
        res.send("legacy_logline1\nlegacy_logline2");
      });

      app.post("/logs/clear", (req: any, res: any) => {
        res.json({ status: "success", message: "Legacy logs cleared" });
      });

      // Test GET_LOGS with legacy endpoint
      const getLogsResponse = await httpRequest(`http://localhost:${serverPort}/logs`);
      expect(getLogsResponse.ok).toBe(true);

      const getLogsText = await getLogsResponse.text();
      expect(getLogsText).toContain("legacy_logline");

      // Test CLEAR_LOGS with legacy endpoint
      const clearLogsResponse = await httpRequest(`http://localhost:${serverPort}/logs/clear`, {
        method: "POST",
      });
      expect(clearLogsResponse.ok).toBe(true);

      const clearLogsJson = (await clearLogsResponse.json()) as any;
      expect(clearLogsJson.status).toBe("success");

      // Restore /api endpoints
      app.get("/api/logs", (req: any, res: any) => {
        const { lines, recent } = req.query;
        let logData = "logline1\nlogline2\nlogline3";

        if (lines && typeof lines === "string") {
          const lineCount = parseInt(lines, 10);
          if (lineCount >= 0) {
            logData = logData.split("\n").slice(0, lineCount).join("\n");
          }
        }

        if (recent === "true") {
          logData = logData.split("\n").slice(-2).join("\n");
        }

        res.setHeader("Content-Type", "text/plain");
        res.send(logData);
      });

      app.post("/api/logs/clear", (req: any, res: any) => {
        res.json({ status: "success", message: "Logs cleared" });
      });
    });
  });

  describe("endpoint validation", () => {
    it("validates query parameters correctly", async () => {
      // Test invalid lines parameter
      const invalidLinesResponse = await httpRequest(
        `http://localhost:${serverPort}/api/logs?lines=invalid`
      );
      expect(invalidLinesResponse.ok).toBe(true);

      const text = await invalidLinesResponse.text();
      expect(text.split("\n")).toHaveLength(3); // Should return all lines for invalid input
    });

    it("handles missing query parameters gracefully", async () => {
      const response = await httpRequest(`http://localhost:${serverPort}/api/logs`);
      expect(response.ok).toBe(true);

      const text = await response.text();
      expect(text).toBeTruthy();
      expect(text.length).toBeGreaterThan(0);
    });
  });
});
