import {recordFinished} from './runSteps';
import {acceptPending} from '../shared/bulkReview';
import {sideReviewKey,sideDecisions,sidesAccepted} from '../shared/sideReview';
import {v,ConvexError} from 'convex/values';
import {query,mutation,internalMutation,type MutationCtx,type QueryCtx} from './_generated/server';
import {personV,stockV,planV,mealCuisinesV,reviewViewV} from './validators';
import {pendingDecisions,allDishesAccepted,decideDish,dishReviewKey} from '../shared/review';
import {initialMealCuisines} from '../shared/cuisines';
import {chargeAiCall} from './households';
const keyOf=(plan:{dishes:import('../shared/food').Dish[]})=>dishReviewKey(plan.dishes);
async function load(ctx:QueryCtx|MutationCtx,token:string,dishKey:string){
 if(!/^[a-f0-9]{64}$/.test(token))throw new ConvexError('Open your kitchen again.');
 const h=await ctx.db.query('households').withIndex('by_token',q=>q.eq('token',token)).unique();
 if(!h?.plan||keyOf(h.plan)!==dishKey)throw new ConvexError('This menu changed. Refresh to review the latest dishes.');
 if(h.generation&&Date.now()-h.started<120000)throw new ConvexError('Wait for the current menu to finish.');
 const found=await ctx.db.query('menuReviews').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();
 const review=found?.dishKey===dishKey&&found.menuStarted===h.started?found:null;return {h,review,found};
}
async function writable(ctx:MutationCtx,token:string,dishKey:string){const loaded=await load(ctx,token,dishKey);const sr=await ctx.db.query('sideReviews').withIndex('by_household',q=>q.eq('householdId',loaded.h._id)).unique();if(sr?.operation&&Date.now()-sr.operation.started<120000)throw new ConvexError('Wait for the personal side replacement.');if(loaded.review)return {...loaded,review:loaded.review};const fields={householdId:loaded.h._id,menuStarted:loaded.h.started,dishKey,states:pendingDecisions(loaded.h.plan!.dishes.length),history:[],submitted:false};let id=loaded.found?loaded.found._id:await ctx.db.insert('menuReviews',fields);if(loaded.found)await ctx.db.replace(id,fields);return {...loaded,review:(await ctx.db.get(id))!};}
function unlocked(review:{operation?:{started:number}}){if(review.operation&&Date.now()-review.operation.started<120000)throw new ConvexError('A dish replacement is still running. Try again shortly.');}
export const get=query({args:{token:v.string(),dishKey:v.string()},returns:v.union(v.null(),reviewViewV),handler:async(ctx,args)=>{
 if(!args.dishKey)return null;
 try{const {h,review}=await load(ctx,args.token,args.dishKey);const states=review?.states??pendingDecisions(h.plan!.dishes.length);const sides=h.plan!.personalSides??[],sideReview=await ctx.db.query('sideReviews').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();return {sideKey:sideReviewKey(sides),sideStates:sideDecisions(sides,h.started,sideReview),dishKey:args.dishKey,states,history:review?.history??[],submitted:review?.submitted??false,allAccepted:allDishesAccepted(states)&&sidesAccepted(sides,h.started,sideReview),replacing:(!!review?.operation&&Date.now()-review.operation.started<120000)||(!!sideReview?.operation&&Date.now()-sideReview.operation.started<120000)};}catch(e){if(e instanceof ConvexError)return null;throw e;}
}});
export const decide=mutation({args:{token:v.string(),dishKey:v.string(),index:v.number(),state:v.union(v.literal('accepted'),v.literal('rejected')),reason:v.optional(v.string())},returns:v.null(),handler:async(ctx,args)=>{
 const {h,review}=await writable(ctx,args.token,args.dishKey);unlocked(review);let states;try{states=decideDish(review.states,args.index,args.state,args.reason);}catch(e){throw new ConvexError((e as Error).message);}
 const history=args.state==='rejected'?[...review.history,{index:args.index,dish:h.plan!.dishes[args.index].name,reason:states[args.index].reason!,at:Date.now()}]:review.history;
 if(history.length>100)throw new ConvexError('This menu has reached 100 rejections. Generate a fresh menu.');
 await ctx.db.patch(review._id,{states,history,submitted:false,operation:undefined});return null;
}});
export const submit=mutation({args:{token:v.string(),dishKey:v.string()},returns:v.null(),handler:async(ctx,args)=>{const {h,review}=await writable(ctx,args.token,args.dishKey);unlocked(review);const sr=await ctx.db.query('sideReviews').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();if(!sidesAccepted(h.plan!.personalSides??[],h.started,sr))throw new ConvexError('Accept every personal side before continuing.');if(!allDishesAccepted(review.states))throw new ConvexError('Accept every dish before continuing.');await ctx.db.patch(review._id,{submitted:true});await recordFinished(ctx,h._id,h.started,'accept.submit',Date.now());return null;}});
export const start=internalMutation({args:{token:v.string(),dishKey:v.string(),index:v.number(),operation:v.string()},returns:v.object({plan:planV,people:v.array(personV),stock:v.array(stockV),mealCuisines:mealCuisinesV,reason:v.string(),rejectedNames:v.array(v.string())}),handler:async(ctx,args)=>{
 const {h,review}=await writable(ctx,args.token,args.dishKey);unlocked(review);const sideRun=await ctx.db.query('personalSideRuns').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();if(sideRun&&Date.now()-sideRun.started<120000)throw new ConvexError('Wait for personal sides to finish.');const decision=review.states[args.index];if(!Number.isInteger(args.index)||decision?.state!=='rejected'||!decision.reason)throw new ConvexError('Reject this dish with a reason first.');
 await chargeAiCall(ctx,args.token,Date.now());await ctx.db.patch(review._id,{operation:{id:args.operation,index:args.index,started:Date.now()}});
 return {plan:h.plan!,people:h.people,stock:h.stock,mealCuisines:initialMealCuisines(h.people,h.mealCuisines),reason:decision.reason,rejectedNames:review.history.filter(x=>x.index===args.index).map(x=>x.dish)};
}});
export const complete=internalMutation({args:{token:v.string(),dishKey:v.string(),index:v.number(),operation:v.string(),plan:planV},returns:v.null(),handler:async(ctx,args)=>{
 const {h,review}=await load(ctx,args.token,args.dishKey);if(review?.operation?.id!==args.operation||review.operation.index!==args.index)throw new ConvexError('The replacement expired. Refresh and retry.');
 if(JSON.stringify(initialMealCuisines(h.people,h.mealCuisines))!==JSON.stringify(args.plan.mealCuisines))throw new ConvexError('Meal cuisines changed. Retry this replacement.');
 const before=h.plan!,after=args.plan;if(before.dishes.length!==after.dishes.length||before.people.length!==after.people.length)throw new ConvexError('Only one dish may change.');
 for(let i=0;i<before.dishes.length;i++)if(i!==args.index){
  const a=before.dishes[i],b=after.dishes[i],scale=a.weight>0?b.weight/a.weight:1;
  if(a.name!==b.name||a.role!==b.role||a.meal!==b.meal||a.ingredients.length!==b.ingredients.length||a.ingredients.some((x,j)=>x.id!==b.ingredients[j].id||Math.abs(x.grams*scale-b.ingredients[j].grams)>1e-6)||(['protein','carbs','fat','fibre'] as const).some(k=>Math.abs(a.macros[k]*scale-b.macros[k])>1e-6))throw new ConvexError('Another recipe changed.');
  for(let p=0;p<before.people.length;p++)if(a.role!=='staple'&&after.people[p].portions[i].grams>before.people[p].portions[i].grams+1e-7)throw new ConvexError('Another shared portion increased.');
 }
 await ctx.db.patch(h._id,{plan:after});await ctx.db.patch(review._id,{dishKey:keyOf(after),states:review.states.map((s,i)=>i===args.index?{state:'pending' as const}:s),submitted:false,operation:undefined});return null;
}});
export const release=internalMutation({args:{token:v.string(),operation:v.string()},returns:v.null(),handler:async(ctx,args)=>{const h=await ctx.db.query('households').withIndex('by_token',q=>q.eq('token',args.token)).unique();if(h){const r=await ctx.db.query('menuReviews').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();if(r?.operation?.id===args.operation)await ctx.db.patch(r._id,{operation:undefined});}return null;}});

export const acceptAll=mutation({args:{token:v.string(),dishKey:v.string(),sideKey:v.string()},returns:v.null(),handler:async(ctx,a)=>{
 const acceptedAt=Date.now();
 const {h,review}=await writable(ctx,a.token,a.dishKey);unlocked(review);
 if(sideReviewKey(h.plan!.personalSides)!==a.sideKey)throw new ConvexError('Personal sides changed. Refresh first.');
 const run=await ctx.db.query('personalSideRuns').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();if(run&&Date.now()-run.started<120000)throw new ConvexError('Wait for personal sides to finish.');
 const sr=await ctx.db.query('sideReviews').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();
 const valid=sr?.key===a.sideKey&&sr.menuStarted===h.started;
 const fields={householdId:h._id,menuStarted:h.started,key:a.sideKey,states:acceptPending(sideDecisions(h.plan!.personalSides??[],h.started,sr)),history:valid?sr.history:[]};
 if(sr)await ctx.db.replace(sr._id,fields);else await ctx.db.insert('sideReviews',fields);
 await ctx.db.patch(review._id,{states:acceptPending(review.states),submitted:false});await recordFinished(ctx,h._id,h.started,'accept_all',acceptedAt);return null;
}});
