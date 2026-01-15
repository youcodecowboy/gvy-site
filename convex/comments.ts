import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a comment (called when a comment is added in TipTap)
export const createComment = mutation({
  args: {
    docId: v.id("nodes"),
    docTitle: v.string(),
    threadId: v.optional(v.string()),
    content: v.string(),
    authorName: v.string(),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const commentId = await ctx.db.insert("comments", {
      docId: args.docId,
      docTitle: args.docTitle,
      threadId: args.threadId,
      authorId: identity.subject,
      authorName: args.authorName,
      content: args.content,
      createdAt: Date.now(),
      isResolved: false,
      orgId: args.orgId,
    });

    return commentId;
  },
});

// Get recent comments for dashboard
export const getRecentComments = query({
  args: {
    orgId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const limit = args.limit ?? 10;
    const userId = identity.subject;

    // Get personal document IDs
    const personalNodes = await ctx.db
      .query("nodes")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();
    
    const personalDocIds = new Set(personalNodes.map(n => n._id));

    // Get org document IDs if applicable
    let orgDocIds = new Set<string>();
    if (args.orgId) {
      const orgNodes = await ctx.db
        .query("nodes")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect();
      orgDocIds = new Set(orgNodes.map(n => n._id));
    }

    // Get all comments and filter by accessible docs
    const allComments = await ctx.db
      .query("comments")
      .order("desc")
      .take(100); // Get more than needed to filter

    const accessibleComments = allComments
      .filter(comment => 
        personalDocIds.has(comment.docId) || orgDocIds.has(comment.docId as string)
      )
      .slice(0, limit);

    return accessibleComments;
  },
});

// Mark a comment as resolved
export const resolveComment = mutation({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    await ctx.db.patch(args.commentId, {
      isResolved: true,
    });
  },
});

// Delete a comment
export const deleteComment = mutation({
  args: {
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new Error("Comment not found");
    }

    // Only author can delete
    if (comment.authorId !== identity.subject) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.commentId);
  },
});

// Get comment count for a document
export const getCommentCount = query({
  args: {
    docId: v.id("nodes"),
  },
  handler: async (ctx, args) => {
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_doc", (q) => q.eq("docId", args.docId))
      .collect();

    return {
      total: comments.length,
      unresolved: comments.filter(c => !c.isResolved).length,
    };
  },
});
