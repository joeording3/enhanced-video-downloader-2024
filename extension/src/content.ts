/**
 * Enhanced Video Downloader - Content Script
 * Handles DOM manipulation, video detection, and UI injection
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
import { ButtonState } from "./types";
import { debounce, getHostname } from "./lib/utils";
import { enhanceYouTubeButton } from "./youtube_enhance";
import { stateManager } from "./core/state-manager";
import { domManager } from "./core/dom-manager";
import { errorHandler, CentralizedErrorHandler } from "./core/error-handler";
import { logger, CentralizedLogger } from "./core/logger";
import { UI_CONSTANTS, NETWORK_CONSTANTS, DOM_SELECTORS, CSS_CLASSES, MESSAGE_TYPES, ERROR_MESSAGES, SUCCESS_MESSAGES } from "./core/constants";

// Skip location redefinition in test environment
if (stryMutAct_9fa48("1222") ? false : stryMutAct_9fa48("1221") ? true : stryMutAct_9fa48("1220") ? typeof process !== "undefined" && process.env.JEST_WORKER_ID : (stryCov_9fa48("1220", "1221", "1222"), !(stryMutAct_9fa48("1225") ? typeof process !== "undefined" || process.env.JEST_WORKER_ID : stryMutAct_9fa48("1224") ? false : stryMutAct_9fa48("1223") ? true : (stryCov_9fa48("1223", "1224", "1225"), (stryMutAct_9fa48("1227") ? typeof process === "undefined" : stryMutAct_9fa48("1226") ? true : (stryCov_9fa48("1226", "1227"), typeof process !== (stryMutAct_9fa48("1228") ? "" : (stryCov_9fa48("1228"), "undefined")))) && process.env.JEST_WORKER_ID)))) {
  if (stryMutAct_9fa48("1229")) {
    {}
  } else {
    stryCov_9fa48("1229");
    try {
      if (stryMutAct_9fa48("1230")) {
        {}
      } else {
        stryCov_9fa48("1230");
        const originalLocation = window.location;
        try {
          if (stryMutAct_9fa48("1231")) {
            {}
          } else {
            stryCov_9fa48("1231");
            delete (window as any).location;
          }
        } catch {
          // no-op
        }
        Object.defineProperty(window, stryMutAct_9fa48("1232") ? "" : (stryCov_9fa48("1232"), "location"), stryMutAct_9fa48("1233") ? {} : (stryCov_9fa48("1233"), {
          configurable: stryMutAct_9fa48("1234") ? false : (stryCov_9fa48("1234"), true),
          writable: stryMutAct_9fa48("1235") ? false : (stryCov_9fa48("1235"), true),
          value: originalLocation
        }));
      }
    } catch {
      // no-op if unable to redefine location
    }
  }
}

// Constants for configuration and state management - now using centralized constants
const BUTTON_ID_PREFIX = UI_CONSTANTS.BUTTON_ID_PREFIX;
const DRAG_HANDLE_CLASS = UI_CONSTANTS.DRAG_HANDLE_CLASS;
const BUTTON_TEXT = UI_CONSTANTS.BUTTON_TEXT;
const CHECK_INTERVAL = UI_CONSTANTS.VIDEO_CHECK_INTERVAL;
const MAX_CHECKS = UI_CONSTANTS.MAX_VIDEO_CHECKS;
const VIDEO_SELECTOR = DOM_SELECTORS.VIDEO_SELECTORS;

// Visual guidelines are enforced via CSS classes in content.css

// Temporary background colors used by the button for feedback
const EVD_BUTTON_TEMPORARY_BACKGROUNDS: string[] = stryMutAct_9fa48("1236") ? [] : (stryCov_9fa48("1236"), [stryMutAct_9fa48("1237") ? "" : (stryCov_9fa48("1237"), "rgba(255, 0, 0, 0.7)"), // FAILED
stryMutAct_9fa48("1238") ? "" : (stryCov_9fa48("1238"), "rgb(255, 0, 0)"), // FAILED - sometimes computed as rgb
stryMutAct_9fa48("1239") ? "" : (stryCov_9fa48("1239"), "rgba(0, 128, 0, 0.7)"), // SENT/SUCCESS
stryMutAct_9fa48("1240") ? "" : (stryCov_9fa48("1240"), "rgb(0, 128, 0)"), // SENT/SUCCESS - sometimes computed as rgb
stryMutAct_9fa48("1241") ? "" : (stryCov_9fa48("1241"), "rgba(255, 165, 0, 0.7)"), // RETRY/WARNING
stryMutAct_9fa48("1242") ? "" : (stryCov_9fa48("1242"), "rgb(255, 165, 0)") // RETRY/WARNING - sometimes computed as rgb
]);

// Global state variables - now managed by centralized state manager
const CLICK_THRESHOLD = UI_CONSTANTS.CLICK_THRESHOLD;
let checkIntervalId: number | null = null;
let buttonObserver: MutationObserver | null = null; // MutationObserver to watch for button removal
const injectedButtons = new Map<HTMLElement, HTMLElement>(); // Map to store buttons injected for specific videos

// State managed by centralized state manager
let downloadButton: HTMLElement | null = null;

// Utility functions - now using centralized logger
const log = stryMutAct_9fa48("1243") ? () => undefined : (stryCov_9fa48("1243"), (() => {
  const log = (...args: any[]): void => logger.info(args.join(stryMutAct_9fa48("1244") ? "" : (stryCov_9fa48("1244"), " ")), stryMutAct_9fa48("1245") ? {} : (stryCov_9fa48("1245"), {
    component: stryMutAct_9fa48("1246") ? "" : (stryCov_9fa48("1246"), "content")
  }));
  return log;
})());
const _warn = stryMutAct_9fa48("1247") ? () => undefined : (stryCov_9fa48("1247"), (() => {
  const _warn = (...args: any[]): void => logger.warn(args.join(stryMutAct_9fa48("1248") ? "" : (stryCov_9fa48("1248"), " ")), stryMutAct_9fa48("1249") ? {} : (stryCov_9fa48("1249"), {
    component: stryMutAct_9fa48("1250") ? "" : (stryCov_9fa48("1250"), "content")
  }));
  return _warn;
})());
const error = stryMutAct_9fa48("1251") ? () => undefined : (stryCov_9fa48("1251"), (() => {
  const error = (...args: any[]): void => logger.error(args.join(stryMutAct_9fa48("1252") ? "" : (stryCov_9fa48("1252"), " ")), stryMutAct_9fa48("1253") ? {} : (stryCov_9fa48("1253"), {
    component: stryMutAct_9fa48("1254") ? "" : (stryCov_9fa48("1254"), "content")
  }));
  return error;
})());

// Detect if running under Jest tests (skip async observers/logs in test environment)
const isJest = stryMutAct_9fa48("1257") ? typeof process !== "undefined" && process.env || typeof process.env.JEST_WORKER_ID !== "undefined" : stryMutAct_9fa48("1256") ? false : stryMutAct_9fa48("1255") ? true : (stryCov_9fa48("1255", "1256", "1257"), (stryMutAct_9fa48("1259") ? typeof process !== "undefined" || process.env : stryMutAct_9fa48("1258") ? true : (stryCov_9fa48("1258", "1259"), (stryMutAct_9fa48("1261") ? typeof process === "undefined" : stryMutAct_9fa48("1260") ? true : (stryCov_9fa48("1260", "1261"), typeof process !== (stryMutAct_9fa48("1262") ? "" : (stryCov_9fa48("1262"), "undefined")))) && process.env)) && (stryMutAct_9fa48("1264") ? typeof process.env.JEST_WORKER_ID === "undefined" : stryMutAct_9fa48("1263") ? true : (stryCov_9fa48("1263", "1264"), typeof process.env.JEST_WORKER_ID !== (stryMutAct_9fa48("1265") ? "" : (stryCov_9fa48("1265"), "undefined")))));

/**
 * Gets the stored button state (position and hidden status) for the current domain.
 * Uses dynamic window.location.hostname to determine the storage key.
 * @returns A promise that resolves with the button state.
 */
async function getButtonState(): Promise<ButtonState> {
  if (stryMutAct_9fa48("1266")) {
    {}
  } else {
    stryCov_9fa48("1266");
    const domain = getHostname();
    return new Promise(resolve => {
      if (stryMutAct_9fa48("1267")) {
        {}
      } else {
        stryCov_9fa48("1267");
        try {
          if (stryMutAct_9fa48("1268")) {
            {}
          } else {
            stryCov_9fa48("1268");
            chrome.storage.local.get(domain, result => {
              if (stryMutAct_9fa48("1269")) {
                {}
              } else {
                stryCov_9fa48("1269");
                if (stryMutAct_9fa48("1271") ? false : stryMutAct_9fa48("1270") ? true : (stryCov_9fa48("1270", "1271"), chrome.runtime.lastError)) {
                  if (stryMutAct_9fa48("1272")) {
                    {}
                  } else {
                    stryCov_9fa48("1272");
                    error(stryMutAct_9fa48("1273") ? "" : (stryCov_9fa48("1273"), "Error getting button state from storage:"), chrome.runtime.lastError.message);
                    resolve(stryMutAct_9fa48("1274") ? {} : (stryCov_9fa48("1274"), {
                      x: 10,
                      y: 10,
                      hidden: stryMutAct_9fa48("1275") ? true : (stryCov_9fa48("1275"), false)
                    }));
                    return;
                  }
                }
                resolve(stryMutAct_9fa48("1278") ? (result as any)[domain] && {
                  x: 10,
                  y: 10,
                  hidden: false
                } : stryMutAct_9fa48("1277") ? false : stryMutAct_9fa48("1276") ? true : (stryCov_9fa48("1276", "1277", "1278"), (result as any)[domain] || (stryMutAct_9fa48("1279") ? {} : (stryCov_9fa48("1279"), {
                  x: 10,
                  y: 10,
                  hidden: stryMutAct_9fa48("1280") ? true : (stryCov_9fa48("1280"), false)
                }))));
              }
            });
          }
        } catch (e) {
          if (stryMutAct_9fa48("1281")) {
            {}
          } else {
            stryCov_9fa48("1281");
            error(stryMutAct_9fa48("1282") ? "" : (stryCov_9fa48("1282"), "Error getting button state from storage:"), (e as Error).message);
            resolve(stryMutAct_9fa48("1283") ? {} : (stryCov_9fa48("1283"), {
              x: 10,
              y: 10,
              hidden: stryMutAct_9fa48("1284") ? true : (stryCov_9fa48("1284"), false)
            }));
          }
        }
      }
    });
  }
}

