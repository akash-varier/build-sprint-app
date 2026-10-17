import {z} from 'zod';
import type {Food} from '../../shared/food';
import type {DisplayPlan} from './householdMeasures';
import type {HandoffPage} from '../../shared/handoff';
export const methodReply=z.object({methods:z.array(z.object({key:z.string(),steps:z.array(z.string().trim().min(1).max(220).refine(s=>!/(https?:|www\.|youtube\.com)/i.test(s),'No links in cooking steps.')).min(3).max(5)}).strict()).max(33)}).strict();
export function safeHandoffPage(page:HandoffPage):HandoffPage{
 const safe=(item:HandoffPage['sides'][number]|HandoffPage['dishes'][number])=>({...item,steps:item.steps.map(step=>/\b(portions?|servings?|divide|split|serve)\b/i.test(step)?'Serve the saved cooked portions shown above.':step.replace(/[^\p{Script=Latin}\p{N}\p{P}\p{Z}\p{S}\s]/gu,'').replace(/\s+/g,' ').trim())});
 return {...page,dishes:page.dishes.map(d=>safe(d) as HandoffPage['dishes'][number]),sides:page.sides.map(d=>safe(d) as HandoffPage['sides'][number])};
}
export function handoffRecipes(plan:DisplayPlan){return [...plan.dishes.map((d,j)=>({key:`dish-${j}`,dish:d})),...(plan.personalSides??[]).map((s,j)=>({key:`side-${j}`,dish:s.dish}))];}
export function buildHandoffPage(plan:DisplayPlan,catalog:Food[],reply:unknown):HandoffPage{
 const methods=methodReply.parse(reply).methods,recipes=handoffRecipes(plan);
 if(methods.length!==recipes.length||new Set(methods.map(m=>m.key)).size!==recipes.length||recipes.some(r=>!methods.some(m=>m.key===r.key)))throw new Error('Cooking methods must match every saved dish and side exactly.');
 const item=(key:string,d:DisplayPlan['dishes'][number],measures:string[])=>({key,meal:d.meal,name:d.name,grams:d.weight,ingredients:d.ingredients.map((i,k)=>{const f=catalog.find(f=>f.id===i.id);if(!f)throw new Error('Unknown saved ingredient.');return {name:f.name,grams:i.grams,measure:measures[k]};}),steps:methods.find(m=>m.key===key)!.steps});
 return safeHandoffPage({dishes:plan.dishes.map((d,j)=>({...item(`dish-${j}`,d,plan.dishIngredientMeasures[j]),main:d.role==='main'||!d.role,portions:plan.people.map((p,personIndex)=>({personIndex,name:p.name,grams:p.portions[j].grams,measure:p.portions[j].measure}))})),sides:(plan.personalSides??[]).map((s,j)=>({...item(`side-${j}`,s.dish,s.ingredientMeasures??[]),personIndex:s.personIndex,person:plan.people[s.personIndex].name,measure:s.measure??`${s.dish.weight} g`})),people:plan.people.map(p=>({name:p.name,target:p.target,actual:p.total}))});
}
