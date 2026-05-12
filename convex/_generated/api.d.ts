/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as auth_helpers from "../auth_helpers.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as http from "../http.js";
import type * as invitations from "../invitations.js";
import type * as joinRequests from "../joinRequests.js";
import type * as notifications from "../notifications.js";
import type * as orgCleanup from "../orgCleanup.js";
import type * as orgDiscovery from "../orgDiscovery.js";
import type * as orgSettings from "../orgSettings.js";
import type * as people from "../people.js";
import type * as subscription from "../subscription.js";
import type * as testAuth from "../testAuth.js";
import type * as todos from "../todos.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  auth_helpers: typeof auth_helpers;
  crons: typeof crons;
  dashboard: typeof dashboard;
  http: typeof http;
  invitations: typeof invitations;
  joinRequests: typeof joinRequests;
  notifications: typeof notifications;
  orgCleanup: typeof orgCleanup;
  orgDiscovery: typeof orgDiscovery;
  orgSettings: typeof orgSettings;
  people: typeof people;
  subscription: typeof subscription;
  testAuth: typeof testAuth;
  todos: typeof todos;
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

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
};