/**
 * Saves the button state (position and hidden status) for the current domain.
 * Uses dynamic window.location.hostname to determine the storage key.
 * @param state - The button state to save.
 * @returns A promise that resolves when saving completes.
 */
async function saveButtonState(state: ButtonState): Promise<void> {
  if (stryMutAct_9fa48("1285")) {
    {}
  } else {
    stryCov_9fa48("1285");
    const host = getHostname();
    const data = stryMutAct_9fa48("1286") ? {} : (stryCov_9fa48("1286"), {
      [host]: state
    });
    return new Promise(resolve => {
      if (stryMutAct_9fa48("1287")) {
        {}
      } else {
        stryCov_9fa48("1287");
        chrome.storage.local.set(data, () => {
          if (stryMutAct_9fa48("1288")) {
            {}
          } else {
            stryCov_9fa48("1288");
            if (stryMutAct_9fa48("1290") ? false : stryMutAct_9fa48("1289") ? true : (stryCov_9fa48("1289", "1290"), chrome.runtime.lastError)) {
              if (stryMutAct_9fa48("1291")) {
                {}
              } else {
                stryCov_9fa48("1291");
                error(stryMutAct_9fa48("1292") ? "" : (stryCov_9fa48("1292"), "Error saving button state to storage:"), chrome.runtime.lastError.message);
              }
            }
            resolve();
          }
        });
      }
    });
  }
}

/**
 * Generates an ID for a button.
 * @param videoElement - Optional video element.
 * @returns The button ID.
 */
function getButtonId(videoElement: HTMLElement | null = null): string {
  if (stryMutAct_9fa48("1293")) {
    {}
  } else {
    stryCov_9fa48("1293");
    if (stryMutAct_9fa48("1295") ? false : stryMutAct_9fa48("1294") ? true : (stryCov_9fa48("1294", "1295"), videoElement)) {
      if (stryMutAct_9fa48("1296")) {
        {}
      } else {
        stryCov_9fa48("1296");
        return stryMutAct_9fa48("1297") ? BUTTON_ID_PREFIX - Date.now() : (stryCov_9fa48("1297"), BUTTON_ID_PREFIX + Date.now());
      }
    } else {
      if (stryMutAct_9fa48("1298")) {
        {}
      } else {
        stryCov_9fa48("1298");
        return stryMutAct_9fa48("1299") ? "" : (stryCov_9fa48("1299"), "evd-download-button-main");
      }
    }
  }
}

/**
 * Ensures the download button's style adheres to guidelines and is visible,
 * especially against interference from other extensions like DarkReader.
 * @param {HTMLElement} buttonElement - The button to style.
 * @returns {void}
 */
