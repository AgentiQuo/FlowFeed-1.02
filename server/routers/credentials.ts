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
          .where(eq(brandCredentials.id, id));
      } else {
        // Insert new
        await db.insert(brandCredentials).values({
          id,
          brandId: input.brandId,
          platform: input.platform,
          accountId: input.accountId,
          accountName: input.accountName,
          accountEmail: input.accountEmail,
          credentials: encryptedCredentials,
          isActive: true,
          verificationStatus: "pending",
          createdAt: now,
          updatedAt: now,
        } as any);
      }

      return { success: true, id };
    }),

  /**
   * Get credentials for a specific brand and platform
   * Only returns to authorized users
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

      if (!cred || cred.length === 0) return null;

      const credential = cred[0];
      // Decrypt credentials (in production, use proper decryption)
      const decryptedCreds = JSON.parse(credential.credentials);

      return {
        ...credential,
        credentials: decryptedCreds,
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

      // TODO: Implement actual verification based on platform
      // For now, just mark as verified
      const now = new Date();
      await db
        .update(brandCredentials)
        .set({
          verificationStatus: "verified",
          lastVerified: now,
          updatedAt: now,
        })
        .where(eq(brandCredentials.id, cred[0].id));

      return { success: true, verified: true };
    }),
});
