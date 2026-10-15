'use node';
import { action } from './_generated/server';
import { api,internal,components } from './_generated/api';
import { v,ConvexError } from 'convex/values';
import { Agent } from '@convex-dev/agent';
import { NoObjectGeneratedError } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { personV,stockV,planV,entryV,mealCuisinesV } from './validators';
import { validateInputs,validateDishes,UnsafeMenuError } from '../shared/validation';
import { foods,allowedFood,macroKeys } from '../shared/food';
import { fitMenu } from './lib/menuFit';
import { requestDishes } from './lib/dishRequest';
import { normalizeStock } from './lib/ingredientUnits';
import type {DisplayPlan} from './lib/householdMeasures';
import { withHouseholdMeasures } from './lib/householdMeasures';
import {initialMealCuisines,likesForMenu} from '../shared/cuisines';
const busy='Busy right now. Try again in a few minutes.';
export const generate=action({args:{mealCuisines:v.optional(mealCuisinesV),token:v.string(),people:v.array(personV),stock:v.array(v.union(entryV,stockV))},returns:planV,handler:async(ctx,args):Promise<DisplayPlan>=>{
 const custom=await ctx.runQuery(api.ingredients.list,{token:args.token});const catalog=[...foods,...custom];
 let stock;try{stock=normalizeStock(args.stock,custom);validateInputs(args.people,stock,catalog);}catch(e){throw new ConvexError(e instanceof Error?e.message:'Check your inputs.');}
 const household=await ctx.runQuery(api.households.get,{token:args.token});
 const mealCuisines=args.mealCuisines??initialMealCuisines(args.people,household?.mealCuisines);
 if(!process.env.OPENAI_API_KEY)throw new ConvexError(busy);
 const permitted=catalog.filter(f=>allowedFood(f,args.people));
 const totals=Object.fromEntries(macroKeys.map(k=>[k,args.people.reduce((s,p)=>s+p.target[k],0)]));
 const prompt=`Follow the HOUSEHOLD cuisine selected for EACH meal in mealCuisines. Ignore legacy cuisine words in people's likes/dislikes. Indian meals: Indian dishes with rice or rotis. Continental: egg bakes, grills, soups or salads with bread/toast, pasta or potatoes. Each meal MUST have exactly one main and one staple, plus an optional side (maximum 3 items). Return flat dishes grouped breakfast/lunch/dinner, each with role main/staple/side, name, raw ingredient grams, cooked batch weight and whole-batch protein/carbs/fat/fibre. Staple must match meal cuisine; unstocked staples are allowed under the same 80% rule and become shopping shortages. Use only allowed IDs; never forbidden IDs, even if stocked. All items must be safe for EVERY person. Each item's non-water ingredient types must be at least 80% stocked: one unstocked ID requires FOUR stocked IDs in that item. Include all mustUse ingredients. Maximum 5 non-water ingredients per item. AI selects combinations, NEVER individual portions. Convex calculates portions. Aim for combined MEAL nutrition of 25–40% of each daily macro. HARD PER-ITEM serving caps: 4 eggs (200g raw), 2 cups for rice-containing items (316g cooked), 3 katoris for any item (450g cooked), rotis total at most 4 (160g cooked) and bread at most 4 slices (120g raw) across the meal. Other caps are per item, not combined-meal caps. Main/staple should be distinct; no duplicate items to bypass caps. Choose nutrient-dense combinations, not inflated portions or invented macros. Compact JSON only.
${JSON.stringify({mealCuisines,totals,people:args.people.map(p=>({target:p.target,diet:p.diet,allergies:p.allergies,likesDislikes:likesForMenu(p.preferences)})),stock:stock.filter(s=>permitted.some(f=>f.id===s.id)).map(({id,grams,mustUse})=>({id,grams,mustUse})),allowed:permitted.map(f=>f.id),customNutrition:custom.map(f=>({id:f.id,name:f.name,per100g:{protein:f.estimate.protein,carbs:f.estimate.carbs,fat:f.estimate.fat,fibre:f.estimate.fibre,calories:f.estimate.calories}})),forbidden:catalog.filter(f=>!allowedFood(f,args.people)).map(f=>f.id)})}`;
 if(prompt.split(/\s+/).length>300)throw new ConvexError('Shorten the family preferences to fit this menu request.');
 const generation=crypto.randomUUID();const id=await ctx.runMutation(internal.households.begin,{...args,stock,mealCuisines,generation});
 try{
  const provider=createOpenAI({apiKey:process.env.OPENAI_API_KEY});
  const planner=new Agent(components.agent,{name:'Household menu',languageModel:provider.responses('gpt-6-luna'),maxSteps:1});
  const fitted=await fitMenu({people:args.people,stock,
   request:async feedback=>{const requestPrompt=feedback?`${prompt}\nReplace these poorly fitting dishes with DIFFERENT ingredient mixes, not resized copies. Minimise meal range misses and daily gaps within caps: ${feedback}`:prompt;
    if(requestPrompt.split(/\s+/).length>300)throw new Error('Menu request too long.');
    const dishes=await requestDishes(planner,ctx,generation,requestPrompt);validateDishes(dishes,args.people,stock,mealCuisines,catalog);return dishes;},
   reserve:async()=>{await ctx.runMutation(internal.households.reserveAiCall,{token:args.token,generation});},
   onRetryError:error=>{if(error instanceof UnsafeMenuError)console.error('Menu safety rejection:',JSON.stringify({conflicts:error.conflicts}));else console.warn('Menu replacement unavailable; keeping capped safe portions.');}
  });
  const plan={...withHouseholdMeasures(fitted,custom),mealCuisines};
  await ctx.runMutation(internal.households.finish,{id,generation,plan});return plan;
 }catch(e){
  await ctx.runMutation(internal.households.finish,{id,generation,plan:null});
  if(e instanceof UnsafeMenuError){console.error('Menu safety rejection:',JSON.stringify({conflicts:e.conflicts}));throw new ConvexError(e.message);}
  const detail=e instanceof Error?e.message:'Unknown error';
  const safeDetail=detail.replaceAll(process.env.OPENAI_API_KEY??'__no_key__','[redacted]').replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]').slice(0,500);
  console.error('Menu generation failed:',e instanceof Error?e.name:'Unknown error',safeDetail);
  if(NoObjectGeneratedError.isInstance(e))console.error('Menu output diagnostics:',JSON.stringify({finishReason:e.finishReason,textLength:e.text?.length??0,outputTokens:e.usage?.outputTokens,reasoningTokens:e.usage?.outputTokenDetails.reasoningTokens,parseFailed:true}));
  throw new ConvexError(busy);
 }
}});
