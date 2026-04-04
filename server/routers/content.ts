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
          z.enum(["instagram", "linkedin", "facebook", "x", "website"])
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

      // Delete existing drafts for this asset+platforms to avoid duplicates
      await db
        .delete(drafts)
        .where(
          and(
            eq(drafts.brandId, input.brandId),
            eq(drafts.assetId, input.assetId)
          )
        );

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
        input.platforms.map(async (platform) => {
          const contentResult = await generateContentForPlatform(
            assetData,
            brand,
            platform,
            input.tone || "professional"
          );
          return {
            platform,
            content: contentResult,
          };
        })
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

      const conditions = [eq(drafts.brandId, input.brandId), eq(drafts.status, "draft")];
      if (input.assetId) {
        conditions.push(eq(drafts.assetId, input.assetId));
      }

      return await db
        .select()
        .from(drafts)
        .where(and(...conditions));
    }),

  /**
   * Get approved/reviewed drafts for an asset
   */
  getApprovedDrafts: protectedProcedure
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

      const conditions = [eq(drafts.brandId, input.brandId), eq(drafts.status, "reviewed")];
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
   * Approve a draft (change status from draft to reviewed)
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
   * Rewrite draft content based on user feedback
   */
  rewriteDraft: protectedProcedure
    .input(
      z.object({
        draftId: z.string(),
        feedback: z.string(),
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

      // Get draft to verify it exists and get context
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

      // Get asset and brand for context
      const asset = await db
        .select()
        .from(contentAssets)
        .where(eq(contentAssets.id, draftData.assetId))
        .limit(1);

      if (!asset || asset.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Asset not found",
        });
      }

      const { getBrandById } = await import("../db");
      const brand = await getBrandById(draftData.brandId);

      if (!brand) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brand not found",
        });
      }

      // Generate new content based on feedback
      const newContent = await generateContentForPlatform(
        asset[0],
        brand,
        draftData.platform as any,
        "professional",
        input.feedback
      );

      // Update draft with new content
      await db
        .update(drafts)
        .set({
          content: newContent,
          updatedAt: new Date(),
        })
        .where(eq(drafts.id, input.draftId));

      return { success: true, content: newContent };
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
  platform: "instagram" | "linkedin" | "facebook" | "x" | "website",
  tone: string,
  feedback?: string
) {
  const metadata = asset.extractedMetadata || {};

  // Build property description from metadata
  const propertyDescription = buildPropertyDescription(metadata);

  // Create platform-specific prompt
  let prompt = getPlatformPrompt(platform, propertyDescription, tone);
  
  // If feedback provided, add it to the prompt for rewriting
  if (feedback) {
    prompt += `\n\nUser feedback for improvement: ${feedback}\n\nPlease rewrite the content incorporating this feedback.`;
  }

  // Call Claude via LLM helper
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a real estate marketing expert for the brand "${brand.name}". Use the following brand voice guidelines to generate content:\n\nBrand Voice: ${brand.voiceBibleContent || "Professional and engaging real estate marketing content."}

Brand Description: ${brand.description || "A real estate brand."}

Create content that reflects this brand's voice and values.`,
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

  return content;
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
  switch (platform) {
    case "instagram":
      return `Write a ${tone} Instagram caption for this property: ${propertyDescription}

Requirements:
- Maximum 2,200 characters
- Include 3-5 relevant hashtags
- Use emojis appropriately
- Focus on visual appeal and lifestyle
- Include call-to-action

Provide ONLY the caption text, nothing else.`;

    case "linkedin":
      return `Write a ${tone} LinkedIn post for this property: ${propertyDescription}

Requirements:
- Professional tone
- Maximum 1,300 characters
- Highlight investment potential or market insights
- Include relevant industry hashtags
- Professional call-to-action

Provide ONLY the post text, nothing else.`;

    case "facebook":
      return `Write a ${tone} Facebook post for this property: ${propertyDescription}

Requirements:
- Conversational and engaging tone
- Maximum 2,000 characters
- Include key property features
- Add relevant hashtags
- Include link or contact information

Provide ONLY the post text, nothing else.`;

    case "x":
      return `Write a ${tone} X/Twitter post for this property: ${propertyDescription}

Requirements:
- Maximum 280 characters (X/Twitter limit)
- Concise and impactful
- Include 1-2 relevant hashtags
- Use engaging language
- Include link or call-to-action if space allows

Provide ONLY the post text, nothing else.`;

    case "website":
      return `Write a ${tone} SEO-optimized property description for this property: ${propertyDescription}

Requirements:
- SEO-optimized description
- 150-300 words
- Highlight unique features
- Professional and informative
- Include call-to-action

Provide ONLY the description text, nothing else.`;

    default:
      return `Write a ${tone} post for this property: ${propertyDescription}`;
  }
}
