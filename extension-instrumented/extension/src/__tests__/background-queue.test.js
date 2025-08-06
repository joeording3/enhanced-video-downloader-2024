"use strict";
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
const background_1 = require("../background");
describe("persistQueue", () => {
    beforeEach(() => {
        // Use the global chrome mock from jest.setup.js
        // Reset queue
        background_1.downloadQueue.length = 0;
    });
    it("persists the downloadQueue to chrome.storage", () => __awaiter(void 0, void 0, void 0, function* () {
        background_1.downloadQueue.push("video1");
        yield (0, background_1.persistQueue)();
        expect(chrome.storage.local.set).toHaveBeenCalledWith({
            downloadQueue: ["video1"],
        });
    }));
    it("handles errors without throwing", () => __awaiter(void 0, void 0, void 0, function* () {
        chrome.storage.local.set.mockImplementation(() => Promise.reject(new Error("fail")));
        yield expect((0, background_1.persistQueue)()).resolves.toBeUndefined();
    }));
});
