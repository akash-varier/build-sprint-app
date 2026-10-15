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
import { fitMenu } from './lib/menuFit';
import { requestDishes } from './lib/dishRequest';
import { normalizeStock } from './lib/ingredientUnits';
import { withHouseholdMeasures } from './lib/householdMeasures';
const busy='Busy right now. Try again in a few minutes.';
export const generate=action({args:{token:v.string(),people:v.array(personV),stock:v.array(v.union(entryV,stockV))},returns:planV,handler:async(ctx,args)=>{
 let stock;try{stock=normalizeStock(args.stock);validateInputs(args.people,stock);}catch(e){throw new ConvexError(e instanceof Error?e.message:'Check your inputs.');}
 if(!process.env.OPENAI_API_KEY)throw new ConvexError(busy);
 const permitted=foods.filter(f=>allowedFood(f,args.people));
 const totals=Object.fromEntries(macroKeys.map(k=>[k,args.people.reduce((s,p)=>s+p.target[k],0)]));
 const prompt=`Choose breakfast, lunch, dinner in order. Shared dishes must use only allowed IDs and satisfy every diet/allergy. NEVER use forbidden IDs, even if stocked. Use stocked allowed ingredients. One unstocked ingredient is allowed ONLY alongside at least FOUR different stocked ingredients in that dish (80% rule); otherwise use no unstocked ingredients. At most 5 non-water ingredients. Include all mustUse items. Return compact JSON: dish names, raw ingredient grams, realistic cooked batch weights and total batch protein/carbs/fat/fibre. Do not calculate individual portions. Convex handles portions. Each meal aims for 25–40% of each person's daily macro targets. HARD per-person meal caps: 4 eggs (200g raw), rice-containing dish 316g cooked (2 cups), every dish 450g cooked (3 katoris). Choose nutrient-dense, varied ingredient mixes that can meet targets within these caps. Prefer legumes over repeating rice/eggs; dairy or meat only if allowed for EVERY person. Never invent macros or batch weights to bypass caps.
${JSON.stringify({totals,people:args.people.map(p=>({target:p.target,diet:p.diet,allergies:p.allergies,preferences:p.preferences})),stock:stock.filter(s=>permitted.some(f=>f.id===s.id)).map(({id,grams,mustUse})=>({id,grams,mustUse})),allowed:permitted.map(f=>f.id),forbidden:foods.filter(f=>!allowedFood(f,args.people)).map(f=>f.id)})}`;
 if(prompt.split(/\s+/).length>300)throw new ConvexError('Shorten the family preferences to fit this menu request.');
 const generation=crypto.randomUUID();const id=await ctx.runMutation(internal.households.begin,{...args,stock,generation});
 try{
  const provider=createOpenAI({apiKey:process.env.OPENAI_API_KEY});
  const planner=new Agent(components.agent,{name:'Household menu',languageModel:provider.responses('gpt-6-luna'),maxSteps:1});
  const fitted=await fitMenu({people:args.people,stock,
   request:async feedback=>{const requestPrompt=feedback?`${prompt}\nReplace these poorly fitting dishes with DIFFERENT ingredient mixes, not resized copies. Minimise meal range misses and daily gaps within caps: ${feedback}`:prompt;
    if(requestPrompt.split(/\s+/).length>300)throw new Error('Menu request too long.');
    const dishes=await requestDishes(planner,ctx,generation,requestPrompt);validateDishes(dishes,args.people,stock);return dishes;},
   reserve:async()=>{await ctx.runMutation(internal.households.reserveAiCall,{token:args.token,generation});},
   onRetryError:error=>{if(error instanceof UnsafeMenuError)console.error('Menu safety rejection:',JSON.stringify({conflicts:error.conflicts}));else console.warn('Menu replacement unavailable; keeping capped safe portions.');}
  });
  const plan=withHouseholdMeasures(fitted);
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
