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
import { logger } from "./core/logger";

// Align popup console logging level once from stored config
chrome.storage.local.get(stryMutAct_9fa48("4424") ? "" : (stryCov_9fa48("4424"), "serverConfig"), res => {
  if (stryMutAct_9fa48("4425")) {
    {}
  } else {
    stryCov_9fa48("4425");
    const cfg = stryMutAct_9fa48("4428") ? (res as any).serverConfig && {} : stryMutAct_9fa48("4427") ? false : stryMutAct_9fa48("4426") ? true : (stryCov_9fa48("4426", "4427", "4428"), (res as any).serverConfig || {});
    const level = stryMutAct_9fa48("4431") ? (cfg.console_log_level || cfg.log_level) && "info" : stryMutAct_9fa48("4430") ? false : stryMutAct_9fa48("4429") ? true : (stryCov_9fa48("4429", "4430", "4431"), (stryMutAct_9fa48("4433") ? cfg.console_log_level && cfg.log_level : stryMutAct_9fa48("4432") ? false : (stryCov_9fa48("4432", "4433"), cfg.console_log_level || cfg.log_level)) || (stryMutAct_9fa48("4434") ? "" : (stryCov_9fa48("4434"), "info")));
    try {
      if (stryMutAct_9fa48("4435")) {
        {}
      } else {
        stryCov_9fa48("4435");
        logger.setLevel(String(level).toLowerCase() as any);
      }
    } catch {
      // ignore
    }
  }
});
/**
 * Enhanced Video Downloader - Popup Script
 * Handles popup UI interactions and server communication
 */

import { Theme, ServerConfig, HistoryEntry } from "./types";

/**
 * Download status interface for the popup UI
 */
export interface DownloadStatus {
  isActive: boolean;
  progress: number;
  id?: string;
  filename?: string;
  url?: string;
  error?: string;
  message?: string;
}

// Module-level state (will be initialized in initPopup)
let statusTimeout: ReturnType<typeof setTimeout> | null = null;
let dragSrcIndex: number | null = null;

/**
 * Sets a status message in the popup.
 * @param message - The message to display.
 * @param isError - Whether the message is an error.
 * @param duration - How long to display the message for.
 * @returns The timer ID for the timeout.
 */
export function setStatus(message: string, isError = stryMutAct_9fa48("4436") ? true : (stryCov_9fa48("4436"), false), duration = 3000): ReturnType<typeof setTimeout> | null {
  if (stryMutAct_9fa48("4437")) {
    {}
  } else {
    stryCov_9fa48("4437");
    if (stryMutAct_9fa48("4439") ? false : stryMutAct_9fa48("4438") ? true : (stryCov_9fa48("4438", "4439"), statusTimeout)) {
      if (stryMutAct_9fa48("4440")) {
        {}
      } else {
        stryCov_9fa48("4440");
        clearTimeout(statusTimeout);
      }
    }
    const statusEl = document.getElementById(stryMutAct_9fa48("4441") ? "" : (stryCov_9fa48("4441"), "status"));
    if (stryMutAct_9fa48("4443") ? false : stryMutAct_9fa48("4442") ? true : (stryCov_9fa48("4442", "4443"), statusEl)) {
      if (stryMutAct_9fa48("4444")) {
        {}
      } else {
        stryCov_9fa48("4444");
        statusEl.textContent = message;
        statusEl.className = isError ? stryMutAct_9fa48("4445") ? "" : (stryCov_9fa48("4445"), "status-error") : stryMutAct_9fa48("4446") ? "" : (stryCov_9fa48("4446"), "status-success");
        if (stryMutAct_9fa48("4448") ? false : stryMutAct_9fa48("4447") ? true : (stryCov_9fa48("4447", "4448"), isError)) {
          if (stryMutAct_9fa48("4449")) {
            {}
          } else {
            stryCov_9fa48("4449");
            const tip = document.createElement(stryMutAct_9fa48("4450") ? "" : (stryCov_9fa48("4450"), "div"));
            tip.className = stryMutAct_9fa48("4451") ? "" : (stryCov_9fa48("4451"), "error-tip");
            tip.textContent = stryMutAct_9fa48("4452") ? "" : (stryCov_9fa48("4452"), "Tip: check your network connection and try again");
            statusEl.appendChild(tip);
          }
        }
        statusTimeout = setTimeout(() => {
          if (stryMutAct_9fa48("4453")) {
            {}
          } else {
            stryCov_9fa48("4453");
            statusEl.textContent = stryMutAct_9fa48("4454") ? "Stryker was here!" : (stryCov_9fa48("4454"), "");
            statusEl.className = stryMutAct_9fa48("4455") ? "Stryker was here!" : (stryCov_9fa48("4455"), "");
            statusTimeout = null;
          }
        }, duration);
        return statusTimeout;
      }
    }
    return null;
  }
}

/**
 * Applies the appropriate theme (light/dark) to the popup UI.
 * Uses the stored theme preference from chrome.storage or falls back to system preference.
 *
 * @param forceTheme - Optional theme to force (light/dark)
 */
export async function applyPopupTheme(forceTheme?: "light" | "dark"): Promise<void> {
  if (stryMutAct_9fa48("4456")) {
    {}
  } else {
    stryCov_9fa48("4456");
    let isDark: boolean;
    if (stryMutAct_9fa48("4458") ? false : stryMutAct_9fa48("4457") ? true : (stryCov_9fa48("4457", "4458"), forceTheme)) {
      if (stryMutAct_9fa48("4459")) {
        {}
      } else {
        stryCov_9fa48("4459");
        isDark = stryMutAct_9fa48("4462") ? forceTheme !== "dark" : stryMutAct_9fa48("4461") ? false : stryMutAct_9fa48("4460") ? true : (stryCov_9fa48("4460", "4461", "4462"), forceTheme === (stryMutAct_9fa48("4463") ? "" : (stryCov_9fa48("4463"), "dark")));
      }
    } else {
      if (stryMutAct_9fa48("4464")) {
        {}
      } else {
        stryCov_9fa48("4464");
        // Get stored theme preference
        const result = await chrome.storage.local.get(stryMutAct_9fa48("4465") ? "" : (stryCov_9fa48("4465"), "theme"));
        const storedTheme = result.theme as "light" | "dark" | undefined;
        if (stryMutAct_9fa48("4467") ? false : stryMutAct_9fa48("4466") ? true : (stryCov_9fa48("4466", "4467"), storedTheme)) {
          if (stryMutAct_9fa48("4468")) {
            {}
          } else {
            stryCov_9fa48("4468");
            isDark = stryMutAct_9fa48("4471") ? storedTheme !== "dark" : stryMutAct_9fa48("4470") ? false : stryMutAct_9fa48("4469") ? true : (stryCov_9fa48("4469", "4470", "4471"), storedTheme === (stryMutAct_9fa48("4472") ? "" : (stryCov_9fa48("4472"), "dark")));
          }
        } else {
          if (stryMutAct_9fa48("4473")) {
            {}
          } else {
            stryCov_9fa48("4473");
            // Fallback to system preference
            isDark = window.matchMedia(stryMutAct_9fa48("4474") ? "" : (stryCov_9fa48("4474"), "(prefers-color-scheme: dark)")).matches;
          }
        }
      }
    }
    document.body.classList.toggle(stryMutAct_9fa48("4475") ? "" : (stryCov_9fa48("4475"), "dark-theme"), isDark);

    // Update logo src based on theme
    const logo = document.querySelector("img[src*='icon']") as HTMLImageElement;
    if (stryMutAct_9fa48("4477") ? false : stryMutAct_9fa48("4476") ? true : (stryCov_9fa48("4476", "4477"), logo)) {
      if (stryMutAct_9fa48("4478")) {
        {}
      } else {
        stryCov_9fa48("4478");
        const currentSrc = logo.src;
        const isCurrentlyDark = currentSrc.includes(stryMutAct_9fa48("4479") ? "" : (stryCov_9fa48("4479"), "darkicon"));
        if (stryMutAct_9fa48("4482") ? isDark === isCurrentlyDark : stryMutAct_9fa48("4481") ? false : stryMutAct_9fa48("4480") ? true : (stryCov_9fa48("4480", "4481", "4482"), isDark !== isCurrentlyDark)) {
          if (stryMutAct_9fa48("4483")) {
            {}
          } else {
            stryCov_9fa48("4483");
            logo.src = currentSrc.replace(isCurrentlyDark ? stryMutAct_9fa48("4484") ? "" : (stryCov_9fa48("4484"), "darkicon") : stryMutAct_9fa48("4485") ? "" : (stryCov_9fa48("4485"), "icon"), isDark ? stryMutAct_9fa48("4486") ? "" : (stryCov_9fa48("4486"), "darkicon") : stryMutAct_9fa48("4487") ? "" : (stryCov_9fa48("4487"), "icon"));
          }
        }
      }
    }
  }
}

/**
 * Updates the toggle button state and text based on the provided parameters.
 * Supports multiple overloads for different use cases.
 *
 * @param buttonIdOrState - Button ID or active state
 * @param isActiveOrButtonId - Active state or button ID
 */
