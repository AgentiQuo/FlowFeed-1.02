import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { postImageToInstagram, postCarouselToInstagram } from "./instagram";
import { postToX } from "./x-api";
import { verifyWebhookSignature } from "./webhook";
import crypto from "crypto";

// Mock axios
vi.mock("axios");
const mockedAxios = axios as any;

describe("Instagram API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should post a single image to Instagram", async () => {
    const mockResponse = { data: { id: "123456" } };
    mockedAxios.post.mockResolvedValueOnce(mockResponse); // Container creation
    mockedAxios.post.mockResolvedValueOnce({ data: { id: "789" } }); // Publish

    const result = await postImageToInstagram({
      imageUrl: "https://example.com/image.jpg",
      caption: "Test post",
      accountId: "test-account",
      accessToken: "test-token",
    });

    expect(result.success).toBe(true);
    expect(result.platform).toBe("instagram");
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it("should handle Instagram API errors", async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: {
        data: {
          error: { message: "Invalid access token" },
        },
      },
    });

    await expect(
      postImageToInstagram({
        imageUrl: "https://example.com/image.jpg",
        caption: "Test post",
        accountId: "test-account",
        accessToken: "invalid-token",
      })
    ).rejects.toThrow("Failed to post to Instagram");
  });

  it("should post a carousel to Instagram", async () => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: { id: "media-1" } }) // First image
      .mockResolvedValueOnce({ data: { id: "media-2" } }) // Second image
      .mockResolvedValueOnce({ data: { id: "carousel-123" } }) // Carousel container
      .mockResolvedValueOnce({ data: { id: "published-123" } }); // Publish

    const result = await postCarouselToInstagram({
      mediaUrls: ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
      caption: "Carousel post",
      accountId: "test-account",
      accessToken: "test-token",
    });

    expect(result.success).toBe(true);
    expect(result.platform).toBe("instagram");
    expect(mockedAxios.post).toHaveBeenCalledTimes(4);
  });
});

describe("X API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should post text to X", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: { data: { id: "tweet-123" } },
    });

    const result = await postToX({
      text: "Hello from Social Poster!",
      bearerToken: "test-bearer-token",
    });

    expect(result.success).toBe(true);
    expect(result.platform).toBe("x");
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining("tweets"),
      expect.objectContaining({ text: "Hello from Social Poster!" }),
      expect.any(Object)
    );
  });

  it("should handle X API errors", async () => {
    mockedAxios.post.mockRejectedValueOnce({
      response: {
        data: { detail: "Unauthorized" },
      },
    });

    await expect(
      postToX({
        text: "Test",
        bearerToken: "invalid-token",
      })
    ).rejects.toThrow("Failed to post to X");
  });
});

describe("Webhook Signature Verification", () => {
  it("should verify valid webhook signature", () => {
    const secret = "test-secret";
    const payload = "test-payload";
    const hash = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const isValid = verifyWebhookSignature(payload, hash, secret);
    expect(isValid).toBe(true);
  });

  it("should reject invalid webhook signature", () => {
    const secret = "test-secret";
    const payload = "test-payload";
    const invalidHash = "invalid-hash";

    const isValid = verifyWebhookSignature(payload, invalidHash, secret);
    expect(isValid).toBe(false);
  });

  it("should reject signature with wrong secret", () => {
    const secret = "test-secret";
    const wrongSecret = "wrong-secret";
    const payload = "test-payload";
    const hash = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    const isValid = verifyWebhookSignature(payload, hash, wrongSecret);
    expect(isValid).toBe(false);
  });
});
