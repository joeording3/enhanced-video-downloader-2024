import {
  getButtonState,
  saveButtonState,
  ensureDownloadButtonStyle,
  createOrUpdateButton,
} from "../../extension/src/content";
import * as ytEnhance from "../../extension/src/youtube_enhance";
import { logger } from "../../extension/src/lib/utils";

describe("Content.ts additional branch coverage", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
    chrome.runtime.lastError = null;
    jest.spyOn(logger, "error");
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
      expect(logger.error).toHaveBeenCalledWith(
        "Error getting button state from storage:",
        "fail"
      );
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
      expect(logger.error).toHaveBeenCalledWith(
        "Error getting button state from storage:",
        "boom"
      );
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
      expect(logger.error).toHaveBeenCalledWith(
        "Error saving button state to storage:",
        "savefail"
      );
    });
  });

  describe("ensureDownloadButtonStyle adjustments", () => {
    it("fixes display and opacity and applies guideline styles", () => {
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
      expect(btn.style.display).toBe("block");
      expect(btn.style.opacity).toBe("1");
      // Check guideline props
      expect(btn.style.padding).toBe("4px 8px");
      expect(btn.style.borderRadius).toBe("4px");
      expect(btn.style.backgroundColor).toBe("rgba(0, 0, 0, 0.3)");
      expect(btn.style.borderWidth).toBe("1px");
      expect(btn.style.borderStyle).toBe("solid");
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
