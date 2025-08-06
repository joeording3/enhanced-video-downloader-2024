"use strict";
/* eslint-env jest */
Object.defineProperty(exports, "__esModule", { value: true });
const content_1 = require("../../extension/src/content");
describe("debounce", () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });
    it("should call the function after the specified delay", () => {
        const func = jest.fn();
        const debounced = (0, content_1.debounce)(func, 1000);
        debounced();
        expect(func).not.toHaveBeenCalled();
        jest.advanceTimersByTime(1000);
        expect(func).toHaveBeenCalledTimes(1);
    });
    it("should pass arguments to the original function", () => {
        const func = jest.fn();
        const debounced = (0, content_1.debounce)(func, 500);
        debounced("a", 123);
        jest.advanceTimersByTime(500);
        expect(func).toHaveBeenCalledWith("a", 123);
    });
});
describe("isSignificantVideo", () => {
    let video;
    beforeEach(() => {
        document.body.innerHTML = "";
        video = document.createElement("video");
        // Mock getBoundingClientRect
        video.getBoundingClientRect = jest.fn(() => ({
            width: 200,
            height: 150,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            x: 0,
            y: 0,
            toJSON: () => "",
        }));
        video.src = "http://example.com/video.mp4";
        document.body.appendChild(video);
    });
    it("returns false for non-HTMLVideoElement or non-IFrameElement", () => {
        const div = document.createElement("div");
        expect((0, content_1.isSignificantVideo)(div)).toBe(false);
    });
    it("returns false when video is not visible", () => {
        video.getBoundingClientRect = jest.fn(() => ({
            width: 0,
            height: 0,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            x: 0,
            y: 0,
            toJSON: () => "",
        }));
        expect((0, content_1.isSignificantVideo)(video)).toBe(false);
    });
    it("returns false when dimensions are too small", () => {
        video.getBoundingClientRect = jest.fn(() => ({
            width: 199,
            height: 149,
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            x: 0,
            y: 0,
            toJSON: () => "",
        }));
        expect((0, content_1.isSignificantVideo)(video)).toBe(false);
    });
    it("returns true for visible video with sufficient dimensions and src", () => {
        expect((0, content_1.isSignificantVideo)(video)).toBe(true);
    });
    it("returns false for ad video inside ad container", () => {
        const adContainer = document.createElement("div");
        adContainer.className = "ad-banner";
        adContainer.appendChild(video);
        document.body.appendChild(adContainer);
        expect((0, content_1.isSignificantVideo)(video)).toBe(false);
    });
    it("returns true for an iframe", () => {
        const iframe = document.createElement("iframe");
        expect((0, content_1.isSignificantVideo)(iframe)).toBe(true);
    });
});
