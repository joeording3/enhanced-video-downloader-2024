/* eslint-env jest */

/**
 * @jest-environment jsdom
 */

import * as content from "../../src/content";

// Non-exported symbol accessed via any for test purposes
const { selectPrimaryMediaCandidate } = content as any;

describe("Primary media selection", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("prefers longer and larger HTMLVideoElement over smaller one", () => {
    const v1 = document.createElement("video");
    Object.defineProperty(v1, "readyState", { value: 4 });
    Object.defineProperty(v1, "duration", { value: 10 });
    Object.defineProperty(v1, "currentSrc", { value: "https://example.com/a.mp4" });
    Object.defineProperty(v1, "getBoundingClientRect", {
      value: () => ({
        width: 640,
        height: 360,
        top: 0,
        left: 0,
        bottom: 360,
        right: 640,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    });

    const v2 = document.createElement("video");
    Object.defineProperty(v2, "readyState", { value: 1 });
    Object.defineProperty(v2, "duration", { value: 3 });
    Object.defineProperty(v2, "currentSrc", { value: "https://example.com/b.mp4" });
    Object.defineProperty(v2, "getBoundingClientRect", {
      value: () => ({
        width: 320,
        height: 240,
        top: 0,
        left: 0,
        bottom: 240,
        right: 320,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    });

    document.body.appendChild(v1);
    document.body.appendChild(v2);

    const candidates = [v1, v2] as unknown as HTMLElement[];
    const chosen = selectPrimaryMediaCandidate(candidates);
    expect(chosen).toBe(v1);
  });

  it("considers iframes and prefers larger known-host iframe", () => {
    const f1 = document.createElement("iframe");
    Object.defineProperty(f1, "src", { value: "https://player.vimeo.com/video/123" });
    Object.defineProperty(f1, "getBoundingClientRect", {
      value: () => ({
        width: 800,
        height: 450,
        top: 0,
        left: 0,
        bottom: 450,
        right: 800,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    });

    const f2 = document.createElement("iframe");
    Object.defineProperty(f2, "src", { value: "https://unknown.cdn/embed/456" });
    Object.defineProperty(f2, "getBoundingClientRect", {
      value: () => ({
        width: 400,
        height: 300,
        top: 0,
        left: 0,
        bottom: 300,
        right: 400,
        x: 0,
        y: 0,
        toJSON: () => {},
      }),
    });

    document.body.appendChild(f1);
    document.body.appendChild(f2);

    const candidates = [f1, f2] as unknown as HTMLElement[];
    const chosen = selectPrimaryMediaCandidate(candidates);
    expect(chosen).toBe(f1);
  });

  it("returns null when no candidates", () => {
    const chosen = selectPrimaryMediaCandidate([]);
    expect(chosen).toBeNull();
  });
});
