import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate a random token for invite links
function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Create a new organization invite link
export const create = mutation({
  args: {
    orgId: v.string(),
    orgName: v.string(),
    defaultRole: v.optional(v.string()),
    maxUses: v.optional(v.number()),
    expiresInDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const token = generateToken();
    const now = Date.now();

    // Default expiration: 7 days
    const expiresAt = args.expiresInDays
      ? now + args.expiresInDays * 24 * 60 * 60 * 1000
      : now + 7 * 24 * 60 * 60 * 1000;

    const linkId = await ctx.db.insert("orgInviteLinks", {
      orgId: args.orgId,
      orgName: args.orgName,
      token,
      defaultRole: args.defaultRole || "org:member",
      createdBy: identity.subject,
      createdByName: identity.name || "Unknown",
      isActive: true,
      maxUses: args.maxUses,
      useCount: 0,
      createdAt: now,
      expiresAt,
    });

    return { linkId, token };
  },
});

// Get invite link details by token (public - for accept page)
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("orgInviteLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!link) {
      return null;
    }

    const now = Date.now();
    const isExpired = link.expiresAt ? link.expiresAt < now : false;
    const isMaxedOut = link.maxUses ? link.useCount >= link.maxUses : false;
    const isUsable = link.isActive && !isExpired && !isMaxedOut;

    return {
      ...link,
      isExpired,
      isMaxedOut,
      isUsable,
    };
  },
});

// List all invite links for an organization
export const listByOrg = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const links = await ctx.db
      .query("orgInviteLinks")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .collect();

    const now = Date.now();
    return links.map((link) => ({
      ...link,
      isExpired: link.expiresAt ? link.expiresAt < now : false,
      isMaxedOut: link.maxUses ? link.useCount >= link.maxUses : false,
    }));
  },
});

// Record usage of an invite link (called after Clerk invite is created)
export const recordUse = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("orgInviteLinks")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .first();

    if (!link) {
      throw new Error("Invite link not found");
    }

    const now = Date.now();
    if (!link.isActive) {
      throw new Error("This invite link has been disabled");
    }
    if (link.expiresAt && link.expiresAt < now) {
      throw new Error("This invite link has expired");
    }
    if (link.maxUses && link.useCount >= link.maxUses) {
      throw new Error("This invite link has reached its maximum uses");
    }

    await ctx.db.patch(link._id, {
      useCount: link.useCount + 1,
      lastUsedAt: now,
    });

    return { orgId: link.orgId, orgName: link.orgName };
  },
});

// Disable an invite link
export const disable = mutation({
  args: { linkId: v.id("orgInviteLinks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Invite link not found");
    }

    await ctx.db.patch(args.linkId, { isActive: false });
  },
});

// Enable an invite link
export const enable = mutation({
  args: { linkId: v.id("orgInviteLinks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Invite link not found");
    }

    await ctx.db.patch(args.linkId, { isActive: true });
  },
});

// Delete an invite link
export const remove = mutation({
  args: { linkId: v.id("orgInviteLinks") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const link = await ctx.db.get(args.linkId);
    if (!link) {
      throw new Error("Invite link not found");
    }

    await ctx.db.delete(args.linkId);
  },
});
