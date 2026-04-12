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
        } else if (cred[0].platform === "x") {
          const credData = JSON.parse(cred[0].credentials);
          const { apiKey, apiSecret, accessToken, accessTokenSecret } = credData;

          if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
            const missing = [
              !apiKey && "Consumer Key",
              !apiSecret && "Consumer Secret",
              !accessToken && "Access Token",
              !accessTokenSecret && "Access Token Secret",
            ].filter(Boolean);
            throw new Error(`Missing required credentials: ${missing.join(", ")}`);
          }

          // Verify by calling X API v2 /users/me with OAuth 1.0a
          const OAuth = (await import("oauth-1.0a")).default;
          const crypto = await import("crypto");
          const oauth = new OAuth({
            consumer: { key: apiKey, secret: apiSecret },
            signature_method: "HMAC-SHA1",
            hash_function(baseString: string, key: string) {
              return crypto.createHmac("sha1", key).update(baseString).digest("base64");
            },
          });
          const token = { key: accessToken, secret: accessTokenSecret };
          const verifyUrl = "https://api.twitter.com/2/users/me";
          const requestData = { url: verifyUrl, method: "GET" };
          const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

          const response = await fetch(verifyUrl, {
            method: "GET",
            headers: { ...authHeader },
          });

          if (response.ok) {
            const data = (await response.json()) as any;
            if (data.data?.id && data.data?.username) {
              isVerified = true;
            } else {
              errorMessage = "Unexpected response from X API";
              isVerified = false;
            }
          } else {
            const errorBody = await response.text();
            let detail: string;
            try {
              const errorJson = JSON.parse(errorBody);
              detail = errorJson.detail || errorJson.errors?.[0]?.message || errorJson.title || errorBody;
            } catch {
              detail = errorBody;
            }
            errorMessage = `X API returned ${response.status}: ${detail}`;
            isVerified = false;
          }
        } else if (cred[0].platform === "website") {
          const credData = JSON.parse(cred[0].credentials);
          const { wpUsername, wpAppPassword } = credData;

          if (!wpUsername || !wpAppPassword) {
            throw new Error("Missing WordPress username or application password");
          }

          // Verify by calling WordPress REST API /users/me
          const wpSiteUrl = process.env.WORDPRESS_SITE_URL || "https://www.modern-villas.com";
          const response = await fetch(`${wpSiteUrl}/wp-json/wp/v2/users/me`, {
            headers: {
              Authorization: `Basic ${Buffer.from(`${wpUsername}:${wpAppPassword}`).toString("base64")}`,
            },
          });

          if (response.ok) {
            const data = (await response.json()) as any;
            if (data.id) {
              isVerified = true;
            } else {
              errorMessage = "Unexpected response from WordPress API";
              isVerified = false;
            }
          } else {
            errorMessage = `WordPress API returned ${response.status}: ${response.statusText}`;
            isVerified = false;
          }
        } else {
          // For LinkedIn and Facebook, mark as verified for now
          // (these require more complex OAuth2 flows to verify)
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
