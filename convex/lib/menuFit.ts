import {macroKeys,type Dish,type Person,type Stock} from '../../shared/food';
import {calculatePlan,type MealPlan} from './portions';
export function needsBetterDishes(plan:MealPlan){return plan.people.some(p=>!p.withinTolerance||p.meals.some(x=>!x.mealCheck.withinRange));}
function score(plan:MealPlan){
 const meal=Math.max(...plan.people.flatMap(p=>p.meals.flatMap(x=>macroKeys.map(k=>Math.abs(x.mealCheck.rangeGaps[k])/Math.max(p.target[k],1)))));
 const daily=Math.max(...plan.people.flatMap(p=>macroKeys.map(k=>Math.abs(p.gaps[k]))));
 return [meal,daily];
}
export function preferCandidate(current:MealPlan,candidate:MealPlan){
 const a=score(current),b=score(candidate);return b[0]<a[0]-1e-6||(Math.abs(b[0]-a[0])<=1e-6&&b[1]<a[1]-1e-6);
}
export async function fitMenu(options:{people:Person[];stock:Stock[];request:(feedback?:string)=>Promise<Dish[]>;reserve:()=>Promise<void>;onRetryError:(error:unknown)=>void}){
 let plan=calculatePlan(await options.request(),options.people,options.stock);
 if(needsBetterDishes(plan)){
  const feedback=JSON.stringify({replace:plan.dishes.map(d=>({name:d.name,ids:d.ingredients.map(i=>i.id)})),fit:plan.people.map(p=>({gaps:p.gaps,mealRangeGaps:p.meals.map(x=>x.mealCheck.rangeGaps)}))});
  try{await options.reserve();const candidate=calculatePlan(await options.request(feedback),options.people,options.stock);if(preferCandidate(plan,candidate))plan=candidate;}
  catch(error){options.onRetryError(error);}
 }
 return plan;
}
