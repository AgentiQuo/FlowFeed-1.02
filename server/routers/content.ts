import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { drafts, contentAssets, feedbackLogs, posts, brands } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
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

          // Generate AI title for website (MV Post) drafts at creation time
          let draftTitle: string | null = null;
          if (draft.platform === "website") {
            try {
              const titleResponse = await invokeLLM({
                messages: [
                  {
                    role: "system",
                    content: "You are a copywriter. Generate a short, compelling blog post title (max 8 words, no quotes). Return ONLY the title text, nothing else.",
                  },
                  {
                    role: "user",
                    content: `Generate a blog post title for this content:\n\n${draft.content.substring(0, 500)}`,
                  },
                ],
              });
              const rawContent = titleResponse?.choices?.[0]?.message?.content;
              const aiTitle = typeof rawContent === "string" ? rawContent.trim() : undefined;
              if (aiTitle && aiTitle.length > 0 && aiTitle.length < 120) {
                draftTitle = aiTitle.replace(/^["']|["']$/g, "");
              }
            } catch (e) {
              console.warn("[Content] AI title generation failed, using fallback:", e);
              draftTitle = draft.content.split("\n")[0].substring(0, 80) || "New Post";
            }
          }

          await db.insert(drafts).values({
            id: draftId,
            brandId: input.brandId,
            assetId: input.assetId,
            categoryId: assetData.categoryId,
            platform: draft.platform,
            content: draft.content,
            title: draftTitle,
            status: "draft",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          return {
            id: draftId,
            title: draftTitle,
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

      // Get draft details
      const draft = await db.select().from(drafts).where(eq(drafts.id, input.draftId)).limit(1).then(rows => rows[0]);

      if (!draft) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Draft not found",
        });
      }

      // Update draft status to reviewed
      await db
        .update(drafts)
        .set({
          status: "reviewed",
          updatedAt: new Date(),
        })
        .where(eq(drafts.id, input.draftId));

      // Auto-schedule to next available slot for this platform
      try {
        // Get the last scheduled post for this platform
        const lastPost = await db.select().from(posts).where(and(
          eq(posts.platform, draft.platform),
          eq(posts.status, "scheduled")
        )).orderBy(desc(posts.scheduledFor)).limit(1).then(rows => rows[0]);

        // Calculate next available time (2-3 hours after last post)
        let nextScheduledTime = new Date();
        if (lastPost && lastPost.scheduledFor) {
          const lastTime = new Date(lastPost.scheduledFor);
          const delayHours = 2 + Math.random(); // 2-3 hours
          nextScheduledTime = new Date(lastTime.getTime() + delayHours * 60 * 60 * 1000);
        } else {
          // If no posts scheduled yet, schedule 30 minutes from now
          nextScheduledTime = new Date();
          nextScheduledTime.setMinutes(nextScheduledTime.getMinutes() + 30);
        }
        
        // Ensure we don't schedule after 8 PM
        if (nextScheduledTime.getHours() >= 20) {
          nextScheduledTime.setDate(nextScheduledTime.getDate() + 1);
          nextScheduledTime.setHours(9, 0, 0, 0);
        }

        // Get asset thumbnail URL if assetId exists
        let thumbnailUrl: string | null = null;
        if (draft.assetId) {
          try {
            const assetResult = await db
              .select()
              .from(contentAssets)
              .where(eq(contentAssets.id, draft.assetId))
              .limit(1);
            
            if (assetResult && assetResult.length > 0) {
              const asset = assetResult[0];
              thumbnailUrl = asset.s3Url || null;
            }
          } catch (error) {
            console.warn(`Failed to fetch asset thumbnail for ${draft.assetId}:`, error);
          }
        }

        // Add to queue
        await db.insert(posts).values({
          id: `post-${nanoid()}`,
          draftId: draft.id,
          platform: draft.platform,
          brandId: draft.brandId,
          content: draft.content,
          title: draft.title ?? null,
          thumbnailUrl: thumbnailUrl,
          scheduledFor: nextScheduledTime,
          status: "scheduled",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (error) {
        // Log error but don't fail the approval
        console.error("Failed to auto-schedule post:", error);
      }

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

      // Store feedback as a brand learning for future reference
      try {
        const { appendBrandLearning } = await import("../_core/brandLearnings");
        await appendBrandLearning(draftData.brandId, `User feedback: ${input.feedback}`);
      } catch (err) {
        console.warn("Failed to store brand learning:", err);
      }

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

  createFromArchivedPost: protectedProcedure
    .input(z.object({ postId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const publishedPost = await db
        .select()
        .from(posts)
        .where(eq(posts.id, input.postId))
        .limit(1);

      if (!publishedPost || publishedPost.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Published post not found",
        });
      }

      const post = publishedPost[0];
      
      // Fetch original draft to get assetId and categoryId
      const originalDraft = await db
        .select()
        .from(drafts)
        .where(eq(drafts.id, post.draftId))
        .limit(1)
        .then(rows => rows[0]);

      const newDraftId = nanoid();

      await db.insert(drafts).values({
        id: newDraftId,
        brandId: post.brandId,
        assetId: originalDraft?.assetId || "",
        categoryId: originalDraft?.categoryId || "",
        platform: post.platform,
        content: post.content,
        title: post.title || "Reused Post",
        status: "draft",
        variations: null,
        sourceReference: {
          originalPostId: post.id,
          originalPublishedAt: post.publishedAt,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { id: newDraftId };
    }),

  generateFromPrompt: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        prompt: z.string().min(1),
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

      const { generateImage } = await import("../_core/imageGeneration");
      const { url: imageUrl } = await generateImage({ prompt: input.prompt });

      if (!imageUrl) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate image",
        });
      }

      const assetId = nanoid();
      await db.insert(contentAssets).values({
        id: assetId,
        brandId: input.brandId,
        categoryId: nanoid(),
        fileName: `generated-${Date.now()}.png`,
        s3Key: `generated/${Date.now()}.png`,
        s3Url: imageUrl,
        mimeType: "image/png",
        fileSize: 0,
        status: "completed",
      });

      const { getBrandById } = await import("../db");
      const brand = await getBrandById(input.brandId);

      if (!brand) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brand not found",
        });
      }

      const assetResult = await db
        .select()
        .from(contentAssets)
        .where(eq(contentAssets.id, assetId))
        .limit(1);

      if (!assetResult || assetResult.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Asset not found",
        });
      }

      const assetData = assetResult[0];

      // generateContentForPlatform is defined in this file
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

      const savedDrafts = await Promise.all(
        generatedDrafts.map(async (draft) => {
          const draftId = nanoid();

          let draftTitle: string | null = null;
          if (draft.platform === "website") {
            const titleResponse = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: "Generate a concise, engaging title for a website post based on the content. Return only the title, no quotes.",
                },
                {
                  role: "user",
                  content: draft.content,
                },
              ],
            });
            const titleContent = titleResponse.choices[0]?.message.content;
            draftTitle = typeof titleContent === "string" ? titleContent.trim() : null;
          }

          await db.insert(drafts).values({
            id: draftId,
            brandId: input.brandId,
            assetId: assetId,
            categoryId: nanoid(),
            platform: draft.platform,
            content: draft.content,
            title: draftTitle,
            status: "draft",
            variations: null,
            sourceReference: null,
          });

          return { id: draftId, platform: draft.platform };
        })
      );

      return { assetId, drafts: savedDrafts };
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
  console.log("[generateContentForPlatform] Starting for platform:", platform, "imageUrl:", asset.imageUrl ? "present" : "MISSING");
  const metadata = asset.extractedMetadata || {};

  // Build property description from metadata
  const propertyDescription = buildPropertyDescription(metadata);

  // Analyze image for visual context
  let visionAnalysis = "";
  const imageUrl = asset.s3Url || asset.imageUrl;
  if (imageUrl) {
    try {
      visionAnalysis = await analyzeImageForCopywriting(imageUrl);
    } catch (error) {
      console.warn("[Vision Analysis] Failed to analyze image:", error);
      // Continue without vision analysis if it fails
    }
  }

  // Create platform-specific prompt with vision context
  let prompt = getPlatformPrompt(platform, propertyDescription, tone, visionAnalysis);
  
  // If feedback provided, add it to the prompt for rewriting
  if (feedback) {
    prompt += `\n\nUser feedback for improvement: ${feedback}\n\nPlease rewrite the content incorporating this feedback.`;
  }

  // Load brand learnings from file
  const { getFormattedLearnings } = await import("../_core/brandLearnings");
  const learnings = await getFormattedLearnings(brand.id);

  // Call Claude via LLM helper
  const response = await invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are a marketing expert for the brand "${brand.name}". Use the following brand voice guidelines to generate content:\n\nBrand Voice: ${brand.voiceBibleContent || "Professional and engaging marketing content."}

