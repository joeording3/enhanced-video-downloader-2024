import { checkServerStatus } from "../../extension/src/background";
import { getServerPort } from "../../extension/src/core/constants";

// Mock global fetch
const mockFetch = jest.fn();

describe("checkServerStatus - Simple Test", () => {
  beforeEach(() => {
    // Debug environment variables
    console.log("Environment variables:");
    console.log("process.env.JEST_WORKER_ID:", process.env.JEST_WORKER_ID);
    console.log("process.env.NODE_ENV:", process.env.NODE_ENV);
    console.log("typeof process:", typeof process);

    // Setup global mocks
    (global as any).fetch = mockFetch;

    // Reset all mocks
    jest.clearAllMocks();

    // Mock chrome.storage.local.set and get to return promises
    (global as any).chrome.storage.local.set = jest.fn().mockResolvedValue(undefined);
    (global as any).chrome.storage.local.get = jest.fn().mockResolvedValue({});
  });

  it("should return true for successful response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ app_name: "Enhanced Video Downloader" }),
    });

    const result = await checkServerStatus(getServerPort());
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      `http://127.0.0.1:${getServerPort()}/health`,
      expect.objectContaining({ signal: expect.anything() })
    );
  });
});
