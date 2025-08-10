/**
 * Centralized validation service for the Enhanced Video Downloader extension.
 * Provides consistent validation logic across all components.
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
export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}
export interface Validator {
  validate(value: any, context?: any): ValidationResult;
}
export interface FieldConfig {
  name: string;
  type: "text" | "number" | "select" | "checkbox" | "url" | "path";
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => ValidationResult;
}

/**
 * Centralized Validation Service
 * Provides consistent validation across all extension components
 */
export class ValidationService {
  private static instance: ValidationService;
  private validators: Map<string, Validator> = new Map();
  private fieldConfigs: Map<string, FieldConfig> = new Map();
  private constructor() {
    if (stryMutAct_9fa48("2460")) {
      {}
    } else {
      stryCov_9fa48("2460");
      this.registerDefaultValidators();
    }
  }

  /**
   * Get the singleton instance of the validation service
   */
  static getInstance(): ValidationService {
    if (stryMutAct_9fa48("2461")) {
      {}
    } else {
      stryCov_9fa48("2461");
      if (stryMutAct_9fa48("2464") ? false : stryMutAct_9fa48("2463") ? true : stryMutAct_9fa48("2462") ? ValidationService.instance : (stryCov_9fa48("2462", "2463", "2464"), !ValidationService.instance)) {
        if (stryMutAct_9fa48("2465")) {
          {}
        } else {
          stryCov_9fa48("2465");
          ValidationService.instance = new ValidationService();
        }
      }
      return ValidationService.instance;
    }
  }

