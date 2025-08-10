/**
 * History management for the Enhanced Video Downloader extension.
 * Handles download history storage, retrieval, and display.
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
import { HistoryEntry } from "./types";

// --- History utility functions ---
export const historyStorageKey = stryMutAct_9fa48("2814") ? "" : (stryCov_9fa48("2814"), "downloadHistory");

/**
 * Fetches history entries with pagination
 * @param page - Page number to fetch
 * @param perPage - Number of items per page
 * @returns Promise resolving to history entries and total count
 */
export async function fetchHistory(page = 1, perPage = 25): Promise<{
  history: HistoryEntry[];
  totalItems: number;
}> {
  if (stryMutAct_9fa48("2815")) {
    {}
  } else {
    stryCov_9fa48("2815");
    return new Promise((resolve, reject) => {
      if (stryMutAct_9fa48("2816")) {
        {}
      } else {
        stryCov_9fa48("2816");
        chrome.storage.local.get(stryMutAct_9fa48("2817") ? {} : (stryCov_9fa48("2817"), {
          [historyStorageKey]: stryMutAct_9fa48("2818") ? ["Stryker was here"] : (stryCov_9fa48("2818"), [])
        }), result => {
          if (stryMutAct_9fa48("2819")) {
            {}
          } else {
            stryCov_9fa48("2819");
            if (stryMutAct_9fa48("2821") ? false : stryMutAct_9fa48("2820") ? true : (stryCov_9fa48("2820", "2821"), chrome.runtime.lastError)) {
              if (stryMutAct_9fa48("2822")) {
                {}
              } else {
                stryCov_9fa48("2822");
                console.warn(stryMutAct_9fa48("2823") ? "" : (stryCov_9fa48("2823"), "[EVD][HISTORY] Error fetching history:"), chrome.runtime.lastError.message);
                return resolve(stryMutAct_9fa48("2824") ? {} : (stryCov_9fa48("2824"), {
                  history: stryMutAct_9fa48("2825") ? ["Stryker was here"] : (stryCov_9fa48("2825"), []),
                  totalItems: 0
                }));
              }
            }
            // Ensure items have a timestamp for sorting, default to 0 if missing
            const allHistory = (stryMutAct_9fa48("2828") ? result[historyStorageKey] && [] : stryMutAct_9fa48("2827") ? false : stryMutAct_9fa48("2826") ? true : (stryCov_9fa48("2826", "2827", "2828"), result[historyStorageKey] || (stryMutAct_9fa48("2829") ? ["Stryker was here"] : (stryCov_9fa48("2829"), [])))).map(stryMutAct_9fa48("2830") ? () => undefined : (stryCov_9fa48("2830"), (item: HistoryEntry) => stryMutAct_9fa48("2831") ? {} : (stryCov_9fa48("2831"), {
              ...item,
              timestamp: stryMutAct_9fa48("2834") ? item.timestamp && 0 : stryMutAct_9fa48("2833") ? false : stryMutAct_9fa48("2832") ? true : (stryCov_9fa48("2832", "2833", "2834"), item.timestamp || 0)
            })));
            // Sort by timestamp descending (newest first)
            stryMutAct_9fa48("2835") ? allHistory : (stryCov_9fa48("2835"), allHistory.sort(stryMutAct_9fa48("2836") ? () => undefined : (stryCov_9fa48("2836"), (a: HistoryEntry, b: HistoryEntry) => stryMutAct_9fa48("2837") ? (b.timestamp as number) + (a.timestamp as number) : (stryCov_9fa48("2837"), (b.timestamp as number) - (a.timestamp as number)))));

            // Handle pagination
            const totalItems = allHistory.length;
            const startIndex = stryMutAct_9fa48("2838") ? (page - 1) / perPage : (stryCov_9fa48("2838"), (stryMutAct_9fa48("2839") ? page + 1 : (stryCov_9fa48("2839"), page - 1)) * perPage);
            const endIndex = stryMutAct_9fa48("2840") ? startIndex - perPage : (stryCov_9fa48("2840"), startIndex + perPage);
            const paginatedHistory = stryMutAct_9fa48("2841") ? allHistory : (stryCov_9fa48("2841"), allHistory.slice(startIndex, endIndex));
            resolve(stryMutAct_9fa48("2842") ? {} : (stryCov_9fa48("2842"), {
              history: paginatedHistory,
              totalItems
            }));
          }
        });
      }
    });
  }
}

/**
 * Renders history items to a specified DOM element
 * @param historyItems - Array of history entries to render
 * @param page - Current page number
 * @param perPage - Items per page
 * @param totalItems - Total number of history items
 * @param historyListElement - DOM element to render into
 * @param pageInfoElement - Optional element to show pagination info
 * @param prevPageBtn - Optional previous page button
 * @param nextPageBtn - Optional next page button
 */
