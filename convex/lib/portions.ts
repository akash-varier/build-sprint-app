import {solve as boundedSolve} from 'yalps';
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
export function personalServingCap(dish:Dish,aliases:Record<string,string>={}){
 const grams=(ids:string[])=>dish.ingredients.filter(i=>ids.includes(aliases[i.id]??i.id)).reduce((s,i)=>s+i.grams,0);
 const nuts=grams(['peanut','almond','sesame']),oil=grams(['oil','ghee']);
 return Math.min(servingCap(dish),grams(['chicken'])>0?250:Infinity,grams(['paneer'])>0?150:Infinity,nuts>0?40*dish.weight/nuts:Infinity,oil>0?28*dish.weight/oil:Infinity);
}
export function mealCheck(macros:Macros,target:Macros){
 const percent=empty(),rangeGaps=empty();
 for(const key of macroKeys){percent[key]=target[key]>0?macros[key]/target[key]*100:0;rangeGaps[key]=macros[key]<target[key]*.25?macros[key]-target[key]*.25:key!=='fibre'&&macros[key]>target[key]*.4?macros[key]-target[key]*.4:0;}
 return {percent,rangeGaps,withinRange:(['protein','carbs','fat'] as const).every(key=>Math.abs(rangeGaps[key])<1e-8)};
}
export function mealTotals(dishes:Dish[],portions:{macros:Macros}[],target:Macros){
 return mealNames.map(meal=>{const macros=empty();dishes.forEach((d,i)=>{if(d.meal===meal)for(const k of macroKeys)macros[k]+=portions[i].macros[k];});return {meal,macros,mealCheck:mealCheck(macros,target)};});
}
type Bounds={min?:number;max?:number};
type Model={optimize:string;opType:'min';constraints:Record<string,Bounds>;variables:Record<string,Record<string,number>>};
function solve(model:Model):Record<string,number>{
 const clean=structuredClone(model);for(const [key,bound] of Object.entries(clean.constraints))if(!Object.values(clean.variables).some(v=>Math.abs(v[key]??0)>0)&&(bound.min??0)<=0&&(bound.max??0)>=0)delete clean.constraints[key];
 const result=boundedSolve({direction:'minimize',objective:clean.optimize,constraints:clean.constraints,variables:clean.variables},{precision:1e-9,maxPivots:2000,checkCycles:true,timeout:100});
 if(result.status!=='optimal')throw new Error(`Could not calculate capped portions: ${result.status}.`);
 return Object.fromEntries(result.variables);
}
export function fitPortions(dishes:Dish[],target:Macros,fixed:(number|undefined)[]=[],minimums:number[]=[],personalStart:number=Infinity,upperBounds:number[]=[],aliases:Record<string,string>={}){
 if(dishes.length<3||dishes.length>15||dishes.some(d=>!Number.isFinite(d.weight)||d.weight<=0))throw new Error('Valid meal items are required.');
 // Each variable is one cooked item weight, never an AI-generated portion.
 const model:Model={optimize:'rangeCost',opType:'min',constraints:{},variables:{rangeSlack:{rangeCost:1},dailySlack:{dailyCost:1}}};
 dishes.forEach((d,j)=>{
  const cap=Math.min(j>=personalStart?personalServingCap(d,aliases):servingCap(d),upperBounds[j]??Infinity),minimum=minimums[j]??(d.role==='main'?Math.min(50,cap):d.role==='staple'?Math.min(25,cap):0);
  model.constraints[`cap${j}`]=fixed[j]===undefined?{min:minimum,max:cap}:{min:fixed[j],max:fixed[j]};model.variables[`item${j}`]={[`cap${j}`]:1};
 });
 // Bread is additionally limited to four slices across the entire meal.
 for(const meal of mealNames){if(!dishes.some(d=>d.meal===meal&&d.ingredients.some(i=>i.id==='bread')))continue;const key=`${meal}_bread`;model.constraints[key]={max:4*servingSizes.breadSlice};dishes.forEach((d,j)=>{if(d.meal===meal)model.variables[`item${j}`][key]=d.ingredients.filter(i=>i.id==='bread').reduce((sum,i)=>sum+i.grams,0)/d.weight;});}
 for(const meal of mealNames){if(!dishes.some(d=>d.meal===meal&&isRoti(d)))continue;const key=`${meal}_rotis`;model.constraints[key]={max:4*servingSizes.roti};dishes.forEach((d,j)=>{if(d.meal===meal&&isRoti(d))model.variables[`item${j}`][key]=1;});}
 // Personal-food limits are combined per person/meal; shared recipes retain their caps.
 for(const meal of mealNames)for(const [kind,max] of [['chicken',250],['paneer',150],['nuts',40],['oil',28]] as const){
  const key=`personal_${meal}_${kind}`;model.constraints[key]={max:max-.1};
  dishes.forEach((d,j)=>{if(j<personalStart||d.meal!==meal)return;const ids=kind==='nuts'?['peanut','almond','sesame']:kind==='oil'?['oil','ghee']:[kind];const raw=d.ingredients.filter(i=>ids.includes(aliases[i.id]??i.id)).reduce((sum,i)=>sum+i.grams,0);model.variables[`item${j}`][key]=(kind==='chicken'||kind==='paneer')?(raw>0?1:0):raw/d.weight;});
 }
 if(Number.isFinite(personalStart))for(const k of ['protein','carbs','fat'] as const){const fixedActual=dishes.reduce((sum,d,j)=>sum+(fixed[j]??0)*d.macros[k]/d.weight,0),key=`personal_daily_${k}`;model.constraints[key]={max:Math.max(fixedActual,target[k]+4.8)};dishes.forEach((d,j)=>{model.variables[`item${j}`][key]=d.macros[k]/d.weight;});}
 for(const meal of mealNames)for(const k of ['protein','carbs','fat'] as const){
  const lo=`${meal}_${k}_lo`,hi=`${meal}_${k}_hi`;
  const roundingRoom=target[k]>=4?.2:0;model.constraints[lo]={min:.25*target[k]+roundingRoom};model.constraints[hi]={max:.4*target[k]-roundingRoom};
  model.variables.rangeSlack[lo]=Math.max(target[k],1);model.variables.rangeSlack[hi]=-Math.max(target[k],1);
  dishes.forEach((d,j)=>{if(d.meal===meal){const coefficient=d.macros[k]/d.weight;model.variables[`item${j}`][lo]=coefficient;model.variables[`item${j}`][hi]=coefficient;}});
 }
 // Daily nutrition has priority over meal distribution.
 model.optimize='dailyCost';
 for(const k of macroKeys){const lo=`daily_${k}_lo`,hi=`daily_${k}_hi`;model.constraints[lo]={min:target[k]};if(k!=='fibre')model.constraints[hi]={max:target[k]};model.variables.dailySlack[lo]=1;if(k!=='fibre')model.variables.dailySlack[hi]=-1;dishes.forEach((d,j)=>{model.variables[`item${j}`][lo]=d.macros[k]/d.weight;if(k!=='fibre')model.variables[`item${j}`][hi]=d.macros[k]/d.weight;});}
 const daily=solve(model);model.constraints.dailyLock={max:Math.max(4.8,daily.dailySlack??0)+1e-8};model.variables.dailySlack.dailyLock=1;
 model.optimize='rangeCost';const ranges=solve(model);model.constraints.rangeLock={max:Math.max(0,ranges.rangeSlack??0)+1e-8};model.variables.rangeSlack.rangeLock=1;
 // Finally get as close to target as the best feasible daily/range fit allows.
 model.optimize='dailyCost';
 const fitted=solve(model);
 const weights=dishes.map((d,j)=>fixed[j]??Math.max(0,Math.min(Math.floor((j>=personalStart?personalServingCap(d,aliases):servingCap(d))*10+1e-8)/10,round(fitted[`item${j}`]??0))));
 // Rounding independent item weights must not overrun the shared bread limit.
 for(const meal of mealNames){
  const coefficients=dishes.map(d=>d.meal===meal?d.ingredients.filter(i=>i.id==='bread').reduce((s,i)=>s+i.grams,0)/d.weight:0);
  let excess=weights.reduce((sum,w,j)=>sum+w*coefficients[j],0)-4*servingSizes.breadSlice;
  for(let j=0;j<weights.length&&excess>1e-8;j++)if(coefficients[j]>0&&fixed[j]===undefined){const reduction=Math.min(weights[j],Math.ceil(excess/coefficients[j]*10-1e-8)/10);weights[j]=round(weights[j]-reduction);excess-=reduction*coefficients[j];}
 }
 for(const meal of mealNames){let excess=weights.reduce((sum,w,j)=>sum+(dishes[j].meal===meal&&isRoti(dishes[j])?w:0),0)-4*servingSizes.roti;for(let j=0;j<weights.length&&excess>1e-8;j++)if(dishes[j].meal===meal&&isRoti(dishes[j])&&fixed[j]===undefined){const reduction=Math.min(weights[j],Math.ceil(excess*10-1e-8)/10);weights[j]=round(weights[j]-reduction);excess-=reduction;}}
 // Later personal-side planning may reduce a staple only when needed.
 return weights;
}
export function shrinkStapleWeights(dishes:Dish[],weights:number[],target:Macros,fixed:(number|undefined)[]=[]){
 // Buying is allowed; personal shared servings may shrink to leave room for sides.
 let excess=dishes.reduce((sum,d,j)=>sum+(d.weight>0?weights[j]*d.macros.carbs/d.weight:0),0)-target.carbs;
 for(let j=0;j<dishes.length&&excess>1e-8;j++)if(dishes[j].role==='staple'&&fixed[j]===undefined&&dishes[j].macros.carbs>0){
  const coefficient=dishes[j].macros.carbs/dishes[j].weight,reduction=Math.min(weights[j],Math.ceil(excess/coefficient*10-1e-8)/10);
  weights[j]=round(weights[j]-reduction);excess-=reduction*coefficient;
 }
 // A high-fat main must be reducible too; a side cannot remove its fat.
 let fatExcess=dishes.reduce((sum,d,j)=>sum+(d.weight>0?weights[j]*d.macros.fat/d.weight:0),0)-target.fat;
 if(fatExcess>5+1e-8){
  const order=dishes.map((d,j)=>({j,density:d.weight>0?d.macros.fat/d.weight:0})).sort((a,b)=>b.density-a.density);
  for(const {j,density} of order)if(fatExcess>1e-8&&density>0&&fixed[j]===undefined){
   const minimum=Math.min(weights[j],dishes[j].role==='main'?50:dishes[j].role==='staple'?25:0);
   const reduction=Math.min(weights[j]-minimum,Math.ceil(fatExcess/density*10-1e-8)/10);
   weights[j]=round(weights[j]-reduction);fatExcess-=reduction*density;
  }
 }
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
