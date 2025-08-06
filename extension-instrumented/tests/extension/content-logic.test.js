"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const content_1 = require("extension/src/content");
describe("isSignificantVideo", () => {
    it("returns false for non-video and non-iframe elements", () => {
        const div = document.createElement("div");
        expect((0, content_1.isSignificantVideo)(div)).toBe(false);
    });
    it("returns false if video parent has ad-banner class", () => {
        const video = document.createElement("video");
        // Mock getBoundingClientRect so width/height > thresholds
        video.getBoundingClientRect = () => ({
            width: 300,
            height: 200,
            left: 0,
            top: 0,
        });
        const wrapper = document.createElement("div");
        wrapper.classList.add("ad-banner");
        wrapper.appendChild(video);
        expect((0, content_1.isSignificantVideo)(video)).toBe(false);
    });
    it("returns false if video is not visible (width or height zero)", () => {
        const video = document.createElement("video");
        video.getBoundingClientRect = () => ({
            width: 0,
            height: 200,
            left: 0,
            top: 0,
        });
        expect((0, content_1.isSignificantVideo)(video)).toBe(false);
        video.getBoundingClientRect = () => ({
            width: 300,
            height: 0,
            left: 0,
            top: 0,
        });
        expect((0, content_1.isSignificantVideo)(video)).toBe(false);
    });
    it("returns false if video is too small (<200x150)", () => {
        const video = document.createElement("video");
        video.getBoundingClientRect = () => ({
            width: 199,
            height: 150,
            left: 0,
            top: 0,
        });
        video.src = "http://example.com/video.mp4";
        expect((0, content_1.isSignificantVideo)(video)).toBe(false);
        video.getBoundingClientRect = () => ({
            width: 200,
            height: 149,
            left: 0,
            top: 0,
        });
        expect((0, content_1.isSignificantVideo)(video)).toBe(false);
    });
    it("returns false if video has no src", () => {
        const video = document.createElement("video");
        video.getBoundingClientRect = () => ({
            width: 200,
            height: 150,
            left: 0,
            top: 0,
        });
        // Simulate no src by overriding the src getter
        Object.defineProperty(video, "src", { get: () => "" });
        expect((0, content_1.isSignificantVideo)(video)).toBe(false);
    });
    it("returns true for significant video elements", () => {
        const video = document.createElement("video");
        video.getBoundingClientRect = () => ({
            width: 200,
            height: 150,
            left: 0,
            top: 0,
        });
        video.src = "http://example.com/video.mp4";
        expect((0, content_1.isSignificantVideo)(video)).toBe(true);
    });
    it("returns true for iframe elements regardless of size", () => {
        const iframe = document.createElement("iframe");
        iframe.getBoundingClientRect = () => ({
            width: 0,
            height: 0,
            left: 0,
            top: 0,
        });
        expect((0, content_1.isSignificantVideo)(iframe)).toBe(true);
    });
});