export function renderHistoryItems(historyItems: HistoryEntry[], page = 1, perPage = 25, totalItems = 0, historyListElement?: HTMLElement, pageInfoElement?: HTMLElement, prevPageBtn?: HTMLButtonElement, nextPageBtn?: HTMLButtonElement): void {
  if (stryMutAct_9fa48("2843")) {
    {}
  } else {
    stryCov_9fa48("2843");
    if (stryMutAct_9fa48("2846") ? false : stryMutAct_9fa48("2845") ? true : stryMutAct_9fa48("2844") ? historyListElement : (stryCov_9fa48("2844", "2845", "2846"), !historyListElement)) {
      if (stryMutAct_9fa48("2847")) {
        {}
      } else {
        stryCov_9fa48("2847");
        console.error(stryMutAct_9fa48("2848") ? "" : (stryCov_9fa48("2848"), "[EVD][HISTORY] No history list element provided to renderHistory"));
        return;
      }
    }

    // Validate that historyListElement is actually a DOM element with innerHTML property
    if (stryMutAct_9fa48("2851") ? typeof historyListElement.innerHTML === "string" : stryMutAct_9fa48("2850") ? false : stryMutAct_9fa48("2849") ? true : (stryCov_9fa48("2849", "2850", "2851"), typeof historyListElement.innerHTML !== (stryMutAct_9fa48("2852") ? "" : (stryCov_9fa48("2852"), "string")))) {
      if (stryMutAct_9fa48("2853")) {
        {}
      } else {
        stryCov_9fa48("2853");
        console.error(stryMutAct_9fa48("2854") ? "" : (stryCov_9fa48("2854"), "[EVD][HISTORY] Invalid history list element provided to renderHistory:"), historyListElement);
        return;
      }
    }

    // Clear the list
    historyListElement.innerHTML = stryMutAct_9fa48("2855") ? "Stryker was here!" : (stryCov_9fa48("2855"), "");

    // If we have no items, show a message
    if (stryMutAct_9fa48("2858") ? !historyItems && historyItems.length === 0 : stryMutAct_9fa48("2857") ? false : stryMutAct_9fa48("2856") ? true : (stryCov_9fa48("2856", "2857", "2858"), (stryMutAct_9fa48("2859") ? historyItems : (stryCov_9fa48("2859"), !historyItems)) || (stryMutAct_9fa48("2861") ? historyItems.length !== 0 : stryMutAct_9fa48("2860") ? false : (stryCov_9fa48("2860", "2861"), historyItems.length === 0)))) {
      if (stryMutAct_9fa48("2862")) {
        {}
      } else {
        stryCov_9fa48("2862");
        historyListElement.innerHTML = stryMutAct_9fa48("2863") ? "" : (stryCov_9fa48("2863"), '<li class="empty-history">No download history available.</li>');

        // Update pagination UI if provided
        if (stryMutAct_9fa48("2866") ? pageInfoElement || pageInfoElement instanceof Element : stryMutAct_9fa48("2865") ? false : stryMutAct_9fa48("2864") ? true : (stryCov_9fa48("2864", "2865", "2866"), pageInfoElement && pageInfoElement instanceof Element)) {
          if (stryMutAct_9fa48("2867")) {
            {}
          } else {
            stryCov_9fa48("2867");
            pageInfoElement.textContent = stryMutAct_9fa48("2868") ? "" : (stryCov_9fa48("2868"), "No items");
          }
        }

        // Disable pagination buttons if they exist and are DOM elements
        if (stryMutAct_9fa48("2871") ? prevPageBtn || prevPageBtn instanceof Element : stryMutAct_9fa48("2870") ? false : stryMutAct_9fa48("2869") ? true : (stryCov_9fa48("2869", "2870", "2871"), prevPageBtn && prevPageBtn instanceof Element)) {
          if (stryMutAct_9fa48("2872")) {
            {}
          } else {
            stryCov_9fa48("2872");
            prevPageBtn.disabled = stryMutAct_9fa48("2873") ? false : (stryCov_9fa48("2873"), true);
          }
        }
        if (stryMutAct_9fa48("2876") ? nextPageBtn || nextPageBtn instanceof Element : stryMutAct_9fa48("2875") ? false : stryMutAct_9fa48("2874") ? true : (stryCov_9fa48("2874", "2875", "2876"), nextPageBtn && nextPageBtn instanceof Element)) {
          if (stryMutAct_9fa48("2877")) {
            {}
          } else {
            stryCov_9fa48("2877");
            nextPageBtn.disabled = stryMutAct_9fa48("2878") ? false : (stryCov_9fa48("2878"), true);
          }
        }
        return;
      }
    }

    // Render history items
    historyItems.forEach(item => {
      if (stryMutAct_9fa48("2879")) {
        {}
      } else {
        stryCov_9fa48("2879");
        const li = document.createElement(stryMutAct_9fa48("2880") ? "" : (stryCov_9fa48("2880"), "li"));
        li.className = stryMutAct_9fa48("2881") ? "" : (stryCov_9fa48("2881"), "history-item");
        if (stryMutAct_9fa48("2883") ? false : stryMutAct_9fa48("2882") ? true : (stryCov_9fa48("2882", "2883"), item.id)) {
          if (stryMutAct_9fa48("2884")) {
            {}
          } else {
            stryCov_9fa48("2884");
            li.dataset.itemId = item.id.toString(); // Store ID for potential actions like delete
          }
        }
        const titleDiv = document.createElement(stryMutAct_9fa48("2885") ? "" : (stryCov_9fa48("2885"), "div"));
        const titleBold = document.createElement(stryMutAct_9fa48("2886") ? "" : (stryCov_9fa48("2886"), "b"));
        titleBold.textContent = stryMutAct_9fa48("2889") ? (item.page_title || item.filename) && "..." : stryMutAct_9fa48("2888") ? false : stryMutAct_9fa48("2887") ? true : (stryCov_9fa48("2887", "2888", "2889"), (stryMutAct_9fa48("2891") ? item.page_title && item.filename : stryMutAct_9fa48("2890") ? false : (stryCov_9fa48("2890", "2891"), item.page_title || item.filename)) || (stryMutAct_9fa48("2892") ? "" : (stryCov_9fa48("2892"), "...")));
        titleDiv.appendChild(titleBold);
        const timestampDiv = document.createElement(stryMutAct_9fa48("2893") ? "" : (stryCov_9fa48("2893"), "div"));
        timestampDiv.className = stryMutAct_9fa48("2894") ? "" : (stryCov_9fa48("2894"), "history-item-timestamp");
        timestampDiv.textContent = item.timestamp ? new Date(item.timestamp).toLocaleString() : stryMutAct_9fa48("2895") ? "Stryker was here!" : (stryCov_9fa48("2895"), "");
        const statusDiv = document.createElement(stryMutAct_9fa48("2896") ? "" : (stryCov_9fa48("2896"), "div"));
        const statusBold = document.createElement(stryMutAct_9fa48("2897") ? "" : (stryCov_9fa48("2897"), "b"));
        statusBold.textContent = stryMutAct_9fa48("2900") ? item.status && "" : stryMutAct_9fa48("2899") ? false : stryMutAct_9fa48("2898") ? true : (stryCov_9fa48("2898", "2899", "2900"), item.status || (stryMutAct_9fa48("2901") ? "Stryker was here!" : (stryCov_9fa48("2901"), "")));
        statusDiv.appendChild(document.createTextNode(stryMutAct_9fa48("2902") ? "" : (stryCov_9fa48("2902"), "Status: ")));
        statusDiv.appendChild(statusBold);
        const actionsWrapper = document.createElement(stryMutAct_9fa48("2903") ? "" : (stryCov_9fa48("2903"), "div"));
        actionsWrapper.className = stryMutAct_9fa48("2904") ? "" : (stryCov_9fa48("2904"), "history-actions");
        const retryButton = document.createElement(stryMutAct_9fa48("2905") ? "" : (stryCov_9fa48("2905"), "button"));
        retryButton.className = stryMutAct_9fa48("2906") ? "" : (stryCov_9fa48("2906"), "btn btn--secondary retry-btn");
        retryButton.textContent = stryMutAct_9fa48("2907") ? "" : (stryCov_9fa48("2907"), "Retry");
        retryButton.title = stryMutAct_9fa48("2908") ? "" : (stryCov_9fa48("2908"), "Retry download");
        retryButton.addEventListener(stryMutAct_9fa48("2909") ? "" : (stryCov_9fa48("2909"), "click"), e => {
          if (stryMutAct_9fa48("2910")) {
            {}
          } else {
            stryCov_9fa48("2910");
            e.stopPropagation(); // Prevent li click if any
            // Retry clicked for item
            chrome.runtime.sendMessage(stryMutAct_9fa48("2911") ? {} : (stryCov_9fa48("2911"), {
              type: stryMutAct_9fa48("2912") ? "" : (stryCov_9fa48("2912"), "downloadVideo"),
              // Changed action to type
              url: item.url,
              filename: item.filename,
              page_title: stryMutAct_9fa48("2915") ? item.page_title && document.title : stryMutAct_9fa48("2914") ? false : stryMutAct_9fa48("2913") ? true : (stryCov_9fa48("2913", "2914", "2915"), item.page_title || document.title) // Fallback for page_title
              // id: item.id // Optionally pass original ID if server needs to link them
            }), response => {
              if (stryMutAct_9fa48("2916")) {
                {}
              } else {
                stryCov_9fa48("2916");
                if (stryMutAct_9fa48("2918") ? false : stryMutAct_9fa48("2917") ? true : (stryCov_9fa48("2917", "2918"), chrome.runtime.lastError)) {
                  if (stryMutAct_9fa48("2919")) {
                    {}
                  } else {
                    stryCov_9fa48("2919");
                    console.warn(stryMutAct_9fa48("2920") ? "" : (stryCov_9fa48("2920"), "[EVD][HISTORY] Error sending retry message:"), chrome.runtime.lastError.message);
                  }
                } else {
                  // Retry download initiated
                  // Optionally, provide feedback to the user in the popup
                }
              }
            });
          }
        });
        const deleteButton = document.createElement(stryMutAct_9fa48("2921") ? "" : (stryCov_9fa48("2921"), "button"));
        deleteButton.className = stryMutAct_9fa48("2922") ? "" : (stryCov_9fa48("2922"), "btn btn--secondary delete-btn");
        deleteButton.textContent = stryMutAct_9fa48("2923") ? "" : (stryCov_9fa48("2923"), "Delete");
        deleteButton.title = stryMutAct_9fa48("2924") ? "" : (stryCov_9fa48("2924"), "Remove from history");
        deleteButton.addEventListener(stryMutAct_9fa48("2925") ? "" : (stryCov_9fa48("2925"), "click"), async e => {
          if (stryMutAct_9fa48("2926")) {
            {}
          } else {
            stryCov_9fa48("2926");
            e.stopPropagation();
            if (stryMutAct_9fa48("2929") ? false : stryMutAct_9fa48("2928") ? true : stryMutAct_9fa48("2927") ? item.id : (stryCov_9fa48("2927", "2928", "2929"), !item.id)) return;
            // Delete clicked for item
            try {
              if (stryMutAct_9fa48("2930")) {
                {}
              } else {
                stryCov_9fa48("2930");
                await removeHistoryItemAndNotify(item.id);
                // The historyUpdated message from removeHistoryItemAndNotify will trigger a re-render
              }
            } catch (error) {
              if (stryMutAct_9fa48("2931")) {
                {}
              } else {
                stryCov_9fa48("2931");
                console.error(stryMutAct_9fa48("2932") ? "" : (stryCov_9fa48("2932"), "[EVD][HISTORY] Failed to delete history item from UI action:"), error);
              }
            }
          }
        });
        actionsWrapper.appendChild(retryButton);
        actionsWrapper.appendChild(deleteButton);
        li.appendChild(titleDiv);
        li.appendChild(timestampDiv);
        li.appendChild(statusDiv);
        li.appendChild(actionsWrapper);
        if (stryMutAct_9fa48("2934") ? false : stryMutAct_9fa48("2933") ? true : (stryCov_9fa48("2933", "2934"), item.detail)) {
          if (stryMutAct_9fa48("2935")) {
            {}
          } else {
            stryCov_9fa48("2935");
            const detailDiv = document.createElement(stryMutAct_9fa48("2936") ? "" : (stryCov_9fa48("2936"), "div"));
            const detailSpan = document.createElement(stryMutAct_9fa48("2937") ? "" : (stryCov_9fa48("2937"), "span"));
            detailSpan.className = stryMutAct_9fa48("2938") ? "" : (stryCov_9fa48("2938"), "history-item-detail");
            // If detail is an array, join it. Otherwise, display as is.
            detailSpan.textContent = Array.isArray(item.detail) ? item.detail.join(stryMutAct_9fa48("2939") ? "" : (stryCov_9fa48("2939"), ", ")) : item.detail;
            detailDiv.appendChild(document.createTextNode(stryMutAct_9fa48("2940") ? "" : (stryCov_9fa48("2940"), "Detail: ")));
            detailDiv.appendChild(detailSpan);
            li.appendChild(detailDiv);
          }
        }
        if (stryMutAct_9fa48("2942") ? false : stryMutAct_9fa48("2941") ? true : (stryCov_9fa48("2941", "2942"), item.error)) {
          if (stryMutAct_9fa48("2943")) {
            {}
          } else {
            stryCov_9fa48("2943");
            const errorDiv = document.createElement(stryMutAct_9fa48("2944") ? "" : (stryCov_9fa48("2944"), "div"));
            errorDiv.className = stryMutAct_9fa48("2945") ? "" : (stryCov_9fa48("2945"), "history-item-error");
            errorDiv.textContent = (stryMutAct_9fa48("2946") ? "" : (stryCov_9fa48("2946"), "Error: ")) + item.error;
            li.appendChild(errorDiv);
          }
        }
        if (stryMutAct_9fa48("2948") ? false : stryMutAct_9fa48("2947") ? true : (stryCov_9fa48("2947", "2948"), item.url)) {
          if (stryMutAct_9fa48("2949")) {
            {}
          } else {
            stryCov_9fa48("2949");
            const urlDiv = document.createElement(stryMutAct_9fa48("2950") ? "" : (stryCov_9fa48("2950"), "div"));
            urlDiv.className = stryMutAct_9fa48("2951") ? "" : (stryCov_9fa48("2951"), "history-item-url");
            const urlLink = document.createElement(stryMutAct_9fa48("2952") ? "" : (stryCov_9fa48("2952"), "a"));
            urlLink.href = item.url;
            urlLink.target = stryMutAct_9fa48("2953") ? "" : (stryCov_9fa48("2953"), "_blank");
            urlLink.textContent = item.url;
            urlDiv.appendChild(document.createTextNode(stryMutAct_9fa48("2954") ? "" : (stryCov_9fa48("2954"), "URL: ")));
            urlDiv.appendChild(urlLink);
            li.appendChild(urlDiv);
          }
        }
        historyListElement.appendChild(li);
      }
    });

    // Update pagination UI if provided
    if (stryMutAct_9fa48("2957") ? pageInfoElement || pageInfoElement instanceof Element : stryMutAct_9fa48("2956") ? false : stryMutAct_9fa48("2955") ? true : (stryCov_9fa48("2955", "2956", "2957"), pageInfoElement && pageInfoElement instanceof Element)) {
      if (stryMutAct_9fa48("2958")) {
        {}
      } else {
        stryCov_9fa48("2958");
        // Handle the case where totalItems is 0 but we still have items (edge case)
        const actualTotal = stryMutAct_9fa48("2961") ? totalItems && historyItems.length : stryMutAct_9fa48("2960") ? false : stryMutAct_9fa48("2959") ? true : (stryCov_9fa48("2959", "2960", "2961"), totalItems || historyItems.length);
        if (stryMutAct_9fa48("2964") ? actualTotal !== 0 : stryMutAct_9fa48("2963") ? false : stryMutAct_9fa48("2962") ? true : (stryCov_9fa48("2962", "2963", "2964"), actualTotal === 0)) {
          if (stryMutAct_9fa48("2965")) {
            {}
          } else {
            stryCov_9fa48("2965");
            pageInfoElement.textContent = stryMutAct_9fa48("2966") ? "" : (stryCov_9fa48("2966"), "No items");
          }
        } else {
          if (stryMutAct_9fa48("2967")) {
            {}
          } else {
            stryCov_9fa48("2967");
            const startItem = stryMutAct_9fa48("2968") ? Math.max((page - 1) * perPage + 1, actualTotal) : (stryCov_9fa48("2968"), Math.min(stryMutAct_9fa48("2969") ? (page - 1) * perPage - 1 : (stryCov_9fa48("2969"), (stryMutAct_9fa48("2970") ? (page - 1) / perPage : (stryCov_9fa48("2970"), (stryMutAct_9fa48("2971") ? page + 1 : (stryCov_9fa48("2971"), page - 1)) * perPage)) + 1), actualTotal));
            const endItem = stryMutAct_9fa48("2972") ? Math.max(page * perPage, actualTotal) : (stryCov_9fa48("2972"), Math.min(stryMutAct_9fa48("2973") ? page / perPage : (stryCov_9fa48("2973"), page * perPage), actualTotal));
            pageInfoElement.textContent = (stryMutAct_9fa48("2974") ? "" : (stryCov_9fa48("2974"), "Showing ")) + startItem + (stryMutAct_9fa48("2975") ? "" : (stryCov_9fa48("2975"), "-")) + endItem + (stryMutAct_9fa48("2976") ? "" : (stryCov_9fa48("2976"), " of ")) + actualTotal + (stryMutAct_9fa48("2977") ? "" : (stryCov_9fa48("2977"), " items"));
          }
        }
      }
    }

    // Update pagination button states
    if (stryMutAct_9fa48("2980") ? prevPageBtn || prevPageBtn instanceof Element : stryMutAct_9fa48("2979") ? false : stryMutAct_9fa48("2978") ? true : (stryCov_9fa48("2978", "2979", "2980"), prevPageBtn && prevPageBtn instanceof Element)) {
      if (stryMutAct_9fa48("2981")) {
        {}
      } else {
        stryCov_9fa48("2981");
        prevPageBtn.disabled = stryMutAct_9fa48("2985") ? page > 1 : stryMutAct_9fa48("2984") ? page < 1 : stryMutAct_9fa48("2983") ? false : stryMutAct_9fa48("2982") ? true : (stryCov_9fa48("2982", "2983", "2984", "2985"), page <= 1);
      }
    }
    if (stryMutAct_9fa48("2988") ? nextPageBtn || nextPageBtn instanceof Element : stryMutAct_9fa48("2987") ? false : stryMutAct_9fa48("2986") ? true : (stryCov_9fa48("2986", "2987", "2988"), nextPageBtn && nextPageBtn instanceof Element)) {
      if (stryMutAct_9fa48("2989")) {
        {}
      } else {
        stryCov_9fa48("2989");
        // If totalItems is 0 but we have items, calculate based on items length
        const actualTotal = stryMutAct_9fa48("2992") ? totalItems && historyItems.length : stryMutAct_9fa48("2991") ? false : stryMutAct_9fa48("2990") ? true : (stryCov_9fa48("2990", "2991", "2992"), totalItems || historyItems.length);
        nextPageBtn.disabled = stryMutAct_9fa48("2996") ? page * perPage < actualTotal : stryMutAct_9fa48("2995") ? page * perPage > actualTotal : stryMutAct_9fa48("2994") ? false : stryMutAct_9fa48("2993") ? true : (stryCov_9fa48("2993", "2994", "2995", "2996"), (stryMutAct_9fa48("2997") ? page / perPage : (stryCov_9fa48("2997"), page * perPage)) >= actualTotal);
      }
    }
  }
}

