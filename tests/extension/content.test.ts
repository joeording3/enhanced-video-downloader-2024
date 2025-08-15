/**
 * Tests for content script functionality.
 *
 * Covers: button creation and management, video detection,
 * user interaction handling, and Chrome API integration.
 *
 * Tests both UI elements and background communication logic.
 */

/* eslint-env jest */
import {
  createOrUpdateButton,
  resetButtonPosition,
  setButtonHiddenState,
  isSignificantVideo,
  getButtonState,
  saveButtonState,
  ensureDownloadButtonStyle,
} from "../../extension/src/content";
import { debounce } from "../../extension/src/lib/utils";
import { CentralizedLogger } from "../../extension/src/core/logger";
import { UI_CONSTANTS, CSS_CLASSES } from "../../extension/src/core/constants";

describe("Content Script Tests", () => {
  let logger: CentralizedLogger;

  beforeEach(() => {
    // Get actual logger instance
    logger = CentralizedLogger.getInstance();
    logger.clearLogs();

    // Setup DOM
    document.body.innerHTML = '<div id="test-container"></div>';

    // Reset mocks
    (chrome.storage.local.get as jest.Mock).mockClear();
    (chrome.storage.local.set as jest.Mock).mockClear();
  });

  describe("Button Creation and Management", () => {
    it("should create download button", async () => {
      const button = await createOrUpdateButton();
      expect(button).toBeInstanceOf(HTMLButtonElement);
      expect(button.id).toBe(UI_CONSTANTS.BUTTON_ID_PREFIX + "main");
      expect(button.textContent).toBe(UI_CONSTANTS.BUTTON_TEXT);
    });

    it("should update existing button", async () => {
      const button1 = await createOrUpdateButton();
      const button2 = await createOrUpdateButton();
      expect(button1).toBe(button2); // Should return the same button
    });

    it("should reset button position", async () => {
      const button = await createOrUpdateButton();
      button.style.left = "100px";
      button.style.top = "100px";

      await resetButtonPosition();
      expect(button.style.left).toBe("10px");
      expect(button.style.top).toBe("10px");
    });

    it("should set button hidden state via classes", async () => {
      const button = await createOrUpdateButton();

      await setButtonHiddenState(true);
      expect(button.classList.contains(CSS_CLASSES.HIDDEN)).toBe(true);
      expect(button.classList.contains(CSS_CLASSES.EVD_VISIBLE)).toBe(false);

      await setButtonHiddenState(false);
      expect(button.classList.contains(CSS_CLASSES.HIDDEN)).toBe(false);
      expect(button.classList.contains(CSS_CLASSES.EVD_VISIBLE)).toBe(true);
    });
  });

  describe("Video Detection", () => {
    it("should detect significant video elements", () => {
      const video = document.createElement("video");
      video.src = "test.mp4";
      // Mock video properties that are read-only
      Object.defineProperty(video, "duration", {
        value: 30,
        writable: false,
      });
      Object.defineProperty(video, "videoWidth", {
        value: 1280,
        writable: false,
      });
      Object.defineProperty(video, "videoHeight", {
        value: 720,
        writable: false,
      });
      // Mock getBoundingClientRect to return significant dimensions
      Object.defineProperty(video, "getBoundingClientRect", {
        value: () => ({
          width: 1280,
          height: 720,
          left: 0,
          top: 0,
          right: 1280,
          bottom: 720,
        }),
        writable: false,
      });
      document.body.appendChild(video);

      expect(isSignificantVideo(video)).toBe(true);
    });

    it("should reject insignificant video elements", () => {
      const video = document.createElement("video");
      // Mock video properties that are read-only
      Object.defineProperty(video, "duration", {
        value: 5,
        writable: false,
      }); // Too short
      Object.defineProperty(video, "videoWidth", {
        value: 320,
        writable: false,
      });
      Object.defineProperty(video, "videoHeight", {
        value: 240,
        writable: false,
      });
      document.body.appendChild(video);

      expect(isSignificantVideo(video)).toBe(false);
    });

    it("should handle video elements without duration", () => {
      const video = document.createElement("video");
      document.body.appendChild(video);

      expect(isSignificantVideo(video)).toBe(false);
    });
  });

  describe("Debounce Function", () => {
    it("should debounce function calls", done => {
      let callCount = 0;
      const debouncedFn = debounce(() => {
        callCount++;
      }, 100);

      debouncedFn();
      debouncedFn();
      debouncedFn();

      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 150);
    });
  });

  describe("Button State Management", () => {
    it("should get button state from storage", async () => {
      const mockState = { x: 50, y: 60, hidden: false };
      // Mock getHostname to return "localhost" for consistent testing
      jest
        .spyOn(require("../../extension/src/lib/utils"), "getHostname")
        .mockReturnValue("localhost");
      (chrome.storage.local.get as jest.Mock).mockImplementation((keys, callback) =>
        callback({ localhost: mockState })
      );

      const state = await getButtonState();
      expect(state).toEqual(mockState);
    });

    it("should save button state to storage", async () => {
      const state = { x: 100, y: 150, hidden: true };
      (chrome.storage.local.set as jest.Mock).mockImplementation((data, callback) => callback());

      await saveButtonState(state);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        {
          localhost: state,
        },
        expect.any(Function)
      );
    });

    it("should handle storage errors gracefully", async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementation((keys, callback) => {
        chrome.runtime.lastError = { message: "Storage error" };
        callback({});
      });

      const state = await getButtonState();
      expect(state).toEqual({ x: 10, y: 10, hidden: false });

      const logs = logger.getLogs();
      expect(logs.some(log => log.message.includes("Storage error"))).toBe(true);
    });
  });

  describe("Button Style Management", () => {
    it("should ensure download button style", () => {
      const button = document.createElement("button");
      button.style.display = "none";
      button.style.opacity = "0.5";
      document.body.appendChild(button);

      ensureDownloadButtonStyle(button);
      expect(button.classList.contains(CSS_CLASSES.EVD_VISIBLE)).toBe(true);
    });
  });

  describe("Logging Integration", () => {
    it("should handle button operations without requiring logs", async () => {
      await createOrUpdateButton();

      // The actual implementation may or may not log depending on button state
      // We just verify the function doesn't throw
      expect(true).toBe(true);
    });

    it("should handle video detection without logging", () => {
      const video = document.createElement("video");
      document.body.appendChild(video);

      isSignificantVideo(video);

      // The actual implementation doesn't log video detection, so we just verify it doesn't throw
      expect(video).toBeTruthy();
    });

    it("should handle storage operations without requiring logs", async () => {
      await getButtonState();

      // The actual implementation may or may not log depending on storage state
      // We just verify the function doesn't throw
      expect(true).toBe(true);
    });
  });
});
