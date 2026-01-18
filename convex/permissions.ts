import { QueryCtx, MutationCtx } from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";

// Permission role types
export type PermissionRole = "viewer" | "editor" | "admin";
export type EffectiveRole = PermissionRole | "org_admin" | "owner";

// Result of checking folder access
export interface AccessCheck {
  hasAccess: boolean;
  role: EffectiveRole | null;
  isOrgAdmin: boolean;
  isOwner: boolean;
  inheritedFrom: Id<"nodes"> | null; // If access is inherited from parent folder
}

// Role hierarchy for comparison (higher number = more permissions)
const ROLE_HIERARCHY: Record<EffectiveRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  org_admin: 4,
  owner: 5,
};

/**
 * Compare two roles - returns true if role1 >= role2
 */
export function hasHigherOrEqualRole(
  role1: EffectiveRole | null,
  role2: EffectiveRole
): boolean {
  if (!role1) return false;
  return ROLE_HIERARCHY[role1] >= ROLE_HIERARCHY[role2];
}

/**
 * Check if a user has access to a specific folder
 * Handles owner, org admin, direct access, and inherited access
 */
export async function checkFolderAccess(
  ctx: QueryCtx | MutationCtx,
  folderId: Id<"nodes">,
  userId: string,
  orgId: string | undefined,
  isOrgAdmin: boolean = false
): Promise<AccessCheck> {
  const noAccess: AccessCheck = {
    hasAccess: false,
    role: null,
    isOrgAdmin: false,
    isOwner: false,
    inheritedFrom: null,
  };

  const folder = await ctx.db.get(folderId);
  if (!folder || folder.isDeleted) {
    return noAccess;
  }

  // Check 1: Is user the owner? (personal folder)
  if (folder.ownerId === userId) {
    return {
      hasAccess: true,
      role: "owner",
      isOrgAdmin: false,
      isOwner: true,
      inheritedFrom: null,
    };
  }

  // Check 2: Is this an org folder?
  if (!folder.orgId) {
    // Personal folder, not owner = no access
    return noAccess;
  }

  // Check 3: Is user an org admin? (full access to everything in org)
  if (isOrgAdmin) {
    return {
      hasAccess: true,
      role: "org_admin",
      isOrgAdmin: true,
      isOwner: false,
      inheritedFrom: null,
    };
  }

  // Check 4: Is the folder NOT restricted? (all org members can access)
  if (!folder.isRestricted) {
    // Non-restricted folder - all org members have editor access by default
    return {
      hasAccess: true,
      role: "editor",
      isOrgAdmin: false,
      isOwner: false,
      inheritedFrom: null,
    };
  }

  // Check 5: Direct folder access
  const directAccess = await ctx.db
    .query("folderAccess")
    .withIndex("by_folder_user", (q) =>
      q.eq("folderId", folderId).eq("userId", userId)
    )
    .first();

  if (directAccess) {
    // Check expiration
    if (directAccess.expiresAt && directAccess.expiresAt < Date.now()) {
      // Access expired - could clean this up or just deny
      return noAccess;
    }
    return {
      hasAccess: true,
      role: directAccess.role,
      isOrgAdmin: false,
      isOwner: false,
      inheritedFrom: null,
    };
  }

  // Check 6: Inherited access from parent folders
  let currentParentId = folder.parentId;
  while (currentParentId) {
    const parentAccess = await ctx.db
      .query("folderAccess")
      .withIndex("by_folder_user", (q) =>
        q.eq("folderId", currentParentId!).eq("userId", userId)
      )
      .first();

    if (parentAccess) {
      if (!parentAccess.expiresAt || parentAccess.expiresAt >= Date.now()) {
        return {
          hasAccess: true,
          role: parentAccess.role,
          isOrgAdmin: false,
          isOwner: false,
          inheritedFrom: currentParentId,
        };
      }
    }

    // Check if parent folder is not restricted (open to all org members)
    const parentNode = await ctx.db.get(currentParentId);
    if (parentNode && !parentNode.isRestricted && parentNode.orgId === orgId) {
      return {
        hasAccess: true,
        role: "editor",
        isOrgAdmin: false,
        isOwner: false,
        inheritedFrom: currentParentId,
      };
    }

    currentParentId = parentNode?.parentId ?? null;
  }

  return noAccess;
}

/**
 * Check if user can perform a specific action based on their access level
 */
export function canPerformAction(
  access: AccessCheck,
  action: "view" | "edit" | "invite" | "manage" | "delete"
): boolean {
  if (!access.hasAccess || !access.role) return false;

  switch (action) {
    case "view":
      // Any access grants view
      return true;
    case "edit":
      // Editor, admin, org_admin, or owner can edit
      return hasHigherOrEqualRole(access.role, "editor");
    case "invite":
      // Admin, org_admin, or owner can invite
      return hasHigherOrEqualRole(access.role, "admin");
    case "manage":
      // Admin, org_admin, or owner can manage settings
      return hasHigherOrEqualRole(access.role, "admin");
    case "delete":
      // Only org_admin or owner can delete
      return hasHigherOrEqualRole(access.role, "org_admin");
    default:
      return false;
  }
}

/**
 * Get all folder IDs a user has explicit access to in an organization
 * Returns a Set for efficient lookup
 */
