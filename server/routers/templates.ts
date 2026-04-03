import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { protectedProcedure, router } from "../_core/trpc";

// Create a simple templates table schema inline for this router
const templatesTableName = "draftTemplates";

export const templatesRouter = router({
  /**
   * Create a template from successful draft
   */
  createTemplate: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        name: z.string().min(1),
        propertyType: z.string(),
        platform: z.enum(["instagram", "linkedin", "facebook", "x", "website"]),
        contentTemplate: z.string(),
        description: z.string().optional(),
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

      const templateId = nanoid();
      const now = new Date();

      try {
        await db.execute(
          sql`INSERT INTO ${sql.identifier(templatesTableName)} 
            (id, brandId, name, propertyType, platform, contentTemplate, description, createdAt, updatedAt) 
            VALUES (${templateId}, ${input.brandId}, ${input.name}, ${input.propertyType}, ${input.platform}, ${input.contentTemplate}, ${input.description || null}, ${now}, ${now})`
        );

        return {
          id: templateId,
          ...input,
          createdAt: now,
          updatedAt: now,
        };
      } catch (error: any) {
        // If table doesn't exist, create it first
        if (error.message?.includes("no such table")) {
          await createTemplatesTable(db);
          await db.execute(
            sql`INSERT INTO ${sql.identifier(templatesTableName)} 
              (id, brandId, name, propertyType, platform, contentTemplate, description, createdAt, updatedAt) 
              VALUES (${templateId}, ${input.brandId}, ${input.name}, ${input.propertyType}, ${input.platform}, ${input.contentTemplate}, ${input.description || null}, ${now}, ${now})`
          );

          return {
            id: templateId,
            ...input,
            createdAt: now,
            updatedAt: now,
          };
        }
        throw error;
      }
    }),

  /**
   * Get templates for a brand
   */
  getBrandTemplates: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      try {
        const result = await db.execute(
          sql`SELECT * FROM ${sql.identifier(templatesTableName)} WHERE brandId = ${input.brandId} ORDER BY createdAt DESC`
        );

        return (result as any).rows || [];
      } catch (error: any) {
        if (error.message?.includes("no such table")) {
          return [];
        }
        throw error;
      }
    }),

  /**
   * Get templates by property type
   */
  getTemplatesByPropertyType: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        propertyType: z.string(),
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

      try {
        const result = await db.execute(
          sql`SELECT * FROM ${sql.identifier(templatesTableName)} 
            WHERE brandId = ${input.brandId} AND propertyType = ${input.propertyType} 
            ORDER BY createdAt DESC`
        );

        return (result as any).rows || [];
      } catch (error: any) {
        if (error.message?.includes("no such table")) {
          return [];
        }
        throw error;
      }
    }),

  /**
   * Use template to generate draft
   */
  useTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.string(),
        propertyDescription: z.string(),
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

      try {
        const result = await db.execute(
          sql`SELECT * FROM ${sql.identifier(templatesTableName)} WHERE id = ${input.templateId}`
        );

        const template = ((result as any).rows as any[])?.[0];
        if (!template) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found",
          });
        }

        // Simple template variable substitution
        let content = template.contentTemplate;
        content = content.replace(/\{property\}/g, input.propertyDescription);
        content = content.replace(/\{date\}/g, new Date().toLocaleDateString());

        return {
          platform: template.platform,
          content,
          templateUsed: template.name,
        };
      } catch (error: any) {
        if (error.message?.includes("no such table")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found",
          });
        }
        throw error;
      }
    }),

  /**
   * Delete template
   */
  deleteTemplate: protectedProcedure
    .input(z.object({ templateId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      try {
        await db.execute(
          sql`DELETE FROM ${sql.identifier(templatesTableName)} WHERE id = ${input.templateId}`
        );

        return { success: true };
      } catch (error: any) {
        if (error.message?.includes("no such table")) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Template not found",
          });
        }
        throw error;
      }
    }),
});

/**
 * Create templates table if it doesn't exist
 */
async function createTemplatesTable(db: any) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS ${sql.identifier(templatesTableName)} (
      id VARCHAR(36) PRIMARY KEY,
      brandId VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      propertyType VARCHAR(255) NOT NULL,
      platform ENUM('instagram', 'linkedin', 'facebook', 'x', 'website') NOT NULL,
      contentTemplate LONGTEXT NOT NULL,
      description TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_brandId (brandId),
      INDEX idx_propertyType (propertyType)
    )
  `);
}
