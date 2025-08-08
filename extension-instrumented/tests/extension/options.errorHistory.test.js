"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const options_1 = require("extension/src/options");
const historyModule = __importStar(require("extension/src/history"));
describe("loadErrorHistory", () => {
    let listEl;
    beforeEach(() => {
        document.body.innerHTML = '<ul id="error-history-list"></ul>';
        listEl = document.getElementById("error-history-list");
        jest.spyOn(historyModule, "fetchHistory").mockResolvedValue({
            history: [{ status: "error" }, { status: "complete" }],
            totalItems: 2,
        });
        jest.spyOn(historyModule, "renderHistoryItems").mockImplementation(() => { });
    });
    afterEach(() => {
        jest.resetAllMocks();
    });
    it("fetches history and renders only error entries", () => __awaiter(void 0, void 0, void 0, function* () {
        yield (0, options_1.loadErrorHistory)(2, 5);
        expect(historyModule.fetchHistory).toHaveBeenCalledWith(2, 5);
        expect(historyModule.renderHistoryItems).toHaveBeenCalledWith([{ status: "error" }], 2, 5, 1, listEl);
    }));
});
