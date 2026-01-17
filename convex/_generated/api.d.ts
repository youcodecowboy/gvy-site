/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as comments from "../comments.js";
import type * as dashboard from "../dashboard.js";
import type * as exports from "../exports.js";
import type * as files from "../files.js";
import type * as flags from "../flags.js";
import type * as mentions from "../mentions.js";
import type * as migrations_migrateFlags from "../migrations/migrateFlags.js";
import type * as nodes from "../nodes.js";
import type * as presence from "../presence.js";
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
  comments: typeof comments;
  dashboard: typeof dashboard;
  exports: typeof exports;
  files: typeof files;
  flags: typeof flags;
  mentions: typeof mentions;
  "migrations/migrateFlags": typeof migrations_migrateFlags;
  nodes: typeof nodes;
  presence: typeof presence;
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
