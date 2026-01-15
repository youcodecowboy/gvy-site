import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Documents (both docs and folders)
  nodes: defineTable({
    // Type: "folder" or "doc"
    type: v.union(v.literal("folder"), v.literal("doc")),
    
    // Parent folder (null for root level)
    parentId: v.union(v.id("nodes"), v.null()),
    
    // Document/folder title
    title: v.string(),
    
    // Optional icon (emoji or icon name)
    icon: v.optional(v.union(v.string(), v.null())),
    
    // Sort order within parent
    order: v.number(),
    
    // Content (for docs only) - stores TipTap JSON
    content: v.optional(v.any()),
    
    // Tags for docs and folders - array of tag IDs
    tagIds: v.optional(v.array(v.id("tags"))),
    
    // Description/content for folders (TipTap JSON)
    description: v.optional(v.any()),
    
    // Last updated timestamp (for tracking edits)
    updatedAt: v.optional(v.number()),
    
    // Clerk user ID of who last updated
    updatedBy: v.optional(v.string()),
    
    // Name of user who last updated (for display without Clerk lookup)
    updatedByName: v.optional(v.string()),
    
    // Status for docs
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("in_review"),
      v.literal("final")
    )),
    
    // Ownership: either personal or organization
    // For personal: ownerId = Clerk userId
    // For org: orgId = Clerk orgId
    ownerId: v.optional(v.string()),
    orgId: v.optional(v.string()),
    
    // Soft delete
    isDeleted: v.optional(v.boolean()),
    deletedAt: v.optional(v.number()),
  })
    .index("by_parent", ["parentId"])
    .index("by_owner", ["ownerId"])
    .index("by_org", ["orgId"])
    .index("by_owner_parent", ["ownerId", "parentId"])
    .index("by_org_parent", ["orgId", "parentId"])
    .index("by_updated", ["updatedAt"]),

  // Mentions tracking for notifications
  mentions: defineTable({
    // Document where mention occurred
    docId: v.id("nodes"),
    
    // Clerk user ID of mentioned user
    mentionedUserId: v.string(),
    
    // Clerk user ID who created the mention
    mentionedByUserId: v.string(),
    
    // Name of user who mentioned (for display)
    mentionedByUserName: v.string(),
    
    // Title of document (for display)
    docTitle: v.string(),
    
    // Snippet of content around mention
    content: v.optional(v.string()),
    
    // When mention was created
    createdAt: v.number(),
    
    // When user marked as read (null if unread)
    readAt: v.optional(v.number()),
    
    // Read status
    isRead: v.optional(v.boolean()),
  })
    .index("by_mentioned_user", ["mentionedUserId"])
    .index("by_mentioned_user_unread", ["mentionedUserId", "isRead"])
    .index("by_doc", ["docId"]),

  // Comments tracking for dashboard display
  comments: defineTable({
    // Document where comment was made
    docId: v.id("nodes"),
    
    // Title of document (for display)
    docTitle: v.string(),
    
    // TipTap thread ID (for linking back)
    threadId: v.optional(v.string()),
    
    // Author info
    authorId: v.string(),
    authorName: v.string(),
    
    // Comment content
    content: v.string(),
    
    // When comment was created
    createdAt: v.number(),
    
    // Is this comment resolved?
    isResolved: v.optional(v.boolean()),
    
    // Organization ID (for filtering)
    orgId: v.optional(v.string()),
  })
    .index("by_created", ["createdAt"])
    .index("by_doc", ["docId"])
    .index("by_org", ["orgId"]),

  // Shared tags that can be reused across documents
  tags: defineTable({
    // Tag name (normalized to lowercase, unique)
    name: v.string(),
    
    // Display name (preserves original casing)
    displayName: v.string(),
    
    // When tag was created
    createdAt: v.number(),
    
    // Who created the tag
    createdBy: v.string(),
    createdByName: v.string(),
    
    // Usage count (for sorting/popularity)
    usageCount: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_usage", ["usageCount"]),
});