export function updateToggleButtonState(buttonIdOrState: string | boolean, isActiveOrButtonId?: boolean | string): void {
  if (stryMutAct_9fa48("4488")) {
    {}
  } else {
    stryCov_9fa48("4488");
    let buttonId: string;
    let isActive: boolean;
    let buttonText: string | undefined;
    let isDisabled: boolean | undefined;

    // Handle the overloaded function signature
    if (stryMutAct_9fa48("4491") ? typeof buttonIdOrState !== "boolean" : stryMutAct_9fa48("4490") ? false : stryMutAct_9fa48("4489") ? true : (stryCov_9fa48("4489", "4490", "4491"), typeof buttonIdOrState === (stryMutAct_9fa48("4492") ? "" : (stryCov_9fa48("4492"), "boolean")))) {
      if (stryMutAct_9fa48("4493")) {
        {}
      } else {
        stryCov_9fa48("4493");
        // First parameter is the state
        isActive = buttonIdOrState;
        buttonId = stryMutAct_9fa48("4496") ? isActiveOrButtonId as string && "toggle-enhanced-download-button" : stryMutAct_9fa48("4495") ? false : stryMutAct_9fa48("4494") ? true : (stryCov_9fa48("4494", "4495", "4496"), isActiveOrButtonId as string || (stryMutAct_9fa48("4497") ? "" : (stryCov_9fa48("4497"), "toggle-enhanced-download-button")));
      }
    } else if (stryMutAct_9fa48("4500") ? typeof buttonIdOrState === "string" || typeof isActiveOrButtonId === "string" : stryMutAct_9fa48("4499") ? false : stryMutAct_9fa48("4498") ? true : (stryCov_9fa48("4498", "4499", "4500"), (stryMutAct_9fa48("4502") ? typeof buttonIdOrState !== "string" : stryMutAct_9fa48("4501") ? true : (stryCov_9fa48("4501", "4502"), typeof buttonIdOrState === (stryMutAct_9fa48("4503") ? "" : (stryCov_9fa48("4503"), "string")))) && (stryMutAct_9fa48("4505") ? typeof isActiveOrButtonId !== "string" : stryMutAct_9fa48("4504") ? true : (stryCov_9fa48("4504", "4505"), typeof isActiveOrButtonId === (stryMutAct_9fa48("4506") ? "" : (stryCov_9fa48("4506"), "string")))))) {
      if (stryMutAct_9fa48("4507")) {
        {}
      } else {
        stryCov_9fa48("4507");
        // First parameter is the button text, second is also a string (button ID)
        buttonText = buttonIdOrState;
        buttonId = isActiveOrButtonId;
        isActive = stryMutAct_9fa48("4508") ? true : (stryCov_9fa48("4508"), false); // Custom text mode disables the button
        isDisabled = stryMutAct_9fa48("4509") ? false : (stryCov_9fa48("4509"), true);
      }
    } else {
      if (stryMutAct_9fa48("4510")) {
        {}
      } else {
        stryCov_9fa48("4510");
        // First parameter is the button ID, second is the state
        buttonId = buttonIdOrState;
        isActive = stryMutAct_9fa48("4513") ? isActiveOrButtonId as boolean && false : stryMutAct_9fa48("4512") ? false : stryMutAct_9fa48("4511") ? true : (stryCov_9fa48("4511", "4512", "4513"), isActiveOrButtonId as boolean || (stryMutAct_9fa48("4514") ? true : (stryCov_9fa48("4514"), false)));
      }
    }
    const button = document.getElementById(buttonId) as HTMLButtonElement;
    if (stryMutAct_9fa48("4517") ? false : stryMutAct_9fa48("4516") ? true : stryMutAct_9fa48("4515") ? button : (stryCov_9fa48("4515", "4516", "4517"), !button)) {
      if (stryMutAct_9fa48("4518")) {
        {}
      } else {
        stryCov_9fa48("4518");
        // logger.error("Toggle button with ID " + buttonId + " not found"); // Original code had logger, but logger is removed.
        return;
      }
    }

    // Update button state
    button.classList.toggle(stryMutAct_9fa48("4519") ? "" : (stryCov_9fa48("4519"), "active"), isActive);
    button.setAttribute(stryMutAct_9fa48("4520") ? "" : (stryCov_9fa48("4520"), "aria-pressed"), isActive.toString());

    // Update button text based on state
    if (stryMutAct_9fa48("4523") ? buttonText === undefined : stryMutAct_9fa48("4522") ? false : stryMutAct_9fa48("4521") ? true : (stryCov_9fa48("4521", "4522", "4523"), buttonText !== undefined)) {
      if (stryMutAct_9fa48("4524")) {
        {}
      } else {
        stryCov_9fa48("4524");
        button.textContent = buttonText;
      }
    } else {
      if (stryMutAct_9fa48("4525")) {
        {}
      } else {
        stryCov_9fa48("4525");
        button.textContent = isActive ? stryMutAct_9fa48("4526") ? "" : (stryCov_9fa48("4526"), "HIDE") : stryMutAct_9fa48("4527") ? "" : (stryCov_9fa48("4527"), "SHOW");
      }
    }

    // Update disabled state if specified
    if (stryMutAct_9fa48("4530") ? isDisabled === undefined : stryMutAct_9fa48("4529") ? false : stryMutAct_9fa48("4528") ? true : (stryCov_9fa48("4528", "4529", "4530"), isDisabled !== undefined)) {
      if (stryMutAct_9fa48("4531")) {
        {}
      } else {
        stryCov_9fa48("4531");
        button.disabled = isDisabled;
      }
    }
  }
}

/**
 * Loads download history entries and renders them in the popup UI.
 * Fetches history from storage or the server and creates UI elements
 * to display the download history.
 *
 * @param containerId - ID of the container element for history items (defaults to 'history-items')
 * @param limit - Maximum number of history entries to display (defaults to 5)
 */
export function loadAndRenderHistory(containerId: string = stryMutAct_9fa48("4532") ? "" : (stryCov_9fa48("4532"), "history-items"), limit: number = 5): void {
  if (stryMutAct_9fa48("4533")) {
    {}
  } else {
    stryCov_9fa48("4533");
    const container = document.getElementById(containerId);
    if (stryMutAct_9fa48("4536") ? false : stryMutAct_9fa48("4535") ? true : stryMutAct_9fa48("4534") ? container : (stryCov_9fa48("4534", "4535", "4536"), !container)) {
      if (stryMutAct_9fa48("4537")) {
        {}
      } else {
        stryCov_9fa48("4537");
        // logger.error("History container with ID " + containerId + " not found"); // Original code had logger, but logger is removed.
        return;
      }
    }

    // Clear existing history items
    container.innerHTML = stryMutAct_9fa48("4538") ? "Stryker was here!" : (stryCov_9fa48("4538"), "");

    // Fetch history entries from storage
    chrome.storage.local.get(stryMutAct_9fa48("4539") ? [] : (stryCov_9fa48("4539"), [stryMutAct_9fa48("4540") ? "" : (stryCov_9fa48("4540"), "downloadHistory")]), result => {
      if (stryMutAct_9fa48("4541")) {
        {}
      } else {
        stryCov_9fa48("4541");
        const history: HistoryEntry[] = stryMutAct_9fa48("4544") ? result.downloadHistory && [] : stryMutAct_9fa48("4543") ? false : stryMutAct_9fa48("4542") ? true : (stryCov_9fa48("4542", "4543", "4544"), result.downloadHistory || (stryMutAct_9fa48("4545") ? ["Stryker was here"] : (stryCov_9fa48("4545"), [])));
        const recentEntries = stryMutAct_9fa48("4546") ? history : (stryCov_9fa48("4546"), history.slice(0, limit));
        if (stryMutAct_9fa48("4549") ? recentEntries.length !== 0 : stryMutAct_9fa48("4548") ? false : stryMutAct_9fa48("4547") ? true : (stryCov_9fa48("4547", "4548", "4549"), recentEntries.length === 0)) {
          if (stryMutAct_9fa48("4550")) {
            {}
          } else {
            stryCov_9fa48("4550");
            // Display message when no history exists
            const emptyMessage = document.createElement(stryMutAct_9fa48("4551") ? "" : (stryCov_9fa48("4551"), "div"));
            emptyMessage.className = stryMutAct_9fa48("4552") ? "" : (stryCov_9fa48("4552"), "history-empty");
            emptyMessage.textContent = stryMutAct_9fa48("4553") ? "" : (stryCov_9fa48("4553"), "No download history yet");
            container.appendChild(emptyMessage);
            return;
          }
        }

        // Create history items
        recentEntries.forEach(entry => {
          if (stryMutAct_9fa48("4554")) {
            {}
          } else {
            stryCov_9fa48("4554");
            const item = document.createElement(stryMutAct_9fa48("4555") ? "" : (stryCov_9fa48("4555"), "div"));
            item.className = (stryMutAct_9fa48("4556") ? "" : (stryCov_9fa48("4556"), "history-item status-")) + entry.status;
            const title = document.createElement(stryMutAct_9fa48("4557") ? "" : (stryCov_9fa48("4557"), "div"));
            title.className = stryMutAct_9fa48("4558") ? "" : (stryCov_9fa48("4558"), "history-title");
            title.textContent = stryMutAct_9fa48("4561") ? entry.page_title && "Unknown video" : stryMutAct_9fa48("4560") ? false : stryMutAct_9fa48("4559") ? true : (stryCov_9fa48("4559", "4560", "4561"), entry.page_title || (stryMutAct_9fa48("4562") ? "" : (stryCov_9fa48("4562"), "Unknown video")));
            const meta = document.createElement(stryMutAct_9fa48("4563") ? "" : (stryCov_9fa48("4563"), "div"));
            meta.className = stryMutAct_9fa48("4564") ? "" : (stryCov_9fa48("4564"), "history-meta");
            meta.textContent = entry.status + (stryMutAct_9fa48("4565") ? "" : (stryCov_9fa48("4565"), "  ")) + new Date(stryMutAct_9fa48("4568") ? entry.timestamp && Date.now() : stryMutAct_9fa48("4567") ? false : stryMutAct_9fa48("4566") ? true : (stryCov_9fa48("4566", "4567", "4568"), entry.timestamp || Date.now())).toLocaleString();
            item.appendChild(title);
            item.appendChild(meta);
            container.appendChild(item);
          }
        });

        // logger.debug("Rendered " + recentEntries.length + " history entries"); // Original code had logger, but logger is removed.
      }
    });
  }
}

