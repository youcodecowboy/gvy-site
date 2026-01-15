import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all tags, optionally filtered by search query
 */
export const list = query({
  args: {
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const search = args.search?.toLowerCase().trim();
    const limit = args.limit || 50;

    let tags;
    if (search) {
      // Search by name (case-insensitive) - get all and filter
      const allTags = await ctx.db.query("tags").collect();
      tags = allTags
        .filter((tag) => tag.name.includes(search))
        .sort((a, b) => b.usageCount - a.usageCount)
        .slice(0, limit);
    } else {
      // Get most used tags first
      tags = await ctx.db
        .query("tags")
        .withIndex("by_usage")
        .order("desc")
        .take(limit);
    }

    return tags;
  },
});

/**
 * Get a tag by name (case-insensitive)
 */
export const getByName = query({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedName = args.name.toLowerCase().trim();
    const tag = await ctx.db
      .query("tags")
      .withIndex("by_name")
      .filter((q) => q.eq(q.field("name"), normalizedName))
      .first();

    return tag;
  },
});

/**
 * Get tags by IDs
 */
export const getByIds = query({
  args: {
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, args) => {
    const tags = await Promise.all(
      args.tagIds.map((id) => ctx.db.get(id))
    );
    return tags.filter((tag) => tag !== null);
  },
});

/**
 * Create a new tag
 */
export const create = mutation({
  args: {
    name: v.string(),
    createdByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const normalizedName = args.name.toLowerCase().trim();
    const displayName = args.name.trim();

    if (!normalizedName) {
      throw new Error("Tag name cannot be empty");
    }

    // Check if tag already exists - get all and filter since index doesn't support exact match filtering
    const allTags = await ctx.db.query("tags").collect();
    const existing = allTags.find((tag) => tag.name === normalizedName);

    if (existing) {
      return existing._id;
    }

    // Create new tag
    const tagId = await ctx.db.insert("tags", {
      name: normalizedName,
      displayName: displayName,
      createdAt: Date.now(),
      createdBy: identity.subject,
      createdByName: args.createdByName || identity.name || identity.nickname || "Unknown",
      usageCount: 0,
    });

    return tagId;
  },
});

/**
 * Get or create a tag (returns existing tag ID if exists, creates new one if not)
 */
export const getOrCreate = mutation({
  args: {
    name: v.string(),
    createdByName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const normalizedName = args.name.toLowerCase().trim();
    const displayName = args.name.trim();

    if (!normalizedName) {
      throw new Error("Tag name cannot be empty");
    }

    // Check if tag already exists - get all and filter since index doesn't support exact match filtering
    const allTags = await ctx.db.query("tags").collect();
    const existing = allTags.find((tag) => tag.name === normalizedName);

    if (existing) {
      return existing._id;
    }

    // Create new tag
    const tagId = await ctx.db.insert("tags", {
      name: normalizedName,
      displayName: displayName,
      createdAt: Date.now(),
      createdBy: identity.subject,
      createdByName: args.createdByName || identity.name || identity.nickname || "Unknown",
      usageCount: 0,
    });

    return tagId;
  },
});

/**
 * Increment usage count for tags
 */
export const incrementUsage = mutation({
  args: {
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, args) => {
    for (const tagId of args.tagIds) {
      const tag = await ctx.db.get(tagId);
      if (tag) {
        await ctx.db.patch(tagId, {
          usageCount: tag.usageCount + 1,
        });
      }
    }
  },
});

/**
 * Decrement usage count for tags
 */
export const decrementUsage = mutation({
  args: {
    tagIds: v.array(v.id("tags")),
  },
  handler: async (ctx, args) => {
    for (const tagId of args.tagIds) {
      const tag = await ctx.db.get(tagId);
      if (tag) {
        await ctx.db.patch(tagId, {
          usageCount: Math.max(0, tag.usageCount - 1),
        });
      }
    }
  },
});