function ensureDownloadButtonStyle(buttonElement: HTMLElement): void {
  if (stryMutAct_9fa48("1300")) {
    {}
  } else {
    stryCov_9fa48("1300");
    if (stryMutAct_9fa48("1303") ? (!document || !document.body) && !document.body.contains(buttonElement) : stryMutAct_9fa48("1302") ? false : stryMutAct_9fa48("1301") ? true : (stryCov_9fa48("1301", "1302", "1303"), (stryMutAct_9fa48("1305") ? !document && !document.body : stryMutAct_9fa48("1304") ? false : (stryCov_9fa48("1304", "1305"), (stryMutAct_9fa48("1306") ? document : (stryCov_9fa48("1306"), !document)) || (stryMutAct_9fa48("1307") ? document.body : (stryCov_9fa48("1307"), !document.body)))) || (stryMutAct_9fa48("1308") ? document.body.contains(buttonElement) : (stryCov_9fa48("1308"), !document.body.contains(buttonElement))))) {
      if (stryMutAct_9fa48("1309")) {
        {}
      } else {
        stryCov_9fa48("1309");
        return;
      }
    }
    const computedStyle = window.getComputedStyle(buttonElement);
    let _styleAdjusted = stryMutAct_9fa48("1310") ? true : (stryCov_9fa48("1310"), false); // For logging
    const isYouTubeEnhanced = buttonElement.classList.contains(stryMutAct_9fa48("1311") ? "" : (stryCov_9fa48("1311"), "youtube-enhanced"));

    // Utility: parse rgb/rgba string to [r,g,b]
    const parseColor = (color: string): [number, number, number] | null => {
      if (stryMutAct_9fa48("1312")) {
        {}
      } else {
        stryCov_9fa48("1312");
        const m = color.replace(stryMutAct_9fa48("1314") ? /\S+/g : stryMutAct_9fa48("1313") ? /\s/g : (stryCov_9fa48("1313", "1314"), /\s+/g), stryMutAct_9fa48("1315") ? "Stryker was here!" : (stryCov_9fa48("1315"), "")).match(stryMutAct_9fa48("1327") ? /^rgba?\((\d+),(\d+),(\d+)(?:,([^0-9.]+))?\)$/i : stryMutAct_9fa48("1326") ? /^rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]))?\)$/i : stryMutAct_9fa48("1325") ? /^rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))\)$/i : stryMutAct_9fa48("1324") ? /^rgba?\((\d+),(\d+),(\D+)(?:,([0-9.]+))?\)$/i : stryMutAct_9fa48("1323") ? /^rgba?\((\d+),(\d+),(\d)(?:,([0-9.]+))?\)$/i : stryMutAct_9fa48("1322") ? /^rgba?\((\d+),(\D+),(\d+)(?:,([0-9.]+))?\)$/i : stryMutAct_9fa48("1321") ? /^rgba?\((\d+),(\d),(\d+)(?:,([0-9.]+))?\)$/i : stryMutAct_9fa48("1320") ? /^rgba?\((\D+),(\d+),(\d+)(?:,([0-9.]+))?\)$/i : stryMutAct_9fa48("1319") ? /^rgba?\((\d),(\d+),(\d+)(?:,([0-9.]+))?\)$/i : stryMutAct_9fa48("1318") ? /^rgba\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)$/i : stryMutAct_9fa48("1317") ? /^rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)/i : stryMutAct_9fa48("1316") ? /rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)$/i : (stryCov_9fa48("1316", "1317", "1318", "1319", "1320", "1321", "1322", "1323", "1324", "1325", "1326", "1327"), /^rgba?\((\d+),(\d+),(\d+)(?:,([0-9.]+))?\)$/i));
        if (stryMutAct_9fa48("1330") ? false : stryMutAct_9fa48("1329") ? true : stryMutAct_9fa48("1328") ? m : (stryCov_9fa48("1328", "1329", "1330"), !m)) return null;
        return stryMutAct_9fa48("1331") ? [] : (stryCov_9fa48("1331"), [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)]);
      }
    };

    // Utility: estimate luminance
    const luminance = stryMutAct_9fa48("1332") ? () => undefined : (stryCov_9fa48("1332"), (() => {
      const luminance = (rgb: [number, number, number]): number => stryMutAct_9fa48("1333") ? 0.2126 * rgb[0] + 0.7152 * rgb[1] - 0.0722 * rgb[2] : (stryCov_9fa48("1333"), (stryMutAct_9fa48("1334") ? 0.2126 * rgb[0] - 0.7152 * rgb[1] : (stryCov_9fa48("1334"), (stryMutAct_9fa48("1335") ? 0.2126 / rgb[0] : (stryCov_9fa48("1335"), 0.2126 * rgb[0])) + (stryMutAct_9fa48("1336") ? 0.7152 / rgb[1] : (stryCov_9fa48("1336"), 0.7152 * rgb[1])))) + (stryMutAct_9fa48("1337") ? 0.0722 / rgb[2] : (stryCov_9fa48("1337"), 0.0722 * rgb[2])));
      return luminance;
    })());

    // Phase 1: Ensure visibility via class toggles (no inline fallbacks)
    if (stryMutAct_9fa48("1340") ? computedStyle.display === "none" && buttonElement.classList.contains("hidden") : stryMutAct_9fa48("1339") ? false : stryMutAct_9fa48("1338") ? true : (stryCov_9fa48("1338", "1339", "1340"), (stryMutAct_9fa48("1342") ? computedStyle.display !== "none" : stryMutAct_9fa48("1341") ? false : (stryCov_9fa48("1341", "1342"), computedStyle.display === (stryMutAct_9fa48("1343") ? "" : (stryCov_9fa48("1343"), "none")))) || buttonElement.classList.contains(stryMutAct_9fa48("1344") ? "" : (stryCov_9fa48("1344"), "hidden")))) {
      if (stryMutAct_9fa48("1345")) {
        {}
      } else {
        stryCov_9fa48("1345");
        buttonElement.classList.remove(stryMutAct_9fa48("1346") ? "" : (stryCov_9fa48("1346"), "hidden"));
        buttonElement.classList.add(stryMutAct_9fa48("1347") ? "" : (stryCov_9fa48("1347"), "evd-visible"));
        _styleAdjusted = stryMutAct_9fa48("1348") ? false : (stryCov_9fa48("1348"), true);
        log(stryMutAct_9fa48("1349") ? "" : (stryCov_9fa48("1349"), "EVD button was hidden; made visible via class."));
      }
    } else if (stryMutAct_9fa48("1352") ? false : stryMutAct_9fa48("1351") ? true : stryMutAct_9fa48("1350") ? buttonElement.classList.contains("evd-visible") : (stryCov_9fa48("1350", "1351", "1352"), !buttonElement.classList.contains(stryMutAct_9fa48("1353") ? "" : (stryCov_9fa48("1353"), "evd-visible")))) {
      if (stryMutAct_9fa48("1354")) {
        {}
      } else {
        stryCov_9fa48("1354");
        buttonElement.classList.add(stryMutAct_9fa48("1355") ? "" : (stryCov_9fa48("1355"), "evd-visible"));
      }
    }

    // Phase 2: Enforce guideline styles for the button's DEFAULT state
    const currentInlineBg = buttonElement.style.backgroundColor;
    const isTemporaryFeedbackState = stryMutAct_9fa48("1356") ? EVD_BUTTON_TEMPORARY_BACKGROUNDS.every(tmpBg => currentInlineBg.replace(/\s/g, "") === tmpBg.replace(/\s/g, "")) : (stryCov_9fa48("1356"), EVD_BUTTON_TEMPORARY_BACKGROUNDS.some(stryMutAct_9fa48("1357") ? () => undefined : (stryCov_9fa48("1357"), tmpBg => stryMutAct_9fa48("1360") ? currentInlineBg.replace(/\s/g, "") !== tmpBg.replace(/\s/g, "") : stryMutAct_9fa48("1359") ? false : stryMutAct_9fa48("1358") ? true : (stryCov_9fa48("1358", "1359", "1360"), currentInlineBg.replace(stryMutAct_9fa48("1361") ? /\S/g : (stryCov_9fa48("1361"), /\s/g), stryMutAct_9fa48("1362") ? "Stryker was here!" : (stryCov_9fa48("1362"), "")) === tmpBg.replace(stryMutAct_9fa48("1363") ? /\S/g : (stryCov_9fa48("1363"), /\s/g), stryMutAct_9fa48("1364") ? "Stryker was here!" : (stryCov_9fa48("1364"), ""))))));

    // Phase 2: Base look & feel handled by CSS class `.download-button`

    // Phase 2b: Choose contrast-aware colors based on page background
    try {
      if (stryMutAct_9fa48("1365")) {
        {}
      } else {
        stryCov_9fa48("1365");
        // Respect temporary feedback colors; do not override background during feedback
        if (stryMutAct_9fa48("1368") ? false : stryMutAct_9fa48("1367") ? true : stryMutAct_9fa48("1366") ? isTemporaryFeedbackState : (stryCov_9fa48("1366", "1367", "1368"), !isTemporaryFeedbackState)) {
          if (stryMutAct_9fa48("1369")) {
            {}
          } else {
            stryCov_9fa48("1369");
            const pageBg = stryMutAct_9fa48("1372") ? window.getComputedStyle(document.body).backgroundColor && "rgb(0,0,0)" : stryMutAct_9fa48("1371") ? false : stryMutAct_9fa48("1370") ? true : (stryCov_9fa48("1370", "1371", "1372"), window.getComputedStyle(document.body).backgroundColor || (stryMutAct_9fa48("1373") ? "" : (stryCov_9fa48("1373"), "rgb(0,0,0)")));
            const rgb = stryMutAct_9fa48("1376") ? parseColor(pageBg) && [0, 0, 0] : stryMutAct_9fa48("1375") ? false : stryMutAct_9fa48("1374") ? true : (stryCov_9fa48("1374", "1375", "1376"), parseColor(pageBg) || (stryMutAct_9fa48("1377") ? [] : (stryCov_9fa48("1377"), [0, 0, 0])));
            const isDarkBg = stryMutAct_9fa48("1381") ? luminance(rgb) >= 128 : stryMutAct_9fa48("1380") ? luminance(rgb) <= 128 : stryMutAct_9fa48("1379") ? false : stryMutAct_9fa48("1378") ? true : (stryCov_9fa48("1378", "1379", "1380", "1381"), luminance(rgb) < 128); // rough threshold
            buttonElement.classList.remove(stryMutAct_9fa48("1382") ? "" : (stryCov_9fa48("1382"), "evd-on-dark"), stryMutAct_9fa48("1383") ? "" : (stryCov_9fa48("1383"), "evd-on-light"));
            buttonElement.classList.add(isDarkBg ? stryMutAct_9fa48("1384") ? "" : (stryCov_9fa48("1384"), "evd-on-dark") : stryMutAct_9fa48("1385") ? "" : (stryCov_9fa48("1385"), "evd-on-light"));
            _styleAdjusted = stryMutAct_9fa48("1386") ? false : (stryCov_9fa48("1386"), true);
          }
        }
      }
    } catch {
      // ignore color detection errors
    }

    // Phase 3: Keep button within viewport bounds (avoid off-screen positioning)
    try {
      if (stryMutAct_9fa48("1387")) {
        {}
      } else {
        stryCov_9fa48("1387");
        const rect = buttonElement.getBoundingClientRect();
        let clamped = stryMutAct_9fa48("1388") ? true : (stryCov_9fa48("1388"), false);
        const margin = 16;
        const maxLeft = stryMutAct_9fa48("1389") ? Math.min(0, window.innerWidth - Math.max(rect.width, 100) - margin) : (stryCov_9fa48("1389"), Math.max(0, stryMutAct_9fa48("1390") ? window.innerWidth - Math.max(rect.width, 100) + margin : (stryCov_9fa48("1390"), (stryMutAct_9fa48("1391") ? window.innerWidth + Math.max(rect.width, 100) : (stryCov_9fa48("1391"), window.innerWidth - (stryMutAct_9fa48("1392") ? Math.min(rect.width, 100) : (stryCov_9fa48("1392"), Math.max(rect.width, 100))))) - margin)));
        const maxTop = stryMutAct_9fa48("1393") ? Math.min(0, window.innerHeight - Math.max(rect.height, 40) - margin) : (stryCov_9fa48("1393"), Math.max(0, stryMutAct_9fa48("1394") ? window.innerHeight - Math.max(rect.height, 40) + margin : (stryCov_9fa48("1394"), (stryMutAct_9fa48("1395") ? window.innerHeight + Math.max(rect.height, 40) : (stryCov_9fa48("1395"), window.innerHeight - (stryMutAct_9fa48("1396") ? Math.min(rect.height, 40) : (stryCov_9fa48("1396"), Math.max(rect.height, 40))))) - margin)));
        const currentLeft = stryMutAct_9fa48("1397") ? Math.min(0, parseInt(buttonElement.style.left || "0", 10) || 0) : (stryCov_9fa48("1397"), Math.max(0, stryMutAct_9fa48("1400") ? parseInt(buttonElement.style.left || "0", 10) && 0 : stryMutAct_9fa48("1399") ? false : stryMutAct_9fa48("1398") ? true : (stryCov_9fa48("1398", "1399", "1400"), parseInt(stryMutAct_9fa48("1403") ? buttonElement.style.left && "0" : stryMutAct_9fa48("1402") ? false : stryMutAct_9fa48("1401") ? true : (stryCov_9fa48("1401", "1402", "1403"), buttonElement.style.left || (stryMutAct_9fa48("1404") ? "" : (stryCov_9fa48("1404"), "0"))), 10) || 0)));
        const currentTop = stryMutAct_9fa48("1405") ? Math.min(0, parseInt(buttonElement.style.top || "0", 10) || 0) : (stryCov_9fa48("1405"), Math.max(0, stryMutAct_9fa48("1408") ? parseInt(buttonElement.style.top || "0", 10) && 0 : stryMutAct_9fa48("1407") ? false : stryMutAct_9fa48("1406") ? true : (stryCov_9fa48("1406", "1407", "1408"), parseInt(stryMutAct_9fa48("1411") ? buttonElement.style.top && "0" : stryMutAct_9fa48("1410") ? false : stryMutAct_9fa48("1409") ? true : (stryCov_9fa48("1409", "1410", "1411"), buttonElement.style.top || (stryMutAct_9fa48("1412") ? "" : (stryCov_9fa48("1412"), "0"))), 10) || 0)));
        if (stryMutAct_9fa48("1416") ? currentLeft <= maxLeft : stryMutAct_9fa48("1415") ? currentLeft >= maxLeft : stryMutAct_9fa48("1414") ? false : stryMutAct_9fa48("1413") ? true : (stryCov_9fa48("1413", "1414", "1415", "1416"), currentLeft > maxLeft)) {
          if (stryMutAct_9fa48("1417")) {
            {}
          } else {
            stryCov_9fa48("1417");
            buttonElement.style.left = String(maxLeft) + (stryMutAct_9fa48("1418") ? "" : (stryCov_9fa48("1418"), "px"));
            clamped = stryMutAct_9fa48("1419") ? false : (stryCov_9fa48("1419"), true);
          }
        }
        if (stryMutAct_9fa48("1423") ? currentTop <= maxTop : stryMutAct_9fa48("1422") ? currentTop >= maxTop : stryMutAct_9fa48("1421") ? false : stryMutAct_9fa48("1420") ? true : (stryCov_9fa48("1420", "1421", "1422", "1423"), currentTop > maxTop)) {
          if (stryMutAct_9fa48("1424")) {
            {}
          } else {
            stryCov_9fa48("1424");
            buttonElement.style.top = String(maxTop) + (stryMutAct_9fa48("1425") ? "" : (stryCov_9fa48("1425"), "px"));
            clamped = stryMutAct_9fa48("1426") ? false : (stryCov_9fa48("1426"), true);
          }
        }
        if (stryMutAct_9fa48("1430") ? currentTop >= 0 : stryMutAct_9fa48("1429") ? currentTop <= 0 : stryMutAct_9fa48("1428") ? false : stryMutAct_9fa48("1427") ? true : (stryCov_9fa48("1427", "1428", "1429", "1430"), currentTop < 0)) {
          if (stryMutAct_9fa48("1431")) {
            {}
          } else {
            stryCov_9fa48("1431");
            buttonElement.style.top = stryMutAct_9fa48("1432") ? "" : (stryCov_9fa48("1432"), "10px");
            clamped = stryMutAct_9fa48("1433") ? false : (stryCov_9fa48("1433"), true);
          }
        }
        if (stryMutAct_9fa48("1435") ? false : stryMutAct_9fa48("1434") ? true : (stryCov_9fa48("1434", "1435"), clamped)) {
          if (stryMutAct_9fa48("1436")) {
            {}
          } else {
            stryCov_9fa48("1436");
            _styleAdjusted = stryMutAct_9fa48("1437") ? false : (stryCov_9fa48("1437"), true);
            log(stryMutAct_9fa48("1438") ? "" : (stryCov_9fa48("1438"), "EVD button position clamped to viewport bounds."));
          }
        }
      }
    } catch {
      // Ignore positioning errors
    }
  }
}

