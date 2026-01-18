import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// How long before a user is considered offline (30 seconds)
const PRESENCE_TIMEOUT_MS = 30 * 1000;

// Same colors as user-context.tsx for consistency
const USER_COLORS = [
  "#fb7185",
  "#fdba74",
  "#d9f99d",
  "#a7f3d0",
  "#a5f3fc",
  "#a5b4fc",
  "#f0abfc",
  "#fda58d",
  "#f2cc8f",
  "#9ae6b4",
];

// Generate a consistent color from user ID (same logic as user-context.tsx)
function getColorFromUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }
  const index = Math.abs(hash) % USER_COLORS.length;
  return USER_COLORS[index] ?? "#9ae6b4";
}

// Update or create presence record (called on heartbeat)
export const heartbeat = mutation({
  args: {
    sessionId: v.string(),
    currentPath: v.string(),
    currentNodeId: v.optional(v.id("nodes")),
    currentNodeType: v.optional(v.union(v.literal("doc"), v.literal("folder"))),
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userId = identity.subject;
    const userName =
      identity.name || (identity as any).nickname || "Anonymous";
    const userAvatar = (identity as any).pictureUrl || (identity as any).picture;
    const userColor = getColorFromUserId(userId);
    const now = Date.now();

    // Find existing presence for this user+session
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user_session", (q) =>
        q.eq("userId", userId).eq("sessionId", args.sessionId)
      )
      .unique();

    // Get node title if nodeId provided - works for both docs and folders
    let nodeTitle: string | undefined;
    if (args.currentNodeId) {
      const node = await ctx.db.get(args.currentNodeId);
      nodeTitle = node?.title;
    }

    if (existing) {
      // Update existing presence
      await ctx.db.patch(existing._id, {
        currentPath: args.currentPath,
        currentNodeId: args.currentNodeId,
        currentNodeTitle: nodeTitle,
        currentNodeType: args.currentNodeType,
        lastSeenAt: now,
        orgId: args.orgId,
        userName, // Update in case it changed
        userAvatar,
      });
      return existing._id;
    } else {
      // Create new presence record
      return await ctx.db.insert("presence", {
        userId,
        userName,
        userAvatar,
        userColor,
        currentPath: args.currentPath,
        currentNodeId: args.currentNodeId,
        currentNodeTitle: nodeTitle,
        currentNodeType: args.currentNodeType,
        lastSeenAt: now,
        sessionId: args.sessionId,
        orgId: args.orgId,
      });
    }
  },
});

// Remove presence when user explicitly leaves (tab close, logout)
export const leave = mutation({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return;
    }

    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user_session", (q) =>
        q.eq("userId", identity.subject).eq("sessionId", args.sessionId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Get online users (for the indicator dropdown)
// Includes current user first with isCurrentUser flag
export const getOnlineUsers = query({
  args: {
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const cutoffTime = Date.now() - PRESENCE_TIMEOUT_MS;

    // Get all presence records
    const presenceRecords = await ctx.db.query("presence").collect();

    // Filter by timeout and optionally by org
    const activeRecords = presenceRecords.filter((record) => {
      if (record.lastSeenAt < cutoffTime) return false;
      // If orgId is specified, filter by it; otherwise show all
      if (args.orgId && record.orgId !== args.orgId) return false;
      return true;
    });

    // Deduplicate by userId (keep most recent session)
    const userMap = new Map<
      string,
      (typeof activeRecords)[0]
    >();
    for (const record of activeRecords) {
      const existing = userMap.get(record.userId);
      if (!existing || record.lastSeenAt > existing.lastSeenAt) {
        userMap.set(record.userId, record);
      }
    }

    // Get current user's presence data
    const currentUserPresence = userMap.get(identity.subject);
    const currentUserData = {
      userId: identity.subject,
      userName: identity.name || (identity as any).nickname || "You",
      userAvatar: (identity as any).pictureUrl || (identity as any).picture,
      userColor: getColorFromUserId(identity.subject),
      currentPath: currentUserPresence?.currentPath ?? "",
      currentNodeId: currentUserPresence?.currentNodeId,
      currentNodeTitle: currentUserPresence?.currentNodeTitle,
      currentNodeType: currentUserPresence?.currentNodeType,
      lastSeenAt: Date.now(),
      isCurrentUser: true,
    };

    // Get other users
    const otherUsers = Array.from(userMap.values())
      .filter((u) => u.userId !== identity.subject)
      .map((u) => ({
        userId: u.userId,
        userName: u.userName,
        userAvatar: u.userAvatar,
        userColor: u.userColor,
        currentPath: u.currentPath,
        currentNodeId: u.currentNodeId,
        currentNodeTitle: u.currentNodeTitle,
        currentNodeType: u.currentNodeType,
        lastSeenAt: u.lastSeenAt,
        isCurrentUser: false,
      }));

    // Return current user first, then others
    return [currentUserData, ...otherUsers];
  },
});

// Get count of online users (lightweight query for badge)
// Includes current user in count (always >= 1 when authenticated)
export const getOnlineCount = query({
  args: {
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return 0;
    }

    const cutoffTime = Date.now() - PRESENCE_TIMEOUT_MS;

    // Get all presence records
    const presenceRecords = await ctx.db.query("presence").collect();

    // Filter by timeout and optionally by org
    const activeRecords = presenceRecords.filter((record) => {
      if (record.lastSeenAt < cutoffTime) return false;
      if (args.orgId && record.orgId !== args.orgId) return false;
      return true;
    });

    // Count unique users (including self)
    const uniqueUsers = new Set(activeRecords.map((r) => r.userId));

    // Always include self even if no presence record exists yet
    uniqueUsers.add(identity.subject);

    return uniqueUsers.size;
  },
});

// Cleanup stale presence records (can be called periodically)
export const cleanupStalePresence = mutation({
  args: {},
  handler: async (ctx) => {
    const cutoffTime = Date.now() - PRESENCE_TIMEOUT_MS * 2; // 2x timeout for safety

    const allRecords = await ctx.db.query("presence").collect();

    const staleRecords = allRecords.filter(
      (record) => record.lastSeenAt < cutoffTime
    );

    for (const record of staleRecords) {
      await ctx.db.delete(record._id);
    }

    return staleRecords.length;
  },
});
