/**
 * Options page functionality for the Enhanced Video Downloader extension.
 * Handles extension settings, configuration, and user preferences.
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
import { safeParse } from "./lib/utils";
import { logger } from "./core/logger";
import { Theme, ServerConfig } from "./types";
import { clearHistoryAndNotify, fetchHistory, renderHistoryItems } from "./history";
import { getServerPort, getPortRange } from "./core/constants";

// Add type definitions for newer APIs
declare global {
  interface Window {
    showDirectoryPicker?: (options?: DirectoryPickerOptions) => Promise<FileSystemDirectoryHandle>;
  }
  interface DirectoryPickerOptions {
    mode?: "read" | "readwrite";
  }
}
const setStatus = (elementId: string, message: string, isError = stryMutAct_9fa48("3224") ? true : (stryCov_9fa48("3224"), false), timeout = 3000): void => {
  if (stryMutAct_9fa48("3225")) {
    {}
  } else {
    stryCov_9fa48("3225");
    const statusElement = document.getElementById(elementId);
    if (stryMutAct_9fa48("3228") ? false : stryMutAct_9fa48("3227") ? true : stryMutAct_9fa48("3226") ? statusElement : (stryCov_9fa48("3226", "3227", "3228"), !statusElement)) return;
    statusElement.textContent = message;
    statusElement.classList.toggle(stryMutAct_9fa48("3229") ? "" : (stryCov_9fa48("3229"), "success"), stryMutAct_9fa48("3230") ? isError : (stryCov_9fa48("3230"), !isError));
    statusElement.classList.toggle(stryMutAct_9fa48("3231") ? "" : (stryCov_9fa48("3231"), "error"), isError);
    if (stryMutAct_9fa48("3235") ? timeout <= 0 : stryMutAct_9fa48("3234") ? timeout >= 0 : stryMutAct_9fa48("3233") ? false : stryMutAct_9fa48("3232") ? true : (stryCov_9fa48("3232", "3233", "3234", "3235"), timeout > 0)) {
      if (stryMutAct_9fa48("3236")) {
        {}
      } else {
        stryCov_9fa48("3236");
        setTimeout(() => {
          if (stryMutAct_9fa48("3237")) {
            {}
          } else {
            stryCov_9fa48("3237");
            statusElement.textContent = stryMutAct_9fa48("3238") ? "Stryker was here!" : (stryCov_9fa48("3238"), "");
            statusElement.classList.remove(stryMutAct_9fa48("3239") ? "" : (stryCov_9fa48("3239"), "success"), stryMutAct_9fa48("3240") ? "" : (stryCov_9fa48("3240"), "error"));
          }
        }, timeout);
      }
    }
  }
};

/**
 * Updates the server status indicator in the options page.
 * @param status - The server status ('connected', 'disconnected', or 'checking')
 */
export function updateOptionsServerStatus(status: "connected" | "disconnected" | "checking"): void {
  if (stryMutAct_9fa48("3241")) {
    {}
  } else {
    stryCov_9fa48("3241");
    const indicator = document.getElementById(stryMutAct_9fa48("3242") ? "" : (stryCov_9fa48("3242"), "server-status-indicator"));
    const text = document.getElementById(stryMutAct_9fa48("3243") ? "" : (stryCov_9fa48("3243"), "server-status-text"));
    if (stryMutAct_9fa48("3246") ? indicator || text : stryMutAct_9fa48("3245") ? false : stryMutAct_9fa48("3244") ? true : (stryCov_9fa48("3244", "3245", "3246"), indicator && text)) {
      if (stryMutAct_9fa48("3247")) {
        {}
      } else {
        stryCov_9fa48("3247");
        // Remove all status classes
        indicator.classList.remove(stryMutAct_9fa48("3248") ? "" : (stryCov_9fa48("3248"), "connected"), stryMutAct_9fa48("3249") ? "" : (stryCov_9fa48("3249"), "disconnected"));
        text.classList.remove(stryMutAct_9fa48("3250") ? "" : (stryCov_9fa48("3250"), "status-connected"), stryMutAct_9fa48("3251") ? "" : (stryCov_9fa48("3251"), "status-disconnected"));
        switch (status) {
          case stryMutAct_9fa48("3253") ? "" : (stryCov_9fa48("3253"), "connected"):
            if (stryMutAct_9fa48("3252")) {} else {
              stryCov_9fa48("3252");
              indicator.classList.add(stryMutAct_9fa48("3254") ? "" : (stryCov_9fa48("3254"), "connected"));
              text.classList.add(stryMutAct_9fa48("3255") ? "" : (stryCov_9fa48("3255"), "status-connected"));
              chrome.storage.local.get(stryMutAct_9fa48("3256") ? "" : (stryCov_9fa48("3256"), "serverPort"), res => {
                if (stryMutAct_9fa48("3257")) {
                  {}
                } else {
                  stryCov_9fa48("3257");
                  const port = stryMutAct_9fa48("3260") ? res.serverPort && "?" : stryMutAct_9fa48("3259") ? false : stryMutAct_9fa48("3258") ? true : (stryCov_9fa48("3258", "3259", "3260"), res.serverPort || (stryMutAct_9fa48("3261") ? "" : (stryCov_9fa48("3261"), "?")));
                  (text as HTMLElement).textContent = stryMutAct_9fa48("3262") ? `` : (stryCov_9fa48("3262"), `Server: Connected @ ${port}`);
                }
              });
              break;
            }
          case stryMutAct_9fa48("3264") ? "" : (stryCov_9fa48("3264"), "disconnected"):
            if (stryMutAct_9fa48("3263")) {} else {
              stryCov_9fa48("3263");
              indicator.classList.add(stryMutAct_9fa48("3265") ? "" : (stryCov_9fa48("3265"), "disconnected"));
              text.classList.add(stryMutAct_9fa48("3266") ? "" : (stryCov_9fa48("3266"), "status-disconnected"));
              (text as HTMLElement).textContent = stryMutAct_9fa48("3267") ? "" : (stryCov_9fa48("3267"), "Server: Disconnected");
              break;
            }
          case stryMutAct_9fa48("3269") ? "" : (stryCov_9fa48("3269"), "checking"):
            if (stryMutAct_9fa48("3268")) {} else {
              stryCov_9fa48("3268");
              text.textContent = stryMutAct_9fa48("3270") ? "" : (stryCov_9fa48("3270"), "Checking...");
              break;
            }
        }
      }
    }
  }
}

/**
 * Initializes the options page, setting up event listeners and loading current settings.
 * This function runs when the options page is loaded.
 */
export function initOptionsPage(): void {
  if (stryMutAct_9fa48("3271")) {
    {}
  } else {
    stryCov_9fa48("3271");
    // Apply console log level from stored config to reflect user selection
    chrome.storage.local.get(stryMutAct_9fa48("3272") ? "" : (stryCov_9fa48("3272"), "serverConfig"), res => {
      if (stryMutAct_9fa48("3273")) {
        {}
      } else {
        stryCov_9fa48("3273");
        const cfg = stryMutAct_9fa48("3276") ? res.serverConfig && {} : stryMutAct_9fa48("3275") ? false : stryMutAct_9fa48("3274") ? true : (stryCov_9fa48("3274", "3275", "3276"), res.serverConfig || {});
        const level = stryMutAct_9fa48("3279") ? (cfg.console_log_level || cfg.log_level) && "info" : stryMutAct_9fa48("3278") ? false : stryMutAct_9fa48("3277") ? true : (stryCov_9fa48("3277", "3278", "3279"), (stryMutAct_9fa48("3281") ? cfg.console_log_level && cfg.log_level : stryMutAct_9fa48("3280") ? false : (stryCov_9fa48("3280", "3281"), cfg.console_log_level || cfg.log_level)) || (stryMutAct_9fa48("3282") ? "" : (stryCov_9fa48("3282"), "info")));
        try {
          if (stryMutAct_9fa48("3283")) {
            {}
          } else {
            stryCov_9fa48("3283");
            logger.setLevel(String(level).toLowerCase() as any);
          }
        } catch {
          /* ignore */
        }
      }
    });
    // Initialize theme first
    initializeOptionsTheme().catch(error => {
      if (stryMutAct_9fa48("3284")) {
        {}
      } else {
        stryCov_9fa48("3284");
        console.error(stryMutAct_9fa48("3285") ? "" : (stryCov_9fa48("3285"), "Error initializing theme:"), error);
      }
    });
    loadSettings();
    setupEventListeners();
    setupValidation();
    setupInfoMessages();
    setupTabNavigation();
    setupMessageListener();
    setupLogsUI();
    loadErrorHistory();
    logger.debug(stryMutAct_9fa48("3286") ? "" : (stryCov_9fa48("3286"), "Options page initialized"), stryMutAct_9fa48("3287") ? {} : (stryCov_9fa48("3287"), {
      component: stryMutAct_9fa48("3288") ? "" : (stryCov_9fa48("3288"), "options")
    }));
  }
}

/**
 * Loads the current settings from storage and populates the form fields.
 * Retrieves configuration from both local storage and the server when available.
 */
export function loadSettings(): void {
  if (stryMutAct_9fa48("3289")) {
    {}
  } else {
    stryCov_9fa48("3289");
    // First try to load from storage
    chrome.storage.local.get(stryMutAct_9fa48("3290") ? [] : (stryCov_9fa48("3290"), [stryMutAct_9fa48("3291") ? "" : (stryCov_9fa48("3291"), "serverConfig")]), result => {
      if (stryMutAct_9fa48("3292")) {
        {}
      } else {
        stryCov_9fa48("3292");
        const hadLocalConfig = Boolean(result.serverConfig);
        if (stryMutAct_9fa48("3294") ? false : stryMutAct_9fa48("3293") ? true : (stryCov_9fa48("3293", "3294"), hadLocalConfig)) {
          if (stryMutAct_9fa48("3295")) {
            {}
          } else {
            stryCov_9fa48("3295");
            populateFormFields(result.serverConfig);
          }
        }

        // Then try to get latest from server
        chrome.runtime.sendMessage(stryMutAct_9fa48("3296") ? {} : (stryCov_9fa48("3296"), {
          type: stryMutAct_9fa48("3297") ? "" : (stryCov_9fa48("3297"), "getConfig")
        }), response => {
          if (stryMutAct_9fa48("3298")) {
            {}
          } else {
            stryCov_9fa48("3298");
            if (stryMutAct_9fa48("3300") ? false : stryMutAct_9fa48("3299") ? true : (stryCov_9fa48("3299", "3300"), chrome.runtime.lastError)) {
              if (stryMutAct_9fa48("3301")) {
                {}
              } else {
                stryCov_9fa48("3301");
                logger.error(stryMutAct_9fa48("3302") ? "" : (stryCov_9fa48("3302"), "Error getting config:"), stryMutAct_9fa48("3303") ? {} : (stryCov_9fa48("3303"), {
                  component: stryMutAct_9fa48("3304") ? "" : (stryCov_9fa48("3304"), "options")
                }), chrome.runtime.lastError.message as any);
                // Do not proceed if there's an error
                return;
              }
            }
            if (stryMutAct_9fa48("3307") ? response && response.status === "success" || response.data : stryMutAct_9fa48("3306") ? false : stryMutAct_9fa48("3305") ? true : (stryCov_9fa48("3305", "3306", "3307"), (stryMutAct_9fa48("3309") ? response || response.status === "success" : stryMutAct_9fa48("3308") ? true : (stryCov_9fa48("3308", "3309"), response && (stryMutAct_9fa48("3311") ? response.status !== "success" : stryMutAct_9fa48("3310") ? true : (stryCov_9fa48("3310", "3311"), response.status === (stryMutAct_9fa48("3312") ? "" : (stryCov_9fa48("3312"), "success")))))) && response.data)) {
              if (stryMutAct_9fa48("3313")) {
                {}
              } else {
                stryCov_9fa48("3313");
                // If we already had a local config (just saved or previously cached),
                // prefer that and avoid overwriting the user's selections from storage.
                if (stryMutAct_9fa48("3316") ? false : stryMutAct_9fa48("3315") ? true : stryMutAct_9fa48("3314") ? hadLocalConfig : (stryCov_9fa48("3314", "3315", "3316"), !hadLocalConfig)) {
                  if (stryMutAct_9fa48("3317")) {
                    {}
                  } else {
                    stryCov_9fa48("3317");
                    populateFormFields(response.data);
                  }
                } else {
                  if (stryMutAct_9fa48("3318")) {
                    {}
                  } else {
                    stryCov_9fa48("3318");
                    // When local config exists, still populate env-only fields from server (e.g., LOG_FILE)
                    try {
                      if (stryMutAct_9fa48("3319")) {
                        {}
                      } else {
                        stryCov_9fa48("3319");
                        const serverData: any = response.data;
                        const logFileInput = document.getElementById("settings-log-file") as HTMLInputElement | null;
                        if (stryMutAct_9fa48("3322") ? logFileInput && typeof serverData?.log_file === "string" || logFileInput.value.trim() === "" : stryMutAct_9fa48("3321") ? false : stryMutAct_9fa48("3320") ? true : (stryCov_9fa48("3320", "3321", "3322"), (stryMutAct_9fa48("3324") ? logFileInput || typeof serverData?.log_file === "string" : stryMutAct_9fa48("3323") ? true : (stryCov_9fa48("3323", "3324"), logFileInput && (stryMutAct_9fa48("3326") ? typeof serverData?.log_file !== "string" : stryMutAct_9fa48("3325") ? true : (stryCov_9fa48("3325", "3326"), typeof (stryMutAct_9fa48("3327") ? serverData.log_file : (stryCov_9fa48("3327"), serverData?.log_file)) === (stryMutAct_9fa48("3328") ? "" : (stryCov_9fa48("3328"), "string")))))) && (stryMutAct_9fa48("3330") ? logFileInput.value.trim() !== "" : stryMutAct_9fa48("3329") ? true : (stryCov_9fa48("3329", "3330"), (stryMutAct_9fa48("3331") ? logFileInput.value : (stryCov_9fa48("3331"), logFileInput.value.trim())) === (stryMutAct_9fa48("3332") ? "Stryker was here!" : (stryCov_9fa48("3332"), "")))))) {
                          if (stryMutAct_9fa48("3333")) {
                            {}
                          } else {
                            stryCov_9fa48("3333");
                            logFileInput.value = serverData.log_file;
                          }
                        }
                      }
                    } catch {
                      // ignore UI population issues for env-only fields
                    }
                  }
                }
                logger.debug(stryMutAct_9fa48("3334") ? "" : (stryCov_9fa48("3334"), "Loaded settings from server"), stryMutAct_9fa48("3335") ? {} : (stryCov_9fa48("3335"), {
                  component: stryMutAct_9fa48("3336") ? "" : (stryCov_9fa48("3336"), "options")
                }));
              }
            } else {
              if (stryMutAct_9fa48("3337")) {
                {}
              } else {
                stryCov_9fa48("3337");
                logger.warn(stryMutAct_9fa48("3338") ? "" : (stryCov_9fa48("3338"), "Could not load settings from server:"), stryMutAct_9fa48("3339") ? {} : (stryCov_9fa48("3339"), {
                  component: stryMutAct_9fa48("3340") ? "" : (stryCov_9fa48("3340"), "options")
                }), response?.message as any);
                // Even if the fetch failed, the background may have provided cached data
                // Attempt to populate env-only fields like log_file when available
                try {
                  if (stryMutAct_9fa48("3341")) {
                    {}
                  } else {
                    stryCov_9fa48("3341");
                    const serverData: any = stryMutAct_9fa48("3342") ? response.data : (stryCov_9fa48("3342"), response?.data);
                    const logFileInput = document.getElementById("settings-log-file") as HTMLInputElement | null;
                    if (stryMutAct_9fa48("3345") ? logFileInput && typeof serverData?.log_file === "string" || logFileInput.value.trim() === "" : stryMutAct_9fa48("3344") ? false : stryMutAct_9fa48("3343") ? true : (stryCov_9fa48("3343", "3344", "3345"), (stryMutAct_9fa48("3347") ? logFileInput || typeof serverData?.log_file === "string" : stryMutAct_9fa48("3346") ? true : (stryCov_9fa48("3346", "3347"), logFileInput && (stryMutAct_9fa48("3349") ? typeof serverData?.log_file !== "string" : stryMutAct_9fa48("3348") ? true : (stryCov_9fa48("3348", "3349"), typeof (stryMutAct_9fa48("3350") ? serverData.log_file : (stryCov_9fa48("3350"), serverData?.log_file)) === (stryMutAct_9fa48("3351") ? "" : (stryCov_9fa48("3351"), "string")))))) && (stryMutAct_9fa48("3353") ? logFileInput.value.trim() !== "" : stryMutAct_9fa48("3352") ? true : (stryCov_9fa48("3352", "3353"), (stryMutAct_9fa48("3354") ? logFileInput.value : (stryCov_9fa48("3354"), logFileInput.value.trim())) === (stryMutAct_9fa48("3355") ? "Stryker was here!" : (stryCov_9fa48("3355"), "")))))) {
                      if (stryMutAct_9fa48("3356")) {
                        {}
                      } else {
                        stryCov_9fa48("3356");
                        logFileInput.value = serverData.log_file;
                      }
                    }
                  }
                } catch {
                  // ignore UI population issues for env-only fields
                }
              }
            }
          }
        });
      }
    });
  }
}

/**
 * Populates the settings form fields with values from the provided configuration.
 *
 * @param config - The server configuration object
 */
