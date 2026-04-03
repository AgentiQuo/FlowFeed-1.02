import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, json, longtext } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Brands table - stores distinct brand profiles for multi-brand support
 */
export const brands = mysqlTable("brands", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  websiteUrl: varchar("websiteUrl", { length: 2048 }),
  voiceBibleUrl: varchar("voiceBibleUrl", { length: 2048 }),
  voiceBibleContent: longtext("voiceBibleContent"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Brand = typeof brands.$inferSelect;
export type InsertBrand = typeof brands.$inferInsert;

/**
 * Categories table - content categories per brand
 * Examples: "Real Estate Listings", "Architectural Commentary", "Partnership Posts"
 */
export const categories = mysqlTable("categories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  brandId: varchar("brandId", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Partners table - real estate agents, developers, or other partners
 */
export const partners = mysqlTable("partners", {
  id: varchar("id", { length: 36 }).primaryKey(),
  brandId: varchar("brandId", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  contactEmail: varchar("contactEmail", { length: 320 }),
  phone: varchar("phone", { length: 20 }),
  type: varchar("type", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = typeof partners.$inferInsert;

/**
 * Agents table - individual real estate agents
 */
export const agents = mysqlTable("agents", {
  id: varchar("id", { length: 36 }).primaryKey(),
  brandId: varchar("brandId", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

/**
 * Content Assets table - stores metadata for uploaded images and documents
 */
export const contentAssets = mysqlTable("contentAssets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  brandId: varchar("brandId", { length: 36 }).notNull(),
  categoryId: varchar("categoryId", { length: 36 }).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  s3Key: varchar("s3Key", { length: 2048 }).notNull(),
  s3Url: varchar("s3Url", { length: 2048 }).notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  extractedMetadata: json("extractedMetadata"),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ContentAsset = typeof contentAssets.$inferSelect;
export type InsertContentAsset = typeof contentAssets.$inferInsert;

/**
 * Drafts table - AI-generated content drafts awaiting review
 */
export const drafts = mysqlTable("drafts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  brandId: varchar("brandId", { length: 36 }).notNull(),
  assetId: varchar("assetId", { length: 36 }).notNull(),
  categoryId: varchar("categoryId", { length: 36 }).notNull(),
  platform: mysqlEnum("platform", ["instagram", "linkedin", "facebook", "x", "website"]).notNull(),
  content: longtext("content").notNull(),
  variations: json("variations"),
  sourceReference: json("sourceReference"),
  status: mysqlEnum("status", ["draft", "reviewed", "scheduled", "published"]).default("draft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Draft = typeof drafts.$inferSelect;
export type InsertDraft = typeof drafts.$inferInsert;

/**
 * Posts table - finalized content ready for publishing
 */
export const posts = mysqlTable("posts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  brandId: varchar("brandId", { length: 36 }).notNull(),
  draftId: varchar("draftId", { length: 36 }).notNull(),
  platform: mysqlEnum("platform", ["instagram", "linkedin", "facebook", "x", "website"]).notNull(),
  content: longtext("content").notNull(),
  status: mysqlEnum("status", ["queued", "scheduled", "published", "failed"]).default("queued"),
  scheduledFor: timestamp("scheduledFor"),
  publishedAt: timestamp("publishedAt"),
  queuePosition: int("queuePosition"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

/**
 * Leads table - captures inquiries from published posts
 */
export const leads = mysqlTable("leads", {
  id: varchar("id", { length: 36 }).primaryKey(),
  postId: varchar("postId", { length: 36 }).notNull(),
  brandId: varchar("brandId", { length: 36 }).notNull(),
  agentId: varchar("agentId", { length: 36 }),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 20 }),
  message: longtext("message"),
  status: mysqlEnum("status", ["new", "contacted", "converted", "lost"]).default("new"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

/**
 * Feedback Logs table - stores user edits to AI-generated content for RAG learning
 */
export const feedbackLogs = mysqlTable("feedbackLogs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  brandId: varchar("brandId", { length: 36 }).notNull(),
  categoryId: varchar("categoryId", { length: 36 }).notNull(),
  platform: mysqlEnum("platform", ["instagram", "linkedin", "facebook", "x", "website"]).notNull(),
  originalContent: longtext("originalContent").notNull(),
  editedContent: longtext("editedContent").notNull(),
  feedback: text("feedback"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FeedbackLog = typeof feedbackLogs.$inferSelect;
export type InsertFeedbackLog = typeof feedbackLogs.$inferInsert;