// Load configuration from server or fallback to local storage
export async function loadConfig(): Promise<any> {
  if (stryMutAct_9fa48("4569")) {
    {}
  } else {
    stryCov_9fa48("4569");
    return new Promise(resolve => {
      if (stryMutAct_9fa48("4570")) {
        {}
      } else {
        stryCov_9fa48("4570");
        chrome.runtime.sendMessage(stryMutAct_9fa48("4571") ? {} : (stryCov_9fa48("4571"), {
          type: stryMutAct_9fa48("4572") ? "" : (stryCov_9fa48("4572"), "getConfig")
        }), (response: any) => {
          if (stryMutAct_9fa48("4573")) {
            {}
          } else {
            stryCov_9fa48("4573");
            if (stryMutAct_9fa48("4576") ? !chrome.runtime.lastError && response || response.data || response.serverConfig : stryMutAct_9fa48("4575") ? false : stryMutAct_9fa48("4574") ? true : (stryCov_9fa48("4574", "4575", "4576"), (stryMutAct_9fa48("4578") ? !chrome.runtime.lastError || response : stryMutAct_9fa48("4577") ? true : (stryCov_9fa48("4577", "4578"), (stryMutAct_9fa48("4579") ? chrome.runtime.lastError : (stryCov_9fa48("4579"), !chrome.runtime.lastError)) && response)) && (stryMutAct_9fa48("4581") ? response.data && response.serverConfig : stryMutAct_9fa48("4580") ? true : (stryCov_9fa48("4580", "4581"), response.data || response.serverConfig)))) {
              if (stryMutAct_9fa48("4582")) {
                {}
              } else {
                stryCov_9fa48("4582");
                // Normalize to .data (background returns { status, data })
                const cfg = stryMutAct_9fa48("4585") ? response.data && response.serverConfig : stryMutAct_9fa48("4584") ? false : stryMutAct_9fa48("4583") ? true : (stryCov_9fa48("4583", "4584", "4585"), response.data || response.serverConfig);
                resolve(cfg);
              }
            } else {
              if (stryMutAct_9fa48("4586")) {
                {}
              } else {
                stryCov_9fa48("4586");
                chrome.storage.local.get(stryMutAct_9fa48("4587") ? "" : (stryCov_9fa48("4587"), "extensionConfig"), (result: any) => {
                  if (stryMutAct_9fa48("4588")) {
                    {}
                  } else {
                    stryCov_9fa48("4588");
                    resolve(result.extensionConfig);
                  }
                });
              }
            }
          }
        });
      }
    });
  }
}

// Update download directory display element
export async function updateDownloadDirDisplay(): Promise<void> {
  if (stryMutAct_9fa48("4589")) {
    {}
  } else {
    stryCov_9fa48("4589");
    const el = document.getElementById(stryMutAct_9fa48("4590") ? "" : (stryCov_9fa48("4590"), "download-dir-display"));
    if (stryMutAct_9fa48("4593") ? false : stryMutAct_9fa48("4592") ? true : stryMutAct_9fa48("4591") ? el : (stryCov_9fa48("4591", "4592", "4593"), !el)) return;
    return new Promise(resolve => {
      if (stryMutAct_9fa48("4594")) {
        {}
      } else {
        stryCov_9fa48("4594");
        chrome.runtime.sendMessage(stryMutAct_9fa48("4595") ? {} : (stryCov_9fa48("4595"), {
          type: stryMutAct_9fa48("4596") ? "" : (stryCov_9fa48("4596"), "getConfig")
        }), (response: any) => {
          if (stryMutAct_9fa48("4597")) {
            {}
          } else {
            stryCov_9fa48("4597");
            if (stryMutAct_9fa48("4600") ? !chrome.runtime.lastError && response || response.data || response.serverConfig : stryMutAct_9fa48("4599") ? false : stryMutAct_9fa48("4598") ? true : (stryCov_9fa48("4598", "4599", "4600"), (stryMutAct_9fa48("4602") ? !chrome.runtime.lastError || response : stryMutAct_9fa48("4601") ? true : (stryCov_9fa48("4601", "4602"), (stryMutAct_9fa48("4603") ? chrome.runtime.lastError : (stryCov_9fa48("4603"), !chrome.runtime.lastError)) && response)) && (stryMutAct_9fa48("4605") ? response.data && response.serverConfig : stryMutAct_9fa48("4604") ? true : (stryCov_9fa48("4604", "4605"), response.data || response.serverConfig)))) {
              if (stryMutAct_9fa48("4606")) {
                {}
              } else {
                stryCov_9fa48("4606");
                const cfg = stryMutAct_9fa48("4609") ? response.data && response.serverConfig : stryMutAct_9fa48("4608") ? false : stryMutAct_9fa48("4607") ? true : (stryCov_9fa48("4607", "4608", "4609"), response.data || response.serverConfig);
                el.textContent = (stryMutAct_9fa48("4610") ? "" : (stryCov_9fa48("4610"), "Saving to: ")) + (stryMutAct_9fa48("4613") ? cfg?.download_dir && "" : stryMutAct_9fa48("4612") ? false : stryMutAct_9fa48("4611") ? true : (stryCov_9fa48("4611", "4612", "4613"), (stryMutAct_9fa48("4614") ? cfg.download_dir : (stryCov_9fa48("4614"), cfg?.download_dir)) || (stryMutAct_9fa48("4615") ? "Stryker was here!" : (stryCov_9fa48("4615"), ""))));
                resolve();
              }
            } else {
              if (stryMutAct_9fa48("4616")) {
                {}
              } else {
                stryCov_9fa48("4616");
                chrome.storage.local.get(stryMutAct_9fa48("4617") ? "" : (stryCov_9fa48("4617"), "extensionConfig"), (result: any) => {
                  if (stryMutAct_9fa48("4618")) {
                    {}
                  } else {
                    stryCov_9fa48("4618");
                    const cfg = stryMutAct_9fa48("4621") ? result.extensionConfig && {} : stryMutAct_9fa48("4620") ? false : stryMutAct_9fa48("4619") ? true : (stryCov_9fa48("4619", "4620", "4621"), result.extensionConfig || {});
                    el.textContent = (stryMutAct_9fa48("4622") ? "" : (stryCov_9fa48("4622"), "Saving to: ")) + (stryMutAct_9fa48("4625") ? cfg.download_dir && "" : stryMutAct_9fa48("4624") ? false : stryMutAct_9fa48("4623") ? true : (stryCov_9fa48("4623", "4624", "4625"), cfg.download_dir || (stryMutAct_9fa48("4626") ? "Stryker was here!" : (stryCov_9fa48("4626"), ""))));
                    resolve();
                  }
                });
              }
            }
          }
        });
      }
    });
  }
}