export function populateFormFields(config: ServerConfig): void {
  if (stryMutAct_9fa48("3357")) {
    {}
  } else {
    stryCov_9fa48("3357");
    // Set form field values from config
    const elements = stryMutAct_9fa48("3358") ? {} : (stryCov_9fa48("3358"), {
      port: document.getElementById("settings-server-port") as HTMLInputElement,
      downloadDir: document.getElementById("settings-download-dir") as HTMLInputElement,
      debugMode: document.getElementById("settings-enable-debug") as HTMLInputElement,
      enableHistory: document.getElementById("settings-enable-history") as HTMLInputElement,
      logLevel: document.getElementById("settings-log-level") as HTMLSelectElement,
      ytdlpFormat: document.getElementById("settings-ytdlp-format") as HTMLSelectElement,
      allowPlaylists: document.getElementById("settings-allow-playlists") as HTMLInputElement,
      logFile: document.getElementById("settings-log-file") as HTMLInputElement,
      ytdlpConcurrent: document.getElementById("settings-ytdlp-concurrent-fragments") as HTMLInputElement
    });
    if (stryMutAct_9fa48("3361") ? elements.port && config.server_port !== undefined || config.server_port !== null : stryMutAct_9fa48("3360") ? false : stryMutAct_9fa48("3359") ? true : (stryCov_9fa48("3359", "3360", "3361"), (stryMutAct_9fa48("3363") ? elements.port || config.server_port !== undefined : stryMutAct_9fa48("3362") ? true : (stryCov_9fa48("3362", "3363"), elements.port && (stryMutAct_9fa48("3365") ? config.server_port === undefined : stryMutAct_9fa48("3364") ? true : (stryCov_9fa48("3364", "3365"), config.server_port !== undefined)))) && (stryMutAct_9fa48("3367") ? config.server_port === null : stryMutAct_9fa48("3366") ? true : (stryCov_9fa48("3366", "3367"), config.server_port !== null)))) {
      if (stryMutAct_9fa48("3368")) {
        {}
      } else {
        stryCov_9fa48("3368");
        elements.port.value = config.server_port.toString();
      }
    }
    if (stryMutAct_9fa48("3371") ? elements.downloadDir || config.download_dir : stryMutAct_9fa48("3370") ? false : stryMutAct_9fa48("3369") ? true : (stryCov_9fa48("3369", "3370", "3371"), elements.downloadDir && config.download_dir)) {
      if (stryMutAct_9fa48("3372")) {
        {}
      } else {
        stryCov_9fa48("3372");
        elements.downloadDir.value = config.download_dir;
      }
    }
    if (stryMutAct_9fa48("3374") ? false : stryMutAct_9fa48("3373") ? true : (stryCov_9fa48("3373", "3374"), elements.debugMode)) {
      if (stryMutAct_9fa48("3375")) {
        {}
      } else {
        stryCov_9fa48("3375");
        elements.debugMode.checked = stryMutAct_9fa48("3376") ? config.debug_mode && false : (stryCov_9fa48("3376"), config.debug_mode ?? (stryMutAct_9fa48("3377") ? true : (stryCov_9fa48("3377"), false)));
      }
    }
    if (stryMutAct_9fa48("3379") ? false : stryMutAct_9fa48("3378") ? true : (stryCov_9fa48("3378", "3379"), elements.enableHistory)) {
      if (stryMutAct_9fa48("3380")) {
        {}
      } else {
        stryCov_9fa48("3380");
        elements.enableHistory.checked = stryMutAct_9fa48("3381") ? config.enable_history && true : (stryCov_9fa48("3381"), config.enable_history ?? (stryMutAct_9fa48("3382") ? false : (stryCov_9fa48("3382"), true)));
      }
    }
    if (stryMutAct_9fa48("3385") ? elements.logLevel || config.log_level : stryMutAct_9fa48("3384") ? false : stryMutAct_9fa48("3383") ? true : (stryCov_9fa48("3383", "3384", "3385"), elements.logLevel && config.log_level)) {
      if (stryMutAct_9fa48("3386")) {
        {}
      } else {
        stryCov_9fa48("3386");
        elements.logLevel.value = config.log_level;
      }
    }
    if (stryMutAct_9fa48("3389") ? elements.ytdlpFormat || config.yt_dlp_options?.format : stryMutAct_9fa48("3388") ? false : stryMutAct_9fa48("3387") ? true : (stryCov_9fa48("3387", "3388", "3389"), elements.ytdlpFormat && (stryMutAct_9fa48("3390") ? config.yt_dlp_options.format : (stryCov_9fa48("3390"), config.yt_dlp_options?.format)))) {
      if (stryMutAct_9fa48("3391")) {
        {}
      } else {
        stryCov_9fa48("3391");
        elements.ytdlpFormat.value = config.yt_dlp_options.format;
      }
    }
    if (stryMutAct_9fa48("3393") ? false : stryMutAct_9fa48("3392") ? true : (stryCov_9fa48("3392", "3393"), elements.allowPlaylists)) {
      if (stryMutAct_9fa48("3394")) {
        {}
      } else {
        stryCov_9fa48("3394");
        elements.allowPlaylists.checked = stryMutAct_9fa48("3395") ? config.allow_playlists && false : (stryCov_9fa48("3395"), config.allow_playlists ?? (stryMutAct_9fa48("3396") ? true : (stryCov_9fa48("3396"), false)));
      }
    }
    if (stryMutAct_9fa48("3399") ? elements.logFile || (config as any).log_file : stryMutAct_9fa48("3398") ? false : stryMutAct_9fa48("3397") ? true : (stryCov_9fa48("3397", "3398", "3399"), elements.logFile && (config as any).log_file)) {
      if (stryMutAct_9fa48("3400")) {
        {}
      } else {
        stryCov_9fa48("3400");
        elements.logFile.value = (config as any).log_file as string;
      }
    }
    // Populate yt-dlp concurrent fragments from config or env overlay
    const conc = stryMutAct_9fa48("3401") ? (config as any)?.yt_dlp_options?.concurrent_fragments && (config as any)?.ytdlp_concurrent_fragments : (stryCov_9fa48("3401"), (stryMutAct_9fa48("3403") ? (config as any).yt_dlp_options?.concurrent_fragments : stryMutAct_9fa48("3402") ? (config as any)?.yt_dlp_options.concurrent_fragments : (stryCov_9fa48("3402", "3403"), (config as any)?.yt_dlp_options?.concurrent_fragments)) ?? (stryMutAct_9fa48("3404") ? (config as any).ytdlp_concurrent_fragments : (stryCov_9fa48("3404"), (config as any)?.ytdlp_concurrent_fragments)));
    if (stryMutAct_9fa48("3407") ? elements.ytdlpConcurrent && conc !== undefined || conc !== null : stryMutAct_9fa48("3406") ? false : stryMutAct_9fa48("3405") ? true : (stryCov_9fa48("3405", "3406", "3407"), (stryMutAct_9fa48("3409") ? elements.ytdlpConcurrent || conc !== undefined : stryMutAct_9fa48("3408") ? true : (stryCov_9fa48("3408", "3409"), elements.ytdlpConcurrent && (stryMutAct_9fa48("3411") ? conc === undefined : stryMutAct_9fa48("3410") ? true : (stryCov_9fa48("3410", "3411"), conc !== undefined)))) && (stryMutAct_9fa48("3413") ? conc === null : stryMutAct_9fa48("3412") ? true : (stryCov_9fa48("3412", "3413"), conc !== null)))) {
      if (stryMutAct_9fa48("3414")) {
        {}
      } else {
        stryCov_9fa48("3414");
        elements.ytdlpConcurrent.value = String(conc);
      }
    }

    // Trigger validation after populating
    validateAllFields();

    // Update info messages to reflect current selections
    const logLevelSelect = document.getElementById("settings-log-level") as HTMLSelectElement;
    const formatSelect = document.getElementById("settings-ytdlp-format") as HTMLSelectElement;
    if (stryMutAct_9fa48("3416") ? false : stryMutAct_9fa48("3415") ? true : (stryCov_9fa48("3415", "3416"), logLevelSelect)) {
      if (stryMutAct_9fa48("3417")) {
        {}
      } else {
        stryCov_9fa48("3417");
        updateLogLevelInfo(logLevelSelect);
      }
    }
    if (stryMutAct_9fa48("3419") ? false : stryMutAct_9fa48("3418") ? true : (stryCov_9fa48("3418", "3419"), formatSelect)) {
      if (stryMutAct_9fa48("3420")) {
        {}
      } else {
        stryCov_9fa48("3420");
        updateFormatInfo(formatSelect);
      }
    }
  }
}

/**
 * Sets up event listeners for form submission and button clicks.
 */
export function setupEventListeners(): void {
  if (stryMutAct_9fa48("3421")) {
    {}
  } else {
    stryCov_9fa48("3421");
    const form = document.getElementById("settings-form") as HTMLFormElement;
    if (stryMutAct_9fa48("3423") ? false : stryMutAct_9fa48("3422") ? true : (stryCov_9fa48("3422", "3423"), form)) {
      if (stryMutAct_9fa48("3424")) {
        {}
      } else {
        stryCov_9fa48("3424");
        form.addEventListener(stryMutAct_9fa48("3425") ? "" : (stryCov_9fa48("3425"), "submit"), saveSettings);
      }
    }
    const folderPickerButton = document.getElementById(stryMutAct_9fa48("3426") ? "" : (stryCov_9fa48("3426"), "settings-folder-picker"));
    if (stryMutAct_9fa48("3428") ? false : stryMutAct_9fa48("3427") ? true : (stryCov_9fa48("3427", "3428"), folderPickerButton)) {
      if (stryMutAct_9fa48("3429")) {
        {}
      } else {
        stryCov_9fa48("3429");
        folderPickerButton.addEventListener(stryMutAct_9fa48("3430") ? "" : (stryCov_9fa48("3430"), "click"), selectDownloadDirectory);
      }
    }
    const restartButton = document.getElementById(stryMutAct_9fa48("3431") ? "" : (stryCov_9fa48("3431"), "restart-server"));
    if (stryMutAct_9fa48("3433") ? false : stryMutAct_9fa48("3432") ? true : (stryCov_9fa48("3432", "3433"), restartButton)) {
      if (stryMutAct_9fa48("3434")) {
        {}
      } else {
        stryCov_9fa48("3434");
        restartButton.addEventListener(stryMutAct_9fa48("3435") ? "" : (stryCov_9fa48("3435"), "click"), restartServer);
      }
    }

    // Theme toggle functionality
    const themeToggle = document.getElementById(stryMutAct_9fa48("3436") ? "" : (stryCov_9fa48("3436"), "theme-toggle"));
    if (stryMutAct_9fa48("3438") ? false : stryMutAct_9fa48("3437") ? true : (stryCov_9fa48("3437", "3438"), themeToggle)) {
      if (stryMutAct_9fa48("3439")) {
        {}
      } else {
        stryCov_9fa48("3439");
        themeToggle.addEventListener(stryMutAct_9fa48("3440") ? "" : (stryCov_9fa48("3440"), "click"), handleThemeToggle);
      }
    }
    const clearHistoryButton = document.getElementById(stryMutAct_9fa48("3441") ? "" : (stryCov_9fa48("3441"), "settings-clear-history"));
    if (stryMutAct_9fa48("3443") ? false : stryMutAct_9fa48("3442") ? true : (stryCov_9fa48("3442", "3443"), clearHistoryButton)) {
      if (stryMutAct_9fa48("3444")) {
        {}
      } else {
        stryCov_9fa48("3444");
        clearHistoryButton.addEventListener(stryMutAct_9fa48("3445") ? "" : (stryCov_9fa48("3445"), "click"), () => {
          if (stryMutAct_9fa48("3446")) {
            {}
          } else {
            stryCov_9fa48("3446");
            if (stryMutAct_9fa48("3448") ? false : stryMutAct_9fa48("3447") ? true : (stryCov_9fa48("3447", "3448"), confirm(stryMutAct_9fa48("3449") ? "" : (stryCov_9fa48("3449"), "Are you sure you want to permanently delete all download history?")))) {
              if (stryMutAct_9fa48("3450")) {
                {}
              } else {
                stryCov_9fa48("3450");
                clearHistoryAndNotify().catch(error => {
                  if (stryMutAct_9fa48("3451")) {
                    {}
                  } else {
                    stryCov_9fa48("3451");
                    console.error(stryMutAct_9fa48("3452") ? "" : (stryCov_9fa48("3452"), "Failed to clear history:"), error);
                    setStatus(stryMutAct_9fa48("3453") ? "" : (stryCov_9fa48("3453"), "settings-status"), stryMutAct_9fa48("3454") ? "" : (stryCov_9fa48("3454"), "Failed to clear history"), stryMutAct_9fa48("3455") ? false : (stryCov_9fa48("3455"), true));
                  }
                });
              }
            }
          }
        });
      }
    }
    const resumeDownloadsButton = document.getElementById(stryMutAct_9fa48("3456") ? "" : (stryCov_9fa48("3456"), "settings-resume-downloads"));
    if (stryMutAct_9fa48("3458") ? false : stryMutAct_9fa48("3457") ? true : (stryCov_9fa48("3457", "3458"), resumeDownloadsButton)) {
      if (stryMutAct_9fa48("3459")) {
        {}
      } else {
        stryCov_9fa48("3459");
        resumeDownloadsButton.addEventListener(stryMutAct_9fa48("3460") ? "" : (stryCov_9fa48("3460"), "click"), () => {
          if (stryMutAct_9fa48("3461")) {
            {}
          } else {
            stryCov_9fa48("3461");
            chrome.runtime.sendMessage(stryMutAct_9fa48("3462") ? {} : (stryCov_9fa48("3462"), {
              type: stryMutAct_9fa48("3463") ? "" : (stryCov_9fa48("3463"), "resumeDownloads")
            }), response => {
              if (stryMutAct_9fa48("3464")) {
                {}
              } else {
                stryCov_9fa48("3464");
                if (stryMutAct_9fa48("3467") ? response || response.status === "success" : stryMutAct_9fa48("3466") ? false : stryMutAct_9fa48("3465") ? true : (stryCov_9fa48("3465", "3466", "3467"), response && (stryMutAct_9fa48("3469") ? response.status !== "success" : stryMutAct_9fa48("3468") ? true : (stryCov_9fa48("3468", "3469"), response.status === (stryMutAct_9fa48("3470") ? "" : (stryCov_9fa48("3470"), "success")))))) {
                  if (stryMutAct_9fa48("3471")) {
                    {}
                  } else {
                    stryCov_9fa48("3471");
                    setStatus(stryMutAct_9fa48("3472") ? "" : (stryCov_9fa48("3472"), "settings-status"), stryMutAct_9fa48("3473") ? "" : (stryCov_9fa48("3473"), "Resume operation completed successfully!"));
                  }
                } else {
                  if (stryMutAct_9fa48("3474")) {
                    {}
                  } else {
                    stryCov_9fa48("3474");
                    setStatus(stryMutAct_9fa48("3475") ? "" : (stryCov_9fa48("3475"), "settings-status"), (stryMutAct_9fa48("3476") ? "" : (stryCov_9fa48("3476"), "Error: ")) + (stryMutAct_9fa48("3479") ? response?.message && "Failed to resume downloads" : stryMutAct_9fa48("3478") ? false : stryMutAct_9fa48("3477") ? true : (stryCov_9fa48("3477", "3478", "3479"), (stryMutAct_9fa48("3480") ? response.message : (stryCov_9fa48("3480"), response?.message)) || (stryMutAct_9fa48("3481") ? "" : (stryCov_9fa48("3481"), "Failed to resume downloads")))), stryMutAct_9fa48("3482") ? false : (stryCov_9fa48("3482"), true));
                  }
                }
              }
            });
          }
        });
      }
    }

    // Optional: enable GalleryDL and Priority UI hooks if present in DOM
    const galleryBtn = document.getElementById(stryMutAct_9fa48("3483") ? "" : (stryCov_9fa48("3483"), "settings-gallery-download"));
    if (stryMutAct_9fa48("3485") ? false : stryMutAct_9fa48("3484") ? true : (stryCov_9fa48("3484", "3485"), galleryBtn)) {
      if (stryMutAct_9fa48("3486")) {
        {}
      } else {
        stryCov_9fa48("3486");
        galleryBtn.addEventListener(stryMutAct_9fa48("3487") ? "" : (stryCov_9fa48("3487"), "click"), () => {
          if (stryMutAct_9fa48("3488")) {
            {}
          } else {
            stryCov_9fa48("3488");
            const urlInput = document.getElementById("settings-gallery-url") as HTMLInputElement | null;
            const url = stryMutAct_9fa48("3491") ? urlInput.value?.trim() : stryMutAct_9fa48("3490") ? urlInput?.value.trim() : stryMutAct_9fa48("3489") ? urlInput?.value : (stryCov_9fa48("3489", "3490", "3491"), urlInput?.value?.trim());
            if (stryMutAct_9fa48("3494") ? false : stryMutAct_9fa48("3493") ? true : stryMutAct_9fa48("3492") ? url : (stryCov_9fa48("3492", "3493", "3494"), !url)) {
              if (stryMutAct_9fa48("3495")) {
                {}
              } else {
                stryCov_9fa48("3495");
                setStatus(stryMutAct_9fa48("3496") ? "" : (stryCov_9fa48("3496"), "settings-status"), stryMutAct_9fa48("3497") ? "" : (stryCov_9fa48("3497"), "Please enter a gallery URL"), stryMutAct_9fa48("3498") ? false : (stryCov_9fa48("3498"), true));
                return;
              }
            }
            chrome.runtime.sendMessage(stryMutAct_9fa48("3499") ? {} : (stryCov_9fa48("3499"), {
              type: stryMutAct_9fa48("3500") ? "" : (stryCov_9fa48("3500"), "galleryDownload"),
              url
            }), (response: any) => {
              if (stryMutAct_9fa48("3501")) {
                {}
              } else {
                stryCov_9fa48("3501");
                if (stryMutAct_9fa48("3504") ? response || response.status === "success" : stryMutAct_9fa48("3503") ? false : stryMutAct_9fa48("3502") ? true : (stryCov_9fa48("3502", "3503", "3504"), response && (stryMutAct_9fa48("3506") ? response.status !== "success" : stryMutAct_9fa48("3505") ? true : (stryCov_9fa48("3505", "3506"), response.status === (stryMutAct_9fa48("3507") ? "" : (stryCov_9fa48("3507"), "success")))))) {
                  if (stryMutAct_9fa48("3508")) {
                    {}
                  } else {
                    stryCov_9fa48("3508");
                    setStatus(stryMutAct_9fa48("3509") ? "" : (stryCov_9fa48("3509"), "settings-status"), stryMutAct_9fa48("3510") ? "" : (stryCov_9fa48("3510"), "Gallery download started"));
                  }
                } else {
                  if (stryMutAct_9fa48("3511")) {
                    {}
                  } else {
                    stryCov_9fa48("3511");
                    setStatus(stryMutAct_9fa48("3512") ? "" : (stryCov_9fa48("3512"), "settings-status"), (stryMutAct_9fa48("3513") ? "" : (stryCov_9fa48("3513"), "Error: ")) + (stryMutAct_9fa48("3516") ? response?.message && "Failed to start gallery" : stryMutAct_9fa48("3515") ? false : stryMutAct_9fa48("3514") ? true : (stryCov_9fa48("3514", "3515", "3516"), (stryMutAct_9fa48("3517") ? response.message : (stryCov_9fa48("3517"), response?.message)) || (stryMutAct_9fa48("3518") ? "" : (stryCov_9fa48("3518"), "Failed to start gallery")))), stryMutAct_9fa48("3519") ? false : (stryCov_9fa48("3519"), true));
                  }
                }
              }
            });
          }
        });
      }
    }

    // Clear all stored button positions across hosts
    const clearPositionsButton = document.getElementById(stryMutAct_9fa48("3520") ? "" : (stryCov_9fa48("3520"), "settings-clear-positions"));
    if (stryMutAct_9fa48("3522") ? false : stryMutAct_9fa48("3521") ? true : (stryCov_9fa48("3521", "3522"), clearPositionsButton)) {
      if (stryMutAct_9fa48("3523")) {
        {}
      } else {
        stryCov_9fa48("3523");
        clearPositionsButton.addEventListener(stryMutAct_9fa48("3524") ? "" : (stryCov_9fa48("3524"), "click"), async () => {
          if (stryMutAct_9fa48("3525")) {
            {}
          } else {
            stryCov_9fa48("3525");
            try {
              if (stryMutAct_9fa48("3526")) {
                {}
              } else {
                stryCov_9fa48("3526");
                // Fetch all storage, remove keys that look like hostnames (contain a dot) with x/y/hidden
                const all = await chrome.storage.local.get(null as any);
                const keysToRemove: string[] = stryMutAct_9fa48("3527") ? ["Stryker was here"] : (stryCov_9fa48("3527"), []);
                for (const [key, value] of Object.entries(all)) {
                  if (stryMutAct_9fa48("3528")) {
                    {}
                  } else {
                    stryCov_9fa48("3528");
                    // Heuristic: hostname-like keys or keys with position schema
                    const looksLikeHost = key.includes(stryMutAct_9fa48("3529") ? "" : (stryCov_9fa48("3529"), "."));
                    const v: any = value;
                    const looksLikePosition = stryMutAct_9fa48("3532") ? v && typeof v === "object" && "x" in v && "y" in v || "hidden" in v : stryMutAct_9fa48("3531") ? false : stryMutAct_9fa48("3530") ? true : (stryCov_9fa48("3530", "3531", "3532"), (stryMutAct_9fa48("3534") ? v && typeof v === "object" && "x" in v || "y" in v : stryMutAct_9fa48("3533") ? true : (stryCov_9fa48("3533", "3534"), (stryMutAct_9fa48("3536") ? v && typeof v === "object" || "x" in v : stryMutAct_9fa48("3535") ? true : (stryCov_9fa48("3535", "3536"), (stryMutAct_9fa48("3538") ? v || typeof v === "object" : stryMutAct_9fa48("3537") ? true : (stryCov_9fa48("3537", "3538"), v && (stryMutAct_9fa48("3540") ? typeof v !== "object" : stryMutAct_9fa48("3539") ? true : (stryCov_9fa48("3539", "3540"), typeof v === (stryMutAct_9fa48("3541") ? "" : (stryCov_9fa48("3541"), "object")))))) && (stryMutAct_9fa48("3542") ? "" : (stryCov_9fa48("3542"), "x")) in v)) && (stryMutAct_9fa48("3543") ? "" : (stryCov_9fa48("3543"), "y")) in v)) && (stryMutAct_9fa48("3544") ? "" : (stryCov_9fa48("3544"), "hidden")) in v);
                    if (stryMutAct_9fa48("3547") ? looksLikeHost || looksLikePosition : stryMutAct_9fa48("3546") ? false : stryMutAct_9fa48("3545") ? true : (stryCov_9fa48("3545", "3546", "3547"), looksLikeHost && looksLikePosition)) {
                      if (stryMutAct_9fa48("3548")) {
                        {}
                      } else {
                        stryCov_9fa48("3548");
                        keysToRemove.push(key);
                      }
                    }
                  }
                }
                if (stryMutAct_9fa48("3551") ? keysToRemove.length !== 0 : stryMutAct_9fa48("3550") ? false : stryMutAct_9fa48("3549") ? true : (stryCov_9fa48("3549", "3550", "3551"), keysToRemove.length === 0)) {
                  if (stryMutAct_9fa48("3552")) {
                    {}
                  } else {
                    stryCov_9fa48("3552");
                    setStatus(stryMutAct_9fa48("3553") ? "" : (stryCov_9fa48("3553"), "settings-status"), stryMutAct_9fa48("3554") ? "" : (stryCov_9fa48("3554"), "No stored button positions found to clear"));
                    return;
                  }
                }
                await new Promise<void>(stryMutAct_9fa48("3555") ? () => undefined : (stryCov_9fa48("3555"), resolve => (chrome.storage.local as any).remove(keysToRemove, stryMutAct_9fa48("3556") ? () => undefined : (stryCov_9fa48("3556"), () => resolve()))));
                setStatus(stryMutAct_9fa48("3557") ? "" : (stryCov_9fa48("3557"), "settings-status"), stryMutAct_9fa48("3558") ? `` : (stryCov_9fa48("3558"), `Cleared ${keysToRemove.length} stored button position${(stryMutAct_9fa48("3561") ? keysToRemove.length !== 1 : stryMutAct_9fa48("3560") ? false : stryMutAct_9fa48("3559") ? true : (stryCov_9fa48("3559", "3560", "3561"), keysToRemove.length === 1)) ? stryMutAct_9fa48("3562") ? "Stryker was here!" : (stryCov_9fa48("3562"), "") : stryMutAct_9fa48("3563") ? "" : (stryCov_9fa48("3563"), "s")}`));
              }
            } catch (e) {
              if (stryMutAct_9fa48("3564")) {
                {}
              } else {
                stryCov_9fa48("3564");
                setStatus(stryMutAct_9fa48("3565") ? "" : (stryCov_9fa48("3565"), "settings-status"), stryMutAct_9fa48("3566") ? "" : (stryCov_9fa48("3566"), "Failed to clear button positions"), stryMutAct_9fa48("3567") ? false : (stryCov_9fa48("3567"), true));
              }
            }
          }
        });
      }
    }
  }
}

