import { v } from 'convex/values';
export const macrosV=v.object({protein:v.number(),carbs:v.number(),fat:v.number(),fibre:v.number()});
export const personV=v.object({name:v.string(),target:macrosV,diet:v.union(v.literal('veg'),v.literal('egg'),v.literal('nonveg')),allergies:v.array(v.string()),preferences:v.string()});
export const unitV=v.union(...(['pieces','bunch','cup','katori','g','kg','ml','L'] as const).map(u=>v.literal(u)));
export const entryV=v.object({id:v.string(),quantity:v.number(),unit:unitV,mustUse:v.boolean()});
export const stockV=v.object({id:v.string(),grams:v.number(),mustUse:v.boolean(),quantity:v.optional(v.number()),unit:v.optional(unitV)});
export const dishV=v.object({role:v.optional(v.union(v.literal('main'),v.literal('staple'),v.literal('side'))),meal:v.union(v.literal('breakfast'),v.literal('lunch'),v.literal('dinner')),name:v.string(),weight:v.number(),macros:macrosV,ingredients:v.array(v.object({id:v.string(),grams:v.number()}))});
export const mealCheckV=v.object({percent:macrosV,rangeGaps:macrosV,withinRange:v.boolean()});
export const mealTotalV=v.object({meal:v.union(v.literal('breakfast'),v.literal('lunch'),v.literal('dinner')),macros:macrosV,mealCheck:mealCheckV});
export const cuisineV=v.union(v.literal('Indian'),v.literal('Continental'));
export const mealCuisinesV=v.object({breakfast:cuisineV,lunch:cuisineV,dinner:cuisineV});
export const planV=v.object({mealCuisines:v.optional(mealCuisinesV),servingCapsApplied:v.optional(v.boolean()),dishes:v.array(dishV),people:v.array(v.object({name:v.string(),target:macrosV,meals:v.optional(v.array(mealTotalV)),portions:v.array(v.object({grams:v.number(),macros:macrosV,measure:v.optional(v.string()),mealCheck:v.optional(v.object({percent:macrosV,rangeGaps:macrosV,withinRange:v.boolean()}))})),total:macrosV,gaps:macrosV,withinTolerance:v.boolean()})),ingredients:v.array(v.object({id:v.string(),grams:v.number(),available:v.number(),shortage:v.number(),measure:v.optional(v.string()),availableMeasure:v.optional(v.string()),shortageMeasure:v.optional(v.string())}))});

export const estimateV=v.object({protein:v.number(),carbs:v.number(),fat:v.number(),fibre:v.number(),calories:v.number(),unit:v.union(v.literal('pieces'),v.literal('katori'),v.literal('g')),gramsPerUnit:v.number(),diet:v.union(v.literal('veg'),v.literal('egg'),v.literal('nonveg')),allergens:v.array(v.string()),uncertainAllergens:v.array(v.string()),note:v.string()});
export const customFoodV=v.object({id:v.string(),name:v.string(),diet:v.union(v.literal('veg'),v.literal('egg'),v.literal('nonveg')),allergens:v.array(v.string()),estimate:estimateV});
export const decisionV=v.object({state:v.union(v.literal('pending'),v.literal('accepted'),v.literal('rejected')),reason:v.optional(v.string())});
export const rejectionV=v.object({index:v.number(),dish:v.string(),reason:v.string(),at:v.number()});
export const reviewViewV=v.object({dishKey:v.string(),states:v.array(decisionV),history:v.array(rejectionV),allAccepted:v.boolean(),submitted:v.boolean(),replacing:v.boolean()});
