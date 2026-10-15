import solver from 'javascript-lp-solver';
import {toGrams} from './ingredientUnits';
import {mealNames} from '../../shared/validation';
import {macroKeys,withinMacroTolerance,type Dish,type Macros,type Person,type Stock} from '../../shared/food';
const round=(n:number)=>Math.round(n*10)/10;
const empty=():Macros=>({protein:0,carbs:0,fat:0,fibre:0});
export const servingSizes={katori:150,cookedRiceCup:158,breadSlice:30,roti:40};
export function isRoti(dish:Dish){return /\b(roti|rotis|chapati|chapatis|phulka|phulkas)\b/i.test(dish.name)||(dish.role==='staple'&&dish.ingredients.some(i=>i.id==='atta'));}
export function servingCap(dish:Dish){
 const ingredient=(id:string)=>dish.ingredients.filter(i=>i.id===id).reduce((s,i)=>s+i.grams,0);
 const eggs=ingredient('egg'),bread=ingredient('bread');
 return Math.min(isRoti(dish)?4*servingSizes.roti:Infinity,3*servingSizes.katori,ingredient('rice')>0?2*servingSizes.cookedRiceCup:Infinity,
  eggs>0?dish.weight*toGrams({id:'egg',quantity:4,unit:'pieces',mustUse:false})/eggs:Infinity,
  bread>0?dish.weight*4*servingSizes.breadSlice/bread:Infinity);
}
export function mealCheck(macros:Macros,target:Macros){
 const percent=empty(),rangeGaps=empty();
 for(const key of macroKeys){percent[key]=target[key]>0?macros[key]/target[key]*100:0;rangeGaps[key]=macros[key]<target[key]*.25?macros[key]-target[key]*.25:macros[key]>target[key]*.4?macros[key]-target[key]*.4:0;}
 return {percent,rangeGaps,withinRange:macroKeys.every(key=>Math.abs(rangeGaps[key])<1e-8)};
}
export function mealTotals(dishes:Dish[],portions:{macros:Macros}[],target:Macros){
 return mealNames.map(meal=>{const macros=empty();dishes.forEach((d,i)=>{if(d.meal===meal)for(const k of macroKeys)macros[k]+=portions[i].macros[k];});return {meal,macros,mealCheck:mealCheck(macros,target)};});
}
type Bounds={min?:number;max?:number};
type Model={optimize:string;opType:'min';constraints:Record<string,Bounds>;variables:Record<string,Record<string,number>>};
function solve(model:Model):Record<string,number>{
 const result=solver.Solve(structuredClone(model),1e-9) as any;
 if(!result.feasible||result.bounded===false)throw new Error('Could not calculate capped portions.');
 return result;
}
export function fitPortions(dishes:Dish[],target:Macros){
 if(dishes.length<3||dishes.length>9||dishes.some(d=>!Number.isFinite(d.weight)||d.weight<=0))throw new Error('Valid meal items are required.');
 // Each variable is one cooked item weight, never an AI-generated portion.
 const model:Model={optimize:'rangeCost',opType:'min',constraints:{},variables:{rangeSlack:{rangeCost:1},dailySlack:{dailyCost:1}}};
 dishes.forEach((d,j)=>{
  const cap=servingCap(d),minimum=d.role==='main'?Math.min(50,cap):d.role==='staple'?Math.min(25,cap):0;
  model.constraints[`cap${j}`]={min:minimum,max:cap};model.variables[`item${j}`]={[`cap${j}`]:1};
 });
 // Bread is additionally limited to four slices across the entire meal.
 for(const meal of mealNames){if(!dishes.some(d=>d.meal===meal&&d.ingredients.some(i=>i.id==='bread')))continue;const key=`${meal}_bread`;model.constraints[key]={max:4*servingSizes.breadSlice};dishes.forEach((d,j)=>{if(d.meal===meal)model.variables[`item${j}`][key]=d.ingredients.filter(i=>i.id==='bread').reduce((sum,i)=>sum+i.grams,0)/d.weight;});}
 for(const meal of mealNames){if(!dishes.some(d=>d.meal===meal&&isRoti(d)))continue;const key=`${meal}_rotis`;model.constraints[key]={max:4*servingSizes.roti};dishes.forEach((d,j)=>{if(d.meal===meal&&isRoti(d))model.variables[`item${j}`][key]=1;});}
 for(const meal of mealNames)for(const k of macroKeys){
  const lo=`${meal}_${k}_lo`,hi=`${meal}_${k}_hi`;
  model.constraints[lo]={min:.25*target[k]};model.constraints[hi]={max:.4*target[k]};
  model.variables.rangeSlack[lo]=Math.max(target[k],1);model.variables.rangeSlack[hi]=-Math.max(target[k],1);
  dishes.forEach((d,j)=>{if(d.meal===meal){const coefficient=d.macros[k]/d.weight;model.variables[`item${j}`][lo]=coefficient;model.variables[`item${j}`][hi]=coefficient;}});
 }
 // First minimise missed meal ranges while all per-item caps remain firm.
 const first=solve(model);model.constraints.rangeLock={max:Math.max(0,first.rangeSlack??0)+1e-8};model.variables.rangeSlack.rangeLock=1;
 // Then fit daily totals inside those meal ranges, using a separate gap per macro.
 model.optimize='dailyCost';
 for(const k of macroKeys){const lo=`daily_${k}_lo`,hi=`daily_${k}_hi`;model.constraints[lo]={min:target[k]};model.constraints[hi]={max:target[k]};model.variables.dailySlack[lo]=1;model.variables.dailySlack[hi]=-1;dishes.forEach((d,j)=>{model.variables[`item${j}`][lo]=d.macros[k]/d.weight;model.variables[`item${j}`][hi]=d.macros[k]/d.weight;});}
 const fitted=solve(model);
 const weights=dishes.map((d,j)=>Math.max(0,Math.min(Math.floor(servingCap(d)*10+1e-8)/10,round(fitted[`item${j}`]??0))));
 // Rounding independent item weights must not overrun the shared bread limit.
 for(const meal of mealNames){
  const coefficients=dishes.map(d=>d.meal===meal?d.ingredients.filter(i=>i.id==='bread').reduce((s,i)=>s+i.grams,0)/d.weight:0);
  let excess=weights.reduce((sum,w,j)=>sum+w*coefficients[j],0)-4*servingSizes.breadSlice;
  for(let j=0;j<weights.length&&excess>1e-8;j++)if(coefficients[j]>0){const reduction=Math.min(weights[j],Math.ceil(excess/coefficients[j]*10-1e-8)/10);weights[j]=round(weights[j]-reduction);excess-=reduction*coefficients[j];}
 }
 for(const meal of mealNames){let excess=weights.reduce((sum,w,j)=>sum+(dishes[j].meal===meal&&isRoti(dishes[j])?w:0),0)-4*servingSizes.roti;for(let j=0;j<weights.length&&excess>1e-8;j++)if(dishes[j].meal===meal&&isRoti(dishes[j])){const reduction=Math.min(weights[j],Math.ceil(excess*10-1e-8)/10);weights[j]=round(weights[j]-reduction);excess-=reduction;}}
 return weights;
}
export function calculatePlan(dishes:Dish[],people:Person[],stock:Stock[]){
 const results=people.map(p=>{
  const weights=fitPortions(dishes,p.target),total=empty();
  const portions=dishes.map((d,j)=>{const macros=empty();for(const k of macroKeys){macros[k]=d.macros[k]*weights[j]/d.weight;total[k]+=macros[k];}return {grams:weights[j],macros,mealCheck:mealCheck(macros,p.target)};});
  const gaps=empty();for(const k of macroKeys)gaps[k]=total[k]-p.target[k];
  return {name:p.name,target:p.target,portions,meals:mealTotals(dishes,portions,p.target),total,gaps,withinTolerance:withinMacroTolerance(gaps)};
 });
 const scaled=dishes.map((d,j)=>{const weight=round(results.reduce((s,p)=>s+p.portions[j].grams,0)),scale=weight/d.weight,macros=empty();for(const k of macroKeys)macros[k]=d.macros[k]*scale;return {...d,weight,macros,ingredients:d.ingredients.map(i=>({...i,grams:i.grams*scale}))};});
 const quantities=new Map<string,number>();for(const d of scaled)for(const i of d.ingredients)quantities.set(i.id,round((quantities.get(i.id)??0)+i.grams));
 const ingredients=[...quantities].map(([id,grams])=>({id,grams,available:stock.find(s=>s.id===id)?.grams??0,shortage:round(Math.max(0,grams-(stock.find(s=>s.id===id)?.grams??0)))}));
 return {dishes:scaled,people:results,ingredients};
}
export type MealPlan=ReturnType<typeof calculatePlan>;