/**
 * Sets up comprehensive validation for all form fields with helpful messages.
 */
export function setupValidation(): void {
  if (stryMutAct_9fa48("3568")) {
    {}
  } else {
    stryCov_9fa48("3568");
    // Port validation
    const portInput = document.getElementById("settings-server-port") as HTMLInputElement;
    if (stryMutAct_9fa48("3570") ? false : stryMutAct_9fa48("3569") ? true : (stryCov_9fa48("3569", "3570"), portInput)) {
      if (stryMutAct_9fa48("3571")) {
        {}
      } else {
        stryCov_9fa48("3571");
        portInput.addEventListener(stryMutAct_9fa48("3572") ? "" : (stryCov_9fa48("3572"), "input"), stryMutAct_9fa48("3573") ? () => undefined : (stryCov_9fa48("3573"), () => validatePort(portInput)));
        portInput.addEventListener(stryMutAct_9fa48("3574") ? "" : (stryCov_9fa48("3574"), "blur"), stryMutAct_9fa48("3575") ? () => undefined : (stryCov_9fa48("3575"), () => validatePort(portInput)));
      }
    }

    // Download directory validation
    const downloadDirInput = document.getElementById("settings-download-dir") as HTMLInputElement;
    if (stryMutAct_9fa48("3577") ? false : stryMutAct_9fa48("3576") ? true : (stryCov_9fa48("3576", "3577"), downloadDirInput)) {
      if (stryMutAct_9fa48("3578")) {
        {}
      } else {
        stryCov_9fa48("3578");
        downloadDirInput.addEventListener(stryMutAct_9fa48("3579") ? "" : (stryCov_9fa48("3579"), "input"), stryMutAct_9fa48("3580") ? () => undefined : (stryCov_9fa48("3580"), () => validateFolder(downloadDirInput)));
        downloadDirInput.addEventListener(stryMutAct_9fa48("3581") ? "" : (stryCov_9fa48("3581"), "blur"), stryMutAct_9fa48("3582") ? () => undefined : (stryCov_9fa48("3582"), () => validateFolder(downloadDirInput)));
      }
    }

    // Log level validation
    const logLevelSelect = document.getElementById("settings-log-level") as HTMLSelectElement;
    if (stryMutAct_9fa48("3584") ? false : stryMutAct_9fa48("3583") ? true : (stryCov_9fa48("3583", "3584"), logLevelSelect)) {
      if (stryMutAct_9fa48("3585")) {
        {}
      } else {
        stryCov_9fa48("3585");
        logLevelSelect.addEventListener(stryMutAct_9fa48("3586") ? "" : (stryCov_9fa48("3586"), "change"), stryMutAct_9fa48("3587") ? () => undefined : (stryCov_9fa48("3587"), () => validateLogLevel(logLevelSelect)));
      }
    }

    // Format validation
    const formatSelect = document.getElementById("settings-ytdlp-format") as HTMLSelectElement;
    if (stryMutAct_9fa48("3589") ? false : stryMutAct_9fa48("3588") ? true : (stryCov_9fa48("3588", "3589"), formatSelect)) {
      if (stryMutAct_9fa48("3590")) {
        {}
      } else {
        stryCov_9fa48("3590");
        formatSelect.addEventListener(stryMutAct_9fa48("3591") ? "" : (stryCov_9fa48("3591"), "change"), stryMutAct_9fa48("3592") ? () => undefined : (stryCov_9fa48("3592"), () => validateFormat(formatSelect)));
      }
    }

    // Real-time validation for all fields
    const allInputs = document.querySelectorAll(stryMutAct_9fa48("3593") ? "" : (stryCov_9fa48("3593"), "input, select"));
    allInputs.forEach(input => {
      if (stryMutAct_9fa48("3594")) {
        {}
      } else {
        stryCov_9fa48("3594");
        if (stryMutAct_9fa48("3597") ? input instanceof HTMLInputElement && input instanceof HTMLSelectElement : stryMutAct_9fa48("3596") ? false : stryMutAct_9fa48("3595") ? true : (stryCov_9fa48("3595", "3596", "3597"), input instanceof HTMLInputElement || input instanceof HTMLSelectElement)) {
          if (stryMutAct_9fa48("3598")) {
            {}
          } else {
            stryCov_9fa48("3598");
            input.addEventListener(stryMutAct_9fa48("3599") ? "" : (stryCov_9fa48("3599"), "input"), stryMutAct_9fa48("3600") ? () => undefined : (stryCov_9fa48("3600"), () => validateField(input)));
            input.addEventListener(stryMutAct_9fa48("3601") ? "" : (stryCov_9fa48("3601"), "blur"), stryMutAct_9fa48("3602") ? () => undefined : (stryCov_9fa48("3602"), () => validateField(input)));
          }
        }
      }
    });
  }
}

/**
 * Validates a port number input field.
 */
export function validatePort(input: HTMLInputElement): boolean {
  if (stryMutAct_9fa48("3603")) {
    {}
  } else {
    stryCov_9fa48("3603");
    const value = stryMutAct_9fa48("3604") ? input.value : (stryCov_9fa48("3604"), input.value.trim());
    const validationElement = document.getElementById(stryMutAct_9fa48("3605") ? "" : (stryCov_9fa48("3605"), "port-validation"));
    if (stryMutAct_9fa48("3608") ? false : stryMutAct_9fa48("3607") ? true : stryMutAct_9fa48("3606") ? value : (stryCov_9fa48("3606", "3607", "3608"), !value)) {
      if (stryMutAct_9fa48("3609")) {
        {}
      } else {
        stryCov_9fa48("3609");
        showValidationMessage(validationElement, stryMutAct_9fa48("3610") ? "" : (stryCov_9fa48("3610"), "Port number is required"), stryMutAct_9fa48("3611") ? "" : (stryCov_9fa48("3611"), "error"));
        input.classList.add(stryMutAct_9fa48("3612") ? "" : (stryCov_9fa48("3612"), "invalid"));
        input.classList.remove(stryMutAct_9fa48("3613") ? "" : (stryCov_9fa48("3613"), "valid"));
        return stryMutAct_9fa48("3614") ? true : (stryCov_9fa48("3614"), false);
      }
    }
    const port = parseInt(value, 10);
    if (stryMutAct_9fa48("3616") ? false : stryMutAct_9fa48("3615") ? true : (stryCov_9fa48("3615", "3616"), isNaN(port))) {
      if (stryMutAct_9fa48("3617")) {
        {}
      } else {
        stryCov_9fa48("3617");
        showValidationMessage(validationElement, stryMutAct_9fa48("3618") ? "" : (stryCov_9fa48("3618"), "Port must be a valid number"), stryMutAct_9fa48("3619") ? "" : (stryCov_9fa48("3619"), "error"));
        input.classList.add(stryMutAct_9fa48("3620") ? "" : (stryCov_9fa48("3620"), "invalid"));
        input.classList.remove(stryMutAct_9fa48("3621") ? "" : (stryCov_9fa48("3621"), "valid"));
        return stryMutAct_9fa48("3622") ? true : (stryCov_9fa48("3622"), false);
      }
    }
    const [minPort, maxPort] = getPortRange();
    if (stryMutAct_9fa48("3625") ? port < minPort && port > maxPort : stryMutAct_9fa48("3624") ? false : stryMutAct_9fa48("3623") ? true : (stryCov_9fa48("3623", "3624", "3625"), (stryMutAct_9fa48("3628") ? port >= minPort : stryMutAct_9fa48("3627") ? port <= minPort : stryMutAct_9fa48("3626") ? false : (stryCov_9fa48("3626", "3627", "3628"), port < minPort)) || (stryMutAct_9fa48("3631") ? port <= maxPort : stryMutAct_9fa48("3630") ? port >= maxPort : stryMutAct_9fa48("3629") ? false : (stryCov_9fa48("3629", "3630", "3631"), port > maxPort)))) {
      if (stryMutAct_9fa48("3632")) {
        {}
      } else {
        stryCov_9fa48("3632");
        showValidationMessage(validationElement, stryMutAct_9fa48("3633") ? `` : (stryCov_9fa48("3633"), `Port must be between ${minPort} and ${maxPort}`), stryMutAct_9fa48("3634") ? "" : (stryCov_9fa48("3634"), "error"));
        input.classList.add(stryMutAct_9fa48("3635") ? "" : (stryCov_9fa48("3635"), "invalid"));
        input.classList.remove(stryMutAct_9fa48("3636") ? "" : (stryCov_9fa48("3636"), "valid"));
        return stryMutAct_9fa48("3637") ? true : (stryCov_9fa48("3637"), false);
      }
    }

    // Check for common port conflicts
    const commonPorts = stryMutAct_9fa48("3638") ? [] : (stryCov_9fa48("3638"), [80, 443, 3000, 5000, 8000, 8080]); // Removed 9000 to allow 9090
    if (stryMutAct_9fa48("3640") ? false : stryMutAct_9fa48("3639") ? true : (stryCov_9fa48("3639", "3640"), commonPorts.includes(port))) {
      if (stryMutAct_9fa48("3641")) {
        {}
      } else {
        stryCov_9fa48("3641");
        showValidationMessage(validationElement, (stryMutAct_9fa48("3642") ? "" : (stryCov_9fa48("3642"), "Port ")) + port + (stryMutAct_9fa48("3643") ? "" : (stryCov_9fa48("3643"), " is commonly used by other services")), stryMutAct_9fa48("3644") ? "" : (stryCov_9fa48("3644"), "warning"));
        input.classList.add(stryMutAct_9fa48("3645") ? "" : (stryCov_9fa48("3645"), "valid"));
        input.classList.remove(stryMutAct_9fa48("3646") ? "" : (stryCov_9fa48("3646"), "invalid"));
        return stryMutAct_9fa48("3647") ? false : (stryCov_9fa48("3647"), true);
      }
    }

    // Special case for our server port
    if (stryMutAct_9fa48("3650") ? port !== 9090 : stryMutAct_9fa48("3649") ? false : stryMutAct_9fa48("3648") ? true : (stryCov_9fa48("3648", "3649", "3650"), port === 9090)) {
      if (stryMutAct_9fa48("3651")) {
        {}
      } else {
        stryCov_9fa48("3651");
        showValidationMessage(validationElement, stryMutAct_9fa48("3652") ? "" : (stryCov_9fa48("3652"), "Port 9090 is the default server port for this application"), stryMutAct_9fa48("3653") ? "" : (stryCov_9fa48("3653"), "success"));
        input.classList.add(stryMutAct_9fa48("3654") ? "" : (stryCov_9fa48("3654"), "valid"));
        input.classList.remove(stryMutAct_9fa48("3655") ? "" : (stryCov_9fa48("3655"), "invalid"));
        return stryMutAct_9fa48("3656") ? false : (stryCov_9fa48("3656"), true);
      }
    }
    showValidationMessage(validationElement, stryMutAct_9fa48("3657") ? "" : (stryCov_9fa48("3657"), "Port number is valid"), stryMutAct_9fa48("3658") ? "" : (stryCov_9fa48("3658"), "success"));
    input.classList.add(stryMutAct_9fa48("3659") ? "" : (stryCov_9fa48("3659"), "valid"));
    input.classList.remove(stryMutAct_9fa48("3660") ? "" : (stryCov_9fa48("3660"), "invalid"));
    return stryMutAct_9fa48("3661") ? false : (stryCov_9fa48("3661"), true);
  }
}

/**
 * Validates a download folder path input field.
 */
