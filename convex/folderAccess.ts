import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { checkFolderAccess, canPerformAction } from "./permissions";

/**
 * Grant access to a folder for a specific user
 */
export const grant = mutation({
  args: {
    folderId: v.id("nodes"),
    userId: v.string(),
    role: v.union(v.literal("viewer"), v.literal("editor"), v.literal("admin")),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    userAvatar: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
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
      throw new Error("Cannot set permissions on personal folders");
    }

    // Check if current user has permission to grant access
    const access = await checkFolderAccess(
      ctx,
      args.folderId,
      identity.subject,
      folder.orgId,
      args.isOrgAdmin ?? false
    );

    if (!canPerformAction(access, "invite")) {
      throw new Error("Not authorized to grant access to this folder");
    }

    // Check if user already has access
    const existingAccess = await ctx.db
      .query("folderAccess")
      .withIndex("by_folder_user", (q) =>
        q.eq("folderId", args.folderId).eq("userId", args.userId)
      )
      .first();

    if (existingAccess) {
      // Update existing access
      await ctx.db.patch(existingAccess._id, {
        role: args.role,
        expiresAt: args.expiresAt,
        userName: args.userName ?? existingAccess.userName,
        userEmail: args.userEmail ?? existingAccess.userEmail,
        userAvatar: args.userAvatar ?? existingAccess.userAvatar,
      });
      return existingAccess._id;
    }

    // Create new access grant
    return await ctx.db.insert("folderAccess", {
      folderId: args.folderId,
      userId: args.userId,
      role: args.role,
      orgId: folder.orgId,
      grantedBy: identity.subject,
      grantedByName: identity.name || "Unknown",
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
      userName: args.userName,
      userEmail: args.userEmail,
      userAvatar: args.userAvatar,
    });
  },
});

/**
 * Update a user's role for a folder
 */
export const updateRole = mutation({
  args: {
    folderId: v.id("nodes"),
    userId: v.string(),
    role: v.union(v.literal("viewer"), v.literal("editor"), v.literal("admin")),
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

    // Check permissions
    const access = await checkFolderAccess(
      ctx,
      args.folderId,
      identity.subject,
      folder.orgId,
      args.isOrgAdmin ?? false
    );

    if (!canPerformAction(access, "manage")) {
      throw new Error("Not authorized to manage access for this folder");
    }

    // Find existing access
    const existingAccess = await ctx.db
      .query("folderAccess")
      .withIndex("by_folder_user", (q) =>
        q.eq("folderId", args.folderId).eq("userId", args.userId)
      )
      .first();

    if (!existingAccess) {
      throw new Error("User does not have access to this folder");
    }

    // Update role
    await ctx.db.patch(existingAccess._id, { role: args.role });
  },
});

/**
 * Revoke a user's access to a folder
 */
export const revoke = mutation({
  args: {
    folderId: v.id("nodes"),
    userId: v.string(),
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

    // Check permissions
    const access = await checkFolderAccess(
      ctx,
      args.folderId,
      identity.subject,
      folder.orgId,
      args.isOrgAdmin ?? false
    );

    if (!canPerformAction(access, "manage")) {
      throw new Error("Not authorized to revoke access for this folder");
    }

    // Find and delete access
    const existingAccess = await ctx.db
      .query("folderAccess")
      .withIndex("by_folder_user", (q) =>
        q.eq("folderId", args.folderId).eq("userId", args.userId)
      )
      .first();

    if (existingAccess) {
      await ctx.db.delete(existingAccess._id);
    }
  },
});

/**
 * List all users with access to a folder
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

    return ctx.db
      .query("folderAccess")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .collect();
  },
});

/**
 * Get a specific user's access to a folder
 */
export const getUserAccess = query({
  args: {
    folderId: v.id("nodes"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return ctx.db
      .query("folderAccess")
      .withIndex("by_folder_user", (q) =>
        q.eq("folderId", args.folderId).eq("userId", args.userId)
      )
      .first();
  },
});

/**
 * Get all folders a user has explicit access to in an org
 */
export const listUserAccessInOrg = query({
  args: {
    orgId: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = args.userId ?? identity.subject;

    return ctx.db
      .query("folderAccess")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", userId)
      )
      .collect();
  },
});
