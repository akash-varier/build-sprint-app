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
 const prompt=`Choose three shared meals following EACH person's saved cuisine preference. Continental meals should look Continental: egg bakes, vegetable grills, soups, salads, etc. Each meal MUST have exactly one main and one staple, plus an optional side (maximum 3 items). Return flat dishes grouped breakfast/lunch/dinner, each with role main/staple/side, name, raw ingredient grams, cooked batch weight and whole-batch protein/carbs/fat/fibre. Staple must use a stocked staple ID: bread/toast, pasta, potato, rice, oats or atta as cuisine suits. Use only allowed IDs; never forbidden IDs, even if stocked. All items must be safe for EVERY person. Each item's non-water ingredient types must be at least 80% stocked: one unstocked ID requires FOUR stocked IDs in that item. Include all mustUse ingredients. Maximum 5 non-water ingredients per item. AI selects combinations, NEVER individual portions. Convex calculates portions. Aim for combined MEAL nutrition of 25–40% of each daily macro. HARD PER-ITEM serving caps: 4 eggs (200g raw), 2 cups for rice-containing items (316g cooked), 3 katoris for any item (450g cooked), bread additionally totals at most 4 slices (120g raw) across the meal. Other caps are per item, not combined-meal caps. Main/staple should be distinct; no duplicate items to bypass caps. Choose nutrient-dense combinations, not inflated portions or invented macros. Compact JSON only.
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