Brand Description: ${brand.description || "A professional brand."}

Copywriting Guide:\n${brand.copywritingGuide || "Generate professional, engaging content that resonates with the target audience."}

Brand Learnings (feedback from previous content):\n${learnings}

Create content that reflects this brand's voice, values, and industry. Follow the copywriting guide closely to ensure consistency with the brand's established tone, language style, and messaging focus. Incorporate the brand learnings to improve content quality based on past feedback. Do NOT assume real estate - adapt your tone and messaging to match the brand's actual business.`,
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

  // Build generic description from available metadata (not real estate specific)
  // Use generic metadata fields that work for any industry
  if (metadata.title) parts.push(metadata.title);
  if (metadata.description) parts.push(metadata.description);
  if (metadata.category) parts.push(`Category: ${metadata.category}`);
  if (metadata.features && Array.isArray(metadata.features)) {
    parts.push(`Features: ${metadata.features.join(", ")}`);
  }
  if (metadata.bedrooms) parts.push(`${metadata.bedrooms} bedrooms`);
  if (metadata.bathrooms) parts.push(`${metadata.bathrooms} bathrooms`);
  if (metadata.squareFeet)
    parts.push(`${metadata.squareFeet.toLocaleString()} sq ft`);
  if (metadata.propertyType) parts.push(`${metadata.propertyType}`);
  if (metadata.architecturalStyle)
    parts.push(`${metadata.architecturalStyle} style`);
  if (metadata.condition) parts.push(`${metadata.condition} condition`);

  return parts.join(", ") || "Great content";
}