export function validateFolder(input: HTMLInputElement): boolean {
  if (stryMutAct_9fa48("3662")) {
    {}
  } else {
    stryCov_9fa48("3662");
    const value = stryMutAct_9fa48("3663") ? input.value : (stryCov_9fa48("3663"), input.value.trim());
    const validationElement = document.getElementById(stryMutAct_9fa48("3664") ? "" : (stryCov_9fa48("3664"), "folder-validation"));
    if (stryMutAct_9fa48("3667") ? false : stryMutAct_9fa48("3666") ? true : stryMutAct_9fa48("3665") ? value : (stryCov_9fa48("3665", "3666", "3667"), !value)) {
      if (stryMutAct_9fa48("3668")) {
        {}
      } else {
        stryCov_9fa48("3668");
        showValidationMessage(validationElement, stryMutAct_9fa48("3669") ? "" : (stryCov_9fa48("3669"), "Download folder path is required"), stryMutAct_9fa48("3670") ? "" : (stryCov_9fa48("3670"), "error"));
        input.classList.add(stryMutAct_9fa48("3671") ? "" : (stryCov_9fa48("3671"), "invalid"));
        input.classList.remove(stryMutAct_9fa48("3672") ? "" : (stryCov_9fa48("3672"), "valid"));
        return stryMutAct_9fa48("3673") ? true : (stryCov_9fa48("3673"), false);
      }
    }

    // Basic path validation
    if (stryMutAct_9fa48("3676") ? value.includes("..") && value.includes("//") : stryMutAct_9fa48("3675") ? false : stryMutAct_9fa48("3674") ? true : (stryCov_9fa48("3674", "3675", "3676"), value.includes(stryMutAct_9fa48("3677") ? "" : (stryCov_9fa48("3677"), "..")) || value.includes(stryMutAct_9fa48("3678") ? "" : (stryCov_9fa48("3678"), "//")))) {
      if (stryMutAct_9fa48("3679")) {
        {}
      } else {
        stryCov_9fa48("3679");
        showValidationMessage(validationElement, stryMutAct_9fa48("3680") ? "" : (stryCov_9fa48("3680"), "Invalid path format detected"), stryMutAct_9fa48("3681") ? "" : (stryCov_9fa48("3681"), "error"));
        input.classList.add(stryMutAct_9fa48("3682") ? "" : (stryCov_9fa48("3682"), "invalid"));
        input.classList.remove(stryMutAct_9fa48("3683") ? "" : (stryCov_9fa48("3683"), "valid"));
        return stryMutAct_9fa48("3684") ? true : (stryCov_9fa48("3684"), false);
      }
    }

    // Check for absolute path (basic check)
    if (stryMutAct_9fa48("3687") ? !value.startsWith("/") || !value.match(/^[A-Za-z]:/) : stryMutAct_9fa48("3686") ? false : stryMutAct_9fa48("3685") ? true : (stryCov_9fa48("3685", "3686", "3687"), (stryMutAct_9fa48("3688") ? value.startsWith("/") : (stryCov_9fa48("3688"), !(stryMutAct_9fa48("3689") ? value.endsWith("/") : (stryCov_9fa48("3689"), value.startsWith(stryMutAct_9fa48("3690") ? "" : (stryCov_9fa48("3690"), "/")))))) && (stryMutAct_9fa48("3691") ? value.match(/^[A-Za-z]:/) : (stryCov_9fa48("3691"), !value.match(stryMutAct_9fa48("3693") ? /^[^A-Za-z]:/ : stryMutAct_9fa48("3692") ? /[A-Za-z]:/ : (stryCov_9fa48("3692", "3693"), /^[A-Za-z]:/)))))) {
      if (stryMutAct_9fa48("3694")) {
        {}
      } else {
        stryCov_9fa48("3694");
        // This could be a folder name from the folder picker or a relative path
        // Allow it but show a warning that it should be an absolute path
        showValidationMessage(validationElement, stryMutAct_9fa48("3695") ? "" : (stryCov_9fa48("3695"), "Please provide an absolute path for best compatibility"), stryMutAct_9fa48("3696") ? "" : (stryCov_9fa48("3696"), "warning"));
        input.classList.add(stryMutAct_9fa48("3697") ? "" : (stryCov_9fa48("3697"), "valid"));
        input.classList.remove(stryMutAct_9fa48("3698") ? "" : (stryCov_9fa48("3698"), "invalid"));
        return stryMutAct_9fa48("3699") ? false : (stryCov_9fa48("3699"), true);
      }
    }
    showValidationMessage(validationElement, stryMutAct_9fa48("3700") ? "" : (stryCov_9fa48("3700"), "Folder path looks valid"), stryMutAct_9fa48("3701") ? "" : (stryCov_9fa48("3701"), "success"));
    input.classList.add(stryMutAct_9fa48("3702") ? "" : (stryCov_9fa48("3702"), "valid"));
    input.classList.remove(stryMutAct_9fa48("3703") ? "" : (stryCov_9fa48("3703"), "invalid"));
    return stryMutAct_9fa48("3704") ? false : (stryCov_9fa48("3704"), true);
  }
}

/**
 * Validates log level selection.
 */
export function validateLogLevel(select: HTMLSelectElement): boolean {
  if (stryMutAct_9fa48("3705")) {
    {}
  } else {
    stryCov_9fa48("3705");
    const value = select.value;
    const validationElement = document.getElementById(stryMutAct_9fa48("3706") ? "" : (stryCov_9fa48("3706"), "log-level-validation"));
    if (stryMutAct_9fa48("3709") ? false : stryMutAct_9fa48("3708") ? true : stryMutAct_9fa48("3707") ? value : (stryCov_9fa48("3707", "3708", "3709"), !value)) {
      if (stryMutAct_9fa48("3710")) {
        {}
      } else {
        stryCov_9fa48("3710");
        showValidationMessage(validationElement, stryMutAct_9fa48("3711") ? "" : (stryCov_9fa48("3711"), "Please select a log level"), stryMutAct_9fa48("3712") ? "" : (stryCov_9fa48("3712"), "error"));
        select.classList.add(stryMutAct_9fa48("3713") ? "" : (stryCov_9fa48("3713"), "invalid"));
        select.classList.remove(stryMutAct_9fa48("3714") ? "" : (stryCov_9fa48("3714"), "valid"));
        return stryMutAct_9fa48("3715") ? true : (stryCov_9fa48("3715"), false);
      }
    }
    const validLevels = stryMutAct_9fa48("3716") ? [] : (stryCov_9fa48("3716"), [stryMutAct_9fa48("3717") ? "" : (stryCov_9fa48("3717"), "error"), stryMutAct_9fa48("3718") ? "" : (stryCov_9fa48("3718"), "info"), stryMutAct_9fa48("3719") ? "" : (stryCov_9fa48("3719"), "debug"), stryMutAct_9fa48("3720") ? "" : (stryCov_9fa48("3720"), "ERROR"), stryMutAct_9fa48("3721") ? "" : (stryCov_9fa48("3721"), "INFO"), stryMutAct_9fa48("3722") ? "" : (stryCov_9fa48("3722"), "DEBUG")]);
    if (stryMutAct_9fa48("3725") ? false : stryMutAct_9fa48("3724") ? true : stryMutAct_9fa48("3723") ? validLevels.includes(value) : (stryCov_9fa48("3723", "3724", "3725"), !validLevels.includes(value))) {
      if (stryMutAct_9fa48("3726")) {
        {}
      } else {
        stryCov_9fa48("3726");
        showValidationMessage(validationElement, stryMutAct_9fa48("3727") ? "" : (stryCov_9fa48("3727"), "Invalid log level selected"), stryMutAct_9fa48("3728") ? "" : (stryCov_9fa48("3728"), "error"));
        select.classList.add(stryMutAct_9fa48("3729") ? "" : (stryCov_9fa48("3729"), "invalid"));
        select.classList.remove(stryMutAct_9fa48("3730") ? "" : (stryCov_9fa48("3730"), "valid"));
        return stryMutAct_9fa48("3731") ? true : (stryCov_9fa48("3731"), false);
      }
    }
    showValidationMessage(validationElement, stryMutAct_9fa48("3732") ? "" : (stryCov_9fa48("3732"), "Log level is valid"), stryMutAct_9fa48("3733") ? "" : (stryCov_9fa48("3733"), "success"));
    select.classList.add(stryMutAct_9fa48("3734") ? "" : (stryCov_9fa48("3734"), "valid"));
    select.classList.remove(stryMutAct_9fa48("3735") ? "" : (stryCov_9fa48("3735"), "invalid"));
    return stryMutAct_9fa48("3736") ? false : (stryCov_9fa48("3736"), true);
  }
}

/**
 * Validates format selection.
 */
export function validateFormat(select: HTMLSelectElement): boolean {
  if (stryMutAct_9fa48("3737")) {
    {}
  } else {
    stryCov_9fa48("3737");
    const value = select.value;
    const validationElement = document.getElementById(stryMutAct_9fa48("3738") ? "" : (stryCov_9fa48("3738"), "format-validation"));
    if (stryMutAct_9fa48("3741") ? false : stryMutAct_9fa48("3740") ? true : stryMutAct_9fa48("3739") ? value : (stryCov_9fa48("3739", "3740", "3741"), !value)) {
      if (stryMutAct_9fa48("3742")) {
        {}
      } else {
        stryCov_9fa48("3742");
        showValidationMessage(validationElement, stryMutAct_9fa48("3743") ? "" : (stryCov_9fa48("3743"), "Please select a video format"), stryMutAct_9fa48("3744") ? "" : (stryCov_9fa48("3744"), "error"));
        select.classList.add(stryMutAct_9fa48("3745") ? "" : (stryCov_9fa48("3745"), "invalid"));
        select.classList.remove(stryMutAct_9fa48("3746") ? "" : (stryCov_9fa48("3746"), "valid"));
        return stryMutAct_9fa48("3747") ? true : (stryCov_9fa48("3747"), false);
      }
    }
    const validFormats = stryMutAct_9fa48("3748") ? [] : (stryCov_9fa48("3748"), [stryMutAct_9fa48("3749") ? "" : (stryCov_9fa48("3749"), "bestvideo+bestaudio/best"), stryMutAct_9fa48("3750") ? "" : (stryCov_9fa48("3750"), "best"), stryMutAct_9fa48("3751") ? "" : (stryCov_9fa48("3751"), "mp4"), stryMutAct_9fa48("3752") ? "" : (stryCov_9fa48("3752"), "webm"), stryMutAct_9fa48("3753") ? "" : (stryCov_9fa48("3753"), "bestaudio[ext=m4a]"), stryMutAct_9fa48("3754") ? "" : (stryCov_9fa48("3754"), "bestaudio[ext=opus]")]);
    if (stryMutAct_9fa48("3757") ? false : stryMutAct_9fa48("3756") ? true : stryMutAct_9fa48("3755") ? validFormats.includes(value) : (stryCov_9fa48("3755", "3756", "3757"), !validFormats.includes(value))) {
      if (stryMutAct_9fa48("3758")) {
        {}
      } else {
        stryCov_9fa48("3758");
        showValidationMessage(validationElement, stryMutAct_9fa48("3759") ? "" : (stryCov_9fa48("3759"), "Invalid format selected"), stryMutAct_9fa48("3760") ? "" : (stryCov_9fa48("3760"), "error"));
        select.classList.add(stryMutAct_9fa48("3761") ? "" : (stryCov_9fa48("3761"), "invalid"));
        select.classList.remove(stryMutAct_9fa48("3762") ? "" : (stryCov_9fa48("3762"), "valid"));
        return stryMutAct_9fa48("3763") ? true : (stryCov_9fa48("3763"), false);
      }
    }
    showValidationMessage(validationElement, stryMutAct_9fa48("3764") ? "" : (stryCov_9fa48("3764"), "Format is valid"), stryMutAct_9fa48("3765") ? "" : (stryCov_9fa48("3765"), "success"));
    select.classList.add(stryMutAct_9fa48("3766") ? "" : (stryCov_9fa48("3766"), "valid"));
    select.classList.remove(stryMutAct_9fa48("3767") ? "" : (stryCov_9fa48("3767"), "invalid"));
    return stryMutAct_9fa48("3768") ? false : (stryCov_9fa48("3768"), true);
  }
}

/**
 * Generic field validation function.
 */
function validateField(field: HTMLInputElement | HTMLSelectElement): boolean {
  if (stryMutAct_9fa48("3769")) {
    {}
  } else {
    stryCov_9fa48("3769");
    const fieldName = stryMutAct_9fa48("3772") ? field.name && field.id : stryMutAct_9fa48("3771") ? false : stryMutAct_9fa48("3770") ? true : (stryCov_9fa48("3770", "3771", "3772"), field.name || field.id);

    // Skip validation for checkboxes and hidden fields
    if (stryMutAct_9fa48("3775") ? field.type === "checkbox" && field.type === "hidden" : stryMutAct_9fa48("3774") ? false : stryMutAct_9fa48("3773") ? true : (stryCov_9fa48("3773", "3774", "3775"), (stryMutAct_9fa48("3777") ? field.type !== "checkbox" : stryMutAct_9fa48("3776") ? false : (stryCov_9fa48("3776", "3777"), field.type === (stryMutAct_9fa48("3778") ? "" : (stryCov_9fa48("3778"), "checkbox")))) || (stryMutAct_9fa48("3780") ? field.type !== "hidden" : stryMutAct_9fa48("3779") ? false : (stryCov_9fa48("3779", "3780"), field.type === (stryMutAct_9fa48("3781") ? "" : (stryCov_9fa48("3781"), "hidden")))))) {
      if (stryMutAct_9fa48("3782")) {
        {}
      } else {
        stryCov_9fa48("3782");
        return stryMutAct_9fa48("3783") ? false : (stryCov_9fa48("3783"), true);
      }
    }
    const value = stryMutAct_9fa48("3784") ? field.value : (stryCov_9fa48("3784"), field.value.trim());

    // Required field validation
    if (stryMutAct_9fa48("3787") ? field.hasAttribute("required") || !value : stryMutAct_9fa48("3786") ? false : stryMutAct_9fa48("3785") ? true : (stryCov_9fa48("3785", "3786", "3787"), field.hasAttribute(stryMutAct_9fa48("3788") ? "" : (stryCov_9fa48("3788"), "required")) && (stryMutAct_9fa48("3789") ? value : (stryCov_9fa48("3789"), !value)))) {
      if (stryMutAct_9fa48("3790")) {
        {}
      } else {
        stryCov_9fa48("3790");
        showFieldValidation(field, fieldName + (stryMutAct_9fa48("3791") ? "" : (stryCov_9fa48("3791"), " is required")), stryMutAct_9fa48("3792") ? "" : (stryCov_9fa48("3792"), "error"));
        return stryMutAct_9fa48("3793") ? true : (stryCov_9fa48("3793"), false);
      }
    }

    // Field-specific validation
    if (stryMutAct_9fa48("3796") ? fieldName !== "server-port" : stryMutAct_9fa48("3795") ? false : stryMutAct_9fa48("3794") ? true : (stryCov_9fa48("3794", "3795", "3796"), fieldName === (stryMutAct_9fa48("3797") ? "" : (stryCov_9fa48("3797"), "server-port")))) {
      if (stryMutAct_9fa48("3798")) {
        {}
      } else {
        stryCov_9fa48("3798");
        return validatePort(field as HTMLInputElement);
      }
    } else if (stryMutAct_9fa48("3801") ? fieldName !== "download-dir" : stryMutAct_9fa48("3800") ? false : stryMutAct_9fa48("3799") ? true : (stryCov_9fa48("3799", "3800", "3801"), fieldName === (stryMutAct_9fa48("3802") ? "" : (stryCov_9fa48("3802"), "download-dir")))) {
      if (stryMutAct_9fa48("3803")) {
        {}
      } else {
        stryCov_9fa48("3803");
        return validateFolder(field as HTMLInputElement);
      }
    } else if (stryMutAct_9fa48("3806") ? fieldName !== "log-level" : stryMutAct_9fa48("3805") ? false : stryMutAct_9fa48("3804") ? true : (stryCov_9fa48("3804", "3805", "3806"), fieldName === (stryMutAct_9fa48("3807") ? "" : (stryCov_9fa48("3807"), "log-level")))) {
      if (stryMutAct_9fa48("3808")) {
        {}
      } else {
        stryCov_9fa48("3808");
        return validateLogLevel(field as HTMLSelectElement);
      }
    } else if (stryMutAct_9fa48("3811") ? fieldName !== "ytdlp-format" : stryMutAct_9fa48("3810") ? false : stryMutAct_9fa48("3809") ? true : (stryCov_9fa48("3809", "3810", "3811"), fieldName === (stryMutAct_9fa48("3812") ? "" : (stryCov_9fa48("3812"), "ytdlp-format")))) {
      if (stryMutAct_9fa48("3813")) {
        {}
      } else {
        stryCov_9fa48("3813");
        return validateFormat(field as HTMLSelectElement);
      }
    }

    // Default success for other fields
    showFieldValidation(field, stryMutAct_9fa48("3814") ? "" : (stryCov_9fa48("3814"), "Field is valid"), stryMutAct_9fa48("3815") ? "" : (stryCov_9fa48("3815"), "success"));
    return stryMutAct_9fa48("3816") ? false : (stryCov_9fa48("3816"), true);
  }
}

/**
 * Shows validation message for a specific field.
 */
function showFieldValidation(field: HTMLInputElement | HTMLSelectElement, message: string, type: "success" | "error" | "warning"): void {
  if (stryMutAct_9fa48("3817")) {
    {}
  } else {
    stryCov_9fa48("3817");
    const fieldId = field.id;
    const validationElement = document.getElementById(fieldId + (stryMutAct_9fa48("3818") ? "" : (stryCov_9fa48("3818"), "-validation")));
    if (stryMutAct_9fa48("3820") ? false : stryMutAct_9fa48("3819") ? true : (stryCov_9fa48("3819", "3820"), validationElement)) {
      if (stryMutAct_9fa48("3821")) {
        {}
      } else {
        stryCov_9fa48("3821");
        showValidationMessage(validationElement, message, type);
      }
    }
    field.classList.remove(stryMutAct_9fa48("3822") ? "" : (stryCov_9fa48("3822"), "valid"), stryMutAct_9fa48("3823") ? "" : (stryCov_9fa48("3823"), "invalid"));
    if (stryMutAct_9fa48("3826") ? type !== "success" : stryMutAct_9fa48("3825") ? false : stryMutAct_9fa48("3824") ? true : (stryCov_9fa48("3824", "3825", "3826"), type === (stryMutAct_9fa48("3827") ? "" : (stryCov_9fa48("3827"), "success")))) {
      if (stryMutAct_9fa48("3828")) {
        {}
      } else {
        stryCov_9fa48("3828");
        field.classList.add(stryMutAct_9fa48("3829") ? "" : (stryCov_9fa48("3829"), "valid"));
      }
    } else if (stryMutAct_9fa48("3832") ? type !== "error" : stryMutAct_9fa48("3831") ? false : stryMutAct_9fa48("3830") ? true : (stryCov_9fa48("3830", "3831", "3832"), type === (stryMutAct_9fa48("3833") ? "" : (stryCov_9fa48("3833"), "error")))) {
      if (stryMutAct_9fa48("3834")) {
        {}
      } else {
        stryCov_9fa48("3834");
        field.classList.add(stryMutAct_9fa48("3835") ? "" : (stryCov_9fa48("3835"), "invalid"));
      }
    }
  }
}

/**
 * Shows validation message in the specified element.
 */
export function showValidationMessage(element: HTMLElement | null, message: string, type: "success" | "error" | "warning"): void {
  if (stryMutAct_9fa48("3836")) {
    {}
  } else {
    stryCov_9fa48("3836");
    if (stryMutAct_9fa48("3839") ? false : stryMutAct_9fa48("3838") ? true : stryMutAct_9fa48("3837") ? element : (stryCov_9fa48("3837", "3838", "3839"), !element)) return;
    element.textContent = message;
    element.className = (stryMutAct_9fa48("3840") ? "" : (stryCov_9fa48("3840"), "validation-message ")) + type;

    // Auto-hide success messages after 3 seconds
    if (stryMutAct_9fa48("3843") ? type !== "success" : stryMutAct_9fa48("3842") ? false : stryMutAct_9fa48("3841") ? true : (stryCov_9fa48("3841", "3842", "3843"), type === (stryMutAct_9fa48("3844") ? "" : (stryCov_9fa48("3844"), "success")))) {
      if (stryMutAct_9fa48("3845")) {
        {}
      } else {
        stryCov_9fa48("3845");
        setTimeout(() => {
          if (stryMutAct_9fa48("3846")) {
            {}
          } else {
            stryCov_9fa48("3846");
            element.textContent = stryMutAct_9fa48("3847") ? "Stryker was here!" : (stryCov_9fa48("3847"), "");
            element.className = stryMutAct_9fa48("3848") ? "" : (stryCov_9fa48("3848"), "validation-message");
          }
        }, 3000);
      }
    }
  }
}

