import {v,ConvexError} from 'convex/values';
import {internalMutation,type MutationCtx} from './_generated/server';
import {planV,personV,stockV,mealCuisinesV} from './validators';
import {dishReviewKey} from '../shared/review';
import {initialMealCuisines} from '../shared/cuisines';
import {chargeAiCall} from './households';
async function household(ctx:MutationCtx,token:string){if(!/^[a-f0-9]{64}$/.test(token))throw new ConvexError('Open your kitchen again.');const h=await ctx.db.query('households').withIndex('by_token',q=>q.eq('token',token)).unique();if(!h?.plan)throw new ConvexError('Generate a shared menu first.');return h;}
export const begin=internalMutation({args:{token:v.string(),dishKey:v.string(),runId:v.string()},returns:v.object({plan:planV,people:v.array(personV),stock:v.array(stockV),mealCuisines:mealCuisinesV}),handler:async(ctx,args)=>{
 const h=await household(ctx,args.token);if(dishReviewKey(h.plan!.dishes)!==args.dishKey)throw new ConvexError('The shared menu changed. Refresh first.');
 if(h.generation&&Date.now()-h.started<120000)throw new ConvexError('Wait for the shared menu to finish.');
 const review=await ctx.db.query('menuReviews').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();if(review?.operation&&Date.now()-review.operation.started<120000)throw new ConvexError('Wait for the dish replacement to finish.');
 const run=await ctx.db.query('personalSideRuns').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();if(run&&Date.now()-run.started<120000)throw new ConvexError('Personal sides are already being prepared.');
 const fields={householdId:h._id,runId:args.runId,started:Date.now(),dishKey:args.dishKey};if(run)await ctx.db.replace(run._id,fields);else await ctx.db.insert('personalSideRuns',fields);
 return {plan:h.plan!,people:h.people,stock:h.stock,mealCuisines:initialMealCuisines(h.people,h.mealCuisines)};
}});
export const charge=internalMutation({args:{token:v.string(),runId:v.string()},returns:v.null(),handler:async(ctx,args)=>{const h=await household(ctx,args.token);const run=await ctx.db.query('personalSideRuns').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();if(run?.runId!==args.runId)throw new ConvexError('Side preparation expired.');await chargeAiCall(ctx,args.token,Date.now());return null;}});
export const finish=internalMutation({args:{token:v.string(),runId:v.string(),plan:planV},returns:v.null(),handler:async(ctx,args)=>{
 const h=await household(ctx,args.token);const run=await ctx.db.query('personalSideRuns').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();if(run?.runId!==args.runId||dishReviewKey(h.plan!.dishes)!==run.dishKey)throw new ConvexError('The shared menu changed. Find sides again.');
 if(args.plan.mealCuisines&&JSON.stringify(initialMealCuisines(h.people,h.mealCuisines))!==JSON.stringify(args.plan.mealCuisines))throw new ConvexError('Meal cuisines changed. Find sides again.');
 if(JSON.stringify(h.plan!.dishes)!==JSON.stringify(args.plan.dishes)||JSON.stringify(h.plan!.people.map(p=>p.portions))!==JSON.stringify(args.plan.people.map(p=>p.portions)))throw new ConvexError('Personal sides cannot change shared dishes or portions.');
 await ctx.db.patch(h._id,{plan:args.plan});await ctx.db.delete(run._id);return null;
}});
export const release=internalMutation({args:{token:v.string(),runId:v.string()},returns:v.null(),handler:async(ctx,args)=>{const h=await ctx.db.query('households').withIndex('by_token',q=>q.eq('token',args.token)).unique();if(h){const run=await ctx.db.query('personalSideRuns').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();if(run?.runId===args.runId)await ctx.db.delete(run._id);}return null;}});
