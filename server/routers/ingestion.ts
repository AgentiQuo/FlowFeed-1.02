import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb, getBrandAssets, getAssetById } from "../db";
import { contentAssets, InsertContentAsset } from "../../drizzle/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { uploadAsset } from "../storage";

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
        fileBuffer: z.instanceof(Buffer),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      try {
        // Upload to S3
        const { url: s3Url, key: s3Key } = await uploadAsset(
          input.brandId,
          input.categoryId,
          "images",
          input.fileName,
          input.fileBuffer,
          input.mimeType
        );

        // Create asset record
        const assetId = nanoid();
        const newAsset: InsertContentAsset = {
          id: assetId,
          brandId: input.brandId,
          categoryId: input.categoryId,
          fileName: input.fileName,
          s3Key,
          s3Url,
          mimeType: input.mimeType,
          fileSize: input.fileBuffer.length,
          status: "completed",
        };

        await db.insert(contentAssets).values(newAsset);
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
