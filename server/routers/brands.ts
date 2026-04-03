import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb, getUserBrands, getBrandById, getBrandCategories, getBrandPartners, getBrandAgents } from "../db";
import { brands, categories, partners, agents, InsertBrand, InsertCategory, InsertPartner, InsertAgent } from "../../drizzle/schema";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";

export const brandsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getUserBrands(ctx.user.id);
  }),

  getById: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      return await getBrandById(input.brandId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        websiteUrl: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const brandId = nanoid();
      const newBrand: InsertBrand = {
        id: brandId,
        userId: ctx.user.id,
        name: input.name,
        websiteUrl: input.websiteUrl,
        description: input.description,
      };

      await db.insert(brands).values(newBrand);
      return newBrand;
    }),

  update: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        name: z.string().min(1).optional(),
        websiteUrl: z.string().optional(),
        description: z.string().optional(),
        voiceBibleContent: z.string().optional(),
        voiceBibleUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, any> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.websiteUrl !== undefined) updateData.websiteUrl = input.websiteUrl;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.voiceBibleContent !== undefined) updateData.voiceBibleContent = input.voiceBibleContent;
      if (input.voiceBibleUrl !== undefined) updateData.voiceBibleUrl = input.voiceBibleUrl;

      await db.update(brands).set(updateData).where(eq(brands.id, input.brandId));
      return await getBrandById(input.brandId);
    }),

  delete: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(brands).where(eq(brands.id, input.brandId));
      return { success: true };
    }),

  // Categories
  listCategories: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      return await getBrandCategories(input.brandId);
    }),

  createCategory: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        name: z.string().min(1),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const categoryId = nanoid();
      const newCategory: InsertCategory = {
        id: categoryId,
        brandId: input.brandId,
        name: input.name,
        description: input.description,
      };

      await db.insert(categories).values(newCategory);
      return newCategory;
    }),

  updateCategory: protectedProcedure
    .input(
      z.object({
        categoryId: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, any> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;

      await db.update(categories).set(updateData).where(eq(categories.id, input.categoryId));
      return await db.select().from(categories).where(eq(categories.id, input.categoryId)).limit(1);
    }),

  deleteCategory: protectedProcedure
    .input(z.object({ categoryId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(categories).where(eq(categories.id, input.categoryId));
      return { success: true };
    }),

  // Partners
  listPartners: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      return await getBrandPartners(input.brandId);
    }),

  createPartner: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        name: z.string().min(1),
        contactEmail: z.string().email().optional(),
        phone: z.string().optional(),
        type: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const partnerId = nanoid();
      const newPartner: InsertPartner = {
        id: partnerId,
        brandId: input.brandId,
        name: input.name,
        contactEmail: input.contactEmail,
        phone: input.phone,
        type: input.type,
      };

      await db.insert(partners).values(newPartner);
      return newPartner;
    }),

  updatePartner: protectedProcedure
    .input(
      z.object({
        partnerId: z.string(),
        name: z.string().min(1).optional(),
        contactEmail: z.string().email().optional(),
        phone: z.string().optional(),
        type: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, any> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.contactEmail !== undefined) updateData.contactEmail = input.contactEmail;
      if (input.phone !== undefined) updateData.phone = input.phone;
      if (input.type !== undefined) updateData.type = input.type;

      await db.update(partners).set(updateData).where(eq(partners.id, input.partnerId));
      return await db.select().from(partners).where(eq(partners.id, input.partnerId)).limit(1);
    }),

  deletePartner: protectedProcedure
    .input(z.object({ partnerId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(partners).where(eq(partners.id, input.partnerId));
      return { success: true };
    }),

  // Agents
  listAgents: protectedProcedure
    .input(z.object({ brandId: z.string() }))
    .query(async ({ input }) => {
      return await getBrandAgents(input.brandId);
    }),

  createAgent: protectedProcedure
    .input(
      z.object({
        brandId: z.string(),
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const agentId = nanoid();
      const newAgent: InsertAgent = {
        id: agentId,
        brandId: input.brandId,
        name: input.name,
        email: input.email,
        phone: input.phone,
      };

      await db.insert(agents).values(newAgent);
      return newAgent;
    }),

  updateAgent: protectedProcedure
    .input(
      z.object({
        agentId: z.string(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: Record<string, any> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.email !== undefined) updateData.email = input.email;
      if (input.phone !== undefined) updateData.phone = input.phone;

      await db.update(agents).set(updateData).where(eq(agents.id, input.agentId));
      return await db.select().from(agents).where(eq(agents.id, input.agentId)).limit(1);
    }),

  deleteAgent: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(agents).where(eq(agents.id, input.agentId));
      return { success: true };
    }),
});
