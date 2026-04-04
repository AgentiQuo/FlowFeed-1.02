import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { queueRouter } from "./routers/queue";
import { eq } from "drizzle-orm";
import { drafts, posts } from "../drizzle/schema";
import { getDb } from "./db";

describe("Queue Router - Add To Queue", () => {
  let testDraftId: string;
  let testBrandId: string;
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    testBrandId = "5c2b97a4-0000-0000-0000-000000000001";
    testDraftId = "test-draft-queue-001";

    // Create a test draft
    await db
      .insert(drafts)
      .values({
        id: testDraftId,
        brandId: testBrandId,
        assetId: "test-asset-001",
        categoryId: "test-category-001",
        platform: "instagram",
        content:
          "Stunning luxury penthouse with panoramic city views. 3 bedrooms, 2 bathrooms. Premium finishes and smart home technology.",
        status: "reviewed",
        sourceReference: "test-source",
      })
      .catch(() => null);
  });

  afterAll(async () => {
    // Clean up test data
    if (db) {
      await db.delete(drafts).where(eq(drafts.id, testDraftId)).catch(() => null);
      await db.delete(posts).where(eq(posts.draftId, testDraftId)).catch(() => null);
    }
  });

  it("should add an approved draft to queue", async () => {
    const caller = queueRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.addToQueue({
      brandId: testBrandId,
      draftId: testDraftId,
      platforms: ["instagram"],
    });

    expect(result).toHaveProperty("success");
    expect(result.success).toBe(true);
    expect(result).toHaveProperty("count");
    expect(result.count).toBe(1);
  });

  it("should create a post entry in the queue", async () => {
    const caller = queueRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    // Add draft to queue
    await caller.addToQueue({
      brandId: testBrandId,
      draftId: testDraftId,
      platforms: ["instagram"],
    });

    // Verify post was created
    const queuedPosts = await caller.getQueueByBrand({
      brandId: testBrandId,
    });

    const movedPost = queuedPosts.find((p: any) => p.draftId === testDraftId);
    expect(movedPost).toBeDefined();
    expect(movedPost.status).toBe("scheduled");
    expect(movedPost.content).toContain("Stunning luxury penthouse");
  });

  it("should handle multiple platforms", async () => {
    const testDraftId2 = "test-draft-queue-002";

    // Create test draft
    await db
      .insert(drafts)
      .values({
        id: testDraftId2,
        brandId: testBrandId,
        assetId: "test-asset-002",
        categoryId: "test-category-001",
        platform: "linkedin",
        content: "Professional real estate content for LinkedIn",
        status: "reviewed",
        sourceReference: "test-source-2",
      })
      .catch(() => null);

    const caller = queueRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.addToQueue({
      brandId: testBrandId,
      draftId: testDraftId2,
      platforms: ["instagram", "x", "linkedin", "facebook"],
    });

    expect(result.success).toBe(true);
    expect(result.count).toBe(4);

    // Clean up
    await db.delete(drafts).where(eq(drafts.id, testDraftId2)).catch(() => null);
    await db.delete(posts).where(eq(posts.draftId, testDraftId2)).catch(() => null);
  });

  it("should return error for non-existent draft", async () => {
    const caller = queueRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    try {
      await caller.addToQueue({
        brandId: testBrandId,
        draftId: "non-existent-draft-id",
        platforms: ["instagram"],
      });
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).toContain("not found");
    }
  });

  it("should schedule posts independently per brand+platform combo", async () => {
    const testDraftId3 = "test-draft-queue-003";

    // Create test draft
    await db
      .insert(drafts)
      .values({
        id: testDraftId3,
        brandId: testBrandId,
        assetId: "test-asset-003",
        categoryId: "test-category-001",
        platform: "instagram",
        content: "Test content for scheduling",
        status: "reviewed",
        sourceReference: "test-source-3",
      })
      .catch(() => null);

    const caller = queueRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    // Add with multiple platforms - each should get independent scheduling
    const result = await caller.addToQueue({
      brandId: testBrandId,
      draftId: testDraftId3,
      platforms: ["instagram", "x"],
    });

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);

    // Verify posts were created for each platform
    const queuedPosts = await caller.getQueueByBrand({
      brandId: testBrandId,
    });

    const movedPosts = queuedPosts.filter((p: any) => p.draftId === testDraftId3);
    expect(movedPosts.length).toBe(2);
    expect(movedPosts.map((p: any) => p.platform).sort()).toEqual(["instagram", "x"]);

    // Clean up
    await db.delete(drafts).where(eq(drafts.id, testDraftId3)).catch(() => null);
    await db.delete(posts).where(eq(posts.draftId, testDraftId3)).catch(() => null);
  });
});
