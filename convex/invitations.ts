import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { checkFolderAccess, canPerformAction } from "./permissions";

// Generate a random token (simple implementation)
function generateToken(length: number = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Create a new folder invitation
 */
export const create = mutation({
  args: {
    folderId: v.id("nodes"),
    email: v.string(),
    role: v.union(v.literal("viewer"), v.literal("editor"), v.literal("admin")),
    message: v.optional(v.string()),
    expiresInDays: v.optional(v.number()),
    orgName: v.optional(v.string()),
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
      throw new Error("Cannot create invitations for personal folders");
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
      throw new Error("Not authorized to invite users to this folder");
    }

    // Normalize email
    const email = args.email.toLowerCase().trim();

    // Check for existing pending invitation
    const existingInvite = await ctx.db
      .query("folderInvitations")
      .withIndex("by_email_status", (q) =>
        q.eq("email", email).eq("status", "pending")
      )
      .filter((q) => q.eq(q.field("folderId"), args.folderId))
      .first();

    if (existingInvite) {
      // Update existing invitation
      const expiresAt =
        Date.now() + (args.expiresInDays ?? 7) * 24 * 60 * 60 * 1000;
      await ctx.db.patch(existingInvite._id, {
        role: args.role,
        message: args.message,
        expiresAt,
      });
      return {
        invitationId: existingInvite._id,
        token: existingInvite.token,
        isExisting: true,
      };
    }

    // Generate unique token
    const token = generateToken(32);

    // Calculate expiration (default 7 days)
    const expiresAt =
      Date.now() + (args.expiresInDays ?? 7) * 24 * 60 * 60 * 1000;

    // Create invitation
    const invitationId = await ctx.db.insert("folderInvitations", {
      folderId: args.folderId,
      folderTitle: folder.title,
      email,
      role: args.role,
      orgId: folder.orgId,
      orgName: args.orgName,
      token,
      invitedBy: identity.subject,
      invitedByName: identity.name || "Unknown",
      invitedByEmail: identity.email,
      status: "pending",
      createdAt: Date.now(),
      expiresAt,
      message: args.message,
    });

    return {
      invitationId,
      token,
      isExisting: false,
    };
  },
});

/**
 * Get invitation details by token (for acceptance page)
 */
export const getByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("folderInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      return null;
    }

    // Check if expired
    if (invitation.expiresAt < Date.now() && invitation.status === "pending") {
      // Mark as expired
      // Note: Can't do mutations in queries, so just return expired status
      return {
        ...invitation,
        status: "expired" as const,
      };
    }

    return invitation;
  },
});

/**
 * Accept a folder invitation
 */
export const accept = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get invitation
    const invitation = await ctx.db
      .query("folderInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error(`This invitation has already been ${invitation.status}`);
    }

    if (invitation.expiresAt < Date.now()) {
      await ctx.db.patch(invitation._id, { status: "expired" });
      throw new Error("This invitation has expired");
    }

    // Check if folder still exists
    const folder = await ctx.db.get(invitation.folderId);
    if (!folder || folder.isDeleted) {
      throw new Error("The folder no longer exists");
    }

    // Check if user already has access
    const existingAccess = await ctx.db
      .query("folderAccess")
      .withIndex("by_folder_user", (q) =>
        q.eq("folderId", invitation.folderId).eq("userId", identity.subject)
      )
      .first();

    const roleHierarchy = { viewer: 1, editor: 2, admin: 3 };

    if (existingAccess) {
      // Upgrade role if invitation role is higher
      if (roleHierarchy[invitation.role] > roleHierarchy[existingAccess.role]) {
        await ctx.db.patch(existingAccess._id, { role: invitation.role });
      }
    } else {
      // Grant access
      await ctx.db.insert("folderAccess", {
        folderId: invitation.folderId,
        userId: identity.subject,
        role: invitation.role,
        orgId: invitation.orgId,
        grantedBy: invitation.invitedBy,
        grantedByName: invitation.invitedByName,
        createdAt: Date.now(),
        userName: identity.name || undefined,
        userEmail: identity.email || undefined,
        userAvatar: (identity as any).pictureUrl || undefined,
      });
    }

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, {
      status: "accepted",
      acceptedAt: Date.now(),
    });

    // Enable restrictions on folder if not already
    if (!folder.isRestricted) {
      await ctx.db.patch(folder._id, { isRestricted: true });
    }

    return {
      folderId: invitation.folderId,
      folderTitle: invitation.folderTitle,
      role: invitation.role,
    };
  },
});

/**
 * Decline a folder invitation
 */
export const decline = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const invitation = await ctx.db
      .query("folderInvitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!invitation) {
      throw new Error("Invitation not found");
    }

    if (invitation.status !== "pending") {
      throw new Error(`This invitation has already been ${invitation.status}`);
    }

    await ctx.db.patch(invitation._id, { status: "declined" });
  },
});

/**
 * Revoke/cancel a pending invitation
 */
export const revoke = mutation({
  args: {
    invitationId: v.id("folderInvitations"),
    isOrgAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Check permissions
    const folder = await ctx.db.get(invitation.folderId);
    if (!folder) {
      throw new Error("Folder not found");
    }

    const access = await checkFolderAccess(
      ctx,
      invitation.folderId,
      identity.subject,
      folder.orgId,
      args.isOrgAdmin ?? false
    );

    if (!canPerformAction(access, "manage")) {
      throw new Error("Not authorized to revoke this invitation");
    }

    // Delete the invitation
    await ctx.db.delete(args.invitationId);
  },
});

/**
 * List pending invitations for a folder
 */
export const listPendingByFolder = query({
  args: {
    folderId: v.id("nodes"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const invitations = await ctx.db
      .query("folderInvitations")
      .withIndex("by_folder", (q) => q.eq("folderId", args.folderId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();

    // Check for expired invitations and mark them
    const now = Date.now();
    return invitations.map((inv) => ({
      ...inv,
      isExpired: inv.expiresAt < now,
    }));
  },
});

/**
 * List all invitations sent by the current user
 */
export const listSentByUser = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("accepted"),
        v.literal("declined"),
        v.literal("expired")
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    let query = ctx.db
      .query("folderInvitations")
      .filter((q) => q.eq(q.field("invitedBy"), identity.subject));

    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    return query.collect();
  },
});

/**
 * List invitations sent to current user's email
 */
export const listReceivedByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !identity.email) {
      return [];
    }

    return ctx.db
      .query("folderInvitations")
      .withIndex("by_email", (q) => q.eq("email", identity.email!.toLowerCase()))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});
