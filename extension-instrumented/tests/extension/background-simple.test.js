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
const background_1 = require("../../extension/src/background");
const constants_1 = require("../../extension/src/constants");
// Mock global fetch
const mockFetch = jest.fn();
describe("checkServerStatus - Simple Test", () => {
    beforeEach(() => {
        // Debug environment variables
        console.log("Environment variables:");
        console.log("process.env.JEST_WORKER_ID:", process.env.JEST_WORKER_ID);
        console.log("process.env.NODE_ENV:", process.env.NODE_ENV);
        console.log("typeof process:", typeof process);
        // Setup global mocks
        global.fetch = mockFetch;
        // Reset all mocks
        jest.clearAllMocks();
        // Mock chrome.storage.local.set and get to return promises
        global.chrome.storage.local.set = jest
            .fn()
            .mockResolvedValue(undefined);
        global.chrome.storage.local.get = jest.fn().mockResolvedValue({});
    });
    it("should return true for successful response", () => __awaiter(void 0, void 0, void 0, function* () {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: jest
                .fn()
                .mockResolvedValue({ app_name: "Enhanced Video Downloader" }),
        });
        const result = yield (0, background_1.checkServerStatus)((0, constants_1.getServerPort)());
        expect(result).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(`http://127.0.0.1:${(0, constants_1.getServerPort)()}/health`, expect.objectContaining({ signal: expect.anything() }));
    }));
});
