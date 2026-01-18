import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Get all nodes for the current user (personal) or organization
export const list = query({
  args: {
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // If orgId provided, get org nodes; otherwise get personal nodes
    if (args.orgId) {
      return await ctx.db
        .query("nodes")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect();
    } else {
      return await ctx.db
        .query("nodes")
        .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect();
    }
  },
});

// Get personal nodes only (owned by current user)
export const listPersonal = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("nodes")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();
  },
});

// Get organization nodes (shared with org)
export const listOrganization = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    return await ctx.db
      .query("nodes")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();
  },
});

// Get a single node by ID
export const get = query({
  args: { id: v.id("nodes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const node = await ctx.db.get(args.id);
    if (!node || node.isDeleted) {
      return null;
    }

    // Check access: either owner or org member
    if (node.ownerId !== identity.subject && !node.orgId) {
      return null;
    }

    return node;
  },
});

// Get children of a folder
export const getChildren = query({
  args: {
    parentId: v.union(v.id("nodes"), v.null()),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    if (args.orgId) {
      return await ctx.db
        .query("nodes")
        .withIndex("by_org_parent", (q) =>
          q.eq("orgId", args.orgId).eq("parentId", args.parentId)
        )
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect();
    } else {
      return await ctx.db
        .query("nodes")
        .withIndex("by_owner_parent", (q) =>
          q.eq("ownerId", identity.subject).eq("parentId", args.parentId)
        )
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect();
    }
  },
});

// Create a new node (doc or folder)
export const create = mutation({
  args: {
    type: v.union(v.literal("folder"), v.literal("doc")),
    parentId: v.union(v.id("nodes"), v.null()),
    title: v.string(),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the max order for siblings - optimized to query only the last sibling
    let lastSibling;
    if (args.orgId) {
      lastSibling = await ctx.db
        .query("nodes")
        .withIndex("by_org_parent_order", (q) =>
          q.eq("orgId", args.orgId).eq("parentId", args.parentId)
        )
        .order("desc")
        .first();
    } else {
      lastSibling = await ctx.db
        .query("nodes")
        .withIndex("by_owner_parent_order", (q) =>
          q.eq("ownerId", identity.subject).eq("parentId", args.parentId)
        )
        .order("desc")
        .first();
    }

    const maxOrder = lastSibling?.order ?? -1;

    const nodeId = await ctx.db.insert("nodes", {
      type: args.type,
      parentId: args.parentId,
      title: args.title,
      order: maxOrder + 1,
      // Don't set content - let it be undefined initially
      status: args.type === "doc" ? "draft" : undefined,
      ownerId: args.orgId ? undefined : identity.subject,
      orgId: args.orgId,
    });

    // Log activity
    const userName = identity.name || (identity as any).nickname || "Anonymous";
    await ctx.runMutation(internal.activity.recordActivity, {
      type: args.type === "doc" ? "doc_created" : "folder_created",
      nodeId,
      nodeTitle: args.title,
      nodeType: args.type,
      userId: identity.subject,
      userName,
      orgId: args.orgId,
    });

    return nodeId;
  },
});

// Create a new doc with initial content (for file uploads)
export const createWithContent = mutation({
  args: {
    parentId: v.union(v.id("nodes"), v.null()),
    title: v.string(),
    content: v.any(),
    orgId: v.optional(v.string()),
    sourceFile: v.optional(
      v.object({
        name: v.string(),
        type: v.string(),
        size: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the max order for siblings
    let lastSibling;
    if (args.orgId) {
      lastSibling = await ctx.db
        .query("nodes")
        .withIndex("by_org_parent_order", (q) =>
          q.eq("orgId", args.orgId).eq("parentId", args.parentId)
        )
        .order("desc")
        .first();
    } else {
      lastSibling = await ctx.db
        .query("nodes")
        .withIndex("by_owner_parent_order", (q) =>
          q.eq("ownerId", identity.subject).eq("parentId", args.parentId)
        )
        .order("desc")
        .first();
    }

    const maxOrder = lastSibling?.order ?? -1;
    const now = Date.now();
    const userName = identity.name || identity.nickname || "Unknown";

    const nodeId = await ctx.db.insert("nodes", {
      type: "doc",
      parentId: args.parentId,
      title: args.title,
      order: maxOrder + 1,
      content: args.content,
      status: "draft",
      ownerId: args.orgId ? undefined : identity.subject,
      orgId: args.orgId,
      updatedAt: now,
      updatedBy: identity.subject,
      updatedByName: userName,
      // Initialize versioning
      currentMajorVersion: 1,
      currentMinorVersion: 0,
      currentVersionString: "v1.0",
      lastVersionSnapshotAt: now,
    });

    // Log activity
    await ctx.runMutation(internal.activity.recordActivity, {
      type: "doc_created",
      nodeId,
      nodeTitle: args.title,
      nodeType: "doc",
      userId: identity.subject,
      userName,
      orgId: args.orgId,
      details: args.sourceFile ? `Uploaded from ${args.sourceFile.name}` : undefined,
    });

    return nodeId;
  },
});

// Update a node's title
export const updateTitle = mutation({
  args: {
    id: v.id("nodes"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const node = await ctx.db.get(args.id);
    if (!node) {
      throw new Error("Node not found");
    }

    // Check access
    if (node.ownerId !== identity.subject && !node.orgId) {
      throw new Error("Not authorized");
    }

    const userName = identity.name || identity.nickname || "Unknown";
    await ctx.db.patch(args.id, { 
      title: args.title,
      updatedAt: Date.now(),
      updatedBy: identity.subject,
      updatedByName: userName,
    });
  },
});

// Version batch window in milliseconds (30 seconds)
// Multiple saves within this window are batched into a single version
const VERSION_BATCH_WINDOW = 30 * 1000;

// Update a doc's content (TipTap JSON) with automatic versioning
export const updateContent = mutation({
  args: {
    id: v.id("nodes"),
    content: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const node = await ctx.db.get(args.id);
    if (!node || node.type !== "doc") {
      throw new Error("Doc not found");
    }

    // Check access
    if (node.ownerId !== identity.subject && !node.orgId) {
      throw new Error("Not authorized");
    }

    const userName = identity.name || identity.nickname || "Unknown";
    const now = Date.now();

    // Initialize versioning if not present
    let majorVersion = node.currentMajorVersion ?? 1;
    let minorVersion = node.currentMinorVersion ?? 0;
    const lastSnapshot = node.lastVersionSnapshotAt ?? 0;

    // Check if we should create a new version snapshot
    // Only create snapshot if:
    // 1. There's existing content to snapshot
    // 2. Enough time has passed since last snapshot (batch window)
    const shouldCreateSnapshot = node.content && (now - lastSnapshot) > VERSION_BATCH_WINDOW;

    if (shouldCreateSnapshot) {
      // Increment minor version for this batch of changes
      minorVersion += 1;
      const versionString = `v${majorVersion}.${minorVersion}`;

      // Create version snapshot of the PREVIOUS content (before this save)
      await ctx.db.insert("documentVersions", {
        docId: args.id,
        majorVersion,
        minorVersion,
        versionString,
        content: node.content, // Previous content
        title: node.title,
        createdAt: now,
        createdBy: identity.subject,
        createdByName: userName,
        isMajorVersion: false,
      });
    }

    // Build update payload
    const updatePayload: any = {
      content: args.content,
      updatedAt: now,
      updatedBy: identity.subject,
      updatedByName: userName,
    };

    // Add versioning fields
    if (shouldCreateSnapshot) {
      // Update version info after creating snapshot
      updatePayload.currentMajorVersion = majorVersion;
      updatePayload.currentMinorVersion = minorVersion;
      updatePayload.currentVersionString = `v${majorVersion}.${minorVersion}`;
      updatePayload.lastVersionSnapshotAt = now;
    } else if (!node.currentVersionString) {
      // Initialize versioning for new docs (first save)
      updatePayload.currentMajorVersion = 1;
      updatePayload.currentMinorVersion = 0;
      updatePayload.currentVersionString = "v1.0";
      updatePayload.lastVersionSnapshotAt = now;
    }

    await ctx.db.patch(args.id, updatePayload);
  },
});

// Update a doc's tags
export const updateTags = mutation({
  args: {
    id: v.id("nodes"),
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const node = await ctx.db.get(args.id);
    if (!node) {
      throw new Error("Node not found");
    }

    // Check access
    if (node.ownerId !== identity.subject && !node.orgId) {
      throw new Error("Not authorized");
    }

    // Get old tag IDs
    const oldTagIds = node.tagIds || [];

    // Find tags that were removed
    const removedTagIds = oldTagIds.filter((id) => !args.tagIds.includes(id));
    
    // Find tags that were added
    const addedTagIds = args.tagIds.filter((id) => !oldTagIds.includes(id));

    // Update usage counts
    if (removedTagIds.length > 0) {
      // Decrement usage for removed tags
      for (const tagId of removedTagIds) {
        const tag = await ctx.db.get(tagId);
        if (tag) {
          await ctx.db.patch(tagId, {
            usageCount: Math.max(0, tag.usageCount - 1),
          });
        }
      }
    }

    if (addedTagIds.length > 0) {
      // Increment usage for added tags
      for (const tagId of addedTagIds) {
        const tag = await ctx.db.get(tagId);
        if (tag) {
          await ctx.db.patch(tagId, {
            usageCount: tag.usageCount + 1,
          });
        }
      }
    }

    const userName = identity.name || identity.nickname || "Unknown";
    await ctx.db.patch(args.id, { 
      tagIds: args.tagIds,
      updatedAt: Date.now(),
      updatedBy: identity.subject,
      updatedByName: userName,
    });
  },
});

// Update a doc's status
export const updateStatus = mutation({
  args: {
    id: v.id("nodes"),
    status: v.union(
      v.literal("draft"),
      v.literal("in_review"),
      v.literal("final")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const node = await ctx.db.get(args.id);
    if (!node || node.type !== "doc") {
      throw new Error("Doc not found");
    }

    // Check access
    if (node.ownerId !== identity.subject && !node.orgId) {
      throw new Error("Not authorized");
    }

    const userName = identity.name || identity.nickname || "Unknown";
    await ctx.db.patch(args.id, { 
      status: args.status,
      updatedAt: Date.now(),
      updatedBy: identity.subject,
      updatedByName: userName,
    });
  },
});

// Update a doc's icon
export const updateIcon = mutation({
  args: {
    id: v.id("nodes"),
    icon: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const node = await ctx.db.get(args.id);
    if (!node) {
      throw new Error("Node not found");
    }

    // Check access
    if (node.ownerId !== identity.subject && !node.orgId) {
      throw new Error("Not authorized");
    }

    const userName = identity.name || identity.nickname || "Unknown";
    await ctx.db.patch(args.id, { 
      icon: args.icon,
      updatedAt: Date.now(),
      updatedBy: identity.subject,
      updatedByName: userName,
    });
  },
});

// Soft delete a node
export const remove = mutation({
  args: { id: v.id("nodes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const node = await ctx.db.get(args.id);
    if (!node) {
      throw new Error("Node not found");
    }

    // Check access
    if (node.ownerId !== identity.subject && !node.orgId) {
      throw new Error("Not authorized");
    }

    // Soft delete
    await ctx.db.patch(args.id, {
      isDeleted: true,
      deletedAt: Date.now(),
    });

    // Also soft delete children recursively
    const children = await ctx.db
      .query("nodes")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))
      .collect();

    for (const child of children) {
      await ctx.db.patch(child._id, {
        isDeleted: true,
        deletedAt: Date.now(),
      });
    }

    // Log activity
    const userName = identity.name || (identity as any).nickname || "Anonymous";
    await ctx.runMutation(internal.activity.recordActivity, {
      type: node.type === "doc" ? "doc_deleted" : "folder_deleted",
      nodeId: args.id,
      nodeTitle: node.title,
      nodeType: node.type,
      userId: identity.subject,
      userName,
      orgId: node.orgId,
    });
  },
});

// Toggle sharing between personal and organization
export const toggleSharing = mutation({
  args: {
    id: v.id("nodes"),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const node = await ctx.db.get(args.id);
    if (!node) {
      throw new Error("Node not found");
    }

    // Check access - only owner can change sharing
    if (node.ownerId !== identity.subject && !node.orgId) {
      throw new Error("Not authorized");
    }

    // Toggle: if currently personal, make org; if org, make personal
    if (node.orgId) {
      // Currently shared, make personal
      await ctx.db.patch(args.id, {
        ownerId: identity.subject,
        orgId: undefined,
      });
    } else {
      // Currently personal, share with org
      if (!args.orgId) {
        throw new Error("orgId required to share");
      }
      await ctx.db.patch(args.id, {
        ownerId: undefined,
        orgId: args.orgId,
      });
    }
  },
});

// Move a node to a new parent
export const move = mutation({
  args: {
    id: v.id("nodes"),
    newParentId: v.union(v.id("nodes"), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const node = await ctx.db.get(args.id);
    if (!node) {
      throw new Error("Node not found");
    }

    // Check access
    if (node.ownerId !== identity.subject && !node.orgId) {
      throw new Error("Not authorized");
    }

    // Get max order in new parent
    let siblings;
    if (node.orgId) {
      siblings = await ctx.db
        .query("nodes")
        .withIndex("by_org_parent", (q) =>
          q.eq("orgId", node.orgId!).eq("parentId", args.newParentId)
        )
        .collect();
    } else {
      siblings = await ctx.db
        .query("nodes")
        .withIndex("by_owner_parent", (q) =>
          q.eq("ownerId", identity.subject).eq("parentId", args.newParentId)
        )
        .collect();
    }

    const maxOrder = siblings.reduce((max, n) => Math.max(max, n.order), -1);

    await ctx.db.patch(args.id, {
      parentId: args.newParentId,
      order: maxOrder + 1,
    });
  },
});

// Reorder a node (move to new parent and/or new position)
export const reorder = mutation({
  args: {
    id: v.id("nodes"),
    newParentId: v.union(v.id("nodes"), v.null()),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const node = await ctx.db.get(args.id);
    if (!node) {
      throw new Error("Node not found");
    }

    // Check access
    if (node.ownerId !== identity.subject && !node.orgId) {
      throw new Error("Not authorized");
    }

    const oldParentId = node.parentId;
    const oldOrder = node.order;
    const isSameParent = oldParentId === args.newParentId;

    // Get siblings in target parent
    let siblings;
    if (node.orgId) {
      siblings = await ctx.db
        .query("nodes")
        .withIndex("by_org_parent", (q) =>
          q.eq("orgId", node.orgId!).eq("parentId", args.newParentId)
        )
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect();
    } else {
      siblings = await ctx.db
        .query("nodes")
        .withIndex("by_owner_parent", (q) =>
          q.eq("ownerId", identity.subject).eq("parentId", args.newParentId)
        )
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect();
    }

    // Filter out the moving node itself
    siblings = siblings.filter((s) => s._id !== args.id);

    // Sort siblings by order
    siblings.sort((a, b) => a.order - b.order);

    // Update orders for affected siblings
    let orderCounter = 0;
    for (let i = 0; i < siblings.length; i++) {
      // Insert the moved node at the right position
      if (orderCounter === args.newOrder) {
        orderCounter++;
      }
      
      if (siblings[i].order !== orderCounter) {
        await ctx.db.patch(siblings[i]._id, { order: orderCounter });
      }
      orderCounter++;
    }

    // Update the moved node
    await ctx.db.patch(args.id, {
      parentId: args.newParentId,
      order: args.newOrder,
    });
  },
});

// Update a folder's description
export const updateDescription = mutation({
  args: {
    id: v.id("nodes"),
    description: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const node = await ctx.db.get(args.id);
    if (!node || node.type !== "folder") {
      throw new Error("Folder not found");
    }

    // Check access
    if (node.ownerId !== identity.subject && !node.orgId) {
      throw new Error("Not authorized");
    }

    const userName = identity.name || identity.nickname || "Unknown";
    await ctx.db.patch(args.id, { 
      description: args.description,
      updatedAt: Date.now(),
      updatedBy: identity.subject,
      updatedByName: userName,
    });
  },
});

// Helper function to extract text from TipTap JSON content
function extractTextFromContent(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;

  let text = '';
  if (content.text) text += content.text;

  if (Array.isArray(content.content)) {
    for (const node of content.content) {
      text += extractTextFromContent(node) + ' ';
    }
  }

  return text;
}

// Helper function to count words accurately
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

// Get folder statistics (recursive count of all descendants)
export const getFolderStats = query({
  args: { id: v.id("nodes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const folder = await ctx.db.get(args.id);
    if (!folder || folder.type !== "folder" || folder.isDeleted) {
      return null;
    }

    // Recursive function to count all descendants
    const countDescendants = async (parentId: typeof args.id): Promise<{ docs: number; folders: number; totalWords: number }> => {
      const children = await ctx.db
        .query("nodes")
        .withIndex("by_parent", (q) => q.eq("parentId", parentId))
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect();

      let docs = 0;
      let folders = 0;
      let totalWords = 0;

      for (const child of children) {
        if (child.type === "doc") {
          docs++;
          // Count actual words from TipTap content
          if (child.content) {
            const text = extractTextFromContent(child.content);
            totalWords += countWords(text);
          }
        } else {
          folders++;
          const nested = await countDescendants(child._id);
          docs += nested.docs;
          folders += nested.folders;
          totalWords += nested.totalWords;
        }
      }

      return { docs, folders, totalWords };
    };

    const stats = await countDescendants(args.id);
    
    // Get direct children for last updated
    const directChildren = await ctx.db
      .query("nodes")
      .withIndex("by_parent", (q) => q.eq("parentId", args.id))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    const lastUpdated = directChildren.reduce((latest, child) => {
      const childUpdated = child.updatedAt || child._creationTime;
      return childUpdated > latest ? childUpdated : latest;
    }, folder.updatedAt || folder._creationTime);

    return {
      totalDocs: stats.docs,
      totalFolders: stats.folders,
      totalItems: stats.docs + stats.folders,
      estimatedWords: Math.round(stats.totalWords),
      lastUpdated,
      directChildren: directChildren.length,
    };
  },
});

// Get all contributors to a folder (users who created or edited documents)
export const getFolderContributors = query({
  args: {
    id: v.id("nodes"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const folder = await ctx.db.get(args.id);
    if (!folder || folder.type !== "folder" || folder.isDeleted) {
      return [];
    }

    const limit = args.limit ?? 8;

    // Recursively get all descendant documents
    const getDescendantDocs = async (parentId: typeof args.id): Promise<any[]> => {
      const children = await ctx.db
        .query("nodes")
        .withIndex("by_parent", (q) => q.eq("parentId", parentId))
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect();

      let docs: any[] = [];
      for (const child of children) {
        if (child.type === "doc") {
          docs.push(child);
        } else if (child.type === "folder") {
          docs = [...docs, ...(await getDescendantDocs(child._id))];
        }
      }
      return docs;
    };

    const allDocs = await getDescendantDocs(args.id);

    // Aggregate contributors
    const contributorMap = new Map<string, {
      userId: string;
      userName: string;
      docCount: number;
      lastActivity: number;
      createdDocs: number;
      editedDocs: number;
    }>();

    for (const doc of allDocs) {
      // Track last editor
      if (doc.updatedBy && doc.updatedByName && doc.updatedAt) {
        const existing = contributorMap.get(doc.updatedBy);
        if (existing) {
          existing.editedDocs += 1;
          existing.docCount += 1;
          existing.lastActivity = Math.max(existing.lastActivity, doc.updatedAt);
        } else {
          contributorMap.set(doc.updatedBy, {
            userId: doc.updatedBy,
            userName: doc.updatedByName,
            docCount: 1,
            lastActivity: doc.updatedAt,
            createdDocs: 0,
            editedDocs: 1,
          });
        }
      }
    }

    return Array.from(contributorMap.values())
      .sort((a, b) => b.lastActivity - a.lastActivity)
      .slice(0, limit);
  },
});

// Get all descendants of a folder (for table of contents)
export const getDescendants = query({
  args: { 
    id: v.id("nodes"),
    maxDepth: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const maxDepth = args.maxDepth ?? 3;

    const getChildrenRecursive = async (
      parentId: typeof args.id, 
      depth: number
    ): Promise<any[]> => {
      if (depth > maxDepth) return [];

      const children = await ctx.db
        .query("nodes")
        .withIndex("by_parent", (q) => q.eq("parentId", parentId))
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect();

      const result = [];
      for (const child of children.sort((a, b) => a.order - b.order)) {
        const item: any = {
          _id: child._id,
          type: child.type,
          title: child.title,
          icon: child.icon,
          depth,
          createdAt: child._creationTime,
          updatedAt: child.updatedAt,
          updatedBy: child.updatedBy,
          updatedByName: child.updatedByName,
        };

        if (child.type === "folder") {
          item.children = await getChildrenRecursive(child._id, depth + 1);
        }

        result.push(item);
      }

      return result;
    };

    return await getChildrenRecursive(args.id, 0);
  },
});

// Search documents by title (for document linking)
export const search = query({
  args: {
    query: v.string(),
    orgId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const searchLimit = args.limit ?? 10;
    const searchQuery = args.query.toLowerCase().trim();

    // Get all accessible docs - include both personal and org docs when in org context
    let allDocs: any[] = [];
    
    // Always get personal docs
    const personalDocs = await ctx.db
      .query("nodes")
      .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
      .filter((q) => 
        q.and(
          q.eq(q.field("type"), "doc"),
          q.neq(q.field("isDeleted"), true)
        )
      )
      .collect();
    allDocs = [...personalDocs];
    
    // Also get org docs if orgId is provided
    if (args.orgId) {
      const orgDocs = await ctx.db
        .query("nodes")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .filter((q) => 
          q.and(
            q.eq(q.field("type"), "doc"),
            q.neq(q.field("isDeleted"), true)
          )
        )
        .collect();
      allDocs = [...allDocs, ...orgDocs];
    }

    // If no search query, return recent docs
    if (!searchQuery) {
      return allDocs
        .sort((a, b) => (b.updatedAt || b._creationTime) - (a.updatedAt || a._creationTime))
        .slice(0, searchLimit)
        .map((doc) => ({
          _id: doc._id,
          title: doc.title,
          icon: doc.icon,
          updatedAt: doc.updatedAt || doc._creationTime,
        }));
    }

    // Filter by title match
    const matchingDocs = allDocs
      .filter((doc) => doc.title.toLowerCase().includes(searchQuery))
      .sort((a, b) => {
        // Prioritize exact matches at the start
        const aStartsWith = a.title.toLowerCase().startsWith(searchQuery);
        const bStartsWith = b.title.toLowerCase().startsWith(searchQuery);
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        // Then sort by recency
        return (b.updatedAt || b._creationTime) - (a.updatedAt || a._creationTime);
      })
      .slice(0, searchLimit);

    return matchingDocs.map((doc) => ({
      _id: doc._id,
      title: doc.title,
      icon: doc.icon,
      updatedAt: doc.updatedAt || doc._creationTime,
    }));
  },
});
