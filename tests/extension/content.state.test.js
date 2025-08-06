/* eslint-env jest */

import { getButtonState, saveButtonState } from "extension/src/content";

describe("getButtonState", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    jest.resetModules();
    delete global.chrome;
  });

  it("resolves default state when storage returns error", async () => {
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

    const state = await getButtonState();
    expect(state).toEqual({ x: 10, y: 10, hidden: false });
  });

  it("resolves stored state when available", async () => {
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

    const state = await getButtonState();
    expect(state).toEqual(testState);
  });
});

describe("saveButtonState", () => {
  beforeEach(() => {
    jest.resetModules();
    delete global.chrome;
  });

  it("calls storage.set with correct key and resolves", async () => {
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
    await saveButtonState(newState);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ [domain]: newState });
  });
});
