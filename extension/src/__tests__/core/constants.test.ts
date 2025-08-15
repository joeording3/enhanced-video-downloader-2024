import {
  CURRENT_ENV,
  DEFAULT_CLIENT_PORT,
  DEFAULT_DOCKER_PORT,
  DEFAULT_PORT_RANGE_END,
  DEFAULT_PORT_RANGE_START,
  DEFAULT_SERVER_PORT,
  DOM_SELECTORS,
  ERROR_MESSAGES,
  getCSSSelector,
  getMessageType,
  getNotificationMessage,
  getPortRange,
  getServerPort,
  getStorageKey,
  getTestClientPort,
  getTestPortRange,
  getTestServerPort,
  isValidPort,
  MESSAGE_TYPES,
  NETWORK_CONSTANTS,
  NOTIFICATION_MESSAGES,
  PORT_CONFIG,
  STORAGE_KEYS,
} from "extension/src/core/constants";

describe("constants", () => {
  it("exposes storage keys and helpers", () => {
    expect(STORAGE_KEYS.SERVER_PORT).toBe("serverPort");
    expect(getStorageKey("SERVER_PORT")).toBe("serverPort");
    expect(getStorageKey("SERVER_PORT", "EVD")).toBe("EVD_serverPort");
  });

  it("exposes message types and helpers", () => {
    expect(MESSAGE_TYPES.GET_QUEUE).toBe("getQueue");
    expect(getMessageType("GET_QUEUE")).toBe("getQueue");
    expect(getMessageType("GET_QUEUE", "ns")).toBe("ns:getQueue");
  });

  it("exposes DOM selectors and helper", () => {
    expect(DOM_SELECTORS.STATUS_INDICATOR).toBe("#server-status-indicator");
    expect(getCSSSelector("STATUS_INDICATOR")).toBe("#server-status-indicator");
    expect(getCSSSelector("STATUS_INDICATOR", ".scope")).toBe(".scope #server-status-indicator");
  });

  it("validates ports and provides environment-aware values", () => {
    expect(isValidPort(1024)).toBe(true);
    expect(isValidPort(65535)).toBe(true);
    expect(isValidPort(80)).toBe(false);

    // Current environment should be testing under Jest
    expect(["testing", "development", "production"]).toContain(CURRENT_ENV);

    // Accessors should return numbers and configured ranges
    expect(typeof getServerPort()).toBe("number");
    expect(typeof getTestServerPort()).toBe("number");
    expect(typeof getTestClientPort()).toBe("number");
    const [start, end] = getPortRange();
    expect(start).toBeLessThanOrEqual(end);

    expect(DEFAULT_SERVER_PORT).toBe(getServerPort());
    expect(DEFAULT_CLIENT_PORT).toBeDefined();
    expect(DEFAULT_DOCKER_PORT).toBeDefined();
    expect(DEFAULT_PORT_RANGE_START).toBe(start);
    expect(DEFAULT_PORT_RANGE_END).toBe(end);

    const [tStart, tEnd] = getTestPortRange();
    expect(tStart).toBeLessThanOrEqual(tEnd);
  });

  it("formats notification messages with replacements", () => {
    const template = NOTIFICATION_MESSAGES.SERVER_CONNECTED_DETAIL;
    expect(template).toContain("{port}");
    const message = getNotificationMessage("SERVER_CONNECTED_DETAIL", { port: 1234 });
    expect(message).toContain("1234");
  });

  it("exports network constants and error messages", () => {
    expect(NETWORK_CONSTANTS.HEALTH_ENDPOINT).toBe("/health");
    expect(ERROR_MESSAGES.SERVER_NOT_AVAILABLE).toBeDefined();
    // Ensure full config object is available
    expect(PORT_CONFIG.development.server_port).toBeDefined();
  });
});
