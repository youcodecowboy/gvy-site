import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Activity types
export type ActivityType =
  | "doc_created"
  | "doc_updated"
  | "doc_deleted"
  | "folder_created"
  | "folder_updated"
  | "folder_deleted"
  | "thread_created"
  | "thread_resolved";

// Record an activity (internal mutation for use by other modules)
export const recordActivity = internalMutation({
  args: {
    type: v.union(
      v.literal("doc_created"),
      v.literal("doc_updated"),
      v.literal("doc_deleted"),
      v.literal("folder_created"),
      v.literal("folder_updated"),
      v.literal("folder_deleted"),
      v.literal("thread_created"),
      v.literal("thread_resolved")
    ),
    nodeId: v.optional(v.id("nodes")),
    nodeTitle: v.string(),
    nodeType: v.optional(v.union(v.literal("doc"), v.literal("folder"))),
    userId: v.string(),
    userName: v.string(),
    orgId: v.optional(v.string()),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activity", {
      type: args.type,
      nodeId: args.nodeId,
      nodeTitle: args.nodeTitle,
      nodeType: args.nodeType,
      userId: args.userId,
      userName: args.userName,
      orgId: args.orgId,
      createdAt: Date.now(),
      details: args.details,
    });
  },
});

// Public mutation for recording activity (requires auth)
export const logActivity = mutation({
  args: {
    type: v.union(
      v.literal("doc_created"),
      v.literal("doc_updated"),
      v.literal("doc_deleted"),
      v.literal("folder_created"),
      v.literal("folder_updated"),
      v.literal("folder_deleted"),
      v.literal("thread_created"),
      v.literal("thread_resolved")
    ),
    nodeId: v.optional(v.id("nodes")),
    nodeTitle: v.string(),
    nodeType: v.optional(v.union(v.literal("doc"), v.literal("folder"))),
    orgId: v.optional(v.string()),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userName =
      identity.name || (identity as any).nickname || "Anonymous";

    await ctx.db.insert("activity", {
      type: args.type,
      nodeId: args.nodeId,
      nodeTitle: args.nodeTitle,
      nodeType: args.nodeType,
      userId: identity.subject,
      userName,
      orgId: args.orgId,
      createdAt: Date.now(),
      details: args.details,
    });
  },
});

// Get organization activity feed
export const getOrgActivity = query({
  args: {
    orgId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const limit = args.limit ?? 50;

    // Get activity for the organization, sorted by most recent
    let activities;
    if (args.orgId) {
      activities = await ctx.db
        .query("activity")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .order("desc")
        .take(limit);
    } else {
      // Personal workspace - get activities without orgId or get all
      activities = await ctx.db
        .query("activity")
        .order("desc")
        .take(limit);

      // Filter to only personal activities (no orgId)
      activities = activities.filter((a) => !a.orgId);
    }

    return activities;
  },
});

// Get activity count for badge (optional - not using for now)
export const getOrgActivityCount = query({
  args: {
    orgId: v.optional(v.string()),
    since: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    // Get recent activity count (last 24 hours by default)
    const since = args.since ?? Date.now() - 24 * 60 * 60 * 1000;

    const activities = await ctx.db
      .query("activity")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.gte(q.field("createdAt"), since))
      .collect();

    return activities.length;
  },
});
