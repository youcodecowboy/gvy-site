import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper function to extract mentions from TipTap JSON content
function extractMentionsFromContent(content: any): { id: string; label: string }[] {
  const mentions: { id: string; label: string }[] = [];
  
  function traverse(node: any) {
    if (!node) return;
    
    // Check if this is a mention node
    if (node.type === "mention" && node.attrs) {
      const id = node.attrs.id;
      const label = node.attrs.label;
      if (id && label) {
        mentions.push({ id: String(id), label: String(label) });
      }
    }
    
    // Traverse children
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        traverse(child);
      }
    }
    
    // Traverse array nodes (like for lists)
    if (Array.isArray(node)) {
      for (const child of node) {
        traverse(child);
      }
    }
  }
  
  traverse(content);
  return mentions;
}

// Create mentions for a document (called when document content is saved)
export const createMentions = mutation({
  args: {
    docId: v.id("nodes"),
    docTitle: v.string(),
    content: v.any(),
    mentionedByUserName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const mentionedByUserId = identity.subject;
    
    // Extract mentions from content
    const mentions = extractMentionsFromContent(args.content);
    
    console.log("Extracted mentions:", mentions);
    console.log("Current user ID:", mentionedByUserId);
    
    // Get existing mentions for this document to avoid duplicates
    const existingMentions = await ctx.db
      .query("mentions")
      .withIndex("by_doc", (q) => q.eq("docId", args.docId))
      .collect();
    
    // Create a set of existing mention keys (docId + mentionedUserId + mentionedByUserId)
    const existingKeys = new Set(
      existingMentions.map((m) => `${m.mentionedUserId}:${m.mentionedByUserId}`)
    );
    
    // Create new mentions (avoiding duplicates and self-mentions)
    const now = Date.now();
    for (const mention of mentions) {
      const key = `${mention.id}:${mentionedByUserId}`;
      
      // Skip if already exists
      if (existingKeys.has(key)) {
        console.log("Skipping duplicate mention:", mention.label);
        continue;
      }
      
      // Skip self-mentions
      if (mention.id === mentionedByUserId) {
        console.log("Skipping self-mention:", mention.label);
        continue;
      }
      
      await ctx.db.insert("mentions", {
        docId: args.docId,
        mentionedUserId: mention.id,
        mentionedByUserId,
        mentionedByUserName: args.mentionedByUserName,
        docTitle: args.docTitle,
        content: `@${mention.label}`, // Simple snippet
        createdAt: now,
        isRead: false,
      });
      
      // Add to existing keys to prevent duplicate creation in same batch
      existingKeys.add(key);
    }
  },
});

// Get mentions for current user
export const getMentions = query({
  args: {
    onlyUnread: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }
    
    const limit = args.limit ?? 50;
    
    if (args.onlyUnread) {
      return await ctx.db
        .query("mentions")
        .withIndex("by_mentioned_user_unread", (q) =>
          q.eq("mentionedUserId", identity.subject).eq("isRead", false)
        )
        .order("desc")
        .take(limit);
    }
    
    return await ctx.db
      .query("mentions")
      .withIndex("by_mentioned_user", (q) =>
        q.eq("mentionedUserId", identity.subject)
      )
      .order("desc")
      .take(limit);
  },
});

// Get unread mention count for current user
export const getUnreadMentionCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }
    
    const unreadMentions = await ctx.db
      .query("mentions")
      .withIndex("by_mentioned_user_unread", (q) =>
        q.eq("mentionedUserId", identity.subject).eq("isRead", false)
      )
      .collect();
    
    return unreadMentions.length;
  },
});

// Mark a single mention as read
export const markMentionRead = mutation({
  args: {
    mentionId: v.id("mentions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const mention = await ctx.db.get(args.mentionId);
    if (!mention) {
      throw new Error("Mention not found");
    }
    
    // Verify the mention belongs to the current user
    if (mention.mentionedUserId !== identity.subject) {
      throw new Error("Not authorized");
    }
    
    await ctx.db.patch(args.mentionId, {
      isRead: true,
      readAt: Date.now(),
    });
  },
});

// Mark all mentions as read for current user
export const markAllMentionsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const unreadMentions = await ctx.db
      .query("mentions")
      .withIndex("by_mentioned_user_unread", (q) =>
        q.eq("mentionedUserId", identity.subject).eq("isRead", false)
      )
      .collect();
    
    const now = Date.now();
    for (const mention of unreadMentions) {
      await ctx.db.patch(mention._id, {
        isRead: true,
        readAt: now,
      });
    }
    
    return unreadMentions.length;
  },
});

// Delete a mention
export const deleteMention = mutation({
  args: {
    mentionId: v.id("mentions"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    const mention = await ctx.db.get(args.mentionId);
    if (!mention) {
      throw new Error("Mention not found");
    }
    
    // Verify the mention belongs to the current user
    if (mention.mentionedUserId !== identity.subject) {
      throw new Error("Not authorized");
    }
    
    await ctx.db.delete(args.mentionId);
  },
});

// Get unread mentions for all documents in a folder
export const getFolderUnreadMentions = query({
  args: {
    folderId: v.id("nodes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { count: 0, mentions: [] };
    }

    const userId = identity.subject;

    // Get all descendant doc IDs recursively
    const getDescendantDocIds = async (parentId: Id<"nodes">): Promise<Id<"nodes">[]> => {
      const children = await ctx.db
        .query("nodes")
        .withIndex("by_parent", (q) => q.eq("parentId", parentId))
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect();

      let docIds: Id<"nodes">[] = [];
      for (const child of children) {
        if (child.type === "doc") {
          docIds.push(child._id);
        } else if (child.type === "folder") {
          docIds = [...docIds, ...(await getDescendantDocIds(child._id))];
        }
      }
      return docIds;
    };

    const docIds = await getDescendantDocIds(args.folderId);

    // Get all unread mentions for current user
    const allUnreadMentions = await ctx.db
      .query("mentions")
      .withIndex("by_mentioned_user_unread", (q) =>
        q.eq("mentionedUserId", userId).eq("isRead", false)
      )
      .collect();

    // Filter to mentions in this folder's documents
    const folderMentions = allUnreadMentions.filter(mention =>
      docIds.includes(mention.docId)
    );

    return {
      count: folderMentions.length,
      mentions: folderMentions.slice(0, 5), // First 5 for preview
    };
  },
});
