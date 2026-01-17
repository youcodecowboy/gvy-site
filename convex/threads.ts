import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================================================
// Thread Mutations
// ============================================================================

// Create a new discussion thread
export const createThread = mutation({
  args: {
    docId: v.id("nodes"),
    title: v.string(),
    anchorData: v.optional(
      v.object({
        from: v.number(),
        to: v.number(),
        selectedText: v.string(),
      })
    ),
    orgId: v.optional(v.string()),
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

    const now = Date.now();
    const authorId = identity.subject;
    const authorName =
      identity.name || (identity as any).nickname || "Unknown";

    const threadId = await ctx.db.insert("threads", {
      docId: args.docId,
      title: args.title,
      authorId,
      authorName,
      anchorData: args.anchorData,
      status: "open",
      createdAt: now,
      updatedAt: now,
      orgId: args.orgId,
      replyCount: 0,
      lastActivityAt: now,
    });

    return threadId;
  },
});

// Update thread title (author only)
export const updateThread = mutation({
  args: {
    threadId: v.id("threads"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    // Only author can update
    if (thread.authorId !== identity.subject) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.threadId, {
      title: args.title,
      updatedAt: Date.now(),
    });

    return true;
  },
});

// Resolve a thread
export const resolveThread = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    const now = Date.now();
    const userId = identity.subject;
    const userName = identity.name || (identity as any).nickname || "Unknown";

    await ctx.db.patch(args.threadId, {
      status: "resolved",
      resolvedAt: now,
      resolvedBy: userId,
      updatedAt: now,
      lastActivityAt: now,
    });

    // Notify all participants that thread was resolved
    const doc = await ctx.db.get(thread.docId);
    const participants = await getThreadParticipantIds(ctx, args.threadId);

    for (const participantId of participants) {
      // Don't notify the person who resolved it
      if (participantId !== userId) {
        await ctx.db.insert("threadNotifications", {
          threadId: args.threadId,
          docId: thread.docId,
          docTitle: doc?.title || "Untitled",
          recipientId: participantId,
          triggeredByUserId: userId,
          triggeredByUserName: userName,
          type: "thread_resolved",
          threadTitle: thread.title,
          createdAt: now,
          isRead: false,
        });
      }
    }

    return true;
  },
});

// Reopen a resolved thread
export const reopenThread = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    await ctx.db.patch(args.threadId, {
      status: "open",
      resolvedAt: undefined,
      resolvedBy: undefined,
      updatedAt: Date.now(),
      lastActivityAt: Date.now(),
    });

    return true;
  },
});

// Delete a thread (author only, soft delete via removing)
export const deleteThread = mutation({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    // Only author can delete
    if (thread.authorId !== identity.subject) {
      throw new Error("Not authorized");
    }

    // Delete all replies first
    const replies = await ctx.db
      .query("threadReplies")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    for (const reply of replies) {
      await ctx.db.delete(reply._id);
    }

    // Delete all notifications for this thread
    const notifications = await ctx.db
      .query("threadNotifications")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    for (const notification of notifications) {
      await ctx.db.delete(notification._id);
    }

    // Delete the thread
    await ctx.db.delete(args.threadId);

    return true;
  },
});

// ============================================================================
// Reply Mutations
// ============================================================================