/**
 * Creates or updates the download button for a video element.
 * @param videoElement - Optional video element to create a button for.
 * @returns Promise resolving to the created or updated button element.
 */
async function createOrUpdateButton(videoElement: HTMLElement | null = null): Promise<HTMLElement> {
  if (stryMutAct_9fa48("1439")) {
    {}
  } else {
    stryCov_9fa48("1439");
    // If we already have a button and no video is specified, return existing button
    if (stryMutAct_9fa48("1442") ? downloadButton || !videoElement : stryMutAct_9fa48("1441") ? false : stryMutAct_9fa48("1440") ? true : (stryCov_9fa48("1440", "1441", "1442"), downloadButton && (stryMutAct_9fa48("1443") ? videoElement : (stryCov_9fa48("1443"), !videoElement)))) {
      if (stryMutAct_9fa48("1444")) {
        {}
      } else {
        stryCov_9fa48("1444");
        ensureDownloadButtonStyle(downloadButton);
        return downloadButton;
      }
    }

    // If we have a video and already injected a button for it, return that button
    if (stryMutAct_9fa48("1447") ? videoElement || injectedButtons.has(videoElement) : stryMutAct_9fa48("1446") ? false : stryMutAct_9fa48("1445") ? true : (stryCov_9fa48("1445", "1446", "1447"), videoElement && injectedButtons.has(videoElement))) {
      if (stryMutAct_9fa48("1448")) {
        {}
      } else {
        stryCov_9fa48("1448");
        const existingButton = injectedButtons.get(videoElement);
        if (stryMutAct_9fa48("1451") ? existingButton || document.body.contains(existingButton) : stryMutAct_9fa48("1450") ? false : stryMutAct_9fa48("1449") ? true : (stryCov_9fa48("1449", "1450", "1451"), existingButton && document.body.contains(existingButton))) {
          if (stryMutAct_9fa48("1452")) {
            {}
          } else {
            stryCov_9fa48("1452");
            ensureDownloadButtonStyle(existingButton);
            return existingButton;
          }
        }
      }
    }

    // Create a new button
    const btn = document.createElement(stryMutAct_9fa48("1453") ? "" : (stryCov_9fa48("1453"), "button"));
    btn.id = getButtonId(videoElement);
    btn.textContent = BUTTON_TEXT;
    btn.className = DRAG_HANDLE_CLASS;

    // Set initial position and style
    btn.classList.add(stryMutAct_9fa48("1454") ? "" : (stryCov_9fa48("1454"), "download-button"));
    btn.classList.add(stryMutAct_9fa48("1455") ? "" : (stryCov_9fa48("1455"), "evd-visible"));

    // Get stored state or default
    const state = await getButtonState();

    // Apply position (respect hidden state later)
    if (stryMutAct_9fa48("1458") ? typeof state.x === "number" || typeof state.y === "number" : stryMutAct_9fa48("1457") ? false : stryMutAct_9fa48("1456") ? true : (stryCov_9fa48("1456", "1457", "1458"), (stryMutAct_9fa48("1460") ? typeof state.x !== "number" : stryMutAct_9fa48("1459") ? true : (stryCov_9fa48("1459", "1460"), typeof state.x === (stryMutAct_9fa48("1461") ? "" : (stryCov_9fa48("1461"), "number")))) && (stryMutAct_9fa48("1463") ? typeof state.y !== "number" : stryMutAct_9fa48("1462") ? true : (stryCov_9fa48("1462", "1463"), typeof state.y === (stryMutAct_9fa48("1464") ? "" : (stryCov_9fa48("1464"), "number")))))) {
      if (stryMutAct_9fa48("1465")) {
        {}
      } else {
        stryCov_9fa48("1465");
        btn.style.left = String(state.x) + (stryMutAct_9fa48("1466") ? "" : (stryCov_9fa48("1466"), "px"));
        btn.style.top = String(state.y) + (stryMutAct_9fa48("1467") ? "" : (stryCov_9fa48("1467"), "px"));
      }
    } else {
      if (stryMutAct_9fa48("1468")) {
        {}
      } else {
        stryCov_9fa48("1468");
        // Default position in top-left
        btn.style.left = stryMutAct_9fa48("1469") ? "" : (stryCov_9fa48("1469"), "10px");
        btn.style.top = stryMutAct_9fa48("1470") ? "" : (stryCov_9fa48("1470"), "10px");
      }
    }

    // Add to document
    document.body.appendChild(btn);

    // Apply YouTube-specific enhancements if applicable
    enhanceYouTubeButton(btn);

    // Ensure button has correct style
    ensureDownloadButtonStyle(btn);

    // Add event listeners for dragging
    btn.addEventListener(stryMutAct_9fa48("1471") ? "" : (stryCov_9fa48("1471"), "mousedown"), e => {
      if (stryMutAct_9fa48("1472")) {
        {}
      } else {
        stryCov_9fa48("1472");
        if (stryMutAct_9fa48("1475") ? e.button === 0 : stryMutAct_9fa48("1474") ? false : stryMutAct_9fa48("1473") ? true : (stryCov_9fa48("1473", "1474", "1475"), e.button !== 0)) return; // Only left mouse button

        const rect = btn.getBoundingClientRect();
        stateManager.updateUIState(stryMutAct_9fa48("1476") ? {} : (stryCov_9fa48("1476"), {
          isDragging: stryMutAct_9fa48("1477") ? false : (stryCov_9fa48("1477"), true),
          buttonPosition: stryMutAct_9fa48("1478") ? {} : (stryCov_9fa48("1478"), {
            x: stryMutAct_9fa48("1479") ? e.clientX + rect.left : (stryCov_9fa48("1479"), e.clientX - rect.left),
            y: stryMutAct_9fa48("1480") ? e.clientY + rect.top : (stryCov_9fa48("1480"), e.clientY - rect.top)
          })
        }));

        // Add document-level listeners
        document.addEventListener(stryMutAct_9fa48("1481") ? "" : (stryCov_9fa48("1481"), "mousemove"), onDrag);
        document.addEventListener(stryMutAct_9fa48("1482") ? "" : (stryCov_9fa48("1482"), "mouseup"), onDragEnd);

        // Prevent text selection during drag
        e.preventDefault();
      }
    });

    // Add click listener for download action
    btn.addEventListener(stryMutAct_9fa48("1483") ? "" : (stryCov_9fa48("1483"), "click"), async e => {
      if (stryMutAct_9fa48("1484")) {
        {}
      } else {
        stryCov_9fa48("1484");
        // Only handle as click if not dragged significantly
        const currentState = stateManager.getUIState();
        const now = Date.now();
        const timeSinceLastClick = stryMutAct_9fa48("1485") ? now + currentState.lastClickTime : (stryCov_9fa48("1485"), now - currentState.lastClickTime);
        if (stryMutAct_9fa48("1488") ? !currentState.isDragging || timeSinceLastClick > CLICK_THRESHOLD : stryMutAct_9fa48("1487") ? false : stryMutAct_9fa48("1486") ? true : (stryCov_9fa48("1486", "1487", "1488"), (stryMutAct_9fa48("1489") ? currentState.isDragging : (stryCov_9fa48("1489"), !currentState.isDragging)) && (stryMutAct_9fa48("1492") ? timeSinceLastClick <= CLICK_THRESHOLD : stryMutAct_9fa48("1491") ? timeSinceLastClick >= CLICK_THRESHOLD : stryMutAct_9fa48("1490") ? true : (stryCov_9fa48("1490", "1491", "1492"), timeSinceLastClick > CLICK_THRESHOLD)))) {
          if (stryMutAct_9fa48("1493")) {
            {}
          } else {
            stryCov_9fa48("1493");
            // Update last click time
            stateManager.updateUIState(stryMutAct_9fa48("1494") ? {} : (stryCov_9fa48("1494"), {
              lastClickTime: now
            }));
            e.preventDefault();
            e.stopPropagation();

            // Add visual feedback
            btn.classList.add(stryMutAct_9fa48("1495") ? "" : (stryCov_9fa48("1495"), "download-sending"));
            try {
              if (stryMutAct_9fa48("1496")) {
                {}
              } else {
                stryCov_9fa48("1496");
                // Determine download URL, avoid blob URLs by falling back to page URL
                const rawUrl = (stryMutAct_9fa48("1499") ? videoElement && videoElement.tagName === "VIDEO" || (videoElement as HTMLVideoElement).src : stryMutAct_9fa48("1498") ? false : stryMutAct_9fa48("1497") ? true : (stryCov_9fa48("1497", "1498", "1499"), (stryMutAct_9fa48("1501") ? videoElement || videoElement.tagName === "VIDEO" : stryMutAct_9fa48("1500") ? true : (stryCov_9fa48("1500", "1501"), videoElement && (stryMutAct_9fa48("1503") ? videoElement.tagName !== "VIDEO" : stryMutAct_9fa48("1502") ? true : (stryCov_9fa48("1502", "1503"), videoElement.tagName === (stryMutAct_9fa48("1504") ? "" : (stryCov_9fa48("1504"), "VIDEO")))))) && (videoElement as HTMLVideoElement).src)) ? (videoElement as HTMLVideoElement).src : window.location.href;
                const url = (stryMutAct_9fa48("1505") ? rawUrl.endsWith("blob:") : (stryCov_9fa48("1505"), rawUrl.startsWith(stryMutAct_9fa48("1506") ? "" : (stryCov_9fa48("1506"), "blob:")))) ? window.location.href : rawUrl;

                // Send message to background script
                chrome.runtime.sendMessage(stryMutAct_9fa48("1507") ? {} : (stryCov_9fa48("1507"), {
                  type: stryMutAct_9fa48("1508") ? "" : (stryCov_9fa48("1508"), "downloadVideo"),
                  url: url
                }), response => {
                  if (stryMutAct_9fa48("1509")) {
                    {}
                  } else {
                    stryCov_9fa48("1509");
                    if (stryMutAct_9fa48("1511") ? false : stryMutAct_9fa48("1510") ? true : (stryCov_9fa48("1510", "1511"), chrome.runtime.lastError)) {
                      if (stryMutAct_9fa48("1512")) {
                        {}
                      } else {
                        stryCov_9fa48("1512");
                        error(stryMutAct_9fa48("1513") ? "" : (stryCov_9fa48("1513"), "Error sending download request:"), chrome.runtime.lastError.message);
                        btn.classList.remove(stryMutAct_9fa48("1514") ? "" : (stryCov_9fa48("1514"), "download-sending"));
                        btn.classList.add(stryMutAct_9fa48("1515") ? "" : (stryCov_9fa48("1515"), "download-error"));
                        setTimeout(() => {
                          if (stryMutAct_9fa48("1516")) {
                            {}
                          } else {
                            stryCov_9fa48("1516");
                            btn.classList.remove(stryMutAct_9fa48("1517") ? "" : (stryCov_9fa48("1517"), "download-error"));
                          }
                        }, 2000);
                        return;
                      }
                    }
                    if (stryMutAct_9fa48("1520") ? response || response.status === "success" || response.status === "queued" : stryMutAct_9fa48("1519") ? false : stryMutAct_9fa48("1518") ? true : (stryCov_9fa48("1518", "1519", "1520"), response && (stryMutAct_9fa48("1522") ? response.status === "success" && response.status === "queued" : stryMutAct_9fa48("1521") ? true : (stryCov_9fa48("1521", "1522"), (stryMutAct_9fa48("1524") ? response.status !== "success" : stryMutAct_9fa48("1523") ? false : (stryCov_9fa48("1523", "1524"), response.status === (stryMutAct_9fa48("1525") ? "" : (stryCov_9fa48("1525"), "success")))) || (stryMutAct_9fa48("1527") ? response.status !== "queued" : stryMutAct_9fa48("1526") ? false : (stryCov_9fa48("1526", "1527"), response.status === (stryMutAct_9fa48("1528") ? "" : (stryCov_9fa48("1528"), "queued")))))))) {
                      if (stryMutAct_9fa48("1529")) {
                        {}
                      } else {
                        stryCov_9fa48("1529");
                        // Success feedback
                        btn.classList.remove(stryMutAct_9fa48("1530") ? "" : (stryCov_9fa48("1530"), "download-sending"));
                        btn.classList.add(stryMutAct_9fa48("1531") ? "" : (stryCov_9fa48("1531"), "download-success"));
                        setTimeout(() => {
                          if (stryMutAct_9fa48("1532")) {
                            {}
                          } else {
                            stryCov_9fa48("1532");
                            btn.classList.remove(stryMutAct_9fa48("1533") ? "" : (stryCov_9fa48("1533"), "download-success"));
                          }
                        }, 2000);
                      }
                    } else {
                      if (stryMutAct_9fa48("1534")) {
                        {}
                      } else {
                        stryCov_9fa48("1534");
                        // Error feedback
                        btn.classList.remove(stryMutAct_9fa48("1535") ? "" : (stryCov_9fa48("1535"), "download-sending"));
                        btn.classList.add(stryMutAct_9fa48("1536") ? "" : (stryCov_9fa48("1536"), "download-error"));
                        setTimeout(() => {
                          if (stryMutAct_9fa48("1537")) {
                            {}
                          } else {
                            stryCov_9fa48("1537");
                            btn.classList.remove(stryMutAct_9fa48("1538") ? "" : (stryCov_9fa48("1538"), "download-error"));
                          }
                        }, 2000);
                      }
                    }
                  }
                });
              }
            } catch (err) {
              if (stryMutAct_9fa48("1539")) {
                {}
              } else {
                stryCov_9fa48("1539");
                error(stryMutAct_9fa48("1540") ? "" : (stryCov_9fa48("1540"), "Error initiating download:"), err);
                try {
                  if (stryMutAct_9fa48("1541")) {
                    {}
                  } else {
                    stryCov_9fa48("1541");
                    btn.classList.remove(stryMutAct_9fa48("1542") ? "" : (stryCov_9fa48("1542"), "download-sending"));
                    btn.classList.add(stryMutAct_9fa48("1543") ? "" : (stryCov_9fa48("1543"), "download-error"));
                    setTimeout(() => {
                      if (stryMutAct_9fa48("1544")) {
                        {}
                      } else {
                        stryCov_9fa48("1544");
                        btn.classList.remove(stryMutAct_9fa48("1545") ? "" : (stryCov_9fa48("1545"), "download-error"));
                      }
                    }, 2000);
                  }
                } catch {
                  // no-op: visual feedback cleanup best-effort
                }
              }
            }
          }
        }
      }
    });

    // If this is for a specific video, store in our map
    if (stryMutAct_9fa48("1547") ? false : stryMutAct_9fa48("1546") ? true : (stryCov_9fa48("1546", "1547"), videoElement)) {
      if (stryMutAct_9fa48("1548")) {
        {}
      } else {
        stryCov_9fa48("1548");
        injectedButtons.set(videoElement, btn);
      }
    } else {
      if (stryMutAct_9fa48("1549")) {
        {}
      } else {
        stryCov_9fa48("1549");
        // Store in centralized state and assign to global button
        stateManager.updateUIState(stryMutAct_9fa48("1550") ? {} : (stryCov_9fa48("1550"), {
          buttonPosition: stryMutAct_9fa48("1551") ? {} : (stryCov_9fa48("1551"), {
            x: 10,
            y: 10
          })
        }));
        downloadButton = btn;
      }
    }

    // Apply hidden state if needed
    if (stryMutAct_9fa48("1553") ? false : stryMutAct_9fa48("1552") ? true : (stryCov_9fa48("1552", "1553"), state.hidden)) {
      if (stryMutAct_9fa48("1554")) {
        {}
      } else {
        stryCov_9fa48("1554");
        btn.classList.add(stryMutAct_9fa48("1555") ? "" : (stryCov_9fa48("1555"), "hidden"));
        btn.classList.remove(stryMutAct_9fa48("1556") ? "" : (stryCov_9fa48("1556"), "evd-visible"));
      }
    }

    // Set up observer to detect button removal
    if (stryMutAct_9fa48("1559") ? !buttonObserver || !isJest : stryMutAct_9fa48("1558") ? false : stryMutAct_9fa48("1557") ? true : (stryCov_9fa48("1557", "1558", "1559"), (stryMutAct_9fa48("1560") ? buttonObserver : (stryCov_9fa48("1560"), !buttonObserver)) && (stryMutAct_9fa48("1561") ? isJest : (stryCov_9fa48("1561"), !isJest)))) {
      if (stryMutAct_9fa48("1562")) {
        {}
      } else {
        stryCov_9fa48("1562");
        // Only observe DOM mutations outside of Jest tests to avoid async logs
        buttonObserver = new MutationObserver(mutations => {
          if (stryMutAct_9fa48("1563")) {
            {}
          } else {
            stryCov_9fa48("1563");
            for (const mutation of mutations) {
              if (stryMutAct_9fa48("1564")) {
                {}
              } else {
                stryCov_9fa48("1564");
                for (const node of Array.from(mutation.removedNodes)) {
                  if (stryMutAct_9fa48("1565")) {
                    {}
                  } else {
                    stryCov_9fa48("1565");
                    if (stryMutAct_9fa48("1568") ? node instanceof HTMLElement && node.id || node.id.startsWith(BUTTON_ID_PREFIX) : stryMutAct_9fa48("1567") ? false : stryMutAct_9fa48("1566") ? true : (stryCov_9fa48("1566", "1567", "1568"), (stryMutAct_9fa48("1570") ? node instanceof HTMLElement || node.id : stryMutAct_9fa48("1569") ? true : (stryCov_9fa48("1569", "1570"), node instanceof HTMLElement && node.id)) && (stryMutAct_9fa48("1571") ? node.id.endsWith(BUTTON_ID_PREFIX) : (stryCov_9fa48("1571"), node.id.startsWith(BUTTON_ID_PREFIX))))) {
                      if (stryMutAct_9fa48("1572")) {
                        {}
                      } else {
                        stryCov_9fa48("1572");
                        log(stryMutAct_9fa48("1573") ? "" : (stryCov_9fa48("1573"), "Button was removed, re-adding"));
                        createOrUpdateButton();
                        return;
                      }
                    }
                  }
                }
              }
            }
          }
        });
        buttonObserver.observe(document.body, stryMutAct_9fa48("1574") ? {} : (stryCov_9fa48("1574"), {
          childList: stryMutAct_9fa48("1575") ? false : (stryCov_9fa48("1575"), true),
          subtree: stryMutAct_9fa48("1576") ? false : (stryCov_9fa48("1576"), true)
        }));
      }
    }
    return btn;
  }
}

