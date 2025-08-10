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
    if (stryMutAct_9fa48("163")) {
      {}
    } else {
      stryCov_9fa48("163");
      this.registerDefaultValidators();
    }
  }

  /**
   * Get the singleton instance of the validation service
   */
  static getInstance(): ValidationService {
    if (stryMutAct_9fa48("164")) {
      {}
    } else {
      stryCov_9fa48("164");
      if (stryMutAct_9fa48("167") ? false : stryMutAct_9fa48("166") ? true : stryMutAct_9fa48("165") ? ValidationService.instance : (stryCov_9fa48("165", "166", "167"), !ValidationService.instance)) {
        if (stryMutAct_9fa48("168")) {
          {}
        } else {
          stryCov_9fa48("168");
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
    if (stryMutAct_9fa48("169")) {
      {}
    } else {
      stryCov_9fa48("169");
      // Port validation
      this.validators.set(stryMutAct_9fa48("170") ? "" : (stryCov_9fa48("170"), "port"), stryMutAct_9fa48("171") ? {} : (stryCov_9fa48("171"), {
        validate: (value: any): ValidationResult => {
          if (stryMutAct_9fa48("172")) {
            {}
          } else {
            stryCov_9fa48("172");
            const port = parseInt(value, 10);
            if (stryMutAct_9fa48("175") ? (value === "" || value === null) && value === undefined : stryMutAct_9fa48("174") ? false : stryMutAct_9fa48("173") ? true : (stryCov_9fa48("173", "174", "175"), (stryMutAct_9fa48("177") ? value === "" && value === null : stryMutAct_9fa48("176") ? false : (stryCov_9fa48("176", "177"), (stryMutAct_9fa48("179") ? value !== "" : stryMutAct_9fa48("178") ? false : (stryCov_9fa48("178", "179"), value === (stryMutAct_9fa48("180") ? "Stryker was here!" : (stryCov_9fa48("180"), "")))) || (stryMutAct_9fa48("182") ? value !== null : stryMutAct_9fa48("181") ? false : (stryCov_9fa48("181", "182"), value === null)))) || (stryMutAct_9fa48("184") ? value !== undefined : stryMutAct_9fa48("183") ? false : (stryCov_9fa48("183", "184"), value === undefined)))) {
              if (stryMutAct_9fa48("185")) {
                {}
              } else {
                stryCov_9fa48("185");
                return stryMutAct_9fa48("186") ? {} : (stryCov_9fa48("186"), {
                  valid: stryMutAct_9fa48("187") ? true : (stryCov_9fa48("187"), false),
                  error: stryMutAct_9fa48("188") ? "" : (stryCov_9fa48("188"), "Port is required")
                });
              }
            }
            if (stryMutAct_9fa48("190") ? false : stryMutAct_9fa48("189") ? true : (stryCov_9fa48("189", "190"), isNaN(port))) {
              if (stryMutAct_9fa48("191")) {
                {}
              } else {
                stryCov_9fa48("191");
                return stryMutAct_9fa48("192") ? {} : (stryCov_9fa48("192"), {
                  valid: stryMutAct_9fa48("193") ? true : (stryCov_9fa48("193"), false),
                  error: stryMutAct_9fa48("194") ? "" : (stryCov_9fa48("194"), "Port must be a valid number")
                });
              }
            }
            if (stryMutAct_9fa48("197") ? port < 1 && port > 65535 : stryMutAct_9fa48("196") ? false : stryMutAct_9fa48("195") ? true : (stryCov_9fa48("195", "196", "197"), (stryMutAct_9fa48("200") ? port >= 1 : stryMutAct_9fa48("199") ? port <= 1 : stryMutAct_9fa48("198") ? false : (stryCov_9fa48("198", "199", "200"), port < 1)) || (stryMutAct_9fa48("203") ? port <= 65535 : stryMutAct_9fa48("202") ? port >= 65535 : stryMutAct_9fa48("201") ? false : (stryCov_9fa48("201", "202", "203"), port > 65535)))) {
              if (stryMutAct_9fa48("204")) {
                {}
              } else {
                stryCov_9fa48("204");
                return stryMutAct_9fa48("205") ? {} : (stryCov_9fa48("205"), {
                  valid: stryMutAct_9fa48("206") ? true : (stryCov_9fa48("206"), false),
                  error: stryMutAct_9fa48("207") ? "" : (stryCov_9fa48("207"), "Port must be between 1 and 65535")
                });
              }
            }
            return stryMutAct_9fa48("208") ? {} : (stryCov_9fa48("208"), {
              valid: stryMutAct_9fa48("209") ? false : (stryCov_9fa48("209"), true)
            });
          }
        }
      }));

      // URL validation
      this.validators.set(stryMutAct_9fa48("210") ? "" : (stryCov_9fa48("210"), "url"), stryMutAct_9fa48("211") ? {} : (stryCov_9fa48("211"), {
        validate: (value: any): ValidationResult => {
          if (stryMutAct_9fa48("212")) {
            {}
          } else {
            stryCov_9fa48("212");
            if (stryMutAct_9fa48("215") ? !value && value.trim() === "" : stryMutAct_9fa48("214") ? false : stryMutAct_9fa48("213") ? true : (stryCov_9fa48("213", "214", "215"), (stryMutAct_9fa48("216") ? value : (stryCov_9fa48("216"), !value)) || (stryMutAct_9fa48("218") ? value.trim() !== "" : stryMutAct_9fa48("217") ? false : (stryCov_9fa48("217", "218"), (stryMutAct_9fa48("219") ? value : (stryCov_9fa48("219"), value.trim())) === (stryMutAct_9fa48("220") ? "Stryker was here!" : (stryCov_9fa48("220"), "")))))) {
              if (stryMutAct_9fa48("221")) {
                {}
              } else {
                stryCov_9fa48("221");
                return stryMutAct_9fa48("222") ? {} : (stryCov_9fa48("222"), {
                  valid: stryMutAct_9fa48("223") ? true : (stryCov_9fa48("223"), false),
                  error: stryMutAct_9fa48("224") ? "" : (stryCov_9fa48("224"), "URL is required")
                });
              }
            }
            try {
              if (stryMutAct_9fa48("225")) {
                {}
              } else {
                stryCov_9fa48("225");
                new URL(value);
                return stryMutAct_9fa48("226") ? {} : (stryCov_9fa48("226"), {
                  valid: stryMutAct_9fa48("227") ? false : (stryCov_9fa48("227"), true)
                });
              }
            } catch {
              if (stryMutAct_9fa48("228")) {
                {}
              } else {
                stryCov_9fa48("228");
                return stryMutAct_9fa48("229") ? {} : (stryCov_9fa48("229"), {
                  valid: stryMutAct_9fa48("230") ? true : (stryCov_9fa48("230"), false),
                  error: stryMutAct_9fa48("231") ? "" : (stryCov_9fa48("231"), "Invalid URL format")
                });
              }
            }
          }
        }
      }));

      // Path validation
      this.validators.set(stryMutAct_9fa48("232") ? "" : (stryCov_9fa48("232"), "path"), stryMutAct_9fa48("233") ? {} : (stryCov_9fa48("233"), {
        validate: (value: any): ValidationResult => {
          if (stryMutAct_9fa48("234")) {
            {}
          } else {
            stryCov_9fa48("234");
            if (stryMutAct_9fa48("237") ? !value && value.trim() === "" : stryMutAct_9fa48("236") ? false : stryMutAct_9fa48("235") ? true : (stryCov_9fa48("235", "236", "237"), (stryMutAct_9fa48("238") ? value : (stryCov_9fa48("238"), !value)) || (stryMutAct_9fa48("240") ? value.trim() !== "" : stryMutAct_9fa48("239") ? false : (stryCov_9fa48("239", "240"), (stryMutAct_9fa48("241") ? value : (stryCov_9fa48("241"), value.trim())) === (stryMutAct_9fa48("242") ? "Stryker was here!" : (stryCov_9fa48("242"), "")))))) {
              if (stryMutAct_9fa48("243")) {
                {}
              } else {
                stryCov_9fa48("243");
                return stryMutAct_9fa48("244") ? {} : (stryCov_9fa48("244"), {
                  valid: stryMutAct_9fa48("245") ? true : (stryCov_9fa48("245"), false),
                  error: stryMutAct_9fa48("246") ? "" : (stryCov_9fa48("246"), "Path is required")
                });
              }
            }

            // Basic path validation - can be enhanced based on platform
            if (stryMutAct_9fa48("249") ? value.includes("..") && value.includes("//") : stryMutAct_9fa48("248") ? false : stryMutAct_9fa48("247") ? true : (stryCov_9fa48("247", "248", "249"), value.includes(stryMutAct_9fa48("250") ? "" : (stryCov_9fa48("250"), "..")) || value.includes(stryMutAct_9fa48("251") ? "" : (stryCov_9fa48("251"), "//")))) {
              if (stryMutAct_9fa48("252")) {
                {}
              } else {
                stryCov_9fa48("252");
                return stryMutAct_9fa48("253") ? {} : (stryCov_9fa48("253"), {
                  valid: stryMutAct_9fa48("254") ? true : (stryCov_9fa48("254"), false),
                  error: stryMutAct_9fa48("255") ? "" : (stryCov_9fa48("255"), "Invalid path format")
                });
              }
            }
            return stryMutAct_9fa48("256") ? {} : (stryCov_9fa48("256"), {
              valid: stryMutAct_9fa48("257") ? false : (stryCov_9fa48("257"), true)
            });
          }
        }
      }));

      // Number range validation
      this.validators.set(stryMutAct_9fa48("258") ? "" : (stryCov_9fa48("258"), "number"), stryMutAct_9fa48("259") ? {} : (stryCov_9fa48("259"), {
        validate: (value: any, context?: {
          min?: number;
          max?: number;
        }): ValidationResult => {
          if (stryMutAct_9fa48("260")) {
            {}
          } else {
            stryCov_9fa48("260");
            const num = parseFloat(value);
            if (stryMutAct_9fa48("262") ? false : stryMutAct_9fa48("261") ? true : (stryCov_9fa48("261", "262"), isNaN(num))) {
              if (stryMutAct_9fa48("263")) {
                {}
              } else {
                stryCov_9fa48("263");
                return stryMutAct_9fa48("264") ? {} : (stryCov_9fa48("264"), {
                  valid: stryMutAct_9fa48("265") ? true : (stryCov_9fa48("265"), false),
                  error: stryMutAct_9fa48("266") ? "" : (stryCov_9fa48("266"), "Must be a valid number")
                });
              }
            }
            if (stryMutAct_9fa48("269") ? context?.min !== undefined || num < context.min : stryMutAct_9fa48("268") ? false : stryMutAct_9fa48("267") ? true : (stryCov_9fa48("267", "268", "269"), (stryMutAct_9fa48("271") ? context?.min === undefined : stryMutAct_9fa48("270") ? true : (stryCov_9fa48("270", "271"), (stryMutAct_9fa48("272") ? context.min : (stryCov_9fa48("272"), context?.min)) !== undefined)) && (stryMutAct_9fa48("275") ? num >= context.min : stryMutAct_9fa48("274") ? num <= context.min : stryMutAct_9fa48("273") ? true : (stryCov_9fa48("273", "274", "275"), num < context.min)))) {
              if (stryMutAct_9fa48("276")) {
                {}
              } else {
                stryCov_9fa48("276");
                return stryMutAct_9fa48("277") ? {} : (stryCov_9fa48("277"), {
                  valid: stryMutAct_9fa48("278") ? true : (stryCov_9fa48("278"), false),
                  error: stryMutAct_9fa48("279") ? `` : (stryCov_9fa48("279"), `Value must be at least ${context.min}`)
                });
              }
            }
            if (stryMutAct_9fa48("282") ? context?.max !== undefined || num > context.max : stryMutAct_9fa48("281") ? false : stryMutAct_9fa48("280") ? true : (stryCov_9fa48("280", "281", "282"), (stryMutAct_9fa48("284") ? context?.max === undefined : stryMutAct_9fa48("283") ? true : (stryCov_9fa48("283", "284"), (stryMutAct_9fa48("285") ? context.max : (stryCov_9fa48("285"), context?.max)) !== undefined)) && (stryMutAct_9fa48("288") ? num <= context.max : stryMutAct_9fa48("287") ? num >= context.max : stryMutAct_9fa48("286") ? true : (stryCov_9fa48("286", "287", "288"), num > context.max)))) {
              if (stryMutAct_9fa48("289")) {
                {}
              } else {
                stryCov_9fa48("289");
                return stryMutAct_9fa48("290") ? {} : (stryCov_9fa48("290"), {
                  valid: stryMutAct_9fa48("291") ? true : (stryCov_9fa48("291"), false),
                  error: stryMutAct_9fa48("292") ? `` : (stryCov_9fa48("292"), `Value must be at most ${context.max}`)
                });
              }
            }
            return stryMutAct_9fa48("293") ? {} : (stryCov_9fa48("293"), {
              valid: stryMutAct_9fa48("294") ? false : (stryCov_9fa48("294"), true)
            });
          }
        }
      }));

      // Text validation
      this.validators.set(stryMutAct_9fa48("295") ? "" : (stryCov_9fa48("295"), "text"), stryMutAct_9fa48("296") ? {} : (stryCov_9fa48("296"), {
        validate: (value: any, context?: {
          minLength?: number;
          maxLength?: number;
          pattern?: RegExp;
        }): ValidationResult => {
          if (stryMutAct_9fa48("297")) {
            {}
          } else {
            stryCov_9fa48("297");
            if (stryMutAct_9fa48("300") ? !value && value.trim() === "" : stryMutAct_9fa48("299") ? false : stryMutAct_9fa48("298") ? true : (stryCov_9fa48("298", "299", "300"), (stryMutAct_9fa48("301") ? value : (stryCov_9fa48("301"), !value)) || (stryMutAct_9fa48("303") ? value.trim() !== "" : stryMutAct_9fa48("302") ? false : (stryCov_9fa48("302", "303"), (stryMutAct_9fa48("304") ? value : (stryCov_9fa48("304"), value.trim())) === (stryMutAct_9fa48("305") ? "Stryker was here!" : (stryCov_9fa48("305"), "")))))) {
              if (stryMutAct_9fa48("306")) {
                {}
              } else {
                stryCov_9fa48("306");
                return stryMutAct_9fa48("307") ? {} : (stryCov_9fa48("307"), {
                  valid: stryMutAct_9fa48("308") ? true : (stryCov_9fa48("308"), false),
                  error: stryMutAct_9fa48("309") ? "" : (stryCov_9fa48("309"), "Text is required")
                });
              }
            }
            const trimmedValue = stryMutAct_9fa48("310") ? value : (stryCov_9fa48("310"), value.trim());
            if (stryMutAct_9fa48("313") ? context?.minLength !== undefined || trimmedValue.length < context.minLength : stryMutAct_9fa48("312") ? false : stryMutAct_9fa48("311") ? true : (stryCov_9fa48("311", "312", "313"), (stryMutAct_9fa48("315") ? context?.minLength === undefined : stryMutAct_9fa48("314") ? true : (stryCov_9fa48("314", "315"), (stryMutAct_9fa48("316") ? context.minLength : (stryCov_9fa48("316"), context?.minLength)) !== undefined)) && (stryMutAct_9fa48("319") ? trimmedValue.length >= context.minLength : stryMutAct_9fa48("318") ? trimmedValue.length <= context.minLength : stryMutAct_9fa48("317") ? true : (stryCov_9fa48("317", "318", "319"), trimmedValue.length < context.minLength)))) {
              if (stryMutAct_9fa48("320")) {
                {}
              } else {
                stryCov_9fa48("320");
                return stryMutAct_9fa48("321") ? {} : (stryCov_9fa48("321"), {
                  valid: stryMutAct_9fa48("322") ? true : (stryCov_9fa48("322"), false),
                  error: stryMutAct_9fa48("323") ? `` : (stryCov_9fa48("323"), `Text must be at least ${context.minLength} characters`)
                });
              }
            }
            if (stryMutAct_9fa48("326") ? context?.maxLength !== undefined || trimmedValue.length > context.maxLength : stryMutAct_9fa48("325") ? false : stryMutAct_9fa48("324") ? true : (stryCov_9fa48("324", "325", "326"), (stryMutAct_9fa48("328") ? context?.maxLength === undefined : stryMutAct_9fa48("327") ? true : (stryCov_9fa48("327", "328"), (stryMutAct_9fa48("329") ? context.maxLength : (stryCov_9fa48("329"), context?.maxLength)) !== undefined)) && (stryMutAct_9fa48("332") ? trimmedValue.length <= context.maxLength : stryMutAct_9fa48("331") ? trimmedValue.length >= context.maxLength : stryMutAct_9fa48("330") ? true : (stryCov_9fa48("330", "331", "332"), trimmedValue.length > context.maxLength)))) {
              if (stryMutAct_9fa48("333")) {
                {}
              } else {
                stryCov_9fa48("333");
                return stryMutAct_9fa48("334") ? {} : (stryCov_9fa48("334"), {
                  valid: stryMutAct_9fa48("335") ? true : (stryCov_9fa48("335"), false),
                  error: stryMutAct_9fa48("336") ? `` : (stryCov_9fa48("336"), `Text must be at most ${context.maxLength} characters`)
                });
              }
            }
            if (stryMutAct_9fa48("339") ? context?.pattern || !context.pattern.test(trimmedValue) : stryMutAct_9fa48("338") ? false : stryMutAct_9fa48("337") ? true : (stryCov_9fa48("337", "338", "339"), (stryMutAct_9fa48("340") ? context.pattern : (stryCov_9fa48("340"), context?.pattern)) && (stryMutAct_9fa48("341") ? context.pattern.test(trimmedValue) : (stryCov_9fa48("341"), !context.pattern.test(trimmedValue))))) {
              if (stryMutAct_9fa48("342")) {
                {}
              } else {
                stryCov_9fa48("342");
                return stryMutAct_9fa48("343") ? {} : (stryCov_9fa48("343"), {
                  valid: stryMutAct_9fa48("344") ? true : (stryCov_9fa48("344"), false),
                  error: stryMutAct_9fa48("345") ? "" : (stryCov_9fa48("345"), "Text format is invalid")
                });
              }
            }
            return stryMutAct_9fa48("346") ? {} : (stryCov_9fa48("346"), {
              valid: stryMutAct_9fa48("347") ? false : (stryCov_9fa48("347"), true)
            });
          }
        }
      }));

      // Select validation
      this.validators.set(stryMutAct_9fa48("348") ? "" : (stryCov_9fa48("348"), "select"), stryMutAct_9fa48("349") ? {} : (stryCov_9fa48("349"), {
        validate: (value: any, context?: {
          options?: string[];
        }): ValidationResult => {
          if (stryMutAct_9fa48("350")) {
            {}
          } else {
            stryCov_9fa48("350");
            if (stryMutAct_9fa48("353") ? !value && value.trim() === "" : stryMutAct_9fa48("352") ? false : stryMutAct_9fa48("351") ? true : (stryCov_9fa48("351", "352", "353"), (stryMutAct_9fa48("354") ? value : (stryCov_9fa48("354"), !value)) || (stryMutAct_9fa48("356") ? value.trim() !== "" : stryMutAct_9fa48("355") ? false : (stryCov_9fa48("355", "356"), (stryMutAct_9fa48("357") ? value : (stryCov_9fa48("357"), value.trim())) === (stryMutAct_9fa48("358") ? "Stryker was here!" : (stryCov_9fa48("358"), "")))))) {
              if (stryMutAct_9fa48("359")) {
                {}
              } else {
                stryCov_9fa48("359");
                return stryMutAct_9fa48("360") ? {} : (stryCov_9fa48("360"), {
                  valid: stryMutAct_9fa48("361") ? true : (stryCov_9fa48("361"), false),
                  error: stryMutAct_9fa48("362") ? "" : (stryCov_9fa48("362"), "Selection is required")
                });
              }
            }
            if (stryMutAct_9fa48("365") ? context?.options || !context.options.includes(value) : stryMutAct_9fa48("364") ? false : stryMutAct_9fa48("363") ? true : (stryCov_9fa48("363", "364", "365"), (stryMutAct_9fa48("366") ? context.options : (stryCov_9fa48("366"), context?.options)) && (stryMutAct_9fa48("367") ? context.options.includes(value) : (stryCov_9fa48("367"), !context.options.includes(value))))) {
              if (stryMutAct_9fa48("368")) {
                {}
              } else {
                stryCov_9fa48("368");
                return stryMutAct_9fa48("369") ? {} : (stryCov_9fa48("369"), {
                  valid: stryMutAct_9fa48("370") ? true : (stryCov_9fa48("370"), false),
                  error: stryMutAct_9fa48("371") ? "" : (stryCov_9fa48("371"), "Invalid selection")
                });
              }
            }
            return stryMutAct_9fa48("372") ? {} : (stryCov_9fa48("372"), {
              valid: stryMutAct_9fa48("373") ? false : (stryCov_9fa48("373"), true)
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
    if (stryMutAct_9fa48("374")) {
      {}
    } else {
      stryCov_9fa48("374");
      this.validators.set(name, validator);
    }
  }

  /**
   * Register a field configuration
   */
  registerField(name: string, config: FieldConfig): void {
    if (stryMutAct_9fa48("375")) {
      {}
    } else {
      stryCov_9fa48("375");
      this.fieldConfigs.set(name, config);
    }
  }

  /**
   * Validate a value using a specific validator
   */
  validate(validatorName: string, value: any, context?: any): ValidationResult {
    if (stryMutAct_9fa48("376")) {
      {}
    } else {
      stryCov_9fa48("376");
      const validator = this.validators.get(validatorName);
      if (stryMutAct_9fa48("379") ? false : stryMutAct_9fa48("378") ? true : stryMutAct_9fa48("377") ? validator : (stryCov_9fa48("377", "378", "379"), !validator)) {
        if (stryMutAct_9fa48("380")) {
          {}
        } else {
          stryCov_9fa48("380");
          return stryMutAct_9fa48("381") ? {} : (stryCov_9fa48("381"), {
            valid: stryMutAct_9fa48("382") ? false : (stryCov_9fa48("382"), true)
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
    if (stryMutAct_9fa48("383")) {
      {}
    } else {
      stryCov_9fa48("383");
      const config = this.fieldConfigs.get(fieldName);
      if (stryMutAct_9fa48("386") ? false : stryMutAct_9fa48("385") ? true : stryMutAct_9fa48("384") ? config : (stryCov_9fa48("384", "385", "386"), !config)) {
        if (stryMutAct_9fa48("387")) {
          {}
        } else {
          stryCov_9fa48("387");
          return stryMutAct_9fa48("388") ? {} : (stryCov_9fa48("388"), {
            valid: stryMutAct_9fa48("389") ? false : (stryCov_9fa48("389"), true)
          }); // Default to valid if no config found
        }
      }

      // Check required
      if (stryMutAct_9fa48("392") ? config.required || !value || value.toString().trim() === "" : stryMutAct_9fa48("391") ? false : stryMutAct_9fa48("390") ? true : (stryCov_9fa48("390", "391", "392"), config.required && (stryMutAct_9fa48("394") ? !value && value.toString().trim() === "" : stryMutAct_9fa48("393") ? true : (stryCov_9fa48("393", "394"), (stryMutAct_9fa48("395") ? value : (stryCov_9fa48("395"), !value)) || (stryMutAct_9fa48("397") ? value.toString().trim() !== "" : stryMutAct_9fa48("396") ? false : (stryCov_9fa48("396", "397"), (stryMutAct_9fa48("398") ? value.toString() : (stryCov_9fa48("398"), value.toString().trim())) === (stryMutAct_9fa48("399") ? "Stryker was here!" : (stryCov_9fa48("399"), "")))))))) {
        if (stryMutAct_9fa48("400")) {
          {}
        } else {
          stryCov_9fa48("400");
          return stryMutAct_9fa48("401") ? {} : (stryCov_9fa48("401"), {
            valid: stryMutAct_9fa48("402") ? true : (stryCov_9fa48("402"), false),
            error: stryMutAct_9fa48("403") ? `` : (stryCov_9fa48("403"), `${config.name} is required`)
          });
        }
      }

      // If not required and empty, consider valid
      if (stryMutAct_9fa48("406") ? !config.required || !value || value.toString().trim() === "" : stryMutAct_9fa48("405") ? false : stryMutAct_9fa48("404") ? true : (stryCov_9fa48("404", "405", "406"), (stryMutAct_9fa48("407") ? config.required : (stryCov_9fa48("407"), !config.required)) && (stryMutAct_9fa48("409") ? !value && value.toString().trim() === "" : stryMutAct_9fa48("408") ? true : (stryCov_9fa48("408", "409"), (stryMutAct_9fa48("410") ? value : (stryCov_9fa48("410"), !value)) || (stryMutAct_9fa48("412") ? value.toString().trim() !== "" : stryMutAct_9fa48("411") ? false : (stryCov_9fa48("411", "412"), (stryMutAct_9fa48("413") ? value.toString() : (stryCov_9fa48("413"), value.toString().trim())) === (stryMutAct_9fa48("414") ? "Stryker was here!" : (stryCov_9fa48("414"), "")))))))) {
        if (stryMutAct_9fa48("415")) {
          {}
        } else {
          stryCov_9fa48("415");
          return stryMutAct_9fa48("416") ? {} : (stryCov_9fa48("416"), {
            valid: stryMutAct_9fa48("417") ? false : (stryCov_9fa48("417"), true)
          });
        }
      }

      // Get the appropriate validator
      const validator = this.validators.get(config.type);
      if (stryMutAct_9fa48("420") ? false : stryMutAct_9fa48("419") ? true : stryMutAct_9fa48("418") ? validator : (stryCov_9fa48("418", "419", "420"), !validator)) {
        if (stryMutAct_9fa48("421")) {
          {}
        } else {
          stryCov_9fa48("421");
          return stryMutAct_9fa48("422") ? {} : (stryCov_9fa48("422"), {
            valid: stryMutAct_9fa48("423") ? false : (stryCov_9fa48("423"), true)
          }); // Default to valid if no validator found
        }
      }

      // Build context for validation
      const context: any = {};
      if (stryMutAct_9fa48("426") ? config.min === undefined : stryMutAct_9fa48("425") ? false : stryMutAct_9fa48("424") ? true : (stryCov_9fa48("424", "425", "426"), config.min !== undefined)) {
        if (stryMutAct_9fa48("427")) {
          {}
        } else {
          stryCov_9fa48("427");
          // For text type, map min/max to minLength/maxLength
          if (stryMutAct_9fa48("430") ? config.type !== "text" : stryMutAct_9fa48("429") ? false : stryMutAct_9fa48("428") ? true : (stryCov_9fa48("428", "429", "430"), config.type === (stryMutAct_9fa48("431") ? "" : (stryCov_9fa48("431"), "text")))) {
            if (stryMutAct_9fa48("432")) {
              {}
            } else {
              stryCov_9fa48("432");
              context.minLength = config.min;
            }
          } else {
            if (stryMutAct_9fa48("433")) {
              {}
            } else {
              stryCov_9fa48("433");
              context.min = config.min;
            }
          }
        }
      }
      if (stryMutAct_9fa48("436") ? config.max === undefined : stryMutAct_9fa48("435") ? false : stryMutAct_9fa48("434") ? true : (stryCov_9fa48("434", "435", "436"), config.max !== undefined)) {
        if (stryMutAct_9fa48("437")) {
          {}
        } else {
          stryCov_9fa48("437");
          // For text type, map min/max to minLength/maxLength
          if (stryMutAct_9fa48("440") ? config.type !== "text" : stryMutAct_9fa48("439") ? false : stryMutAct_9fa48("438") ? true : (stryCov_9fa48("438", "439", "440"), config.type === (stryMutAct_9fa48("441") ? "" : (stryCov_9fa48("441"), "text")))) {
            if (stryMutAct_9fa48("442")) {
              {}
            } else {
              stryCov_9fa48("442");
              context.maxLength = config.max;
            }
          } else {
            if (stryMutAct_9fa48("443")) {
              {}
            } else {
              stryCov_9fa48("443");
              context.max = config.max;
            }
          }
        }
      }
      if (stryMutAct_9fa48("445") ? false : stryMutAct_9fa48("444") ? true : (stryCov_9fa48("444", "445"), config.pattern)) context.pattern = config.pattern;

      // Run validation
      const result = validator.validate(value, context);

      // Run custom validator if provided
      if (stryMutAct_9fa48("448") ? config.customValidator || result.valid : stryMutAct_9fa48("447") ? false : stryMutAct_9fa48("446") ? true : (stryCov_9fa48("446", "447", "448"), config.customValidator && result.valid)) {
        if (stryMutAct_9fa48("449")) {
          {}
        } else {
          stryCov_9fa48("449");
          const customResult = config.customValidator(value);
          if (stryMutAct_9fa48("452") ? false : stryMutAct_9fa48("451") ? true : stryMutAct_9fa48("450") ? customResult.valid : (stryCov_9fa48("450", "451", "452"), !customResult.valid)) {
            if (stryMutAct_9fa48("453")) {
              {}
            } else {
              stryCov_9fa48("453");
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
    if (stryMutAct_9fa48("454")) {
      {}
    } else {
      stryCov_9fa48("454");
      const results: Record<string, ValidationResult> = {};
      for (const [fieldName, value] of Object.entries(fields)) {
        if (stryMutAct_9fa48("455")) {
          {}
        } else {
          stryCov_9fa48("455");
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
    if (stryMutAct_9fa48("456")) {
      {}
    } else {
      stryCov_9fa48("456");
      return stryMutAct_9fa48("457") ? Object.values(results).some(result => result.valid) : (stryCov_9fa48("457"), Object.values(results).every(stryMutAct_9fa48("458") ? () => undefined : (stryCov_9fa48("458"), result => result.valid)));
    }
  }

  /**
   * Get all validation errors
   */
  getErrors(results: Record<string, ValidationResult>): Record<string, string> {
    if (stryMutAct_9fa48("459")) {
      {}
    } else {
      stryCov_9fa48("459");
      const errors: Record<string, string> = {};
      for (const [fieldName, result] of Object.entries(results)) {
        if (stryMutAct_9fa48("460")) {
          {}
        } else {
          stryCov_9fa48("460");
          if (stryMutAct_9fa48("463") ? !result.valid || result.error : stryMutAct_9fa48("462") ? false : stryMutAct_9fa48("461") ? true : (stryCov_9fa48("461", "462", "463"), (stryMutAct_9fa48("464") ? result.valid : (stryCov_9fa48("464"), !result.valid)) && result.error)) {
            if (stryMutAct_9fa48("465")) {
              {}
            } else {
              stryCov_9fa48("465");
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
    if (stryMutAct_9fa48("466")) {
      {}
    } else {
      stryCov_9fa48("466");
      // Port field
      this.registerField(stryMutAct_9fa48("467") ? "" : (stryCov_9fa48("467"), "serverPort"), stryMutAct_9fa48("468") ? {} : (stryCov_9fa48("468"), {
        name: stryMutAct_9fa48("469") ? "" : (stryCov_9fa48("469"), "Server Port"),
        type: stryMutAct_9fa48("470") ? "" : (stryCov_9fa48("470"), "number"),
        required: stryMutAct_9fa48("471") ? false : (stryCov_9fa48("471"), true),
        min: 1,
        max: 65535
      }));

      // Download directory field
      this.registerField(stryMutAct_9fa48("472") ? "" : (stryCov_9fa48("472"), "downloadDir"), stryMutAct_9fa48("473") ? {} : (stryCov_9fa48("473"), {
        name: stryMutAct_9fa48("474") ? "" : (stryCov_9fa48("474"), "Download Directory"),
        type: stryMutAct_9fa48("475") ? "" : (stryCov_9fa48("475"), "path"),
        required: stryMutAct_9fa48("476") ? false : (stryCov_9fa48("476"), true)
      }));

      // Log level field
      this.registerField(stryMutAct_9fa48("477") ? "" : (stryCov_9fa48("477"), "logLevel"), stryMutAct_9fa48("478") ? {} : (stryCov_9fa48("478"), {
        name: stryMutAct_9fa48("479") ? "" : (stryCov_9fa48("479"), "Log Level"),
        type: stryMutAct_9fa48("480") ? "" : (stryCov_9fa48("480"), "select"),
        required: stryMutAct_9fa48("481") ? false : (stryCov_9fa48("481"), true),
        customValidator: (value: any) => {
          if (stryMutAct_9fa48("482")) {
            {}
          } else {
            stryCov_9fa48("482");
            const validLevels = stryMutAct_9fa48("483") ? [] : (stryCov_9fa48("483"), [stryMutAct_9fa48("484") ? "" : (stryCov_9fa48("484"), "DEBUG"), stryMutAct_9fa48("485") ? "" : (stryCov_9fa48("485"), "INFO"), stryMutAct_9fa48("486") ? "" : (stryCov_9fa48("486"), "WARNING"), stryMutAct_9fa48("487") ? "" : (stryCov_9fa48("487"), "ERROR")]);
            if (stryMutAct_9fa48("490") ? false : stryMutAct_9fa48("489") ? true : stryMutAct_9fa48("488") ? validLevels.includes(value) : (stryCov_9fa48("488", "489", "490"), !validLevels.includes(value))) {
              if (stryMutAct_9fa48("491")) {
                {}
              } else {
                stryCov_9fa48("491");
                return stryMutAct_9fa48("492") ? {} : (stryCov_9fa48("492"), {
                  valid: stryMutAct_9fa48("493") ? true : (stryCov_9fa48("493"), false),
                  error: stryMutAct_9fa48("494") ? "" : (stryCov_9fa48("494"), "Invalid log level")
                });
              }
            }
            return stryMutAct_9fa48("495") ? {} : (stryCov_9fa48("495"), {
              valid: stryMutAct_9fa48("496") ? false : (stryCov_9fa48("496"), true)
            });
          }
        }
      }));

      // Format field
      this.registerField(stryMutAct_9fa48("497") ? "" : (stryCov_9fa48("497"), "format"), stryMutAct_9fa48("498") ? {} : (stryCov_9fa48("498"), {
        name: stryMutAct_9fa48("499") ? "" : (stryCov_9fa48("499"), "Format"),
        type: stryMutAct_9fa48("500") ? "" : (stryCov_9fa48("500"), "select"),
        required: stryMutAct_9fa48("501") ? false : (stryCov_9fa48("501"), true),
        customValidator: (value: any) => {
          if (stryMutAct_9fa48("502")) {
            {}
          } else {
            stryCov_9fa48("502");
            const validFormats = stryMutAct_9fa48("503") ? [] : (stryCov_9fa48("503"), [stryMutAct_9fa48("504") ? "" : (stryCov_9fa48("504"), "mp4"), stryMutAct_9fa48("505") ? "" : (stryCov_9fa48("505"), "webm"), stryMutAct_9fa48("506") ? "" : (stryCov_9fa48("506"), "mkv"), stryMutAct_9fa48("507") ? "" : (stryCov_9fa48("507"), "avi")]);
            if (stryMutAct_9fa48("510") ? false : stryMutAct_9fa48("509") ? true : stryMutAct_9fa48("508") ? validFormats.includes(value) : (stryCov_9fa48("508", "509", "510"), !validFormats.includes(value))) {
              if (stryMutAct_9fa48("511")) {
                {}
              } else {
                stryCov_9fa48("511");
                return stryMutAct_9fa48("512") ? {} : (stryCov_9fa48("512"), {
                  valid: stryMutAct_9fa48("513") ? true : (stryCov_9fa48("513"), false),
                  error: stryMutAct_9fa48("514") ? "" : (stryCov_9fa48("514"), "Invalid format")
                });
              }
            }
            return stryMutAct_9fa48("515") ? {} : (stryCov_9fa48("515"), {
              valid: stryMutAct_9fa48("516") ? false : (stryCov_9fa48("516"), true)
            });
          }
        }
      }));
    }
  }
}

// Export singleton instance
export const validationService = ValidationService.getInstance();