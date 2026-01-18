import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { checkFolderAccess, canPerformAction } from "./permissions";

// Generate a random token
function generateToken(length: number = 24): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a new shareable link for a folder
 */
export const create = mutation({
  args: {
    folderId: v.id("nodes"),
    role: v.union(v.literal("viewer"), v.literal("editor")),
    expiresInDays: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    isOrgAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get the folder
    const folder = await ctx.db.get(args.folderId);
    if (!folder || folder.type !== "folder") {
      throw new Error("Folder not found");
    }

    if (!folder.orgId) {
      throw new Error("Cannot create share links for personal folders");
    }

    // Check permissions
    const access = await checkFolderAccess(
      ctx,
      args.folderId,
      identity.subject,
      folder.orgId,
      args.isOrgAdmin ?? false
    );

    if (!canPerformAction(access, "invite")) {
      throw new Error("Not authorized to create share links for this folder");
    }

    // Generate unique token
    const token = generateToken(24);

    // Calculate expiration (optional)
    const expiresAt = args.expiresInDays
      ? Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000
      : undefined;

    // Create share link
    const linkId = await ctx.db.insert("shareLinks", {
      folderId: args.folderId,
      folderTitle: folder.title,
      token,
      role: args.role,
      orgId: folder.orgId,
      createdBy: identity.subject,
      createdByName: identity.name || "Unknown",
      isActive: true,
      maxUses: args.maxUses,
      useCount: 0,
      createdAt: Date.now(),
      expiresAt,
    });

    return {
      linkId,
      token,
    };
  },
});

/**
 * Get share link details by token
 */
export const getByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("shareLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!link) {
      return null;
    }

    // Check if expired or maxed out (but don't modify in query)
    const isExpired = link.expiresAt ? link.expiresAt < Date.now() : false;
    const isMaxedOut = link.maxUses ? link.useCount >= link.maxUses : false;

    return {
      ...link,
      isExpired,
      isMaxedOut,
      isUsable: link.isActive && !isExpired && !isMaxedOut,
    };
  },
});

/**
 * Use a share link to gain access to a folder
 */
export const use = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get share link
    const link = await ctx.db
      .query("shareLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!link) {
      throw new Error("Share link not found");
    }

    // Validate link
    if (!link.isActive) {
      throw new Error("This share link has been disabled");
    }

    if (link.expiresAt && link.expiresAt < Date.now()) {
      throw new Error("This share link has expired");
    }

    if (link.maxUses && link.useCount >= link.maxUses) {
      throw new Error("This share link has reached its maximum uses");
    }

    // Check if folder still exists
    const folder = await ctx.db.get(link.folderId);
    if (!folder || folder.isDeleted) {
      throw new Error("The folder no longer exists");
    }

    // Check if user already has access
    const existingAccess = await ctx.db
      .query("folderAccess")
      .withIndex("by_folder_user", (q) =>
        q.eq("folderId", link.folderId).eq("userId", identity.subject)
      )
      .first();

    const roleHierarchy = { viewer: 1, editor: 2 };

    if (existingAccess) {
      // Only upgrade if link role is higher than existing
      if (roleHierarchy[link.role] > roleHierarchy[existingAccess.role as keyof typeof roleHierarchy]) {
        await ctx.db.patch(existingAccess._id, { role: link.role });
      }
    } else {
      // Grant access
      await ctx.db.insert("folderAccess", {
        folderId: link.folderId,
        userId: identity.subject,
        role: link.role,
        orgId: link.orgId,
        grantedBy: link.createdBy,
        grantedByName: link.createdByName,
        createdAt: Date.now(),
        userName: identity.name || undefined,
        userEmail: identity.email || undefined,
        userAvatar: (identity as any).pictureUrl || undefined,
      });
    }

    // Update link usage
    await ctx.db.patch(link._id, {
      useCount: link.useCount + 1,
      lastUsedAt: Date.now(),
    });

    // Enable restrictions on folder if not already
    if (!folder.isRestricted) {
      await ctx.db.patch(folder._id, { isRestricted: true });
    }

    return {
      folderId: link.folderId,
      folderTitle: link.folderTitle,
      role: link.role,
    };
  },
});

/**
 * Disable a share link
 */
export const disable = mutation({
  args: {
    linkId: v.id("shareLinks"),
    isOrgAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Share link not found");
    }

    // Check permissions
    const folder = await ctx.db.get(link.folderId);
    if (!folder) {
      throw new Error("Folder not found");
    }

    const access = await checkFolderAccess(
      ctx,
      link.folderId,
      identity.subject,
      folder.orgId,
      args.isOrgAdmin ?? false
    );

    if (!canPerformAction(access, "manage")) {
      throw new Error("Not authorized to disable this share link");
    }

    await ctx.db.patch(args.linkId, { isActive: false });
  },
});

/**
 * Re-enable a disabled share link
 */
export const enable = mutation({
  args: {
    linkId: v.id("shareLinks"),
    isOrgAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Share link not found");
    }

    // Check permissions
    const folder = await ctx.db.get(link.folderId);
    if (!folder) {
      throw new Error("Folder not found");
    }

    const access = await checkFolderAccess(
      ctx,
      link.folderId,
      identity.subject,
      folder.orgId,
      args.isOrgAdmin ?? false
    );

    if (!canPerformAction(access, "manage")) {
      throw new Error("Not authorized to enable this share link");
    }

    await ctx.db.patch(args.linkId, { isActive: true });
  },
});

/**
 * Delete a share link permanently
 */
export const remove = mutation({
  args: {
    linkId: v.id("shareLinks"),
    isOrgAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Share link not found");
    }

    // Check permissions
    const folder = await ctx.db.get(link.folderId);
    if (!folder) {
      throw new Error("Folder not found");
    }

    const access = await checkFolderAccess(
      ctx,
      link.folderId,
      identity.subject,
      folder.orgId,
      args.isOrgAdmin ?? false
    );

    if (!canPerformAction(access, "manage")) {
      throw new Error("Not authorized to delete this share link");
    }

    await ctx.db.delete(args.linkId);
  },
});

/**
 * List all share links for a folder
 */
export const listByFolder = query({
  args: {
    folderId: v.id("nodes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const links = await ctx.db
      .query("shareLinks")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();

    // Add computed fields
    const now = Date.now();
    return links.map((link) => ({
      ...link,
      isExpired: link.expiresAt ? link.expiresAt < now : false,
      isMaxedOut: link.maxUses ? link.useCount >= link.maxUses : false,
    }));
  },
});

/**
 * Update share link settings
 */
export const update = mutation({
  args: {
    linkId: v.id("shareLinks"),
    role: v.optional(v.union(v.literal("viewer"), v.literal("editor"))),
    maxUses: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    isOrgAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Share link not found");
    }

    // Check permissions
    const folder = await ctx.db.get(link.folderId);
    if (!folder) {
      throw new Error("Folder not found");
    }

    const access = await checkFolderAccess(
      ctx,
      link.folderId,
      identity.subject,
      folder.orgId,
      args.isOrgAdmin ?? false
    );

    if (!canPerformAction(access, "manage")) {
      throw new Error("Not authorized to update this share link");
    }

    const updates: Partial<typeof link> = {};
    if (args.role !== undefined) updates.role = args.role;
    if (args.maxUses !== undefined) updates.maxUses = args.maxUses;
    if (args.expiresAt !== undefined) updates.expiresAt = args.expiresAt;

    await ctx.db.patch(args.linkId, updates);
  },
});
