import {checkSideRotation} from './sideRules';
import {addedFatGrams,isFatAddition,labelFatAddition} from './fatAdditions';
import {foods} from '../../shared/food';
import {servingAliases} from './ingredientAliases';
import {macroKeys,type Dish,type Person,type Stock,type Food,type Macros} from '../../shared/food';
import type {CustomFood} from '../../shared/ingredientEstimate';
import type {PersonalSide} from '../../shared/personalSides';
import {validateDishIngredients} from '../../shared/validation';
import {fitPortions} from './portions';
import {withHouseholdMeasures,type DisplayPlan} from './householdMeasures';
export function sideMinimum(d:Dish,aliases:Record<string,string>={}){
 const meaningful=d.ingredients.filter(i=>!['water','salt','cumin','turmeric','garlic','ginger','lemon'].includes(i.id));
 const only=(ids:string[])=>meaningful.length>0&&meaningful.every(i=>ids.includes(aliases[i.id]??i.id));
 if(only(['oil','ghee','butter']))return 4.6*d.weight/meaningful.reduce((s,i)=>s+i.grams,0);
 if(only(['peanut','almond','sesame']))return 10*d.weight/meaningful.reduce((s,i)=>s+i.grams,0);
 const egg=d.ingredients.filter(i=>i.id==='egg').reduce((s,i)=>s+i.grams,0);return egg>0?Math.max(50,50*d.weight/egg):50;
}
export function assembleSides(plan:DisplayPlan,sides:PersonalSide[],stock:Stock[],custom:CustomFood[]=[]){
 const aliases=servingAliases([...foods,...custom]);
 sides=sides.map(s=>{if(!isFatAddition(s.dish,aliases))return s;const host=plan.dishes.find((d,j)=>d.meal===s.meal&&plan.people[s.personIndex].portions[j].grams>0&&d.role==='main')??plan.dishes.find((d,j)=>d.meal===s.meal&&plan.people[s.personIndex].portions[j].grams>0);if(!host)throw new Error('Added fat needs a dish this person is eating.');return {...s,dish:labelFatAddition(s.dish,host.name,aliases)};});
 for(let personIndex=0;personIndex<plan.people.length;personIndex++)if(sides.filter(s=>s.personIndex===personIndex).reduce((sum,s)=>sum+addedFatGrams(s.dish,aliases),0)>28+1e-7)throw new Error('Added oil, ghee and butter exceed 2 tbsp per day.');
 const amounts=new Map<string,number>();for(const d of [...plan.dishes,...sides.map(s=>s.dish)])for(const i of d.ingredients)amounts.set(i.id,(amounts.get(i.id)??0)+i.grams);
 const ingredients=[...amounts].map(([id,grams])=>{grams=Math.round(grams*10)/10;const available=stock.find(s=>s.id===id)?.grams??0;return {id,grams,available,shortage:Math.round(Math.max(0,grams-available)*10)/10};});
 return withHouseholdMeasures({...plan,personalSides:sides,ingredients},custom);
}
export function fitSideCombination(plan:DisplayPlan,personIndex:number,selected:Dish[],retained:PersonalSide[],people:Person[],stock:Stock[],catalog:Food[],custom:CustomFood[]=[],adjustShared=false){
 for(const d of selected)validateDishIngredients(d,[people[personIndex]],stock,catalog);
 const aliases=servingAliases(catalog);
 const own=retained.filter(s=>s.personIndex===personIndex),shared=plan.dishes;
 checkSideRotation([...own.map(s=>s.dish),...selected],aliases);
 if(own.some(s=>s.dish.weight>250+1e-7))throw new Error('Personal side exceeds 250 g cooked.');
 // Zero-weight stored optional items have no nutrition or serving.
 const recipes=[...shared.map(d=>d.weight>0?d:{...d,weight:1,macros:{protein:0,carbs:0,fat:0,fibre:0}}),...own.map(s=>s.dish),...selected];
 const originalWeights=plan.people[personIndex].portions.map(p=>p.grams);
 const fixed=[...originalWeights.map(w=>adjustShared?undefined:w),...own.map(s=>s.dish.weight),...selected.map(()=>undefined)];
 const minima=recipes.map((d,i)=>i>=shared.length+own.length?sideMinimum(d,aliases):i<shared.length&&adjustShared?Math.min(originalWeights[i],d.role==='main'?50:d.role==='staple'?25:0):0);
 const weights=fitPortions(recipes,plan.people[personIndex].target,fixed,minima,shared.length,adjustShared?shared.map((d,j)=>d.role==='staple'?Infinity:originalWeights[j]):[],aliases);
 const added=selected.map((d,j)=>{const weight=weights[shared.length+own.length+j];if(weight+1e-7<sideMinimum(d,aliases))throw new Error('Side below minimum serving.');const scale=weight/d.weight;return {personIndex,meal:d.meal,closes:'fat' as const,dish:{...d,weight,macros:Object.fromEntries(macroKeys.map(k=>[k,d.macros[k]*scale])) as Macros,ingredients:d.ingredients.map(i=>({...i,grams:i.grams*scale}))}};});
 const peopleWithPortions=plan.people.map((p,i)=>i!==personIndex?p:{...p,portions:p.portions.map((portion,j)=>({...portion,grams:weights[j],macros:Object.fromEntries(macroKeys.map(k=>[k,recipes[j].macros[k]*weights[j]/recipes[j].weight])) as Macros}))});
 const dishes=shared.map((d,j)=>{const weight=Math.round(peopleWithPortions.reduce((sum,p)=>sum+p.portions[j].grams,0)*10)/10,scale=d.weight>0?weight/d.weight:0;return {...d,weight,macros:Object.fromEntries(macroKeys.map(k=>[k,d.macros[k]*scale])) as Macros,ingredients:d.ingredients.map(x=>({...x,grams:x.grams*scale}))};});
 const base=adjustShared?{...plan,dishes,people:peopleWithPortions}:plan;
 const result=assembleSides(base,[...retained,...added],stock,custom);
 for(const k of ['protein','carbs','fat'] as const){const original=plan.people[personIndex].portions.reduce((s,p)=>s+p.macros[k],0)+own.reduce((s,x)=>s+x.dish.macros[k],0);if(result.people[personIndex].total[k]>Math.max(adjustShared?0:original,plan.people[personIndex].target[k]+5)+1e-7)throw new Error('Daily upper budget exceeded.');}
 return result;
}