// Update server port display element
export async function updatePortDisplay(): Promise<void> {
  if (stryMutAct_9fa48("4627")) {
    {}
  } else {
    stryCov_9fa48("4627");
    const el = document.getElementById(stryMutAct_9fa48("4628") ? "" : (stryCov_9fa48("4628"), "server-port-display"));
    if (stryMutAct_9fa48("4631") ? false : stryMutAct_9fa48("4630") ? true : stryMutAct_9fa48("4629") ? el : (stryCov_9fa48("4629", "4630", "4631"), !el)) return;
    return new Promise(resolve => {
      if (stryMutAct_9fa48("4632")) {
        {}
      } else {
        stryCov_9fa48("4632");
        chrome.runtime.sendMessage(stryMutAct_9fa48("4633") ? {} : (stryCov_9fa48("4633"), {
          type: stryMutAct_9fa48("4634") ? "" : (stryCov_9fa48("4634"), "getConfig")
        }), (response: any) => {
          if (stryMutAct_9fa48("4635")) {
            {}
          } else {
            stryCov_9fa48("4635");
            if (stryMutAct_9fa48("4638") ? !chrome.runtime.lastError && response || response.data || response.serverConfig : stryMutAct_9fa48("4637") ? false : stryMutAct_9fa48("4636") ? true : (stryCov_9fa48("4636", "4637", "4638"), (stryMutAct_9fa48("4640") ? !chrome.runtime.lastError || response : stryMutAct_9fa48("4639") ? true : (stryCov_9fa48("4639", "4640"), (stryMutAct_9fa48("4641") ? chrome.runtime.lastError : (stryCov_9fa48("4641"), !chrome.runtime.lastError)) && response)) && (stryMutAct_9fa48("4643") ? response.data && response.serverConfig : stryMutAct_9fa48("4642") ? true : (stryCov_9fa48("4642", "4643"), response.data || response.serverConfig)))) {
              if (stryMutAct_9fa48("4644")) {
                {}
              } else {
                stryCov_9fa48("4644");
                const cfg = stryMutAct_9fa48("4647") ? response.data && response.serverConfig : stryMutAct_9fa48("4646") ? false : stryMutAct_9fa48("4645") ? true : (stryCov_9fa48("4645", "4646", "4647"), response.data || response.serverConfig);
                el.textContent = (stryMutAct_9fa48("4648") ? "" : (stryCov_9fa48("4648"), "Server Port: ")) + (stryMutAct_9fa48("4649") ? cfg?.server_port && "" : (stryCov_9fa48("4649"), (stryMutAct_9fa48("4650") ? cfg.server_port : (stryCov_9fa48("4650"), cfg?.server_port)) ?? (stryMutAct_9fa48("4651") ? "Stryker was here!" : (stryCov_9fa48("4651"), ""))));
              }
            }
            resolve();
          }
        });
      }
    });
  }
}

// Show configuration error if present in local storage
export function showConfigErrorIfPresent(): void {
  if (stryMutAct_9fa48("4652")) {
    {}
  } else {
    stryCov_9fa48("4652");
    const el = document.getElementById(stryMutAct_9fa48("4653") ? "" : (stryCov_9fa48("4653"), "config-error-display"));
    if (stryMutAct_9fa48("4656") ? false : stryMutAct_9fa48("4655") ? true : stryMutAct_9fa48("4654") ? el : (stryCov_9fa48("4654", "4655", "4656"), !el)) return;
    chrome.storage.local.get(stryMutAct_9fa48("4657") ? "" : (stryCov_9fa48("4657"), "configError"), (result: any) => {
      if (stryMutAct_9fa48("4658")) {
        {}
      } else {
        stryCov_9fa48("4658");
        if (stryMutAct_9fa48("4660") ? false : stryMutAct_9fa48("4659") ? true : (stryCov_9fa48("4659", "4660"), result.configError)) {
          if (stryMutAct_9fa48("4661")) {
            {}
          } else {
            stryCov_9fa48("4661");
            el.textContent = (stryMutAct_9fa48("4662") ? "" : (stryCov_9fa48("4662"), "Configuration Error: ")) + result.configError;
            el.classList.remove(stryMutAct_9fa48("4663") ? "" : (stryCov_9fa48("4663"), "hidden"));
            el.classList.add(stryMutAct_9fa48("4664") ? "" : (stryCov_9fa48("4664"), "evd-visible"));
          }
        }
      }
    });
  }
}

// Create a list item for errors with a toggle for details
export function createErrorListItem(downloadId: string, info: {
  filename: string;
  errorInfo: {
    type: string;
    message: string;
    original: string;
  };
}): HTMLLIElement {
  if (stryMutAct_9fa48("4665")) {
    {}
  } else {
    stryCov_9fa48("4665");
    const li = document.createElement(stryMutAct_9fa48("4666") ? "" : (stryCov_9fa48("4666"), "li"));
    // Add CSS classes for severity-based styling
    const severity = stryMutAct_9fa48("4667") ? info.errorInfo.type.toUpperCase() : (stryCov_9fa48("4667"), info.errorInfo.type.toLowerCase());
    li.classList.add((stryMutAct_9fa48("4668") ? "" : (stryCov_9fa48("4668"), "status-")) + severity);
    li.classList.add((stryMutAct_9fa48("4669") ? "" : (stryCov_9fa48("4669"), "severity-")) + severity);
    li.dataset.downloadId = downloadId;
    const title = document.createElement(stryMutAct_9fa48("4670") ? "" : (stryCov_9fa48("4670"), "div"));
    title.className = stryMutAct_9fa48("4671") ? "" : (stryCov_9fa48("4671"), "item-title");
    title.textContent = info.filename;
    li.appendChild(title);
    // Use semantic <details> for error details
    const detailsEl = document.createElement(stryMutAct_9fa48("4672") ? "" : (stryCov_9fa48("4672"), "details"));
    detailsEl.className = stryMutAct_9fa48("4673") ? "" : (stryCov_9fa48("4673"), "error-details");
    const summary = document.createElement(stryMutAct_9fa48("4674") ? "" : (stryCov_9fa48("4674"), "summary"));
    summary.textContent = stryMutAct_9fa48("4675") ? "" : (stryCov_9fa48("4675"), "Details");
    detailsEl.appendChild(summary);
    const content = document.createElement(stryMutAct_9fa48("4676") ? "" : (stryCov_9fa48("4676"), "div"));
    content.className = stryMutAct_9fa48("4677") ? "" : (stryCov_9fa48("4677"), "error-details-content");
    content.textContent = info.errorInfo.type + (stryMutAct_9fa48("4678") ? "" : (stryCov_9fa48("4678"), ": ")) + info.errorInfo.message + (stryMutAct_9fa48("4679") ? "" : (stryCov_9fa48("4679"), " (")) + info.errorInfo.original + (stryMutAct_9fa48("4680") ? "" : (stryCov_9fa48("4680"), ")"));
    detailsEl.appendChild(content);
    // Add contextual help/troubleshooting link
    const helpBtn = document.createElement(stryMutAct_9fa48("4681") ? "" : (stryCov_9fa48("4681"), "button"));
    helpBtn.className = stryMutAct_9fa48("4682") ? "" : (stryCov_9fa48("4682"), "error-help-link");
    helpBtn.textContent = stryMutAct_9fa48("4683") ? "" : (stryCov_9fa48("4683"), "Help");
    helpBtn.addEventListener(stryMutAct_9fa48("4684") ? "" : (stryCov_9fa48("4684"), "click"), (): void => {
      if (stryMutAct_9fa48("4685")) {
        {}
      } else {
        stryCov_9fa48("4685");
        // Open extension options page for troubleshooting
        (chrome.runtime as any).openOptionsPage();
      }
    });
    detailsEl.appendChild(helpBtn);
    li.appendChild(detailsEl);
    return li;
  }
}

// Create a generic list item with a resume button
export function createGenericListItem(downloadId: string, item: {
  status: string;
}): HTMLLIElement {
  if (stryMutAct_9fa48("4686")) {
    {}
  } else {
    stryCov_9fa48("4686");
    const li = document.createElement(stryMutAct_9fa48("4687") ? "" : (stryCov_9fa48("4687"), "li"));
    li.classList.add((stryMutAct_9fa48("4688") ? "" : (stryCov_9fa48("4688"), "status-")) + item.status);
    const statusText = document.createElement(stryMutAct_9fa48("4689") ? "" : (stryCov_9fa48("4689"), "div"));
    statusText.className = stryMutAct_9fa48("4690") ? "" : (stryCov_9fa48("4690"), "item-status");
    statusText.textContent = item.status;
    li.appendChild(statusText);
    li.dataset.downloadId = downloadId;
    const btn = document.createElement(stryMutAct_9fa48("4691") ? "" : (stryCov_9fa48("4691"), "button"));
    btn.className = stryMutAct_9fa48("4692") ? "" : (stryCov_9fa48("4692"), "resume-button");
    btn.textContent = stryMutAct_9fa48("4693") ? "" : (stryCov_9fa48("4693"), "Resume");
    li.appendChild(btn);
    return li;
  }
}