  /**
   * Register default validators
   */
  private registerDefaultValidators(): void {
    if (stryMutAct_9fa48("2466")) {
      {}
    } else {
      stryCov_9fa48("2466");
      // Port validation
      this.validators.set(stryMutAct_9fa48("2467") ? "" : (stryCov_9fa48("2467"), "port"), stryMutAct_9fa48("2468") ? {} : (stryCov_9fa48("2468"), {
        validate: (value: any): ValidationResult => {
          if (stryMutAct_9fa48("2469")) {
            {}
          } else {
            stryCov_9fa48("2469");
            const port = parseInt(value, 10);
            if (stryMutAct_9fa48("2472") ? (value === "" || value === null) && value === undefined : stryMutAct_9fa48("2471") ? false : stryMutAct_9fa48("2470") ? true : (stryCov_9fa48("2470", "2471", "2472"), (stryMutAct_9fa48("2474") ? value === "" && value === null : stryMutAct_9fa48("2473") ? false : (stryCov_9fa48("2473", "2474"), (stryMutAct_9fa48("2476") ? value !== "" : stryMutAct_9fa48("2475") ? false : (stryCov_9fa48("2475", "2476"), value === (stryMutAct_9fa48("2477") ? "Stryker was here!" : (stryCov_9fa48("2477"), "")))) || (stryMutAct_9fa48("2479") ? value !== null : stryMutAct_9fa48("2478") ? false : (stryCov_9fa48("2478", "2479"), value === null)))) || (stryMutAct_9fa48("2481") ? value !== undefined : stryMutAct_9fa48("2480") ? false : (stryCov_9fa48("2480", "2481"), value === undefined)))) {
              if (stryMutAct_9fa48("2482")) {
                {}
              } else {
                stryCov_9fa48("2482");
                return stryMutAct_9fa48("2483") ? {} : (stryCov_9fa48("2483"), {
                  valid: stryMutAct_9fa48("2484") ? true : (stryCov_9fa48("2484"), false),
                  error: stryMutAct_9fa48("2485") ? "" : (stryCov_9fa48("2485"), "Port is required")
                });
              }
            }
            if (stryMutAct_9fa48("2487") ? false : stryMutAct_9fa48("2486") ? true : (stryCov_9fa48("2486", "2487"), isNaN(port))) {
              if (stryMutAct_9fa48("2488")) {
                {}
              } else {
                stryCov_9fa48("2488");
                return stryMutAct_9fa48("2489") ? {} : (stryCov_9fa48("2489"), {
                  valid: stryMutAct_9fa48("2490") ? true : (stryCov_9fa48("2490"), false),
                  error: stryMutAct_9fa48("2491") ? "" : (stryCov_9fa48("2491"), "Port must be a valid number")
                });
              }
            }
            if (stryMutAct_9fa48("2494") ? port < 1 && port > 65535 : stryMutAct_9fa48("2493") ? false : stryMutAct_9fa48("2492") ? true : (stryCov_9fa48("2492", "2493", "2494"), (stryMutAct_9fa48("2497") ? port >= 1 : stryMutAct_9fa48("2496") ? port <= 1 : stryMutAct_9fa48("2495") ? false : (stryCov_9fa48("2495", "2496", "2497"), port < 1)) || (stryMutAct_9fa48("2500") ? port <= 65535 : stryMutAct_9fa48("2499") ? port >= 65535 : stryMutAct_9fa48("2498") ? false : (stryCov_9fa48("2498", "2499", "2500"), port > 65535)))) {
              if (stryMutAct_9fa48("2501")) {
                {}
              } else {
                stryCov_9fa48("2501");
                return stryMutAct_9fa48("2502") ? {} : (stryCov_9fa48("2502"), {
                  valid: stryMutAct_9fa48("2503") ? true : (stryCov_9fa48("2503"), false),
                  error: stryMutAct_9fa48("2504") ? "" : (stryCov_9fa48("2504"), "Port must be between 1 and 65535")
                });
              }
            }
            return stryMutAct_9fa48("2505") ? {} : (stryCov_9fa48("2505"), {
              valid: stryMutAct_9fa48("2506") ? false : (stryCov_9fa48("2506"), true)
            });
          }
        }
      }));

      // URL validation
      this.validators.set(stryMutAct_9fa48("2507") ? "" : (stryCov_9fa48("2507"), "url"), stryMutAct_9fa48("2508") ? {} : (stryCov_9fa48("2508"), {
        validate: (value: any): ValidationResult => {
          if (stryMutAct_9fa48("2509")) {
            {}
          } else {
            stryCov_9fa48("2509");
            if (stryMutAct_9fa48("2512") ? !value && value.trim() === "" : stryMutAct_9fa48("2511") ? false : stryMutAct_9fa48("2510") ? true : (stryCov_9fa48("2510", "2511", "2512"), (stryMutAct_9fa48("2513") ? value : (stryCov_9fa48("2513"), !value)) || (stryMutAct_9fa48("2515") ? value.trim() !== "" : stryMutAct_9fa48("2514") ? false : (stryCov_9fa48("2514", "2515"), (stryMutAct_9fa48("2516") ? value : (stryCov_9fa48("2516"), value.trim())) === (stryMutAct_9fa48("2517") ? "Stryker was here!" : (stryCov_9fa48("2517"), "")))))) {
              if (stryMutAct_9fa48("2518")) {
                {}
              } else {
                stryCov_9fa48("2518");
                return stryMutAct_9fa48("2519") ? {} : (stryCov_9fa48("2519"), {
                  valid: stryMutAct_9fa48("2520") ? true : (stryCov_9fa48("2520"), false),
                  error: stryMutAct_9fa48("2521") ? "" : (stryCov_9fa48("2521"), "URL is required")
                });
              }
            }
            try {
              if (stryMutAct_9fa48("2522")) {
                {}
              } else {
                stryCov_9fa48("2522");
                new URL(value);
                return stryMutAct_9fa48("2523") ? {} : (stryCov_9fa48("2523"), {
                  valid: stryMutAct_9fa48("2524") ? false : (stryCov_9fa48("2524"), true)
                });
              }
            } catch {
              if (stryMutAct_9fa48("2525")) {
                {}
              } else {
                stryCov_9fa48("2525");
                return stryMutAct_9fa48("2526") ? {} : (stryCov_9fa48("2526"), {
                  valid: stryMutAct_9fa48("2527") ? true : (stryCov_9fa48("2527"), false),
                  error: stryMutAct_9fa48("2528") ? "" : (stryCov_9fa48("2528"), "Invalid URL format")
                });
              }
            }
          }
        }
      }));

      // Path validation
      this.validators.set(stryMutAct_9fa48("2529") ? "" : (stryCov_9fa48("2529"), "path"), stryMutAct_9fa48("2530") ? {} : (stryCov_9fa48("2530"), {
        validate: (value: any): ValidationResult => {
          if (stryMutAct_9fa48("2531")) {
            {}
          } else {
            stryCov_9fa48("2531");
            if (stryMutAct_9fa48("2534") ? !value && value.trim() === "" : stryMutAct_9fa48("2533") ? false : stryMutAct_9fa48("2532") ? true : (stryCov_9fa48("2532", "2533", "2534"), (stryMutAct_9fa48("2535") ? value : (stryCov_9fa48("2535"), !value)) || (stryMutAct_9fa48("2537") ? value.trim() !== "" : stryMutAct_9fa48("2536") ? false : (stryCov_9fa48("2536", "2537"), (stryMutAct_9fa48("2538") ? value : (stryCov_9fa48("2538"), value.trim())) === (stryMutAct_9fa48("2539") ? "Stryker was here!" : (stryCov_9fa48("2539"), "")))))) {
              if (stryMutAct_9fa48("2540")) {
                {}
              } else {
                stryCov_9fa48("2540");
                return stryMutAct_9fa48("2541") ? {} : (stryCov_9fa48("2541"), {
                  valid: stryMutAct_9fa48("2542") ? true : (stryCov_9fa48("2542"), false),
                  error: stryMutAct_9fa48("2543") ? "" : (stryCov_9fa48("2543"), "Path is required")
                });
              }
            }

            // Basic path validation - can be enhanced based on platform
            if (stryMutAct_9fa48("2546") ? value.includes("..") && value.includes("//") : stryMutAct_9fa48("2545") ? false : stryMutAct_9fa48("2544") ? true : (stryCov_9fa48("2544", "2545", "2546"), value.includes(stryMutAct_9fa48("2547") ? "" : (stryCov_9fa48("2547"), "..")) || value.includes(stryMutAct_9fa48("2548") ? "" : (stryCov_9fa48("2548"), "//")))) {
              if (stryMutAct_9fa48("2549")) {
                {}
              } else {
                stryCov_9fa48("2549");
                return stryMutAct_9fa48("2550") ? {} : (stryCov_9fa48("2550"), {
                  valid: stryMutAct_9fa48("2551") ? true : (stryCov_9fa48("2551"), false),
                  error: stryMutAct_9fa48("2552") ? "" : (stryCov_9fa48("2552"), "Invalid path format")
                });
              }
            }
            return stryMutAct_9fa48("2553") ? {} : (stryCov_9fa48("2553"), {
              valid: stryMutAct_9fa48("2554") ? false : (stryCov_9fa48("2554"), true)
            });
          }
        }
      }));

      // Number range validation
      this.validators.set(stryMutAct_9fa48("2555") ? "" : (stryCov_9fa48("2555"), "number"), stryMutAct_9fa48("2556") ? {} : (stryCov_9fa48("2556"), {
        validate: (value: any, context?: {
          min?: number;
          max?: number;
        }): ValidationResult => {
          if (stryMutAct_9fa48("2557")) {
            {}
          } else {
            stryCov_9fa48("2557");
            const num = parseFloat(value);
            if (stryMutAct_9fa48("2559") ? false : stryMutAct_9fa48("2558") ? true : (stryCov_9fa48("2558", "2559"), isNaN(num))) {
              if (stryMutAct_9fa48("2560")) {
                {}
              } else {
                stryCov_9fa48("2560");
                return stryMutAct_9fa48("2561") ? {} : (stryCov_9fa48("2561"), {
                  valid: stryMutAct_9fa48("2562") ? true : (stryCov_9fa48("2562"), false),
                  error: stryMutAct_9fa48("2563") ? "" : (stryCov_9fa48("2563"), "Must be a valid number")
                });
              }
            }
            if (stryMutAct_9fa48("2566") ? context?.min !== undefined || num < context.min : stryMutAct_9fa48("2565") ? false : stryMutAct_9fa48("2564") ? true : (stryCov_9fa48("2564", "2565", "2566"), (stryMutAct_9fa48("2568") ? context?.min === undefined : stryMutAct_9fa48("2567") ? true : (stryCov_9fa48("2567", "2568"), (stryMutAct_9fa48("2569") ? context.min : (stryCov_9fa48("2569"), context?.min)) !== undefined)) && (stryMutAct_9fa48("2572") ? num >= context.min : stryMutAct_9fa48("2571") ? num <= context.min : stryMutAct_9fa48("2570") ? true : (stryCov_9fa48("2570", "2571", "2572"), num < context.min)))) {
              if (stryMutAct_9fa48("2573")) {
                {}
              } else {
                stryCov_9fa48("2573");
                return stryMutAct_9fa48("2574") ? {} : (stryCov_9fa48("2574"), {
                  valid: stryMutAct_9fa48("2575") ? true : (stryCov_9fa48("2575"), false),
                  error: stryMutAct_9fa48("2576") ? `` : (stryCov_9fa48("2576"), `Value must be at least ${context.min}`)
                });
              }
            }
            if (stryMutAct_9fa48("2579") ? context?.max !== undefined || num > context.max : stryMutAct_9fa48("2578") ? false : stryMutAct_9fa48("2577") ? true : (stryCov_9fa48("2577", "2578", "2579"), (stryMutAct_9fa48("2581") ? context?.max === undefined : stryMutAct_9fa48("2580") ? true : (stryCov_9fa48("2580", "2581"), (stryMutAct_9fa48("2582") ? context.max : (stryCov_9fa48("2582"), context?.max)) !== undefined)) && (stryMutAct_9fa48("2585") ? num <= context.max : stryMutAct_9fa48("2584") ? num >= context.max : stryMutAct_9fa48("2583") ? true : (stryCov_9fa48("2583", "2584", "2585"), num > context.max)))) {
              if (stryMutAct_9fa48("2586")) {
                {}
              } else {
                stryCov_9fa48("2586");
                return stryMutAct_9fa48("2587") ? {} : (stryCov_9fa48("2587"), {
                  valid: stryMutAct_9fa48("2588") ? true : (stryCov_9fa48("2588"), false),
                  error: stryMutAct_9fa48("2589") ? `` : (stryCov_9fa48("2589"), `Value must be at most ${context.max}`)
                });
              }
            }
            return stryMutAct_9fa48("2590") ? {} : (stryCov_9fa48("2590"), {
              valid: stryMutAct_9fa48("2591") ? false : (stryCov_9fa48("2591"), true)
            });
          }
        }
      }));

      // Text validation
      this.validators.set(stryMutAct_9fa48("2592") ? "" : (stryCov_9fa48("2592"), "text"), stryMutAct_9fa48("2593") ? {} : (stryCov_9fa48("2593"), {
        validate: (value: any, context?: {
          minLength?: number;
          maxLength?: number;
          pattern?: RegExp;
        }): ValidationResult => {
          if (stryMutAct_9fa48("2594")) {
            {}
          } else {
            stryCov_9fa48("2594");
            if (stryMutAct_9fa48("2597") ? !value && value.trim() === "" : stryMutAct_9fa48("2596") ? false : stryMutAct_9fa48("2595") ? true : (stryCov_9fa48("2595", "2596", "2597"), (stryMutAct_9fa48("2598") ? value : (stryCov_9fa48("2598"), !value)) || (stryMutAct_9fa48("2600") ? value.trim() !== "" : stryMutAct_9fa48("2599") ? false : (stryCov_9fa48("2599", "2600"), (stryMutAct_9fa48("2601") ? value : (stryCov_9fa48("2601"), value.trim())) === (stryMutAct_9fa48("2602") ? "Stryker was here!" : (stryCov_9fa48("2602"), "")))))) {
              if (stryMutAct_9fa48("2603")) {
                {}
              } else {
                stryCov_9fa48("2603");
                return stryMutAct_9fa48("2604") ? {} : (stryCov_9fa48("2604"), {
                  valid: stryMutAct_9fa48("2605") ? true : (stryCov_9fa48("2605"), false),
                  error: stryMutAct_9fa48("2606") ? "" : (stryCov_9fa48("2606"), "Text is required")
                });
              }
            }
            const trimmedValue = stryMutAct_9fa48("2607") ? value : (stryCov_9fa48("2607"), value.trim());
            if (stryMutAct_9fa48("2610") ? context?.minLength !== undefined || trimmedValue.length < context.minLength : stryMutAct_9fa48("2609") ? false : stryMutAct_9fa48("2608") ? true : (stryCov_9fa48("2608", "2609", "2610"), (stryMutAct_9fa48("2612") ? context?.minLength === undefined : stryMutAct_9fa48("2611") ? true : (stryCov_9fa48("2611", "2612"), (stryMutAct_9fa48("2613") ? context.minLength : (stryCov_9fa48("2613"), context?.minLength)) !== undefined)) && (stryMutAct_9fa48("2616") ? trimmedValue.length >= context.minLength : stryMutAct_9fa48("2615") ? trimmedValue.length <= context.minLength : stryMutAct_9fa48("2614") ? true : (stryCov_9fa48("2614", "2615", "2616"), trimmedValue.length < context.minLength)))) {
              if (stryMutAct_9fa48("2617")) {
                {}
              } else {
                stryCov_9fa48("2617");
                return stryMutAct_9fa48("2618") ? {} : (stryCov_9fa48("2618"), {
                  valid: stryMutAct_9fa48("2619") ? true : (stryCov_9fa48("2619"), false),
                  error: stryMutAct_9fa48("2620") ? `` : (stryCov_9fa48("2620"), `Text must be at least ${context.minLength} characters`)
                });
              }
            }
            if (stryMutAct_9fa48("2623") ? context?.maxLength !== undefined || trimmedValue.length > context.maxLength : stryMutAct_9fa48("2622") ? false : stryMutAct_9fa48("2621") ? true : (stryCov_9fa48("2621", "2622", "2623"), (stryMutAct_9fa48("2625") ? context?.maxLength === undefined : stryMutAct_9fa48("2624") ? true : (stryCov_9fa48("2624", "2625"), (stryMutAct_9fa48("2626") ? context.maxLength : (stryCov_9fa48("2626"), context?.maxLength)) !== undefined)) && (stryMutAct_9fa48("2629") ? trimmedValue.length <= context.maxLength : stryMutAct_9fa48("2628") ? trimmedValue.length >= context.maxLength : stryMutAct_9fa48("2627") ? true : (stryCov_9fa48("2627", "2628", "2629"), trimmedValue.length > context.maxLength)))) {
              if (stryMutAct_9fa48("2630")) {
                {}
              } else {
                stryCov_9fa48("2630");
                return stryMutAct_9fa48("2631") ? {} : (stryCov_9fa48("2631"), {
                  valid: stryMutAct_9fa48("2632") ? true : (stryCov_9fa48("2632"), false),
                  error: stryMutAct_9fa48("2633") ? `` : (stryCov_9fa48("2633"), `Text must be at most ${context.maxLength} characters`)
                });
              }
            }
            if (stryMutAct_9fa48("2636") ? context?.pattern || !context.pattern.test(trimmedValue) : stryMutAct_9fa48("2635") ? false : stryMutAct_9fa48("2634") ? true : (stryCov_9fa48("2634", "2635", "2636"), (stryMutAct_9fa48("2637") ? context.pattern : (stryCov_9fa48("2637"), context?.pattern)) && (stryMutAct_9fa48("2638") ? context.pattern.test(trimmedValue) : (stryCov_9fa48("2638"), !context.pattern.test(trimmedValue))))) {
              if (stryMutAct_9fa48("2639")) {
                {}
              } else {
                stryCov_9fa48("2639");
                return stryMutAct_9fa48("2640") ? {} : (stryCov_9fa48("2640"), {
                  valid: stryMutAct_9fa48("2641") ? true : (stryCov_9fa48("2641"), false),
                  error: stryMutAct_9fa48("2642") ? "" : (stryCov_9fa48("2642"), "Text format is invalid")
                });
              }
            }
            return stryMutAct_9fa48("2643") ? {} : (stryCov_9fa48("2643"), {
              valid: stryMutAct_9fa48("2644") ? false : (stryCov_9fa48("2644"), true)
            });
          }
        }
      }));

      // Select validation
      this.validators.set(stryMutAct_9fa48("2645") ? "" : (stryCov_9fa48("2645"), "select"), stryMutAct_9fa48("2646") ? {} : (stryCov_9fa48("2646"), {
        validate: (value: any, context?: {
          options?: string[];
        }): ValidationResult => {
          if (stryMutAct_9fa48("2647")) {
            {}
          } else {
            stryCov_9fa48("2647");
            if (stryMutAct_9fa48("2650") ? !value && value.trim() === "" : stryMutAct_9fa48("2649") ? false : stryMutAct_9fa48("2648") ? true : (stryCov_9fa48("2648", "2649", "2650"), (stryMutAct_9fa48("2651") ? value : (stryCov_9fa48("2651"), !value)) || (stryMutAct_9fa48("2653") ? value.trim() !== "" : stryMutAct_9fa48("2652") ? false : (stryCov_9fa48("2652", "2653"), (stryMutAct_9fa48("2654") ? value : (stryCov_9fa48("2654"), value.trim())) === (stryMutAct_9fa48("2655") ? "Stryker was here!" : (stryCov_9fa48("2655"), "")))))) {
              if (stryMutAct_9fa48("2656")) {
                {}
              } else {
                stryCov_9fa48("2656");
                return stryMutAct_9fa48("2657") ? {} : (stryCov_9fa48("2657"), {
                  valid: stryMutAct_9fa48("2658") ? true : (stryCov_9fa48("2658"), false),
                  error: stryMutAct_9fa48("2659") ? "" : (stryCov_9fa48("2659"), "Selection is required")
                });
              }
            }
            if (stryMutAct_9fa48("2662") ? context?.options || !context.options.includes(value) : stryMutAct_9fa48("2661") ? false : stryMutAct_9fa48("2660") ? true : (stryCov_9fa48("2660", "2661", "2662"), (stryMutAct_9fa48("2663") ? context.options : (stryCov_9fa48("2663"), context?.options)) && (stryMutAct_9fa48("2664") ? context.options.includes(value) : (stryCov_9fa48("2664"), !context.options.includes(value))))) {
              if (stryMutAct_9fa48("2665")) {
                {}
              } else {
                stryCov_9fa48("2665");
                return stryMutAct_9fa48("2666") ? {} : (stryCov_9fa48("2666"), {
                  valid: stryMutAct_9fa48("2667") ? true : (stryCov_9fa48("2667"), false),
                  error: stryMutAct_9fa48("2668") ? "" : (stryCov_9fa48("2668"), "Invalid selection")
                });
              }
            }
            return stryMutAct_9fa48("2669") ? {} : (stryCov_9fa48("2669"), {
              valid: stryMutAct_9fa48("2670") ? false : (stryCov_9fa48("2670"), true)
            });
          }
        }
      }));
    }
  }

