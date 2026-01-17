import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Debounce window in milliseconds (5 minutes)
const VIEW_DEBOUNCE_MS = 5 * 60 * 1000;

// Log a document view
export const logView = mutation({
  args: {
    docId: v.id("nodes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify doc exists and user has access
    const doc = await ctx.db.get(args.docId);
    if (!doc || doc.isDeleted) {
      throw new Error("Document not found");
    }

    // Check access: either owner or org member
    if (doc.ownerId !== identity.subject && !doc.orgId) {
      throw new Error("Not authorized");
    }

    const now = Date.now();
    const userId = identity.subject;

    // Check for recent view from same user (debouncing)
    const recentViews = await ctx.db
      .query("views")
      .withIndex("by_doc_user", (q) =>
        q.eq("docId", args.docId).eq("viewedByUserId", userId)
      )
      .collect();

    // Find the most recent view
    const mostRecentView = recentViews.sort(
      (a, b) => b.viewedAt - a.viewedAt
    )[0];

    // Skip if user viewed within debounce window
    if (mostRecentView && now - mostRecentView.viewedAt < VIEW_DEBOUNCE_MS) {
      return null; // No new view logged
    }

    const userName =
      identity.name || (identity as any).nickname || "Unknown";

    // Log the view
    const viewId = await ctx.db.insert("views", {
      docId: args.docId,
      viewedByUserId: userId,
      viewedByUserName: userName,
      viewedAt: now,
    });

    return viewId;
  },
});

// Get view statistics for a document
export const getViewStats = query({
  args: {
    docId: v.id("nodes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Verify doc exists and user has access
    const doc = await ctx.db.get(args.docId);
    if (!doc || doc.isDeleted) {
      return null;
    }

    // Check access
    if (doc.ownerId !== identity.subject && !doc.orgId) {
      return null;
    }

    // Get all views for this document
    const views = await ctx.db
      .query("views")
      .withIndex("by_doc", (q) => q.eq("docId", args.docId))
      .collect();

    if (views.length === 0) {
      return {
        totalViews: 0,
        lastViewedAt: null,
        lastViewedByUserName: null,
      };
    }

    // Find most recent view
    const sortedViews = views.sort((a, b) => b.viewedAt - a.viewedAt);
    const lastView = sortedViews[0];

    return {
      totalViews: views.length,
      lastViewedAt: lastView.viewedAt,
      lastViewedByUserName: lastView.viewedByUserName,
    };
  },
});

// Get full view history for a document
export const getViewHistory = query({
  args: {
    docId: v.id("nodes"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify doc exists and user has access
    const doc = await ctx.db.get(args.docId);
    if (!doc || doc.isDeleted) {
      return [];
    }

    // Check access
    if (doc.ownerId !== identity.subject && !doc.orgId) {
      return [];
    }

    const limit = args.limit ?? 50;

    // Get views ordered by most recent
    const views = await ctx.db
      .query("views")
      .withIndex("by_doc", (q) => q.eq("docId", args.docId))
      .collect();

    // Sort by most recent and limit
    return views.sort((a, b) => b.viewedAt - a.viewedAt).slice(0, limit);
  },
});
