// @ts-nocheck
import {
  getButtonState,
  saveButtonState,
  ensureDownloadButtonStyle,
  createOrUpdateButton,
} from "../../extension/src/content";
import * as ytEnhance from "../../extension/src/youtube_enhance";
import { CentralizedLogger } from "../../extension/src/core/logger";

describe("Content.ts additional branch coverage", () => {
  let logger: CentralizedLogger;

  beforeEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
    chrome.runtime.lastError = null;
    logger = CentralizedLogger.getInstance();
    logger.clearLogs();
  });

  describe("getButtonState error handling", () => {
    it("returns default on storage lastError", async () => {
      // Simulate lastError in callback
      (chrome.storage.local.get as jest.Mock).mockImplementation((key, cb) => {
        chrome.runtime.lastError = {
          message: "fail",
        };
        cb({});
      });
      const state = await getButtonState();
      expect(state).toEqual({
        x: 10,
        y: 10,
        hidden: false,
      });
      const logs = logger.getLogs();
      expect(
        logs.some(log => log.message.includes("Error getting button state from storage"))
      ).toBe(true);
    });

    it("returns default on exception", async () => {
      // Throw an exception in storage.get
      (chrome.storage.local.get as jest.Mock).mockImplementation(() => {
        throw new Error("boom");
      });
      const state = await getButtonState();
      expect(state).toEqual({
        x: 10,
        y: 10,
        hidden: false,
      });
      const logs = logger.getLogs();
      expect(
        logs.some(log => log.message.includes("Error getting button state from storage"))
      ).toBe(true);
    });
  });

  describe("saveButtonState error handling", () => {
    it("logs error when saving state fails", async () => {
      // Simulate lastError after set
      chrome.runtime.lastError = {
        message: "savefail",
      };
      await saveButtonState({
        x: 5,
        y: 5,
        hidden: true,
      });
      const logs = logger.getLogs();
      expect(logs.some(log => log.message.includes("Error saving button state to storage"))).toBe(
        true
      );
    });
  });

  describe("ensureDownloadButtonStyle adjustments", () => {
    it("fixes visibility via classes and applies contrast class", () => {
      const btn = document.createElement("button");
      document.body.appendChild(btn);
      // Stub computed style
      jest.spyOn(window, "getComputedStyle").mockReturnValue({
        display: "none",
        opacity: "0.5",
        padding: "0px",
        borderRadius: "0px",
        backgroundColor: "red",
        borderWidth: "2px",
        borderStyle: "dashed",
      } as any);
      ensureDownloadButtonStyle(btn);
      expect(btn.classList.contains("evd-visible")).toBe(true);
      const hasContrastClass =
        btn.classList.contains("evd-on-dark") || btn.classList.contains("evd-on-light");
      expect(hasContrastClass).toBe(true);
    });

    it("skips if element not in DOM", () => {
      const orphan = document.createElement("button");
      // Should not throw
      expect(() => ensureDownloadButtonStyle(orphan)).not.toThrow();
    });
  });

  describe("createOrUpdateButton existing instance", () => {
    it("reuses the same button and reapplies styles", async () => {
      const styleSpy = jest.spyOn(ytEnhance, "enhanceYouTubeButton");
      const first = await createOrUpdateButton();
      const second = await createOrUpdateButton();
      expect(second).toBe(first);
      expect(styleSpy).toHaveBeenCalled();
    });
  });
});
