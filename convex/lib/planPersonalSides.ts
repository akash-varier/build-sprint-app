'use node';
import {Agent} from '@convex-dev/agent';
import {createOpenAI} from '@ai-sdk/openai';
import {Output} from 'ai';
import {z} from 'zod';
import {components} from '../_generated/api';
import type {ActionCtx} from '../_generated/server';
import {foods,allowedFood,type Person,type Stock,type Dish} from '../../shared/food';
import {singleDishSchema,mealNames,UnsafeMenuError} from '../../shared/validation';
import type {MealCuisines} from '../../shared/cuisines';
import type {CustomFood} from '../../shared/ingredientEstimate';
import type {DisplayPlan} from './householdMeasures';
import {personalSideSlots,attachPersonalSides} from './personalSides';
export const personalSideReply=z.object({sides:z.array(z.object({personIndex:z.number().int().min(0).max(5),dish:singleDishSchema}).strict()).max(18)}).strict();
export async function planPersonalSides(ctx:ActionCtx,options:{plan:DisplayPlan;people:Person[];stock:Stock[];mealCuisines:MealCuisines;custom:CustomFood[];reserve:()=>Promise<void>;meals?:readonly Dish['meal'][]}):Promise<DisplayPlan>{
 const {plan,people,stock,mealCuisines,custom,reserve}=options,meals=options.meals??mealNames,catalog=[...foods,...custom],slots=personalSideSlots(plan,meals);
 if(!slots.length)return attachPersonalSides(plan,[],people,stock,catalog,custom,meals);
 const prompt=`Choose at most ONE small personal side for each listed person/meal shortfall. Shared dishes and portions are fixed. Follow that meal's cuisine. Focus on its biggest shortfall (macro/grams) below 25% of the daily target. Consider ALL macros and avoid worsening existing excesses; choose nutrient-dense foods matching the missing macro. Curd/paneer may suit an eligible vegetarian; chicken/eggs may suit an eligible non-vegetarian. A side is eaten ONLY by its personIndex: obey ONLY that recipient's diet/allergies and allowed IDs, not other people's restrictions. Every side still needs at least 80% of its non-water ingredient TYPES stocked: one missing ID requires FOUR stocked IDs. Missing quantities/ingredients become shopping shortages; availability is not a portion cap. Never use unlisted IDs. Return dish meal, role side, name, cooked batch weight, total batch protein/carbs/fat/fibre and raw ingredient grams. NEVER return per-person portions: Convex scales each batch to the shortfall. Existing serving caps: 4 eggs/200g raw per item, rice item316g cooked, any item450g cooked; bread120g raw and rotis160g cooked across that person's meal including shared items. Slots list remaining bread/roti allowances. If an allowance is zero, choose a different side, never more bread/toast or rotis. Return no side for an impossible slot. Compact JSON only.\n${JSON.stringify({customNutrition:custom.map(f=>({id:f.id,name:f.name,per100g:{protein:f.estimate.protein,carbs:f.estimate.carbs,fat:f.estimate.fat,fibre:f.estimate.fibre}})),slots:slots.map(s=>({...s,cuisine:mealCuisines[s.meal]})),people:people.map((p,personIndex)=>({personIndex,diet:p.diet,allergies:p.allergies,allowed:catalog.filter(f=>allowedFood(f,[p])).map(f=>f.id)})),stock:stock.map(s=>({id:s.id,grams:s.grams})),shared:plan.dishes.map((d,i)=>({meal:d.meal,name:d.name,ingredients:d.ingredients,portions:plan.people.map(p=>p.portions[i].grams)}))})}`;
 if(prompt.split(/\s+/).length>300)throw new Error('Personal side request exceeds the 300-word limit.');
 await reserve();
 const agent=new Agent(components.agent,{name:'Personal meal sides',languageModel:createOpenAI({apiKey:process.env.OPENAI_API_KEY}).responses('gpt-6-luna'),maxSteps:1});
 const result=await agent.generateText(ctx,{userId:crypto.randomUUID()},{prompt,output:Output.object({schema:personalSideReply}),maxOutputTokens:4000,maxRetries:0,providerOptions:{openai:{reasoningEffort:'low'}},abortSignal:AbortSignal.timeout(60000)},{contextOptions:{recentMessages:0,searchOtherThreads:false},storageOptions:{saveMessages:'none'}});
 const candidates=personalSideReply.parse(result.output).sides;const fitted=attachPersonalSides(plan,candidates,people,stock,catalog,custom,meals);
 return fitted.personalSides?.filter(s=>meals.includes(s.meal)).length===slots.length?fitted:{...fitted,sideNotice:'Some meal gaps remain without a suitable capped personal side. The shared dishes and portions are unchanged.'};
}
export function sideFailure(error:unknown){
 if(error instanceof UnsafeMenuError){console.error('Personal side safety rejection:',JSON.stringify({conflicts:error.conflicts}));return 'A personal side conflicted with its recipient’s diet or allergy and was not saved. Shared dishes are unchanged.';}
 const detail=(error instanceof Error?error.message:'Unknown side error').replaceAll(process.env.OPENAI_API_KEY??'__no_key__','[redacted]').replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]').slice(0,500);console.error('Personal side planning failed:',detail);return 'Personal sides could not be prepared. Shared dishes and their honest gaps are shown; try finding personal sides again.';
}
