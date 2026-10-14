import { v } from 'convex/values';
export const macrosV=v.object({protein:v.number(),carbs:v.number(),fat:v.number(),fibre:v.number()});
export const personV=v.object({name:v.string(),target:macrosV,diet:v.union(v.literal('veg'),v.literal('egg'),v.literal('nonveg')),allergies:v.array(v.string()),preferences:v.string()});
export const unitV=v.union(...(['pieces','bunch','cup','katori','g','kg','ml','L'] as const).map(u=>v.literal(u)));
export const entryV=v.object({id:v.string(),quantity:v.number(),unit:unitV,mustUse:v.boolean()});
export const stockV=v.object({id:v.string(),grams:v.number(),mustUse:v.boolean(),quantity:v.optional(v.number()),unit:v.optional(unitV)});
export const dishV=v.object({meal:v.union(v.literal('breakfast'),v.literal('lunch'),v.literal('dinner')),name:v.string(),weight:v.number(),macros:macrosV,ingredients:v.array(v.object({id:v.string(),grams:v.number()}))});
export const planV=v.object({dishes:v.array(dishV),people:v.array(v.object({name:v.string(),target:macrosV,portions:v.array(v.object({grams:v.number(),macros:macrosV,measure:v.optional(v.string())})),total:macrosV,gaps:macrosV,withinTolerance:v.boolean()})),ingredients:v.array(v.object({id:v.string(),grams:v.number(),available:v.number(),shortage:v.number()}))});
