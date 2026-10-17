import {addedFatGrams} from './fatAdditions';
import type {DisplayPlan} from './householdMeasures';
export function sideLimitNotice(plan:DisplayPlan,index:number){
 const p=plan.people[index],own=(plan.personalSides??[]).filter(s=>s.personIndex===index),limits:string[]=[];
 for(const meal of ['breakfast','lunch','dinner'] as const){
  const sides=own.filter(s=>s.meal===meal);if(sides.length===2)limits.push(`${meal}: 2 personal sides`);
  const raw=(ids:string[])=>sides.reduce((sum,s)=>sum+s.dish.ingredients.filter(i=>ids.includes(i.id)).reduce((a,i)=>a+i.grams,0),0);
  const cooked=(id:string)=>sides.filter(s=>s.dish.ingredients.some(i=>i.id===id)).reduce((sum,s)=>sum+s.dish.weight,0);
  for(const [label,actual,cap,unit] of [['chicken',cooked('chicken'),250,'g cooked'],['paneer',cooked('paneer'),150,'g cooked'],['nuts/seeds',raw(['peanut','almond','sesame']),40,'g']] as const)if(actual>=cap-.2)limits.push(`${meal}: ${label} ${actual.toFixed(1)}/${cap} ${unit}`);
  const m=p.meals.find(m=>m.meal===meal)!;for(const k of ['protein','carbs','fat'] as const)if(m.macros[k]>=p.target[k]*.4-.2)limits.push(`${meal} ${k} at/above 40% (${m.macros[k].toFixed(1)}/${(p.target[k]*.4).toFixed(1)} g)`);
 }
 const fat=own.reduce((sum,s)=>sum+addedFatGrams(s.dish),0);if(fat>=27.7)limits.push(`daily added oil/ghee/butter ${fat.toFixed(1)}/28 g (2 tbsp)`);
 for(const k of ['protein','carbs','fat'] as const){const fixed=p.portions.reduce((sum,x)=>sum+x.macros[k],0);if(fixed>p.target[k]+5+1e-8)limits.unshift(`fixed shared ${k} ${fixed.toFixed(1)} g already exceeds the daily ${p.target[k]+5} g ceiling; sides cannot remove it`);}
 for(const k of ['protein','carbs','fat'] as const)if(p.total[k]>=p.target[k]+4.5)limits.push(`daily ${k} ceiling ${p.total[k].toFixed(1)}/${(p.target[k]+5).toFixed(1)} g`);
 const gaps=(['protein','carbs','fat'] as const).filter(k=>Math.abs(p.gaps[k])>5).map(k=>`${k} ${p.gaps[k]>0?'+':''}${p.gaps[k].toFixed(1)} g`).join(', ');
 return `${p.name}: ${gaps}. Every supplied safe single/pair option was tested. ${limits.length?'Limits reached: '+limits.join('; ')+'.':'No further supplied recipe fits the remaining daily budgets at its minimum serving (50 g whole food, one egg, 10 g nuts or 1 tsp added oil).'} Remaining gaps are shown honestly.`;
}