/**
 * Validates all form fields and returns overall validity.
 */
function validateAllFields(): boolean {
  if (stryMutAct_9fa48("3849")) {
    {}
  } else {
    stryCov_9fa48("3849");
    const requiredFields = document.querySelectorAll(stryMutAct_9fa48("3850") ? "" : (stryCov_9fa48("3850"), "input[required], select[required]"));
    let allValid = stryMutAct_9fa48("3851") ? false : (stryCov_9fa48("3851"), true);
    requiredFields.forEach(field => {
      if (stryMutAct_9fa48("3852")) {
        {}
      } else {
        stryCov_9fa48("3852");
        if (stryMutAct_9fa48("3855") ? field instanceof HTMLInputElement && field instanceof HTMLSelectElement : stryMutAct_9fa48("3854") ? false : stryMutAct_9fa48("3853") ? true : (stryCov_9fa48("3853", "3854", "3855"), field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) {
          if (stryMutAct_9fa48("3856")) {
            {}
          } else {
            stryCov_9fa48("3856");
            if (stryMutAct_9fa48("3859") ? false : stryMutAct_9fa48("3858") ? true : stryMutAct_9fa48("3857") ? validateField(field) : (stryCov_9fa48("3857", "3858", "3859"), !validateField(field))) {
              if (stryMutAct_9fa48("3860")) {
                {}
              } else {
                stryCov_9fa48("3860");
                allValid = stryMutAct_9fa48("3861") ? true : (stryCov_9fa48("3861"), false);
              }
            }
          }
        }
      }
    });

    // Also validate specific fields that have custom validation
    const portInput = document.getElementById("settings-server-port") as HTMLInputElement;
    if (stryMutAct_9fa48("3864") ? portInput || !validatePort(portInput) : stryMutAct_9fa48("3863") ? false : stryMutAct_9fa48("3862") ? true : (stryCov_9fa48("3862", "3863", "3864"), portInput && (stryMutAct_9fa48("3865") ? validatePort(portInput) : (stryCov_9fa48("3865"), !validatePort(portInput))))) {
      if (stryMutAct_9fa48("3866")) {
        {}
      } else {
        stryCov_9fa48("3866");
        allValid = stryMutAct_9fa48("3867") ? true : (stryCov_9fa48("3867"), false);
      }
    }
    const downloadDirInput = document.getElementById("settings-download-dir") as HTMLInputElement;
    if (stryMutAct_9fa48("3870") ? downloadDirInput || !validateFolder(downloadDirInput) : stryMutAct_9fa48("3869") ? false : stryMutAct_9fa48("3868") ? true : (stryCov_9fa48("3868", "3869", "3870"), downloadDirInput && (stryMutAct_9fa48("3871") ? validateFolder(downloadDirInput) : (stryCov_9fa48("3871"), !validateFolder(downloadDirInput))))) {
      if (stryMutAct_9fa48("3872")) {
        {}
      } else {
        stryCov_9fa48("3872");
        allValid = stryMutAct_9fa48("3873") ? true : (stryCov_9fa48("3873"), false);
      }
    }
    const logLevelSelect = document.getElementById("settings-log-level") as HTMLSelectElement;
    if (stryMutAct_9fa48("3876") ? logLevelSelect || !validateLogLevel(logLevelSelect) : stryMutAct_9fa48("3875") ? false : stryMutAct_9fa48("3874") ? true : (stryCov_9fa48("3874", "3875", "3876"), logLevelSelect && (stryMutAct_9fa48("3877") ? validateLogLevel(logLevelSelect) : (stryCov_9fa48("3877"), !validateLogLevel(logLevelSelect))))) {
      if (stryMutAct_9fa48("3878")) {
        {}
      } else {
        stryCov_9fa48("3878");
        allValid = stryMutAct_9fa48("3879") ? true : (stryCov_9fa48("3879"), false);
      }
    }
    const formatSelect = document.getElementById("settings-ytdlp-format") as HTMLSelectElement;
    if (stryMutAct_9fa48("3882") ? formatSelect || !validateFormat(formatSelect) : stryMutAct_9fa48("3881") ? false : stryMutAct_9fa48("3880") ? true : (stryCov_9fa48("3880", "3881", "3882"), formatSelect && (stryMutAct_9fa48("3883") ? validateFormat(formatSelect) : (stryCov_9fa48("3883"), !validateFormat(formatSelect))))) {
      if (stryMutAct_9fa48("3884")) {
        {}
      } else {
        stryCov_9fa48("3884");
        allValid = stryMutAct_9fa48("3885") ? true : (stryCov_9fa48("3885"), false);
      }
    }
    return allValid;
  }
}

/**
 * Sets up dynamic info messages for form fields.
 */
export function setupInfoMessages(): void {
  if (stryMutAct_9fa48("3886")) {
    {}
  } else {
    stryCov_9fa48("3886");
    const formatSelect = document.getElementById("settings-ytdlp-format") as HTMLSelectElement;
    const logLevelSelect = document.getElementById("settings-log-level") as HTMLSelectElement;
    if (stryMutAct_9fa48("3888") ? false : stryMutAct_9fa48("3887") ? true : (stryCov_9fa48("3887", "3888"), formatSelect)) {
      if (stryMutAct_9fa48("3889")) {
        {}
      } else {
        stryCov_9fa48("3889");
        formatSelect.addEventListener(stryMutAct_9fa48("3890") ? "" : (stryCov_9fa48("3890"), "change"), stryMutAct_9fa48("3891") ? () => undefined : (stryCov_9fa48("3891"), () => updateFormatInfo(formatSelect)));
        updateFormatInfo(formatSelect); // Initial update
      }
    }
    if (stryMutAct_9fa48("3893") ? false : stryMutAct_9fa48("3892") ? true : (stryCov_9fa48("3892", "3893"), logLevelSelect)) {
      if (stryMutAct_9fa48("3894")) {
        {}
      } else {
        stryCov_9fa48("3894");
        logLevelSelect.addEventListener(stryMutAct_9fa48("3895") ? "" : (stryCov_9fa48("3895"), "change"), stryMutAct_9fa48("3896") ? () => undefined : (stryCov_9fa48("3896"), () => updateLogLevelInfo(logLevelSelect)));
        updateLogLevelInfo(logLevelSelect); // Initial update
      }
    }
  }
}

/**
 * Updates the format info message based on selected format.
 */
function updateFormatInfo(select: HTMLSelectElement): void {
  if (stryMutAct_9fa48("3897")) {
    {}
  } else {
    stryCov_9fa48("3897");
    const infoElement = document.getElementById(stryMutAct_9fa48("3898") ? "" : (stryCov_9fa48("3898"), "format-info"));
    if (stryMutAct_9fa48("3901") ? false : stryMutAct_9fa48("3900") ? true : stryMutAct_9fa48("3899") ? infoElement : (stryCov_9fa48("3899", "3900", "3901"), !infoElement)) return;
    const infoText = infoElement.querySelector(".info-text") as HTMLElement;
    if (stryMutAct_9fa48("3904") ? false : stryMutAct_9fa48("3903") ? true : stryMutAct_9fa48("3902") ? infoText : (stryCov_9fa48("3902", "3903", "3904"), !infoText)) return;
    const formatInfo: Record<string, string> = stryMutAct_9fa48("3905") ? {} : (stryCov_9fa48("3905"), {
      "bestvideo+bestaudio/best": stryMutAct_9fa48("3906") ? "" : (stryCov_9fa48("3906"), "Best quality with separate video and audio streams"),
      best: stryMutAct_9fa48("3907") ? "" : (stryCov_9fa48("3907"), "Best available single file (may be lower quality)"),
      mp4: stryMutAct_9fa48("3908") ? "" : (stryCov_9fa48("3908"), "MP4 format with best available quality"),
      webm: stryMutAct_9fa48("3909") ? "" : (stryCov_9fa48("3909"), "WebM format with best available quality"),
      "bestaudio[ext=m4a]": stryMutAct_9fa48("3910") ? "" : (stryCov_9fa48("3910"), "Audio only in M4A format"),
      "bestaudio[ext=opus]": stryMutAct_9fa48("3911") ? "" : (stryCov_9fa48("3911"), "Audio only in Opus format")
    });
    infoText.textContent = stryMutAct_9fa48("3914") ? formatInfo[select.value] && "Select a format option" : stryMutAct_9fa48("3913") ? false : stryMutAct_9fa48("3912") ? true : (stryCov_9fa48("3912", "3913", "3914"), formatInfo[select.value] || (stryMutAct_9fa48("3915") ? "" : (stryCov_9fa48("3915"), "Select a format option")));
  }
}

/**
 * Updates the log level info message based on selected level.
 */
function updateLogLevelInfo(select: HTMLSelectElement): void {
  if (stryMutAct_9fa48("3916")) {
    {}
  } else {
    stryCov_9fa48("3916");
    const infoElement = document.getElementById(stryMutAct_9fa48("3917") ? "" : (stryCov_9fa48("3917"), "log-level-info"));
    if (stryMutAct_9fa48("3920") ? false : stryMutAct_9fa48("3919") ? true : stryMutAct_9fa48("3918") ? infoElement : (stryCov_9fa48("3918", "3919", "3920"), !infoElement)) return;
    const infoText = infoElement.querySelector(".info-text") as HTMLElement;
    if (stryMutAct_9fa48("3923") ? false : stryMutAct_9fa48("3922") ? true : stryMutAct_9fa48("3921") ? infoText : (stryCov_9fa48("3921", "3922", "3923"), !infoText)) return;
    const levelInfo: Record<string, string> = stryMutAct_9fa48("3924") ? {} : (stryCov_9fa48("3924"), {
      error: stryMutAct_9fa48("3925") ? "" : (stryCov_9fa48("3925"), "Only error messages will be logged"),
      info: stryMutAct_9fa48("3926") ? "" : (stryCov_9fa48("3926"), "Normal level provides essential information"),
      debug: stryMutAct_9fa48("3927") ? "" : (stryCov_9fa48("3927"), "Verbose logging for troubleshooting")
    });
    infoText.textContent = stryMutAct_9fa48("3930") ? levelInfo[select.value] && "Select a log level" : stryMutAct_9fa48("3929") ? false : stryMutAct_9fa48("3928") ? true : (stryCov_9fa48("3928", "3929", "3930"), levelInfo[select.value] || (stryMutAct_9fa48("3931") ? "" : (stryCov_9fa48("3931"), "Select a log level")));
  }
}

/**
 * Sets up tab navigation for the options page.
 * Handles switching between different tabs in the options UI.
 */
export function setupTabNavigation(): void {
  if (stryMutAct_9fa48("3932")) {
    {}
  } else {
    stryCov_9fa48("3932");
    const tabs = document.querySelectorAll(stryMutAct_9fa48("3933") ? "" : (stryCov_9fa48("3933"), ".tab-button"));
    const tabContents = document.querySelectorAll(stryMutAct_9fa48("3934") ? "" : (stryCov_9fa48("3934"), ".tab-content"));
    tabs.forEach(tab => {
      if (stryMutAct_9fa48("3935")) {
        {}
      } else {
        stryCov_9fa48("3935");
        tab.addEventListener(stryMutAct_9fa48("3936") ? "" : (stryCov_9fa48("3936"), "click"), () => {
          if (stryMutAct_9fa48("3937")) {
            {}
          } else {
            stryCov_9fa48("3937");
            // Remove active class from all tabs
            tabs.forEach(stryMutAct_9fa48("3938") ? () => undefined : (stryCov_9fa48("3938"), t => t.classList.remove(stryMutAct_9fa48("3939") ? "" : (stryCov_9fa48("3939"), "active"))));
            tabContents.forEach(stryMutAct_9fa48("3940") ? () => undefined : (stryCov_9fa48("3940"), content => content.classList.remove(stryMutAct_9fa48("3941") ? "" : (stryCov_9fa48("3941"), "active"))));

            // Add active class to current tab
            tab.classList.add(stryMutAct_9fa48("3942") ? "" : (stryCov_9fa48("3942"), "active"));

            // Show corresponding content
            const target = tab.getAttribute(stryMutAct_9fa48("3943") ? "" : (stryCov_9fa48("3943"), "data-tab"));
            if (stryMutAct_9fa48("3945") ? false : stryMutAct_9fa48("3944") ? true : (stryCov_9fa48("3944", "3945"), target)) {
              if (stryMutAct_9fa48("3946")) {
                {}
              } else {
                stryCov_9fa48("3946");
                const content = document.getElementById(target);
                if (stryMutAct_9fa48("3948") ? false : stryMutAct_9fa48("3947") ? true : (stryCov_9fa48("3947", "3948"), content)) content.classList.add(stryMutAct_9fa48("3949") ? "" : (stryCov_9fa48("3949"), "active"));
              }
            }
          }
        });
      }
    });
  }
}

/**
 * Sets up message listener to handle server discovery notifications.
 */
export function setupMessageListener(): void {
  if (stryMutAct_9fa48("3950")) {
    {}
  } else {
    stryCov_9fa48("3950");
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (stryMutAct_9fa48("3951")) {
        {}
      } else {
        stryCov_9fa48("3951");
        if (stryMutAct_9fa48("3954") ? message.type !== "serverDiscovered" : stryMutAct_9fa48("3953") ? false : stryMutAct_9fa48("3952") ? true : (stryCov_9fa48("3952", "3953", "3954"), message.type === (stryMutAct_9fa48("3955") ? "" : (stryCov_9fa48("3955"), "serverDiscovered")))) {
          if (stryMutAct_9fa48("3956")) {
            {}
          } else {
            stryCov_9fa48("3956");
            logger.debug(stryMutAct_9fa48("3957") ? "" : (stryCov_9fa48("3957"), "Server discovered notification received, refreshing settings"));
            // Refresh settings when server is discovered
            loadSettings();
          }
        } else if (stryMutAct_9fa48("3960") ? message.type !== "serverStatusUpdate" : stryMutAct_9fa48("3959") ? false : stryMutAct_9fa48("3958") ? true : (stryCov_9fa48("3958", "3959", "3960"), message.type === (stryMutAct_9fa48("3961") ? "" : (stryCov_9fa48("3961"), "serverStatusUpdate")))) {
          if (stryMutAct_9fa48("3962")) {
            {}
          } else {
            stryCov_9fa48("3962");
            updateOptionsServerStatus(message.status);
          }
        }
      }
    });
  }
}

/**
 * Wire up the logs viewer controls and initial load.
 */
