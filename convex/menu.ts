'use node';
import { action } from './_generated/server';
import { internal,components } from './_generated/api';
import { v,ConvexError } from 'convex/values';
import { Agent } from '@convex-dev/agent';
import { NoObjectGeneratedError } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { personV,stockV,planV,entryV } from './validators';
import { validateInputs,validateDishes,UnsafeMenuError } from '../shared/validation';
import { foods,allowedFood,macroKeys } from '../shared/food';
import { calculatePlan } from './lib/portions';
import { requestDishes } from './lib/dishRequest';
import { normalizeStock } from './lib/ingredientUnits';
import { withHouseholdMeasures } from './lib/householdMeasures';
const busy='Busy right now. Try again in a few minutes.';
export const generate=action({args:{token:v.string(),people:v.array(personV),stock:v.array(v.union(entryV,stockV))},returns:planV,handler:async(ctx,args)=>{
 let stock;try{stock=normalizeStock(args.stock);validateInputs(args.people,stock);}catch(e){throw new ConvexError(e instanceof Error?e.message:'Check your inputs.');}
 if(!process.env.OPENAI_API_KEY)throw new ConvexError(busy);
 const permitted=foods.filter(f=>allowedFood(f,args.people));
 const totals=Object.fromEntries(macroKeys.map(k=>[k,args.people.reduce((s,p)=>s+p.target[k],0)]));
 const prompt=`Quickly choose breakfast, lunch and dinner, in that order, for this household. Use simple dishes and rough batch nutrition estimates. Do NOT solve targets or calculate individual portions: Convex handles that. Prefer varied nutrition ratios guided by the daily totals. Only allowed ingredient IDs; respect all diets/allergies/preferences. Each dish: at least 80% non-water ingredient IDs from stock; at most 5 non-water ingredients. Include all mustUse items across the menu. Return compact JSON only: short dish names, raw ingredient grams, cooked batch weight, total batch protein/carbs/fat/fibre. Use integer weights and one decimal for macros.
${JSON.stringify({totals,people:args.people.map(p=>({diet:p.diet,allergies:p.allergies,preferences:p.preferences})),stock:stock.map(({id,grams,mustUse})=>({id,grams,mustUse})),allowed:permitted.map(f=>f.id)})}`;
 if(prompt.split(/\s+/).length>300)throw new ConvexError('Shorten the family preferences to fit this menu request.');
 const generation=crypto.randomUUID();const id=await ctx.runMutation(internal.households.begin,{...args,stock,generation});
 try{
  const provider=createOpenAI({apiKey:process.env.OPENAI_API_KEY});
  const planner=new Agent(components.agent,{name:'Household menu',languageModel:provider.responses('gpt-6-luna'),maxSteps:1});
  const dishes=await requestDishes(planner,ctx,generation,prompt);validateDishes(dishes,args.people,stock);
  const plan=withHouseholdMeasures(calculatePlan(dishes,args.people,stock));
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