/**
 * Adds a new entry to the download history
 * @param entry - History entry to add
 * @returns Promise resolving when entry is saved
 */
export async function addToHistory(entry: HistoryEntry): Promise<void> {
  if (stryMutAct_9fa48("2998")) {
    {}
  } else {
    stryCov_9fa48("2998");
    const newEntry = stryMutAct_9fa48("2999") ? {} : (stryCov_9fa48("2999"), {
      ...entry,
      id: stryMutAct_9fa48("3002") ? entry.id && crypto.randomUUID() : stryMutAct_9fa48("3001") ? false : stryMutAct_9fa48("3000") ? true : (stryCov_9fa48("3000", "3001", "3002"), entry.id || crypto.randomUUID()),
      timestamp: stryMutAct_9fa48("3005") ? entry.timestamp && Date.now() : stryMutAct_9fa48("3004") ? false : stryMutAct_9fa48("3003") ? true : (stryCov_9fa48("3003", "3004", "3005"), entry.timestamp || Date.now())
    });
    return new Promise((resolve, reject) => {
      if (stryMutAct_9fa48("3006")) {
        {}
      } else {
        stryCov_9fa48("3006");
        chrome.storage.local.get(stryMutAct_9fa48("3007") ? {} : (stryCov_9fa48("3007"), {
          [historyStorageKey]: stryMutAct_9fa48("3008") ? ["Stryker was here"] : (stryCov_9fa48("3008"), [])
        }), result => {
          if (stryMutAct_9fa48("3009")) {
            {}
          } else {
            stryCov_9fa48("3009");
            if (stryMutAct_9fa48("3011") ? false : stryMutAct_9fa48("3010") ? true : (stryCov_9fa48("3010", "3011"), chrome.runtime.lastError)) {
              if (stryMutAct_9fa48("3012")) {
                {}
              } else {
                stryCov_9fa48("3012");
                console.warn(stryMutAct_9fa48("3013") ? "" : (stryCov_9fa48("3013"), "[EVD][HISTORY] Warning fetching existing history:"), chrome.runtime.lastError.message);
              }
            }
            const history = stryMutAct_9fa48("3016") ? result && result[historyStorageKey] && [] : stryMutAct_9fa48("3015") ? false : stryMutAct_9fa48("3014") ? true : (stryCov_9fa48("3014", "3015", "3016"), (stryMutAct_9fa48("3018") ? result || result[historyStorageKey] : stryMutAct_9fa48("3017") ? false : (stryCov_9fa48("3017", "3018"), result && result[historyStorageKey])) || (stryMutAct_9fa48("3019") ? ["Stryker was here"] : (stryCov_9fa48("3019"), [])));
            history.unshift(newEntry);
            chrome.storage.local.set(stryMutAct_9fa48("3020") ? {} : (stryCov_9fa48("3020"), {
              [historyStorageKey]: history
            }), () => {
              if (stryMutAct_9fa48("3021")) {
                {}
              } else {
                stryCov_9fa48("3021");
                if (stryMutAct_9fa48("3023") ? false : stryMutAct_9fa48("3022") ? true : (stryCov_9fa48("3022", "3023"), chrome.runtime.lastError)) {
                  if (stryMutAct_9fa48("3024")) {
                    {}
                  } else {
                    stryCov_9fa48("3024");
                    console.warn(stryMutAct_9fa48("3025") ? "" : (stryCov_9fa48("3025"), "[EVD][HISTORY] Warning adding to history:"), chrome.runtime.lastError.message);
                    // Swallow storage.set errors to prevent breaking functionality
                    resolve();
                    return;
                  }
                }
                // Attempt to sync to backend history API (best effort)
                try {
                  if (stryMutAct_9fa48("3026")) {
                    {}
                  } else {
                    stryCov_9fa48("3026");
                    chrome.storage.local.get(stryMutAct_9fa48("3027") ? "" : (stryCov_9fa48("3027"), "serverPort"), async res => {
                      if (stryMutAct_9fa48("3028")) {
                        {}
                      } else {
                        stryCov_9fa48("3028");
                        const port = (res as any).serverPort;
                        if (stryMutAct_9fa48("3031") ? false : stryMutAct_9fa48("3030") ? true : stryMutAct_9fa48("3029") ? port : (stryCov_9fa48("3029", "3030", "3031"), !port)) return;
                        try {
                          if (stryMutAct_9fa48("3032")) {
                            {}
                          } else {
                            stryCov_9fa48("3032");
                            await fetch(stryMutAct_9fa48("3033") ? `` : (stryCov_9fa48("3033"), `http://127.0.0.1:${port}/api/history`), stryMutAct_9fa48("3034") ? {} : (stryCov_9fa48("3034"), {
                              method: stryMutAct_9fa48("3035") ? "" : (stryCov_9fa48("3035"), "POST"),
                              headers: stryMutAct_9fa48("3036") ? {} : (stryCov_9fa48("3036"), {
                                "Content-Type": stryMutAct_9fa48("3037") ? "" : (stryCov_9fa48("3037"), "application/json")
                              }),
                              body: JSON.stringify(newEntry)
                            }));
                          }
                        } catch {
                          // ignore sync errors
                        }
                      }
                    });
                  }
                } catch {
                  // ignore
                }
                // Added to history locally
                resolve();
              }
            });
          }
        });
      }
    });
  }
}

