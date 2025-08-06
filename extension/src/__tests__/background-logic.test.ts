import { discoverServerPort } from "../background-logic";
import { getServerPort, getPortRange } from "../constants";

describe("discoverServerPort", () => {
  const defaultPort = getServerPort();
  const maxPort = getPortRange()[1];
  let calls: number[];
  let storageService: any;
  beforeEach(() => {
    calls = [];
    storageService = {
      getPort: jest.fn(),
      setPort: jest.fn(),
    };
  });

  it("returns cached port if valid", async () => {
    const cachedPort = getServerPort() + 1;
    storageService.getPort.mockResolvedValue(cachedPort);
    const checkStatus = jest.fn().mockImplementation((port) => {
      calls.push(port);
      return Promise.resolve(true);
    });
    const port = await discoverServerPort(
      storageService,
      checkStatus,
      defaultPort,
      maxPort,
      false
    );
    expect(port).toBe(cachedPort);
    expect(calls).toEqual([cachedPort]);
    // should not scan other ports
    expect(storageService.setPort).not.toHaveBeenCalled();
  });

  it("scans all ports when cached invalid and caches discovered port", async () => {
    const cachedPort = getServerPort() + 1;
    const discoveredPort = getServerPort() + 2;
    storageService.getPort.mockResolvedValue(cachedPort);
    const statuses: Record<number, boolean> = {
      [getServerPort()]: false,
      [cachedPort]: false,
      [discoveredPort]: true,
    };
    const checkStatus = jest.fn().mockImplementation((port) => {
      calls.push(port);
      return Promise.resolve(statuses[port]);
    });
    const port = await discoverServerPort(
      storageService,
      checkStatus,
      defaultPort,
      maxPort,
      false
    );
    expect(port).toBe(discoveredPort);
    // The actual implementation scans the full port range, so we expect more calls
    // but we can verify the key calls are in the right order
    expect(calls).toContain(cachedPort);
    expect(calls).toContain(getServerPort());
    expect(calls).toContain(discoveredPort);
    expect(calls.indexOf(cachedPort)).toBeLessThan(
      calls.indexOf(discoveredPort)
    );
    // should expire cache then set new cache
    expect(storageService.setPort).toHaveBeenCalledWith(null);
    expect(storageService.setPort).toHaveBeenCalledWith(discoveredPort);
  });

  it("scans ports when no cache", async () => {
    storageService.getPort.mockResolvedValue(null);
    const discoveredPort = getServerPort() + 1;
    const statuses: Record<number, boolean> = {
      [getServerPort()]: false,
      [discoveredPort]: true,
      [getServerPort() + 2]: true,
    };
    const checkStatus = jest
      .fn()
      .mockImplementation((port) => Promise.resolve(statuses[port]));
    const port = await discoverServerPort(
      storageService,
      checkStatus,
      defaultPort,
      maxPort,
      false
    );
    expect(port).toBe(discoveredPort);
    expect(storageService.setPort).toHaveBeenCalledWith(discoveredPort);
  });

  it("forces scan when startScan is true", async () => {
    const cachedPort = getServerPort() + 1;
    const discoveredPort = getServerPort() + 2;
    storageService.getPort.mockResolvedValue(cachedPort);
    const statuses: Record<number, boolean> = {
      [getServerPort()]: false,
      [cachedPort]: false,
      [discoveredPort]: true,
    };
    const checkStatus = jest.fn().mockImplementation((port) => {
      calls.push(port);
      return Promise.resolve(statuses[port]);
    });
    const port = await discoverServerPort(
      storageService,
      checkStatus,
      defaultPort,
      maxPort,
      true
    );
    expect(port).toBe(discoveredPort);
    // should not return cached, so calls start with scanning all
    // The actual implementation scans the full port range, so we expect more calls
    // but we can verify the key calls are in the right order
    expect(calls).toContain(getServerPort());
    expect(calls).toContain(cachedPort);
    expect(calls).toContain(discoveredPort);
    expect(calls.indexOf(getServerPort())).toBeLessThan(
      calls.indexOf(discoveredPort)
    );
  });

  it("returns null if no port found", async () => {
    storageService.getPort.mockResolvedValue(null);
    const checkStatus = jest.fn().mockResolvedValue(false);
    const port = await discoverServerPort(
      storageService,
      checkStatus,
      defaultPort,
      maxPort,
      false
    );
    expect(port).toBeNull();
    expect(storageService.setPort).not.toHaveBeenCalled();
  });
});
