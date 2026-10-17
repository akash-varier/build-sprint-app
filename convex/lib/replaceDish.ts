import {shrinkPersonalStaples} from './personalSides';
import {macroKeys,withinMacroTolerance,type Dish,type Stock,type Macros} from '../../shared/food';
import {fitPortions,mealCheck,mealTotals,servingCap} from './portions';
import {withHouseholdMeasures,type DisplayPlan} from './householdMeasures';
import type {CustomFood} from '../../shared/ingredientEstimate';
const round=(n:number)=>Math.round(n*10)/10;
export function replaceOneDish(plan:DisplayPlan,index:number,dish:Dish,stock:Stock[],custom:CustomFood[]=[]):DisplayPlan{
 const old=plan.dishes[index];if(!old||dish.meal!==old.meal||dish.role!==old.role)throw new Error('Keep the same meal and item role.');
 const recipes=plan.dishes.map((d,j)=>j===index?dish:d.weight>0?d:{...d,weight:1});
 const people=plan.people.map(p=>{
  const fixed=p.portions.map((x,j)=>j===index?undefined:x.grams);const weights=fitPortions(recipes,p.target,fixed);
  const grams=weights[index];if(grams>servingCap(dish)+1e-8)throw new Error('Serving cap exceeded.');
  const macros=Object.fromEntries(macroKeys.map(k=>[k,dish.macros[k]*grams/dish.weight])) as Macros;
  const portions=p.portions.map((x,j)=>j===index?{grams,macros,mealCheck:mealCheck(macros,p.target)}:x);
  const total=Object.fromEntries(macroKeys.map(k=>[k,portions.reduce((sum,x)=>sum+x.macros[k],0)])) as Macros;
  const gaps=Object.fromEntries(macroKeys.map(k=>[k,total[k]-p.target[k]])) as Macros;
  return {...p,portions,total,gaps,withinTolerance:withinMacroTolerance(gaps),meals:mealTotals(recipes,portions,p.target)};
 });
 const weight=round(people.reduce((sum,p)=>sum+p.portions[index].grams,0)),scale=weight/dish.weight;
 const replacement={...dish,weight,macros:Object.fromEntries(macroKeys.map(k=>[k,dish.macros[k]*scale])) as Macros,ingredients:dish.ingredients.map(i=>({...i,grams:i.grams*scale}))};
 const dishes=plan.dishes.map((d,j)=>j===index?replacement:d);
 const quantities=new Map<string,number>();for(const d of dishes)for(const i of d.ingredients)quantities.set(i.id,round((quantities.get(i.id)??0)+i.grams));
 const ingredients=[...quantities].map(([id,grams])=>{const available=stock.find(s=>s.id===id)?.grams??0;return {id,grams,available,shortage:round(Math.max(0,grams-available))};});
 const decorated=withHouseholdMeasures({...plan,dishes,people,ingredients},custom);
 // Preserve accepted item records exactly, including displayed household measures.
 decorated.people=decorated.people.map((p,pi)=>({...p,portions:p.portions.map((x,j)=>j===index?x:plan.people[pi].portions[j])}));
 return shrinkPersonalStaples(decorated,stock,custom);
}
