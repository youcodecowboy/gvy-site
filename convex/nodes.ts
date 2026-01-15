import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

    // Get the max order for siblings
    let siblings;
    if (args.orgId) {
      siblings = await ctx.db
        .query("nodes")
        .withIndex("by_org_parent", (q) =>
          q.eq("orgId", args.orgId).eq("parentId", args.parentId)
        )
        .collect();
    } else {
      siblings = await ctx.db
        .query("nodes")
        .withIndex("by_owner_parent", (q) =>
          q.eq("ownerId", identity.subject).eq("parentId", args.parentId)
        )
        .collect();
    }

    const maxOrder = siblings.reduce((max, node) => Math.max(max, node.order), -1);

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

// Update a doc's content (TipTap JSON)
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
    await ctx.db.patch(args.id, { 
      content: args.content,
      updatedAt: Date.now(),
      updatedBy: identity.subject,
      updatedByName: userName,
    });
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
          // Estimate word count from content if available
          if (child.content) {
            const text = JSON.stringify(child.content);
            totalWords += text.split(/\s+/).length / 10; // Rough estimate
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
