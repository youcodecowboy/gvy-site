import { v } from "convex/values";
import { query } from "./_generated/server";

// Get all dashboard data in a single query
export const getHomePageData = query({
  args: {
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userId = identity.subject;
    const userName = identity.name || identity.nickname || "there";

    // Get personal nodes
    const personalNodes = await ctx.db
      .query("nodes")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .filter((q) => q.neq(q.field("isDeleted"), true))
      .collect();

    // Get org nodes if orgId is provided
    let orgNodes: typeof personalNodes = [];
    if (args.orgId) {
      orgNodes = await ctx.db
        .query("nodes")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .filter((q) => q.neq(q.field("isDeleted"), true))
        .collect();
    }

    // Combine all accessible nodes
    const allNodes = [...personalNodes, ...orgNodes];

    // Filter to just documents (not folders)
    const allDocs = allNodes.filter((node) => node.type === "doc");
    const allFolders = allNodes.filter((node) => node.type === "folder");

    // Total counts
    const totalDocuments = allDocs.length;
    const totalFolders = allFolders.length;

    // Documents added in last 24 hours
    const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recentlyAddedDocs = allDocs.filter(
      (doc) => doc._creationTime > twentyFourHoursAgo
    );
    const documentsAddedLast24h = recentlyAddedDocs.length;

    // Get most recently updated document
    const docsWithUpdates = allDocs
      .filter((doc) => doc.updatedAt)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    
    const mostRecentDocument = docsWithUpdates[0] || allDocs.sort(
      (a, b) => b._creationTime - a._creationTime
    )[0] || null;

    // Get recent updates (last 10 documents updated, excluding current user's updates for "team" view)
    const recentTeamUpdates = orgNodes
      .filter((node) => node.type === "doc" && node.updatedAt && node.updatedBy !== userId)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 10)
      .map((doc) => ({
        _id: doc._id,
        title: doc.title,
        icon: doc.icon,
        updatedAt: doc.updatedAt,
        updatedBy: doc.updatedBy,
        updatedByName: doc.updatedByName,
      }));

    // Get recent updates from all accessible documents
    const recentUpdates = allDocs
      .filter((node) => node.updatedAt)
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 10)
      .map((doc) => ({
        _id: doc._id,
        title: doc.title,
        icon: doc.icon,
        updatedAt: doc.updatedAt,
        updatedBy: doc.updatedBy,
        updatedByName: doc.updatedByName,
        isOrgDoc: !!doc.orgId,
      }));

    // Get unread mentions
    const unreadMentions = await ctx.db
      .query("mentions")
      .withIndex("by_mentioned_user_unread", (q) =>
        q.eq("mentionedUserId", userId).eq("isRead", false)
      )
      .order("desc")
      .take(5);

    // Get total unread mention count
    const allUnreadMentions = await ctx.db
      .query("mentions")
      .withIndex("by_mentioned_user_unread", (q) =>
        q.eq("mentionedUserId", userId).eq("isRead", false)
      )
      .collect();
    const unreadMentionCount = allUnreadMentions.length;

    // Get accessible doc IDs for comment filtering
    const accessibleDocIds = new Set(allDocs.map(d => d._id));

    // Get recent comments from accessible documents
    const allComments = await ctx.db
      .query("comments")
      .order("desc")
      .take(50);
    
    const recentComments = allComments
      .filter(comment => accessibleDocIds.has(comment.docId))
      .slice(0, 6)
      .map(comment => ({
        _id: comment._id,
        docId: comment.docId,
        docTitle: comment.docTitle,
        authorName: comment.authorName,
        content: comment.content,
        createdAt: comment.createdAt,
        isResolved: comment.isResolved,
      }));

    return {
      userName,
      userId,
      totalDocuments,
      totalFolders,
      documentsAddedLast24h,
      mostRecentDocument: mostRecentDocument
        ? {
            _id: mostRecentDocument._id,
            title: mostRecentDocument.title,
            icon: mostRecentDocument.icon,
            updatedAt: mostRecentDocument.updatedAt || mostRecentDocument._creationTime,
            updatedBy: mostRecentDocument.updatedBy,
            updatedByName: mostRecentDocument.updatedByName,
          }
        : null,
      recentTeamUpdates,
      recentUpdates,
      unreadMentions,
      unreadMentionCount,
      recentComments,
      hasOrgAccess: !!args.orgId,
    };
  },
});

// Get time-based greeting
export const getGreeting = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { greeting: "Hello", userName: "there" };
    }

    const userName = identity.name || identity.nickname || identity.givenName || "there";
    
    // Note: This uses server time, which may differ from client time
    // For a more accurate greeting, compute on the client
    const hour = new Date().getHours();
    
    let greeting: string;
    if (hour >= 5 && hour < 12) {
      greeting = "Good morning";
    } else if (hour >= 12 && hour < 18) {
      greeting = "Good afternoon";
    } else {
      greeting = "Good evening";
    }

    return { greeting, userName };
  },
});

// Get quick stats for the dashboard header
export const getQuickStats = query({
  args: {
    orgId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const userId = identity.subject;

    // Get personal doc count
    const personalDocs = await ctx.db
      .query("nodes")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .filter((q) => 
        q.and(
          q.neq(q.field("isDeleted"), true),
          q.eq(q.field("type"), "doc")
        )
      )
      .collect();

    // Get org doc count if orgId provided
    let orgDocCount = 0;
    if (args.orgId) {
      const orgDocs = await ctx.db
        .query("nodes")
        .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
        .filter((q) => 
          q.and(
            q.neq(q.field("isDeleted"), true),
            q.eq(q.field("type"), "doc")
          )
        )
        .collect();
      orgDocCount = orgDocs.length;
    }

    return {
      personalDocCount: personalDocs.length,
      orgDocCount,
      totalDocCount: personalDocs.length + orgDocCount,
    };
  },
});
