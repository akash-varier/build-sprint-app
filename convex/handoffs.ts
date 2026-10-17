import {safeHandoffPage} from './lib/handoffPage';
import {v,ConvexError} from 'convex/values';
import {query,internalMutation,type MutationCtx} from './_generated/server';
import {planV} from './validators';
import {handoffPageV} from './handoffValidators';
import {handoffAccepted,handoffVersion,handoffChanged} from '../shared/handoff';
import {chargeAiCall} from './households';
import {withHouseholdMeasures} from './lib/householdMeasures';
import {estimatedFood} from '../shared/ingredientEstimate';
async function accepted(ctx:MutationCtx,token:string,version:string){
 if(!/^[a-f0-9]{64}$/.test(token))throw new ConvexError(handoffChanged);
 const h=await ctx.db.query('households').withIndex('by_token',q=>q.eq('token',token)).unique();
 if(!h?.plan)throw new ConvexError(handoffChanged);
 const review=await ctx.db.query('menuReviews').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();
 const run=await ctx.db.query('personalSideRuns').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();
 if(!handoffAccepted(h.plan,h.started,review,!!h.generation,!!run&&Date.now()-run.started<120000))throw new ConvexError('Accept every dish before sharing.');
 const custom=(await ctx.db.query('ingredientEstimates').withIndex('by_token',q=>q.eq('token',token)).take(200)).filter(r=>r.confirmed).map(r=>estimatedFood(`custom_${r._id}`,r.name,r.estimate));
 const plan=withHouseholdMeasures(h.plan,custom);if(handoffVersion(plan)!==version)throw new ConvexError(handoffChanged);
 const shares=await ctx.db.query('handoffs').withIndex('by_household',q=>q.eq('householdId',h._id)).order('desc').take(20);
 return {h,plan,existing:shares.find(s=>s.menuStarted===h.started&&s.version===version)};
}
export const prepare=internalMutation({args:{token:v.string(),version:v.string()},returns:v.object({plan:planV,started:v.number(),existingToken:v.union(v.string(),v.null())}),handler:async(ctx,args)=>{
 const {h,plan,existing}=await accepted(ctx,args.token,args.version);if(!existing)await chargeAiCall(ctx,args.token,Date.now());return {plan,started:h.started,existingToken:existing?.token??null};
}});
export const save=internalMutation({args:{token:v.string(),version:v.string(),started:v.number(),shareToken:v.string(),page:handoffPageV},returns:v.string(),handler:async(ctx,args)=>{
 const {h,existing}=await accepted(ctx,args.token,args.version);if(h.started!==args.started)throw new ConvexError(handoffChanged);if(existing)return existing.token;
 if(!/^[a-f0-9]{64}$/.test(args.shareToken)||args.shareToken===args.token)throw new ConvexError('Invalid handoff token.');
 if(await ctx.db.query('handoffs').withIndex('by_token',q=>q.eq('token',args.shareToken)).unique())throw new ConvexError('Try creating the link again.');
 await ctx.db.insert('handoffs',{householdId:h._id,menuStarted:h.started,version:args.version,token:args.shareToken,page:args.page});return args.shareToken;
}});
export const get=query({args:{token:v.string(),attempt:v.optional(v.number())},returns:v.union(v.object({state:v.literal('changed')}),v.object({state:v.literal('ready'),page:handoffPageV})),handler:async(ctx,{token})=>{
 if(!/^[a-f0-9]{64}$/.test(token))return {state:'changed' as const};
 const share=await ctx.db.query('handoffs').withIndex('by_token',q=>q.eq('token',token)).unique();if(!share)return {state:'changed' as const};
 const h=await ctx.db.get(share.householdId);if(!h?.plan||h.started!==share.menuStarted||handoffVersion(h.plan as Parameters<typeof handoffVersion>[0])!==share.version)return {state:'changed' as const};
 const review=await ctx.db.query('menuReviews').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();
 const run=await ctx.db.query('personalSideRuns').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();
 if(!handoffAccepted(h.plan,h.started,review,!!h.generation,!!run&&Date.now()-run.started<120000))return {state:'changed' as const};
 return {state:'ready' as const,page:safeHandoffPage(share.page)};
}});
