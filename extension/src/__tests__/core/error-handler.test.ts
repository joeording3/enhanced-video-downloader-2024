import { CentralizedErrorHandler, errorHandler } from "extension/src/core/error-handler";

describe("CentralizedErrorHandler", () => {
  const baseContext = {
    component: "test-component",
    operation: "test-operation",
  } as const;

  beforeEach(() => {
    // Ensure console spies don't bleed across tests
    jest.restoreAllMocks();
  });

  describe("handle (async)", () => {
    it("returns success with data on resolved operation", async () => {
      const result = await errorHandler.handle(async () => 42, baseContext);
      expect(result.success).toBe(true);
      expect(result.data).toBe(42);
      expect(result.error).toBeUndefined();
    });

    it("returns structured error result and logs on rejection", async () => {
      const error = new Error("boom");
      const spy = jest.spyOn(console, "error").mockImplementation(() => {});
      const result = await errorHandler.handle(
        async () => {
          throw error;
        },
        { ...baseContext, userMessage: "User friendly message" }
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("boom");
      expect(result.userMessage).toBe("User friendly message");
      expect(spy).toHaveBeenCalled();
    });

    it("falls back to default userMessage when none provided", async () => {
      const result = await errorHandler.handle(async () => {
        throw new Error("fail");
      }, baseContext);
      expect(result.success).toBe(false);
      expect(result.userMessage).toContain("Operation failed: test-operation");
    });
  });

  describe("handleSync (sync)", () => {
    it("returns success with data on resolved operation", () => {
      const result = errorHandler.handleSync(() => ({ ok: true }), baseContext);
      expect(result.success).toBe(true);
      expect(result.data).toEqual({ ok: true });
    });

    it("returns error result on thrown error", () => {
      const spy = jest.spyOn(console, "error").mockImplementation(() => {});
      const result = errorHandler.handleSync(() => {
        throw new Error("kapow");
      }, baseContext);
      expect(result.success).toBe(false);
      expect(result.error).toBe("kapow");
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("wrap methods (rethrow behavior)", () => {
    it("wrap resolves value", async () => {
      await expect(errorHandler.wrap(async () => "value", baseContext)).resolves.toBe("value");
    });

    it("wrap rethrows error after handling", async () => {
      const spy = jest.spyOn(console, "error").mockImplementation(() => {});
      await expect(
        errorHandler.wrap(async () => {
          throw new Error("rethrow");
        }, baseContext)
      ).rejects.toThrow("rethrow");
      expect(spy).toHaveBeenCalled();
    });

    it("wrapSync returns value", () => {
      expect(errorHandler.wrapSync(() => 7, baseContext)).toBe(7);
    });

    it("wrapSync rethrows error after handling", () => {
      const spy = jest.spyOn(console, "error").mockImplementation(() => {});
      expect(() =>
        errorHandler.wrapSync(() => {
          throw new Error("sync-err");
        }, baseContext)
      ).toThrow("sync-err");
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("onError callbacks", () => {
    it("invokes callback with error and context, and supports unsubscribe", async () => {
      let callbackCount = 0;
      const unsubscribe = errorHandler.onError((err: Error, ctx: any) => {
        callbackCount += 1;
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toBe("oops");
        expect(ctx.component).toBe(baseContext.component);
        expect(ctx.operation).toBe(baseContext.operation);
      });

      await errorHandler.handle(async () => {
        throw new Error("oops");
      }, baseContext);

      expect(callbackCount).toBe(1);

      // After unsubscribe, callback should not be invoked
      unsubscribe();
      await errorHandler.handle(async () => {
        throw new Error("oops");
      }, baseContext);
      expect(callbackCount).toBe(1);
    });

    it("logs when an error callback throws", async () => {
      const spy = jest.spyOn(console, "error").mockImplementation(() => {});
      const unsubscribe = errorHandler.onError(() => {
        throw new Error("callback-error");
      });
      await errorHandler.handle(async () => {
        throw new Error("source-error");
      }, baseContext);
      unsubscribe();
      expect(spy).toHaveBeenCalled();
    });
  });

  describe("predefined contexts", () => {
    it("produces expected shapes for common contexts", () => {
      const serverCtx = CentralizedErrorHandler.contexts.background.serverCheck(5000);
      expect(serverCtx.component).toBe("background");
      expect(serverCtx.operation).toBe("serverCheck");
      expect(serverCtx.data).toEqual({ port: 5000 });
      expect(serverCtx.userMessage).toBeDefined();

      const dlCtx = CentralizedErrorHandler.contexts.popup.downloadInitiation("https://x");
      expect(dlCtx.component).toBe("popup");
      expect(dlCtx.operation).toBe("downloadInitiation");
      expect(dlCtx.data).toEqual({ url: "https://x" });
      expect(dlCtx.userMessage).toBeDefined();
    });
  });
});