  /**
   * Register a custom validator
   */
  registerValidator(name: string, validator: Validator): void {
    if (stryMutAct_9fa48("2671")) {
      {}
    } else {
      stryCov_9fa48("2671");
      this.validators.set(name, validator);
    }
  }

  /**
   * Register a field configuration
   */
  registerField(name: string, config: FieldConfig): void {
    if (stryMutAct_9fa48("2672")) {
      {}
    } else {
      stryCov_9fa48("2672");
      this.fieldConfigs.set(name, config);
    }
  }

  /**
   * Validate a value using a specific validator
   */
  validate(validatorName: string, value: any, context?: any): ValidationResult {
    if (stryMutAct_9fa48("2673")) {
      {}
    } else {
      stryCov_9fa48("2673");
      const validator = this.validators.get(validatorName);
      if (stryMutAct_9fa48("2676") ? false : stryMutAct_9fa48("2675") ? true : stryMutAct_9fa48("2674") ? validator : (stryCov_9fa48("2674", "2675", "2676"), !validator)) {
        if (stryMutAct_9fa48("2677")) {
          {}
        } else {
          stryCov_9fa48("2677");
          return stryMutAct_9fa48("2678") ? {} : (stryCov_9fa48("2678"), {
            valid: stryMutAct_9fa48("2679") ? false : (stryCov_9fa48("2679"), true)
          }); // Default to valid if no validator found
        }
      }
      return validator.validate(value, context);
    }
  }

