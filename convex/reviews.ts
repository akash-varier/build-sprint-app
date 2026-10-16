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
async function writable(ctx:MutationCtx,token:string,dishKey:string){const loaded=await load(ctx,token,dishKey);if(loaded.review)return {...loaded,review:loaded.review};const fields={householdId:loaded.h._id,menuStarted:loaded.h.started,dishKey,states:pendingDecisions(loaded.h.plan!.dishes.length),history:[],submitted:false};let id=loaded.found?loaded.found._id:await ctx.db.insert('menuReviews',fields);if(loaded.found)await ctx.db.replace(id,fields);return {...loaded,review:(await ctx.db.get(id))!};}
function unlocked(review:{operation?:{started:number}}){if(review.operation&&Date.now()-review.operation.started<120000)throw new ConvexError('A dish replacement is still running. Try again shortly.');}
export const get=query({args:{token:v.string(),dishKey:v.string()},returns:v.union(v.null(),reviewViewV),handler:async(ctx,args)=>{
 if(!args.dishKey)return null;
 try{const {h,review}=await load(ctx,args.token,args.dishKey);const states=review?.states??pendingDecisions(h.plan!.dishes.length);return {dishKey:args.dishKey,states,history:review?.history??[],submitted:review?.submitted??false,allAccepted:allDishesAccepted(states),replacing:!!review?.operation&&Date.now()-review.operation.started<120000};}catch(e){if(e instanceof ConvexError)return null;throw e;}
}});
export const decide=mutation({args:{token:v.string(),dishKey:v.string(),index:v.number(),state:v.union(v.literal('accepted'),v.literal('rejected')),reason:v.optional(v.string())},returns:v.null(),handler:async(ctx,args)=>{
 const {h,review}=await writable(ctx,args.token,args.dishKey);unlocked(review);let states;try{states=decideDish(review.states,args.index,args.state,args.reason);}catch(e){throw new ConvexError((e as Error).message);}
 const history=args.state==='rejected'?[...review.history,{index:args.index,dish:h.plan!.dishes[args.index].name,reason:states[args.index].reason!,at:Date.now()}]:review.history;
 if(history.length>100)throw new ConvexError('This menu has reached 100 rejections. Generate a fresh menu.');
 await ctx.db.patch(review._id,{states,history,submitted:false,operation:undefined});return null;
}});
export const submit=mutation({args:{token:v.string(),dishKey:v.string()},returns:v.null(),handler:async(ctx,args)=>{const {review}=await writable(ctx,args.token,args.dishKey);unlocked(review);if(!allDishesAccepted(review.states))throw new ConvexError('Accept every dish before continuing.');await ctx.db.patch(review._id,{submitted:true});return null;}});
export const start=internalMutation({args:{token:v.string(),dishKey:v.string(),index:v.number(),operation:v.string()},returns:v.object({plan:planV,people:v.array(personV),stock:v.array(stockV),mealCuisines:mealCuisinesV,reason:v.string(),rejectedNames:v.array(v.string())}),handler:async(ctx,args)=>{
 const {h,review}=await writable(ctx,args.token,args.dishKey);unlocked(review);const decision=review.states[args.index];if(!Number.isInteger(args.index)||decision?.state!=='rejected'||!decision.reason)throw new ConvexError('Reject this dish with a reason first.');
 await chargeAiCall(ctx,args.token,Date.now());await ctx.db.patch(review._id,{operation:{id:args.operation,index:args.index,started:Date.now()}});
 return {plan:h.plan!,people:h.people,stock:h.stock,mealCuisines:initialMealCuisines(h.people,h.mealCuisines),reason:decision.reason,rejectedNames:review.history.filter(x=>x.index===args.index).map(x=>x.dish)};
}});
export const complete=internalMutation({args:{token:v.string(),dishKey:v.string(),index:v.number(),operation:v.string(),plan:planV},returns:v.null(),handler:async(ctx,args)=>{
 const {h,review}=await load(ctx,args.token,args.dishKey);if(review?.operation?.id!==args.operation||review.operation.index!==args.index)throw new ConvexError('The replacement expired. Refresh and retry.');
 if(JSON.stringify(initialMealCuisines(h.people,h.mealCuisines))!==JSON.stringify(args.plan.mealCuisines))throw new ConvexError('Meal cuisines changed. Retry this replacement.');
 const before=h.plan!,after=args.plan;if(before.dishes.length!==after.dishes.length||before.people.length!==after.people.length)throw new ConvexError('Only one dish may change.');
 for(let i=0;i<before.dishes.length;i++)if(i!==args.index){if(JSON.stringify(before.dishes[i])!==JSON.stringify(after.dishes[i]))throw new ConvexError('Another dish changed.');for(let p=0;p<before.people.length;p++)if(JSON.stringify(before.people[p].portions[i])!==JSON.stringify(after.people[p].portions[i]))throw new ConvexError('Another portion changed.');}
 await ctx.db.patch(h._id,{plan:after});await ctx.db.patch(review._id,{dishKey:keyOf(after),states:review.states.map((s,i)=>i===args.index?{state:'pending' as const}:s),submitted:false,operation:undefined});return null;
}});
export const release=internalMutation({args:{token:v.string(),operation:v.string()},returns:v.null(),handler:async(ctx,args)=>{const h=await ctx.db.query('households').withIndex('by_token',q=>q.eq('token',args.token)).unique();if(h){const r=await ctx.db.query('menuReviews').withIndex('by_household',q=>q.eq('householdId',h._id)).unique();if(r?.operation?.id===args.operation)await ctx.db.patch(r._id,{operation:undefined});}return null;}});
