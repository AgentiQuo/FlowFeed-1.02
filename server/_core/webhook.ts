import crypto from "crypto";
import { getDb } from "../db";
import { posts, contentAssets } from "../../drizzle/schema";
import { eq, and, lte } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { postImageToInstagram } from "./instagram";
import { postToX } from "./x-api";

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return hash === signature;
}

/**
 * Process scheduled posts that are due to be published
 */
export async function processScheduledPosts() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();

  // Find all posts scheduled for now or earlier that haven't been published
  const duePosts = await db
    .select()
    .from(posts)
    .where(
      and(
        eq(posts.status, "scheduled" as any),
        lte(posts.scheduledFor, now)
      )
    );

  const results = {
    published: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const post of duePosts) {
    try {
      // Get draft details
      const { drafts } = await import("../../drizzle/schema");
      const draftResult = await db
        .select()
        .from(drafts)
        .where(eq(drafts.id, post.draftId));

      if (!draftResult || draftResult.length === 0) {
        throw new Error(`Draft ${post.draftId} not found`);
      }

      const draft = draftResult[0];

      // Publish based on platform
      switch (post.platform) {
        case "instagram":
          await publishToInstagram(draft, post);
          break;
        case "x":
          await publishToX(draft, post);
          break;
        case "facebook":
          // Facebook integration would go here
          console.log("Facebook publishing not yet implemented");
          break;
        case "website":
          // Website posting would go here
          console.log("Website publishing not yet implemented");
          break;
      }

      // Mark as published
      await db
        .update(posts)
        .set({
          status: "published" as const,
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(posts.id, post.id));

      results.published++;
    } catch (error: any) {
      results.failed++;
      results.errors.push(
        `Post ${post.id}: ${error.message}`
      );
      console.error(`Failed to publish post ${post.id}:`, error);
    }
  }

  return results;
}

/**
 * Publish draft to Instagram
 */
async function publishToInstagram(draft: any, post: any) {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

  if (!accessToken || !accountId) {
    throw new Error("Instagram credentials not configured");
  }

  // Get asset image URL
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const assetResults = await db
    .select()
    .from(contentAssets)
    .where(eq(contentAssets.id, draft.assetId));

  if (!assetResults || assetResults.length === 0 || !assetResults[0].s3Url) {
    throw new Error("Asset image not found");
  }

  const imageUrl = assetResults[0].s3Url;

  await postImageToInstagram({
    imageUrl,
    caption: draft.content,
    accountId,
    accessToken,
  });
}

/**
 * Publish draft to X
 */
async function publishToX(draft: any, post: any) {
  const bearerToken = process.env.X_BEARER_TOKEN;

  if (!bearerToken) {
    throw new Error("X credentials not configured");
  }

  await postToX({
    text: draft.content,
    bearerToken,
  });
}

/**
 * Schedule webhook to check for due posts
 * This would typically be called by a cron job or background worker
 */
export async function scheduleWebhookCheck() {
  // In production, this would be triggered by a cron job or message queue
  // For now, it's called manually via an API endpoint
  return processScheduledPosts();
}
