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
    
    // Tags for docs and folders - array of tag IDs (new system)
    tagIds: v.optional(v.array(v.id("tags"))),
    
    // Legacy tags field (string array) - kept for backward compatibility
    tags: v.optional(v.array(v.string())),
    
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

    // Document versioning
    currentMajorVersion: v.optional(v.number()),   // Default: 1
    currentMinorVersion: v.optional(v.number()),   // Default: 0
    currentVersionString: v.optional(v.string()),  // e.g., "v1.0"
    lastVersionSnapshotAt: v.optional(v.number()), // For batching saves into versions
  })
    .index("by_parent", ["parentId"])
    .index("by_owner", ["ownerId"])
    .index("by_org", ["orgId"])
    .index("by_owner_parent", ["ownerId", "parentId"])
    .index("by_org_parent", ["orgId", "parentId"])
    .index("by_owner_parent_order", ["ownerId", "parentId", "order"])
    .index("by_org_parent_order", ["orgId", "parentId", "order"])
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

  // Document view tracking
  views: defineTable({
    // Document that was viewed
    docId: v.id("nodes"),

    // Clerk user ID who viewed
    viewedByUserId: v.string(),

    // Name of user who viewed (for display without Clerk lookup)
    viewedByUserName: v.string(),

    // When the view occurred
    viewedAt: v.number(),
  })
    .index("by_doc", ["docId"])
    .index("by_doc_user", ["docId", "viewedByUserId"]),

  // Private flags for documents and folders
  flags: defineTable({
    // Node (document or folder) that was flagged
    nodeId: v.id("nodes"),

    // Node title (for display in notifications)
    nodeTitle: v.string(),

    // Node type (doc or folder)
    nodeType: v.union(v.literal("doc"), v.literal("folder")),

    // Type: inline (text selection), document (entire doc), or folder
    type: v.union(v.literal("inline"), v.literal("document"), v.literal("folder")),

    // For inline flags: selected text info
    selectionData: v.optional(
      v.object({
        from: v.number(),
        to: v.number(),
        selectedText: v.string(),
      })
    ),

    // Sender info
    senderId: v.string(),
    senderName: v.string(),

    // Recipient info (single recipient - flags are private)
    recipientId: v.string(),
    recipientName: v.string(),

    // Flag message content
    message: v.string(),

    // Timestamps
    createdAt: v.number(),

    // Read status
    isRead: v.optional(v.boolean()),
    readAt: v.optional(v.number()),
  })
    .index("by_recipient", ["recipientId"])
    .index("by_recipient_unread", ["recipientId", "isRead"])
    .index("by_sender", ["senderId"])
    .index("by_node", ["nodeId"]),

  // Discussion threads (main topics for document discussions)
  threads: defineTable({
    // Document this thread belongs to
    docId: v.id("nodes"),

    // Thread title/topic
    title: v.string(),

    // Thread author
    authorId: v.string(),
    authorName: v.string(),

    // Optional text anchor (threads can be doc-level or anchored to selection)
    anchorData: v.optional(
      v.object({
        from: v.number(),
        to: v.number(),
        selectedText: v.string(),
      })
    ),

    // Thread status
    status: v.union(v.literal("open"), v.literal("resolved")),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.string()),

    // Organization scope
    orgId: v.optional(v.string()),

    // Denormalized counts for performance
    replyCount: v.number(),
    lastActivityAt: v.number(),
  })
    .index("by_doc", ["docId"])
    .index("by_doc_status", ["docId", "status"])
    .index("by_org", ["orgId"])
    .index("by_last_activity", ["lastActivityAt"]),

  // Thread replies (supports nested structure)
  threadReplies: defineTable({
    // Parent thread
    threadId: v.id("threads"),

    // For nested replies: parent reply ID (null = top-level)
    parentReplyId: v.optional(v.id("threadReplies")),

    // Reply author
    authorId: v.string(),
    authorName: v.string(),

    // Reply content
    content: v.string(),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),

    // Soft delete
    isDeleted: v.optional(v.boolean()),

    // Nesting depth (0 = top-level, 1+ = nested, cap at 3-4 for UI)
    depth: v.number(),
  })
    .index("by_thread", ["threadId"])
    .index("by_parent", ["parentReplyId"]),

  // Thread notifications (for participant alerts)
  threadNotifications: defineTable({
    // Thread this notification is about
    threadId: v.id("threads"),

    // Document (for navigation)
    docId: v.id("nodes"),
    docTitle: v.string(),

    // Recipient of notification
    recipientId: v.string(),

    // Who triggered this notification
    triggeredByUserId: v.string(),
    triggeredByUserName: v.string(),

    // Notification type
    type: v.union(v.literal("new_reply"), v.literal("thread_resolved")),

    // Optional reference to specific reply
    replyId: v.optional(v.id("threadReplies")),

    // Thread title for display
    threadTitle: v.string(),

    // Timestamps
    createdAt: v.number(),

    // Read status
    isRead: v.optional(v.boolean()),
    readAt: v.optional(v.number()),
  })
    .index("by_recipient", ["recipientId"])
    .index("by_recipient_unread", ["recipientId", "isRead"])
    .index("by_thread", ["threadId"]),

  // Document versions - stores content snapshots for version history
  documentVersions: defineTable({
    // Document this version belongs to
    docId: v.id("nodes"),

    // Version numbers (semantic versioning for docs)
    majorVersion: v.number(),
    minorVersion: v.number(),

    // Full version string for display (e.g., "v1.2")
    versionString: v.string(),

    // Content snapshot (TipTap JSON at this version)
    content: v.any(),

    // Document title at time of version creation
    title: v.string(),

    // Metadata
    createdAt: v.number(),
    createdBy: v.string(),
    createdByName: v.string(),

    // Change summary (optional, typically for major versions)
    changeSummary: v.optional(v.string()),

    // Flag to indicate if this is a major version (user-created milestone)
    isMajorVersion: v.boolean(),
  })
    .index("by_doc", ["docId"])
    .index("by_doc_version", ["docId", "majorVersion", "minorVersion"])
    .index("by_created", ["createdAt"]),

  // User presence tracking for online indicator
  presence: defineTable({
    // Clerk user ID
    userId: v.string(),

    // User display info (denormalized for performance)
    userName: v.string(),
    userAvatar: v.optional(v.string()),
    userColor: v.string(),

    // Current location - what document/folder/page they're viewing
    currentNodeId: v.optional(v.id("nodes")),
    currentNodeTitle: v.optional(v.string()),
    currentNodeType: v.optional(v.union(v.literal("doc"), v.literal("folder"))),
    currentPath: v.string(),

    // Legacy fields (kept for backward compatibility during migration)
    currentDocId: v.optional(v.id("nodes")),
    currentDocTitle: v.optional(v.string()),

    // Heartbeat timestamp - used to determine if user is still online
    lastSeenAt: v.number(),

    // Session ID to handle multiple tabs
    sessionId: v.string(),

    // Organization context (null for personal workspace)
    orgId: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_session", ["userId", "sessionId"])
    .index("by_last_seen", ["lastSeenAt"])
    .index("by_org", ["orgId"]),

  // Organization activity log for notifications
  activity: defineTable({
    // Type of activity
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

    // What changed
    nodeId: v.optional(v.id("nodes")),
    nodeTitle: v.string(),
    nodeType: v.optional(v.union(v.literal("doc"), v.literal("folder"))),

    // Who made the change
    userId: v.string(),
    userName: v.string(),

    // Organization scope
    orgId: v.optional(v.string()),

    // When
    createdAt: v.number(),

    // Optional extra context
    details: v.optional(v.string()),
  })
    .index("by_org", ["orgId"])
    .index("by_org_created", ["orgId", "createdAt"])
    .index("by_created", ["createdAt"]),

  // Export history - tracks all document exports (PDF, DOCX)
  exportHistory: defineTable({
    // Document that was exported
    docId: v.id("nodes"),

    // Version that was exported (optional - links to specific version)
    versionId: v.optional(v.id("documentVersions")),

    // Version string at time of export (e.g., "v1.2")
    versionString: v.string(),

    // Export format
    format: v.union(v.literal("pdf"), v.literal("docx")),

    // Document title at time of export
    docTitle: v.string(),

    // Who exported
    exportedBy: v.string(),
    exportedByName: v.string(),

    // When exported
    exportedAt: v.number(),

    // File size in bytes (optional, for analytics)
    fileSize: v.optional(v.number()),
  })
    .index("by_doc", ["docId"])
    .index("by_user", ["exportedBy"])
    .index("by_exported", ["exportedAt"]),
});
