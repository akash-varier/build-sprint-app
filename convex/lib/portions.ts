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
export function fitPortions(dishes:Dish[],target:Macros) {
 if(dishes.length!==3||dishes.some(d=>!Number.isFinite(d.weight)||d.weight<=0))throw new Error('Three valid dishes are required.');
 const constraints:{a:number[];b:number}[]=[];
 for(const key of macroKeys){const row=dishes.map(d=>d.macros[key]);constraints.push({a:[...row,-1],b:target[key]},{a:[...row.map(v=>-v),-1],b:-target[key]});}
 dishes.forEach((d,j)=>{const row=[0,0,0,0];row[j]=1;constraints.push({a:row,b:1000/d.weight},{a:row.map(v=>-v),b:-50/d.weight});});
 constraints.push({a:[0,0,0,-1],b:0});
 let best:number[]|null=null;
 for(let i=0;i<constraints.length-3;i++)for(let j=i+1;j<constraints.length-2;j++)for(let k=j+1;k<constraints.length-1;k++)for(let l=k+1;l<constraints.length;l++){
  const cs=[constraints[i],constraints[j],constraints[k],constraints[l]];
  const x=solve(cs.map(c=>c.a),cs.map(c=>c.b));
  if(!x||x.some(n=>!Number.isFinite(n))||constraints.some(c=>c.a.reduce((s,v,q)=>s+v*x[q],0)>c.b+1e-7))continue;
  if(!best||x[3]<best[3]-1e-8)best=x;
 }
 if(!best)throw new Error('Could not calculate portions.');
 return dishes.map((d,j)=>round(d.weight*best![j]));
}
export function calculatePlan(dishes:Dish[],people:Person[],stock:Stock[]) {
 const results=people.map(p=>{
  const weights=fitPortions(dishes,p.target);const total=empty();
  const portions=dishes.map((d,j)=>{const m=empty();for(const key of macroKeys){m[key]=d.macros[key]*weights[j]/d.weight;total[key]+=m[key];}return {grams:weights[j],macros:m};});
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
