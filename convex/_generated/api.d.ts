/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as dishReplacement from "../dishReplacement.js";
import type * as handoffAI from "../handoffAI.js";
import type * as handoffValidators from "../handoffValidators.js";
import type * as handoffs from "../handoffs.js";
import type * as households from "../households.js";
import type * as ingredientAI from "../ingredientAI.js";
import type * as ingredients from "../ingredients.js";
import type * as lib_actionErrors from "../lib/actionErrors.js";
import type * as lib_dishRequest from "../lib/dishRequest.js";
import type * as lib_fatAdditions from "../lib/fatAdditions.js";
import type * as lib_handoffPage from "../lib/handoffPage.js";
import type * as lib_householdMeasures from "../lib/householdMeasures.js";
import type * as lib_ingredientAliases from "../lib/ingredientAliases.js";
import type * as lib_ingredientUnits from "../lib/ingredientUnits.js";
import type * as lib_jointSides from "../lib/jointSides.js";
import type * as lib_menuFit from "../lib/menuFit.js";
import type * as lib_personalSides from "../lib/personalSides.js";
import type * as lib_planPersonalSides from "../lib/planPersonalSides.js";
import type * as lib_portions from "../lib/portions.js";
import type * as lib_replaceDish from "../lib/replaceDish.js";
import type * as lib_sideLimits from "../lib/sideLimits.js";
import type * as lib_sideRules from "../lib/sideRules.js";
import type * as lib_trackStep from "../lib/trackStep.js";
import type * as menu from "../menu.js";
import type * as personalSideState from "../personalSideState.js";
import type * as reviews from "../reviews.js";
import type * as runSteps from "../runSteps.js";
import type * as sidePlanning from "../sidePlanning.js";
import type * as sideReplacement from "../sideReplacement.js";
import type * as sideReviews from "../sideReviews.js";
import type * as units from "../units.js";
import type * as validators from "../validators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  dishReplacement: typeof dishReplacement;
  handoffAI: typeof handoffAI;
  handoffValidators: typeof handoffValidators;
  handoffs: typeof handoffs;
  households: typeof households;
  ingredientAI: typeof ingredientAI;
  ingredients: typeof ingredients;
  "lib/actionErrors": typeof lib_actionErrors;
  "lib/dishRequest": typeof lib_dishRequest;
  "lib/fatAdditions": typeof lib_fatAdditions;
  "lib/handoffPage": typeof lib_handoffPage;
  "lib/householdMeasures": typeof lib_householdMeasures;
  "lib/ingredientAliases": typeof lib_ingredientAliases;
  "lib/ingredientUnits": typeof lib_ingredientUnits;
  "lib/jointSides": typeof lib_jointSides;
  "lib/menuFit": typeof lib_menuFit;
  "lib/personalSides": typeof lib_personalSides;
  "lib/planPersonalSides": typeof lib_planPersonalSides;
  "lib/portions": typeof lib_portions;
  "lib/replaceDish": typeof lib_replaceDish;
  "lib/sideLimits": typeof lib_sideLimits;
  "lib/sideRules": typeof lib_sideRules;
  "lib/trackStep": typeof lib_trackStep;
  menu: typeof menu;
  personalSideState: typeof personalSideState;
  reviews: typeof reviews;
  runSteps: typeof runSteps;
  sidePlanning: typeof sidePlanning;
  sideReplacement: typeof sideReplacement;
  sideReviews: typeof sideReviews;
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