  /**
   * Validate a field using its configuration
   */
  validateField(fieldName: string, value: any): ValidationResult {
    if (stryMutAct_9fa48("2680")) {
      {}
    } else {
      stryCov_9fa48("2680");
      const config = this.fieldConfigs.get(fieldName);
      if (stryMutAct_9fa48("2683") ? false : stryMutAct_9fa48("2682") ? true : stryMutAct_9fa48("2681") ? config : (stryCov_9fa48("2681", "2682", "2683"), !config)) {
        if (stryMutAct_9fa48("2684")) {
          {}
        } else {
          stryCov_9fa48("2684");
          return stryMutAct_9fa48("2685") ? {} : (stryCov_9fa48("2685"), {
            valid: stryMutAct_9fa48("2686") ? false : (stryCov_9fa48("2686"), true)
          }); // Default to valid if no config found
        }
      }

      // Check required
      if (stryMutAct_9fa48("2689") ? config.required || !value || value.toString().trim() === "" : stryMutAct_9fa48("2688") ? false : stryMutAct_9fa48("2687") ? true : (stryCov_9fa48("2687", "2688", "2689"), config.required && (stryMutAct_9fa48("2691") ? !value && value.toString().trim() === "" : stryMutAct_9fa48("2690") ? true : (stryCov_9fa48("2690", "2691"), (stryMutAct_9fa48("2692") ? value : (stryCov_9fa48("2692"), !value)) || (stryMutAct_9fa48("2694") ? value.toString().trim() !== "" : stryMutAct_9fa48("2693") ? false : (stryCov_9fa48("2693", "2694"), (stryMutAct_9fa48("2695") ? value.toString() : (stryCov_9fa48("2695"), value.toString().trim())) === (stryMutAct_9fa48("2696") ? "Stryker was here!" : (stryCov_9fa48("2696"), "")))))))) {
        if (stryMutAct_9fa48("2697")) {
          {}
        } else {
          stryCov_9fa48("2697");
          return stryMutAct_9fa48("2698") ? {} : (stryCov_9fa48("2698"), {
            valid: stryMutAct_9fa48("2699") ? true : (stryCov_9fa48("2699"), false),
            error: stryMutAct_9fa48("2700") ? `` : (stryCov_9fa48("2700"), `${config.name} is required`)
          });
        }
      }

      // If not required and empty, consider valid
      if (stryMutAct_9fa48("2703") ? !config.required || !value || value.toString().trim() === "" : stryMutAct_9fa48("2702") ? false : stryMutAct_9fa48("2701") ? true : (stryCov_9fa48("2701", "2702", "2703"), (stryMutAct_9fa48("2704") ? config.required : (stryCov_9fa48("2704"), !config.required)) && (stryMutAct_9fa48("2706") ? !value && value.toString().trim() === "" : stryMutAct_9fa48("2705") ? true : (stryCov_9fa48("2705", "2706"), (stryMutAct_9fa48("2707") ? value : (stryCov_9fa48("2707"), !value)) || (stryMutAct_9fa48("2709") ? value.toString().trim() !== "" : stryMutAct_9fa48("2708") ? false : (stryCov_9fa48("2708", "2709"), (stryMutAct_9fa48("2710") ? value.toString() : (stryCov_9fa48("2710"), value.toString().trim())) === (stryMutAct_9fa48("2711") ? "Stryker was here!" : (stryCov_9fa48("2711"), "")))))))) {
        if (stryMutAct_9fa48("2712")) {
          {}
        } else {
          stryCov_9fa48("2712");
          return stryMutAct_9fa48("2713") ? {} : (stryCov_9fa48("2713"), {
            valid: stryMutAct_9fa48("2714") ? false : (stryCov_9fa48("2714"), true)
          });
        }
      }

      // Get the appropriate validator
      const validator = this.validators.get(config.type);
      if (stryMutAct_9fa48("2717") ? false : stryMutAct_9fa48("2716") ? true : stryMutAct_9fa48("2715") ? validator : (stryCov_9fa48("2715", "2716", "2717"), !validator)) {
        if (stryMutAct_9fa48("2718")) {
          {}
        } else {
          stryCov_9fa48("2718");
          return stryMutAct_9fa48("2719") ? {} : (stryCov_9fa48("2719"), {
            valid: stryMutAct_9fa48("2720") ? false : (stryCov_9fa48("2720"), true)
          }); // Default to valid if no validator found
        }
      }

      // Build context for validation
      const context: any = {};
      if (stryMutAct_9fa48("2723") ? config.min === undefined : stryMutAct_9fa48("2722") ? false : stryMutAct_9fa48("2721") ? true : (stryCov_9fa48("2721", "2722", "2723"), config.min !== undefined)) {
        if (stryMutAct_9fa48("2724")) {
          {}
        } else {
          stryCov_9fa48("2724");
          // For text type, map min/max to minLength/maxLength
          if (stryMutAct_9fa48("2727") ? config.type !== "text" : stryMutAct_9fa48("2726") ? false : stryMutAct_9fa48("2725") ? true : (stryCov_9fa48("2725", "2726", "2727"), config.type === (stryMutAct_9fa48("2728") ? "" : (stryCov_9fa48("2728"), "text")))) {
            if (stryMutAct_9fa48("2729")) {
              {}
            } else {
              stryCov_9fa48("2729");
              context.minLength = config.min;
            }
          } else {
            if (stryMutAct_9fa48("2730")) {
              {}
            } else {
              stryCov_9fa48("2730");
              context.min = config.min;
            }
          }
        }
      }
      if (stryMutAct_9fa48("2733") ? config.max === undefined : stryMutAct_9fa48("2732") ? false : stryMutAct_9fa48("2731") ? true : (stryCov_9fa48("2731", "2732", "2733"), config.max !== undefined)) {
        if (stryMutAct_9fa48("2734")) {
          {}
        } else {
          stryCov_9fa48("2734");
          // For text type, map min/max to minLength/maxLength
          if (stryMutAct_9fa48("2737") ? config.type !== "text" : stryMutAct_9fa48("2736") ? false : stryMutAct_9fa48("2735") ? true : (stryCov_9fa48("2735", "2736", "2737"), config.type === (stryMutAct_9fa48("2738") ? "" : (stryCov_9fa48("2738"), "text")))) {
            if (stryMutAct_9fa48("2739")) {
              {}
            } else {
              stryCov_9fa48("2739");
              context.maxLength = config.max;
            }
          } else {
            if (stryMutAct_9fa48("2740")) {
              {}
            } else {
              stryCov_9fa48("2740");
              context.max = config.max;
            }
          }
        }
      }
      if (stryMutAct_9fa48("2742") ? false : stryMutAct_9fa48("2741") ? true : (stryCov_9fa48("2741", "2742"), config.pattern)) context.pattern = config.pattern;

      // Run validation
      const result = validator.validate(value, context);

      // Run custom validator if provided
      if (stryMutAct_9fa48("2745") ? config.customValidator || result.valid : stryMutAct_9fa48("2744") ? false : stryMutAct_9fa48("2743") ? true : (stryCov_9fa48("2743", "2744", "2745"), config.customValidator && result.valid)) {
        if (stryMutAct_9fa48("2746")) {
          {}
        } else {
          stryCov_9fa48("2746");
          const customResult = config.customValidator(value);
          if (stryMutAct_9fa48("2749") ? false : stryMutAct_9fa48("2748") ? true : stryMutAct_9fa48("2747") ? customResult.valid : (stryCov_9fa48("2747", "2748", "2749"), !customResult.valid)) {
            if (stryMutAct_9fa48("2750")) {
              {}
            } else {
              stryCov_9fa48("2750");
              return customResult;
            }
          }
        }
      }
      return result;
    }
  }