export async function getAccessibleFolderIds(
  ctx: QueryCtx | MutationCtx,
  userId: string,
  orgId: string
): Promise<Set<Id<"nodes">>> {
  const accessibleIds = new Set<Id<"nodes">>();

  // Get all direct folder access for this user in this org
  const directAccess = await ctx.db
    .query("folderAccess")
    .withIndex("by_org_user", (q) => q.eq("orgId", orgId).eq("userId", userId))
    .collect();

  for (const access of directAccess) {
    // Check expiration
    if (access.expiresAt && access.expiresAt < Date.now()) {
      continue;
    }

    accessibleIds.add(access.folderId);

    // Also add all descendants of this folder
    const descendants = await getDescendantIds(ctx, access.folderId);
    descendants.forEach((id) => accessibleIds.add(id));
  }

  return accessibleIds;
}

/**
 * Get all descendant node IDs (recursive)
 */
export async function getDescendantIds(
  ctx: QueryCtx | MutationCtx,
  parentId: Id<"nodes">
): Promise<Id<"nodes">[]> {
  const children = await ctx.db
    .query("nodes")
    .withIndex("by_parent", (q) => q.eq("parentId", parentId))
    .filter((q) => q.neq(q.field("isDeleted"), true))
    .collect();

  const ids: Id<"nodes">[] = [];
  for (const child of children) {
    ids.push(child._id);
    const childDescendants = await getDescendantIds(ctx, child._id);
    ids.push(...childDescendants);
  }
  return ids;
}

/**
 * Get the root restricted folder for a given node
 * Returns the folder ID if the node is inside a restricted folder tree,
 * or null if the node is in an open (non-restricted) area
 */
export async function getRootRestrictedFolder(
  ctx: QueryCtx | MutationCtx,
  nodeId: Id<"nodes">
): Promise<Id<"nodes"> | null> {
  let currentId: Id<"nodes"> | null = nodeId;
  let rootRestrictedId: Id<"nodes"> | null = null;

  while (currentId) {
    const node: Doc<"nodes"> | null = await ctx.db.get(currentId);
    if (!node) break;

    if (node.type === "folder" && node.isRestricted) {
      rootRestrictedId = currentId;
    }

    currentId = node.parentId;
  }

  return rootRestrictedId;
}

/**
 * Check if a node (doc or folder) is accessible to a user
 * This is the main function to use when checking document access
 */
export async function checkNodeAccess(
  ctx: QueryCtx | MutationCtx,
  nodeId: Id<"nodes">,
  userId: string,
  orgId: string | undefined,
  isOrgAdmin: boolean = false
): Promise<AccessCheck> {
  const node = await ctx.db.get(nodeId);
  if (!node || node.isDeleted) {
    return {
      hasAccess: false,
      role: null,
      isOrgAdmin: false,
      isOwner: false,
      inheritedFrom: null,
    };
  }

  // Personal node - check ownership
  if (node.ownerId) {
    return {
      hasAccess: node.ownerId === userId,
      role: node.ownerId === userId ? "owner" : null,
      isOrgAdmin: false,
      isOwner: node.ownerId === userId,
      inheritedFrom: null,
    };
  }

  // Org node - check org admin
  if (isOrgAdmin && node.orgId === orgId) {
    return {
      hasAccess: true,
      role: "org_admin",
      isOrgAdmin: true,
      isOwner: false,
      inheritedFrom: null,
    };
  }

  // If it's a folder, check folder access directly
  if (node.type === "folder") {
    return checkFolderAccess(ctx, nodeId, userId, orgId, isOrgAdmin);
  }

  // It's a document - need to find the containing folder and check access
  // Walk up the tree to find the first folder (or root)
  let currentParentId = node.parentId;

  while (currentParentId) {
    const parentFolder = await ctx.db.get(currentParentId);
    if (!parentFolder) break;

    if (parentFolder.type === "folder") {
      const folderAccess = await checkFolderAccess(
        ctx,
        currentParentId,
        userId,
        orgId,
        isOrgAdmin
      );

      if (folderAccess.hasAccess) {
        return {
          ...folderAccess,
          inheritedFrom: currentParentId,
        };
      }

      // If the folder is restricted and user doesn't have access, deny
      if (parentFolder.isRestricted) {
        return {
          hasAccess: false,
          role: null,
          isOrgAdmin: false,
          isOwner: false,
          inheritedFrom: null,
        };
      }
    }

    currentParentId = parentFolder.parentId;
  }

  // Document is at root level or in non-restricted folder tree
  // Check if document is in an org - all org members can access
  if (node.orgId === orgId) {
    return {
      hasAccess: true,
      role: "editor",
      isOrgAdmin: false,
      isOwner: false,
      inheritedFrom: null,
    };
  }

  return {
    hasAccess: false,
    role: null,
    isOrgAdmin: false,
    isOwner: false,
    inheritedFrom: null,
  };
}

/**
 * Get users who have access to a folder (for display in UI)
 */
export async function getFolderAccessList(
  ctx: QueryCtx,
  folderId: Id<"nodes">
): Promise<Doc<"folderAccess">[]> {
  return ctx.db
    .query("folderAccess")
    .withIndex("by_folder", (q) => q.eq("folderId", folderId))
    .collect();
}
