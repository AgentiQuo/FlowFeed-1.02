import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb, getPostingSchedule, getLastScheduledPost } from "../db";
import { posts, drafts } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { processScheduledPosts } from "../_core/webhook";

/**
 * Smart scheduling queue management
 * Handles post scheduling with time-slot optimization per brand+platform
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
   * Get all scheduled posts across all brands
   * Returns posts ordered by scheduled time, optionally filtered by brand
   */
  getAllScheduledPosts: protectedProcedure
    .input(z.object({ brandId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) return [];

      let query = db
        .select()
        .from(posts)
        .where(eq(posts.status, "scheduled" as any));

      // Filter by brand if provided
      if (input.brandId) {
        query = db
          .select()
          .from(posts)
          .where(
            and(
              eq(posts.brandId, input.brandId),
              eq(posts.status, "scheduled" as any)
            )
          );
      }

      const queuedPosts = await query.orderBy(posts.scheduledFor);
      return queuedPosts.map((post) => ({
        ...post,
        scheduledFor: post.scheduledFor ? new Date(post.scheduledFor) : null,
      }));
    }),

  /**
   * Get queue for a specific brand
   * Returns all scheduled posts for the brand, ordered by time
   */
  getQueueByBrand: protectedProcedure
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

      return queuedPosts.map((post) => ({
        ...post,
        scheduledFor: post.scheduledFor ? new Date(post.scheduledFor) : null,
      }));
    }),

  /**
   * Get queue for a specific brand and platform
   * Returns all scheduled posts for the brand+platform combo, ordered by time
   */
  getQueueByBrandAndPlatform: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        platform: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const queuedPosts = await db
        .select()
        .from(posts)
        .where(
          and(
            eq(posts.brandId, input.brandId),
            eq(posts.platform, input.platform as any),
            eq(posts.status, "scheduled" as any)
          )
        )
        .orderBy(posts.scheduledFor);

      return queuedPosts.map((post) => ({
        ...post,
        scheduledFor: post.scheduledFor ? new Date(post.scheduledFor) : null,
      }));
    }),

  /**
   * Add draft to queue for specified platforms
   * Schedules each platform independently based on brand+platform posting rhythm
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

      // Create post entry for each platform with independent scheduling per brand+platform combo
      const newPosts = [];
      
      for (const platform of input.platforms) {
        // Calculate optimal scheduling time for this specific brand+platform combination
        const scheduledTime = input.scheduledAt || await calculateOptimalScheduleTime(input.brandId, platform);
        
        const post = {
          id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          brandId: input.brandId,
          draftId: input.draftId,
          platform: platform as "instagram" | "linkedin" | "facebook" | "website",
          content: draft.content || "",
          status: "scheduled" as const,
          scheduledFor: scheduledTime,
          publishedAt: null,
          queuePosition: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        newPosts.push(post);
        await db.insert(posts).values(post as any);
      }

      return { success: true, count: newPosts.length };
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
      let currentTime = new Date(now);

      for (let i = 0; i < input.postIds.length; i++) {
        // Add 2-3 hours between posts
        if (i > 0) {
          currentTime.setHours(currentTime.getHours() + 2 + Math.random());
        }

        // Update post scheduled time
        const postId = input.postIds[i];
        await db
          .update(posts)
          .set({ scheduledFor: currentTime })
          .where(eq(posts.id, postId));
      }

      return { success: true };
    }),

  /**
   * Move post to a specific time
   */
  reschedulePost: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        scheduledFor: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(posts)
        .set({ scheduledFor: input.scheduledFor })
        .where(eq(posts.id, input.postId));

      return { success: true };
    }),

  /**
   * Remove post from queue
   */
  removeFromQueue: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.update(posts).set({ status: "queued" }).where(eq(posts.id, input.postId));

      return { success: true };
    }),

  /**
   * Approve and schedule a post immediately
   */
  publishPost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const postResult = await db
        .select()
        .from(posts)
        .where(eq(posts.id, input.postId))
        .limit(1);

      if (!postResult || postResult.length === 0) {
        throw new Error("Post not found");
      }

      const post = postResult[0];

      // Update post status to published
      await db
        .update(posts)
        .set({
          status: "published",
          publishedAt: new Date(),
        })
        .where(eq(posts.id, input.postId));

      // TODO: Call actual social media API to publish
      // For now, just mark as published

      return { success: true, post };
    }),

  /**
   * Get a specific post
   */
  getPost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const result = await db
        .select()
        .from(posts)
        .where(eq(posts.id, input.postId))
        .limit(1);

      if (!result || result.length === 0) {
        return null;
      }

      const post = result[0];
      return {
        ...post,
        scheduledFor: post.scheduledFor ? new Date(post.scheduledFor) : null,
      };
    }),

  /**
   * Get all posts for a brand (all statuses)
   */
  getAllPostsByBrand: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const allPosts = await db
        .select()
        .from(posts)
        .where(eq(posts.brandId, input.brandId))
        .orderBy(posts.createdAt);

      return allPosts.map((post) => ({
        ...post,
        scheduledFor: post.scheduledFor ? new Date(post.scheduledFor) : null,
      }));
    }),

  /**
   * Get published posts for a brand
   */
  getPublishedPostsByBrand: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const publishedPosts = await db
        .select()
        .from(posts)
        .where(
          and(eq(posts.brandId, input.brandId), eq(posts.status, "published" as any))
        )
        .orderBy(posts.publishedAt);

      return publishedPosts.map((post) => ({
        ...post,
        publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
      }));
    }),

  /**
   * Get failed posts for a brand
   */
  getFailedPostsByBrand: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const failedPosts = await db
        .select()
        .from(posts)
        .where(
          and(eq(posts.brandId, input.brandId), eq(posts.status, "failed" as any))
        );

      return failedPosts.map((post) => ({
        ...post,
        scheduledFor: post.scheduledFor ? new Date(post.scheduledFor) : null,
      }));
    }),
});

/**
 * Calculate optimal scheduling time for a brand+platform combination
 * Uses platform-specific schedules to maintain human-like posting rhythm
 */
async function calculateOptimalScheduleTime(brandId: string, platform: string): Promise<Date> {
  // Get the posting schedule for this platform
  const scheduleResult = await getPostingSchedule(platform);
  const schedule = scheduleResult && scheduleResult.length > 0 ? scheduleResult[0] : null;
  
  if (!schedule) {
    // Fallback to default 3-hour interval if no schedule found
    const now = new Date();
    now.setHours(now.getHours() + 3);
    return now;
  }
  
  // Get the last scheduled post for this brand+platform combo
  const lastPost = await getLastScheduledPost(brandId, platform);
  
  let nextSlotTime = new Date();
  
  if (lastPost && lastPost.scheduledFor) {
    // Schedule after the last post for this brand+platform
    const lastTime = new Date(lastPost.scheduledFor);
    const minHours = schedule.minHoursBetweenPosts;
    const maxHours = schedule.maxHoursBetweenPosts;
    
    // Random interval between min and max hours
    const randomHours = minHours + Math.random() * (maxHours - minHours);
    nextSlotTime = new Date(lastTime.getTime() + randomHours * 60 * 60 * 1000);
  } else {
    // First post for this brand+platform - schedule 3 hours from now
    nextSlotTime = new Date();
    nextSlotTime.setHours(nextSlotTime.getHours() + 3);
  }
  
  // Ensure we don't schedule after 8 PM
  if (nextSlotTime.getHours() >= 20) {
    nextSlotTime.setDate(nextSlotTime.getDate() + 1);
    nextSlotTime.setHours(9, 0, 0, 0);
  }
  
  return nextSlotTime;
}
