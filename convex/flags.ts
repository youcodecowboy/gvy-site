import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new flag
export const createFlag = mutation({
  args: {
    docId: v.id("nodes"),
    type: v.union(v.literal("inline"), v.literal("document")),
    selectionData: v.optional(
      v.object({
        from: v.number(),
        to: v.number(),
        selectedText: v.string(),
      })
    ),
    recipientId: v.string(),
    recipientName: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify doc exists
    const doc = await ctx.db.get(args.docId);
    if (!doc || doc.isDeleted) {
      throw new Error("Document not found");
    }

    // Prevent self-flagging
    if (args.recipientId === identity.subject) {
      throw new Error("Cannot flag content for yourself");
    }

    const senderId = identity.subject;
    const senderName =
      identity.name || (identity as any).nickname || "Unknown";

    const flagId = await ctx.db.insert("flags", {
      docId: args.docId,
      docTitle: doc.title,
      type: args.type,
      selectionData: args.selectionData,
      senderId,
      senderName,
      recipientId: args.recipientId,
      recipientName: args.recipientName,
      message: args.message,
      createdAt: Date.now(),
      isRead: false,
    });

    return flagId;
  },
});

// Mark a flag as read
export const markFlagRead = mutation({
  args: {
    flagId: v.id("flags"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const flag = await ctx.db.get(args.flagId);
    if (!flag) {
      throw new Error("Flag not found");
    }

    // Only recipient can mark as read
    if (flag.recipientId !== identity.subject) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.flagId, {
      isRead: true,
      readAt: Date.now(),
    });

    return true;
  },
});

// Mark all unread flags as read for current user
export const markAllFlagsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const now = Date.now();

    const unreadFlags = await ctx.db
      .query("flags")
      .withIndex("by_recipient_unread", (q) =>
        q.eq("recipientId", userId).eq("isRead", false)
      )
      .collect();

    for (const flag of unreadFlags) {
      await ctx.db.patch(flag._id, {
        isRead: true,
        readAt: now,
      });
    }

    return unreadFlags.length;
  },
});

// Delete a flag (sender or recipient can delete)
export const deleteFlag = mutation({
  args: {
    flagId: v.id("flags"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const flag = await ctx.db.get(args.flagId);
    if (!flag) {
      throw new Error("Flag not found");
    }

    // Only sender or recipient can delete
    if (
      flag.senderId !== identity.subject &&
      flag.recipientId !== identity.subject
    ) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.flagId);
    return true;
  },
});

// Get flags for current user (as recipient)
export const getFlags = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;
    const limit = args.limit ?? 50;

    const flags = await ctx.db
      .query("flags")
      .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
      .collect();

    // Sort by most recent first
    return flags.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  },
});

// Get unread flag count for current user
export const getUnreadFlagCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const userId = identity.subject;

    const unreadFlags = await ctx.db
      .query("flags")
      .withIndex("by_recipient_unread", (q) =>
        q.eq("recipientId", userId).eq("isRead", false)
      )
      .collect();

    return unreadFlags.length;
  },
});

// Get flags sent by current user
export const getSentFlags = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;
    const limit = args.limit ?? 50;

    const flags = await ctx.db
      .query("flags")
      .withIndex("by_sender", (q) => q.eq("senderId", userId))
      .collect();

    // Sort by most recent first
    return flags.sort((a, b) => b.createdAt - a.createdAt).slice(0, limit);
  },
});

// Get a single flag by ID
export const getFlag = query({
  args: {
    flagId: v.id("flags"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const flag = await ctx.db.get(args.flagId);
    if (!flag) {
      return null;
    }

    // Only sender or recipient can view
    if (
      flag.senderId !== identity.subject &&
      flag.recipientId !== identity.subject
    ) {
      return null;
    }

    return flag;
  },
});
