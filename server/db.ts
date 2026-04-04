import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, brands, categories, partners, agents, contentAssets, drafts, posts, leads, feedbackLogs, postingSchedules } from "../drizzle/schema";
import * as schema from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL, { schema, mode: 'planetscale' });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Brand queries
export async function getUserBrands(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(brands).where(eq(brands.userId, userId));
}

export async function getBrandById(brandId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(brands).where(eq(brands.id, brandId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Category queries
export async function getBrandCategories(brandId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(categories).where(eq(categories.brandId, brandId));
}

// Partner queries
export async function getBrandPartners(brandId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(partners).where(eq(partners.brandId, brandId));
}

// Agent queries
export async function getBrandAgents(brandId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(agents).where(eq(agents.brandId, brandId));
}

// Content Asset queries
export async function getBrandAssets(brandId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(contentAssets).where(eq(contentAssets.brandId, brandId));
}

export async function getAssetById(assetId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(contentAssets).where(eq(contentAssets.id, assetId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Draft queries
export async function getBrandDrafts(brandId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(drafts).where(eq(drafts.brandId, brandId));
}

export async function getDraftById(draftId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(drafts).where(eq(drafts.id, draftId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Post queries
export async function getBrandPosts(brandId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(posts).where(eq(posts.brandId, brandId));
}

export async function getQueuedPosts(brandId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(posts).where(
    and(eq(posts.brandId, brandId), eq(posts.status, 'queued'))
  );
}

// Lead queries
export async function getBrandLeads(brandId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(leads).where(eq(leads.brandId, brandId));
}

export async function getPostLeads(postId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(leads).where(eq(leads.postId, postId));
}

// Feedback queries
export async function getBrandFeedback(brandId: string, categoryId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(feedbackLogs).where(
    and(eq(feedbackLogs.brandId, brandId), eq(feedbackLogs.categoryId, categoryId))
  );
}


// Posting Schedule queries
export async function getPostingSchedule(platform: string) {
  const db = await getDb();
  if (!db) return null;
  return await db.select().from(postingSchedules).where(eq(postingSchedules.platform, platform as any)).limit(1);
}

export async function getAllPostingSchedules() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(postingSchedules);
}

export async function updatePostingSchedule(platform: string, minHours: number, maxHours: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Try to update, if no rows affected, insert
  const result = await db.update(postingSchedules)
    .set({ minHoursBetweenPosts: minHours, maxHoursBetweenPosts: maxHours })
    .where(eq(postingSchedules.platform, platform as any));
  
  // If update didn't affect any rows, insert new schedule
  if ((result as any).affectedRows === 0) {
    const { nanoid } = await import('nanoid');
    await db.insert(postingSchedules).values({
      id: nanoid(),
      platform: platform as any,
      minHoursBetweenPosts: minHours,
      maxHoursBetweenPosts: maxHours,
      isActive: true,
    });
  }
}

// Get the last scheduled post for a brand+platform combination
export async function getLastScheduledPost(brandId: string, platform: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(posts)
    .where(and(
      eq(posts.brandId, brandId),
      eq(posts.platform, platform as any),
      eq(posts.status, 'scheduled')
    ))
    .orderBy(desc(posts.scheduledFor))
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}
