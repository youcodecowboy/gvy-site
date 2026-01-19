import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Create a new AI chat conversation
 */
export const createChat = mutation({
  args: {
    contextType: v.union(
      v.literal("document"),
      v.literal("folder"),
      v.literal("custom")
    ),
    documentId: v.optional(v.id("nodes")),
    folderId: v.optional(v.id("nodes")),
    customDocIds: v.optional(v.array(v.id("nodes"))),
    title: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const now = Date.now();

    // Get context titles for display
    let documentTitle: string | undefined;
    let folderTitle: string | undefined;

    if (args.documentId) {
      const doc = await ctx.db.get(args.documentId);
      documentTitle = doc?.title;
    }

    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      folderTitle = folder?.title;
    }

    // Default title based on context
    let title = args.title || "New Chat";
    if (!args.title) {
      if (documentTitle) {
        title = `Chat about ${documentTitle}`;
      } else if (folderTitle) {
        title = `Chat about ${folderTitle}`;
      }
    }

    const chatId = await ctx.db.insert("aiChats", {
      userId,
      title,
      contextType: args.contextType,
      documentId: args.documentId,
      folderId: args.folderId,
      customDocIds: args.customDocIds,
      documentTitle,
      folderTitle,
      createdAt: now,
      updatedAt: now,
    });

    return chatId;
  },
});

/**
 * List chats for the current user
 */
export const listChats = query({
  args: {
    documentId: v.optional(v.id("nodes")),
    folderId: v.optional(v.id("nodes")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = identity.subject;
    const limit = args.limit || 20;

    // If filtering by document/folder, use those indexes
    if (args.documentId) {
      const chats = await ctx.db
        .query("aiChats")
        .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
        .filter((q) =>
          q.and(
            q.eq(q.field("userId"), userId),
            q.neq(q.field("isArchived"), true)
          )
        )
        .order("desc")
        .take(limit);

      return chats;
    }

    if (args.folderId) {
      const chats = await ctx.db
        .query("aiChats")
        .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
        .filter((q) =>
          q.and(
            q.eq(q.field("userId"), userId),
            q.neq(q.field("isArchived"), true)
          )
        )
        .order("desc")
        .take(limit);

      return chats;
    }

    // Default: list all user's chats
    const chats = await ctx.db
      .query("aiChats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.neq(q.field("isArchived"), true))
      .order("desc")
      .take(limit);

    return chats;
  },
});

/**
 * Get a specific chat with ownership check
 */
export const getChat = query({
  args: {
    chatId: v.id("aiChats"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== identity.subject) {
      return null; // Not found or not owned by user
    }

    return chat;
  },
});

/**
 * Get messages for a chat
 */
export const getChatMessages = query({
  args: {
    chatId: v.id("aiChats"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Verify chat ownership
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== identity.subject) {
      return [];
    }

    const messages = await ctx.db
      .query("aiChatMessages")
      .withIndex("by_chat_created", (q) => q.eq("chatId", args.chatId))
      .collect();

    return messages;
  },
});

/**
 * Add a message to a chat
 */
export const addMessage = mutation({
  args: {
    chatId: v.id("aiChats"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify chat ownership
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== identity.subject) {
      throw new Error("Chat not found");
    }

    const now = Date.now();

    // Add the message
    const messageId = await ctx.db.insert("aiChatMessages", {
      chatId: args.chatId,
      role: args.role,
      content: args.content,
      createdAt: now,
    });

    // Update chat's updatedAt and potentially title
    const updates: { updatedAt: number; title?: string } = { updatedAt: now };

    // Auto-generate title from first user message if still default
    if (
      args.role === "user" &&
      chat.title.startsWith("New Chat") ||
      chat.title.startsWith("Chat about")
    ) {
      // Use first 50 chars of first message as title
      const newTitle = args.content.slice(0, 50) + (args.content.length > 50 ? "..." : "");
      updates.title = newTitle;
    }

    await ctx.db.patch(args.chatId, updates);

    return messageId;
  },
});

/**
 * Update chat title
 */
export const updateChatTitle = mutation({
  args: {
    chatId: v.id("aiChats"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== identity.subject) {
      throw new Error("Chat not found");
    }

    await ctx.db.patch(args.chatId, {
      title: args.title,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Update chat context scope
 */
export const updateChatContext = mutation({
  args: {
    chatId: v.id("aiChats"),
    contextType: v.union(
      v.literal("document"),
      v.literal("folder"),
      v.literal("custom")
    ),
    documentId: v.optional(v.id("nodes")),
    folderId: v.optional(v.id("nodes")),
    customDocIds: v.optional(v.array(v.id("nodes"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== identity.subject) {
      throw new Error("Chat not found");
    }

    // Get updated titles
    let documentTitle: string | undefined;
    let folderTitle: string | undefined;

    if (args.documentId) {
      const doc = await ctx.db.get(args.documentId);
      documentTitle = doc?.title;
    }

    if (args.folderId) {
      const folder = await ctx.db.get(args.folderId);
      folderTitle = folder?.title;
    }

    await ctx.db.patch(args.chatId, {
      contextType: args.contextType,
      documentId: args.documentId,
      folderId: args.folderId,
      customDocIds: args.customDocIds,
      documentTitle,
      folderTitle,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Archive (soft delete) a chat
 */
export const archiveChat = mutation({
  args: {
    chatId: v.id("aiChats"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== identity.subject) {
      throw new Error("Chat not found");
    }

    await ctx.db.patch(args.chatId, {
      isArchived: true,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Permanently delete a chat and all its messages
 */
export const deleteChat = mutation({
  args: {
    chatId: v.id("aiChats"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== identity.subject) {
      throw new Error("Chat not found");
    }

    // Delete all messages first
    const messages = await ctx.db
      .query("aiChatMessages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .collect();

    for (const message of messages) {
      await ctx.db.delete(message._id);
    }

    // Delete the chat
    await ctx.db.delete(args.chatId);
  },
});
