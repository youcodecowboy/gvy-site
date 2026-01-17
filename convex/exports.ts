import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/**
 * Log an export event
 * Called when a user exports a document to PDF or DOCX
 */
export const logExport = mutation({
  args: {
    docId: v.id("nodes"),
    versionId: v.optional(v.id("documentVersions")),
    versionString: v.string(),
    format: v.union(v.literal("pdf"), v.literal("docx")),
    docTitle: v.string(),
    fileSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userName = identity.name || identity.nickname || "Unknown";

    const exportId = await ctx.db.insert("exportHistory", {
      docId: args.docId,
      versionId: args.versionId,
      versionString: args.versionString,
      format: args.format,
      docTitle: args.docTitle,
      exportedBy: identity.subject,
      exportedByName: userName,
      exportedAt: Date.now(),
      fileSize: args.fileSize,
    });

    return exportId;
  },
});

/**
 * Get export history for a specific document
 */
export const getExportHistory = query({
  args: {
    docId: v.id("nodes"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify access to the document
    const node = await ctx.db.get(args.docId);
    if (!node) {
      return [];
    }

    // Check access
    if (node.ownerId !== identity.subject && !node.orgId) {
      return [];
    }

    let exports = await ctx.db
      .query("exportHistory")
      .withIndex("by_doc", (q) => q.eq("docId", args.docId))
      .order("desc")
      .collect();

    // Apply limit
    if (args.limit) {
      exports = exports.slice(0, args.limit);
    }

    return exports;
  },
});

/**
 * Get recent exports by the current user across all documents
 */
export const getRecentExports = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    let exports = await ctx.db
      .query("exportHistory")
      .withIndex("by_user", (q) => q.eq("exportedBy", identity.subject))
      .order("desc")
      .collect();

    // Apply limit (default 20)
    const limit = args.limit ?? 20;
    exports = exports.slice(0, limit);

    return exports;
  },
});

/**
 * Get export stats for a document
 */
export const getExportStats = query({
  args: { docId: v.id("nodes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const exports = await ctx.db
      .query("exportHistory")
      .withIndex("by_doc", (q) => q.eq("docId", args.docId))
      .collect();

    if (exports.length === 0) {
      return {
        totalExports: 0,
        pdfExports: 0,
        docxExports: 0,
        lastExportedAt: null,
        lastExportedByName: null,
        lastExportFormat: null,
      };
    }

    const pdfExports = exports.filter((e) => e.format === "pdf").length;
    const docxExports = exports.filter((e) => e.format === "docx").length;

    // Get most recent export
    const sortedExports = exports.sort((a, b) => b.exportedAt - a.exportedAt);
    const lastExport = sortedExports[0];

    return {
      totalExports: exports.length,
      pdfExports,
      docxExports,
      lastExportedAt: lastExport.exportedAt,
      lastExportedByName: lastExport.exportedByName,
      lastExportFormat: lastExport.format,
    };
  },
});

/**
 * Check if a specific version has been exported
 */
export const hasVersionBeenExported = query({
  args: {
    docId: v.id("nodes"),
    versionString: v.string(),
  },
  handler: async (ctx, args) => {
    const exports = await ctx.db
      .query("exportHistory")
      .withIndex("by_doc", (q) => q.eq("docId", args.docId))
      .collect();

    return exports.some((e) => e.versionString === args.versionString);
  },
});

/**
 * Get unique exporters for a document (for audit trail)
 */
export const getDocumentExporters = query({
  args: { docId: v.id("nodes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const exports = await ctx.db
      .query("exportHistory")
      .withIndex("by_doc", (q) => q.eq("docId", args.docId))
      .collect();

    // Group by user
    const exporterMap = new Map<
      string,
      {
        userId: string;
        userName: string;
        exportCount: number;
        lastExportAt: number;
        formats: Set<string>;
      }
    >();

    for (const exp of exports) {
      const existing = exporterMap.get(exp.exportedBy);
      if (existing) {
        existing.exportCount++;
        existing.formats.add(exp.format);
        if (exp.exportedAt > existing.lastExportAt) {
          existing.lastExportAt = exp.exportedAt;
        }
      } else {
        exporterMap.set(exp.exportedBy, {
          userId: exp.exportedBy,
          userName: exp.exportedByName,
          exportCount: 1,
          lastExportAt: exp.exportedAt,
          formats: new Set([exp.format]),
        });
      }
    }

    // Convert to array and format
    return Array.from(exporterMap.values())
      .map((e) => ({
        userId: e.userId,
        userName: e.userName,
        exportCount: e.exportCount,
        lastExportAt: e.lastExportAt,
        formats: Array.from(e.formats),
      }))
      .sort((a, b) => b.lastExportAt - a.lastExportAt);
  },
});
