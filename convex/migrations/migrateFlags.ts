import { internalMutation } from "../_generated/server";

// Migration to update existing flags from old schema to new schema
// Old schema: docId, docTitle
// New schema: nodeId, nodeTitle, nodeType
export const migrateFlags = internalMutation({
  handler: async (ctx) => {
    console.log("Starting flags migration...");

    // Get all flags
    const allFlags = await ctx.db.query("flags").collect();

    console.log(`Found ${allFlags.length} flags to migrate`);

    let migrated = 0;
    let skipped = 0;

    for (const flag of allFlags) {
      const flagData = flag as any;

      // Check if already migrated (has nodeId field)
      if ('nodeId' in flagData) {
        skipped++;
        continue;
      }

      // Check if has old schema fields
      if (!('docId' in flagData)) {
        console.warn(`Flag ${flagData._id} missing both nodeId and docId, skipping`);
        skipped++;
        continue;
      }

      try {
        // Get the document to determine its type
        const node = await ctx.db.get(flagData.docId);
        const nodeData = node as any;

        // Patch the flag with new schema
        await ctx.db.patch(flagData._id, {
          nodeId: flagData.docId,
          nodeTitle: flagData.docTitle || (nodeData?.title ?? 'Untitled'),
          nodeType: nodeData?.type === 'folder' ? ('folder' as const) : ('doc' as const),
        } as any);

        migrated++;
      } catch (error) {
        console.error(`Failed to migrate flag ${flagData._id}:`, error);
      }
    }

    console.log(`Migration complete: ${migrated} migrated, ${skipped} skipped`);

    return {
      total: allFlags.length,
      migrated,
      skipped,
    };
  },
});
