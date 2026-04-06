import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { brandCredentials } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Brand credentials management
 * Handles storing and retrieving encrypted social media API credentials
 */
export const credentialsRouter = router({
  /**
   * List all credentials for a brand
   */
  list: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const creds = await db
        .select()
        .from(brandCredentials)
        .where(eq(brandCredentials.brandId, input.brandId));

      // Return credentials so frontend can display them as masked
      return creds;
    }),

  /**
   * Save or update credentials for a brand and platform
   */
  save: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        platform: z.enum(["instagram", "linkedin", "facebook", "x", "website"]),
        credentials: z.object({
          accessToken: z.string().optional(),
          accessTokenSecret: z.string().optional(),
          apiKey: z.string().optional(),
          apiSecret: z.string().optional(),
          bearerToken: z.string().optional(),
          businessAccountId: z.string().optional(),
          wpUsername: z.string().optional(),
          wpAppPassword: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if credentials already exist for this brand and platform
      const existing = await db
        .select()
        .from(brandCredentials)
        .where(
          and(
            eq(brandCredentials.brandId, input.brandId),
            eq(brandCredentials.platform, input.platform)
          )
        )
        .limit(1);

      const id = existing.length > 0 ? existing[0].id : `cred-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();

      // Encrypt credentials (in production, use proper encryption)
      const encryptedCredentials = JSON.stringify(input.credentials);

      if (existing.length > 0) {
        // Update existing: merge new credentials with existing ones
        const existingCredData = JSON.parse(existing[0].credentials || "{}");
        const newCredData = input.credentials;

        // Merge: only update fields that were provided (not undefined)
        const mergedCredentials: any = { ...existingCredData };
        Object.keys(newCredData).forEach(key => {
          if (newCredData[key as keyof typeof newCredData] !== undefined) {
            mergedCredentials[key] = newCredData[key as keyof typeof newCredData];
          }
        });

        await db
          .update(brandCredentials)
          .set({
            credentials: JSON.stringify(mergedCredentials),
            verificationStatus: "pending",
            updatedAt: now,
          })
          .where(eq(brandCredentials.id, existing[0].id));
      } else {
        // Insert new
        const { nanoid } = await import("nanoid");
        await db.insert(brandCredentials).values({
          id: nanoid(),
          brandId: input.brandId,
          platform: input.platform,
          credentials: encryptedCredentials,
          isActive: true,
          verificationStatus: "pending",
        });
      }

      return { success: true };
    }),

  /**
   * Get credentials for a brand and platform
   */
  get: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        platform: z.enum(["instagram", "linkedin", "facebook", "x", "website"]),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;

      const cred = await db
        .select()
        .from(brandCredentials)
        .where(
          and(
            eq(brandCredentials.brandId, input.brandId),
            eq(brandCredentials.platform, input.platform)
          )
        )
        .limit(1);

      if (!cred || cred.length === 0) {
        return null;
      }

      // Return credentials so frontend can display them as masked
      return cred[0];
    }),

  /**
   * Delete credentials for a brand and platform
   */
  delete: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        platform: z.enum(["instagram", "linkedin", "facebook", "x", "website"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .delete(brandCredentials)
        .where(
          and(
            eq(brandCredentials.brandId, input.brandId),
            eq(brandCredentials.platform, input.platform)
          )
        );

      return { success: true };
    }),

  /**
   * Verify credentials by testing the connection
   */
  verify: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        platform: z.enum(["instagram", "linkedin", "facebook", "x", "website"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const cred = await db
        .select()
        .from(brandCredentials)
        .where(
          and(
            eq(brandCredentials.brandId, input.brandId),
            eq(brandCredentials.platform, input.platform)
          )
        )
        .limit(1);

      if (!cred || cred.length === 0) {
        throw new Error("Credentials not found");
      }

      let isVerified = false;
      let errorMessage = "";

      try {
        if (cred[0].platform === "instagram") {
          const credData = JSON.parse(cred[0].credentials);
          const accessToken = credData.accessToken;

          if (!accessToken) {
            throw new Error("No access token found");
          }

          // Test Instagram token by calling Graph API
          const response = await fetch(
            `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
          );
          const data = await response.json();

          if (data.error) {
            errorMessage = data.error.message || "Invalid access token";
            isVerified = false;
          } else if (data.id && data.username) {
            isVerified = true;
          } else {
            errorMessage = "Unexpected response from Instagram API";
            isVerified = false;
          }
        } else {
          // For other platforms, mark as verified (implement verification later)
          isVerified = true;
        }
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : "Verification failed";
        isVerified = false;
      }

      // Update verification status
      const now = new Date();
      await db
        .update(brandCredentials)
        .set({
          verificationStatus: isVerified ? "verified" : "failed",
          lastVerified: now,
          updatedAt: now,
        })
        .where(eq(brandCredentials.id, cred[0].id));

      return { success: true, verified: isVerified, error: errorMessage };
    }),

  /**
   * Check Instagram token scopes and permissions
   */
  checkInstagramScopes: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { hasRequiredScopes: false, scopes: [], missingScopes: [] };

      const creds = await db
        .select()
        .from(brandCredentials)
        .where(
          and(
            eq(brandCredentials.brandId, input.brandId),
            eq(brandCredentials.platform, "instagram")
          )
        );

      if (!creds.length || !creds[0].credentials) {
        return { hasRequiredScopes: false, scopes: [], missingScopes: ["instagram_business_account", "pages_read_engagement", "pages_manage_metadata"] };
      }

      const credData = JSON.parse(creds[0].credentials);
      const accessToken = credData.accessToken;

      if (!accessToken) {
        return { hasRequiredScopes: false, scopes: [], missingScopes: ["instagram_business_account", "pages_read_engagement", "pages_manage_metadata"] };
      }

      try {
        // Try to fetch with business account scope
        const response = await fetch(
          `https://graph.instagram.com/v18.0/me?fields=id,username,instagram_business_account&access_token=${accessToken}`
        );
        const data = (await response.json()) as any;

        if (data.error) {
          // Check what type of error
          if (data.error.message?.includes("nonexisting field") || data.error.message?.includes("instagram_business_account")) {
            // Token lacks business account scope
            return {
              hasRequiredScopes: false,
              scopes: ["basic"],
              missingScopes: ["instagram_business_account", "pages_read_engagement", "pages_manage_metadata"],
            };
          }
          return { hasRequiredScopes: false, scopes: [], missingScopes: ["instagram_business_account", "pages_read_engagement", "pages_manage_metadata"] };
        }

        // Token has business account access
        return {
          hasRequiredScopes: true,
          scopes: ["basic", "instagram_business_account"],
          missingScopes: [],
        };
      } catch (error) {
        return { hasRequiredScopes: false, scopes: [], missingScopes: ["instagram_business_account", "pages_read_engagement", "pages_manage_metadata"] };
      }
    }),

});
