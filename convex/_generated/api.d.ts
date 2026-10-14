/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as households from "../households.js";
import type * as lib_dishRequest from "../lib/dishRequest.js";
import type * as lib_householdMeasures from "../lib/householdMeasures.js";
import type * as lib_ingredientUnits from "../lib/ingredientUnits.js";
import type * as lib_portions from "../lib/portions.js";
import type * as menu from "../menu.js";
import type * as units from "../units.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  households: typeof households;
  "lib/dishRequest": typeof lib_dishRequest;
  "lib/householdMeasures": typeof lib_householdMeasures;
  "lib/ingredientUnits": typeof lib_ingredientUnits;
  "lib/portions": typeof lib_portions;
  menu: typeof menu;
  units: typeof units;
  validators: typeof validators;
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
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
