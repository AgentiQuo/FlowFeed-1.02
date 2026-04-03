import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { queueRouter } from "./routers/queue";
import { eq } from "drizzle-orm";
import { drafts, posts } from "../drizzle/schema";
import { getDb } from "./db";

describe("Queue Router - Check Draft Queued Indicator", () => {
  let testDraftId: string;
  let testBrandId: string;
  let testPostId: string;
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }

    testBrandId = "5c2b97a4-0000-0000-0000-000000000001";
    testDraftId = "test-draft-indicator-001";
    testPostId = "test-post-indicator-001";

    // Create a test draft
    await db
      .insert(drafts)
      .values({
        id: testDraftId,
        brandId: testBrandId,
        assetId: "test-asset-001",
        categoryId: "test-category-001",
        platform: "instagram",
        content: "Test content for queue indicator",
        status: "reviewed",
        sourceReference: "test-source",
      })
      .catch(() => null);

    // Create a queued post for this draft
    await db
      .insert(posts)
      .values({
        id: testPostId,
        brandId: testBrandId,
        draftId: testDraftId,
        platform: "instagram",
        content: "Test content for queue indicator",
        status: "scheduled",
        scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000),
        publishedAt: null,
        queuePosition: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .catch(() => null);
  });

  afterAll(async () => {
    // Clean up test data
    if (db) {
      await db.delete(posts).where(eq(posts.id, testPostId)).catch(() => null);
      await db.delete(drafts).where(eq(drafts.id, testDraftId)).catch(() => null);
    }
  });

  it("should return queued status for a draft that is in the queue", async () => {
    const caller = queueRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.checkDraftQueued({
      draftId: testDraftId,
    });

    expect(result).not.toBeNull();
    expect(result).toHaveProperty("isQueued");
    expect(result?.isQueued).toBe(true);
    expect(result).toHaveProperty("scheduledFor");
    expect(result).toHaveProperty("platform");
    expect(result?.platform).toBe("instagram");
  });

  it("should return null for a draft that is not in the queue", async () => {
    const caller = queueRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.checkDraftQueued({
      draftId: "non-existent-draft-id",
    });

    expect(result).toBeNull();
  });

  it("should include scheduled time in the response", async () => {
    const caller = queueRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.checkDraftQueued({
      draftId: testDraftId,
    });

    expect(result?.scheduledFor).toBeDefined();
    expect(result?.scheduledFor instanceof Date).toBe(true);
  });

  it("should include queue position in the response", async () => {
    const caller = queueRouter.createCaller({
      user: { id: "test-user", role: "user" },
      req: {} as any,
      res: {} as any,
    });

    const result = await caller.checkDraftQueued({
      draftId: testDraftId,
    });

    expect(result).toHaveProperty("queuePosition");
    expect(typeof result?.queuePosition).toBe("number");
  });
});
