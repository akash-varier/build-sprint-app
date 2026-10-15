import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { personV,stockV,planV,mealCuisinesV } from './validators';
export default defineSchema({households:defineTable({mealCuisines:v.optional(mealCuisinesV),token:v.string(),people:v.array(personV),stock:v.array(stockV),plan:v.union(planV,v.null()),generation:v.union(v.string(),v.null()),started:v.number()}).index('by_token',['token']), aiCalls:defineTable({at:v.number()}).index('by_at',['at'])});
