import { internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

// Migration to populate ancestorIds for all nodes
// This enables O(1) descendant queries instead of O(N) recursive lookups
// Run once, then node mutations will maintain ancestorIds going forward
export const migrateAncestorPaths = internalMutation({
  handler: async (ctx) => {
    console.log("Starting ancestorIds migration...");

    // Get all nodes
    const allNodes = await ctx.db
      .query("nodes")
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    console.log(`Found ${allNodes.length} nodes to process`);

    // Build a map for quick parent lookups
    const nodeMap = new Map(allNodes.map((n) => [n._id, n]));

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const node of allNodes) {
      try {
        // Skip if already has ancestorIds
        if (node.ancestorIds && node.ancestorIds.length > 0) {
          skipped++;
          continue;
        }

        // Compute ancestor path by walking up the tree
        const ancestorIds: Id<"nodes">[] = [];
        let currentParentId = node.parentId;

        // Safety counter to prevent infinite loops
        let depth = 0;
        const maxDepth = 100;

        while (currentParentId && depth < maxDepth) {
          ancestorIds.unshift(currentParentId); // Prepend (root first)
          const parent = nodeMap.get(currentParentId);
          currentParentId = parent?.parentId ?? null;
          depth++;
        }

        if (depth >= maxDepth) {
          console.warn(
            `Node ${node._id} has very deep hierarchy (${depth}+), possible circular reference`
          );
        }

        // Update node with computed path
        await ctx.db.patch(node._id, { ancestorIds });
        migrated++;
      } catch (error) {
        console.error(`Failed to migrate node ${node._id}:`, error);
        errors++;
      }
    }

    console.log(
      `Migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`
    );

    return {
      total: allNodes.length,
      migrated,
      skipped,
      errors,
    };
  },
});
