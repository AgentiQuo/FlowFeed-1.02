import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { drafts, contentAssets, feedbackLogs } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { invokeLLM } from "../_core/llm";

export const contentRouter = router({
  /**
   * Generate AI-powered content drafts for an asset
   * Uses Claude with brand voice bible and extracted metadata
   */
  generateDrafts: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        assetId: z.string(),
        platforms: z.array(
          z.enum(["instagram", "linkedin", "facebook", "website"])
        ),
        tone: z.enum(["professional", "casual", "luxury"]).optional(),
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

      // Verify asset exists and belongs to user's brand
      const assetResult = await db
        .select()
        .from(contentAssets)
        .where(
          and(
            eq(contentAssets.id, input.assetId),
            eq(contentAssets.brandId, input.brandId)
          )
        )
        .limit(1);

      if (!assetResult || assetResult.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Asset not found",
        });
      }

      const assetData = assetResult[0];

      // Get brand with voice bible
      const { getBrandById } = await import("../db");
      const brand = await getBrandById(input.brandId);

      if (!brand) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brand not found",
        });
      }

      // Generate drafts for each platform
      const generatedDrafts = await Promise.all(
        input.platforms.map((platform) =>
          generateContentForPlatform(
            assetData,
            brand,
            platform,
            input.tone || "professional"
          )
        )
      );

      // Save drafts to database
      const savedDrafts = await Promise.all(
        generatedDrafts.map(async (draft) => {
          const draftId = nanoid();
          await db.insert(drafts).values({
            id: draftId,
            brandId: input.brandId,
            assetId: input.assetId,
            categoryId: assetData.categoryId,
            platform: draft.platform,
            content: draft.content,
            status: "draft",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          return {
            id: draftId,
            ...draft,
          };
        })
      );

      return { drafts: savedDrafts };
    }),

  /**
   * Get drafts for an asset
   */
  getDrafts: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        assetId: z.string().optional(),
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

      const conditions = [eq(drafts.brandId, input.brandId)];
      if (input.assetId) {
        conditions.push(eq(drafts.assetId, input.assetId));
      }

      return await db
        .select()
        .from(drafts)
        .where(and(...conditions));
    }),

  /**
   * Update draft content
   */
  updateDraft: protectedProcedure
    .input(
      z.object({
        draftId: z.string(),
        content: z.string(),
        feedback: z.string().optional(),
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

      // Get draft to verify it exists
      const draft = await db
        .select()
        .from(drafts)
        .where(eq(drafts.id, input.draftId))
        .limit(1);

      if (!draft || draft.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Draft not found",
        });
      }

      const draftData = draft[0];

      // Log feedback for RAG learning
      if (input.feedback) {
        await db.insert(feedbackLogs).values({
          id: nanoid(),
          brandId: draftData.brandId,
          categoryId: draftData.categoryId,
          platform: draftData.platform,
          originalContent: draftData.content,
          editedContent: input.content,
          feedback: input.feedback,
          createdAt: new Date(),
        });
      }

      // Update draft
      await db
        .update(drafts)
        .set({
          content: input.content,
          updatedAt: new Date(),
        })
        .where(eq(drafts.id, input.draftId));

      return { success: true };
    }),

  /**
   * Approve draft for scheduling
   */
  approveDraft: protectedProcedure
    .input(z.object({ draftId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      await db
        .update(drafts)
        .set({
          status: "reviewed",
          updatedAt: new Date(),
        })
        .where(eq(drafts.id, input.draftId));

      return { success: true };
    }),

  /**
   * Delete draft
   */
  deleteDraft: protectedProcedure
    .input(z.object({ draftId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      await db.delete(drafts).where(eq(drafts.id, input.draftId));

      return { success: true };
    }),
});

/**
 * Generate content for a specific platform using Claude
 */
async function generateContentForPlatform(
  asset: any,
  brand: any,
  platform: "instagram" | "linkedin" | "facebook" | "website",
  tone: string
) {
  const metadata = asset.extractedMetadata || {};

  // Build property description from metadata
  const propertyDescription = buildPropertyDescription(metadata);

  // Create platform-specific prompt
  const prompt = getPlatformPrompt(platform, propertyDescription, tone);

  // Call Claude via LLM helper
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a real estate marketing expert. Use the following brand voice guidelines to generate content:\n\n${brand.voiceBible || "Professional and engaging real estate marketing content."}`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // Extract text content from response
  const messageContent = response.choices[0]?.message?.content;
  let content = "Failed to generate content";
  
  if (typeof messageContent === "string") {
    content = messageContent;
  } else if (Array.isArray(messageContent)) {
    // Extract text from array of content blocks
    const textBlock = messageContent.find((block: any) => block.type === "text") as any;
    if (textBlock && textBlock.text) {
      content = textBlock.text;
    }
  }

  return {
    platform,
    content,
  };
}

/**
 * Build property description from extracted metadata
 */
function buildPropertyDescription(metadata: any): string {
  const parts: string[] = [];

  if (metadata.bedrooms) parts.push(`${metadata.bedrooms} bedrooms`);
  if (metadata.bathrooms) parts.push(`${metadata.bathrooms} bathrooms`);
  if (metadata.squareFeet)
    parts.push(`${metadata.squareFeet.toLocaleString()} sq ft`);
  if (metadata.propertyType) parts.push(`${metadata.propertyType}`);
  if (metadata.architecturalStyle)
    parts.push(`${metadata.architecturalStyle} style`);
  if (metadata.condition) parts.push(`${metadata.condition} condition`);

  return parts.join(", ") || "Beautiful property";
}

/**
 * Get platform-specific prompt template
 */
function getPlatformPrompt(
  platform: string,
  propertyDescription: string,
  tone: string
): string {
  const basePrompt = `Generate a ${tone} ${platform} post for this property: ${propertyDescription}`;

  switch (platform) {
    case "instagram":
      return `${basePrompt}. 
      Requirements:
      - Maximum 2,200 characters
      - Include 3-5 relevant hashtags
      - Use emojis appropriately
      - Focus on visual appeal and lifestyle
      - Include call-to-action`;

    case "linkedin":
      return `${basePrompt}.
      Requirements:
      - Professional tone
      - Maximum 1,300 characters
      - Highlight investment potential or market insights
      - Include relevant industry hashtags
      - Professional call-to-action`;

    case "facebook":
      return `${basePrompt}.
      Requirements:
      - Conversational and engaging tone
      - Maximum 2,000 characters
      - Include key property features
      - Add relevant hashtags
      - Include link or contact information`;

    case "website":
      return `${basePrompt}.
      Requirements:
      - SEO-optimized description
      - 150-300 words
      - Highlight unique features
      - Professional and informative
      - Include call-to-action`;

    default:
      return basePrompt;
  }
}