// Create a queued list item with a cancel button
export function createQueuedListItem(item: {
  id: string;
}): HTMLLIElement {
  if (stryMutAct_9fa48("4694")) {
    {}
  } else {
    stryCov_9fa48("4694");
    const li = document.createElement(stryMutAct_9fa48("4695") ? "" : (stryCov_9fa48("4695"), "li"));
    li.classList.add(stryMutAct_9fa48("4696") ? "" : (stryCov_9fa48("4696"), "queued-item"));
    li.dataset.downloadId = item.id;
    const queuedText = document.createElement(stryMutAct_9fa48("4697") ? "" : (stryCov_9fa48("4697"), "div"));
    queuedText.className = stryMutAct_9fa48("4698") ? "" : (stryCov_9fa48("4698"), "item-status");
    queuedText.textContent = (stryMutAct_9fa48("4699") ? "" : (stryCov_9fa48("4699"), "Queued: ")) + item.id;
    li.appendChild(queuedText);
    const btn = document.createElement(stryMutAct_9fa48("4700") ? "" : (stryCov_9fa48("4700"), "button"));
    btn.className = stryMutAct_9fa48("4701") ? "" : (stryCov_9fa48("4701"), "cancel-button");
    btn.textContent = stryMutAct_9fa48("4702") ? "" : (stryCov_9fa48("4702"), "Cancel");
    btn.addEventListener(stryMutAct_9fa48("4703") ? "" : (stryCov_9fa48("4703"), "click"), () => {
      if (stryMutAct_9fa48("4704")) {
        {}
      } else {
        stryCov_9fa48("4704");
        chrome.runtime.sendMessage(stryMutAct_9fa48("4705") ? {} : (stryCov_9fa48("4705"), {
          type: stryMutAct_9fa48("4706") ? "" : (stryCov_9fa48("4706"), "cancelDownload"),
          downloadId: item.id
        }), () => {});
      }
    });
    li.appendChild(btn);
    return li;
  }
}

// Create an active download list item with a pause button
export function createActiveListItem(downloadId: string, statusObj: {
  status: string;
  progress: number;
  filename?: string;
  error?: string;
  message?: string;
}): HTMLLIElement {
  if (stryMutAct_9fa48("4707")) {
    {}
  } else {
    stryCov_9fa48("4707");
    const li = document.createElement(stryMutAct_9fa48("4708") ? "" : (stryCov_9fa48("4708"), "li"));
    li.classList.add(stryMutAct_9fa48("4709") ? "" : (stryCov_9fa48("4709"), "active-item"));
    li.classList.add((stryMutAct_9fa48("4710") ? "" : (stryCov_9fa48("4710"), "status-")) + statusObj.status);
    li.dataset.downloadId = downloadId;
    const title = document.createElement(stryMutAct_9fa48("4711") ? "" : (stryCov_9fa48("4711"), "div"));
    title.textContent = stryMutAct_9fa48("4714") ? statusObj.filename && downloadId : stryMutAct_9fa48("4713") ? false : stryMutAct_9fa48("4712") ? true : (stryCov_9fa48("4712", "4713", "4714"), statusObj.filename || downloadId);
    li.appendChild(title);
    const progress = document.createElement(stryMutAct_9fa48("4715") ? "" : (stryCov_9fa48("4715"), "progress"));
    progress.value = statusObj.progress;
    progress.max = 100;
    li.appendChild(progress);
    const percentLabel = document.createElement(stryMutAct_9fa48("4716") ? "" : (stryCov_9fa48("4716"), "span"));
    percentLabel.className = stryMutAct_9fa48("4717") ? "" : (stryCov_9fa48("4717"), "item-percent");
    percentLabel.textContent = String(statusObj.progress) + (stryMutAct_9fa48("4718") ? "" : (stryCov_9fa48("4718"), "%"));
    li.appendChild(percentLabel);
    const statusText = document.createElement(stryMutAct_9fa48("4719") ? "" : (stryCov_9fa48("4719"), "div"));
    statusText.className = stryMutAct_9fa48("4720") ? "" : (stryCov_9fa48("4720"), "item-status");
    statusText.textContent = statusObj.status;
    li.appendChild(statusText);
    const btn = document.createElement(stryMutAct_9fa48("4721") ? "" : (stryCov_9fa48("4721"), "button"));
    btn.className = stryMutAct_9fa48("4722") ? "" : (stryCov_9fa48("4722"), "pause-button");
    btn.textContent = stryMutAct_9fa48("4723") ? "" : (stryCov_9fa48("4723"), "Pause");
    btn.addEventListener(stryMutAct_9fa48("4724") ? "" : (stryCov_9fa48("4724"), "click"), () => {
      if (stryMutAct_9fa48("4725")) {
        {}
      } else {
        stryCov_9fa48("4725");
        chrome.runtime.sendMessage(stryMutAct_9fa48("4726") ? {} : (stryCov_9fa48("4726"), {
          type: stryMutAct_9fa48("4727") ? "" : (stryCov_9fa48("4727"), "pauseDownload"),
          downloadId
        }), () => {});
      }
    });
    li.appendChild(btn);
    // Priority control (optional)
    const priorityWrapper = document.createElement(stryMutAct_9fa48("4728") ? "" : (stryCov_9fa48("4728"), "div"));
    priorityWrapper.className = stryMutAct_9fa48("4729") ? "" : (stryCov_9fa48("4729"), "priority-controls");
    const select = document.createElement(stryMutAct_9fa48("4730") ? "" : (stryCov_9fa48("4730"), "select"));
    select.className = stryMutAct_9fa48("4731") ? "" : (stryCov_9fa48("4731"), "priority-select");
    const priorityOptions = stryMutAct_9fa48("4732") ? [] : (stryCov_9fa48("4732"), [stryMutAct_9fa48("4733") ? {} : (stryCov_9fa48("4733"), {
      label: stryMutAct_9fa48("4734") ? "" : (stryCov_9fa48("4734"), "Low (+10)"),
      value: 10
    }), stryMutAct_9fa48("4735") ? {} : (stryCov_9fa48("4735"), {
      label: stryMutAct_9fa48("4736") ? "" : (stryCov_9fa48("4736"), "Below normal (+5)"),
      value: 5
    }), stryMutAct_9fa48("4737") ? {} : (stryCov_9fa48("4737"), {
      label: stryMutAct_9fa48("4738") ? "" : (stryCov_9fa48("4738"), "Normal (0)"),
      value: 0
    }), stryMutAct_9fa48("4739") ? {} : (stryCov_9fa48("4739"), {
      label: stryMutAct_9fa48("4740") ? "" : (stryCov_9fa48("4740"), "Above normal (-5)"),
      value: stryMutAct_9fa48("4741") ? +5 : (stryCov_9fa48("4741"), -5)
    })]);
    priorityOptions.forEach(opt => {
      if (stryMutAct_9fa48("4742")) {
        {}
      } else {
        stryCov_9fa48("4742");
        const o = document.createElement(stryMutAct_9fa48("4743") ? "" : (stryCov_9fa48("4743"), "option"));
        o.value = String(opt.value);
        o.textContent = opt.label;
        select.appendChild(o);
      }
    });
    const setBtn = document.createElement(stryMutAct_9fa48("4744") ? "" : (stryCov_9fa48("4744"), "button"));
    setBtn.className = stryMutAct_9fa48("4745") ? "" : (stryCov_9fa48("4745"), "priority-set-button");
    setBtn.textContent = stryMutAct_9fa48("4746") ? "" : (stryCov_9fa48("4746"), "Set Priority");
    setBtn.addEventListener(stryMutAct_9fa48("4747") ? "" : (stryCov_9fa48("4747"), "click"), () => {
      if (stryMutAct_9fa48("4748")) {
        {}
      } else {
        stryCov_9fa48("4748");
        const val = parseInt(select.value, 10);
        if (stryMutAct_9fa48("4751") ? false : stryMutAct_9fa48("4750") ? true : stryMutAct_9fa48("4749") ? Number.isFinite(val) : (stryCov_9fa48("4749", "4750", "4751"), !Number.isFinite(val))) return;
        chrome.runtime.sendMessage(stryMutAct_9fa48("4752") ? {} : (stryCov_9fa48("4752"), {
          type: stryMutAct_9fa48("4753") ? "" : (stryCov_9fa48("4753"), "setPriority"),
          downloadId,
          priority: val
        }), () => {});
      }
    });
    priorityWrapper.appendChild(select);
    priorityWrapper.appendChild(setBtn);
    li.appendChild(priorityWrapper);
    return li;
  }
}