export function setupLogsUI(): void {
  if (stryMutAct_9fa48("3963")) {
    {}
  } else {
    stryCov_9fa48("3963");
    const refreshBtn = document.getElementById(stryMutAct_9fa48("3964") ? "" : (stryCov_9fa48("3964"), "log-refresh"));
    const clearBtn = document.getElementById(stryMutAct_9fa48("3965") ? "" : (stryCov_9fa48("3965"), "log-clear"));
    const limitSelect = document.getElementById("log-limit") as HTMLSelectElement | null;
    const recentFirstCheckbox = document.getElementById("log-recent-first") as HTMLInputElement | null;
    const filterWerkzeugCheckbox = document.getElementById("log-filter-werkzeug") as HTMLInputElement | null;
    const displayDiv = document.getElementById(stryMutAct_9fa48("3966") ? "" : (stryCov_9fa48("3966"), "log-display"));
    const textarea = document.getElementById("logViewerTextarea") as HTMLTextAreaElement | null;
    const autoCheckbox = document.getElementById("log-toggle-auto") as HTMLInputElement | null;
    if (stryMutAct_9fa48("3969") ? !displayDiv || !textarea : stryMutAct_9fa48("3968") ? false : stryMutAct_9fa48("3967") ? true : (stryCov_9fa48("3967", "3968", "3969"), (stryMutAct_9fa48("3970") ? displayDiv : (stryCov_9fa48("3970"), !displayDiv)) && (stryMutAct_9fa48("3971") ? textarea : (stryCov_9fa48("3971"), !textarea)))) {
      if (stryMutAct_9fa48("3972")) {
        {}
      } else {
        stryCov_9fa48("3972");
        return;
      }
    }
    let autoTimer: number | null = null;

    // Load persisted log viewer preferences
    (async () => {
      if (stryMutAct_9fa48("3973")) {
        {}
      } else {
        stryCov_9fa48("3973");
        try {
          if (stryMutAct_9fa48("3974")) {
            {}
          } else {
            stryCov_9fa48("3974");
            const res = await chrome.storage.local.get(stryMutAct_9fa48("3975") ? "" : (stryCov_9fa48("3975"), "logViewerPrefs"));
            const prefs = stryMutAct_9fa48("3978") ? (res as any).logViewerPrefs && {} : stryMutAct_9fa48("3977") ? false : stryMutAct_9fa48("3976") ? true : (stryCov_9fa48("3976", "3977", "3978"), (res as any).logViewerPrefs || {});
            if (stryMutAct_9fa48("3981") ? recentFirstCheckbox || typeof prefs.recentFirst === "boolean" : stryMutAct_9fa48("3980") ? false : stryMutAct_9fa48("3979") ? true : (stryCov_9fa48("3979", "3980", "3981"), recentFirstCheckbox && (stryMutAct_9fa48("3983") ? typeof prefs.recentFirst !== "boolean" : stryMutAct_9fa48("3982") ? true : (stryCov_9fa48("3982", "3983"), typeof prefs.recentFirst === (stryMutAct_9fa48("3984") ? "" : (stryCov_9fa48("3984"), "boolean")))))) {
              if (stryMutAct_9fa48("3985")) {
                {}
              } else {
                stryCov_9fa48("3985");
                recentFirstCheckbox.checked = prefs.recentFirst;
              }
            }
            if (stryMutAct_9fa48("3988") ? limitSelect || typeof prefs.limit === "number" : stryMutAct_9fa48("3987") ? false : stryMutAct_9fa48("3986") ? true : (stryCov_9fa48("3986", "3987", "3988"), limitSelect && (stryMutAct_9fa48("3990") ? typeof prefs.limit !== "number" : stryMutAct_9fa48("3989") ? true : (stryCov_9fa48("3989", "3990"), typeof prefs.limit === (stryMutAct_9fa48("3991") ? "" : (stryCov_9fa48("3991"), "number")))))) {
              if (stryMutAct_9fa48("3992")) {
                {}
              } else {
                stryCov_9fa48("3992");
                const v = String(prefs.limit);
                if (stryMutAct_9fa48("3995") ? Array.from(limitSelect.options).every(o => o.value === v) : stryMutAct_9fa48("3994") ? false : stryMutAct_9fa48("3993") ? true : (stryCov_9fa48("3993", "3994", "3995"), Array.from(limitSelect.options).some(stryMutAct_9fa48("3996") ? () => undefined : (stryCov_9fa48("3996"), o => stryMutAct_9fa48("3999") ? o.value !== v : stryMutAct_9fa48("3998") ? false : stryMutAct_9fa48("3997") ? true : (stryCov_9fa48("3997", "3998", "3999"), o.value === v))))) {
                  if (stryMutAct_9fa48("4000")) {
                    {}
                  } else {
                    stryCov_9fa48("4000");
                    limitSelect.value = v;
                  }
                }
              }
            }
            if (stryMutAct_9fa48("4003") ? autoCheckbox || typeof prefs.auto === "boolean" : stryMutAct_9fa48("4002") ? false : stryMutAct_9fa48("4001") ? true : (stryCov_9fa48("4001", "4002", "4003"), autoCheckbox && (stryMutAct_9fa48("4005") ? typeof prefs.auto !== "boolean" : stryMutAct_9fa48("4004") ? true : (stryCov_9fa48("4004", "4005"), typeof prefs.auto === (stryMutAct_9fa48("4006") ? "" : (stryCov_9fa48("4006"), "boolean")))))) {
              if (stryMutAct_9fa48("4007")) {
                {}
              } else {
                stryCov_9fa48("4007");
                autoCheckbox.checked = prefs.auto;
              }
            }
            if (stryMutAct_9fa48("4010") ? filterWerkzeugCheckbox || typeof prefs.filterWerkzeug === "boolean" : stryMutAct_9fa48("4009") ? false : stryMutAct_9fa48("4008") ? true : (stryCov_9fa48("4008", "4009", "4010"), filterWerkzeugCheckbox && (stryMutAct_9fa48("4012") ? typeof prefs.filterWerkzeug !== "boolean" : stryMutAct_9fa48("4011") ? true : (stryCov_9fa48("4011", "4012"), typeof prefs.filterWerkzeug === (stryMutAct_9fa48("4013") ? "" : (stryCov_9fa48("4013"), "boolean")))))) {
              if (stryMutAct_9fa48("4014")) {
                {}
              } else {
                stryCov_9fa48("4014");
                filterWerkzeugCheckbox.checked = prefs.filterWerkzeug;
              }
            }
          }
        } catch {
          // ignore
        }
      }
    })();
    const persistPrefs = (): void => {
      if (stryMutAct_9fa48("4015")) {
        {}
      } else {
        stryCov_9fa48("4015");
        const prefs = stryMutAct_9fa48("4016") ? {} : (stryCov_9fa48("4016"), {
          recentFirst: stryMutAct_9fa48("4017") ? !recentFirstCheckbox?.checked : (stryCov_9fa48("4017"), !(stryMutAct_9fa48("4018") ? recentFirstCheckbox?.checked : (stryCov_9fa48("4018"), !(stryMutAct_9fa48("4019") ? recentFirstCheckbox.checked : (stryCov_9fa48("4019"), recentFirstCheckbox?.checked))))),
          limit: limitSelect ? parseInt(limitSelect.value, 10) : 500,
          auto: stryMutAct_9fa48("4020") ? !autoCheckbox?.checked : (stryCov_9fa48("4020"), !(stryMutAct_9fa48("4021") ? autoCheckbox?.checked : (stryCov_9fa48("4021"), !(stryMutAct_9fa48("4022") ? autoCheckbox.checked : (stryCov_9fa48("4022"), autoCheckbox?.checked))))),
          filterWerkzeug: stryMutAct_9fa48("4023") ? !filterWerkzeugCheckbox?.checked : (stryCov_9fa48("4023"), !(stryMutAct_9fa48("4024") ? filterWerkzeugCheckbox?.checked : (stryCov_9fa48("4024"), !(stryMutAct_9fa48("4025") ? filterWerkzeugCheckbox.checked : (stryCov_9fa48("4025"), filterWerkzeugCheckbox?.checked)))))
        });
        try {
          if (stryMutAct_9fa48("4026")) {
            {}
          } else {
            stryCov_9fa48("4026");
            chrome.storage.local.set(stryMutAct_9fa48("4027") ? {} : (stryCov_9fa48("4027"), {
              logViewerPrefs: prefs
            }));
          }
        } catch {
          // ignore
        }
      }
    };
    const applyFilters = (text: string): string => {
      if (stryMutAct_9fa48("4028")) {
        {}
      } else {
        stryCov_9fa48("4028");
        let t = text;
        // Suppress server log clear/rotation banner lines
        t = stryMutAct_9fa48("4029") ? t.split("\n").join("\n") : (stryCov_9fa48("4029"), t.split(stryMutAct_9fa48("4030") ? "" : (stryCov_9fa48("4030"), "\n")).filter(stryMutAct_9fa48("4031") ? () => undefined : (stryCov_9fa48("4031"), line => stryMutAct_9fa48("4032") ? /^\s*Log file cleared and archived to /i.test(line) : (stryCov_9fa48("4032"), !(stryMutAct_9fa48("4035") ? /^\S*Log file cleared and archived to /i : stryMutAct_9fa48("4034") ? /^\sLog file cleared and archived to /i : stryMutAct_9fa48("4033") ? /\s*Log file cleared and archived to /i : (stryCov_9fa48("4033", "4034", "4035"), /^\s*Log file cleared and archived to /i)).test(line)))).join(stryMutAct_9fa48("4036") ? "" : (stryCov_9fa48("4036"), "\n")));
        if (stryMutAct_9fa48("4039") ? filterWerkzeugCheckbox.checked : stryMutAct_9fa48("4038") ? false : stryMutAct_9fa48("4037") ? true : (stryCov_9fa48("4037", "4038", "4039"), filterWerkzeugCheckbox?.checked)) {
          if (stryMutAct_9fa48("4040")) {
            {}
          } else {
            stryCov_9fa48("4040");
            t = stryMutAct_9fa48("4041") ? t.split("\n").join("\n") : (stryCov_9fa48("4041"), t.split(stryMutAct_9fa48("4042") ? "" : (stryCov_9fa48("4042"), "\n")).filter(stryMutAct_9fa48("4043") ? () => undefined : (stryCov_9fa48("4043"), line => stryMutAct_9fa48("4044") ? /werkzeug/i.test(line) : (stryCov_9fa48("4044"), !/werkzeug/i.test(line)))).join(stryMutAct_9fa48("4045") ? "" : (stryCov_9fa48("4045"), "\n")));
          }
        }
        return t;
      }
    };
    const renderLogs = (text: string): void => {
      if (stryMutAct_9fa48("4046")) {
        {}
      } else {
        stryCov_9fa48("4046");
        const filtered = applyFilters(text);
        if (stryMutAct_9fa48("4048") ? false : stryMutAct_9fa48("4047") ? true : (stryCov_9fa48("4047", "4048"), textarea)) {
          if (stryMutAct_9fa48("4049")) {
            {}
          } else {
            stryCov_9fa48("4049");
            textarea.value = filtered;
          }
        }
        if (stryMutAct_9fa48("4051") ? false : stryMutAct_9fa48("4050") ? true : (stryCov_9fa48("4050", "4051"), displayDiv)) {
          if (stryMutAct_9fa48("4052")) {
            {}
          } else {
            stryCov_9fa48("4052");
            displayDiv.textContent = stryMutAct_9fa48("4053") ? "Stryker was here!" : (stryCov_9fa48("4053"), "");
            const pre = document.createElement(stryMutAct_9fa48("4054") ? "" : (stryCov_9fa48("4054"), "pre"));
            pre.textContent = stryMutAct_9fa48("4057") ? filtered && "(no logs)" : stryMutAct_9fa48("4056") ? false : stryMutAct_9fa48("4055") ? true : (stryCov_9fa48("4055", "4056", "4057"), filtered || (stryMutAct_9fa48("4058") ? "" : (stryCov_9fa48("4058"), "(no logs)")));
            displayDiv.appendChild(pre);
          }
        }
      }
    };
    const fetchAndRender = (): void => {
      if (stryMutAct_9fa48("4059")) {
        {}
      } else {
        stryCov_9fa48("4059");
        const lines = limitSelect ? parseInt(limitSelect.value, 10) : 500;
        const recent = recentFirstCheckbox ? stryMutAct_9fa48("4060") ? !recentFirstCheckbox.checked : (stryCov_9fa48("4060"), !(stryMutAct_9fa48("4061") ? recentFirstCheckbox.checked : (stryCov_9fa48("4061"), !recentFirstCheckbox.checked))) : stryMutAct_9fa48("4062") ? false : (stryCov_9fa48("4062"), true);
        chrome.runtime.sendMessage(stryMutAct_9fa48("4063") ? {} : (stryCov_9fa48("4063"), {
          type: stryMutAct_9fa48("4064") ? "" : (stryCov_9fa48("4064"), "getLogs"),
          lines,
          recent
        }), (response: any) => {
          if (stryMutAct_9fa48("4065")) {
            {}
          } else {
            stryCov_9fa48("4065");
            if (stryMutAct_9fa48("4067") ? false : stryMutAct_9fa48("4066") ? true : (stryCov_9fa48("4066", "4067"), chrome.runtime.lastError)) {
              if (stryMutAct_9fa48("4068")) {
                {}
              } else {
                stryCov_9fa48("4068");
                renderLogs((stryMutAct_9fa48("4069") ? "" : (stryCov_9fa48("4069"), "Error: ")) + chrome.runtime.lastError.message);
                return;
              }
            }
            if (stryMutAct_9fa48("4072") ? response || response.status === "success" : stryMutAct_9fa48("4071") ? false : stryMutAct_9fa48("4070") ? true : (stryCov_9fa48("4070", "4071", "4072"), response && (stryMutAct_9fa48("4074") ? response.status !== "success" : stryMutAct_9fa48("4073") ? true : (stryCov_9fa48("4073", "4074"), response.status === (stryMutAct_9fa48("4075") ? "" : (stryCov_9fa48("4075"), "success")))))) {
              if (stryMutAct_9fa48("4076")) {
                {}
              } else {
                stryCov_9fa48("4076");
                renderLogs(stryMutAct_9fa48("4079") ? response.data && "" : stryMutAct_9fa48("4078") ? false : stryMutAct_9fa48("4077") ? true : (stryCov_9fa48("4077", "4078", "4079"), response.data || (stryMutAct_9fa48("4080") ? "Stryker was here!" : (stryCov_9fa48("4080"), ""))));
              }
            } else {
              if (stryMutAct_9fa48("4081")) {
                {}
              } else {
                stryCov_9fa48("4081");
                renderLogs((stryMutAct_9fa48("4082") ? "" : (stryCov_9fa48("4082"), "Error: ")) + (stryMutAct_9fa48("4085") ? response?.message && "Failed to fetch logs" : stryMutAct_9fa48("4084") ? false : stryMutAct_9fa48("4083") ? true : (stryCov_9fa48("4083", "4084", "4085"), (stryMutAct_9fa48("4086") ? response.message : (stryCov_9fa48("4086"), response?.message)) || (stryMutAct_9fa48("4087") ? "" : (stryCov_9fa48("4087"), "Failed to fetch logs")))));
              }
            }
          }
        });
      }
    };
    stryMutAct_9fa48("4088") ? refreshBtn.addEventListener("click", () => {
      persistPrefs();
      fetchAndRender();
    }) : (stryCov_9fa48("4088"), refreshBtn?.addEventListener(stryMutAct_9fa48("4089") ? "" : (stryCov_9fa48("4089"), "click"), () => {
      if (stryMutAct_9fa48("4090")) {
        {}
      } else {
        stryCov_9fa48("4090");
        persistPrefs();
        fetchAndRender();
      }
    }));
    stryMutAct_9fa48("4091") ? limitSelect.addEventListener("change", () => {
      persistPrefs();
      fetchAndRender();
    }) : (stryCov_9fa48("4091"), limitSelect?.addEventListener(stryMutAct_9fa48("4092") ? "" : (stryCov_9fa48("4092"), "change"), () => {
      if (stryMutAct_9fa48("4093")) {
        {}
      } else {
        stryCov_9fa48("4093");
        persistPrefs();
        fetchAndRender();
      }
    }));
    stryMutAct_9fa48("4094") ? recentFirstCheckbox.addEventListener("change", () => {
      persistPrefs();
      fetchAndRender();
    }) : (stryCov_9fa48("4094"), recentFirstCheckbox?.addEventListener(stryMutAct_9fa48("4095") ? "" : (stryCov_9fa48("4095"), "change"), () => {
      if (stryMutAct_9fa48("4096")) {
        {}
      } else {
        stryCov_9fa48("4096");
        persistPrefs();
        fetchAndRender();
      }
    }));
    stryMutAct_9fa48("4097") ? filterWerkzeugCheckbox.addEventListener("change", () => {
      persistPrefs();
      fetchAndRender();
    }) : (stryCov_9fa48("4097"), filterWerkzeugCheckbox?.addEventListener(stryMutAct_9fa48("4098") ? "" : (stryCov_9fa48("4098"), "change"), () => {
      if (stryMutAct_9fa48("4099")) {
        {}
      } else {
        stryCov_9fa48("4099");
        persistPrefs();
        fetchAndRender();
      }
    }));
    stryMutAct_9fa48("4100") ? clearBtn.addEventListener("click", () => {
      chrome.runtime.sendMessage({
        type: "clearLogs"
      }, (response: any) => {
        if (chrome.runtime.lastError) {
          renderLogs("Error: " + chrome.runtime.lastError.message);
          return;
        }
        if (response && response.status === "success") {
          fetchAndRender();
        } else {
          renderLogs("Error: " + (response?.message || "Failed to clear logs"));
        }
      });
    }) : (stryCov_9fa48("4100"), clearBtn?.addEventListener(stryMutAct_9fa48("4101") ? "" : (stryCov_9fa48("4101"), "click"), () => {
      if (stryMutAct_9fa48("4102")) {
        {}
      } else {
        stryCov_9fa48("4102");
        chrome.runtime.sendMessage(stryMutAct_9fa48("4103") ? {} : (stryCov_9fa48("4103"), {
          type: stryMutAct_9fa48("4104") ? "" : (stryCov_9fa48("4104"), "clearLogs")
        }), (response: any) => {
          if (stryMutAct_9fa48("4105")) {
            {}
          } else {
            stryCov_9fa48("4105");
            if (stryMutAct_9fa48("4107") ? false : stryMutAct_9fa48("4106") ? true : (stryCov_9fa48("4106", "4107"), chrome.runtime.lastError)) {
              if (stryMutAct_9fa48("4108")) {
                {}
              } else {
                stryCov_9fa48("4108");
                renderLogs((stryMutAct_9fa48("4109") ? "" : (stryCov_9fa48("4109"), "Error: ")) + chrome.runtime.lastError.message);
                return;
              }
            }
            if (stryMutAct_9fa48("4112") ? response || response.status === "success" : stryMutAct_9fa48("4111") ? false : stryMutAct_9fa48("4110") ? true : (stryCov_9fa48("4110", "4111", "4112"), response && (stryMutAct_9fa48("4114") ? response.status !== "success" : stryMutAct_9fa48("4113") ? true : (stryCov_9fa48("4113", "4114"), response.status === (stryMutAct_9fa48("4115") ? "" : (stryCov_9fa48("4115"), "success")))))) {
              if (stryMutAct_9fa48("4116")) {
                {}
              } else {
                stryCov_9fa48("4116");
                fetchAndRender();
              }
            } else {
              if (stryMutAct_9fa48("4117")) {
                {}
              } else {
                stryCov_9fa48("4117");
                renderLogs((stryMutAct_9fa48("4118") ? "" : (stryCov_9fa48("4118"), "Error: ")) + (stryMutAct_9fa48("4121") ? response?.message && "Failed to clear logs" : stryMutAct_9fa48("4120") ? false : stryMutAct_9fa48("4119") ? true : (stryCov_9fa48("4119", "4120", "4121"), (stryMutAct_9fa48("4122") ? response.message : (stryCov_9fa48("4122"), response?.message)) || (stryMutAct_9fa48("4123") ? "" : (stryCov_9fa48("4123"), "Failed to clear logs")))));
              }
            }
          }
        });
      }
    }));
    stryMutAct_9fa48("4124") ? autoCheckbox.addEventListener("change", () => {
      if (autoTimer) {
        window.clearInterval(autoTimer);
        autoTimer = null;
      }
      if (autoCheckbox.checked) {
        autoTimer = window.setInterval(fetchAndRender, 3000);
      }
      persistPrefs();
    }) : (stryCov_9fa48("4124"), autoCheckbox?.addEventListener(stryMutAct_9fa48("4125") ? "" : (stryCov_9fa48("4125"), "change"), () => {
      if (stryMutAct_9fa48("4126")) {
        {}
      } else {
        stryCov_9fa48("4126");
        if (stryMutAct_9fa48("4128") ? false : stryMutAct_9fa48("4127") ? true : (stryCov_9fa48("4127", "4128"), autoTimer)) {
          if (stryMutAct_9fa48("4129")) {
            {}
          } else {
            stryCov_9fa48("4129");
            window.clearInterval(autoTimer);
            autoTimer = null;
          }
        }
        if (stryMutAct_9fa48("4131") ? false : stryMutAct_9fa48("4130") ? true : (stryCov_9fa48("4130", "4131"), autoCheckbox.checked)) {
          if (stryMutAct_9fa48("4132")) {
            {}
          } else {
            stryCov_9fa48("4132");
            autoTimer = window.setInterval(fetchAndRender, 3000);
          }
        }
        persistPrefs();
      }
    }));

    // Initial load
    fetchAndRender();
  }
}

/**
 * Saves the current form settings to storage and server with enhanced visual feedback.
 */
