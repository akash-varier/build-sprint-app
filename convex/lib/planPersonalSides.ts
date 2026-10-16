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
import {personalSideSlots,attachPersonalSides,attachPersonalSideAlternatives} from './personalSides';
export const personalSideReply=z.object({sides:z.array(z.object({personIndex:z.number().int().min(0).max(5),meal:z.enum(['breakfast','lunch','dinner']),options:z.array(singleDishSchema).min(1).max(4)}).strict()).max(18)}).strict();
export async function planPersonalSides(ctx:ActionCtx,options:{plan:DisplayPlan;people:Person[];stock:Stock[];mealCuisines:MealCuisines;custom:CustomFood[];reserve:()=>Promise<void>;meals?:readonly Dish['meal'][]}):Promise<DisplayPlan>{
 const {plan,people,stock,mealCuisines,custom,reserve}=options,meals=options.meals??mealNames,catalog=[...foods,...custom],slots=personalSideSlots(plan,meals);
 if(!slots.length)return attachPersonalSides(plan,[],people,stock,catalog,custom,meals);
 const prompt=`For each eligible person/meal, propose ONE side plus up to THREE alternatives, best first, in options. Return exactly one group per personIndex/meal; every option must have that same meal. Shared dishes/portions are fixed. Follow meal cuisine. Close the person's biggest DAILY shortfall first, not just protein. For missing fat consider safe nuts, peanuts, seeds or oil-based sides. Daily protein/carbs/fat must not exceed target+5g; fibre has no ceiling. If a shared macro already exceeds its ceiling, sides must contain ZERO of that macro. Use dailyActual and target to choose combinations that fit. Convex sizes portions within remaining daily budgets and the existing 25–40% meal ranges. Never return individual portions. Each side is ONLY for its personIndex; obey that person's own diet/allergies and allowed IDs. At least 80% of non-water ingredient TYPES must be stocked (one missing requires four stocked). Missing quantities become shopping shortages. Never invent IDs. Return meal, role side, name, cooked batch weight, batch protein/carbs/fat/fibre, raw ingredient grams. Caps: egg200g raw/item, rice item316g cooked, any item450g; bread120g raw and rotis160g cooked/person/meal including shared portions. Slots give remaining bread/roti room. Choose genuinely different alternatives that fit the daily budgets. Include every slot, even when fitting looks impossible; supply alternatives for Convex to test before omitting a side. Compact JSON only.\n${JSON.stringify({customNutrition:custom.map(f=>({id:f.id,name:f.name,per100g:{protein:f.estimate.protein,carbs:f.estimate.carbs,fat:f.estimate.fat,fibre:f.estimate.fibre}})),slots:slots.map(s=>({...s,cuisine:mealCuisines[s.meal]})),people:people.map((p,personIndex)=>({personIndex,diet:p.diet,allergies:p.allergies,allowed:catalog.filter(f=>allowedFood(f,[p])).map(f=>f.id)})),stock:stock.map(s=>({id:s.id,grams:s.grams})),shared:plan.dishes.map((d,i)=>({meal:d.meal,name:d.name,ingredients:d.ingredients,portions:plan.people.map(p=>p.portions[i].grams)}))})}`;
 if(prompt.split(/\s+/).length>300)throw new Error('Personal side request exceeds the 300-word limit.');
 await reserve();
 const agent=new Agent(components.agent,{name:'Personal meal sides',languageModel:createOpenAI({apiKey:process.env.OPENAI_API_KEY}).responses('gpt-6-luna'),maxSteps:1});
 const result=await agent.generateText(ctx,{userId:crypto.randomUUID()},{prompt,output:Output.object({schema:personalSideReply.extend({sides:personalSideReply.shape.sides.length(slots.length)})}),maxOutputTokens:4000,maxRetries:0,providerOptions:{openai:{reasoningEffort:'low'}},abortSignal:AbortSignal.timeout(60000)},{contextOptions:{recentMessages:0,searchOtherThreads:false},storageOptions:{saveMessages:'none'}});
 const candidates=personalSideReply.parse(result.output).sides;console.info('Personal side candidate checks:',JSON.stringify(candidates.map(g=>({personIndex:g.personIndex,meal:g.meal,options:g.options.map(d=>({name:d.name,macros:d.macros}))}))));const fitted=attachPersonalSideAlternatives(plan,candidates,people,stock,catalog,custom,meals);
 return fitted.personalSides?.filter(s=>meals.includes(s.meal)).length===slots.length?fitted:{...fitted,sideNotice:'Some meal gaps remain without a suitable capped personal side. The shared dishes and portions are unchanged.'};
}
export function sideFailure(error:unknown){
 if(error instanceof UnsafeMenuError){console.error('Personal side safety rejection:',JSON.stringify({conflicts:error.conflicts}));return 'A personal side conflicted with its recipient’s diet or allergy and was not saved. Shared dishes are unchanged.';}
 const detail=(error instanceof Error?error.message:'Unknown side error').replaceAll(process.env.OPENAI_API_KEY??'__no_key__','[redacted]').replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]').slice(0,500);console.error('Personal side planning failed:',detail);return 'Personal sides could not be prepared. Shared dishes and their honest gaps are shown; try finding personal sides again.';
}
