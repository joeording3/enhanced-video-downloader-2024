/* eslint-env jest */

import { setStatus, applyPopupTheme } from "extension/src/popup";
import { CSS_CLASSES, DOM_SELECTORS } from "../../extension/src/core/constants";

describe("Popup Util Functions", () => {
  let statusElement: HTMLElement;
  let headerLogo: HTMLImageElement;
  let timerId: ReturnType<typeof setTimeout> | null;

  beforeEach(() => {
    document.body.innerHTML = `<div id="${DOM_SELECTORS.STATUS_MESSAGE.replace("#", "")}"></div>` + '<img id="header-logo" src="initial" />';
    statusElement = document.getElementById(DOM_SELECTORS.STATUS_MESSAGE.replace("#", ""))!;
    headerLogo = document.getElementById("header-logo") as HTMLImageElement;
    document.documentElement.className = "";
    document.body.className = "";

    // Mock getURL which is used to set the image src
    (chrome.runtime.getURL as jest.Mock).mockImplementation(path => "http://localhost/" + path);
    jest.useFakeTimers();
    timerId = null;
  });

  afterEach(() => {
    if (timerId) {
      clearTimeout(timerId);
    }
    jest.useRealTimers();
  });

  describe("setStatus", () => {
    it("should display error message with prefix and tip and clear after timeout", () => {
      timerId = setStatus("fail", true);

      expect(statusElement.childNodes[0].textContent).toBe("fail");
      const tip = statusElement.querySelector(`.${CSS_CLASSES.ERROR_TIP}`);
      expect(tip).not.toBeNull();
      expect(tip!.textContent).toContain("Tip: check your network connection");
      expect(statusElement.className).toBe(CSS_CLASSES.STATUS_ERROR);

      jest.advanceTimersByTime(5000);
      expect(statusElement.innerHTML).toBe("");
    });
  });

  describe("applyPopupTheme", () => {
    it("should toggle dark theme on and off", () => {
      // The implementation now uses document.documentElement.classList.toggle
      // and looks for img[src*='icon'] instead of #header-logo
      headerLogo.src = "http://localhost/extension/icons/icon48.png";

      applyPopupTheme("dark"); // Switch to dark
      expect(document.body.classList.contains(CSS_CLASSES.DARK_THEME)).toBe(true);
      expect(headerLogo.src).toMatch(/darkicons\/icon48\.png$/);

      applyPopupTheme("light"); // Switch back to light
      expect(document.body.classList.contains(CSS_CLASSES.DARK_THEME)).toBe(false);
      expect(headerLogo.src).toMatch(/icon48\.png$/);
    });
  });
});
