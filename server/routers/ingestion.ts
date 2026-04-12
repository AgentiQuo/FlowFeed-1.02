import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb, getBrandAssets, getAssetById } from "../db";
import { contentAssets, InsertContentAsset } from "../../drizzle/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { uploadAsset } from "../storage";
import { invokeLLM } from "../_core/llm";

export const ingestionRouter = router({
  listAssets: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      return await getBrandAssets(input.brandId);
    }),

  getAsset: protectedProcedure
    .input(z.object({ assetId: z.string() }))
    .query(async ({ input }) => {
      return await getAssetById(input.assetId);
    }),

  uploadImage: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        categoryId: z.string(),
        fileName: z.string(),
        fileBase64: z.string(),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Decode base64 string to Buffer
        const fileBuffer = Buffer.from(input.fileBase64, "base64");

        // Upload to S3
        const { url: s3Url, key: s3Key } = await uploadAsset(
          input.brandId,
          input.categoryId,
          "images",
          input.fileName,
          fileBuffer,
          input.mimeType
        );

        // Create asset record with pending status for vision analysis
        const assetId = nanoid();
        const newAsset: InsertContentAsset = {
          id: assetId,
          brandId: input.brandId,
          categoryId: input.categoryId,
          fileName: input.fileName,
          s3Key,
          s3Url,
          mimeType: input.mimeType,
          fileSize: fileBuffer.length,
          status: "processing", // Start as processing for vision analysis
        };

        await db.insert(contentAssets).values(newAsset);

        // Trigger Gemini vision analysis in background
        analyzeImageInBackground(assetId, s3Url).catch((error) => {
          console.error(`Failed to analyze image ${assetId}:`, error);
        });

        return newAsset;
      } catch (error) {
        console.error("Failed to upload asset:", error);
        throw error;
      }
    }),

  createAssetFromUrl: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        categoryId: z.string(),
        url: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const assetId = nanoid();
      const newAsset: InsertContentAsset = {
        id: assetId,
        brandId: input.brandId,
        categoryId: input.categoryId,
        fileName: `url-asset-${Date.now()}`,
        s3Key: `${input.brandId}/${input.categoryId}/urls/${assetId}`,
        s3Url: input.url,
        mimeType: "application/json",
        status: "pending",
        extractedMetadata: {
          sourceUrl: input.url,
          extractedAt: new Date().toISOString(),
        },
      };

      await db.insert(contentAssets).values(newAsset);
      return newAsset;
    }),

  updateAssetMetadata: protectedProcedure
    .input(
      z.object({
        assetId: z.string(),
        extractedMetadata: z.record(z.string(), z.any()).optional(),
        status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, any> = {};
      if (input.extractedMetadata) updateData.extractedMetadata = input.extractedMetadata;
      if (input.status) updateData.status = input.status;

      await db.update(contentAssets).set(updateData).where(eq(contentAssets.id, input.assetId));
      return await getAssetById(input.assetId);
    }),

  deleteAsset: protectedProcedure
    .input(z.object({ assetId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(contentAssets).where(eq(contentAssets.id, input.assetId));
      return { success: true };
    }),

  // Analyze property image with Gemini vision
  analyzePropertyImage: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        assetId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `You are a real estate property analysis expert. Analyze the provided property image and extract detailed information about the property. Focus on visual elements like: bedrooms, bathrooms, architectural style, condition, amenities, outdoor features, and overall property characteristics. Return a JSON object with the extracted information.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Please analyze this property image and extract all relevant details. Return a JSON object with keys like: bedrooms, bathrooms, squareFeet, propertyType, architecturalStyle, condition, roofType, exteriorMaterial, hasGarage, hasPool, hasPatioOrDeck, lotSize, yearBuilt, and any other notable features.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: input.imageUrl,
                    detail: "high",
                  },
                },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "property_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  bedrooms: { type: ["number", "null"], description: "Number of bedrooms" },
                  bathrooms: { type: ["number", "null"], description: "Number of bathrooms" },
                  squareFeet: { type: ["number", "null"], description: "Square footage of the property" },
                  propertyType: { type: ["string", "null"], description: "Type of property (house, condo, apartment, etc.)" },
                  architecturalStyle: { type: ["string", "null"], description: "Architectural style (modern, colonial, ranch, etc.)" },
                  condition: { type: ["string", "null"], description: "Overall condition (excellent, good, fair, needs work)" },
                  roofType: { type: ["string", "null"], description: "Type of roof" },
                  exteriorMaterial: { type: ["string", "null"], description: "Exterior material (brick, siding, stone, etc.)" },
                  hasGarage: { type: ["boolean", "null"], description: "Whether property has a garage" },
                  hasPool: { type: ["boolean", "null"], description: "Whether property has a pool" },
                  hasPatioOrDeck: { type: ["boolean", "null"], description: "Whether property has patio or deck" },
                  lotSize: { type: ["string", "null"], description: "Lot size" },
                  yearBuilt: { type: ["number", "null"], description: "Year the property was built" },
                  notableFeatures: { type: ["array", "null"], items: { type: "string" }, description: "List of notable features" },
                  confidence: { type: "string", description: "Confidence level of analysis (high, medium, low)" },
                },
                required: ["confidence"],
              },
            },
          },
        });

        // Parse the response
        const content = response.choices[0]?.message.content;
        if (typeof content !== "string") {
          throw new Error("Invalid response format from Gemini");
        }

        const metadata = JSON.parse(content);

        // Update asset metadata if assetId provided
        if (input.assetId) {
          const db = await getDb();
          if (db) {
            await db
              .update(contentAssets)
              .set({
                extractedMetadata: metadata,
                status: "completed",
              })
              .where(eq(contentAssets.id, input.assetId));
          }
        }

        return {
          success: true,
          metadata,
        };
      } catch (error) {
        console.error("Failed to analyze property image:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        } as const;
      }
    }),

  // URL scraping for real estate listings (text-first extraction)
  scrapeListingMetadata: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const response = await fetch(input.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      } as RequestInit);

        if (!response.ok) {
          throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }

        const html = await response.text() as string;

        // Extract common real estate listing metadata
        const metadata = extractListingMetadata(html);

        return {
          success: true,
          metadata,
          url: input.url,
        };
      } catch (error) {
        console.error("Failed to scrape listing metadata:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        } as const;
      }
    }),
});

/**
 * Analyze image in background using Gemini vision
 */
async function analyzeImageInBackground(assetId: string, s3Url: string) {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: `You are a real estate property analysis expert. Analyze the provided property image and extract detailed information about the property. Focus on visual elements like: bedrooms, bathrooms, architectural style, condition, amenities, outdoor features, and overall property characteristics.`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Please analyze this property image and extract all relevant details. Return a JSON object with keys like: bedrooms, bathrooms, squareFeet, propertyType, architecturalStyle, condition, roofType, exteriorMaterial, hasGarage, hasPool, hasPatioOrDeck, lotSize, yearBuilt, and any other notable features.",
            },
            {
              type: "image_url",
              image_url: {
                url: s3Url,
                detail: "high",
              },
            },
          ],
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "property_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              bedrooms: { type: ["number", "null"], description: "Number of bedrooms" },
              bathrooms: { type: ["number", "null"], description: "Number of bathrooms" },
              squareFeet: { type: ["number", "null"], description: "Square footage of the property" },
              propertyType: { type: ["string", "null"], description: "Type of property (house, condo, apartment, etc.)" },
              architecturalStyle: { type: ["string", "null"], description: "Architectural style (modern, colonial, ranch, etc.)" },
              condition: { type: ["string", "null"], description: "Overall condition (excellent, good, fair, needs work)" },
              roofType: { type: ["string", "null"], description: "Type of roof" },
              exteriorMaterial: { type: ["string", "null"], description: "Exterior material (brick, siding, stone, etc.)" },
              hasGarage: { type: ["boolean", "null"], description: "Whether property has a garage" },
              hasPool: { type: ["boolean", "null"], description: "Whether property has a pool" },
              hasPatioOrDeck: { type: ["boolean", "null"], description: "Whether property has patio or deck" },
              lotSize: { type: ["string", "null"], description: "Lot size" },
              yearBuilt: { type: ["number", "null"], description: "Year the property was built" },
              notableFeatures: { type: ["array", "null"], items: { type: "string" }, description: "List of notable features" },
              confidence: { type: "string", description: "Confidence level of analysis (high, medium, low)" },
            },
            required: ["confidence"],
          },
        },
      },
    });

    // Parse the response
    const content = response.choices[0]?.message.content;
    if (typeof content !== "string") {
      throw new Error("Invalid response format from Gemini");
    }

    const metadata = JSON.parse(content);

    // Update asset with metadata
    const db = await getDb();
    if (db) {
      await db
        .update(contentAssets)
        .set({
          extractedMetadata: metadata,
          status: "completed",
        })
        .where(eq(contentAssets.id, assetId));
    }
  } catch (error) {
    console.error(`Failed to analyze image ${assetId}:`, error);
    // Update status to failed
    const db = await getDb();
    if (db) {
      await db
        .update(contentAssets)
        .set({ status: "failed" })
        .where(eq(contentAssets.id, assetId));
    }
  }
}

/**
 * Extract real estate listing metadata from HTML
 * Focuses on text-first extraction to minimize heavy vision processing
 */
function extractListingMetadata(html: string): Record<string, any> {
  const metadata: Record<string, any> = {};

  // Extract title/property name
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) metadata.title = titleMatch[1].trim();

  // Extract meta description
  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (descMatch) metadata.description = descMatch[1];

  // Extract price (common patterns)
  const pricePatterns = [
    /\$[\d,]+(?:\.\d{2})?/,
    /price[:\s]+\$?([\d,]+(?:\.\d{2})?)/i,
    /asking[:\s]+\$?([\d,]+(?:\.\d{2})?)/i,
  ];
  for (const pattern of pricePatterns) {
    const match = html.match(pattern);
    if (match) {
      metadata.price = match[0];
      break;
    }
  }

  // Extract location/address (common patterns)
  const addressPatterns = [
    /address[:\s]+([^<\n]+)/i,
    /location[:\s]+([^<\n]+)/i,
  ];
  for (const pattern of addressPatterns) {
    const match = html.match(pattern);
    if (match) {
      metadata.address = match[1].trim();
      break;
    }
  }

  // Extract bedrooms/bathrooms
  const bedroomMatch = html.match(/(\d+)\s*(?:bed|br|bedroom)/i);
  if (bedroomMatch) metadata.bedrooms = bedroomMatch[1];

  const bathroomMatch = html.match(/(\d+)\s*(?:bath|ba|bathroom)/i);
  if (bathroomMatch) metadata.bathrooms = bathroomMatch[1];

  // Extract square footage
  const sqftMatch = html.match(/(\d+(?:,\d{3})*)\s*(?:sq\.?ft|sqft|square feet)/i);
  if (sqftMatch) metadata.squareFeet = sqftMatch[1];

  // Extract property type
  const typePatterns = [
    /property\s+type[:\s]+([^<\n]+)/i,
    /type[:\s]+(house|apartment|condo|townhouse|villa|estate)/i,
  ];
  for (const pattern of typePatterns) {
    const match = html.match(pattern);
    if (match) {
      metadata.propertyType = match[1].trim();
      break;
    }
  }

  return metadata;
}