// Create a reply (top-level or nested)
export const createReply = mutation({
  args: {
    threadId: v.id("threads"),
    parentReplyId: v.optional(v.id("threadReplies")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    const now = Date.now();
    const authorId = identity.subject;
    const authorName =
      identity.name || (identity as any).nickname || "Unknown";

    // Calculate depth
    let depth = 0;
    if (args.parentReplyId) {
      const parentReply = await ctx.db.get(args.parentReplyId);
      if (parentReply) {
        // Cap depth at 3
        depth = Math.min(parentReply.depth + 1, 3);
      }
    }

    const replyId = await ctx.db.insert("threadReplies", {
      threadId: args.threadId,
      parentReplyId: args.parentReplyId,
      authorId,
      authorName,
      content: args.content,
      createdAt: now,
      depth,
    });

    // Update thread's reply count and last activity
    await ctx.db.patch(args.threadId, {
      replyCount: thread.replyCount + 1,
      lastActivityAt: now,
      updatedAt: now,
    });

    // Notify all participants except the author of this reply
    const doc = await ctx.db.get(thread.docId);
    const participants = await getThreadParticipantIds(ctx, args.threadId);

    for (const participantId of participants) {
      // Don't notify the person who wrote the reply
      if (participantId !== authorId) {
        await ctx.db.insert("threadNotifications", {
          threadId: args.threadId,
          docId: thread.docId,
          docTitle: doc?.title || "Untitled",
          recipientId: participantId,
          triggeredByUserId: authorId,
          triggeredByUserName: authorName,
          type: "new_reply",
          replyId,
          threadTitle: thread.title,
          createdAt: now,
          isRead: false,
        });
      }
    }

    return replyId;
  },
});

// Update a reply (author only)
export const updateReply = mutation({
  args: {
    replyId: v.id("threadReplies"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const reply = await ctx.db.get(args.replyId);
    if (!reply || reply.isDeleted) {
      throw new Error("Reply not found");
    }

    // Only author can update
    if (reply.authorId !== identity.subject) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.replyId, {
      content: args.content,
      updatedAt: Date.now(),
    });

    return true;
  },
});

// Delete a reply (soft delete, author only)
export const deleteReply = mutation({
  args: {
    replyId: v.id("threadReplies"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const reply = await ctx.db.get(args.replyId);
    if (!reply) {
      throw new Error("Reply not found");
    }

    // Only author can delete
    if (reply.authorId !== identity.subject) {
      throw new Error("Not authorized");
    }

    // Soft delete to preserve thread structure
    await ctx.db.patch(args.replyId, {
      isDeleted: true,
      content: "[deleted]",
    });

    // Update reply count
    const thread = await ctx.db.get(reply.threadId);
    if (thread && thread.replyCount > 0) {
      await ctx.db.patch(reply.threadId, {
        replyCount: thread.replyCount - 1,
      });
    }

    return true;
  },
});

// ============================================================================
// Thread Queries
// ============================================================================

// Get all threads for a document
export const getThreadsByDoc = query({
  args: {
    docId: v.id("nodes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const threads = await ctx.db
      .query("threads")
      .withIndex("by_doc", (q) => q.eq("docId", args.docId))
      .collect();

    // Sort by last activity, most recent first
    return threads.sort((a, b) => b.lastActivityAt - a.lastActivityAt);
  },
});

// Get a single thread with all its replies
export const getThread = query({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const thread = await ctx.db.get(args.threadId);
    if (!thread) {
      return null;
    }

    // Get all replies for this thread
    const replies = await ctx.db
      .query("threadReplies")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .collect();

    // Sort by creation time
    const sortedReplies = replies.sort((a, b) => a.createdAt - b.createdAt);

    // Build nested structure
    const nestedReplies = buildNestedReplies(sortedReplies);

    return {
      ...thread,
      replies: nestedReplies,
    };
  },
});

// Get threads with anchors for a document (for rendering indicators)
export const getThreadsWithAnchors = query({
  args: {
    docId: v.id("nodes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const threads = await ctx.db
      .query("threads")
      .withIndex("by_doc", (q) => q.eq("docId", args.docId))
      .collect();

    // Return only threads that have anchor data
    return threads
      .filter((t) => t.anchorData)
      .map((t) => ({
        _id: t._id,
        title: t.title,
        status: t.status,
        replyCount: t.replyCount,
        anchorData: t.anchorData,
      }));
  },
});

// Get thread count for a document
export const getThreadCount = query({
  args: {
    docId: v.id("nodes"),
  },
  handler: async (ctx, args) => {
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_doc", (q) => q.eq("docId", args.docId))
      .collect();

    return {
      total: threads.length,
      open: threads.filter((t) => t.status === "open").length,
      resolved: threads.filter((t) => t.status === "resolved").length,
    };
  },
});

// Get recent threads for dashboard (threads user participated in)
export const getRecentThreads = query({
  args: {
    orgId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;
    const limit = args.limit ?? 10;

    // Get personal document IDs
    const personalNodes = await ctx.db
      .query("nodes")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    const personalDocIds = new Set(personalNodes.map((n) => n._id));

    // Get org document IDs if applicable
    let orgDocIds = new Set<string>();
    if (args.orgId) {
      const orgNodes = await ctx.db
        .query("nodes")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect();
      orgDocIds = new Set(orgNodes.map((n) => n._id));
    }

    // Get all threads and filter by accessible docs
    const allThreads = await ctx.db
      .query("threads")
      .withIndex("by_last_activity")
      .order("desc")
      .take(100);

    const accessibleThreads = allThreads
      .filter(
        (thread) =>
          personalDocIds.has(thread.docId) ||
          orgDocIds.has(thread.docId as string)
      )
      .slice(0, limit);

    // Get doc titles for each thread
    const threadsWithDocs = await Promise.all(
      accessibleThreads.map(async (thread) => {
        const doc = await ctx.db.get(thread.docId);
        return {
          ...thread,
          docTitle: doc?.title || "Untitled",
        };
      })
    );

    return threadsWithDocs;
  },
});

// ============================================================================
// Notification Queries & Mutations
// ============================================================================

// Get thread notifications for current user
export const getThreadNotifications = query({
  args: {
    limit: v.optional(v.number()),
    onlyUnread: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;
    const limit = args.limit ?? 50;

    let notifications;
    if (args.onlyUnread) {
      notifications = await ctx.db
        .query("threadNotifications")
        .withIndex("by_recipient_unread", (q) =>
          q.eq("recipientId", userId).eq("isRead", false)
        )
        .collect();
    } else {
      notifications = await ctx.db
        .query("threadNotifications")
        .withIndex("by_recipient", (q) => q.eq("recipientId", userId))
        .collect();
    }

    // Sort by most recent first
    return notifications
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});

// Get unread thread notification count
export const getUnreadThreadNotificationCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const userId = identity.subject;

    const unreadNotifications = await ctx.db
      .query("threadNotifications")
      .withIndex("by_recipient_unread", (q) =>
        q.eq("recipientId", userId).eq("isRead", false)
      )
      .collect();

    return unreadNotifications.length;
  },
});

// Mark a thread notification as read
export const markThreadNotificationRead = mutation({
  args: {
    notificationId: v.id("threadNotifications"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    // Only recipient can mark as read
    if (notification.recipientId !== identity.subject) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
      readAt: Date.now(),
    });

    return true;
  },
});

