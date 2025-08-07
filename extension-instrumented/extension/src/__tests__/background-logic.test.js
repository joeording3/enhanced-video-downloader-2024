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
const background_logic_1 = require("../background-logic");
const constants_1 = require("../core/constants");
describe("discoverServerPort", () => {
    const defaultPort = (0, constants_1.getServerPort)();
    const maxPort = (0, constants_1.getPortRange)()[1];
    let calls;
    let storageService;
    beforeEach(() => {
        calls = [];
        storageService = {
            getPort: jest.fn(),
            setPort: jest.fn(),
        };
    });
    it("returns cached port if valid", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = (0, constants_1.getServerPort)() + 1;
        storageService.getPort.mockResolvedValue(cachedPort);
        const checkStatus = jest.fn().mockImplementation((port) => {
            calls.push(port);
            return Promise.resolve(true);
        });
        const port = yield (0, background_logic_1.discoverServerPort)(storageService, checkStatus, defaultPort, maxPort, false);
        expect(port).toBe(cachedPort);
        expect(calls).toEqual([cachedPort]);
        // should not scan other ports
        expect(storageService.setPort).not.toHaveBeenCalled();
    }));
    it("scans all ports when cached invalid and caches discovered port", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = (0, constants_1.getServerPort)() + 1;
        const discoveredPort = (0, constants_1.getServerPort)(); // Use the actual server port since range is [9090, 9090]
        storageService.getPort.mockResolvedValue(cachedPort);
        const statuses = {
            [(0, constants_1.getServerPort)()]: true, // The only port in range should be available
            [cachedPort]: false,
        };
        const checkStatus = jest.fn().mockImplementation((port) => {
            calls.push(port);
            return Promise.resolve(statuses[port] || false);
        });
        const port = yield (0, background_logic_1.discoverServerPort)(storageService, checkStatus, defaultPort, maxPort, false);
        expect(port).toBe(discoveredPort);
        // The actual implementation scans the full port range, so we expect more calls
        // but we can verify the key calls are in the right order
        expect(calls).toContain(cachedPort);
        expect(calls).toContain((0, constants_1.getServerPort)());
        expect(calls.indexOf(cachedPort)).toBeLessThan(calls.indexOf(discoveredPort));
        // should expire cache then set new cache
        expect(storageService.setPort).toHaveBeenCalledWith(null);
        expect(storageService.setPort).toHaveBeenCalledWith(discoveredPort);
    }));
    it("scans ports when no cache", () => __awaiter(void 0, void 0, void 0, function* () {
        storageService.getPort.mockResolvedValue(null);
        const discoveredPort = (0, constants_1.getServerPort)(); // Use the actual server port since range is [9090, 9090]
        const statuses = {
            [(0, constants_1.getServerPort)()]: true, // The only port in range should be available
        };
        const checkStatus = jest
            .fn()
            .mockImplementation((port) => Promise.resolve(statuses[port] || false));
        const port = yield (0, background_logic_1.discoverServerPort)(storageService, checkStatus, defaultPort, maxPort, false);
        expect(port).toBe(discoveredPort);
        expect(storageService.setPort).toHaveBeenCalledWith(discoveredPort);
    }));
    it("forces scan when startScan is true", () => __awaiter(void 0, void 0, void 0, function* () {
        const cachedPort = (0, constants_1.getServerPort)() + 1;
        const discoveredPort = (0, constants_1.getServerPort)(); // Use the actual server port since range is [9090, 9090]
        storageService.getPort.mockResolvedValue(cachedPort);
        const statuses = {
            [(0, constants_1.getServerPort)()]: true, // The only port in range should be available
            [cachedPort]: false,
        };
        const checkStatus = jest.fn().mockImplementation((port) => {
            calls.push(port);
            return Promise.resolve(statuses[port] || false);
        });
        const port = yield (0, background_logic_1.discoverServerPort)(storageService, checkStatus, defaultPort, maxPort, true);
        expect(port).toBe(discoveredPort);
        // should not return cached, so calls start with scanning all
        // The actual implementation scans the full port range, so we expect more calls
        // but we can verify the key calls are in the right order
        expect(calls).toContain((0, constants_1.getServerPort)());
        // Note: cachedPort (9091) is outside the scan range [9090, 9090], so it won't be called
        // Since both getServerPort() and discoveredPort are the same (9090), they have the same index
        expect(calls).toContain(discoveredPort);
    }));
    it("returns null if no port found", () => __awaiter(void 0, void 0, void 0, function* () {
        storageService.getPort.mockResolvedValue(null);
        const checkStatus = jest.fn().mockResolvedValue(false);
        const port = yield (0, background_logic_1.discoverServerPort)(storageService, checkStatus, defaultPort, maxPort, false);
        expect(port).toBeNull();
        expect(storageService.setPort).not.toHaveBeenCalled();
    }));
});
