/**
 * YouTube enhancement functionality for the Enhanced Video Downloader extension.
 * Provides video detection and download button injection for YouTube.
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
import { getHostname } from "./lib/utils";

/**
 * Enhanced YouTube styling function
 * Makes the download button more visible on YouTube
 * @param btn - The download button element
 */
export function enhanceYouTubeButton(btn: HTMLElement | null | undefined): void {
  if (stryMutAct_9fa48("4976")) {
    {}
  } else {
    stryCov_9fa48("4976");
    // Handle null/undefined button
    if (stryMutAct_9fa48("4979") ? false : stryMutAct_9fa48("4978") ? true : stryMutAct_9fa48("4977") ? btn : (stryCov_9fa48("4977", "4978", "4979"), !btn)) {
      if (stryMutAct_9fa48("4980")) {
        {}
      } else {
        stryCov_9fa48("4980");
        return;
      }
    }
    const hostname = getHostname();

    // Handle null/undefined hostname
    if (stryMutAct_9fa48("4983") ? false : stryMutAct_9fa48("4982") ? true : stryMutAct_9fa48("4981") ? hostname : (stryCov_9fa48("4981", "4982", "4983"), !hostname)) {
      if (stryMutAct_9fa48("4984")) {
        {}
      } else {
        stryCov_9fa48("4984");
        return;
      }
    }

    // More precise YouTube domain detection
    const isYouTubeDomain = stryMutAct_9fa48("4987") ? (hostname === "youtube.com" || hostname === "www.youtube.com" || hostname === "m.youtube.com" || hostname === "music.youtube.com") && hostname.endsWith(".youtube.com") : stryMutAct_9fa48("4986") ? false : stryMutAct_9fa48("4985") ? true : (stryCov_9fa48("4985", "4986", "4987"), (stryMutAct_9fa48("4989") ? (hostname === "youtube.com" || hostname === "www.youtube.com" || hostname === "m.youtube.com") && hostname === "music.youtube.com" : stryMutAct_9fa48("4988") ? false : (stryCov_9fa48("4988", "4989"), (stryMutAct_9fa48("4991") ? (hostname === "youtube.com" || hostname === "www.youtube.com") && hostname === "m.youtube.com" : stryMutAct_9fa48("4990") ? false : (stryCov_9fa48("4990", "4991"), (stryMutAct_9fa48("4993") ? hostname === "youtube.com" && hostname === "www.youtube.com" : stryMutAct_9fa48("4992") ? false : (stryCov_9fa48("4992", "4993"), (stryMutAct_9fa48("4995") ? hostname !== "youtube.com" : stryMutAct_9fa48("4994") ? false : (stryCov_9fa48("4994", "4995"), hostname === (stryMutAct_9fa48("4996") ? "" : (stryCov_9fa48("4996"), "youtube.com")))) || (stryMutAct_9fa48("4998") ? hostname !== "www.youtube.com" : stryMutAct_9fa48("4997") ? false : (stryCov_9fa48("4997", "4998"), hostname === (stryMutAct_9fa48("4999") ? "" : (stryCov_9fa48("4999"), "www.youtube.com")))))) || (stryMutAct_9fa48("5001") ? hostname !== "m.youtube.com" : stryMutAct_9fa48("5000") ? false : (stryCov_9fa48("5000", "5001"), hostname === (stryMutAct_9fa48("5002") ? "" : (stryCov_9fa48("5002"), "m.youtube.com")))))) || (stryMutAct_9fa48("5004") ? hostname !== "music.youtube.com" : stryMutAct_9fa48("5003") ? false : (stryCov_9fa48("5003", "5004"), hostname === (stryMutAct_9fa48("5005") ? "" : (stryCov_9fa48("5005"), "music.youtube.com")))))) || (stryMutAct_9fa48("5006") ? hostname.startsWith(".youtube.com") : (stryCov_9fa48("5006"), hostname.endsWith(stryMutAct_9fa48("5007") ? "" : (stryCov_9fa48("5007"), ".youtube.com")))));
    if (stryMutAct_9fa48("5009") ? false : stryMutAct_9fa48("5008") ? true : (stryCov_9fa48("5008", "5009"), isYouTubeDomain)) {
      if (stryMutAct_9fa48("5010")) {
        {}
      } else {
        stryCov_9fa48("5010");
        // Enhancing YouTube button visibility

        // Add CSS class for enhanced YouTube styling
        btn.classList.add(stryMutAct_9fa48("5011") ? "" : (stryCov_9fa48("5011"), "youtube-enhanced"));

        // Only adjust the default placement (fresh inject). Respect persisted user position.
        const isDefaultTop = stryMutAct_9fa48("5014") ? !btn.style.top && btn.style.top === "10px" : stryMutAct_9fa48("5013") ? false : stryMutAct_9fa48("5012") ? true : (stryCov_9fa48("5012", "5013", "5014"), (stryMutAct_9fa48("5015") ? btn.style.top : (stryCov_9fa48("5015"), !btn.style.top)) || (stryMutAct_9fa48("5017") ? btn.style.top !== "10px" : stryMutAct_9fa48("5016") ? false : (stryCov_9fa48("5016", "5017"), btn.style.top === (stryMutAct_9fa48("5018") ? "" : (stryCov_9fa48("5018"), "10px")))));
        const isDefaultLeft = stryMutAct_9fa48("5021") ? !btn.style.left && btn.style.left === "10px" : stryMutAct_9fa48("5020") ? false : stryMutAct_9fa48("5019") ? true : (stryCov_9fa48("5019", "5020", "5021"), (stryMutAct_9fa48("5022") ? btn.style.left : (stryCov_9fa48("5022"), !btn.style.left)) || (stryMutAct_9fa48("5024") ? btn.style.left !== "10px" : stryMutAct_9fa48("5023") ? false : (stryCov_9fa48("5023", "5024"), btn.style.left === (stryMutAct_9fa48("5025") ? "" : (stryCov_9fa48("5025"), "10px")))));
        if (stryMutAct_9fa48("5028") ? isDefaultTop || isDefaultLeft : stryMutAct_9fa48("5027") ? false : stryMutAct_9fa48("5026") ? true : (stryCov_9fa48("5026", "5027", "5028"), isDefaultTop && isDefaultLeft)) {
          if (stryMutAct_9fa48("5029")) {
            {}
          } else {
            stryCov_9fa48("5029");
            btn.style.top = stryMutAct_9fa48("5030") ? "" : (stryCov_9fa48("5030"), "70px"); // Below the YouTube header
            btn.style.left = String(stryMutAct_9fa48("5031") ? window.innerWidth + 100 : (stryCov_9fa48("5031"), window.innerWidth - 100)) + (stryMutAct_9fa48("5032") ? "" : (stryCov_9fa48("5032"), "px")); // Right side with margin
          }
        }
      }
    }
  }
}