/**
 * Get platform-specific prompt template
 */
function getPlatformPrompt(
  platform: string,
  contentDescription: string,
  tone: string,
  visionAnalysis: string = ""
): string {
  switch (platform) {
    case "instagram":
      return `Write a ${tone} Instagram caption for this content: ${contentDescription}

${visionAnalysis ? `Visual Analysis of the Image:\n${visionAnalysis}\n` : ""}
Requirements:
- Maximum 2,200 characters
- Include 3-5 relevant hashtags
- Use emojis appropriately
- Focus on visual appeal and lifestyle
- Reference specific visual elements from the image
- Include call-to-action

Provide ONLY the caption text, nothing else.`;

    case "linkedin":
      return `Write a ${tone} LinkedIn post for this content: ${contentDescription}

${visionAnalysis ? `Visual Analysis of the Image:\n${visionAnalysis}\n` : ""}
Requirements:
- Professional tone
- Maximum 1,300 characters
- Highlight investment potential or market insights
- Reference visual elements that support your message
- Include relevant industry hashtags
- Professional call-to-action

Provide ONLY the post text, nothing else.`;

    case "facebook":
      return `Write a ${tone} Facebook post for this content: ${contentDescription}

${visionAnalysis ? `Visual Analysis of the Image:\n${visionAnalysis}\n` : ""}
Requirements:
- Conversational and engaging tone
- Maximum 2,000 characters
- Include key property features
- Reference visual elements from the image
- Add relevant hashtags
- Include link or contact information

Provide ONLY the post text, nothing else.`;

    case "x":
      return `Write a ${tone} X/Twitter post for this content: ${contentDescription}

${visionAnalysis ? `Visual Analysis of the Image:\n${visionAnalysis}\n` : ""}
Requirements:
- Maximum 280 characters (X/Twitter limit)
- Concise and impactful
- Include 1-2 relevant hashtags
- Use engaging language
- Include link or call-to-action if space allows

Provide ONLY the post text, nothing else.`;

    case "website":
      return `Write a ${tone} SEO-optimized description for this content: ${contentDescription}

${visionAnalysis ? `Visual Analysis of the Image:\n${visionAnalysis}\n` : ""}
Requirements:
- SEO-optimized description
- 150-300 words
- Highlight unique features and visual elements
- Professional and informative
- Include call-to-action

Provide ONLY the description text, nothing else.`;

    default:
      return `Write a ${tone} post for this content: ${contentDescription}`;
  }
}


/**
 * Analyze image for visual context to enhance copywriting
 * Uses vision API to extract visual elements, colors, mood, composition, etc.
 */
async function analyzeImageForCopywriting(imageUrl: string): Promise<string> {
  console.log("[analyzeImageForCopywriting] Starting vision analysis for URL:", imageUrl);
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this image and provide a concise visual description for copywriting purposes. Include:
- Overall mood and atmosphere
- Color palette and lighting
- Composition and focal points
- Key visual elements and textures
- Style (modern, classic, minimalist, luxurious, etc.)
- Any text or signage visible in the image

Keep the analysis to 2-3 sentences, focused on elements that would enhance social media copy.`,
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
                detail: "high",
              },
            },
          ],
        },
      ],
    });

    const messageContent = response.choices[0]?.message?.content;
    console.log("[analyzeImageForCopywriting] Response:", messageContent);
    if (typeof messageContent === "string") {
      return messageContent;
    } else if (Array.isArray(messageContent)) {
      const textBlock = messageContent.find((block: any) => block.type === "text") as any;
      if (textBlock && textBlock.text) {
        return textBlock.text;
      }
    }
    console.log("[analyzeImageForCopywriting] No text found");
    return "";
  } catch (error) {
    console.warn("[analyzeImageForCopywriting] Vision analysis failed:", error);
    return "";
  }
}