// Drag-and-drop queue reordering handlers
export function handleDragStart(e: DragEvent): void {
  if (stryMutAct_9fa48("4754")) {
    {}
  } else {
    stryCov_9fa48("4754");
    const li = e.currentTarget as HTMLLIElement;
    dragSrcIndex = Array.from(li.parentElement!.children).indexOf(li);
    e.dataTransfer!.effectAllowed = stryMutAct_9fa48("4755") ? "" : (stryCov_9fa48("4755"), "move");
    e.dataTransfer!.setData(stryMutAct_9fa48("4756") ? "" : (stryCov_9fa48("4756"), "text/plain"), li.dataset.downloadId!);
    li.classList.add(stryMutAct_9fa48("4757") ? "" : (stryCov_9fa48("4757"), "dragging"));
  }
}
export function handleDragOver(e: DragEvent): void {
  if (stryMutAct_9fa48("4758")) {
    {}
  } else {
    stryCov_9fa48("4758");
    e.preventDefault();
    const li = e.currentTarget as HTMLLIElement;
    li.classList.add(stryMutAct_9fa48("4759") ? "" : (stryCov_9fa48("4759"), "drag-over"));
    e.dataTransfer!.dropEffect = stryMutAct_9fa48("4760") ? "" : (stryCov_9fa48("4760"), "move");
  }
}
export function handleDragLeave(e: DragEvent): void {
  if (stryMutAct_9fa48("4761")) {
    {}
  } else {
    stryCov_9fa48("4761");
    const li = e.currentTarget as HTMLLIElement;
    li.classList.remove(stryMutAct_9fa48("4762") ? "" : (stryCov_9fa48("4762"), "drag-over"));
  }
}
export function handleDrop(e: DragEvent): void {
  if (stryMutAct_9fa48("4763")) {
    {}
  } else {
    stryCov_9fa48("4763");
    e.preventDefault();
    const li = e.currentTarget as HTMLLIElement;
    li.classList.remove(stryMutAct_9fa48("4764") ? "" : (stryCov_9fa48("4764"), "drag-over"));
    if (stryMutAct_9fa48("4767") ? dragSrcIndex !== null : stryMutAct_9fa48("4766") ? false : stryMutAct_9fa48("4765") ? true : (stryCov_9fa48("4765", "4766", "4767"), dragSrcIndex === null)) return;
    const dropIndex = Array.from(li.parentElement!.children).indexOf(li);
    // Collect current ids
    const listEls = Array.from(li.parentElement!.children) as HTMLLIElement[];
    const ids = listEls.map(stryMutAct_9fa48("4768") ? () => undefined : (stryCov_9fa48("4768"), el => el.dataset.downloadId!));
    // Reorder array
    const reordered = stryMutAct_9fa48("4769") ? [] : (stryCov_9fa48("4769"), [...ids]);
    const [moved] = reordered.splice(dragSrcIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    // Notify background of new queue order
    chrome.runtime.sendMessage(stryMutAct_9fa48("4770") ? {} : (stryCov_9fa48("4770"), {
      type: stryMutAct_9fa48("4771") ? "" : (stryCov_9fa48("4771"), "reorderQueue"),
      queue: reordered
    }));
  }
}
export function handleDragEnd(e: DragEvent): void {
  if (stryMutAct_9fa48("4772")) {
    {}
  } else {
    stryCov_9fa48("4772");
    (e.currentTarget as HTMLLIElement).classList.remove(stryMutAct_9fa48("4773") ? "" : (stryCov_9fa48("4773"), "dragging"));
  }
}

// Render current downloads and queued items
export function renderDownloadStatus(data: {
  active: Record<string, any>;
  queue: string[];
}): void {
  if (stryMutAct_9fa48("4774")) {
    {}
  } else {
    stryCov_9fa48("4774");
    const container = document.getElementById(stryMutAct_9fa48("4775") ? "" : (stryCov_9fa48("4775"), "download-status"));
    if (stryMutAct_9fa48("4778") ? false : stryMutAct_9fa48("4777") ? true : stryMutAct_9fa48("4776") ? container : (stryCov_9fa48("4776", "4777", "4778"), !container)) return;
    container.innerHTML = stryMutAct_9fa48("4779") ? "Stryker was here!" : (stryCov_9fa48("4779"), "");
    const activeIds = Object.keys(stryMutAct_9fa48("4782") ? data.active && {} : stryMutAct_9fa48("4781") ? false : stryMutAct_9fa48("4780") ? true : (stryCov_9fa48("4780", "4781", "4782"), data.active || {}));
    const queuedIds = stryMutAct_9fa48("4785") ? data.queue && [] : stryMutAct_9fa48("4784") ? false : stryMutAct_9fa48("4783") ? true : (stryCov_9fa48("4783", "4784", "4785"), data.queue || (stryMutAct_9fa48("4786") ? ["Stryker was here"] : (stryCov_9fa48("4786"), [])));
    if (stryMutAct_9fa48("4789") ? activeIds.length === 0 || queuedIds.length === 0 : stryMutAct_9fa48("4788") ? false : stryMutAct_9fa48("4787") ? true : (stryCov_9fa48("4787", "4788", "4789"), (stryMutAct_9fa48("4791") ? activeIds.length !== 0 : stryMutAct_9fa48("4790") ? true : (stryCov_9fa48("4790", "4791"), activeIds.length === 0)) && (stryMutAct_9fa48("4793") ? queuedIds.length !== 0 : stryMutAct_9fa48("4792") ? true : (stryCov_9fa48("4792", "4793"), queuedIds.length === 0)))) {
      if (stryMutAct_9fa48("4794")) {
        {}
      } else {
        stryCov_9fa48("4794");
        const li = document.createElement(stryMutAct_9fa48("4795") ? "" : (stryCov_9fa48("4795"), "li"));
        li.textContent = stryMutAct_9fa48("4796") ? "" : (stryCov_9fa48("4796"), "No active or queued downloads.");
        container.appendChild(li);
        return;
      }
    }
    // Grouped active and queued items into collapsible sections
    if (stryMutAct_9fa48("4800") ? activeIds.length <= 0 : stryMutAct_9fa48("4799") ? activeIds.length >= 0 : stryMutAct_9fa48("4798") ? false : stryMutAct_9fa48("4797") ? true : (stryCov_9fa48("4797", "4798", "4799", "4800"), activeIds.length > 0)) {
      if (stryMutAct_9fa48("4801")) {
        {}
      } else {
        stryCov_9fa48("4801");
        const activeDetails = document.createElement(stryMutAct_9fa48("4802") ? "" : (stryCov_9fa48("4802"), "details"));
        activeDetails.open = stryMutAct_9fa48("4803") ? false : (stryCov_9fa48("4803"), true);
        const activeSummary = document.createElement(stryMutAct_9fa48("4804") ? "" : (stryCov_9fa48("4804"), "summary"));
        activeSummary.textContent = stryMutAct_9fa48("4805") ? "" : (stryCov_9fa48("4805"), "Active Downloads");
        activeDetails.appendChild(activeSummary);
        const activeUl = document.createElement(stryMutAct_9fa48("4806") ? "" : (stryCov_9fa48("4806"), "ul"));
        activeIds.forEach(id => {
          if (stryMutAct_9fa48("4807")) {
            {}
          } else {
            stryCov_9fa48("4807");
            const statusObj = data.active[id];
            let liEl: HTMLLIElement;
            if (stryMutAct_9fa48("4810") ? statusObj.status !== "error" : stryMutAct_9fa48("4809") ? false : stryMutAct_9fa48("4808") ? true : (stryCov_9fa48("4808", "4809", "4810"), statusObj.status === (stryMutAct_9fa48("4811") ? "" : (stryCov_9fa48("4811"), "error")))) {
              if (stryMutAct_9fa48("4812")) {
                {}
              } else {
                stryCov_9fa48("4812");
                liEl = createErrorListItem(id, stryMutAct_9fa48("4813") ? {} : (stryCov_9fa48("4813"), {
                  filename: stryMutAct_9fa48("4816") ? statusObj.filename && id : stryMutAct_9fa48("4815") ? false : stryMutAct_9fa48("4814") ? true : (stryCov_9fa48("4814", "4815", "4816"), statusObj.filename || id),
                  errorInfo: stryMutAct_9fa48("4817") ? {} : (stryCov_9fa48("4817"), {
                    type: stryMutAct_9fa48("4818") ? "" : (stryCov_9fa48("4818"), "Error"),
                    message: stryMutAct_9fa48("4821") ? statusObj.error && "Error" : stryMutAct_9fa48("4820") ? false : stryMutAct_9fa48("4819") ? true : (stryCov_9fa48("4819", "4820", "4821"), statusObj.error || (stryMutAct_9fa48("4822") ? "" : (stryCov_9fa48("4822"), "Error"))),
                    original: stryMutAct_9fa48("4825") ? statusObj.message && "" : stryMutAct_9fa48("4824") ? false : stryMutAct_9fa48("4823") ? true : (stryCov_9fa48("4823", "4824", "4825"), statusObj.message || (stryMutAct_9fa48("4826") ? "Stryker was here!" : (stryCov_9fa48("4826"), "")))
                  })
                }));
              }
            } else if (stryMutAct_9fa48("4829") ? statusObj.status !== "paused" : stryMutAct_9fa48("4828") ? false : stryMutAct_9fa48("4827") ? true : (stryCov_9fa48("4827", "4828", "4829"), statusObj.status === (stryMutAct_9fa48("4830") ? "" : (stryCov_9fa48("4830"), "paused")))) {
              if (stryMutAct_9fa48("4831")) {
                {}
              } else {
                stryCov_9fa48("4831");
                liEl = createGenericListItem(id, stryMutAct_9fa48("4832") ? {} : (stryCov_9fa48("4832"), {
                  status: stryMutAct_9fa48("4833") ? "" : (stryCov_9fa48("4833"), "paused")
                }));
                stryMutAct_9fa48("4834") ? liEl.querySelector("button.resume-button").addEventListener("click", () => {
                  chrome.runtime.sendMessage({
                    type: "resumeDownload",
                    downloadId: id
                  }, () => {});
                }) : (stryCov_9fa48("4834"), liEl.querySelector(stryMutAct_9fa48("4835") ? "" : (stryCov_9fa48("4835"), "button.resume-button"))?.addEventListener(stryMutAct_9fa48("4836") ? "" : (stryCov_9fa48("4836"), "click"), () => {
                  if (stryMutAct_9fa48("4837")) {
                    {}
                  } else {
                    stryCov_9fa48("4837");
                    chrome.runtime.sendMessage(stryMutAct_9fa48("4838") ? {} : (stryCov_9fa48("4838"), {
                      type: stryMutAct_9fa48("4839") ? "" : (stryCov_9fa48("4839"), "resumeDownload"),
                      downloadId: id
                    }), () => {});
                  }
                }));
              }
            } else {
              if (stryMutAct_9fa48("4840")) {
                {}
              } else {
                stryCov_9fa48("4840");
                liEl = createActiveListItem(id, statusObj);
              }
            }
            activeUl.appendChild(liEl);
          }
        });
        activeDetails.appendChild(activeUl);
        container.appendChild(activeDetails);
      }
    }
    if (stryMutAct_9fa48("4844") ? queuedIds.length <= 0 : stryMutAct_9fa48("4843") ? queuedIds.length >= 0 : stryMutAct_9fa48("4842") ? false : stryMutAct_9fa48("4841") ? true : (stryCov_9fa48("4841", "4842", "4843", "4844"), queuedIds.length > 0)) {
      if (stryMutAct_9fa48("4845")) {
        {}
      } else {
        stryCov_9fa48("4845");
        const queueDetails = document.createElement(stryMutAct_9fa48("4846") ? "" : (stryCov_9fa48("4846"), "details"));
        queueDetails.open = stryMutAct_9fa48("4847") ? false : (stryCov_9fa48("4847"), true);
        const queueSummary = document.createElement(stryMutAct_9fa48("4848") ? "" : (stryCov_9fa48("4848"), "summary"));
        queueSummary.textContent = stryMutAct_9fa48("4849") ? "" : (stryCov_9fa48("4849"), "Queued Downloads");
        queueDetails.appendChild(queueSummary);
        const queueUl = document.createElement(stryMutAct_9fa48("4850") ? "" : (stryCov_9fa48("4850"), "ul"));
        queuedIds.forEach(id => {
          if (stryMutAct_9fa48("4851")) {
            {}
          } else {
            stryCov_9fa48("4851");
            const li = createQueuedListItem(stryMutAct_9fa48("4852") ? {} : (stryCov_9fa48("4852"), {
              id
            }));
            // Enable drag-and-drop reordering for queued items
            li.setAttribute(stryMutAct_9fa48("4853") ? "" : (stryCov_9fa48("4853"), "draggable"), stryMutAct_9fa48("4854") ? "" : (stryCov_9fa48("4854"), "true"));
            li.addEventListener(stryMutAct_9fa48("4855") ? "" : (stryCov_9fa48("4855"), "dragstart"), handleDragStart);
            li.addEventListener(stryMutAct_9fa48("4856") ? "" : (stryCov_9fa48("4856"), "dragover"), handleDragOver);
            li.addEventListener(stryMutAct_9fa48("4857") ? "" : (stryCov_9fa48("4857"), "dragleave"), handleDragLeave);
            li.addEventListener(stryMutAct_9fa48("4858") ? "" : (stryCov_9fa48("4858"), "drop"), handleDrop);
            li.addEventListener(stryMutAct_9fa48("4859") ? "" : (stryCov_9fa48("4859"), "dragend"), handleDragEnd);
            queueUl.appendChild(li);
          }
        });
        queueDetails.appendChild(queueUl);
        container.appendChild(queueDetails);
      }
    }
  }
}

/**
 * Updates the server status indicator in the popup.
 * @param status - The server status ('connected', 'disconnected', or 'checking')
 */
export function updatePopupServerStatus(status: "connected" | "disconnected" | "checking"): void {
  if (stryMutAct_9fa48("4860")) {
    {}
  } else {
    stryCov_9fa48("4860");
    const indicator = document.getElementById(stryMutAct_9fa48("4861") ? "" : (stryCov_9fa48("4861"), "server-status-indicator"));
    const text = document.getElementById(stryMutAct_9fa48("4862") ? "" : (stryCov_9fa48("4862"), "server-status-text"));
    if (stryMutAct_9fa48("4865") ? indicator || text : stryMutAct_9fa48("4864") ? false : stryMutAct_9fa48("4863") ? true : (stryCov_9fa48("4863", "4864", "4865"), indicator && text)) {
      if (stryMutAct_9fa48("4866")) {
        {}
      } else {
        stryCov_9fa48("4866");
        // Remove all status classes
        indicator.classList.remove(stryMutAct_9fa48("4867") ? "" : (stryCov_9fa48("4867"), "connected"), stryMutAct_9fa48("4868") ? "" : (stryCov_9fa48("4868"), "disconnected"));
        text.classList.remove(stryMutAct_9fa48("4869") ? "" : (stryCov_9fa48("4869"), "status-connected"), stryMutAct_9fa48("4870") ? "" : (stryCov_9fa48("4870"), "status-disconnected"));
        switch (status) {
          case stryMutAct_9fa48("4872") ? "" : (stryCov_9fa48("4872"), "connected"):
            if (stryMutAct_9fa48("4871")) {} else {
              stryCov_9fa48("4871");
              indicator.classList.add(stryMutAct_9fa48("4873") ? "" : (stryCov_9fa48("4873"), "connected"));
              text.classList.add(stryMutAct_9fa48("4874") ? "" : (stryCov_9fa48("4874"), "status-connected"));
              chrome.storage.local.get(stryMutAct_9fa48("4875") ? "" : (stryCov_9fa48("4875"), "serverPort"), res => {
                if (stryMutAct_9fa48("4876")) {
                  {}
                } else {
                  stryCov_9fa48("4876");
                  const port = stryMutAct_9fa48("4879") ? res.serverPort && "?" : stryMutAct_9fa48("4878") ? false : stryMutAct_9fa48("4877") ? true : (stryCov_9fa48("4877", "4878", "4879"), res.serverPort || (stryMutAct_9fa48("4880") ? "" : (stryCov_9fa48("4880"), "?")));
                  (text as HTMLElement).textContent = stryMutAct_9fa48("4881") ? `` : (stryCov_9fa48("4881"), `Server: Connected @ ${port}`);
                }
              });
              break;
            }
          case stryMutAct_9fa48("4883") ? "" : (stryCov_9fa48("4883"), "disconnected"):
            if (stryMutAct_9fa48("4882")) {} else {
              stryCov_9fa48("4882");
              indicator.classList.add(stryMutAct_9fa48("4884") ? "" : (stryCov_9fa48("4884"), "disconnected"));
              text.classList.add(stryMutAct_9fa48("4885") ? "" : (stryCov_9fa48("4885"), "status-disconnected"));
              (text as HTMLElement).textContent = stryMutAct_9fa48("4886") ? "" : (stryCov_9fa48("4886"), "Server: Disconnected");
              break;
            }
          case stryMutAct_9fa48("4888") ? "" : (stryCov_9fa48("4888"), "checking"):
            if (stryMutAct_9fa48("4887")) {} else {
              stryCov_9fa48("4887");
              text.textContent = stryMutAct_9fa48("4889") ? "" : (stryCov_9fa48("4889"), "Checking...");
              break;
            }
        }
      }
    }
  }
}

/**
 * Initialize the popup UI and set up all event listeners and message handlers.
 * This function should be called when the DOM is ready.
 */
export async function initPopup(): Promise<void> {
  if (stryMutAct_9fa48("4890")) {
    {}
  } else {
    stryCov_9fa48("4890");
    // Initialize theme
    await applyPopupTheme();

    // Set up settings button click handler
    const settingsButton = document.getElementById(stryMutAct_9fa48("4891") ? "" : (stryCov_9fa48("4891"), "open-settings"));
    if (stryMutAct_9fa48("4893") ? false : stryMutAct_9fa48("4892") ? true : (stryCov_9fa48("4892", "4893"), settingsButton)) {
      if (stryMutAct_9fa48("4894")) {
        {}
      } else {
        stryCov_9fa48("4894");
        settingsButton.addEventListener(stryMutAct_9fa48("4895") ? "" : (stryCov_9fa48("4895"), "click"), () => {
          if (stryMutAct_9fa48("4896")) {
            {}
          } else {
            stryCov_9fa48("4896");
            (chrome.runtime as any).openOptionsPage();
          }
        });
      }
    }

    // Helper to send a message to the active tab's content script
    const sendToActiveTab = (message: any, callback?: (response: any) => void): void => {
      if (stryMutAct_9fa48("4897")) {
        {}
      } else {
        stryCov_9fa48("4897");
        try {
          if (stryMutAct_9fa48("4898")) {
            {}
          } else {
            stryCov_9fa48("4898");
            chrome.tabs.query(stryMutAct_9fa48("4899") ? {} : (stryCov_9fa48("4899"), {
              active: stryMutAct_9fa48("4900") ? false : (stryCov_9fa48("4900"), true),
              currentWindow: stryMutAct_9fa48("4901") ? false : (stryCov_9fa48("4901"), true)
            }), tabs => {
              if (stryMutAct_9fa48("4902")) {
                {}
              } else {
                stryCov_9fa48("4902");
                const tabId = stryMutAct_9fa48("4905") ? tabs && tabs[0] || tabs[0].id : stryMutAct_9fa48("4904") ? false : stryMutAct_9fa48("4903") ? true : (stryCov_9fa48("4903", "4904", "4905"), (stryMutAct_9fa48("4907") ? tabs || tabs[0] : stryMutAct_9fa48("4906") ? true : (stryCov_9fa48("4906", "4907"), tabs && tabs[0])) && tabs[0].id);
                if (stryMutAct_9fa48("4910") ? tabId === undefined : stryMutAct_9fa48("4909") ? false : stryMutAct_9fa48("4908") ? true : (stryCov_9fa48("4908", "4909", "4910"), tabId !== undefined)) {
                  if (stryMutAct_9fa48("4911")) {
                    {}
                  } else {
                    stryCov_9fa48("4911");
                    chrome.tabs.sendMessage(tabId, message, resp => {
                      if (stryMutAct_9fa48("4912")) {
                        {}
                      } else {
                        stryCov_9fa48("4912");
                        // Swallow lastError; content script may not be injected on internal pages
                        if (stryMutAct_9fa48("4914") ? false : stryMutAct_9fa48("4913") ? true : (stryCov_9fa48("4913", "4914"), callback)) callback(resp);
                      }
                    });
                  }
                } else if (stryMutAct_9fa48("4916") ? false : stryMutAct_9fa48("4915") ? true : (stryCov_9fa48("4915", "4916"), callback)) {
                  if (stryMutAct_9fa48("4917")) {
                    {}
                  } else {
                    stryCov_9fa48("4917");
                    callback(undefined);
                  }
                }
              }
            });
          }
        } catch {
          if (stryMutAct_9fa48("4918")) {
            {}
          } else {
            stryCov_9fa48("4918");
            if (stryMutAct_9fa48("4920") ? false : stryMutAct_9fa48("4919") ? true : (stryCov_9fa48("4919", "4920"), callback)) callback(undefined);
          }
        }
      }
    };

    // Wire HIDE/SHOW toggle
    const toggleBtn = document.getElementById("toggle-enhanced-download-button") as HTMLButtonElement | null;
    if (stryMutAct_9fa48("4922") ? false : stryMutAct_9fa48("4921") ? true : (stryCov_9fa48("4921", "4922"), toggleBtn)) {
      if (stryMutAct_9fa48("4923")) {
        {}
      } else {
        stryCov_9fa48("4923");
        toggleBtn.addEventListener(stryMutAct_9fa48("4924") ? "" : (stryCov_9fa48("4924"), "click"), () => {
          if (stryMutAct_9fa48("4925")) {
            {}
          } else {
            stryCov_9fa48("4925");
            const currentlyHiding = stryMutAct_9fa48("4928") ? toggleBtn.textContent?.trim().toUpperCase() !== "HIDE" : stryMutAct_9fa48("4927") ? false : stryMutAct_9fa48("4926") ? true : (stryCov_9fa48("4926", "4927", "4928"), (stryMutAct_9fa48("4931") ? toggleBtn.textContent.trim().toUpperCase() : stryMutAct_9fa48("4930") ? toggleBtn.textContent.toUpperCase() : stryMutAct_9fa48("4929") ? toggleBtn.textContent?.trim().toLowerCase() : (stryCov_9fa48("4929", "4930", "4931"), toggleBtn.textContent?.trim().toUpperCase())) === (stryMutAct_9fa48("4932") ? "" : (stryCov_9fa48("4932"), "HIDE")));
            const newHidden = currentlyHiding; // if showing, next action hides
            sendToActiveTab(stryMutAct_9fa48("4933") ? {} : (stryCov_9fa48("4933"), {
              type: stryMutAct_9fa48("4934") ? "" : (stryCov_9fa48("4934"), "toggleButtonVisibility"),
              hidden: newHidden
            }), () => {
              if (stryMutAct_9fa48("4935")) {
                {}
              } else {
                stryCov_9fa48("4935");
                toggleBtn.textContent = newHidden ? stryMutAct_9fa48("4936") ? "" : (stryCov_9fa48("4936"), "SHOW") : stryMutAct_9fa48("4937") ? "" : (stryCov_9fa48("4937"), "HIDE");
              }
            });
          }
        });
      }
    }

    // Wire RESET position
    const resetBtn = document.getElementById("reset-button-position") as HTMLButtonElement | null;
    if (stryMutAct_9fa48("4939") ? false : stryMutAct_9fa48("4938") ? true : (stryCov_9fa48("4938", "4939"), resetBtn)) {
      if (stryMutAct_9fa48("4940")) {
        {}
      } else {
        stryCov_9fa48("4940");
        resetBtn.addEventListener(stryMutAct_9fa48("4941") ? "" : (stryCov_9fa48("4941"), "click"), () => {
          if (stryMutAct_9fa48("4942")) {
            {}
          } else {
            stryCov_9fa48("4942");
            sendToActiveTab(stryMutAct_9fa48("4943") ? {} : (stryCov_9fa48("4943"), {
              type: stryMutAct_9fa48("4944") ? "" : (stryCov_9fa48("4944"), "resetButtonPosition")
            }), () => {
              // no-op
            });
          }
        });
      }
    }

    // Initialize download status
    chrome.runtime.sendMessage(stryMutAct_9fa48("4945") ? {} : (stryCov_9fa48("4945"), {
      type: stryMutAct_9fa48("4946") ? "" : (stryCov_9fa48("4946"), "getQueue")
    }), (response: any) => {
      if (stryMutAct_9fa48("4947")) {
        {}
      } else {
        stryCov_9fa48("4947");
        renderDownloadStatus(stryMutAct_9fa48("4950") ? response && {
          active: {},
          queue: []
        } : stryMutAct_9fa48("4949") ? false : stryMutAct_9fa48("4948") ? true : (stryCov_9fa48("4948", "4949", "4950"), response || (stryMutAct_9fa48("4951") ? {} : (stryCov_9fa48("4951"), {
          active: {},
          queue: stryMutAct_9fa48("4952") ? ["Stryker was here"] : (stryCov_9fa48("4952"), [])
        }))));
      }
    });

    // Set up message listeners
    chrome.runtime.onMessage.addListener((msg: any) => {
      if (stryMutAct_9fa48("4953")) {
        {}
      } else {
        stryCov_9fa48("4953");
        if (stryMutAct_9fa48("4956") ? msg.type !== "downloadStatusUpdate" : stryMutAct_9fa48("4955") ? false : stryMutAct_9fa48("4954") ? true : (stryCov_9fa48("4954", "4955", "4956"), msg.type === (stryMutAct_9fa48("4957") ? "" : (stryCov_9fa48("4957"), "downloadStatusUpdate")))) {
          if (stryMutAct_9fa48("4958")) {
            {}
          } else {
            stryCov_9fa48("4958");
            renderDownloadStatus(msg.data);
          }
        } else if (stryMutAct_9fa48("4961") ? msg.type !== "queueUpdated" : stryMutAct_9fa48("4960") ? false : stryMutAct_9fa48("4959") ? true : (stryCov_9fa48("4959", "4960", "4961"), msg.type === (stryMutAct_9fa48("4962") ? "" : (stryCov_9fa48("4962"), "queueUpdated")))) {
          if (stryMutAct_9fa48("4963")) {
            {}
          } else {
            stryCov_9fa48("4963");
            renderDownloadStatus(stryMutAct_9fa48("4964") ? {} : (stryCov_9fa48("4964"), {
              active: msg.active,
              queue: msg.queue
            }));
          }
        } else if (stryMutAct_9fa48("4967") ? msg.type !== "serverStatusUpdate" : stryMutAct_9fa48("4966") ? false : stryMutAct_9fa48("4965") ? true : (stryCov_9fa48("4965", "4966", "4967"), msg.type === (stryMutAct_9fa48("4968") ? "" : (stryCov_9fa48("4968"), "serverStatusUpdate")))) {
          if (stryMutAct_9fa48("4969")) {
            {}
          } else {
            stryCov_9fa48("4969");
            updatePopupServerStatus(msg.status);
          }
        }
      }
    });
  }
}

// Initialize popup when DOM is ready
document.addEventListener(stryMutAct_9fa48("4970") ? "" : (stryCov_9fa48("4970"), "DOMContentLoaded"), () => {
  if (stryMutAct_9fa48("4971")) {
    {}
  } else {
    stryCov_9fa48("4971");
    initPopup().catch(error => {
      if (stryMutAct_9fa48("4972")) {
        {}
      } else {
        stryCov_9fa48("4972");
        console.error(stryMutAct_9fa48("4973") ? "" : (stryCov_9fa48("4973"), "Error initializing popup:"), error);
      }
    });
  }
});