/* eslint-env jest */

import {
  applyThemeToActionIcon,
  actionIconPaths,
  getActionIconPaths,
} from "../../extension/src/background-helpers";
import { Theme } from "../../extension/src/types";

declare const global: any;

describe("background-helpers", () => {
  let originalChrome: any;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock console methods to avoid noise in tests
    consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});

    // Mock chrome APIs
    originalChrome = global.chrome;
    global.chrome = {
      action: {
        setIcon: jest.fn((opts: any, cb: () => void) => {
          if (cb) cb();
        }),
      },
      runtime: {
        getURL: (path: string) => "/resolved/" + path,
        lastError: undefined,
      },
    };
  });

  afterEach(() => {
    global.chrome = originalChrome;
    jest.restoreAllMocks();
  });

  describe("actionIconPaths", () => {
    it("should have correct light theme icon paths", () => {
      const paths = getActionIconPaths();
      expect(paths.light["16"]).toBe(
        chrome.runtime.getURL("extension/icons/icon16.png")
      );
      expect(paths.light["48"]).toBe(
        chrome.runtime.getURL("extension/icons/icon48.png")
      );
      expect(paths.light["128"]).toBe(
        chrome.runtime.getURL("extension/icons/icon128.png")
      );
    });

    it("should have correct dark theme icon paths", () => {
      const paths = getActionIconPaths();
      expect(paths.dark["16"]).toBe(
        chrome.runtime.getURL("extension/icons/darkicon16.png")
      );
      expect(paths.dark["48"]).toBe(
        chrome.runtime.getURL("extension/icons/darkicon48.png")
      );
      expect(paths.dark["128"]).toBe(
        chrome.runtime.getURL("extension/icons/darkicon128.png")
      );
    });

    it("should have all required icon sizes for both themes", () => {
      const requiredSizes = ["16", "48", "128"];
      const paths = getActionIconPaths();

      requiredSizes.forEach((size) => {
        expect(paths.light[size]).toBeDefined();
        expect(paths.dark[size]).toBeDefined();
        expect(typeof paths.light[size]).toBe("string");
        expect(typeof paths.dark[size]).toBe("string");
      });
    });

    it("should have different paths for light and dark themes", () => {
      const sizes = ["16", "48", "128"];
      const paths = getActionIconPaths();
      sizes.forEach((size) => {
        expect(paths.light[size]).not.toBe(paths.dark[size]);
      });
    });
  });

  describe("applyThemeToActionIcon", () => {
    describe("theme validation and fallback", () => {
      it("should apply light theme when 'light' is passed", () => {
        applyThemeToActionIcon("light");

        expect(global.chrome.action.setIcon).toHaveBeenCalledWith(
          { path: getActionIconPaths().light },
          expect.any(Function)
        );
      });

      it("should apply dark theme when 'dark' is passed", () => {
        applyThemeToActionIcon("dark");

        expect(global.chrome.action.setIcon).toHaveBeenCalledWith(
          { path: getActionIconPaths().dark },
          expect.any(Function)
        );
      });

      it("should fallback to light theme for invalid theme values", () => {
        const invalidThemes: any[] = [
          "invalid",
          "",
          null,
          undefined,
          "light-dark",
          "DARK",
          "LIGHT",
        ];

        invalidThemes.forEach((invalidTheme) => {
          global.chrome.action.setIcon.mockClear();
          applyThemeToActionIcon(invalidTheme);

          expect(global.chrome.action.setIcon).toHaveBeenCalledWith(
            { path: getActionIconPaths().light },
            expect.any(Function)
          );
        });
      });

      it("should fallback to light theme for empty string", () => {
        applyThemeToActionIcon("" as any);

        expect(global.chrome.action.setIcon).toHaveBeenCalledWith(
          { path: getActionIconPaths().light },
          expect.any(Function)
        );
      });

      it("should fallback to light theme for null", () => {
        applyThemeToActionIcon(null as any);

        expect(global.chrome.action.setIcon).toHaveBeenCalledWith(
          { path: getActionIconPaths().light },
          expect.any(Function)
        );
      });

      it("should fallback to light theme for undefined", () => {
        applyThemeToActionIcon(undefined as any);

        expect(global.chrome.action.setIcon).toHaveBeenCalledWith(
          { path: getActionIconPaths().light },
          expect.any(Function)
        );
      });

      it("should handle case-sensitive theme values", () => {
        const caseVariations = [
          "LIGHT",
          "Light",
          "light",
          "DARK",
          "Dark",
          "dark",
        ];

        caseVariations.forEach((theme) => {
          global.chrome.action.setIcon.mockClear();
          applyThemeToActionIcon(theme as any);

          // Only exact "dark" matches should use dark theme, everything else uses light
          const expectedTheme = theme === "dark" ? "dark" : "light";
          expect(global.chrome.action.setIcon).toHaveBeenCalledWith(
            { path: getActionIconPaths()[expectedTheme as Theme] },
            expect.any(Function)
          );
        });
      });
    });

    describe("Chrome API availability", () => {
      it("should work when chrome is available", () => {
        applyThemeToActionIcon("light");

        expect(global.chrome.action.setIcon).toHaveBeenCalled();
      });

      it("should handle when chrome is undefined", () => {
        global.chrome = undefined;

        expect(() => {
          applyThemeToActionIcon("light");
        }).not.toThrow();
      });

      it("should handle when chrome.action is undefined", () => {
        global.chrome = { runtime: { lastError: undefined } };

        expect(() => {
          applyThemeToActionIcon("light");
        }).not.toThrow();
      });

      it("should handle when chrome.action.setIcon is undefined", () => {
        global.chrome = {
          action: {},
          runtime: { lastError: undefined },
        };

        expect(() => {
          applyThemeToActionIcon("light");
        }).not.toThrow();
      });

      it("should handle when chrome.runtime is undefined", () => {
        global.chrome = { action: { setIcon: jest.fn() } };

        expect(() => {
          applyThemeToActionIcon("light");
        }).not.toThrow();
      });
    });

    describe("error handling", () => {
      it("should handle setIcon callback errors", () => {
        const errorMessage = "Failed to set icon";
        global.chrome.runtime.lastError = { message: errorMessage };

        const consoleErrorSpy = jest.spyOn(console, "error");

        applyThemeToActionIcon("light");

        // Simulate the callback being called with an error
        const setIconCall = global.chrome.action.setIcon.mock.calls[0];
        const callback = setIconCall[1];
        callback();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[BG] Error setting action icon for theme light:",
          errorMessage
        );
      });

      it("should handle setIcon callback without error", () => {
        global.chrome.runtime.lastError = undefined;

        const consoleErrorSpy = jest.spyOn(console, "error");

        applyThemeToActionIcon("dark");

        // Simulate the callback being called without an error
        const setIconCall = global.chrome.action.setIcon.mock.calls[0];
        const callback = setIconCall[1];
        callback();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });

      it("should handle setIcon callback with null error", () => {
        global.chrome.runtime.lastError = null;

        const consoleErrorSpy = jest.spyOn(console, "error");

        applyThemeToActionIcon("light");

        // Simulate the callback being called with null error
        const setIconCall = global.chrome.action.setIcon.mock.calls[0];
        const callback = setIconCall[1];
        callback();

        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });

      it("should handle setIcon callback with empty error message", () => {
        global.chrome.runtime.lastError = { message: "" };

        const consoleErrorSpy = jest.spyOn(console, "error");

        applyThemeToActionIcon("dark");

        // Simulate the callback being called with empty error message
        const setIconCall = global.chrome.action.setIcon.mock.calls[0];
        const callback = setIconCall[1];
        callback();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[BG] Error setting action icon for theme dark:",
          ""
        );
      });

      it("should handle setIcon callback with undefined error message", () => {
        global.chrome.runtime.lastError = { message: undefined };

        const consoleErrorSpy = jest.spyOn(console, "error");

        applyThemeToActionIcon("light");

        // Simulate the callback being called with undefined error message
        const setIconCall = global.chrome.action.setIcon.mock.calls[0];
        const callback = setIconCall[1];
        callback();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[BG] Error setting action icon for theme light:",
          undefined
        );
      });
    });

    describe("callback handling", () => {
      it("should call setIcon with a callback function", () => {
        applyThemeToActionIcon("light");

        const setIconCall = global.chrome.action.setIcon.mock.calls[0];
        expect(setIconCall[1]).toBeInstanceOf(Function);
      });

      it("should always call setIcon with a callback function", () => {
        // Even when we mock setIcon to not expect a callback, the function always provides one
        global.chrome.action.setIcon = jest.fn();

        expect(() => {
          applyThemeToActionIcon("dark");
        }).not.toThrow();

        expect(global.chrome.action.setIcon).toHaveBeenCalledWith(
          { path: getActionIconPaths().dark },
          expect.any(Function)
        );
      });

      it("should handle setIcon with null callback", () => {
        global.chrome.action.setIcon = jest.fn((opts: any, cb: any) => {
          if (cb) cb();
        });

        expect(() => {
          applyThemeToActionIcon("light");
        }).not.toThrow();
      });
    });

    describe("path validation", () => {
      it("should handle when paths are available", () => {
        // Test that the function works when paths are available
        applyThemeToActionIcon("light");

        expect(global.chrome.action.setIcon).toHaveBeenCalledWith(
          { path: getActionIconPaths().light },
          expect.any(Function)
        );
      });

      it("should handle when paths are available for dark theme", () => {
        // Test that the function works when paths are available
        applyThemeToActionIcon("dark");

        expect(global.chrome.action.setIcon).toHaveBeenCalledWith(
          { path: getActionIconPaths().dark },
          expect.any(Function)
        );
      });
    });

    describe("multiple calls", () => {
      it("should handle multiple theme changes", () => {
        const themes: Theme[] = ["light", "dark", "light", "dark"];

        themes.forEach((theme) => {
          global.chrome.action.setIcon.mockClear();
          applyThemeToActionIcon(theme);

          expect(global.chrome.action.setIcon).toHaveBeenCalledWith(
            { path: getActionIconPaths()[theme] },
            expect.any(Function)
          );
        });
      });

      it("should handle rapid theme changes", () => {
        for (let i = 0; i < 10; i++) {
          const theme: Theme = i % 2 === 0 ? "light" : "dark";
          applyThemeToActionIcon(theme);
        }

        expect(global.chrome.action.setIcon).toHaveBeenCalledTimes(10);
      });
    });

    describe("edge cases", () => {
      it("should handle non-string theme values", () => {
        const nonStringThemes = [123, true, false, {}, [], () => {}];

        nonStringThemes.forEach((theme) => {
          global.chrome.action.setIcon.mockClear();
          applyThemeToActionIcon(theme as any);

          expect(global.chrome.action.setIcon).toHaveBeenCalledWith(
            { path: getActionIconPaths().light },
            expect.any(Function)
          );
        });
      });

      it("should handle very long theme strings", () => {
        const longTheme = "a".repeat(1000);

        expect(() => {
          applyThemeToActionIcon(longTheme as any);
        }).not.toThrow();

        expect(global.chrome.action.setIcon).toHaveBeenCalledWith(
          { path: getActionIconPaths().light },
          expect.any(Function)
        );
      });

      it("should handle special characters in theme strings", () => {
        const specialThemes = ["light!", "dark@", "light#", "dark$", "light%"];

        specialThemes.forEach((theme) => {
          global.chrome.action.setIcon.mockClear();
          applyThemeToActionIcon(theme as any);

          expect(global.chrome.action.setIcon).toHaveBeenCalledWith(
            { path: getActionIconPaths().light },
            expect.any(Function)
          );
        });
      });
    });
  });
});
