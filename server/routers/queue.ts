import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { posts, drafts } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Smart scheduling queue management
 * Handles post scheduling with time-slot optimization
 */
export const queueRouter = router({
  /**
   * Check if a draft is already queued
   * Returns queued post info if found, null otherwise
   */
  checkDraftQueued: protectedProcedure
    .input(
      z.object({
        draftId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const queuedPost = await db
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.draftId, input.draftId),
            eq(posts.status, "scheduled" as any)
          )
        )
        .limit(1);

      if (!queuedPost || queuedPost.length === 0) {
        return null;
      }

      const post = queuedPost[0];
      return {
        isQueued: true,
        scheduledFor: post.scheduledFor,
        platform: post.platform,
        queuePosition: post.queuePosition,
      };
    }),

  /**
   * Get all queued posts for a brand
   * Returns posts ordered by scheduled time
   */
  getQueue: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const queuedPosts = await db
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.brandId, input.brandId),
            eq(posts.status, "scheduled" as any)
          )
        )
        .orderBy(posts.scheduledFor);

      // Enrich posts with asset ID from drafts for thumbnail display
      const enrichedPosts = await Promise.all(
        (queuedPosts || []).map(async (post) => {
          if (!post.draftId) return post;
          
          try {
            const draft = await db
              .select()
              .from(drafts)
              .where(eq(drafts.id, post.draftId))
              .limit(1);
            
            if (draft && draft[0] && (draft[0] as any).assetId) {
              return {
                ...post,
                assetId: (draft[0] as any).assetId,
              };
            }
          } catch (error) {
            console.error("Error enriching post with asset:", error);
          }
          return post;
        })
      );

      return enrichedPosts || [];
    }),

  /**
   * Add a draft to the queue
   * Automatically calculates optimal scheduling time
   */
  addToQueue: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        draftId: z.string(),
        platforms: z.array(z.string()),
        scheduledAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the draft
      const draftResult = await db
        .select()
        .from(drafts)
        .where(eq(drafts.id, input.draftId))
        .limit(1);

      if (!draftResult || draftResult.length === 0) {
        throw new Error("Draft not found");
      }

      const draft = draftResult[0];

      // Calculate optimal scheduling time if not provided
      let scheduledTime = input.scheduledAt || calculateOptimalScheduleTime(input.brandId);

      // Create post entry for each platform
      const newPosts = input.platforms.map((platform, index) => ({
        id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        brandId: input.brandId,
        draftId: input.draftId,
        platform: platform as "instagram" | "linkedin" | "facebook" | "website",
        content: draft.content || "",
        status: "scheduled" as const,
        scheduledFor: new Date(scheduledTime.getTime() + index * 3 * 60 * 60 * 1000),
        publishedAt: null,
        queuePosition: index,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Insert posts into database
      for (const post of newPosts) {
        await db.insert(posts).values(post as any);
      }

      return { success: true, scheduledAt: scheduledTime, count: newPosts.length };
    }),

  /**
   * Reorder queue items (drag and drop)
   * Updates scheduled times for all items in new order
   */
  reorderQueue: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        postIds: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Calculate new scheduled times with 2-3 hour gaps
      const now = new Date();
      const baseTime = new Date(now);
      baseTime.setHours(9, 0, 0, 0); // Start at 9 AM

      // If current time is past 9 AM, start from current time
      if (now.getHours() >= 9) {
        baseTime.setTime(now.getTime());
      }

      const updates = input.postIds.map((postId, index) => {
        const scheduledTime = new Date(baseTime);
        // Add 3 hour gaps between posts
        scheduledTime.setHours(scheduledTime.getHours() + index * 3);

        return { postId, scheduledTime };
      });

      // Update all posts with new scheduled times
      for (const update of updates) {
        await db
          .update(posts)
          .set({ scheduledFor: update.scheduledTime, updatedAt: new Date() })
          .where(eq(posts.id, update.postId));
      }

      return { success: true, updates };
    }),

  /**
   * Update scheduled time for a single post
   */
  updateScheduledTime: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        scheduledAt: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(posts)
        .set({ scheduledFor: input.scheduledAt, updatedAt: new Date() })
        .where(eq(posts.id, input.postId));

      return { success: true };
    }),

  /**
   * Remove a post from the queue
   */
  removeFromQueue: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(posts)
        .set({ status: "queued" as const, updatedAt: new Date() })
        .where(eq(posts.id, input.postId));

      return { success: true };
    }),

  /**
   * Publish a post immediately
   */
  publishPost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const now = new Date();
      await db
        .update(posts)
        .set({
          status: "published" as const,
          publishedAt: now,
          updatedAt: now,
        })
        .where(eq(posts.id, input.postId));

      return { success: true, publishedAt: now };
    }),

  /**
   * Get suggested optimal times for next N posts
   */
  getSuggestedTimes: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        count: z.number().min(1).max(10).default(5),
      })
    )
    .query(async ({ input }) => {
      const times: Date[] = [];
      const now = new Date();
      let currentTime = new Date(now);

      // Start at 9 AM if before that, otherwise start from current time
      if (now.getHours() < 9) {
        currentTime.setHours(9, 0, 0, 0);
      }

      for (let i = 0; i < input.count; i++) {
        times.push(new Date(currentTime));
        // Add 3 hour gaps
        currentTime.setHours(currentTime.getHours() + 3);

        // Don't schedule after 8 PM
        if (currentTime.getHours() >= 20) {
          currentTime.setDate(currentTime.getDate() + 1);
          currentTime.setHours(9, 0, 0, 0);
        }
      }

      return times;
    }),

  /**
   * Get analytics for scheduled posts
   */
  getQueueAnalytics: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { scheduled: 0, published: 0, failed: 0 };

      const scheduled = await db
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.brandId, input.brandId),
            eq(posts.status, "scheduled" as any)
          )
        );

      const published = await db
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.brandId, input.brandId),
            eq(posts.status, "published" as any)
          )
        );

      const failed = await db
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.brandId, input.brandId),
            eq(posts.status, "failed" as any)
          )
        );

      return {
        scheduled: scheduled.length,
        published: published.length,
        failed: failed.length,
      };
    }),

  /**
   * Move an approved draft directly to the queue
   * Automatically selects all platforms from the draft and schedules it
   */
  moveToQueue: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        draftId: z.string(),
        platforms: z.array(z.enum(["instagram", "linkedin", "facebook", "website"])).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the draft
      const draftResult = await db
        .select()
        .from(drafts)
        .where(eq(drafts.id, input.draftId))
        .limit(1);

      if (!draftResult || draftResult.length === 0) {
        throw new Error("Draft not found");
      }

      const draft = draftResult[0];

      // If no platforms specified, use the draft's platform
      const platforms = input.platforms || [draft.platform];

      // Calculate optimal scheduling time
      const now = new Date();
      let scheduledTime = new Date(now);
      scheduledTime.setHours(9, 0, 0, 0);

      // If current time is past 9 AM, start from current time
      if (now.getHours() >= 9) {
        scheduledTime.setTime(now.getTime());
      }

      // Create post entry for each platform
      const newPosts = platforms.map((platform, index) => ({
        id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        brandId: input.brandId,
        draftId: input.draftId,
        platform: platform as "instagram" | "linkedin" | "facebook" | "website",
        content: draft.content || "",
        status: "scheduled" as const,
        scheduledFor: new Date(scheduledTime.getTime() + index * 3 * 60 * 60 * 1000),
        publishedAt: null,
        queuePosition: index,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Insert posts into database
      for (const post of newPosts) {
        await db.insert(posts).values(post as any);
      }

      return {
        success: true,
        scheduledAt: scheduledTime,
        count: newPosts.length,
        platforms: platforms,
      };
    }),
});

/**
 * Calculate optimal scheduling time based on brand's posting patterns
 * Default: 9 AM - 8 PM with 3 hour gaps between posts
 */
function calculateOptimalScheduleTime(brandId: string): Date {
  const now = new Date();
  const scheduledTime = new Date(now);

  // Start at 9 AM
  scheduledTime.setHours(9, 0, 0, 0);

  // If current time is past 9 AM, add 3 hours to current time
  if (now.getHours() >= 9) {
    scheduledTime.setTime(now.getTime());
    scheduledTime.setHours(scheduledTime.getHours() + 3);
  }

  // Don't schedule after 8 PM - move to next day at 9 AM
  if (scheduledTime.getHours() >= 20) {
    scheduledTime.setDate(scheduledTime.getDate() + 1);
    scheduledTime.setHours(9, 0, 0, 0);
  }

  return scheduledTime;
}