/**
 * Handle dragging of the button
 * @param event - The mouse move event
 */
function onDrag(event: MouseEvent): void {
  if (stryMutAct_9fa48("1577")) {
    {}
  } else {
    stryCov_9fa48("1577");
    const uiState = stateManager.getUIState();
    if (stryMutAct_9fa48("1580") ? !uiState.isDragging && !downloadButton : stryMutAct_9fa48("1579") ? false : stryMutAct_9fa48("1578") ? true : (stryCov_9fa48("1578", "1579", "1580"), (stryMutAct_9fa48("1581") ? uiState.isDragging : (stryCov_9fa48("1581"), !uiState.isDragging)) || (stryMutAct_9fa48("1582") ? downloadButton : (stryCov_9fa48("1582"), !downloadButton)))) return;
    event.preventDefault();

    // Calculate new position using centralized state
    const x = stryMutAct_9fa48("1583") ? event.clientX + uiState.buttonPosition.x : (stryCov_9fa48("1583"), event.clientX - uiState.buttonPosition.x);
    const y = stryMutAct_9fa48("1584") ? event.clientY + uiState.buttonPosition.y : (stryCov_9fa48("1584"), event.clientY - uiState.buttonPosition.y);

    // Update button position
    downloadButton.style.left = String(x) + (stryMutAct_9fa48("1585") ? "" : (stryCov_9fa48("1585"), "px"));
    downloadButton.style.top = String(y) + (stryMutAct_9fa48("1586") ? "" : (stryCov_9fa48("1586"), "px"));
  }
}