  /**
   * Validate multiple fields at once
   */
  validateFields(fields: Record<string, any>): Record<string, ValidationResult> {
    if (stryMutAct_9fa48("2751")) {
      {}
    } else {
      stryCov_9fa48("2751");
      const results: Record<string, ValidationResult> = {};
      for (const [fieldName, value] of Object.entries(fields)) {
        if (stryMutAct_9fa48("2752")) {
          {}
        } else {
          stryCov_9fa48("2752");
          results[fieldName] = this.validateField(fieldName, value);
        }
      }
      return results;
    }
  }

  /**
   * Check if all validations pass
   */
  isValid(results: Record<string, ValidationResult>): boolean {
    if (stryMutAct_9fa48("2753")) {
      {}
    } else {
      stryCov_9fa48("2753");
      return stryMutAct_9fa48("2754") ? Object.values(results).some(result => result.valid) : (stryCov_9fa48("2754"), Object.values(results).every(stryMutAct_9fa48("2755") ? () => undefined : (stryCov_9fa48("2755"), result => result.valid)));
    }
  }

  /**
   * Get all validation errors
   */
  getErrors(results: Record<string, ValidationResult>): Record<string, string> {
    if (stryMutAct_9fa48("2756")) {
      {}
    } else {
      stryCov_9fa48("2756");
      const errors: Record<string, string> = {};
      for (const [fieldName, result] of Object.entries(results)) {
        if (stryMutAct_9fa48("2757")) {
          {}
        } else {
          stryCov_9fa48("2757");
          if (stryMutAct_9fa48("2760") ? !result.valid || result.error : stryMutAct_9fa48("2759") ? false : stryMutAct_9fa48("2758") ? true : (stryCov_9fa48("2758", "2759", "2760"), (stryMutAct_9fa48("2761") ? result.valid : (stryCov_9fa48("2761"), !result.valid)) && result.error)) {
            if (stryMutAct_9fa48("2762")) {
              {}
            } else {
              stryCov_9fa48("2762");
              errors[fieldName] = result.error;
            }
          }
        }
      }
      return errors;
    }
  }

