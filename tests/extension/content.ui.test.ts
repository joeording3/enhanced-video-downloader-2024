// @jest-environment jsdom
import {
  createOrUpdateButton,
  ensureDownloadButtonStyle,
  setButtonHiddenState,
  resetButtonPosition,
} from "../../extension/src/content";
import { CSS_CLASSES, UI_CONSTANTS } from "../../extension/src/core/constants";

describe("content.ts UI functions", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="video-container"><video id="video"></video></div>';
    (global as any).chrome = {
      storage: {
        local: {
          get: jest.fn((key: any, cb: any) => cb({})),
          set: jest.fn((items: any, cb: any) => cb && cb()),
        },
      },
      runtime: { lastError: undefined },
    };
  });

  describe("createOrUpdateButton", () => {
    it("injects a download button into the DOM when no video element is provided", async () => {
      // Ensure no existing button
      document.body.innerHTML = "";
      await createOrUpdateButton();
      const btn = document.body.querySelector("button");
      expect(btn).not.toBeNull();
      // ID should start with our prefix
      expect(btn?.id).toMatch(new RegExp(`^${UI_CONSTANTS.BUTTON_ID_PREFIX}`));
    });
  });

  describe("ensureDownloadButtonStyle", () => {
    it("adds visibility and contrast classes", () => {
      const btn = document.createElement("button");
      document.body.appendChild(btn);
      ensureDownloadButtonStyle(btn);
      expect(btn.classList.contains(CSS_CLASSES.EVD_VISIBLE)).toBe(true);
      const hasContrastClass =
        btn.classList.contains(CSS_CLASSES.EVD_ON_DARK) || btn.classList.contains(CSS_CLASSES.EVD_ON_LIGHT);
      expect(hasContrastClass).toBe(true);
    });
  });

  // Note: setButtonHiddenState and resetButtonPosition handle storage and are covered by storage tests
});
