import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { exportRouter } from "./routers/export";
import { eq } from "drizzle-orm";
import { drafts } from "../drizzle/schema";
import { getDb } from "./db";

describe("Export Router", () => {
  let testDraftId: string;
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    // Create a test draft
    const result = await db
      .insert(drafts)
      .values({
        id: "test-draft-export-001",
        brandId: "5c2b97a4-0000-0000-0000-000000000001",
        assetId: "test-asset-001",
        categoryId: "test-category-001",
        platform: "instagram",
        content:
          "Beautiful luxury penthouse with stunning Manhattan views. 3 bedrooms, 2 bathrooms, 2500 sqft. Premium finishes throughout. Perfect for discerning buyers.",
        status: "reviewed",
        sourceReference: "test-source",
      })
      .catch(() => null);

    testDraftId = "test-draft-export-001";
  });

  afterAll(async () => {
    // Clean up test data
    if (db) {
      await db.delete(drafts).where(eq(drafts.id, testDraftId)).catch(() => null);
    }
  });

  it("should export draft as HTML", async () => {
    const caller = exportRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.exportDraft({
      draftId: testDraftId,
      format: "html",
    });

    expect(result).toHaveProperty("filename");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("mimeType");
    expect(result.filename).toContain("instagram-post");
    expect(result.filename).toContain(".html");
    expect(result.mimeType).toBe("text/html");
    expect(result.content).toContain("<!DOCTYPE html>");
    expect(result.content).toContain("Beautiful luxury penthouse");
  });

  it("should export draft as JSON", async () => {
    const caller = exportRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.exportDraft({
      draftId: testDraftId,
      format: "json",
    });

    expect(result).toHaveProperty("filename");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("mimeType");
    expect(result.filename).toContain("instagram-post");
    expect(result.filename).toContain(".json");
    expect(result.mimeType).toBe("application/json");

    const parsed = JSON.parse(result.content);
    expect(parsed).toHaveProperty("title");
    expect(parsed).toHaveProperty("content");
    expect(parsed).toHaveProperty("status");
    expect(parsed.content).toContain("Beautiful luxury penthouse");
  });

  it("should export draft as XML", async () => {
    const caller = exportRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.exportDraft({
      draftId: testDraftId,
      format: "xml",
    });

    expect(result).toHaveProperty("filename");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("mimeType");
    expect(result.filename).toContain("instagram-post");
    expect(result.filename).toContain(".xml");
    expect(result.mimeType).toBe("application/xml");
    expect(result.content).toContain("<?xml version");
    expect(result.content).toContain("<rss version");
    expect(result.content).toContain("Beautiful luxury penthouse");
  });

  it("should return error for non-existent draft", async () => {
    const caller = exportRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    try {
      await caller.exportDraft({
        draftId: "non-existent-draft-id",
        format: "html",
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("not found");
    }
  });

  it("should support batch export as HTML", async () => {
    const caller = exportRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.exportBatch({
      draftIds: [testDraftId],
      format: "html",
    });

    expect(result).toHaveProperty("filename");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("mimeType");
    expect(result.filename).toContain("social-posts-batch");
    expect(result.mimeType).toBe("text/html");
    expect(result.content).toContain("<!DOCTYPE html>");
  });

  it("should support batch export as JSON", async () => {
    const caller = exportRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.exportBatch({
      draftIds: [testDraftId],
      format: "json",
    });

    expect(result).toHaveProperty("filename");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("mimeType");
    expect(result.filename).toContain("social-posts-batch");
    expect(result.mimeType).toBe("application/json");

    const parsed = JSON.parse(result.content);
    expect(parsed).toHaveProperty("posts");
    expect(Array.isArray(parsed.posts)).toBe(true);
  });

  it("should support batch export as XML", async () => {
    const caller = exportRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.exportBatch({
      draftIds: [testDraftId],
      format: "xml",
    });

    expect(result).toHaveProperty("filename");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("mimeType");
    expect(result.filename).toContain("social-posts-batch");
    expect(result.mimeType).toBe("application/xml");
    expect(result.content).toContain("<?xml version");
  });

  it("should provide WordPress REST API format", async () => {
    const caller = exportRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.getWordPressFormat({
      draftId: testDraftId,
    });

    expect(result).toHaveProperty("title");
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("excerpt");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("format");
    expect(result).toHaveProperty("categories");
    expect(result).toHaveProperty("tags");
    expect(result).toHaveProperty("meta");
    expect(result.status).toBe("draft");
    expect(result.categories).toContain("instagram");
  });
});