/**
 * Clears all download history
 * @returns Promise resolving when history is cleared
 */
export async function clearHistory(): Promise<void> {
  if (stryMutAct_9fa48("3038")) {
    {}
  } else {
    stryCov_9fa48("3038");
    return new Promise((resolve, reject) => {
      if (stryMutAct_9fa48("3039")) {
        {}
      } else {
        stryCov_9fa48("3039");
        chrome.storage.local.set(stryMutAct_9fa48("3040") ? {} : (stryCov_9fa48("3040"), {
          [historyStorageKey]: stryMutAct_9fa48("3041") ? ["Stryker was here"] : (stryCov_9fa48("3041"), [])
        }), () => {
          if (stryMutAct_9fa48("3042")) {
            {}
          } else {
            stryCov_9fa48("3042");
            if (stryMutAct_9fa48("3044") ? false : stryMutAct_9fa48("3043") ? true : (stryCov_9fa48("3043", "3044"), chrome.runtime.lastError)) {
              if (stryMutAct_9fa48("3045")) {
                {}
              } else {
                stryCov_9fa48("3045");
                console.error(stryMutAct_9fa48("3046") ? "" : (stryCov_9fa48("3046"), "[EVD][HISTORY] Error clearing history:"), chrome.runtime.lastError.message);
                reject(new Error(chrome.runtime.lastError.message));
              }
            } else {
              if (stryMutAct_9fa48("3047")) {
                {}
              } else {
                stryCov_9fa48("3047");
                // Attempt to clear backend history API as well (best effort)
                try {
                  if (stryMutAct_9fa48("3048")) {
                    {}
                  } else {
                    stryCov_9fa48("3048");
                    chrome.storage.local.get(stryMutAct_9fa48("3049") ? "" : (stryCov_9fa48("3049"), "serverPort"), async res => {
                      if (stryMutAct_9fa48("3050")) {
                        {}
                      } else {
                        stryCov_9fa48("3050");
                        const port = (res as any).serverPort;
                        if (stryMutAct_9fa48("3053") ? false : stryMutAct_9fa48("3052") ? true : stryMutAct_9fa48("3051") ? port : (stryCov_9fa48("3051", "3052", "3053"), !port)) return;
                        try {
                          if (stryMutAct_9fa48("3054")) {
                            {}
                          } else {
                            stryCov_9fa48("3054");
                            await fetch(stryMutAct_9fa48("3055") ? `` : (stryCov_9fa48("3055"), `http://127.0.0.1:${port}/api/history`), stryMutAct_9fa48("3056") ? {} : (stryCov_9fa48("3056"), {
                              method: stryMutAct_9fa48("3057") ? "" : (stryCov_9fa48("3057"), "POST"),
                              headers: stryMutAct_9fa48("3058") ? {} : (stryCov_9fa48("3058"), {
                                "Content-Type": stryMutAct_9fa48("3059") ? "" : (stryCov_9fa48("3059"), "application/json")
                              }),
                              body: JSON.stringify(stryMutAct_9fa48("3060") ? {} : (stryCov_9fa48("3060"), {
                                action: stryMutAct_9fa48("3061") ? "" : (stryCov_9fa48("3061"), "clear")
                              }))
                            }));
                          }
                        } catch {
                          // ignore errors
                        }
                      }
                    });
                  }
                } catch {
                  // ignore
                }
                // History cleared locally
                resolve();
              }
            }
          }
        });
      }
    });
  }
}

