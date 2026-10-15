import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { personV,stockV,planV,mealCuisinesV,estimateV } from './validators';
export default defineSchema({ingredientEstimates:defineTable({token:v.string(),name:v.string(),key:v.string(),estimate:estimateV,confirmed:v.boolean()}).index('by_token',['token']).index('by_token_key',['token','key']),households:defineTable({mealCuisines:v.optional(mealCuisinesV),token:v.string(),people:v.array(personV),stock:v.array(stockV),plan:v.union(planV,v.null()),generation:v.union(v.string(),v.null()),started:v.number()}).index('by_token',['token']), aiCalls:defineTable({at:v.number()}).index('by_at',['at'])});
