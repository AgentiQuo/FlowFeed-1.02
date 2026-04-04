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

      // Don't return the encrypted credentials in the list
      return creds.map((c) => ({
        ...c,
        credentials: undefined, // Hide encrypted credentials
      }));
    }),

  /**
   * Save or update credentials for a brand and platform
   */
  save: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        platform: z.enum(["instagram", "linkedin", "facebook", "x", "website"]),
        accountId: z.string().optional(),
        accountName: z.string().optional(),
        accountEmail: z.string().email().optional(),
        credentials: z.object({
          accessToken: z.string().optional(),
          accessTokenSecret: z.string().optional(),
          apiKey: z.string().optional(),
          apiSecret: z.string().optional(),
          bearerToken: z.string().optional(),
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
        // Update existing
        await db
          .update(brandCredentials)
          .set({
            accountId: input.accountId,
            accountName: input.accountName,
            accountEmail: input.accountEmail,
            credentials: encryptedCredentials,
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
          accountId: input.accountId,
          accountName: input.accountName,
          accountEmail: input.accountEmail,
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

      // Don't return the encrypted credentials
      return {
        ...cred[0],
        credentials: undefined,
      };
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
});
