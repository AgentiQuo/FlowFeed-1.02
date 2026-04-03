import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { posts, drafts } from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { protectedProcedure, router } from "../_core/trpc";

const POSTING_HOURS = { start: 9, end: 20 }; // 9 AM to 8 PM
const MIN_GAP_HOURS = 3; // Minimum 3 hours between posts

export const bulkScheduleRouter = router({
  /**
   * Schedule multiple drafts with staggered timing
   */
  scheduleBulkDrafts: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        draftIds: z.array(z.string()).min(1),
        startDate: z.date(),
        platforms: z.array(z.enum(["instagram", "linkedin", "facebook", "x", "website"])).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Get drafts to verify they exist and belong to user's brand
      const draftsData = await db
        .select()
        .from(drafts)
        .where(
          and(
            eq(drafts.brandId, input.brandId),
            inArray(drafts.id, input.draftIds)
          )
        );

      if (draftsData.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No drafts found",
        });
      }

      // Generate staggered schedule
      const schedule = generateStaggeredSchedule(
        input.startDate,
        draftsData.length,
        input.platforms
      );

      // Create posts for each draft
      const createdPosts = await Promise.all(
        draftsData.map(async (draft, index) => {
          const scheduledTime = schedule[index];
          const postId = nanoid();

          await db.insert(posts).values({
            id: postId,
            brandId: input.brandId,
            draftId: draft.id,
            platform: scheduledTime.platform as any,
            content: draft.content,
            status: "scheduled",
            scheduledFor: scheduledTime.time,
            queuePosition: index,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          return {
            postId,
            draftId: draft.id,
            platform: scheduledTime.platform,
            scheduledFor: scheduledTime.time,
          };
        })
      );

      return {
        success: true,
        postsCreated: createdPosts.length,
        posts: createdPosts,
      };
    }),

  /**
   * Get suggested posting times for optimal engagement
   */
  getSuggestedPostingTimes: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        draftCount: z.number().min(1),
        startDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      const schedule = generateStaggeredSchedule(
        input.startDate,
        input.draftCount
      );

      return schedule.map((item, index) => ({
        position: index + 1,
        platform: item.platform,
        suggestedTime: item.time.toISOString(),
        dayOfWeek: item.time.toLocaleDateString("en-US", { weekday: "long" }),
        timeOfDay: item.time.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        }),
      }));
    }),

  /**
   * Reschedule a bulk post group
   */
  rescheduleBulkPosts: protectedProcedure
    .input(
      z.object({
        postIds: z.array(z.string()).min(1),
        newStartDate: z.date(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Get existing posts
      const existingPosts = await db
        .select()
        .from(posts)
        .where(inArray(posts.id, input.postIds));

      if (existingPosts.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No posts found",
        });
      }

      // Generate new schedule
      const schedule = generateStaggeredSchedule(
        input.newStartDate,
        existingPosts.length
      );

      // Update posts with new times
      const updatedPosts = await Promise.all(
        existingPosts.map(async (post, index) => {
          const newTime = schedule[index].time;

          await db
            .update(posts)
            .set({
              scheduledFor: newTime,
              updatedAt: new Date(),
            })
            .where(eq(posts.id, post.id));

          return {
            postId: post.id,
            newScheduledTime: newTime,
          };
        })
      );

      return {
        success: true,
        postsRescheduled: updatedPosts.length,
        posts: updatedPosts,
      };
    }),
});

/**
 * Generate staggered posting schedule with platform rotation
 */
function generateStaggeredSchedule(
  startDate: Date,
  count: number,
  preferredPlatforms?: string[]
): Array<{ time: Date; platform: string }> {
  const platforms = preferredPlatforms || [
    "instagram",
    "linkedin",
    "facebook",
    "x",
    "website",
  ];
  const schedule: Array<{ time: Date; platform: string }> = [];

  let currentDate = new Date(startDate);
  currentDate.setHours(POSTING_HOURS.start, 0, 0, 0); // Start at 9 AM

  for (let i = 0; i < count; i++) {
    // Check if we've exceeded the posting window for the day
    if (currentDate.getHours() + MIN_GAP_HOURS > POSTING_HOURS.end) {
      // Move to next day at start time
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(POSTING_HOURS.start, 0, 0, 0);
    }

    const platform = platforms[i % platforms.length];
    schedule.push({
      time: new Date(currentDate),
      platform,
    });

    // Add gap for next post
    currentDate.setHours(currentDate.getHours() + MIN_GAP_HOURS);
  }

  return schedule;
}
