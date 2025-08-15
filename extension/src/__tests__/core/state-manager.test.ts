import { ExtensionStateManager, stateManager } from "extension/src/core/state-manager";

describe("ExtensionStateManager", () => {
  beforeEach(() => {
    // Reset singleton internal state between tests
    stateManager.reset();
    jest.restoreAllMocks();
  });

  it("is a singleton", () => {
    const a = ExtensionStateManager.getInstance();
    const b = ExtensionStateManager.getInstance();
    expect(a).toBe(b);
  });

  it("exposes shallow copies of state getters", () => {
    const s1 = stateManager.getState();
    const s2 = stateManager.getState();
    expect(s1).not.toBe(s2);
    // Shallow copy is expected; nested references may be identical
    expect(s1.ui).toEqual(s2.ui);
  });

  it("notifies subscribers for server/ui/download/form updates", () => {
    const serverSpy = jest.fn();
    const themeSpy = jest.fn();
    const positionSpy = jest.fn();
    const queueSpy = jest.fn();
    const activeSpy = jest.fn();
    const formSpy = jest.fn();

    const unsubServer = stateManager.subscribe("serverStatusChanged", serverSpy);
    const unsubTheme = stateManager.subscribe("uiThemeChanged", themeSpy);
    const unsubPos = stateManager.subscribe("buttonPositionChanged", positionSpy);
    const unsubQueue = stateManager.subscribe("downloadQueueChanged", queueSpy);
    const unsubActive = stateManager.subscribe("downloadActiveChanged", activeSpy);
    const unsubForm = stateManager.subscribe("formValidationChanged", formSpy);

    stateManager.updateServerState({ status: "connected", port: 1234 });
    stateManager.updateUIState({ theme: "dark", buttonPosition: { x: 1, y: 2 } });
    stateManager.updateDownloadState({
      queue: ["a"],
      active: { id: { status: "queued", progress: 0, url: "u" } } as any,
    });
    stateManager.updateFormState({ errors: new Map([["k", "v"]]) });

    expect(serverSpy).toHaveBeenCalled();
    expect(themeSpy).toHaveBeenCalledWith("dark");
    expect(positionSpy).toHaveBeenCalledWith({ x: 1, y: 2 });
    expect(queueSpy).toHaveBeenCalledWith(["a"]);
    expect(activeSpy).toHaveBeenCalled();
    expect(formSpy).toHaveBeenCalled();

    // Unsubscribe and ensure no further notifications
    unsubServer();
    unsubTheme();
    unsubPos();
    unsubQueue();
    unsubActive();
    unsubForm();
    serverSpy.mockClear();
    themeSpy.mockClear();
    positionSpy.mockClear();
    queueSpy.mockClear();
    activeSpy.mockClear();
    formSpy.mockClear();
    stateManager.updateServerState({ status: "disconnected" });
    stateManager.updateUIState({ theme: "light", buttonPosition: { x: 3, y: 4 } });
    stateManager.updateDownloadState({ queue: [], active: {} });
    stateManager.updateFormState({ errors: new Map() });
    expect(serverSpy).not.toHaveBeenCalled();
    expect(themeSpy).not.toHaveBeenCalled();
    expect(positionSpy).not.toHaveBeenCalled();
    expect(queueSpy).not.toHaveBeenCalled();
    expect(activeSpy).not.toHaveBeenCalled();
    expect(formSpy).not.toHaveBeenCalled();
  });

  it("guards listener exceptions and logs errors", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    stateManager.subscribe("serverStatusChanged", () => {
      throw new Error("listener boom");
    });
    stateManager.updateServerState({ status: "checking" });
    expect(spy).toHaveBeenCalled();
  });

  it("loads state from storage and applies values", async () => {
    const getMock = jest.spyOn(chrome.storage.local as any, "get") as any;
    (getMock as any).mockResolvedValue({
      serverPort: 5006,
      serverConfig: { a: 1 },
      downloadHistory: [{ url: "u", status: "completed" }],
      theme: "dark",
      buttonState: { position: { x: 9, y: 8 }, visible: true },
    } as any);

    await stateManager.loadFromStorage();

    const s = stateManager.getState();
    expect(s.server.port).toBe(5006);
    expect(s.server.config).toEqual({ a: 1 });
    expect(s.ui.theme).toBe("dark");
    expect(s.ui.buttonPosition).toEqual({ x: 9, y: 8 });
    expect(s.downloads.history.length).toBe(1);
  });

  it("saves state to storage with expected shape", async () => {
    const setMock = jest.spyOn(chrome.storage.local as any, "set");
    stateManager.updateServerState({ port: 6000, config: { debug_mode: true } });
    stateManager.updateUIState({
      theme: "dark",
      buttonPosition: { x: 4, y: 5 },
      buttonVisible: false,
    });
    (stateManager as any).state.downloads.history = [{ url: "u", status: "completed" }];

    await stateManager.saveToStorage();
    expect(setMock).toHaveBeenCalled();
    const arg = (setMock as any).mock.calls[0][0] as any;
    expect(arg.serverPort).toBe(6000);
    expect(arg.serverConfig).toEqual({ debug_mode: true });
    expect(arg.theme).toBe("dark");
    expect(arg.buttonState).toEqual({ position: { x: 4, y: 5 }, visible: false });
    expect(arg.downloadHistory.length).toBe(1);
  });

  it("reset restores defaults", () => {
    stateManager.updateServerState({ port: 1, status: "connected" });
    stateManager.updateUIState({ theme: "dark", isDragging: true });
    stateManager.updateDownloadState({ queue: ["x"] });
    stateManager.reset();
    const s = stateManager.getState();
    expect(s.server.port).toBeNull();
    expect(s.server.status).toBe("disconnected");
    expect(s.ui.theme).toBe("light");
    expect(s.downloads.queue).toEqual([]);
  });
});
