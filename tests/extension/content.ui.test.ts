// @ts-nocheck
// @jest-environment jsdom
import {
  createOrUpdateButton,
  ensureDownloadButtonStyle,
  setButtonHiddenState,
  resetButtonPosition,
} from "../../extension/src/content";

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
      expect(btn?.id).toMatch(/^evd-download-button-/);
    });
  });

  describe("ensureDownloadButtonStyle", () => {
    it("applies guideline styles to the button", () => {
      const btn = document.createElement("button");
      document.body.appendChild(btn);
      ensureDownloadButtonStyle(btn);
      expect(btn.style.padding).toBe("4px 8px");
      expect(btn.style.borderRadius).toBe("4px");
      expect(btn.style.backgroundColor).toBe("rgba(0, 0, 0, 0.3)");
      expect(btn.style.borderWidth).toBe("1px");
      expect(btn.style.borderStyle).toBe("solid");
    });
  });

  // Note: setButtonHiddenState and resetButtonPosition handle storage and are covered by storage tests
});