export async function saveSettings(event: Event): Promise<void> {
  if (stryMutAct_9fa48("4133")) {
    {}
  } else {
    stryCov_9fa48("4133");
    event.preventDefault();

    // Validate all fields before saving
    if (stryMutAct_9fa48("4136") ? false : stryMutAct_9fa48("4135") ? true : stryMutAct_9fa48("4134") ? validateAllFields() : (stryCov_9fa48("4134", "4135", "4136"), !validateAllFields())) {
      if (stryMutAct_9fa48("4137")) {
        {}
      } else {
        stryCov_9fa48("4137");
        setStatus(stryMutAct_9fa48("4138") ? "" : (stryCov_9fa48("4138"), "settings-status"), stryMutAct_9fa48("4139") ? "" : (stryCov_9fa48("4139"), "Please fix validation errors before saving"), stryMutAct_9fa48("4140") ? false : (stryCov_9fa48("4140"), true));
        return;
      }
    }
    const saveButton = document.getElementById("save-settings") as HTMLButtonElement;
    const originalText = saveButton.innerHTML;

    // Show saving state
    saveButton.disabled = stryMutAct_9fa48("4141") ? false : (stryCov_9fa48("4141"), true);
    saveButton.innerHTML = stryMutAct_9fa48("4142") ? "" : (stryCov_9fa48("4142"), '<span class="btn-icon"></span>Saving...');
    setStatus(stryMutAct_9fa48("4143") ? "" : (stryCov_9fa48("4143"), "settings-status"), stryMutAct_9fa48("4144") ? "" : (stryCov_9fa48("4144"), "Saving settings..."), stryMutAct_9fa48("4145") ? true : (stryCov_9fa48("4145"), false));
    try {
      if (stryMutAct_9fa48("4146")) {
        {}
      } else {
        stryCov_9fa48("4146");
        // Collect form data
        const formData = new FormData(event.target as HTMLFormElement);
        const config: ServerConfig & Record<string, any> = stryMutAct_9fa48("4147") ? {} : (stryCov_9fa48("4147"), {
          server_port: parseInt(formData.get("server-port") as string, 10),
          download_dir: formData.get("download-dir") as string,
          debug_mode: stryMutAct_9fa48("4150") ? formData.get("enable-debug") !== "on" : stryMutAct_9fa48("4149") ? false : stryMutAct_9fa48("4148") ? true : (stryCov_9fa48("4148", "4149", "4150"), formData.get(stryMutAct_9fa48("4151") ? "" : (stryCov_9fa48("4151"), "enable-debug")) === (stryMutAct_9fa48("4152") ? "" : (stryCov_9fa48("4152"), "on"))),
          enable_history: stryMutAct_9fa48("4155") ? formData.get("enable-history") !== "on" : stryMutAct_9fa48("4154") ? false : stryMutAct_9fa48("4153") ? true : (stryCov_9fa48("4153", "4154", "4155"), formData.get(stryMutAct_9fa48("4156") ? "" : (stryCov_9fa48("4156"), "enable-history")) === (stryMutAct_9fa48("4157") ? "" : (stryCov_9fa48("4157"), "on"))),
          log_level: formData.get("log-level") as string,
          // Persist console log level in storage if present in UI in the future; for now, mirror log_level
          console_log_level: (formData.get("log-level") as string || "info") as any,
          yt_dlp_options: stryMutAct_9fa48("4158") ? {} : (stryCov_9fa48("4158"), {
            format: formData.get("ytdlp-format") as string,
            concurrent_fragments: (() => {
              if (stryMutAct_9fa48("4159")) {
                {}
              } else {
                stryCov_9fa48("4159");
                const raw = formData.get("ytdlp-concurrent-fragments") as string | null;
                const n = raw ? parseInt(raw, 10) : undefined;
                return Number.isFinite(n as any) ? n : undefined;
              }
            })()
          }),
          allow_playlists: stryMutAct_9fa48("4162") ? formData.get("allow-playlists") !== "on" : stryMutAct_9fa48("4161") ? false : stryMutAct_9fa48("4160") ? true : (stryCov_9fa48("4160", "4161", "4162"), formData.get(stryMutAct_9fa48("4163") ? "" : (stryCov_9fa48("4163"), "allow-playlists")) === (stryMutAct_9fa48("4164") ? "" : (stryCov_9fa48("4164"), "on")))
        });

        // Include env-backed runtime settings
        const logFile = formData.get("log-file") as string | null;
        if (stryMutAct_9fa48("4166") ? false : stryMutAct_9fa48("4165") ? true : (stryCov_9fa48("4165", "4166"), logFile)) (config as any).log_file = logFile;
        // Gunicorn UI removed; workers forced to 1 in backend

        // Save to local storage first
        await new Promise<void>((resolve, reject) => {
          if (stryMutAct_9fa48("4167")) {
            {}
          } else {
            stryCov_9fa48("4167");
            chrome.storage.local.set(stryMutAct_9fa48("4168") ? {} : (stryCov_9fa48("4168"), {
              serverConfig: config
            }), () => {
              if (stryMutAct_9fa48("4169")) {
                {}
              } else {
                stryCov_9fa48("4169");
                if (stryMutAct_9fa48("4171") ? false : stryMutAct_9fa48("4170") ? true : (stryCov_9fa48("4170", "4171"), chrome.runtime.lastError)) {
                  if (stryMutAct_9fa48("4172")) {
                    {}
                  } else {
                    stryCov_9fa48("4172");
                    reject(new Error(chrome.runtime.lastError.message));
                  }
                } else {
                  if (stryMutAct_9fa48("4173")) {
                    {}
                  } else {
                    stryCov_9fa48("4173");
                    resolve();
                  }
                }
              }
            });
          }
        });

        // Send to server
        const response = await new Promise<any>((resolve, reject) => {
          if (stryMutAct_9fa48("4174")) {
            {}
          } else {
            stryCov_9fa48("4174");
            chrome.runtime.sendMessage(stryMutAct_9fa48("4175") ? {} : (stryCov_9fa48("4175"), {
              type: stryMutAct_9fa48("4176") ? "" : (stryCov_9fa48("4176"), "setConfig"),
              config
            }), response => {
              if (stryMutAct_9fa48("4177")) {
                {}
              } else {
                stryCov_9fa48("4177");
                if (stryMutAct_9fa48("4179") ? false : stryMutAct_9fa48("4178") ? true : (stryCov_9fa48("4178", "4179"), chrome.runtime.lastError)) {
                  if (stryMutAct_9fa48("4180")) {
                    {}
                  } else {
                    stryCov_9fa48("4180");
                    reject(new Error(chrome.runtime.lastError.message));
                  }
                } else {
                  if (stryMutAct_9fa48("4181")) {
                    {}
                  } else {
                    stryCov_9fa48("4181");
                    resolve(response);
                  }
                }
              }
            });
          }
        });
        if (stryMutAct_9fa48("4184") ? response || response.status === "success" : stryMutAct_9fa48("4183") ? false : stryMutAct_9fa48("4182") ? true : (stryCov_9fa48("4182", "4183", "4184"), response && (stryMutAct_9fa48("4186") ? response.status !== "success" : stryMutAct_9fa48("4185") ? true : (stryCov_9fa48("4185", "4186"), response.status === (stryMutAct_9fa48("4187") ? "" : (stryCov_9fa48("4187"), "success")))))) {
          if (stryMutAct_9fa48("4188")) {
            {}
          } else {
            stryCov_9fa48("4188");
            // Show success state with enhanced visual feedback
            showSaveSuccess();
            setStatus(stryMutAct_9fa48("4189") ? "" : (stryCov_9fa48("4189"), "settings-status"), stryMutAct_9fa48("4190") ? "" : (stryCov_9fa48("4190"), "Settings saved successfully!"), stryMutAct_9fa48("4191") ? true : (stryCov_9fa48("4191"), false));

            // If changes include restart-required keys, inform the user
            try {
              if (stryMutAct_9fa48("4192")) {
                {}
              } else {
                stryCov_9fa48("4192");
                const changedKeys: string[] = Array.isArray(response.changed_keys) ? response.changed_keys as string[] : stryMutAct_9fa48("4193") ? ["Stryker was here"] : (stryCov_9fa48("4193"), []);
                const restartKeys = new Set(stryMutAct_9fa48("4194") ? [] : (stryCov_9fa48("4194"), [stryMutAct_9fa48("4195") ? "" : (stryCov_9fa48("4195"), "server_port"), stryMutAct_9fa48("4196") ? "" : (stryCov_9fa48("4196"), "server_host"), stryMutAct_9fa48("4197") ? "" : (stryCov_9fa48("4197"), "max_concurrent_downloads"), stryMutAct_9fa48("4198") ? "" : (stryCov_9fa48("4198"), "log_level"), stryMutAct_9fa48("4199") ? "" : (stryCov_9fa48("4199"), "console_log_level"), stryMutAct_9fa48("4200") ? "" : (stryCov_9fa48("4200"), "log_path")]));
                const requiresRestart = stryMutAct_9fa48("4201") ? changedKeys.every(k => restartKeys.has(k)) : (stryCov_9fa48("4201"), changedKeys.some(stryMutAct_9fa48("4202") ? () => undefined : (stryCov_9fa48("4202"), k => restartKeys.has(k))));
                if (stryMutAct_9fa48("4204") ? false : stryMutAct_9fa48("4203") ? true : (stryCov_9fa48("4203", "4204"), requiresRestart)) {
                  if (stryMutAct_9fa48("4205")) {
                    {}
                  } else {
                    stryCov_9fa48("4205");
                    setStatus(stryMutAct_9fa48("4206") ? "" : (stryCov_9fa48("4206"), "settings-status"), stryMutAct_9fa48("4207") ? "" : (stryCov_9fa48("4207"), "Some changes require a server restart. Click 'Restart Server' below to apply."), stryMutAct_9fa48("4208") ? true : (stryCov_9fa48("4208"), false), 6000);
                  }
                }
              }
            } catch {
              // ignore notification errors
            }

            // Log the successful save
            logger.info(stryMutAct_9fa48("4209") ? "" : (stryCov_9fa48("4209"), "Settings saved successfully"), stryMutAct_9fa48("4210") ? {} : (stryCov_9fa48("4210"), {
              component: stryMutAct_9fa48("4211") ? "" : (stryCov_9fa48("4211"), "options"),
              operation: stryMutAct_9fa48("4212") ? "" : (stryCov_9fa48("4212"), "configSave")
            }), stryMutAct_9fa48("4213") ? {} : (stryCov_9fa48("4213"), {
              config
            }));

            // Persist a normalized copy of config to storage so Options always reloads exact values
            try {
              if (stryMutAct_9fa48("4214")) {
                {}
              } else {
                stryCov_9fa48("4214");
                await new Promise<void>((resolve, reject) => {
                  if (stryMutAct_9fa48("4215")) {
                    {}
                  } else {
                    stryCov_9fa48("4215");
                    chrome.storage.local.set(stryMutAct_9fa48("4216") ? {} : (stryCov_9fa48("4216"), {
                      serverConfig: config
                    }), () => {
                      if (stryMutAct_9fa48("4217")) {
                        {}
                      } else {
                        stryCov_9fa48("4217");
                        if (stryMutAct_9fa48("4219") ? false : stryMutAct_9fa48("4218") ? true : (stryCov_9fa48("4218", "4219"), chrome.runtime.lastError)) reject(new Error(chrome.runtime.lastError.message));else resolve();
                      }
                    });
                  }
                });
              }
            } catch {
              // swallow
            }
          }
        } else {
          if (stryMutAct_9fa48("4220")) {
            {}
          } else {
            stryCov_9fa48("4220");
            throw new Error(stryMutAct_9fa48("4223") ? response?.message && "Failed to save settings to server" : stryMutAct_9fa48("4222") ? false : stryMutAct_9fa48("4221") ? true : (stryCov_9fa48("4221", "4222", "4223"), (stryMutAct_9fa48("4224") ? response.message : (stryCov_9fa48("4224"), response?.message)) || (stryMutAct_9fa48("4225") ? "" : (stryCov_9fa48("4225"), "Failed to save settings to server"))));
          }
        }
      }
    } catch (error) {
      if (stryMutAct_9fa48("4226")) {
        {}
      } else {
        stryCov_9fa48("4226");
        logger.error(stryMutAct_9fa48("4227") ? "" : (stryCov_9fa48("4227"), "Failed to save settings:"), stryMutAct_9fa48("4228") ? {} : (stryCov_9fa48("4228"), {
          component: stryMutAct_9fa48("4229") ? "" : (stryCov_9fa48("4229"), "options"),
          operation: stryMutAct_9fa48("4230") ? "" : (stryCov_9fa48("4230"), "configSave")
        }), error as any);
        setStatus(stryMutAct_9fa48("4231") ? "" : (stryCov_9fa48("4231"), "settings-status"), (stryMutAct_9fa48("4232") ? "" : (stryCov_9fa48("4232"), "Error saving settings: ")) + (error instanceof Error ? error.message : stryMutAct_9fa48("4233") ? "" : (stryCov_9fa48("4233"), "Unknown error")), stryMutAct_9fa48("4234") ? false : (stryCov_9fa48("4234"), true));

        // Show error state
        showSaveError();
      }
    } finally {
      if (stryMutAct_9fa48("4235")) {
        {}
      } else {
        stryCov_9fa48("4235");
        // Restore button state
        saveButton.disabled = stryMutAct_9fa48("4236") ? true : (stryCov_9fa48("4236"), false);
        saveButton.innerHTML = originalText;
      }
    }
  }
}

/**
 * Shows enhanced success feedback when settings are saved.
 */
function showSaveSuccess(): void {
  if (stryMutAct_9fa48("4237")) {
    {}
  } else {
    stryCov_9fa48("4237");
    const container = document.querySelector(".settings-container") as HTMLElement;
    if (stryMutAct_9fa48("4240") ? false : stryMutAct_9fa48("4239") ? true : stryMutAct_9fa48("4238") ? container : (stryCov_9fa48("4238", "4239", "4240"), !container)) return;

    // Add success animation class
    container.classList.add(stryMutAct_9fa48("4241") ? "" : (stryCov_9fa48("4241"), "settings-saved"));

    // Create success notification
    const notification = document.createElement(stryMutAct_9fa48("4242") ? "" : (stryCov_9fa48("4242"), "div"));
    notification.className = stryMutAct_9fa48("4243") ? "" : (stryCov_9fa48("4243"), "save-notification success");
    notification.innerHTML = (stryMutAct_9fa48("4244") ? "" : (stryCov_9fa48("4244"), '<div class="notification-content">')) + (stryMutAct_9fa48("4245") ? "" : (stryCov_9fa48("4245"), '<span class="notification-icon">Success</span>')) + (stryMutAct_9fa48("4246") ? "" : (stryCov_9fa48("4246"), '<div class="notification-text">')) + (stryMutAct_9fa48("4247") ? "" : (stryCov_9fa48("4247"), "<h4>Settings Saved!</h4>")) + (stryMutAct_9fa48("4248") ? "" : (stryCov_9fa48("4248"), "<p>Your configuration has been updated successfully.</p>")) + (stryMutAct_9fa48("4249") ? "" : (stryCov_9fa48("4249"), "</div>")) + (stryMutAct_9fa48("4250") ? "" : (stryCov_9fa48("4250"), "</div>"));

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      if (stryMutAct_9fa48("4251")) {
        {}
      } else {
        stryCov_9fa48("4251");
        notification.classList.add(stryMutAct_9fa48("4252") ? "" : (stryCov_9fa48("4252"), "show"));
      }
    }, 100);

    // Remove after 4 seconds
    setTimeout(() => {
      if (stryMutAct_9fa48("4253")) {
        {}
      } else {
        stryCov_9fa48("4253");
        notification.classList.remove(stryMutAct_9fa48("4254") ? "" : (stryCov_9fa48("4254"), "show"));
        setTimeout(() => {
          if (stryMutAct_9fa48("4255")) {
            {}
          } else {
            stryCov_9fa48("4255");
            if (stryMutAct_9fa48("4257") ? false : stryMutAct_9fa48("4256") ? true : (stryCov_9fa48("4256", "4257"), notification.parentNode)) {
              if (stryMutAct_9fa48("4258")) {
                {}
              } else {
                stryCov_9fa48("4258");
                notification.parentNode.removeChild(notification);
              }
            }
          }
        }, 300);
      }
    }, 4000);

    // Remove animation class after animation completes
    setTimeout(() => {
      if (stryMutAct_9fa48("4259")) {
        {}
      } else {
        stryCov_9fa48("4259");
        container.classList.remove(stryMutAct_9fa48("4260") ? "" : (stryCov_9fa48("4260"), "settings-saved"));
      }
    }, 1000);
  }
}

/**
 * Shows error feedback when settings save fails.
 */
function showSaveError(): void {
  if (stryMutAct_9fa48("4261")) {
    {}
  } else {
    stryCov_9fa48("4261");
    const notification = document.createElement(stryMutAct_9fa48("4262") ? "" : (stryCov_9fa48("4262"), "div"));
    notification.className = stryMutAct_9fa48("4263") ? "" : (stryCov_9fa48("4263"), "save-notification error");
    notification.innerHTML = (stryMutAct_9fa48("4264") ? "" : (stryCov_9fa48("4264"), '<div class="notification-content">')) + (stryMutAct_9fa48("4265") ? "" : (stryCov_9fa48("4265"), '<span class="notification-icon">Error</span>')) + (stryMutAct_9fa48("4266") ? "" : (stryCov_9fa48("4266"), '<div class="notification-text">')) + (stryMutAct_9fa48("4267") ? "" : (stryCov_9fa48("4267"), "<h4>Save Failed</h4>")) + (stryMutAct_9fa48("4268") ? "" : (stryCov_9fa48("4268"), "<p>There was an error saving your settings. Please try again.</p>")) + (stryMutAct_9fa48("4269") ? "" : (stryCov_9fa48("4269"), "</div>")) + (stryMutAct_9fa48("4270") ? "" : (stryCov_9fa48("4270"), '<button class="notification-close" onclick="this.parentElement.parentElement.remove()"></button>')) + (stryMutAct_9fa48("4271") ? "" : (stryCov_9fa48("4271"), "</div>"));

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
      if (stryMutAct_9fa48("4272")) {
        {}
      } else {
        stryCov_9fa48("4272");
        notification.classList.add(stryMutAct_9fa48("4273") ? "" : (stryCov_9fa48("4273"), "show"));
      }
    }, 100);

    // Auto-remove after 6 seconds (longer for errors)
    setTimeout(() => {
      if (stryMutAct_9fa48("4274")) {
        {}
      } else {
        stryCov_9fa48("4274");
        notification.classList.remove(stryMutAct_9fa48("4275") ? "" : (stryCov_9fa48("4275"), "show"));
        setTimeout(() => {
          if (stryMutAct_9fa48("4276")) {
            {}
          } else {
            stryCov_9fa48("4276");
            if (stryMutAct_9fa48("4278") ? false : stryMutAct_9fa48("4277") ? true : (stryCov_9fa48("4277", "4278"), notification.parentNode)) {
              if (stryMutAct_9fa48("4279")) {
                {}
              } else {
                stryCov_9fa48("4279");
                notification.parentNode.removeChild(notification);
              }
            }
          }
        }, 300);
      }
    }, 6000);
  }
}

