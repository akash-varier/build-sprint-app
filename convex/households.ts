import {estimatedFood} from '../shared/ingredientEstimate';
import {foods} from '../shared/food';
import {initialMealCuisines} from '../shared/cuisines';
import { stockToEntries } from './lib/ingredientUnits';
import { withHouseholdMeasures } from './lib/householdMeasures';
import { query,mutation,internalMutation,type MutationCtx } from './_generated/server';
import { components } from './_generated/api';
import { v,ConvexError } from 'convex/values';
import { RateLimiter, MINUTE, HOUR } from '@convex-dev/rate-limiter';
import { personV,stockV,planV,entryV,mealCuisinesV } from './validators';
import { validateInputs } from '../shared/validation';
const limiter=new RateLimiter(components.rateLimiter,{global:{kind:'fixed window',rate:100,period:HOUR},household:{kind:'fixed window',rate:3,period:MINUTE}});
const busy='Busy right now. Try again in a few minutes.';
function validateToken(token:string){if(!/^[a-f0-9]{64}$/.test(token))throw new ConvexError('Open the app again to start a household.');}
export const get=query({args:{token:v.string()},returns:v.union(v.null(),v.object({mealCuisines:mealCuisinesV,people:v.array(personV),stock:v.array(entryV),plan:v.union(planV,v.null())})),handler:async(ctx,{token})=>{
 validateToken(token);const custom=(await ctx.db.query('ingredientEstimates').withIndex('by_token',q=>q.eq('token',token)).take(200)).filter(r=>r.confirmed).map(r=>estimatedFood(`custom_${r._id}`,r.name,r.estimate));const h=await ctx.db.query('households').withIndex('by_token',q=>q.eq('token',token)).unique();return h?{mealCuisines:initialMealCuisines(h.people,h.mealCuisines),people:h.people,stock:stockToEntries(h.stock,custom),plan:h.plan?withHouseholdMeasures(h.plan,custom):null}:null;
}});
export const begin=internalMutation({args:{token:v.string(),people:v.array(personV),stock:v.array(stockV),mealCuisines:mealCuisinesV,generation:v.string()},returns:v.id('households'),handler:async(ctx,args)=>{
 validateToken(args.token);const custom=(await ctx.db.query('ingredientEstimates').withIndex('by_token',q=>q.eq('token',args.token)).take(200)).filter(r=>r.confirmed).map(r=>estimatedFood(`custom_${r._id}`,r.name,r.estimate));try{validateInputs(args.people,args.stock,[...foods,...custom]);}catch(e){throw new ConvexError(e instanceof Error?e.message:'Check your inputs.');}
 const now=Date.now();const h=await ctx.db.query('households').withIndex('by_token',q=>q.eq('token',args.token)).unique();
 if(h?.generation&&now-h.started<120000)throw new ConvexError(busy);
 await chargeAiCall(ctx,args.token,now);
 const fields={...args,plan:null,started:now};
 if(h){await ctx.db.patch(h._id,fields);return h._id;}return await ctx.db.insert('households',fields);
}});
export const finish=internalMutation({args:{id:v.id('households'),generation:v.string(),plan:v.union(planV,v.null())},returns:v.null(),handler:async(ctx,args)=>{
 const h=await ctx.db.get(args.id);if(h?.generation===args.generation)await ctx.db.patch(args.id,{plan:args.plan,generation:null});return null;
}});

export async function chargeAiCall(ctx:MutationCtx,token:string,now:number){
 if(!(await limiter.limit(ctx,'household',{key:token})).ok)throw new ConvexError(busy);
 // Rolling hour: the rate limiter protects each household; this indexed,
 // transactional ledger enforces exactly 100 calls in ANY trailing hour globally.
 const expired=await ctx.db.query('aiCalls').withIndex('by_at',q=>q.lte('at',now-60*MINUTE)).take(100);
 for(const call of expired)await ctx.db.delete(call._id);
 const calls=await ctx.db.query('aiCalls').withIndex('by_at',q=>q.gt('at',now-60*MINUTE)).take(100);
 if(calls.length>=100||!(await limiter.limit(ctx,'global')).ok)throw new ConvexError(busy);
 await ctx.db.insert('aiCalls',{at:now});
}
export const reserveAiCall=internalMutation({args:{token:v.string(),generation:v.string()},returns:v.null(),handler:async(ctx,{token,generation})=>{
 validateToken(token);const h=await ctx.db.query('households').withIndex('by_token',q=>q.eq('token',token)).unique();
 if(h?.generation!==generation)throw new ConvexError(busy);
 await chargeAiCall(ctx,token,Date.now());return null;
}});

export const setMealCuisines=mutation({args:{token:v.string(),mealCuisines:mealCuisinesV},returns:v.null(),handler:async(ctx,{token,mealCuisines})=>{
 validateToken(token);const h=await ctx.db.query('households').withIndex('by_token',q=>q.eq('token',token)).unique();
 if(h?.generation&&Date.now()-h.started<120000)throw new ConvexError('Wait for the current menu before changing cuisines.');
 if(h)await ctx.db.patch(h._id,{mealCuisines});else await ctx.db.insert('households',{token,mealCuisines,people:[],stock:[],plan:null,generation:null,started:0});return null;
}});
export const migrateMealCuisines=internalMutation({args:{},returns:v.number(),handler:async ctx=>{
 const households=await ctx.db.query('households').withIndex('by_token').take(100);let updated=0;
 for(const h of households)if(!h.mealCuisines){await ctx.db.patch(h._id,{mealCuisines:initialMealCuisines(h.people)});updated++;}return updated;
}});
export const chargeIngredientCall=internalMutation({args:{token:v.string()},returns:v.null(),handler:async(ctx,{token})=>{validateToken(token);await chargeAiCall(ctx,token,Date.now());return null;}});