/**
 * Clears the entire history and notifies other parts of the extension.
 * @returns Promise resolving to void
 */
export async function clearHistoryAndNotify(): Promise<void> {
  if (stryMutAct_9fa48("3062")) {
    {}
  } else {
    stryCov_9fa48("3062");
    await clearHistory();
    chrome.runtime.sendMessage(stryMutAct_9fa48("3063") ? {} : (stryCov_9fa48("3063"), {
      type: stryMutAct_9fa48("3064") ? "" : (stryCov_9fa48("3064"), "historyUpdated")
    }));
  }
}

/**
 * Removes a specific history item by ID
 * @param itemId - ID of the history item to remove
 * @returns Promise resolving when item is removed
 */
export async function removeHistoryItem(itemId?: string | number): Promise<void> {
  if (stryMutAct_9fa48("3065")) {
    {}
  } else {
    stryCov_9fa48("3065");
    if (stryMutAct_9fa48("3068") ? false : stryMutAct_9fa48("3067") ? true : stryMutAct_9fa48("3066") ? itemId : (stryCov_9fa48("3066", "3067", "3068"), !itemId)) {
      if (stryMutAct_9fa48("3069")) {
        {}
      } else {
        stryCov_9fa48("3069");
        console.warn(stryMutAct_9fa48("3070") ? "" : (stryCov_9fa48("3070"), "[EVD][HISTORY] No item ID provided for removal."));
        return Promise.resolve();
      }
    }
    return new Promise((resolve, reject) => {
      if (stryMutAct_9fa48("3071")) {
        {}
      } else {
        stryCov_9fa48("3071");
        // Note: We can't use fetchHistory here as it now rejects on error.
        chrome.storage.local.get(stryMutAct_9fa48("3072") ? {} : (stryCov_9fa48("3072"), {
          [historyStorageKey]: stryMutAct_9fa48("3073") ? ["Stryker was here"] : (stryCov_9fa48("3073"), [])
        }), result => {
          if (stryMutAct_9fa48("3074")) {
            {}
          } else {
            stryCov_9fa48("3074");
            if (stryMutAct_9fa48("3076") ? false : stryMutAct_9fa48("3075") ? true : (stryCov_9fa48("3075", "3076"), chrome.runtime.lastError)) {
              if (stryMutAct_9fa48("3077")) {
                {}
              } else {
                stryCov_9fa48("3077");
                return reject(new Error(chrome.runtime.lastError.message));
              }
            }
            const history = stryMutAct_9fa48("3080") ? result[historyStorageKey] && [] : stryMutAct_9fa48("3079") ? false : stryMutAct_9fa48("3078") ? true : (stryCov_9fa48("3078", "3079", "3080"), result[historyStorageKey] || (stryMutAct_9fa48("3081") ? ["Stryker was here"] : (stryCov_9fa48("3081"), [])));
            const newHistory = stryMutAct_9fa48("3082") ? history : (stryCov_9fa48("3082"), history.filter(stryMutAct_9fa48("3083") ? () => undefined : (stryCov_9fa48("3083"), (item: HistoryEntry) => stryMutAct_9fa48("3086") ? item.id === itemId : stryMutAct_9fa48("3085") ? false : stryMutAct_9fa48("3084") ? true : (stryCov_9fa48("3084", "3085", "3086"), item.id !== itemId))));
            chrome.storage.local.set(stryMutAct_9fa48("3087") ? {} : (stryCov_9fa48("3087"), {
              [historyStorageKey]: newHistory
            }), () => {
              if (stryMutAct_9fa48("3088")) {
                {}
              } else {
                stryCov_9fa48("3088");
                if (stryMutAct_9fa48("3090") ? false : stryMutAct_9fa48("3089") ? true : (stryCov_9fa48("3089", "3090"), chrome.runtime.lastError)) {
                  if (stryMutAct_9fa48("3091")) {
                    {}
                  } else {
                    stryCov_9fa48("3091");
                    console.error(stryMutAct_9fa48("3092") ? "" : (stryCov_9fa48("3092"), "[EVD][HISTORY] Error removing item from history:"), chrome.runtime.lastError.message);
                    return reject(new Error(chrome.runtime.lastError.message));
                  }
                }
                // Removed item from history
                resolve();
              }
            });
          }
        });
      }
    });
  }
}

