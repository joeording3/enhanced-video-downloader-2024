"use strict";
/* eslint-env jest */
// @ts-nocheck
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
const content_1 = require("../../extension/src/content");
describe("getButtonState", () => {
    beforeEach(() => {
        document.body.innerHTML = "";
        jest.resetModules();
        delete global.chrome;
    });
    it("resolves default state when storage returns error", () => __awaiter(void 0, void 0, void 0, function* () {
        global.chrome = {
            storage: {
                local: {
                    get: (_key, _cb) => {
                        throw new Error("storage error");
                    },
                },
            },
            runtime: { lastError: undefined },
        };
        const state = yield (0, content_1.getButtonState)();
        expect(state).toEqual({ x: 10, y: 10, hidden: false });
    }));
    it("resolves stored state when available", () => __awaiter(void 0, void 0, void 0, function* () {
        const testState = { x: 42, y: 24, hidden: true };
        const domain = window.location.hostname || "";
        global.chrome = {
            storage: {
                local: {
                    get: (_key, cb) => cb({ [domain]: testState }),
                },
            },
            runtime: { lastError: undefined },
        };
        const state = yield (0, content_1.getButtonState)();
        expect(state).toEqual(testState);
    }));
});
describe("saveButtonState", () => {
    beforeEach(() => {
        jest.resetModules();
        delete global.chrome;
    });
    it("calls storage.set with correct key and resolves", () => __awaiter(void 0, void 0, void 0, function* () {
        const calls = [];
        const domain = window.location.hostname || "";
        global.chrome = {
            storage: {
                local: {
                    set: (items, cb) => {
                        calls.push(items);
                        cb();
                    },
                },
            },
            runtime: { lastError: undefined },
        };
        const newState = { x: 5, y: 6, hidden: true };
        yield (0, content_1.saveButtonState)(newState);
        expect(calls).toHaveLength(1);
        expect(calls[0]).toEqual({ [domain]: newState });
    }));
});
