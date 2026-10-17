import {v,ConvexError} from 'convex/values';
import {query,mutation,internalMutation,type MutationCtx} from './_generated/server';
import {planV,personV,stockV,mealCuisinesV} from './validators';
import {sideReviewKey,sideDecisions} from '../shared/sideReview';
import {decideDish,pendingDecisions,dishReviewKey} from '../shared/review';
import {initialMealCuisines} from '../shared/cuisines';
import {chargeAiCall} from './households';
import {sameCalculatedSharedServings} from './lib/personalSides';
import {withHouseholdMeasures} from './lib/householdMeasures';
async function load(ctx:MutationCtx,token:string,key:string){
 if(!/^[a-f0-9]{64}$/.test(token))throw new ConvexError('Open your kitchen again.');
 const h=await ctx.db.query('households').withIndex('by_token',q=>q.eq('token',token)).unique();
 if(!h?.plan||sideReviewKey(h.plan.personalSides)!==key)throw new ConvexError('Sides changed. Refresh first.');
 if(h.generation&&Date.now()-h.started<120000)throw new ConvexError('Wait for generation.');
 const shared=await ctx.db.query('menuReviews').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();
 const run=await ctx.db.query('personalSideRuns').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();
 if((shared?.operation&&Date.now()-shared.operation.started<120000)||(run&&Date.now()-run.started<120000))throw new ConvexError('Wait for the current replacement.');
 const old=await ctx.db.query('sideReviews').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();
 const fields={householdId:h._id,menuStarted:h.started,key,states:pendingDecisions(h.plan.personalSides?.length??0),history:[]};
 let r=old;if(!r||r.key!==key||r.menuStarted!==h.started){const id=r? r._id:await ctx.db.insert('sideReviews',fields);if(r)await ctx.db.replace(id,fields);r=await ctx.db.get(id);}
 return {h,r:r!};
}
export const decide=mutation({args:{token:v.string(),key:v.string(),index:v.number(),state:v.union(v.literal('accepted'),v.literal('rejected')),reason:v.optional(v.string())},returns:v.null(),handler:async(ctx,a)=>{
 const {h,r}=await load(ctx,a.token,a.key);if(r.operation&&Date.now()-r.operation.started<120000)throw new ConvexError('A side replacement is running.');
 let states;try{states=decideDish(r.states,a.index,a.state,a.reason);}catch(e){throw new ConvexError((e as Error).message);}
 const history=a.state==='rejected'?[...r.history,{index:a.index,dish:h.plan!.personalSides![a.index].dish.name,reason:states[a.index].reason!,at:Date.now()}]:r.history;
 if(history.length>100)throw new ConvexError('Generate a fresh menu after 100 side rejections.');await ctx.db.patch(r._id,{states,history,operation:undefined});return null;
}});
export const start=internalMutation({args:{token:v.string(),key:v.string(),index:v.number(),operation:v.string()},returns:v.object({plan:planV,people:v.array(personV),stock:v.array(stockV),mealCuisines:mealCuisinesV,reason:v.string(),rejectedNames:v.array(v.string())}),handler:async(ctx,a)=>{
 const {h,r}=await load(ctx,a.token,a.key);if(r.operation&&Date.now()-r.operation.started<120000)throw new ConvexError('A side replacement is running.');const d=r.states[a.index];if(!Number.isInteger(a.index)||d?.state!=='rejected'||!d.reason)throw new ConvexError('Reject this side with a reason first.');
 await chargeAiCall(ctx,a.token,Date.now());await ctx.db.patch(r._id,{operation:{id:a.operation,index:a.index,started:Date.now()}});return {plan:h.plan!,people:h.people,stock:h.stock,mealCuisines:initialMealCuisines(h.people,h.mealCuisines),reason:d.reason,rejectedNames:r.history.filter(x=>x.index===a.index).map(x=>x.dish)};
}});
export const complete=internalMutation({args:{token:v.string(),key:v.string(),index:v.number(),operation:v.string(),plan:planV},returns:v.null(),handler:async(ctx,a)=>{
 const {h,r}=await load(ctx,a.token,a.key);if(r.operation?.id!==a.operation||r.operation.index!==a.index)throw new ConvexError('This replacement expired.');
 const before=withHouseholdMeasures(h.plan!),after=withHouseholdMeasures(a.plan);
 if(!sameCalculatedSharedServings(before,after)||(before.personalSides?.length??0)!==(after.personalSides?.length??0))throw new ConvexError('Only this personal side may change.');
 for(let i=0;i<(before.personalSides?.length??0);i++)if(i!==a.index&&JSON.stringify(before.personalSides![i])!==JSON.stringify(after.personalSides![i]))throw new ConvexError('Another side changed.');
 const x=before.personalSides![a.index],y=after.personalSides![a.index];if(x.personIndex!==y.personIndex||x.meal!==y.meal)throw new ConvexError('The recipient or meal changed.');
 await ctx.db.patch(h._id,{plan:a.plan});await ctx.db.patch(r._id,{key:sideReviewKey(a.plan.personalSides),states:r.states.map((s,i)=>i===a.index?{state:'pending' as const}:s),operation:undefined});return null;
}});
export const release=internalMutation({args:{token:v.string(),operation:v.string()},returns:v.null(),handler:async(ctx,a)=>{const h=await ctx.db.query('households').withIndex('by_token',q=>q.eq('token',a.token)).unique();if(h){const r=await ctx.db.query('sideReviews').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();if(r?.operation?.id===a.operation)await ctx.db.patch(r._id,{operation:undefined});}return null;}});
