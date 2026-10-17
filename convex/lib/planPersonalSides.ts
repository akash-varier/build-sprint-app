'use node';
import {Agent} from '@convex-dev/agent';
import {createOpenAI} from '@ai-sdk/openai';
import {Output} from 'ai';
import {z} from 'zod';
import {components} from '../_generated/api';
import type {ActionCtx} from '../_generated/server';
import {foods,allowedFood,type Person,type Stock,type Dish} from '../../shared/food';
import {singleDishSchema,mealNames,UnsafeMenuError} from '../../shared/validation';
import {likesForMenu,type MealCuisines} from '../../shared/cuisines';
import type {CustomFood} from '../../shared/ingredientEstimate';
import type {DisplayPlan} from './householdMeasures';
import {personalSideSlots,attachPersonalSides,attachPersonalSideAlternatives} from './personalSides';
export const personalSideReply=z.object({sides:z.array(z.object({personIndex:z.number().int().min(0).max(5),meal:z.enum(['breakfast','lunch','dinner']),options:z.array(singleDishSchema).min(1).max(4)}).strict()).max(18)}).strict();
export async function planPersonalSides(ctx:ActionCtx,options:{plan:DisplayPlan;people:Person[];stock:Stock[];mealCuisines:MealCuisines;custom:CustomFood[];reserve:()=>Promise<void>;meals?:readonly Dish['meal'][]}):Promise<DisplayPlan>{
 const {plan,people,stock,mealCuisines,custom,reserve}=options,meals=options.meals??mealNames,catalog=[...foods,...custom],slots=personalSideSlots(plan,meals);
 const required=stock.filter(s=>s.mustUse&&!allowedFood(catalog.find(f=>f.id===s.id)!,people));
 const missing=(p:DisplayPlan)=>required.filter(s=>!p.personalSides?.some(side=>side.dish.ingredients.some(i=>i.id===s.id&&i.grams>0)));
 const report=(p:DisplayPlan):DisplayPlan=>missing(p).length?{...p,sideNotice:`Must-use ${missing(p).map(s=>catalog.find(f=>f.id===s.id)!.name).join(', ')} could not fit a safe personal side within the existing portion limits. Shared dishes are unchanged.`}:p;
 if(!slots.length)return report(attachPersonalSides(plan,[],people,stock,catalog,custom,meals));
 const prompt=`For every slot return one group with THREE different side options, all matching personIndex/meal and cuisine. Shared recipes/portions stay fixed. Priorities: recipient diet/allergy, cuisine/preferences, daily macros, fridge. Use only that person's allowed IDs. Buying is allowed. AI returns batch recipes/macros only; Convex calculates portions. Each person gets at most one side per meal, at least 50g cooked; egg sides need one whole egg. Never dilute oil with water to fake a serving. Include a real vegetable/salad side with enough oil to close fat and little protein/carbs when those daily budgets are tight. Also offer balanced protein/fat options, not only lean chicken/egg whites. Close the biggest daily shortfall while leaving room for later sides. Daily protein/carbs/fat ceilings are target+5g; fibre has no ceiling. If already over a ceiling, add ZERO of that macro. Aim for combined meal 25–40% of daily targets. Use dailyActual, actual and target. Caps: egg200g raw/item, rice316g cooked/item, any item450g; bread120g raw and rotis160g cooked/person/meal including shared portions. Slots give remaining bread/roti room. personalMustUse goes only to eligible recipients: include it in every option for ONE eligible slot, leaving other slots free for fat-rich sides. Never put it in shared food. Return name, meal, role side, cooked batch weight, batch protein/carbs/fat/fibre and raw ingredient grams. All macros must be realistic: fibre<=carbs and protein+carbs+fat<=weight. Include every slot, even if fitting looks difficult; code omits unfit options. Compact JSON only.\n${JSON.stringify({personalMustUse:required.map(s=>({id:s.id,eligible:people.flatMap((p,i)=>allowedFood(catalog.find(f=>f.id===s.id)!,[p])?[i]:[])})),customNutrition:custom.map(f=>({id:f.id,name:f.name,per100g:{protein:f.estimate.protein,carbs:f.estimate.carbs,fat:f.estimate.fat,fibre:f.estimate.fibre}})),slots:slots.map(s=>({...s,cuisine:mealCuisines[s.meal]})),people:people.map((p,personIndex)=>({personIndex,diet:p.diet,allergies:p.allergies,likesDislikes:likesForMenu(p.preferences),allowed:catalog.filter(f=>allowedFood(f,[p])).map(f=>f.id)})),stock:stock.map(s=>({id:s.id,grams:s.grams})),shared:plan.dishes.map((d,i)=>({meal:d.meal,name:d.name,ingredients:d.ingredients,portions:plan.people.map(p=>p.portions[i].grams)}))})}`;
 if(prompt.split(/\s+/).length>300)throw new Error('Personal side request exceeds the 300-word limit.');
 await reserve();
 const agent=new Agent(components.agent,{name:'Personal meal sides',languageModel:createOpenAI({apiKey:process.env.OPENAI_API_KEY}).responses('gpt-6-luna'),maxSteps:1});
 const result=await agent.generateText(ctx,{userId:crypto.randomUUID()},{prompt,output:Output.object({schema:personalSideReply.extend({sides:personalSideReply.shape.sides.length(slots.length)})}),maxOutputTokens:4000,maxRetries:0,providerOptions:{openai:{reasoningEffort:'low'}},abortSignal:AbortSignal.timeout(60000)},{contextOptions:{recentMessages:0,searchOtherThreads:false},storageOptions:{saveMessages:'none'}});
 const candidates=personalSideReply.parse(result.output).sides;console.info('Personal side candidate checks:',JSON.stringify(candidates.map(g=>({personIndex:g.personIndex,meal:g.meal,options:g.options.map(d=>({name:d.name,macros:d.macros}))}))));const fitted=attachPersonalSideAlternatives(plan,candidates,people,stock,catalog,custom,meals);
 return report(fitted.personalSides?.filter(s=>meals.includes(s.meal)).length===slots.length?fitted:{...fitted,sideNotice:'Some meal gaps remain without a suitable capped personal side. The shared dishes and portions are unchanged.'});
}
export function sideFailure(error:unknown){
 if(error instanceof UnsafeMenuError){console.error('Personal side safety rejection:',JSON.stringify({conflicts:error.conflicts}));return 'A personal side conflicted with its recipient’s diet or allergy and was not saved. Shared dishes are unchanged.';}
 const detail=(error instanceof Error?error.message:'Unknown side error').replaceAll(process.env.OPENAI_API_KEY??'__no_key__','[redacted]').replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]').slice(0,500);console.error('Personal side planning failed:',detail);return 'Personal sides could not be prepared. Shared dishes and their honest gaps are shown; try finding personal sides again.';
}
