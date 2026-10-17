import {macroKeys,type Dish,type Person,type Stock,type Food,type Macros} from '../../shared/food';
import type {CustomFood} from '../../shared/ingredientEstimate';
import type {PersonalSide} from '../../shared/personalSides';
import {validateDishIngredients} from '../../shared/validation';
import {fitPortions} from './portions';
import {withHouseholdMeasures,type DisplayPlan} from './householdMeasures';
export function sideMinimum(d:Dish){const egg=d.ingredients.filter(i=>i.id==='egg').reduce((s,i)=>s+i.grams,0);return egg>0?Math.max(50,50*d.weight/egg):50;}
export function assembleSides(plan:DisplayPlan,sides:PersonalSide[],stock:Stock[],custom:CustomFood[]=[]){
 const amounts=new Map<string,number>();for(const d of [...plan.dishes,...sides.map(s=>s.dish)])for(const i of d.ingredients)amounts.set(i.id,(amounts.get(i.id)??0)+i.grams);
 const ingredients=[...amounts].map(([id,grams])=>{grams=Math.round(grams*10)/10;const available=stock.find(s=>s.id===id)?.grams??0;return {id,grams,available,shortage:Math.round(Math.max(0,grams-available)*10)/10};});
 return withHouseholdMeasures({...plan,personalSides:sides,ingredients},custom);
}
export function fitSideCombination(plan:DisplayPlan,personIndex:number,selected:Dish[],retained:PersonalSide[],people:Person[],stock:Stock[],catalog:Food[],custom:CustomFood[]=[]){
 for(const d of selected)validateDishIngredients(d,[people[personIndex]],stock,catalog);
 const own=retained.filter(s=>s.personIndex===personIndex),shared=plan.dishes;
 // Zero-weight stored optional items have no nutrition or serving.
 const recipes=[...shared.map(d=>d.weight>0?d:{...d,weight:1,macros:{protein:0,carbs:0,fat:0,fibre:0}}),...own.map(s=>s.dish),...selected];
 const fixed=[...plan.people[personIndex].portions.map(p=>p.grams),...own.map(s=>s.dish.weight),...selected.map(()=>undefined)];
 const minima=recipes.map((d,i)=>i>=shared.length+own.length?sideMinimum(d):0);
 const weights=fitPortions(recipes,plan.people[personIndex].target,fixed,minima);
 const added=selected.map((d,j)=>{const weight=weights[shared.length+own.length+j];if(weight+1e-7<sideMinimum(d))throw new Error('Side below minimum serving.');const scale=weight/d.weight;return {personIndex,meal:d.meal,closes:'fat' as const,dish:{...d,weight,macros:Object.fromEntries(macroKeys.map(k=>[k,d.macros[k]*scale])) as Macros,ingredients:d.ingredients.map(i=>({...i,grams:i.grams*scale}))}};});
 const result=assembleSides(plan,[...retained,...added],stock,custom);
 for(const k of ['protein','carbs','fat'] as const){const original=plan.people[personIndex].portions.reduce((s,p)=>s+p.macros[k],0)+own.reduce((s,x)=>s+x.dish.macros[k],0);if(result.people[personIndex].total[k]>Math.max(original,plan.people[personIndex].target[k]+5)+1e-7)throw new Error('Daily upper budget exceeded.');}
 return result;
}
