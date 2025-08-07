/* eslint-env jest */

import { getButtonState, saveButtonState } from "../../extension/src/content";
import type { ButtonState } from "../../extension/src/types";

describe("getButtonState", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    jest.resetModules();
    delete (global as any).chrome;
  });

  it("resolves default state when storage returns error", async () => {
    (global as any).chrome = {
      storage: {
        local: {
          get: (_key: string, _cb: Function) => {
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
    const testState: ButtonState = { x: 42, y: 24, hidden: true };
    const domain = window.location.hostname || "";
    (global as any).chrome = {
      storage: {
        local: {
          get: (_key: string, cb: Function) => cb({ [domain]: testState }),
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
    delete (global as any).chrome;
  });

  it("calls storage.set with correct key and resolves", async () => {
    const calls: any[] = [];
    const domain = window.location.hostname || "";
    (global as any).chrome = {
      storage: {
        local: {
          set: (items: any, cb: Function) => {
            calls.push(items);
            cb();
          },
        },
      },
      runtime: { lastError: undefined },
    };
    const newState: ButtonState = { x: 5, y: 6, hidden: true };
    await saveButtonState(newState);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual({ [domain]: newState });
  });
});