/**
 * Removes a history item and notifies other parts of the extension.
 * @param itemId - The ID of the item to remove.
 * @returns Promise resolving to void
 */
export async function removeHistoryItemAndNotify(itemId?: string | number): Promise<void> {
  if (stryMutAct_9fa48("3093")) {
    {}
  } else {
    stryCov_9fa48("3093");
    await removeHistoryItem(itemId);
    chrome.runtime.sendMessage(stryMutAct_9fa48("3094") ? {} : (stryCov_9fa48("3094"), {
      type: stryMutAct_9fa48("3095") ? "" : (stryCov_9fa48("3095"), "historyUpdated")
    }));
  }
}

/**
 * Sanitizes a filename to be safe for filesystem storage
 * @param name - Filename to sanitize
 * @returns Sanitized filename
 */
function sanitizeFilename(name: string): string {
  if (stryMutAct_9fa48("3096")) {
    {}
  } else {
    stryCov_9fa48("3096");
    // Remove invalid characters for filenames
    return stryMutAct_9fa48("3097") ? name.replace(/[/\\?%*:|"<>]/g, "-") // Replace invalid chars with dash
    .replace(/\s+/g, "_") // Replace spaces with underscore
    .replace(/^\.+/, "") // Remove leading dots
    : (stryCov_9fa48("3097"), name.replace(stryMutAct_9fa48("3098") ? /[^/\\?%*:|"<>]/g : (stryCov_9fa48("3098"), /[/\\?%*:|"<>]/g), stryMutAct_9fa48("3099") ? "" : (stryCov_9fa48("3099"), "-")) // Replace invalid chars with dash
    .replace(stryMutAct_9fa48("3101") ? /\S+/g : stryMutAct_9fa48("3100") ? /\s/g : (stryCov_9fa48("3100", "3101"), /\s+/g), stryMutAct_9fa48("3102") ? "" : (stryCov_9fa48("3102"), "_")) // Replace spaces with underscore
    .replace(stryMutAct_9fa48("3104") ? /^\./ : stryMutAct_9fa48("3103") ? /\.+/ : (stryCov_9fa48("3103", "3104"), /^\.+/), stryMutAct_9fa48("3105") ? "Stryker was here!" : (stryCov_9fa48("3105"), "")) // Remove leading dots
    .trim());
  }
}

// Export for testing (these are already exported above)
// export { fetchHistory, renderHistoryItems, addToHistory, clearHistory, removeHistoryItem };