import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Migration: Convert old tags (strings) to new tagIds system
 * This should be run once to migrate existing data
 */
export const migrateTagsToTagIds = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get all nodes that have old tags but no tagIds
    const nodes = await ctx.db
      .query("nodes")
      .filter((q) => 
        q.neq(q.field("tags"), undefined)
      )
      .collect();

    let migrated = 0;
    let errors = 0;

    for (const node of nodes) {
      try {
        // Skip if already migrated
        if (node.tagIds && node.tagIds.length > 0) {
          continue;
        }

        // Skip if no old tags
        if (!node.tags || node.tags.length === 0) {
          continue;
        }

        // Convert each tag string to a tag ID (get or create)
        const tagIds: string[] = [];
        
        for (const tagName of node.tags) {
          if (!tagName || typeof tagName !== 'string') {
            continue;
          }

          const normalizedName = tagName.toLowerCase().trim();
          if (!normalizedName) {
            continue;
          }

          // Check if tag exists
          const existingTag = await ctx.db
            .query("tags")
            .withIndex("by_name")
            .filter((q) => q.eq(q.field("name"), normalizedName))
            .first();

          let tagId: string;

          if (existingTag) {
            tagId = existingTag._id;
            // Increment usage count
            await ctx.db.patch(existingTag._id, {
              usageCount: existingTag.usageCount + 1,
            });
          } else {
            // Create new tag
            tagId = await ctx.db.insert("tags", {
              name: normalizedName,
              displayName: tagName.trim(),
              createdAt: Date.now(),
              createdBy: identity.subject,
              createdByName: identity.name || identity.nickname || "Unknown",
              usageCount: 1,
            });
          }

          tagIds.push(tagId);
        }

        // Update node with new tagIds and remove old tags
        await ctx.db.patch(node._id, {
          tagIds: tagIds as any,
          tags: undefined, // Remove old tags field
        });

        migrated++;
      } catch (error) {
        console.error(`Error migrating node ${node._id}:`, error);
        errors++;
      }
    }

    return {
      migrated,
      errors,
      total: nodes.length,
    };
  },
});

/**
 * Check migration status
 */
export const checkMigrationStatus = query({
  args: {},
  handler: async (ctx) => {
    const nodesWithOldTags = await ctx.db
      .query("nodes")
      .filter((q) => 
        q.neq(q.field("tags"), undefined)
      )
      .collect();

    const nodesWithNewTags = await ctx.db
      .query("nodes")
      .filter((q) => 
        q.neq(q.field("tagIds"), undefined)
      )
      .collect();

    return {
      nodesWithOldTags: nodesWithOldTags.length,
      nodesWithNewTags: nodesWithNewTags.length,
      needsMigration: nodesWithOldTags.length > 0,
    };
  },
});