/**
 * Opens a folder picker dialog to select the download directory.
 * Provides a fallback for browsers that do not support `showDirectoryPicker`.
 */
export async function selectDownloadDirectory(): Promise<void> {
  if (stryMutAct_9fa48("4280")) {
    {}
  } else {
    stryCov_9fa48("4280");
    const downloadDirInput = document.getElementById("settings-download-dir") as HTMLInputElement;

    //  showDirectoryPicker is not available on all browsers
    if (stryMutAct_9fa48("4283") ? false : stryMutAct_9fa48("4282") ? true : stryMutAct_9fa48("4281") ? window.showDirectoryPicker : (stryCov_9fa48("4281", "4282", "4283"), !window.showDirectoryPicker)) {
      if (stryMutAct_9fa48("4284")) {
        {}
      } else {
        stryCov_9fa48("4284");
        setStatus(stryMutAct_9fa48("4285") ? "" : (stryCov_9fa48("4285"), "settings-status"), stryMutAct_9fa48("4286") ? "" : (stryCov_9fa48("4286"), "Your browser does not support directory selection. Please manually enter the path."), stryMutAct_9fa48("4287") ? false : (stryCov_9fa48("4287"), true));
        return;
      }
    }
    try {
      if (stryMutAct_9fa48("4288")) {
        {}
      } else {
        stryCov_9fa48("4288");
        //  showDirectoryPicker is not available on all browsers
        const dirHandle = await window.showDirectoryPicker();
        if (stryMutAct_9fa48("4290") ? false : stryMutAct_9fa48("4289") ? true : (stryCov_9fa48("4289", "4290"), downloadDirInput)) {
          if (stryMutAct_9fa48("4291")) {
            {}
          } else {
            stryCov_9fa48("4291");
            // Note: This returns a handle, not a path. For security, browsers don't
            // expose the full path. We'll use the name as a display placeholder.
            // The actual path is handled internally by the browser.
            downloadDirInput.value = dirHandle.name;
            validateFolder(downloadDirInput);

            // Provide user feedback about the limitation
            setStatus(stryMutAct_9fa48("4292") ? "" : (stryCov_9fa48("4292"), "settings-status"), (stryMutAct_9fa48("4293") ? "" : (stryCov_9fa48("4293"), "Selected folder: ")) + dirHandle.name + (stryMutAct_9fa48("4294") ? "" : (stryCov_9fa48("4294"), ". For full compatibility, please manually enter the absolute path to this folder.")), stryMutAct_9fa48("4295") ? true : (stryCov_9fa48("4295"), false));
          }
        }
      }
    } catch (error) {
      if (stryMutAct_9fa48("4296")) {
        {}
      } else {
        stryCov_9fa48("4296");
        if (stryMutAct_9fa48("4299") ? error instanceof DOMException || error.name === "AbortError" : stryMutAct_9fa48("4298") ? false : stryMutAct_9fa48("4297") ? true : (stryCov_9fa48("4297", "4298", "4299"), error instanceof DOMException && (stryMutAct_9fa48("4301") ? error.name !== "AbortError" : stryMutAct_9fa48("4300") ? true : (stryCov_9fa48("4300", "4301"), error.name === (stryMutAct_9fa48("4302") ? "" : (stryCov_9fa48("4302"), "AbortError")))))) {
          if (stryMutAct_9fa48("4303")) {
            {}
          } else {
            stryCov_9fa48("4303");
            logger.info(stryMutAct_9fa48("4304") ? "" : (stryCov_9fa48("4304"), "User aborted directory selection."), stryMutAct_9fa48("4305") ? {} : (stryCov_9fa48("4305"), {
              component: stryMutAct_9fa48("4306") ? "" : (stryCov_9fa48("4306"), "options"),
              operation: stryMutAct_9fa48("4307") ? "" : (stryCov_9fa48("4307"), "selectDownloadDirectory")
            }));
          }
        } else {
          if (stryMutAct_9fa48("4308")) {
            {}
          } else {
            stryCov_9fa48("4308");
            logger.error(stryMutAct_9fa48("4309") ? "" : (stryCov_9fa48("4309"), "Error selecting directory:"), stryMutAct_9fa48("4310") ? {} : (stryCov_9fa48("4310"), {
              component: stryMutAct_9fa48("4311") ? "" : (stryCov_9fa48("4311"), "options")
            }), error);
            setStatus(stryMutAct_9fa48("4312") ? "" : (stryCov_9fa48("4312"), "settings-status"), stryMutAct_9fa48("4313") ? "" : (stryCov_9fa48("4313"), "Failed to select directory. Please manually enter the path."), stryMutAct_9fa48("4314") ? false : (stryCov_9fa48("4314"), true));
          }
        }
      }
    }
  }
}

/**
 * Sends a request to restart the server.
 */
export function restartServer(): void {
  if (stryMutAct_9fa48("4315")) {
    {}
  } else {
    stryCov_9fa48("4315");
    const restartButton = document.getElementById("restart-server") as HTMLButtonElement;
    if (stryMutAct_9fa48("4317") ? false : stryMutAct_9fa48("4316") ? true : (stryCov_9fa48("4316", "4317"), restartButton)) {
      if (stryMutAct_9fa48("4318")) {
        {}
      } else {
        stryCov_9fa48("4318");
        restartButton.disabled = stryMutAct_9fa48("4319") ? false : (stryCov_9fa48("4319"), true);
        restartButton.innerHTML = stryMutAct_9fa48("4320") ? "" : (stryCov_9fa48("4320"), "Restarting...");
      }
    }
    chrome.runtime.sendMessage(stryMutAct_9fa48("4321") ? {} : (stryCov_9fa48("4321"), {
      type: stryMutAct_9fa48("4322") ? "" : (stryCov_9fa48("4322"), "restartServer")
    }), response => {
      if (stryMutAct_9fa48("4323")) {
        {}
      } else {
        stryCov_9fa48("4323");
        if (stryMutAct_9fa48("4325") ? false : stryMutAct_9fa48("4324") ? true : (stryCov_9fa48("4324", "4325"), restartButton)) {
          if (stryMutAct_9fa48("4326")) {
            {}
          } else {
            stryCov_9fa48("4326");
            restartButton.disabled = stryMutAct_9fa48("4327") ? true : (stryCov_9fa48("4327"), false);
            restartButton.innerHTML = stryMutAct_9fa48("4328") ? "" : (stryCov_9fa48("4328"), "Restart Server");
          }
        }
        if (stryMutAct_9fa48("4331") ? response || response.status === "success" : stryMutAct_9fa48("4330") ? false : stryMutAct_9fa48("4329") ? true : (stryCov_9fa48("4329", "4330", "4331"), response && (stryMutAct_9fa48("4333") ? response.status !== "success" : stryMutAct_9fa48("4332") ? true : (stryCov_9fa48("4332", "4333"), response.status === (stryMutAct_9fa48("4334") ? "" : (stryCov_9fa48("4334"), "success")))))) {
          if (stryMutAct_9fa48("4335")) {
            {}
          } else {
            stryCov_9fa48("4335");
            setStatus(stryMutAct_9fa48("4336") ? "" : (stryCov_9fa48("4336"), "settings-status"), stryMutAct_9fa48("4337") ? "" : (stryCov_9fa48("4337"), "Server restarted successfully!"));
          }
        } else {
          if (stryMutAct_9fa48("4338")) {
            {}
          } else {
            stryCov_9fa48("4338");
            setStatus(stryMutAct_9fa48("4339") ? "" : (stryCov_9fa48("4339"), "settings-status"), (stryMutAct_9fa48("4340") ? "" : (stryCov_9fa48("4340"), "Error: ")) + (stryMutAct_9fa48("4343") ? response?.message && "Failed to restart server" : stryMutAct_9fa48("4342") ? false : stryMutAct_9fa48("4341") ? true : (stryCov_9fa48("4341", "4342", "4343"), (stryMutAct_9fa48("4344") ? response.message : (stryCov_9fa48("4344"), response?.message)) || (stryMutAct_9fa48("4345") ? "" : (stryCov_9fa48("4345"), "Failed to restart server")))), stryMutAct_9fa48("4346") ? false : (stryCov_9fa48("4346"), true));
          }
        }
      }
    });
  }
}

/**
 * Loads and renders download errors from history storage
 * @param page Page number for pagination
 * @param perPage Items per page
 */
export async function loadErrorHistory(page = 1, perPage = 25): Promise<void> {
  if (stryMutAct_9fa48("4347")) {
    {}
  } else {
    stryCov_9fa48("4347");
    const {
      history,
      totalItems
    } = await fetchHistory(page, perPage);
    const errorEntries = stryMutAct_9fa48("4348") ? history : (stryCov_9fa48("4348"), history.filter(stryMutAct_9fa48("4349") ? () => undefined : (stryCov_9fa48("4349"), item => stryMutAct_9fa48("4352") ? item.status !== "error" : stryMutAct_9fa48("4351") ? false : stryMutAct_9fa48("4350") ? true : (stryCov_9fa48("4350", "4351", "4352"), item.status === (stryMutAct_9fa48("4353") ? "" : (stryCov_9fa48("4353"), "error"))))));
    const listEl = document.getElementById(stryMutAct_9fa48("4354") ? "" : (stryCov_9fa48("4354"), "error-history-list"));
    if (stryMutAct_9fa48("4357") ? false : stryMutAct_9fa48("4356") ? true : stryMutAct_9fa48("4355") ? listEl : (stryCov_9fa48("4355", "4356", "4357"), !listEl)) return;
    // Render only error entries
    renderHistoryItems(errorEntries, page, perPage, errorEntries.length, listEl);
  }
}

/**
 * Applies the appropriate theme (light/dark) to the options page UI.
 *
 * @param forceTheme - Optional theme to force (light/dark)
 */
export function applyOptionsTheme(forceTheme?: Theme): void {
  if (stryMutAct_9fa48("4358")) {
    {}
  } else {
    stryCov_9fa48("4358");
    const isDark = stryMutAct_9fa48("4361") ? forceTheme === "dark" && !forceTheme && window.matchMedia("(prefers-color-scheme: dark)").matches : stryMutAct_9fa48("4360") ? false : stryMutAct_9fa48("4359") ? true : (stryCov_9fa48("4359", "4360", "4361"), (stryMutAct_9fa48("4363") ? forceTheme !== "dark" : stryMutAct_9fa48("4362") ? false : (stryCov_9fa48("4362", "4363"), forceTheme === (stryMutAct_9fa48("4364") ? "" : (stryCov_9fa48("4364"), "dark")))) || (stryMutAct_9fa48("4366") ? !forceTheme || window.matchMedia("(prefers-color-scheme: dark)").matches : stryMutAct_9fa48("4365") ? false : (stryCov_9fa48("4365", "4366"), (stryMutAct_9fa48("4367") ? forceTheme : (stryCov_9fa48("4367"), !forceTheme)) && window.matchMedia(stryMutAct_9fa48("4368") ? "" : (stryCov_9fa48("4368"), "(prefers-color-scheme: dark)")).matches)));

    // Applying theme

    document.body.classList.toggle(stryMutAct_9fa48("4369") ? "" : (stryCov_9fa48("4369"), "dark-theme"), isDark);

    // Update header icon based on theme
    const headerIcon = document.getElementById("options-header-icon") as HTMLImageElement;
    if (stryMutAct_9fa48("4371") ? false : stryMutAct_9fa48("4370") ? true : (stryCov_9fa48("4370", "4371"), headerIcon)) {
      if (stryMutAct_9fa48("4372")) {
        {}
      } else {
        stryCov_9fa48("4372");
        const currentSrc = headerIcon.src;
        const isCurrentlyDark = currentSrc.includes(stryMutAct_9fa48("4373") ? "" : (stryCov_9fa48("4373"), "darkicon"));
        // Header icon update

        if (stryMutAct_9fa48("4376") ? isDark === isCurrentlyDark : stryMutAct_9fa48("4375") ? false : stryMutAct_9fa48("4374") ? true : (stryCov_9fa48("4374", "4375", "4376"), isDark !== isCurrentlyDark)) {
          if (stryMutAct_9fa48("4377")) {
            {}
          } else {
            stryCov_9fa48("4377");
            const newSrc = currentSrc.replace(isCurrentlyDark ? stryMutAct_9fa48("4378") ? "" : (stryCov_9fa48("4378"), "darkicon48.png") : stryMutAct_9fa48("4379") ? "" : (stryCov_9fa48("4379"), "icon48.png"), isDark ? stryMutAct_9fa48("4380") ? "" : (stryCov_9fa48("4380"), "darkicon48.png") : stryMutAct_9fa48("4381") ? "" : (stryCov_9fa48("4381"), "icon48.png"));
            // Updating icon
            headerIcon.src = newSrc;
          }
        }
      }
    }
  }
}

/**
 * Handles theme toggle button click.
 * Switches between light and dark themes and persists the preference.
 */
export async function handleThemeToggle(): Promise<void> {
  if (stryMutAct_9fa48("4382")) {
    {}
  } else {
    stryCov_9fa48("4382");
    // Theme toggle clicked

    try {
      if (stryMutAct_9fa48("4383")) {
        {}
      } else {
        stryCov_9fa48("4383");
        // Get current theme from storage
        const result = await chrome.storage.local.get(stryMutAct_9fa48("4384") ? "" : (stryCov_9fa48("4384"), "theme"));
        const currentTheme = result.theme as Theme | undefined;
        // Current theme from storage

        // Determine new theme
        let newTheme: Theme;
        if (stryMutAct_9fa48("4387") ? currentTheme !== "dark" : stryMutAct_9fa48("4386") ? false : stryMutAct_9fa48("4385") ? true : (stryCov_9fa48("4385", "4386", "4387"), currentTheme === (stryMutAct_9fa48("4388") ? "" : (stryCov_9fa48("4388"), "dark")))) {
          if (stryMutAct_9fa48("4389")) {
            {}
          } else {
            stryCov_9fa48("4389");
            newTheme = stryMutAct_9fa48("4390") ? "" : (stryCov_9fa48("4390"), "light");
          }
        } else if (stryMutAct_9fa48("4393") ? currentTheme !== "light" : stryMutAct_9fa48("4392") ? false : stryMutAct_9fa48("4391") ? true : (stryCov_9fa48("4391", "4392", "4393"), currentTheme === (stryMutAct_9fa48("4394") ? "" : (stryCov_9fa48("4394"), "light")))) {
          if (stryMutAct_9fa48("4395")) {
            {}
          } else {
            stryCov_9fa48("4395");
            newTheme = stryMutAct_9fa48("4396") ? "" : (stryCov_9fa48("4396"), "dark");
          }
        } else {
          if (stryMutAct_9fa48("4397")) {
            {}
          } else {
            stryCov_9fa48("4397");
            // If no theme is stored, check system preference and invert it
            const systemPrefersDark = window.matchMedia(stryMutAct_9fa48("4398") ? "" : (stryCov_9fa48("4398"), "(prefers-color-scheme: dark)")).matches;
            newTheme = systemPrefersDark ? stryMutAct_9fa48("4399") ? "" : (stryCov_9fa48("4399"), "light") : stryMutAct_9fa48("4400") ? "" : (stryCov_9fa48("4400"), "dark");
          }
        }

        // New theme will be

        // Save new theme to storage
        await chrome.storage.local.set(stryMutAct_9fa48("4401") ? {} : (stryCov_9fa48("4401"), {
          theme: newTheme
        }));

        // Apply the new theme
        applyOptionsTheme(newTheme);

        // Log the theme change
        // Theme changed
      }
    } catch (error) {
      if (stryMutAct_9fa48("4402")) {
        {}
      } else {
        stryCov_9fa48("4402");
        console.error(stryMutAct_9fa48("4403") ? "" : (stryCov_9fa48("4403"), "Error toggling theme:"), error);
      }
    }
  }
}

/**
 * Initializes the theme for the options page.
 * Loads the stored theme preference or uses system preference.
 */
export async function initializeOptionsTheme(): Promise<void> {
  if (stryMutAct_9fa48("4404")) {
    {}
  } else {
    stryCov_9fa48("4404");
    try {
      if (stryMutAct_9fa48("4405")) {
        {}
      } else {
        stryCov_9fa48("4405");
        // Get stored theme preference
        const result = await chrome.storage.local.get(stryMutAct_9fa48("4406") ? "" : (stryCov_9fa48("4406"), "theme"));
        const storedTheme = result.theme as Theme | undefined;
        if (stryMutAct_9fa48("4408") ? false : stryMutAct_9fa48("4407") ? true : (stryCov_9fa48("4407", "4408"), storedTheme)) {
          if (stryMutAct_9fa48("4409")) {
            {}
          } else {
            stryCov_9fa48("4409");
            // Use stored preference
            applyOptionsTheme(storedTheme);
          }
        } else {
          if (stryMutAct_9fa48("4410")) {
            {}
          } else {
            stryCov_9fa48("4410");
            // Use system preference
            applyOptionsTheme();
          }
        }
      }
    } catch (error) {
      if (stryMutAct_9fa48("4411")) {
        {}
      } else {
        stryCov_9fa48("4411");
        console.error(stryMutAct_9fa48("4412") ? "" : (stryCov_9fa48("4412"), "Error initializing theme:"), error);
        // Fallback to system preference
        applyOptionsTheme();
      }
    }
  }
}

// Initialize options page when loaded
// In a test environment, DOMContentLoaded may have already fired.
if (stryMutAct_9fa48("4415") ? document.readyState !== "loading" : stryMutAct_9fa48("4414") ? false : stryMutAct_9fa48("4413") ? true : (stryCov_9fa48("4413", "4414", "4415"), document.readyState === (stryMutAct_9fa48("4416") ? "" : (stryCov_9fa48("4416"), "loading")))) {
  if (stryMutAct_9fa48("4417")) {
    {}
  } else {
    stryCov_9fa48("4417");
    document.addEventListener(stryMutAct_9fa48("4418") ? "" : (stryCov_9fa48("4418"), "DOMContentLoaded"), initOptionsPage);
  }
} else if (stryMutAct_9fa48("4421") ? typeof initOptionsPage !== "function" : stryMutAct_9fa48("4420") ? false : stryMutAct_9fa48("4419") ? true : (stryCov_9fa48("4419", "4420", "4421"), typeof initOptionsPage === (stryMutAct_9fa48("4422") ? "" : (stryCov_9fa48("4422"), "function")))) {
  if (stryMutAct_9fa48("4423")) {
    {}
  } else {
    stryCov_9fa48("4423");
    // If used in tests or after page load, init directly
    initOptionsPage();
  }
}