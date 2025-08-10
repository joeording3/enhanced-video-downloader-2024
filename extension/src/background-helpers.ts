/**
 * Helper functions for the background script of the Enhanced Video Downloader extension.
 * Provides utilities for icon management, theme handling, and server communication.
 */
// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { Theme } from "./types";

// Function to get icon paths for different themes - using chrome.runtime.getURL for proper extension URL resolution
export function getActionIconPaths(): Record<Theme, Record<string, string>> {
  if (stryMutAct_9fa48("0")) {
    {}
  } else {
    stryCov_9fa48("0");
    // Check if chrome and chrome.runtime.getURL are available
    if (stryMutAct_9fa48("3") ? (typeof chrome === "undefined" || !chrome.runtime) && !chrome.runtime.getURL : stryMutAct_9fa48("2") ? false : stryMutAct_9fa48("1") ? true : (stryCov_9fa48("1", "2", "3"), (stryMutAct_9fa48("5") ? typeof chrome === "undefined" && !chrome.runtime : stryMutAct_9fa48("4") ? false : (stryCov_9fa48("4", "5"), (stryMutAct_9fa48("7") ? typeof chrome !== "undefined" : stryMutAct_9fa48("6") ? false : (stryCov_9fa48("6", "7"), typeof chrome === (stryMutAct_9fa48("8") ? "" : (stryCov_9fa48("8"), "undefined")))) || (stryMutAct_9fa48("9") ? chrome.runtime : (stryCov_9fa48("9"), !chrome.runtime)))) || (stryMutAct_9fa48("10") ? chrome.runtime.getURL : (stryCov_9fa48("10"), !chrome.runtime.getURL)))) {
      if (stryMutAct_9fa48("11")) {
        {}
      } else {
        stryCov_9fa48("11");
        // Return fallback paths when chrome API is not available (e.g., in tests)
        return stryMutAct_9fa48("12") ? {} : (stryCov_9fa48("12"), {
          light: stryMutAct_9fa48("13") ? {} : (stryCov_9fa48("13"), {
            "16": stryMutAct_9fa48("14") ? "" : (stryCov_9fa48("14"), "extension/icons/icon16.png"),
            "48": stryMutAct_9fa48("15") ? "" : (stryCov_9fa48("15"), "extension/icons/icon48.png"),
            "128": stryMutAct_9fa48("16") ? "" : (stryCov_9fa48("16"), "extension/icons/icon128.png")
          }),
          dark: stryMutAct_9fa48("17") ? {} : (stryCov_9fa48("17"), {
            "16": stryMutAct_9fa48("18") ? "" : (stryCov_9fa48("18"), "extension/icons/darkicon16.png"),
            "48": stryMutAct_9fa48("19") ? "" : (stryCov_9fa48("19"), "extension/icons/darkicon48.png"),
            "128": stryMutAct_9fa48("20") ? "" : (stryCov_9fa48("20"), "extension/icons/darkicon128.png")
          }),
          auto: stryMutAct_9fa48("21") ? {} : (stryCov_9fa48("21"), {
            "16": stryMutAct_9fa48("22") ? "" : (stryCov_9fa48("22"), "extension/icons/icon16.png"),
            "48": stryMutAct_9fa48("23") ? "" : (stryCov_9fa48("23"), "extension/icons/icon48.png"),
            "128": stryMutAct_9fa48("24") ? "" : (stryCov_9fa48("24"), "extension/icons/icon128.png")
          })
        });
      }
    }
    return stryMutAct_9fa48("25") ? {} : (stryCov_9fa48("25"), {
      light: stryMutAct_9fa48("26") ? {} : (stryCov_9fa48("26"), {
        "16": chrome.runtime.getURL(stryMutAct_9fa48("27") ? "" : (stryCov_9fa48("27"), "extension/icons/icon16.png")),
        "48": chrome.runtime.getURL(stryMutAct_9fa48("28") ? "" : (stryCov_9fa48("28"), "extension/icons/icon48.png")),
        "128": chrome.runtime.getURL(stryMutAct_9fa48("29") ? "" : (stryCov_9fa48("29"), "extension/icons/icon128.png"))
      }),
      dark: stryMutAct_9fa48("30") ? {} : (stryCov_9fa48("30"), {
        "16": chrome.runtime.getURL(stryMutAct_9fa48("31") ? "" : (stryCov_9fa48("31"), "extension/icons/darkicon16.png")),
        "48": chrome.runtime.getURL(stryMutAct_9fa48("32") ? "" : (stryCov_9fa48("32"), "extension/icons/darkicon48.png")),
        "128": chrome.runtime.getURL(stryMutAct_9fa48("33") ? "" : (stryCov_9fa48("33"), "extension/icons/darkicon128.png"))
      }),
      auto: stryMutAct_9fa48("34") ? {} : (stryCov_9fa48("34"), {
        "16": chrome.runtime.getURL(stryMutAct_9fa48("35") ? "" : (stryCov_9fa48("35"), "extension/icons/icon16.png")),
        "48": chrome.runtime.getURL(stryMutAct_9fa48("36") ? "" : (stryCov_9fa48("36"), "extension/icons/icon48.png")),
        "128": chrome.runtime.getURL(stryMutAct_9fa48("37") ? "" : (stryCov_9fa48("37"), "extension/icons/icon128.png"))
      })
    });
  }
}

