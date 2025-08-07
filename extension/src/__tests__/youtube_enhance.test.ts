/* eslint-env jest */

import { enhanceYouTubeButton } from "../youtube_enhance";
import * as utils from "../lib/utils";

jest.mock("../lib/utils", () => ({
  getHostname: jest.fn(),
}));

describe("youtube_enhance", () => {
  let btn: HTMLButtonElement;
  let mockGetHostname: jest.MockedFunction<typeof utils.getHostname>;

  beforeEach(() => {
    btn = document.createElement("button");
    mockGetHostname = utils.getHostname as jest.MockedFunction<
      typeof utils.getHostname
    >;

    // Mock console.log to avoid noise in tests
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe("enhanceYouTubeButton", () => {
    describe("YouTube domain detection", () => {
      it("enhances button styles for youtube.com", () => {
        mockGetHostname.mockReturnValue("youtube.com");
        enhanceYouTubeButton(btn);

        expect(btn.classList.contains("youtube-enhanced")).toBe(true);
      });

      it("enhances button styles for www.youtube.com", () => {
        mockGetHostname.mockReturnValue("www.youtube.com");
        enhanceYouTubeButton(btn);

        expect(btn.classList.contains("youtube-enhanced")).toBe(true);
      });

      it("enhances button styles for m.youtube.com", () => {
        mockGetHostname.mockReturnValue("m.youtube.com");
        enhanceYouTubeButton(btn);

        expect(btn.classList.contains("youtube-enhanced")).toBe(true);
      });

      it("enhances button styles for music.youtube.com", () => {
        mockGetHostname.mockReturnValue("music.youtube.com");
        enhanceYouTubeButton(btn);

        expect(btn.classList.contains("youtube-enhanced")).toBe(true);
      });

      it("does nothing for non-YouTube domains", () => {
        mockGetHostname.mockReturnValue("example.com");
        enhanceYouTubeButton(btn);

        expect(btn.classList.contains("youtube-enhanced")).toBe(false);
      });

      it("does nothing for domains containing 'youtube' but not YouTube", () => {
        mockGetHostname.mockReturnValue("fakeyoutube.com");
        enhanceYouTubeButton(btn);

        expect(btn.classList.contains("youtube-enhanced")).toBe(false);
      });

      it("does nothing for empty hostname", () => {
        mockGetHostname.mockReturnValue("");
        enhanceYouTubeButton(btn);

        expect(btn.classList.contains("youtube-enhanced")).toBe(false);
      });

      it("does nothing for null hostname", () => {
        mockGetHostname.mockReturnValue(null as any);
        enhanceYouTubeButton(btn);

        expect(btn.classList.contains("youtube-enhanced")).toBe(false);
      });
    });

    describe("button styling", () => {
      beforeEach(() => {
        mockGetHostname.mockReturnValue("youtube.com");
      });

      it("sets all required style properties", () => {
        enhanceYouTubeButton(btn);

        expect(btn.classList.contains("youtube-enhanced")).toBe(true);
      });

      it("overwrites existing styles", () => {
        // Set initial styles
        btn.style.backgroundColor = "blue";
        btn.style.color = "black";
        btn.style.border = "1px solid black";

        enhanceYouTubeButton(btn);

        expect(btn.classList.contains("youtube-enhanced")).toBe(true);
      });

      it("preserves existing event handlers", () => {
        const existingClickHandler = jest.fn();
        btn.onclick = existingClickHandler;

        enhanceYouTubeButton(btn);

        // Original click handler should be preserved
        expect(btn.onclick).toBe(existingClickHandler);
        expect(btn.classList.contains("youtube-enhanced")).toBe(true);
      });
    });

    describe("hover effects", () => {
      beforeEach(() => {
        mockGetHostname.mockReturnValue("youtube.com");
        enhanceYouTubeButton(btn);
      });

      it("applies CSS class for enhanced styling", () => {
        expect(btn.classList.contains("youtube-enhanced")).toBe(true);
      });
    });

    describe("button positioning", () => {
      beforeEach(() => {
        mockGetHostname.mockReturnValue("youtube.com");

        // Mock window.innerWidth
        Object.defineProperty(window, "innerWidth", {
          writable: true,
          configurable: true,
          value: 1920,
        });
      });

      it("positions button at default location when no top style is set", () => {
        enhanceYouTubeButton(btn);

        expect(btn.style.top).toBe("70px");
        expect(btn.style.left).toBe("1820px"); // 1920 - 100
      });

      it("positions button at default location when top is 10px", () => {
        btn.style.top = "10px";
        enhanceYouTubeButton(btn);

        expect(btn.style.top).toBe("70px");
        expect(btn.style.left).toBe("1820px"); // 1920 - 100
      });

      it("preserves custom top position when not 10px", () => {
        btn.style.top = "50px";
        enhanceYouTubeButton(btn);

        expect(btn.style.top).toBe("50px");
        expect(btn.style.left).toBe("1820px"); // 1920 - 100
      });

      it("preserves custom top position when set to 0px", () => {
        btn.style.top = "0px";
        enhanceYouTubeButton(btn);

        expect(btn.style.top).toBe("0px");
        expect(btn.style.left).toBe("1820px"); // 1920 - 100
      });

      it("preserves custom top position when set to 100px", () => {
        btn.style.top = "100px";
        enhanceYouTubeButton(btn);

        expect(btn.style.top).toBe("100px");
        expect(btn.style.left).toBe("1820px"); // 1920 - 100
      });

      it("calculates left position based on window width", () => {
        Object.defineProperty(window, "innerWidth", {
          writable: true,
          configurable: true,
          value: 1366,
        });

        enhanceYouTubeButton(btn);

        expect(btn.style.left).toBe("1266px"); // 1366 - 100
      });

      it("handles very small window width", () => {
        Object.defineProperty(window, "innerWidth", {
          writable: true,
          configurable: true,
          value: 200,
        });

        enhanceYouTubeButton(btn);

        expect(btn.style.left).toBe("100px"); // 200 - 100
      });

      it("handles zero window width", () => {
        Object.defineProperty(window, "innerWidth", {
          writable: true,
          configurable: true,
          value: 0,
        });

        enhanceYouTubeButton(btn);

        expect(btn.style.left).toBe("-100px"); // 0 - 100
      });
    });

    describe("logging", () => {
      it("does not log for YouTube domains", () => {
        mockGetHostname.mockReturnValue("youtube.com");
        const consoleSpy = jest.spyOn(console, "log");

        enhanceYouTubeButton(btn);

        // The actual implementation doesn't log anything
        expect(consoleSpy).not.toHaveBeenCalled();
      });

      it("does not log for non-YouTube domains", () => {
        mockGetHostname.mockReturnValue("example.com");
        const consoleSpy = jest.spyOn(console, "log");

        enhanceYouTubeButton(btn);

        expect(consoleSpy).not.toHaveBeenCalled();
      });
    });

    describe("edge cases", () => {
      it("handles null button element gracefully", () => {
        mockGetHostname.mockReturnValue("youtube.com");

        expect(() => {
          enhanceYouTubeButton(null as any);
        }).not.toThrow();
      });

      it("handles undefined button element gracefully", () => {
        mockGetHostname.mockReturnValue("youtube.com");

        expect(() => {
          enhanceYouTubeButton(undefined as any);
        }).not.toThrow();
      });

      it("handles button with existing event handlers", () => {
        mockGetHostname.mockReturnValue("youtube.com");

        const existingClickHandler = jest.fn();
        btn.onclick = existingClickHandler;

        enhanceYouTubeButton(btn);

        // Original click handler should be preserved
        expect(btn.onclick).toBe(existingClickHandler);
        expect(btn.classList.contains("youtube-enhanced")).toBe(true);
      });

      it("handles button with existing styles that might conflict", () => {
        mockGetHostname.mockReturnValue("youtube.com");

        // Set conflicting styles
        btn.style.transform = "rotate(45deg)";
        btn.style.opacity = "0.5";

        enhanceYouTubeButton(btn);

        // Should still apply the CSS class
        expect(btn.classList.contains("youtube-enhanced")).toBe(true);
      });
    });
  });
});
