import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { posts, drafts, contentAssets } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { protectedProcedure, router } from "../_core/trpc";

export const analyticsRouter = router({
  /**
   * Get performance metrics for a brand's posts
   */
  getBrandPerformance: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const brandPosts = await db
        .select()
        .from(posts)
        .where(eq(posts.brandId, input.brandId));

      if (!brandPosts || brandPosts.length === 0) {
        return {
          totalPosts: 0,
          totalImpressions: 0,
          totalEngagements: 0,
          totalClicks: 0,
          totalConversions: 0,
          averageEngagementRate: 0,
          platformBreakdown: {},
        };
      }

      const totalImpressions = brandPosts.reduce((sum, p) => sum + (p.impressions || 0), 0);
      const totalEngagements = brandPosts.reduce((sum, p) => sum + (p.engagements || 0), 0);
      const totalClicks = brandPosts.reduce((sum, p) => sum + (p.clicks || 0), 0);
      const totalConversions = brandPosts.reduce((sum, p) => sum + (p.conversions || 0), 0);

      const averageEngagementRate =
        totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;

      // Platform breakdown
      const platformBreakdown: Record<string, any> = {};
      brandPosts.forEach((post) => {
        if (!platformBreakdown[post.platform]) {
          platformBreakdown[post.platform] = {
            posts: 0,
            impressions: 0,
            engagements: 0,
            clicks: 0,
            conversions: 0,
            engagementRate: 0,
          };
        }
        platformBreakdown[post.platform].posts += 1;
        platformBreakdown[post.platform].impressions += post.impressions || 0;
        platformBreakdown[post.platform].engagements += post.engagements || 0;
        platformBreakdown[post.platform].clicks += post.clicks || 0;
        platformBreakdown[post.platform].conversions += post.conversions || 0;
      });

      // Calculate engagement rates per platform
      Object.keys(platformBreakdown).forEach((platform) => {
        const data = platformBreakdown[platform];
        data.engagementRate =
          data.impressions > 0 ? (data.engagements / data.impressions) * 100 : 0;
      });

      return {
        totalPosts: brandPosts.length,
        totalImpressions,
        totalEngagements,
        totalClicks,
        totalConversions,
        averageEngagementRate: Math.round(averageEngagementRate * 100) / 100,
        platformBreakdown,
      };
    }),

  /**
   * Get performance by property type
   */
  getPerformanceByPropertyType: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Get posts with their asset property types
      const brandPosts = await db
        .select({
          post: posts,
          propertyType: contentAssets.extractedMetadata,
        })
        .from(posts)
        .leftJoin(
          drafts,
          eq(posts.draftId, drafts.id)
        )
        .leftJoin(
          contentAssets,
          eq(drafts.assetId, contentAssets.id)
        )
        .where(eq(posts.brandId, input.brandId));

      const propertyTypeMetrics: Record<string, any> = {};

      brandPosts.forEach((record) => {
        const metadata = record.propertyType as any;
        const propertyType = metadata?.propertyType || "Unknown";

        if (!propertyTypeMetrics[propertyType]) {
          propertyTypeMetrics[propertyType] = {
            posts: 0,
            impressions: 0,
            engagements: 0,
            clicks: 0,
            conversions: 0,
            engagementRate: 0,
          };
        }

        propertyTypeMetrics[propertyType].posts += 1;
        propertyTypeMetrics[propertyType].impressions += record.post.impressions || 0;
        propertyTypeMetrics[propertyType].engagements += record.post.engagements || 0;
        propertyTypeMetrics[propertyType].clicks += record.post.clicks || 0;
        propertyTypeMetrics[propertyType].conversions += record.post.conversions || 0;
      });

      // Calculate engagement rates
      Object.keys(propertyTypeMetrics).forEach((type) => {
        const data = propertyTypeMetrics[type];
        data.engagementRate =
          data.impressions > 0 ? (data.engagements / data.impressions) * 100 : 0;
      });

      return propertyTypeMetrics;
    }),

  /**
   * Update post engagement metrics (called when analytics data is synced)
   */
  updatePostMetrics: protectedProcedure
    .input(
      z.object({
        postId: z.string(),
        impressions: z.number().optional(),
        engagements: z.number().optional(),
        clicks: z.number().optional(),
        conversions: z.number().optional(),
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

      const updateData: Record<string, any> = {};
      if (input.impressions !== undefined) updateData.impressions = input.impressions;
      if (input.engagements !== undefined) updateData.engagements = input.engagements;
      if (input.clicks !== undefined) updateData.clicks = input.clicks;
      if (input.conversions !== undefined) updateData.conversions = input.conversions;

      await db.update(posts).set(updateData).where(eq(posts.id, input.postId));

      return { success: true };
    }),

  /**
   * Get top performing posts
   */
  getTopPerformingPosts: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        limit: z.number().default(10),
        metric: z.enum(["engagements", "clicks", "conversions"]).default("engagements"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const metricColumn =
        input.metric === "engagements"
          ? posts.engagements
          : input.metric === "clicks"
            ? posts.clicks
            : posts.conversions;

      const topPosts = await db
        .select()
        .from(posts)
        .where(eq(posts.brandId, input.brandId))
        .orderBy(sql`${metricColumn} DESC`)
        .limit(input.limit);

      return topPosts;
    }),
});
