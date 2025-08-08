"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const stryker_test_1 = require("../stryker-test");
describe("add", () => {
    it("adds two numbers", () => {
        expect((0, stryker_test_1.add)(2, 3)).toBe(5);
    });
});
