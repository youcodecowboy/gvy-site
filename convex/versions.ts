import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Version batch window in milliseconds (30 seconds)
// Multiple saves within this window are batched into a single version
const VERSION_BATCH_WINDOW = 30 * 1000;

/**
 * Get the current version info for a document
 */
export const getCurrentVersion = query({
  args: { docId: v.id("nodes") },
  handler: async (ctx, args) => {
    const node = await ctx.db.get(args.docId);
    if (!node || node.type !== "doc") {
      return null;
    }

    return {
      majorVersion: node.currentMajorVersion ?? 1,
      minorVersion: node.currentMinorVersion ?? 0,
      versionString: node.currentVersionString ?? "v1.0",
      lastSnapshotAt: node.lastVersionSnapshotAt,
    };
  },
});

/**
 * Get version history for a document
 */
export const getVersionHistory = query({
  args: {
    docId: v.id("nodes"),
    limit: v.optional(v.number()),
    onlyMajor: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    let versions = await ctx.db
      .query("documentVersions")
      .withIndex("by_doc", (q) => q.eq("docId", args.docId))
      .order("desc")
      .collect();

    // Filter to major versions only if requested
    if (args.onlyMajor) {
      versions = versions.filter((v) => v.isMajorVersion);
    }

    // Apply limit
    if (args.limit) {
      versions = versions.slice(0, args.limit);
    }

    return versions;
  },
});

/**
 * Get a specific version's content
 */
export const getVersionContent = query({
  args: { versionId: v.id("documentVersions") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const version = await ctx.db.get(args.versionId);
    if (!version) {
      return null;
    }

    // Verify access to the document
    const node = await ctx.db.get(version.docId);
    if (!node) {
      return null;
    }

    // Check access
    if (node.ownerId !== identity.subject && !node.orgId) {
      return null;
    }

    return version;
  },
});

/**
 * Create a version snapshot (typically called automatically on save)
 * This captures the current state of the document as a new minor version
 */
export const createVersionSnapshot = mutation({
  args: {
    docId: v.id("nodes"),
    content: v.any(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const node = await ctx.db.get(args.docId);
    if (!node || node.type !== "doc") {
      throw new Error("Document not found");
    }

    // Check access
    if (node.ownerId !== identity.subject && !node.orgId) {
      throw new Error("Not authorized");
    }

    const userName = identity.name || identity.nickname || "Unknown";
    const now = Date.now();

    // Get current version info
    const majorVersion = node.currentMajorVersion ?? 1;
    const minorVersion = (node.currentMinorVersion ?? 0) + 1;
    const versionString = `v${majorVersion}.${minorVersion}`;

    // Create version record
    const versionId = await ctx.db.insert("documentVersions", {
      docId: args.docId,
      majorVersion,
      minorVersion,
      versionString,
      content: args.content,
      title: args.title,
      createdAt: now,
      createdBy: identity.subject,
      createdByName: userName,
      isMajorVersion: false,
    });

    // Update node with new version info
    await ctx.db.patch(args.docId, {
      currentMajorVersion: majorVersion,
      currentMinorVersion: minorVersion,
      currentVersionString: versionString,
      lastVersionSnapshotAt: now,
    });

    return { versionId, versionString };
  },
});

/**
 * Bump to a new major version (user-initiated milestone)
 * This creates a new version like v2.0, v3.0, etc.
 */
export const bumpMajorVersion = mutation({
  args: {
    docId: v.id("nodes"),
    changeSummary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const node = await ctx.db.get(args.docId);
    if (!node || node.type !== "doc") {
      throw new Error("Document not found");
    }

    // Check access
    if (node.ownerId !== identity.subject && !node.orgId) {
      throw new Error("Not authorized");
    }

    const userName = identity.name || identity.nickname || "Unknown";
    const now = Date.now();

    // Bump major version, reset minor to 0
    const majorVersion = (node.currentMajorVersion ?? 1) + 1;
    const minorVersion = 0;
    const versionString = `v${majorVersion}.${minorVersion}`;

    // Create version record for this major milestone
    const versionId = await ctx.db.insert("documentVersions", {
      docId: args.docId,
      majorVersion,
      minorVersion,
      versionString,
      content: node.content,
      title: node.title,
      createdAt: now,
      createdBy: identity.subject,
      createdByName: userName,
      changeSummary: args.changeSummary,
      isMajorVersion: true,
    });

    // Update node with new version info
    await ctx.db.patch(args.docId, {
      currentMajorVersion: majorVersion,
      currentMinorVersion: minorVersion,
      currentVersionString: versionString,
      lastVersionSnapshotAt: now,
    });

    return { versionId, versionString };
  },
});

/**
 * Initialize versioning for a document (sets up v1.0)
 * Called when a document is first created or needs migration
 */
export const initializeVersioning = mutation({
  args: { docId: v.id("nodes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const node = await ctx.db.get(args.docId);
    if (!node || node.type !== "doc") {
      throw new Error("Document not found");
    }

    // Check access
    if (node.ownerId !== identity.subject && !node.orgId) {
      throw new Error("Not authorized");
    }

    // Only initialize if not already versioned
    if (node.currentVersionString) {
      return {
        versionString: node.currentVersionString,
        alreadyInitialized: true,
      };
    }

    const userName = identity.name || identity.nickname || "Unknown";
    const now = Date.now();

    // Set initial version to v1.0
    await ctx.db.patch(args.docId, {
      currentMajorVersion: 1,
      currentMinorVersion: 0,
      currentVersionString: "v1.0",
      lastVersionSnapshotAt: now,
    });

    // Create initial version snapshot if there's content
    if (node.content) {
      await ctx.db.insert("documentVersions", {
        docId: args.docId,
        majorVersion: 1,
        minorVersion: 0,
        versionString: "v1.0",
        content: node.content,
        title: node.title,
        createdAt: now,
        createdBy: identity.subject,
        createdByName: userName,
        changeSummary: "Initial version",
        isMajorVersion: true,
      });
    }

    return { versionString: "v1.0", alreadyInitialized: false };
  },
});

/**
 * Check if a version snapshot should be created based on the batch window
 */
export const shouldCreateSnapshot = query({
  args: { docId: v.id("nodes") },
  handler: async (ctx, args) => {
    const node = await ctx.db.get(args.docId);
    if (!node || node.type !== "doc") {
      return false;
    }

    const now = Date.now();
    const lastSnapshot = node.lastVersionSnapshotAt ?? 0;

    return now - lastSnapshot > VERSION_BATCH_WINDOW;
  },
});
