import {toGrams} from './ingredientUnits';
import { macroKeys, withinMacroTolerance, type Dish, type Macros, type Person, type Stock } from '../../shared/food';
const round=(n:number)=>Math.round(n*10)/10;
const empty=():Macros=>({protein:0,carbs:0,fat:0,fibre:0});
// Minimise the largest daily error (grams), using the vertices of a small linear
// programme. Variables are three batch fractions and one maximum macro error.
// Every constraint and all portion arithmetic execute in Convex, never the AI.
function solve(a:number[][],b:number[]) {
 const m=a.map((row,i)=>[...row,b[i]]);
 for(let j=0;j<4;j++) {
  let p=j;for(let i=j+1;i<4;i++)if(Math.abs(m[i][j])>Math.abs(m[p][j]))p=i;
  if(Math.abs(m[p][j])<1e-10)return null;
  [m[j],m[p]]=[m[p],m[j]];
  const divisor=m[j][j];for(let k=j;k<5;k++)m[j][k]/=divisor;
  for(let i=0;i<4;i++)if(i!==j){const f=m[i][j];for(let k=j;k<5;k++)m[i][k]-=f*m[j][k];}
 }
 return m.map(row=>row[4]);
}
export const servingSizes={katori:150,cookedRiceCup:158};
export function servingCap(dish:Dish){
 const eggGrams=dish.ingredients.filter(i=>i.id==='egg').reduce((sum,i)=>sum+i.grams,0);
 return Math.min(3*servingSizes.katori,dish.ingredients.some(i=>i.id==='rice')?2*servingSizes.cookedRiceCup:Infinity,eggGrams>0?dish.weight*toGrams({id:'egg',quantity:4,unit:'pieces',mustUse:false})/eggGrams:Infinity);
}
export function mealCheck(macros:Macros,target:Macros){
 const percent=empty(),rangeGaps=empty();
 for(const key of macroKeys){percent[key]=target[key]>0?macros[key]/target[key]*100:0;rangeGaps[key]=macros[key]<target[key]*.25?macros[key]-target[key]*.25:macros[key]>target[key]*.4?macros[key]-target[key]*.4:0;}
 return {percent,rangeGaps,withinRange:macroKeys.every(key=>Math.abs(rangeGaps[key])<1e-8)};
}
function mealBounds(dish:Dish,target:Macros,slack:number){
 let min=0,max=servingCap(dish)/dish.weight;
 for(const key of macroKeys){
  const scale=Math.max(target[key],1),low=Math.max(0,target[key]*.25-slack*scale),high=target[key]*.4+slack*scale;
  if(dish.macros[key]>0){min=Math.max(min,low/dish.macros[key]);max=Math.min(max,high/dish.macros[key]);}
  else if(low>1e-9)return {min:1,max:0};
 }
 return {min,max};
}
export function fitPortions(dishes:Dish[],target:Macros) {
 if(dishes.length!==3||dishes.some(d=>!Number.isFinite(d.weight)||d.weight<=0))throw new Error('Three valid dishes are required.');
 const constraints:{a:number[];b:number}[]=[];
 for(const key of macroKeys){const row=dishes.map(d=>d.macros[key]);constraints.push({a:[...row,-1],b:target[key]},{a:[...row.map(v=>-v),-1],b:-target[key]});}
 // Meal ranges have first priority within the immutable physical caps. Find
 // the smallest common percentage-point relaxation if the ranges cannot fit.
 let low=0,high=.25;
 const possible=(slack:number)=>dishes.every(d=>{const b=mealBounds(d,target,slack);return b.min<=b.max+1e-10;});
 if(possible(0))high=0;else for(let i=0;i<50;i++){const mid=(low+high)/2;if(possible(mid))high=mid;else low=mid;}
 const bounds=dishes.map(d=>mealBounds(d,target,high+1e-9));
 dishes.forEach((_,j)=>{const row=[0,0,0,0];row[j]=1;constraints.push({a:row,b:bounds[j].max},{a:row.map(v=>-v),b:-bounds[j].min});});
 constraints.push({a:[0,0,0,-1],b:0});
 let best:number[]|null=null;
 for(let i=0;i<constraints.length-3;i++)for(let j=i+1;j<constraints.length-2;j++)for(let k=j+1;k<constraints.length-1;k++)for(let l=k+1;l<constraints.length;l++){
  const cs=[constraints[i],constraints[j],constraints[k],constraints[l]];
  const x=solve(cs.map(c=>c.a),cs.map(c=>c.b));
  if(!x||x.some(n=>!Number.isFinite(n))||constraints.some(c=>c.a.reduce((s,v,q)=>s+v*x[q],0)>c.b+1e-7))continue;
  if(!best||x[3]<best[3]-1e-8)best=x;
 }
 if(!best)throw new Error('Could not calculate portions.');
 return dishes.map((d,j)=>{
  const cap=Math.floor(servingCap(d)*10+1e-8)/10;
  const lower=Math.ceil(bounds[j].min*d.weight*10-1e-6)/10;
  const upper=Math.min(cap,Math.floor(bounds[j].max*d.weight*10+1e-6)/10);
  const rounded=round(Math.max(0,d.weight*best![j]));
  return lower<=upper?Math.max(lower,Math.min(upper,rounded)):Math.min(cap,rounded);
 });
}
export function calculatePlan(dishes:Dish[],people:Person[],stock:Stock[]) {
 const results=people.map(p=>{
  const weights=fitPortions(dishes,p.target);const total=empty();
  const portions=dishes.map((d,j)=>{const m=empty();for(const key of macroKeys){m[key]=d.macros[key]*weights[j]/d.weight;total[key]+=m[key];}return {grams:weights[j],macros:m,mealCheck:mealCheck(m,p.target)};});
  const gaps=empty();for(const key of macroKeys)gaps[key]=total[key]-p.target[key];
  return {name:p.name,target:p.target,portions,total,gaps,withinTolerance:withinMacroTolerance(gaps)};
 });
 const scaled=dishes.map((d,j)=>{
  const weight=round(results.reduce((s,p)=>s+p.portions[j].grams,0));const scale=weight/d.weight;
  const macros=empty();for(const key of macroKeys)macros[key]=d.macros[key]*scale;
  return {...d,weight,macros,ingredients:d.ingredients.map(i=>({...i,grams:round(i.grams*scale)}))};
 });
 const quantities=new Map<string,number>();for(const d of scaled)for(const i of d.ingredients)quantities.set(i.id,round((quantities.get(i.id)??0)+i.grams));
 const ingredients=[...quantities].map(([id,grams])=>({id,grams,available:stock.find(s=>s.id===id)?.grams??0,shortage:round(Math.max(0,grams-(stock.find(s=>s.id===id)?.grams??0)))}));
 return {dishes:scaled,people:results,ingredients};
}
export type MealPlan=ReturnType<typeof calculatePlan>;
