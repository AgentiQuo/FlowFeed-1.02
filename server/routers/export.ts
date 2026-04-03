import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { eq, inArray, or } from "drizzle-orm";
import { drafts } from "../../drizzle/schema";

export const exportRouter = router({
  /**
   * Export a single draft to WordPress-compatible format
   */
  exportDraft: protectedProcedure
    .input(
      z.object({
        draftId: z.string(),
        format: z.enum(["html", "json", "xml"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const draft = await db
        .select()
        .from(drafts)
        .where(eq(drafts.id, input.draftId))
        .limit(1);

      if (!draft || draft.length === 0) {
        throw new Error("Draft not found");
      }

      const draftData = draft[0];

      switch (input.format) {
        case "html":
          return generateHtmlExport(draftData);
        case "json":
          return generateJsonExport(draftData);
        case "xml":
          return generateXmlExport(draftData);
        default:
          throw new Error("Unsupported format");
      }
    }),

  /**
   * Export multiple drafts as a batch
   */
  exportBatch: protectedProcedure
    .input(
      z.object({
        draftIds: z.array(z.string()),
        format: z.enum(["html", "json", "xml"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const batchDrafts = await db
        .select()
        .from(drafts)
        .where(inArray(drafts.id, input.draftIds));

      if (batchDrafts.length === 0) {
        throw new Error("No drafts found");
      }

      switch (input.format) {
        case "html":
          return generateBatchHtmlExport(batchDrafts);
        case "json":
          return generateBatchJsonExport(batchDrafts);
        case "xml":
          return generateBatchXmlExport(batchDrafts);
        default:
          throw new Error("Unsupported format");
      }
    }),

  /**
   * Get WordPress REST API compatible format for a draft
   */
  getWordPressFormat: protectedProcedure
    .input(z.object({ draftId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const draft = await db
        .select()
        .from(drafts)
        .where(eq(drafts.id, input.draftId))
        .limit(1);

      if (!draft || draft.length === 0) {
        throw new Error("Draft not found");
      }

      const draftData = draft[0];

      return {
        title: `${draftData.platform} Post - ${new Date().toLocaleDateString()}`,
        content: draftData.content,
        excerpt: draftData.content.substring(0, 150),
        status: "draft",
        format: "standard",
        categories: [draftData.platform],
        tags: [draftData.platform, "social-media"],
        meta: {
          platform: draftData.platform,
          originalDraftId: draftData.id,
          generatedAt: draftData.createdAt,
          status: draftData.status,
        },
      };
    }),
});

/**
 * Generate HTML export for a single draft
 */
function generateHtmlExport(draft: any) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(draft.platform)} Post</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .post { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .meta { color: #666; font-size: 0.9em; margin-bottom: 10px; }
        .platform { display: inline-block; background: #007bff; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; margin-right: 10px; }
        .content { white-space: pre-wrap; word-wrap: break-word; }
    </style>
</head>
<body>
    <h1>Social Media Post Export</h1>
    <div class="post">
        <div class="meta">
            <span class="platform">${escapeHtml(draft.platform)}</span>
            <span>Created: ${new Date(draft.createdAt).toLocaleString()}</span>
        </div>
        <div class="content">${escapeHtml(draft.content)}</div>
    </div>
</body>
</html>`;

  return {
    filename: `${draft.platform}-post-${Date.now()}.html`,
    content: html,
    mimeType: "text/html",
  };
}

/**
 * Generate JSON export for a single draft (WordPress REST API compatible)
 */
function generateJsonExport(draft: any) {
  const wpFormat = {
    title: `${draft.platform} Post - ${new Date().toLocaleDateString()}`,
    content: draft.content,
    excerpt: draft.content.substring(0, 150),
    status: "draft",
    format: "standard",
    categories: [draft.platform],
    tags: [draft.platform, "social-media"],
    meta: {
      platform: draft.platform,
      originalDraftId: draft.id,
      generatedAt: draft.createdAt,
      status: draft.status,
    },
  };

  return {
    filename: `${draft.platform}-post-${Date.now()}.json`,
    content: JSON.stringify(wpFormat, null, 2),
    mimeType: "application/json",
  };
}

/**
 * Generate XML export for a single draft (WordPress WXR format)
 */
function generateXmlExport(draft: any) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
    xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
    xmlns:content="http://purl.org/rss/1.0/modules/content/"
    xmlns:wfw="http://wellformedweb.org/CommentAPI/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:wp="http://wordpress.org/export/1.2/">
    <channel>
        <title>Social Media Post Export</title>
        <link>https://example.com</link>
        <description>Exported from Social Poster</description>
        <item>
            <title>${escapeXml(draft.platform)} Post</title>
            <link>https://example.com</link>
            <pubDate>${new Date(draft.createdAt).toUTCString()}</pubDate>
            <dc:creator>Social Poster</dc:creator>
            <guid>urn:social-poster:${draft.id}</guid>
            <content:encoded><![CDATA[${draft.content}]]></content:encoded>
            <excerpt:encoded><![CDATA[${draft.content.substring(0, 150)}]]></excerpt:encoded>
            <wp:post_type>post</wp:post_type>
            <wp:status>draft</wp:status>
            <wp:post_name>${draft.platform}-post</wp:post_name>
            <wp:meta>
                <wp:meta_key>platform</wp:meta_key>
                <wp:meta_value>${escapeXml(draft.platform)}</wp:meta_value>
            </wp:meta>
            <wp:meta>
                <wp:meta_key>source_draft_id</wp:meta_key>
                <wp:meta_value>${draft.id}</wp:meta_value>
            </wp:meta>
        </item>
    </channel>
</rss>`;

  return {
    filename: `${draft.platform}-post-${Date.now()}.xml`,
    content: xml,
    mimeType: "application/xml",
  };
}

/**
 * Generate batch HTML export
 */
function generateBatchHtmlExport(draftList: any[]) {
  const postsHtml = draftList
    .map(
      (draft) => `
    <div class="post">
        <div class="meta">
            <span class="platform">${escapeHtml(draft.platform)}</span>
            <span>Created: ${new Date(draft.createdAt).toLocaleString()}</span>
        </div>
        <div class="content">${escapeHtml(draft.content)}</div>
    </div>`
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Social Media Posts Export</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .post { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .meta { color: #666; font-size: 0.9em; margin-bottom: 10px; }
        .platform { display: inline-block; background: #007bff; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; margin-right: 10px; }
        .content { white-space: pre-wrap; word-wrap: break-word; }
        h1 { border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    </style>
</head>
<body>
    <h1>Social Media Posts Export (${draftList.length} posts)</h1>
    ${postsHtml}
</body>
</html>`;

  return {
    filename: `social-posts-batch-${Date.now()}.html`,
    content: html,
    mimeType: "text/html",
  };
}

/**
 * Generate batch JSON export
 */
function generateBatchJsonExport(draftList: any[]) {
  const posts = draftList.map((draft) => ({
    title: `${draft.platform} Post - ${new Date().toLocaleDateString()}`,
    content: draft.content,
    excerpt: draft.content.substring(0, 150),
    status: "draft",
    format: "standard",
    categories: [draft.platform],
    tags: [draft.platform, "social-media"],
    meta: {
      platform: draft.platform,
      originalDraftId: draft.id,
      generatedAt: draft.createdAt,
      status: draft.status,
    },
  }));

  return {
    filename: `social-posts-batch-${Date.now()}.json`,
    content: JSON.stringify({ posts }, null, 2),
    mimeType: "application/json",
  };
}

/**
 * Generate batch XML export
 */
function generateBatchXmlExport(draftList: any[]) {
  const itemsXml = draftList
    .map(
      (draft) => `
        <item>
            <title>${escapeXml(draft.platform)} Post</title>
            <link>https://example.com</link>
            <pubDate>${new Date(draft.createdAt).toUTCString()}</pubDate>
            <dc:creator>Social Poster</dc:creator>
            <guid>urn:social-poster:${draft.id}</guid>
            <content:encoded><![CDATA[${draft.content}]]></content:encoded>
            <excerpt:encoded><![CDATA[${draft.content.substring(0, 150)}]]></excerpt:encoded>
            <wp:post_type>post</wp:post_type>
            <wp:status>draft</wp:status>
            <wp:post_name>${draft.platform}-post</wp:post_name>
        </item>`
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
    xmlns:excerpt="http://wordpress.org/export/1.2/excerpt/"
    xmlns:content="http://purl.org/rss/1.0/modules/content/"
    xmlns:wfw="http://wellformedweb.org/CommentAPI/"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:wp="http://wordpress.org/export/1.2/">
    <channel>
        <title>Social Media Posts Export</title>
        <link>https://example.com</link>
        <description>Exported from Social Poster (${draftList.length} posts)</description>
        ${itemsXml}
    </channel>
</rss>`;

  return {
    filename: `social-posts-batch-${Date.now()}.xml`,
    content: xml,
    mimeType: "application/xml",
  };
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
