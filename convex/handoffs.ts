import {sidesAccepted} from '../shared/sideReview';
import {safeHandoffPage} from './lib/handoffPage';
import {v,ConvexError} from 'convex/values';
import {query,internalQuery,internalMutation,type MutationCtx,type QueryCtx} from './_generated/server';
import {planV} from './validators';
import {handoffPageV} from './handoffValidators';
import {handoffAccepted,handoffVersion,handoffChanged} from '../shared/handoff';
import {chargeAiCall} from './households';
import {internal} from './_generated/api';
import {withHouseholdMeasures} from './lib/householdMeasures';
import {estimatedFood} from '../shared/ingredientEstimate';
async function accepted(ctx:MutationCtx|QueryCtx,token:string,version:string){
 if(!/^[a-f0-9]{64}$/.test(token))throw new ConvexError(handoffChanged);
 const h=await ctx.db.query('households').withIndex('by_token',q=>q.eq('token',token)).unique();
 if(!h?.plan)throw new ConvexError(handoffChanged);
 const review=await ctx.db.query('menuReviews').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();
 const sr=await ctx.db.query('sideReviews').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();
 const run=await ctx.db.query('personalSideRuns').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();
 if(!sidesAccepted(h.plan.personalSides??[],h.started,sr)||!handoffAccepted(h.plan,h.started,review,!!h.generation,!!run&&Date.now()-run.started<120000))throw new ConvexError('Accept every dish and personal side before sharing.');
 const custom=(await ctx.db.query('ingredientEstimates').withIndex('by_token',q=>q.eq('token',token)).take(200)).filter(r=>r.confirmed).map(r=>estimatedFood(`custom_${r._id}`,r.name,r.estimate));
 const plan=withHouseholdMeasures(h.plan,custom);if(handoffVersion(plan)!==version)throw new ConvexError(handoffChanged);
 const shares=await ctx.db.query('handoffs').withIndex('by_household',q=>q.eq('householdId',h._id)).order('desc').take(20);
 return {h,plan,existing:shares.find(s=>s.menuStarted===h.started&&s.version===version)};
}
export const prepare=internalMutation({args:{token:v.string(),version:v.string(),operation:v.string()},returns:v.null(),handler:async(ctx,a)=>{
 const {h,existing}=await accepted(ctx,a.token,a.version);if(existing)return null;
 const job=await ctx.db.query('handoffJobs').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();
 if(job?.version===a.version&&job.menuStarted===h.started&&job.status==='running'&&Date.now()-job.startedAt<150000)return null;
 const fields={householdId:h._id,menuStarted:h.started,version:a.version,operation:a.operation,status:'running' as const,startedAt:Date.now()};
 const id=job?job._id:await ctx.db.insert('handoffJobs',fields);if(job)await ctx.db.replace(id,fields);
 await ctx.scheduler.runAfter(0,internal.handoffAI.build,{...a,jobId:id});return null;
}});
export const snapshot=internalQuery({args:{token:v.string(),version:v.string()},returns:v.object({plan:planV,started:v.number()}),handler:async(ctx,a)=>{const {h,plan}=await accepted(ctx,a.token,a.version);return {plan,started:h.started};}});
export const charge=internalMutation({args:{token:v.string(),version:v.string(),operation:v.string()},returns:v.null(),handler:async(ctx,a)=>{const {h}=await accepted(ctx,a.token,a.version);const job=await ctx.db.query('handoffJobs').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();if(job?.operation!==a.operation)throw new ConvexError(handoffChanged);await chargeAiCall(ctx,a.token,Date.now(),'handoff');return null;}});
export const finishJob=internalMutation({args:{jobId:v.id('handoffJobs'),operation:v.string(),shareToken:v.optional(v.string()),error:v.optional(v.string()),message:v.optional(v.string())},returns:v.null(),handler:async(ctx,a)=>{const job=await ctx.db.get(a.jobId);if(job?.operation===a.operation)await ctx.db.patch(a.jobId,{status:a.shareToken?'ready':'failed',endedAt:Date.now(),...(a.shareToken?{shareToken:a.shareToken}:{}),...(a.error?{error:a.error}:{}),...(a.message?{message:a.message}:{})});return null;}});
export const status=query({args:{token:v.string(),version:v.string()},returns:v.object({state:v.union(v.literal('idle'),v.literal('working'),v.literal('ready'),v.literal('error')),shareToken:v.optional(v.string()),message:v.optional(v.string())}),handler:async(ctx,a)=>{
 try{const {h,existing}=await accepted(ctx,a.token,a.version);if(existing)return {state:'ready' as const,shareToken:existing.token};const job=await ctx.db.query('handoffJobs').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();if(!job||job.version!==a.version||job.menuStarted!==h.started)return {state:'idle' as const};if(job.status==='running'&&Date.now()-job.startedAt<150000)return {state:'working' as const};return {state:'error' as const,message:job.message??'Cooking link preparation stopped. Please retry.'};}catch(e){return {state:'error' as const,message:e instanceof ConvexError?String(e.data):'Could not check the cooking link. Please retry.'};}
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
 const sr=await ctx.db.query('sideReviews').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();
 const run=await ctx.db.query('personalSideRuns').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();
 if(!sidesAccepted(h.plan.personalSides??[],h.started,sr)||!handoffAccepted(h.plan,h.started,review,!!h.generation,!!run&&Date.now()-run.started<120000))return {state:'changed' as const};
 return {state:'ready' as const,page:safeHandoffPage(share.page)};
}});