// Mark all thread notifications as read
export const markAllThreadNotificationsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const now = Date.now();

    const unreadNotifications = await ctx.db
      .query("threadNotifications")
      .withIndex("by_recipient_unread", (q) =>
        q.eq("recipientId", userId).eq("isRead", false)
      )
      .collect();

    for (const notification of unreadNotifications) {
      await ctx.db.patch(notification._id, {
        isRead: true,
        readAt: now,
      });
    }

    return unreadNotifications.length;
  },
});

// Delete a thread notification
export const deleteThreadNotification = mutation({
  args: {
    notificationId: v.id("threadNotifications"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    // Only recipient can delete
    if (notification.recipientId !== identity.subject) {
      throw new Error("Not authorized");
    }

    await ctx.db.delete(args.notificationId);

    return true;
  },
});

// ============================================================================
// Helper Functions
// ============================================================================

// Get all participant IDs for a thread (author + all repliers)
async function getThreadParticipantIds(
  ctx: any,
  threadId: Id<"threads">
): Promise<string[]> {
  const thread = await ctx.db.get(threadId);
  if (!thread) {
    return [];
  }

  const participantSet = new Set<string>();

  // Add thread author
  participantSet.add(thread.authorId);

  // Add all reply authors
  const replies = await ctx.db
    .query("threadReplies")
    .withIndex("by_thread", (q: any) => q.eq("threadId", threadId))
    .collect();

  for (const reply of replies) {
    if (!reply.isDeleted) {
      participantSet.add(reply.authorId);
    }
  }

  return Array.from(participantSet);
}

// Build nested reply structure from flat list
interface Reply {
  _id: Id<"threadReplies">;
  threadId: Id<"threads">;
  parentReplyId?: Id<"threadReplies">;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: number;
  updatedAt?: number;
  isDeleted?: boolean;
  depth: number;
}

interface NestedReply extends Reply {
  children: NestedReply[];
}

function buildNestedReplies(replies: Reply[]): NestedReply[] {
  const replyMap = new Map<string, NestedReply>();
  const rootReplies: NestedReply[] = [];

  // First pass: create NestedReply objects
  for (const reply of replies) {
    replyMap.set(reply._id, { ...reply, children: [] });
  }

  // Second pass: build tree structure
  for (const reply of replies) {
    const nestedReply = replyMap.get(reply._id)!;

    if (reply.parentReplyId) {
      const parent = replyMap.get(reply.parentReplyId);
      if (parent) {
        parent.children.push(nestedReply);
      } else {
        // Parent not found, treat as root
        rootReplies.push(nestedReply);
      }
    } else {
      rootReplies.push(nestedReply);
    }
  }

  return rootReplies;
}