  /**
   * Pre-configure common field types
   */
  configureCommonFields(): void {
    if (stryMutAct_9fa48("2763")) {
      {}
    } else {
      stryCov_9fa48("2763");
      // Port field
      this.registerField(stryMutAct_9fa48("2764") ? "" : (stryCov_9fa48("2764"), "serverPort"), stryMutAct_9fa48("2765") ? {} : (stryCov_9fa48("2765"), {
        name: stryMutAct_9fa48("2766") ? "" : (stryCov_9fa48("2766"), "Server Port"),
        type: stryMutAct_9fa48("2767") ? "" : (stryCov_9fa48("2767"), "number"),
        required: stryMutAct_9fa48("2768") ? false : (stryCov_9fa48("2768"), true),
        min: 1,
        max: 65535
      }));

      // Download directory field
      this.registerField(stryMutAct_9fa48("2769") ? "" : (stryCov_9fa48("2769"), "downloadDir"), stryMutAct_9fa48("2770") ? {} : (stryCov_9fa48("2770"), {
        name: stryMutAct_9fa48("2771") ? "" : (stryCov_9fa48("2771"), "Download Directory"),
        type: stryMutAct_9fa48("2772") ? "" : (stryCov_9fa48("2772"), "path"),
        required: stryMutAct_9fa48("2773") ? false : (stryCov_9fa48("2773"), true)
      }));

      // Log level field
      this.registerField(stryMutAct_9fa48("2774") ? "" : (stryCov_9fa48("2774"), "logLevel"), stryMutAct_9fa48("2775") ? {} : (stryCov_9fa48("2775"), {
        name: stryMutAct_9fa48("2776") ? "" : (stryCov_9fa48("2776"), "Log Level"),
        type: stryMutAct_9fa48("2777") ? "" : (stryCov_9fa48("2777"), "select"),
        required: stryMutAct_9fa48("2778") ? false : (stryCov_9fa48("2778"), true),
        customValidator: (value: any) => {
          if (stryMutAct_9fa48("2779")) {
            {}
          } else {
            stryCov_9fa48("2779");
            const validLevels = stryMutAct_9fa48("2780") ? [] : (stryCov_9fa48("2780"), [stryMutAct_9fa48("2781") ? "" : (stryCov_9fa48("2781"), "DEBUG"), stryMutAct_9fa48("2782") ? "" : (stryCov_9fa48("2782"), "INFO"), stryMutAct_9fa48("2783") ? "" : (stryCov_9fa48("2783"), "WARNING"), stryMutAct_9fa48("2784") ? "" : (stryCov_9fa48("2784"), "ERROR")]);
            if (stryMutAct_9fa48("2787") ? false : stryMutAct_9fa48("2786") ? true : stryMutAct_9fa48("2785") ? validLevels.includes(value) : (stryCov_9fa48("2785", "2786", "2787"), !validLevels.includes(value))) {
              if (stryMutAct_9fa48("2788")) {
                {}
              } else {
                stryCov_9fa48("2788");
                return stryMutAct_9fa48("2789") ? {} : (stryCov_9fa48("2789"), {
                  valid: stryMutAct_9fa48("2790") ? true : (stryCov_9fa48("2790"), false),
                  error: stryMutAct_9fa48("2791") ? "" : (stryCov_9fa48("2791"), "Invalid log level")
                });
              }
            }
            return stryMutAct_9fa48("2792") ? {} : (stryCov_9fa48("2792"), {
              valid: stryMutAct_9fa48("2793") ? false : (stryCov_9fa48("2793"), true)
            });
          }
        }
      }));

      // Format field
      this.registerField(stryMutAct_9fa48("2794") ? "" : (stryCov_9fa48("2794"), "format"), stryMutAct_9fa48("2795") ? {} : (stryCov_9fa48("2795"), {
        name: stryMutAct_9fa48("2796") ? "" : (stryCov_9fa48("2796"), "Format"),
        type: stryMutAct_9fa48("2797") ? "" : (stryCov_9fa48("2797"), "select"),
        required: stryMutAct_9fa48("2798") ? false : (stryCov_9fa48("2798"), true),
        customValidator: (value: any) => {
          if (stryMutAct_9fa48("2799")) {
            {}
          } else {
            stryCov_9fa48("2799");
            const validFormats = stryMutAct_9fa48("2800") ? [] : (stryCov_9fa48("2800"), [stryMutAct_9fa48("2801") ? "" : (stryCov_9fa48("2801"), "mp4"), stryMutAct_9fa48("2802") ? "" : (stryCov_9fa48("2802"), "webm"), stryMutAct_9fa48("2803") ? "" : (stryCov_9fa48("2803"), "mkv"), stryMutAct_9fa48("2804") ? "" : (stryCov_9fa48("2804"), "avi")]);
            if (stryMutAct_9fa48("2807") ? false : stryMutAct_9fa48("2806") ? true : stryMutAct_9fa48("2805") ? validFormats.includes(value) : (stryCov_9fa48("2805", "2806", "2807"), !validFormats.includes(value))) {
              if (stryMutAct_9fa48("2808")) {
                {}
              } else {
                stryCov_9fa48("2808");
                return stryMutAct_9fa48("2809") ? {} : (stryCov_9fa48("2809"), {
                  valid: stryMutAct_9fa48("2810") ? true : (stryCov_9fa48("2810"), false),
                  error: stryMutAct_9fa48("2811") ? "" : (stryCov_9fa48("2811"), "Invalid format")
                });
              }
            }
            return stryMutAct_9fa48("2812") ? {} : (stryCov_9fa48("2812"), {
              valid: stryMutAct_9fa48("2813") ? false : (stryCov_9fa48("2813"), true)
            });
          }
        }
      }));
    }
  }
}

// Export singleton instance
export const validationService = ValidationService.getInstance();