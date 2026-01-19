/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as ai from "../ai.js";
import type * as aiChats from "../aiChats.js";
import type * as comments from "../comments.js";
import type * as dashboard from "../dashboard.js";
import type * as exports from "../exports.js";
import type * as files from "../files.js";
import type * as flags from "../flags.js";
import type * as folderAccess from "../folderAccess.js";
import type * as invitations from "../invitations.js";
import type * as mentions from "../mentions.js";
import type * as migrations_migrateAncestorPaths from "../migrations/migrateAncestorPaths.js";
import type * as migrations_migrateFlags from "../migrations/migrateFlags.js";
import type * as nodes from "../nodes.js";
import type * as orgInvites from "../orgInvites.js";
import type * as permissions from "../permissions.js";
import type * as presence from "../presence.js";
import type * as shareLinks from "../shareLinks.js";
import type * as tags from "../tags.js";
import type * as threads from "../threads.js";
import type * as versions from "../versions.js";
import type * as views from "../views.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  ai: typeof ai;
  aiChats: typeof aiChats;
  comments: typeof comments;
  dashboard: typeof dashboard;
  exports: typeof exports;
  files: typeof files;
  flags: typeof flags;
  folderAccess: typeof folderAccess;
  invitations: typeof invitations;
  mentions: typeof mentions;
  "migrations/migrateAncestorPaths": typeof migrations_migrateAncestorPaths;
  "migrations/migrateFlags": typeof migrations_migrateFlags;
  nodes: typeof nodes;
  orgInvites: typeof orgInvites;
  permissions: typeof permissions;
  presence: typeof presence;
  shareLinks: typeof shareLinks;
  tags: typeof tags;
  threads: typeof threads;
  versions: typeof versions;
  views: typeof views;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