// Legacy export for backward compatibility
export const actionIconPaths = getActionIconPaths();

/**
 * Applies the specified theme to the extension action icon
 * @param themeToApply - The theme to apply ('light' or 'dark')
 */
export function applyThemeToActionIcon(themeToApply: Theme): void {
  if (stryMutAct_9fa48("38")) {
    {}
  } else {
    stryCov_9fa48("38");
    const validTheme = (stryMutAct_9fa48("41") ? themeToApply !== "dark" : stryMutAct_9fa48("40") ? false : stryMutAct_9fa48("39") ? true : (stryCov_9fa48("39", "40", "41"), themeToApply === (stryMutAct_9fa48("42") ? "" : (stryCov_9fa48("42"), "dark")))) ? stryMutAct_9fa48("43") ? "" : (stryCov_9fa48("43"), "dark") : stryMutAct_9fa48("44") ? "" : (stryCov_9fa48("44"), "light");
    const paths = getActionIconPaths()[validTheme];
    if (stryMutAct_9fa48("47") ? false : stryMutAct_9fa48("46") ? true : stryMutAct_9fa48("45") ? paths : (stryCov_9fa48("45", "46", "47"), !paths)) {
      if (stryMutAct_9fa48("48")) {
        {}
      } else {
        stryCov_9fa48("48");
        console.warn((stryMutAct_9fa48("49") ? "" : (stryCov_9fa48("49"), "[BG] No icon paths found for theme: ")) + validTheme + (stryMutAct_9fa48("50") ? "" : (stryCov_9fa48("50"), ". Defaulting to light theme icons.")));
      }
    }
    if (stryMutAct_9fa48("53") ? typeof chrome !== "undefined" && chrome.action || chrome.action.setIcon : stryMutAct_9fa48("52") ? false : stryMutAct_9fa48("51") ? true : (stryCov_9fa48("51", "52", "53"), (stryMutAct_9fa48("55") ? typeof chrome !== "undefined" || chrome.action : stryMutAct_9fa48("54") ? true : (stryCov_9fa48("54", "55"), (stryMutAct_9fa48("57") ? typeof chrome === "undefined" : stryMutAct_9fa48("56") ? true : (stryCov_9fa48("56", "57"), typeof chrome !== (stryMutAct_9fa48("58") ? "" : (stryCov_9fa48("58"), "undefined")))) && chrome.action)) && chrome.action.setIcon)) {
      if (stryMutAct_9fa48("59")) {
        {}
      } else {
        stryCov_9fa48("59");
        chrome.action.setIcon(stryMutAct_9fa48("60") ? {} : (stryCov_9fa48("60"), {
          path: stryMutAct_9fa48("63") ? paths && getActionIconPaths().light : stryMutAct_9fa48("62") ? false : stryMutAct_9fa48("61") ? true : (stryCov_9fa48("61", "62", "63"), paths || getActionIconPaths().light)
        }), () => {
          if (stryMutAct_9fa48("64")) {
            {}
          } else {
            stryCov_9fa48("64");
            if (stryMutAct_9fa48("67") ? typeof chrome !== "undefined" && chrome.runtime || chrome.runtime.lastError : stryMutAct_9fa48("66") ? false : stryMutAct_9fa48("65") ? true : (stryCov_9fa48("65", "66", "67"), (stryMutAct_9fa48("69") ? typeof chrome !== "undefined" || chrome.runtime : stryMutAct_9fa48("68") ? true : (stryCov_9fa48("68", "69"), (stryMutAct_9fa48("71") ? typeof chrome === "undefined" : stryMutAct_9fa48("70") ? true : (stryCov_9fa48("70", "71"), typeof chrome !== (stryMutAct_9fa48("72") ? "" : (stryCov_9fa48("72"), "undefined")))) && chrome.runtime)) && chrome.runtime.lastError)) {
              if (stryMutAct_9fa48("73")) {
                {}
              } else {
                stryCov_9fa48("73");
                console.error((stryMutAct_9fa48("74") ? "" : (stryCov_9fa48("74"), "[BG] Error setting action icon for theme ")) + validTheme + (stryMutAct_9fa48("75") ? "" : (stryCov_9fa48("75"), ":")), chrome.runtime.lastError.message);
              }
            }
          }
        });
      }
    }
  }
}