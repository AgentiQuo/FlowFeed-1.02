import { describe, it, expect, vi, beforeEach } from "vitest";
import { publishToInstagram } from "./_core/social-media-publishing";

// Mock fetch globally
global.fetch = vi.fn();

describe("Instagram Publishing with /me Endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch businessAccountId from /me endpoint if not provided", async () => {
    const mockFetch = global.fetch as any;

    // Mock /me endpoint response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user_id: "17841400963310000" }),
    });

    // Mock container creation response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "container-123" }),
    });

    // Mock publish response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "post-456" }),
    });

    const result = await publishToInstagram(
      "test-token",
      "", // Empty businessAccountId - should be fetched
      "https://example.com/image.jpg",
      "Test caption"
    );

    expect(result.success).toBe(true);
    expect(result.postId).toBe("post-456");
    
    // Verify /me endpoint was called first with user_id field
    const calls = (mockFetch as any).mock.calls;
    expect(calls[0][0]).toContain("/me?fields=user_id");
  });

  it("should successfully publish with valid businessAccountId", async () => {
    const mockFetch = global.fetch as any;

    // Mock container creation response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "container-123" }),
    });

    // Mock publish response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "post-456" }),
    });

    const result = await publishToInstagram(
      "test-token",
      "17841400963310000", // Valid businessAccountId
      "https://example.com/image.jpg",
      "Test caption"
    );

    expect(result.success).toBe(true);
    expect(result.postId).toBe("post-456");
    expect(result.platform).toBe("instagram");
  });

  it("should handle /me endpoint error when fetching account ID", async () => {
    const mockFetch = global.fetch as any;

    // Mock /me endpoint error response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: { message: "Invalid access token" } }),
    });

    const result = await publishToInstagram(
      "invalid-token",
      "",
      "https://example.com/image.jpg",
      "Test caption"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid access token");
  });

  it("should handle media container creation failure", async () => {
    const mockFetch = global.fetch as any;

    // Mock container creation failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Invalid image URL" } }),
    });

    const result = await publishToInstagram(
      "test-token",
      "17841400963310000",
      "https://invalid-url.jpg",
      "Test caption"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid image URL");
  });

  it("should handle publish failure", async () => {
    const mockFetch = global.fetch as any;

    // Mock container creation success
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "container-123" }),
    });

    // Mock publish failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: "Rate limit exceeded" } }),
    });

    const result = await publishToInstagram(
      "test-token",
      "17841400963310000",
      "https://example.com/image.jpg",
      "Test caption"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Rate limit exceeded");
  });

  it("should use provided businessAccountId without calling /me endpoint", async () => {
    const mockFetch = global.fetch as any;

    // Mock container creation response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "container-123" }),
    });

    // Mock publish response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "post-456" }),
    });

    await publishToInstagram(
      "test-token",
      "17841400963310000",
      "https://example.com/image.jpg",
      "Test caption"
    );

    // Should only have 2 calls (container + publish), not 3 (no /me call)
    expect(mockFetch).toHaveBeenCalledTimes(2);
    
    // Verify the businessAccountId is used in the API URLs
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("17841400963310000/media"),
      expect.any(Object)
    );

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("17841400963310000/media_publish"),
      expect.any(Object)
    );
  });
});
