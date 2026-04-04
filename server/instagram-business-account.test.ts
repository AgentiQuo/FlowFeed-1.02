import { describe, it, expect, vi, beforeEach } from "vitest";
import { publishToInstagram } from "./_core/social-media-publishing";

// Mock fetch globally
global.fetch = vi.fn();

describe("Instagram Publishing with Business Account ID", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should require businessAccountId", async () => {
    const result = await publishToInstagram(
      "test-token",
      "", // Empty businessAccountId
      "https://example.com/image.jpg",
      "Test caption"
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Business Account ID is required");
    expect(result.error).toContain("Brand Settings");
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

  it("should include businessAccountId in API request", async () => {
    const mockFetch = global.fetch as any;

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "container-123" }),
    });

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

    // Verify the businessAccountId is used in the API URL
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