/**
 * Handle end of dragging and save the new position
 */
async function onDragEnd(): Promise<void> {
  if (stryMutAct_9fa48("1587")) {
    {}
  } else {
    stryCov_9fa48("1587");
    const uiState = stateManager.getUIState();
    if (stryMutAct_9fa48("1590") ? !uiState.isDragging && !downloadButton : stryMutAct_9fa48("1589") ? false : stryMutAct_9fa48("1588") ? true : (stryCov_9fa48("1588", "1589", "1590"), (stryMutAct_9fa48("1591") ? uiState.isDragging : (stryCov_9fa48("1591"), !uiState.isDragging)) || (stryMutAct_9fa48("1592") ? downloadButton : (stryCov_9fa48("1592"), !downloadButton)))) return;

    // Update centralized state
    stateManager.updateUIState(stryMutAct_9fa48("1593") ? {} : (stryCov_9fa48("1593"), {
      isDragging: stryMutAct_9fa48("1594") ? true : (stryCov_9fa48("1594"), false)
    }));

    // Remove document-level listeners
    document.removeEventListener(stryMutAct_9fa48("1595") ? "" : (stryCov_9fa48("1595"), "mousemove"), onDrag);
    document.removeEventListener(stryMutAct_9fa48("1596") ? "" : (stryCov_9fa48("1596"), "mouseup"), onDragEnd);

    // Get current position
    const rect = downloadButton.getBoundingClientRect();
    const x = rect.left;
    const y = rect.top;

    // Update centralized state with new position
    stateManager.updateUIState(stryMutAct_9fa48("1597") ? {} : (stryCov_9fa48("1597"), {
      buttonPosition: stryMutAct_9fa48("1598") ? {} : (stryCov_9fa48("1598"), {
        x,
        y
      }),
      isDragging: stryMutAct_9fa48("1599") ? true : (stryCov_9fa48("1599"), false)
    }));

    // Get current hidden state (shouldn't change during drag)
    const state = await getButtonState();

    // Save new position
    await saveButtonState(stryMutAct_9fa48("1600") ? {} : (stryCov_9fa48("1600"), {
      x,
      y,
      hidden: state.hidden
    }));

    // Also persist under a stable per-host key to survive SPA navigations
    try {
      if (stryMutAct_9fa48("1601")) {
        {}
      } else {
        stryCov_9fa48("1601");
        const host = getHostname();
        await new Promise<void>(resolve => {
          if (stryMutAct_9fa48("1602")) {
            {}
          } else {
            stryCov_9fa48("1602");
            chrome.storage.local.set(stryMutAct_9fa48("1603") ? {} : (stryCov_9fa48("1603"), {
              [host]: stryMutAct_9fa48("1604") ? {} : (stryCov_9fa48("1604"), {
                x,
                y,
                hidden: state.hidden
              })
            }), stryMutAct_9fa48("1605") ? () => undefined : (stryCov_9fa48("1605"), () => resolve()));
          }
        });
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Reset button position to default (top-left)
 */
async function resetButtonPosition(): Promise<void> {
  if (stryMutAct_9fa48("1606")) {
    {}
  } else {
    stryCov_9fa48("1606");
    if (stryMutAct_9fa48("1609") ? false : stryMutAct_9fa48("1608") ? true : stryMutAct_9fa48("1607") ? downloadButton : (stryCov_9fa48("1607", "1608", "1609"), !downloadButton)) return;

    // Reset to default position
    downloadButton.style.left = stryMutAct_9fa48("1610") ? "" : (stryCov_9fa48("1610"), "10px");
    downloadButton.style.top = stryMutAct_9fa48("1611") ? "" : (stryCov_9fa48("1611"), "10px");

    // Get current hidden state
    const state = await getButtonState();

    // Save new position
    await saveButtonState(stryMutAct_9fa48("1612") ? {} : (stryCov_9fa48("1612"), {
      x: 10,
      y: 10,
      hidden: state.hidden
    }));
  }
}

/**
 * Set whether the button is hidden or shown
 * @param hidden - Whether to hide the button
 */
async function setButtonHiddenState(hidden: boolean): Promise<void> {
  if (stryMutAct_9fa48("1613")) {
    {}
  } else {
    stryCov_9fa48("1613");
    if (stryMutAct_9fa48("1616") ? false : stryMutAct_9fa48("1615") ? true : stryMutAct_9fa48("1614") ? downloadButton : (stryCov_9fa48("1614", "1615", "1616"), !downloadButton)) return;

    // Toggle visibility classes instead of inline styles
    if (stryMutAct_9fa48("1618") ? false : stryMutAct_9fa48("1617") ? true : (stryCov_9fa48("1617", "1618"), hidden)) {
      if (stryMutAct_9fa48("1619")) {
        {}
      } else {
        stryCov_9fa48("1619");
        downloadButton.classList.add(stryMutAct_9fa48("1620") ? "" : (stryCov_9fa48("1620"), "hidden"));
        downloadButton.classList.remove(stryMutAct_9fa48("1621") ? "" : (stryCov_9fa48("1621"), "evd-visible"));
      }
    } else {
      if (stryMutAct_9fa48("1622")) {
        {}
      } else {
        stryCov_9fa48("1622");
        downloadButton.classList.remove(stryMutAct_9fa48("1623") ? "" : (stryCov_9fa48("1623"), "hidden"));
        downloadButton.classList.add(stryMutAct_9fa48("1624") ? "" : (stryCov_9fa48("1624"), "evd-visible"));
      }
    }
    if (stryMutAct_9fa48("1627") ? false : stryMutAct_9fa48("1626") ? true : stryMutAct_9fa48("1625") ? hidden : (stryCov_9fa48("1625", "1626", "1627"), !hidden)) {
      if (stryMutAct_9fa48("1628")) {
        {}
      } else {
        stryCov_9fa48("1628");
        // When showing the button, ensure safe position if offscreen
        try {
          if (stryMutAct_9fa48("1629")) {
            {}
          } else {
            stryCov_9fa48("1629");
            const rect = downloadButton.getBoundingClientRect();
            const offscreen = stryMutAct_9fa48("1632") ? (rect.width === 0 || rect.height === 0 || rect.left < 0 || rect.top < 0 || rect.left > window.innerWidth - Math.max(rect.width, 100)) && rect.top > window.innerHeight - Math.max(rect.height, 40) : stryMutAct_9fa48("1631") ? false : stryMutAct_9fa48("1630") ? true : (stryCov_9fa48("1630", "1631", "1632"), (stryMutAct_9fa48("1634") ? (rect.width === 0 || rect.height === 0 || rect.left < 0 || rect.top < 0) && rect.left > window.innerWidth - Math.max(rect.width, 100) : stryMutAct_9fa48("1633") ? false : (stryCov_9fa48("1633", "1634"), (stryMutAct_9fa48("1636") ? (rect.width === 0 || rect.height === 0 || rect.left < 0) && rect.top < 0 : stryMutAct_9fa48("1635") ? false : (stryCov_9fa48("1635", "1636"), (stryMutAct_9fa48("1638") ? (rect.width === 0 || rect.height === 0) && rect.left < 0 : stryMutAct_9fa48("1637") ? false : (stryCov_9fa48("1637", "1638"), (stryMutAct_9fa48("1640") ? rect.width === 0 && rect.height === 0 : stryMutAct_9fa48("1639") ? false : (stryCov_9fa48("1639", "1640"), (stryMutAct_9fa48("1642") ? rect.width !== 0 : stryMutAct_9fa48("1641") ? false : (stryCov_9fa48("1641", "1642"), rect.width === 0)) || (stryMutAct_9fa48("1644") ? rect.height !== 0 : stryMutAct_9fa48("1643") ? false : (stryCov_9fa48("1643", "1644"), rect.height === 0)))) || (stryMutAct_9fa48("1647") ? rect.left >= 0 : stryMutAct_9fa48("1646") ? rect.left <= 0 : stryMutAct_9fa48("1645") ? false : (stryCov_9fa48("1645", "1646", "1647"), rect.left < 0)))) || (stryMutAct_9fa48("1650") ? rect.top >= 0 : stryMutAct_9fa48("1649") ? rect.top <= 0 : stryMutAct_9fa48("1648") ? false : (stryCov_9fa48("1648", "1649", "1650"), rect.top < 0)))) || (stryMutAct_9fa48("1653") ? rect.left <= window.innerWidth - Math.max(rect.width, 100) : stryMutAct_9fa48("1652") ? rect.left >= window.innerWidth - Math.max(rect.width, 100) : stryMutAct_9fa48("1651") ? false : (stryCov_9fa48("1651", "1652", "1653"), rect.left > (stryMutAct_9fa48("1654") ? window.innerWidth + Math.max(rect.width, 100) : (stryCov_9fa48("1654"), window.innerWidth - (stryMutAct_9fa48("1655") ? Math.min(rect.width, 100) : (stryCov_9fa48("1655"), Math.max(rect.width, 100))))))))) || (stryMutAct_9fa48("1658") ? rect.top <= window.innerHeight - Math.max(rect.height, 40) : stryMutAct_9fa48("1657") ? rect.top >= window.innerHeight - Math.max(rect.height, 40) : stryMutAct_9fa48("1656") ? false : (stryCov_9fa48("1656", "1657", "1658"), rect.top > (stryMutAct_9fa48("1659") ? window.innerHeight + Math.max(rect.height, 40) : (stryCov_9fa48("1659"), window.innerHeight - (stryMutAct_9fa48("1660") ? Math.min(rect.height, 40) : (stryCov_9fa48("1660"), Math.max(rect.height, 40))))))));
            if (stryMutAct_9fa48("1663") ? (offscreen || !downloadButton.style.left) && !downloadButton.style.top : stryMutAct_9fa48("1662") ? false : stryMutAct_9fa48("1661") ? true : (stryCov_9fa48("1661", "1662", "1663"), (stryMutAct_9fa48("1665") ? offscreen && !downloadButton.style.left : stryMutAct_9fa48("1664") ? false : (stryCov_9fa48("1664", "1665"), offscreen || (stryMutAct_9fa48("1666") ? downloadButton.style.left : (stryCov_9fa48("1666"), !downloadButton.style.left)))) || (stryMutAct_9fa48("1667") ? downloadButton.style.top : (stryCov_9fa48("1667"), !downloadButton.style.top)))) {
              if (stryMutAct_9fa48("1668")) {
                {}
              } else {
                stryCov_9fa48("1668");
                downloadButton.style.left = stryMutAct_9fa48("1669") ? "" : (stryCov_9fa48("1669"), "10px");
                downloadButton.style.top = stryMutAct_9fa48("1670") ? "" : (stryCov_9fa48("1670"), "70px");
              }
            }
            // Re-apply style guidelines via classes
            ensureDownloadButtonStyle(downloadButton);
          }
        } catch {
          // ignore
        }
      }
    }

    // Get current position
    const rect = downloadButton.getBoundingClientRect();
    const x = rect.left;
    const y = rect.top;

    // Save state
    await saveButtonState(stryMutAct_9fa48("1671") ? {} : (stryCov_9fa48("1671"), {
      x,
      y,
      hidden
    }));
  }
}

/**
 * Checks if a video is significant enough to inject a download button
 * @param video - The video element to check
 * @returns Whether the video is significant
 */
function isSignificantVideo(video: HTMLElement): boolean {
  if (stryMutAct_9fa48("1672")) {
    {}
  } else {
    stryCov_9fa48("1672");
    // Only consider HTMLVideoElement and IFrameElement
    if (stryMutAct_9fa48("1674") ? false : stryMutAct_9fa48("1673") ? true : (stryCov_9fa48("1673", "1674"), video instanceof HTMLVideoElement)) {
      if (stryMutAct_9fa48("1675")) {
        {}
      } else {
        stryCov_9fa48("1675");
        // Exclude ad containers
        const parent = video.parentElement;
        if (stryMutAct_9fa48("1678") ? parent || parent.classList.contains("ad-banner") : stryMutAct_9fa48("1677") ? false : stryMutAct_9fa48("1676") ? true : (stryCov_9fa48("1676", "1677", "1678"), parent && parent.classList.contains(stryMutAct_9fa48("1679") ? "" : (stryCov_9fa48("1679"), "ad-banner")))) {
          if (stryMutAct_9fa48("1680")) {
            {}
          } else {
            stryCov_9fa48("1680");
            return stryMutAct_9fa48("1681") ? true : (stryCov_9fa48("1681"), false);
          }
        }
        const rect = video.getBoundingClientRect();
        const isVisible = stryMutAct_9fa48("1684") ? rect.width > 0 || rect.height > 0 : stryMutAct_9fa48("1683") ? false : stryMutAct_9fa48("1682") ? true : (stryCov_9fa48("1682", "1683", "1684"), (stryMutAct_9fa48("1687") ? rect.width <= 0 : stryMutAct_9fa48("1686") ? rect.width >= 0 : stryMutAct_9fa48("1685") ? true : (stryCov_9fa48("1685", "1686", "1687"), rect.width > 0)) && (stryMutAct_9fa48("1690") ? rect.height <= 0 : stryMutAct_9fa48("1689") ? rect.height >= 0 : stryMutAct_9fa48("1688") ? true : (stryCov_9fa48("1688", "1689", "1690"), rect.height > 0)));
        const isSignificantSize = stryMutAct_9fa48("1693") ? rect.width >= 200 || rect.height >= 150 : stryMutAct_9fa48("1692") ? false : stryMutAct_9fa48("1691") ? true : (stryCov_9fa48("1691", "1692", "1693"), (stryMutAct_9fa48("1696") ? rect.width < 200 : stryMutAct_9fa48("1695") ? rect.width > 200 : stryMutAct_9fa48("1694") ? true : (stryCov_9fa48("1694", "1695", "1696"), rect.width >= 200)) && (stryMutAct_9fa48("1699") ? rect.height < 150 : stryMutAct_9fa48("1698") ? rect.height > 150 : stryMutAct_9fa48("1697") ? true : (stryCov_9fa48("1697", "1698", "1699"), rect.height >= 150)));
        const hasSrc = stryMutAct_9fa48("1700") ? !(video as HTMLVideoElement).src : (stryCov_9fa48("1700"), !(stryMutAct_9fa48("1701") ? (video as HTMLVideoElement).src : (stryCov_9fa48("1701"), !(video as HTMLVideoElement).src)));
        return stryMutAct_9fa48("1704") ? isVisible && isSignificantSize || hasSrc : stryMutAct_9fa48("1703") ? false : stryMutAct_9fa48("1702") ? true : (stryCov_9fa48("1702", "1703", "1704"), (stryMutAct_9fa48("1706") ? isVisible || isSignificantSize : stryMutAct_9fa48("1705") ? true : (stryCov_9fa48("1705", "1706"), isVisible && isSignificantSize)) && hasSrc);
      }
    } else if (stryMutAct_9fa48("1708") ? false : stryMutAct_9fa48("1707") ? true : (stryCov_9fa48("1707", "1708"), video instanceof HTMLIFrameElement)) {
      if (stryMutAct_9fa48("1709")) {
        {}
      } else {
        stryCov_9fa48("1709");
        // Always consider iframes significant
        return stryMutAct_9fa48("1710") ? false : (stryCov_9fa48("1710"), true);
      }
    }
    return stryMutAct_9fa48("1711") ? true : (stryCov_9fa48("1711"), false);
  }
}

/**
 * Find videos on the page and inject download buttons
 */
async function findVideosAndInjectButtons(): Promise<void> {
  if (stryMutAct_9fa48("1712")) {
    {}
  } else {
    stryCov_9fa48("1712");
    // Don't run on extension pages
    if (stryMutAct_9fa48("1714") ? false : stryMutAct_9fa48("1713") ? true : (stryCov_9fa48("1713", "1714"), window.location.href.includes(stryMutAct_9fa48("1715") ? "" : (stryCov_9fa48("1715"), "chrome-extension://")))) {
      if (stryMutAct_9fa48("1716")) {
        {}
      } else {
        stryCov_9fa48("1716");
        return;
      }
    }

    // Create global button if not already present
    if (stryMutAct_9fa48("1719") ? false : stryMutAct_9fa48("1718") ? true : stryMutAct_9fa48("1717") ? downloadButton : (stryCov_9fa48("1717", "1718", "1719"), !downloadButton)) {
      if (stryMutAct_9fa48("1720")) {
        {}
      } else {
        stryCov_9fa48("1720");
        downloadButton = await createOrUpdateButton();
        const currentState = stateManager.getUIState();
        stateManager.updateUIState(stryMutAct_9fa48("1721") ? {} : (stryCov_9fa48("1721"), {
          checksDone: stryMutAct_9fa48("1722") ? currentState.checksDone - 1 : (stryCov_9fa48("1722"), currentState.checksDone + 1)
        }));
      }
    }

    // Find all video elements and significant iframes
    const videos = document.querySelectorAll<HTMLElement>(VIDEO_SELECTOR);
    let foundSignificantVideo = stryMutAct_9fa48("1723") ? true : (stryCov_9fa48("1723"), false);
    for (const video of Array.from(videos)) {
      if (stryMutAct_9fa48("1724")) {
        {}
      } else {
        stryCov_9fa48("1724");
        if (stryMutAct_9fa48("1726") ? false : stryMutAct_9fa48("1725") ? true : (stryCov_9fa48("1725", "1726"), isSignificantVideo(video))) {
          if (stryMutAct_9fa48("1727")) {
            {}
          } else {
            stryCov_9fa48("1727");
            foundSignificantVideo = stryMutAct_9fa48("1728") ? false : (stryCov_9fa48("1728"), true);
            // Only inject if we haven't already for this video
            if (stryMutAct_9fa48("1731") ? false : stryMutAct_9fa48("1730") ? true : stryMutAct_9fa48("1729") ? injectedButtons.has(video) : (stryCov_9fa48("1729", "1730", "1731"), !injectedButtons.has(video))) {
              if (stryMutAct_9fa48("1732")) {
                {}
              } else {
                stryCov_9fa48("1732");
                await createOrUpdateButton(video);
              }
            }
          }
        }
      }
    }

    // Clean up removed videos from our map
    for (const [video] of injectedButtons) {
      if (stryMutAct_9fa48("1733")) {
        {}
      } else {
        stryCov_9fa48("1733");
        if (stryMutAct_9fa48("1736") ? false : stryMutAct_9fa48("1735") ? true : stryMutAct_9fa48("1734") ? document.body.contains(video) : (stryCov_9fa48("1734", "1735", "1736"), !document.body.contains(video))) {
          if (stryMutAct_9fa48("1737")) {
            {}
          } else {
            stryCov_9fa48("1737");
            const button = injectedButtons.get(video);
            if (stryMutAct_9fa48("1740") ? button || document.body.contains(button) : stryMutAct_9fa48("1739") ? false : stryMutAct_9fa48("1738") ? true : (stryCov_9fa48("1738", "1739", "1740"), button && document.body.contains(button))) {
              if (stryMutAct_9fa48("1741")) {
                {}
              } else {
                stryCov_9fa48("1741");
                button.remove();
              }
            }
            injectedButtons.delete(video);
          }
        }
      }
    }

    // If we've checked MAX_CHECKS times and found no videos, clear the interval
    const currentState = stateManager.getUIState();
    if (stryMutAct_9fa48("1744") ? !foundSignificantVideo && currentState.checksDone >= MAX_CHECKS || checkIntervalId : stryMutAct_9fa48("1743") ? false : stryMutAct_9fa48("1742") ? true : (stryCov_9fa48("1742", "1743", "1744"), (stryMutAct_9fa48("1746") ? !foundSignificantVideo || currentState.checksDone >= MAX_CHECKS : stryMutAct_9fa48("1745") ? true : (stryCov_9fa48("1745", "1746"), (stryMutAct_9fa48("1747") ? foundSignificantVideo : (stryCov_9fa48("1747"), !foundSignificantVideo)) && (stryMutAct_9fa48("1750") ? currentState.checksDone < MAX_CHECKS : stryMutAct_9fa48("1749") ? currentState.checksDone > MAX_CHECKS : stryMutAct_9fa48("1748") ? true : (stryCov_9fa48("1748", "1749", "1750"), currentState.checksDone >= MAX_CHECKS)))) && checkIntervalId)) {
      if (stryMutAct_9fa48("1751")) {
        {}
      } else {
        stryCov_9fa48("1751");
        clearInterval(checkIntervalId);
        checkIntervalId = null;
      }
    }
  }
}

/**
 * Main initialization function
 */
async function init(): Promise<void> {
  if (stryMutAct_9fa48("1752")) {
    {}
  } else {
    stryCov_9fa48("1752");
    // Set up global event listeners for dragging
    // document.addEventListener("mousemove", onDrag); // This was moved to mousedown
    // document.addEventListener("mouseup", onDragEnd); // This was moved to mousedown

    await findVideosAndInjectButtons();

    // Set up interval to check for new videos
    if (stryMutAct_9fa48("1755") ? false : stryMutAct_9fa48("1754") ? true : stryMutAct_9fa48("1753") ? checkIntervalId : (stryCov_9fa48("1753", "1754", "1755"), !checkIntervalId)) {
      if (stryMutAct_9fa48("1756")) {
        {}
      } else {
        stryCov_9fa48("1756");
        checkIntervalId = window.setInterval(() => {
          if (stryMutAct_9fa48("1757")) {
            {}
          } else {
            stryCov_9fa48("1757");
            findVideosAndInjectButtons();
            // Ensure a global button exists even if no <video> is detected
            if (stryMutAct_9fa48("1760") ? false : stryMutAct_9fa48("1759") ? true : stryMutAct_9fa48("1758") ? downloadButton : (stryCov_9fa48("1758", "1759", "1760"), !downloadButton)) {
              if (stryMutAct_9fa48("1761")) {
                {}
              } else {
                stryCov_9fa48("1761");
                createOrUpdateButton().catch(() => {});
              }
            } else {
              if (stryMutAct_9fa48("1762")) {
                {}
              } else {
                stryCov_9fa48("1762");
                // If the global button was removed externally, recreate it
                if (stryMutAct_9fa48("1765") ? false : stryMutAct_9fa48("1764") ? true : stryMutAct_9fa48("1763") ? document.body.contains(downloadButton) : (stryCov_9fa48("1763", "1764", "1765"), !document.body.contains(downloadButton))) {
                  if (stryMutAct_9fa48("1766")) {
                    {}
                  } else {
                    stryCov_9fa48("1766");
                    createOrUpdateButton().catch(() => {});
                  }
                }
              }
            }
          }
        }, CHECK_INTERVAL);
      }
    }

    // Listen for messages from background script or popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (stryMutAct_9fa48("1767")) {
        {}
      } else {
        stryCov_9fa48("1767");
        if (stryMutAct_9fa48("1770") ? message.type !== "resetButtonPosition" : stryMutAct_9fa48("1769") ? false : stryMutAct_9fa48("1768") ? true : (stryCov_9fa48("1768", "1769", "1770"), message.type === (stryMutAct_9fa48("1771") ? "" : (stryCov_9fa48("1771"), "resetButtonPosition")))) {
          if (stryMutAct_9fa48("1772")) {
            {}
          } else {
            stryCov_9fa48("1772");
            resetButtonPosition().then(stryMutAct_9fa48("1773") ? () => undefined : (stryCov_9fa48("1773"), () => sendResponse(stryMutAct_9fa48("1774") ? {} : (stryCov_9fa48("1774"), {
              success: stryMutAct_9fa48("1775") ? false : (stryCov_9fa48("1775"), true)
            }))));
            return stryMutAct_9fa48("1776") ? false : (stryCov_9fa48("1776"), true); // Keep channel open for async response
          }
        } else if (stryMutAct_9fa48("1779") ? message.type !== "toggleButtonVisibility" : stryMutAct_9fa48("1778") ? false : stryMutAct_9fa48("1777") ? true : (stryCov_9fa48("1777", "1778", "1779"), message.type === (stryMutAct_9fa48("1780") ? "" : (stryCov_9fa48("1780"), "toggleButtonVisibility")))) {
          if (stryMutAct_9fa48("1781")) {
            {}
          } else {
            stryCov_9fa48("1781");
            const hidden = message.hidden;
            setButtonHiddenState(hidden).then(stryMutAct_9fa48("1782") ? () => undefined : (stryCov_9fa48("1782"), () => sendResponse(stryMutAct_9fa48("1783") ? {} : (stryCov_9fa48("1783"), {
              success: stryMutAct_9fa48("1784") ? false : (stryCov_9fa48("1784"), true)
            }))));
            return stryMutAct_9fa48("1785") ? false : (stryCov_9fa48("1785"), true); // Keep channel open for async response
          }
        }
        return stryMutAct_9fa48("1786") ? true : (stryCov_9fa48("1786"), false);
      }
    });
  }
}

/**
 * For testing purposes only.
 * @private
 */
function _resetStateForTesting(): void {
  if (stryMutAct_9fa48("1787")) {
    {}
  } else {
    stryCov_9fa48("1787");
    stateManager.reset();
    downloadButton = null;
    injectedButtons.clear();
    if (stryMutAct_9fa48("1789") ? false : stryMutAct_9fa48("1788") ? true : (stryCov_9fa48("1788", "1789"), buttonObserver)) {
      if (stryMutAct_9fa48("1790")) {
        {}
      } else {
        stryCov_9fa48("1790");
        buttonObserver.disconnect();
        buttonObserver = null;
      }
    }
  }
}

// Global listeners - initialize once
if (stryMutAct_9fa48("1793") ? typeof window === "undefined" : stryMutAct_9fa48("1792") ? false : stryMutAct_9fa48("1791") ? true : (stryCov_9fa48("1791", "1792", "1793"), typeof window !== (stryMutAct_9fa48("1794") ? "" : (stryCov_9fa48("1794"), "undefined")))) {
  if (stryMutAct_9fa48("1795")) {
    {}
  } else {
    stryCov_9fa48("1795");
    document.addEventListener(stryMutAct_9fa48("1796") ? "" : (stryCov_9fa48("1796"), "dragover"), event => {
      if (stryMutAct_9fa48("1797")) {
        {}
      } else {
        stryCov_9fa48("1797");
        const uiState = stateManager.getUIState();
        if (stryMutAct_9fa48("1799") ? false : stryMutAct_9fa48("1798") ? true : (stryCov_9fa48("1798", "1799"), uiState.isDragging)) {
          if (stryMutAct_9fa48("1800")) {
            {}
          } else {
            stryCov_9fa48("1800");
            event.preventDefault();
          }
        }
      }
    });
  }
}

// Initialize the script
// init(); // Should not be called directly, but by the condition below

// Export functions for testing
export { createOrUpdateButton, resetButtonPosition, setButtonHiddenState, isSignificantVideo, debounce, getButtonState, saveButtonState, ensureDownloadButtonStyle, _resetStateForTesting };

// Initialize content script (robust Jest detection to avoid runtime errors in browser)
try {
  if (stryMutAct_9fa48("1801")) {
    {}
  } else {
    stryCov_9fa48("1801");
    const isJestEnv = stryMutAct_9fa48("1804") ? typeof process !== "undefined" && typeof (process as any).env !== "undefined" || typeof (process as any).env.JEST_WORKER_ID !== "undefined" : stryMutAct_9fa48("1803") ? false : stryMutAct_9fa48("1802") ? true : (stryCov_9fa48("1802", "1803", "1804"), (stryMutAct_9fa48("1806") ? typeof process !== "undefined" || typeof (process as any).env !== "undefined" : stryMutAct_9fa48("1805") ? true : (stryCov_9fa48("1805", "1806"), (stryMutAct_9fa48("1808") ? typeof process === "undefined" : stryMutAct_9fa48("1807") ? true : (stryCov_9fa48("1807", "1808"), typeof process !== (stryMutAct_9fa48("1809") ? "" : (stryCov_9fa48("1809"), "undefined")))) && (stryMutAct_9fa48("1811") ? typeof (process as any).env === "undefined" : stryMutAct_9fa48("1810") ? true : (stryCov_9fa48("1810", "1811"), typeof (process as any).env !== (stryMutAct_9fa48("1812") ? "" : (stryCov_9fa48("1812"), "undefined")))))) && (stryMutAct_9fa48("1814") ? typeof (process as any).env.JEST_WORKER_ID === "undefined" : stryMutAct_9fa48("1813") ? true : (stryCov_9fa48("1813", "1814"), typeof (process as any).env.JEST_WORKER_ID !== (stryMutAct_9fa48("1815") ? "" : (stryCov_9fa48("1815"), "undefined")))));
    if (stryMutAct_9fa48("1818") ? false : stryMutAct_9fa48("1817") ? true : stryMutAct_9fa48("1816") ? isJestEnv : (stryCov_9fa48("1816", "1817", "1818"), !isJestEnv)) {
      if (stryMutAct_9fa48("1819")) {
        {}
      } else {
        stryCov_9fa48("1819");
        init();
      }
    }
  }
} catch {
  if (stryMutAct_9fa48("1820")) {
    {}
  } else {
    stryCov_9fa48("1820");
    // If any detection fails, default to initializing in browser
    init();
  }
}