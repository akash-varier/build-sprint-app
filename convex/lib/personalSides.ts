import {fitSideCombination} from './jointSides';
import {dishReviewKey} from '../../shared/review';
import {allowedFood,macroKeys,type Dish,type Person,type Stock,type Food,type Macros} from '../../shared/food';
import {type PersonalSide} from '../../shared/personalSides';
import {mealNames,validateDishIngredients,UnsafeMenuError} from '../../shared/validation';
import {mealTotals,servingCap,isRoti,servingSizes,shrinkStapleWeights} from './portions';
import {withHouseholdMeasures,type DisplayPlan} from './householdMeasures';
import type {CustomFood} from '../../shared/ingredientEstimate';
const round=(n:number)=>Math.round(n*10)/10;
export function sameCalculatedSharedServings(a:DisplayPlan,b:DisplayPlan){
 const portions=(p:DisplayPlan)=>p.people.map(person=>person.portions.map(x=>[x.grams,...macroKeys.map(k=>x.macros[k])]));
 return dishReviewKey(a.dishes)===dishReviewKey(b.dishes)&&JSON.stringify(portions(a))===JSON.stringify(portions(b));
}
export function shrinkPersonalStaples(plan:DisplayPlan,stock:Stock[],custom:CustomFood[]=[]):DisplayPlan{
 const people=plan.people.map(p=>{
  const weights=shrinkStapleWeights(plan.dishes,p.portions.map(x=>x.grams),p.target);
  return {...p,portions:p.portions.map((portion,j)=>{if(weights[j]===portion.grams)return portion;const d=plan.dishes[j];return {...portion,grams:weights[j],macros:Object.fromEntries(macroKeys.map(k=>[k,d.weight>0?d.macros[k]*weights[j]/d.weight:0])) as Macros};})};
 });
 const dishes=plan.dishes.map((d,j)=>{const weight=round(people.reduce((sum,p)=>sum+p.portions[j].grams,0));if(weight===d.weight)return d;const scale=d.weight>0?weight/d.weight:0;return {...d,weight,macros:Object.fromEntries(macroKeys.map(k=>[k,d.macros[k]*scale])) as Macros,ingredients:d.ingredients.map(i=>({...i,grams:i.grams*scale}))};});
 const quantities=new Map<string,number>();for(const d of dishes)for(const i of d.ingredients)quantities.set(i.id,round((quantities.get(i.id)??0)+i.grams));
 const ingredients=[...quantities].map(([id,grams])=>{const available=stock.find(s=>s.id===id)?.grams??0;return {id,grams,available,shortage:round(Math.max(0,grams-available))};});
 return withHouseholdMeasures({...plan,dishes,people,ingredients,personalSides:[]},custom);
}
export function personalSideRoom(plan:DisplayPlan,personIndex:number,meal:Dish['meal']){
 const p=plan.people[personIndex];let bread=0,rotis=0;
 plan.dishes.forEach((d,j)=>{if(d.meal!==meal)return;if(d.weight>0)bread+=p.portions[j].grams*d.ingredients.filter(i=>i.id==='bread').reduce((sum,i)=>sum+i.grams,0)/d.weight;if(isRoti(d))rotis+=p.portions[j].grams;});
 return {remainingBreadRawGrams:Math.max(0,4*servingSizes.breadSlice-bread),remainingRotiCookedGrams:Math.max(0,4*servingSizes.roti-rotis)};
}
export function sharedDaily(plan:DisplayPlan,personIndex:number){return Object.fromEntries(macroKeys.map(k=>[k,plan.people[personIndex].portions.reduce((sum,p)=>sum+p.macros[k],0)])) as Macros;}
export function personalSideSlots(plan:DisplayPlan,meals:readonly Dish['meal'][]=mealNames){
 return plan.people.flatMap((p,personIndex)=>{
  const daily=sharedDaily(plan,personIndex),macro=macroKeys.reduce((best,k)=>p.target[k]-daily[k]>p.target[best]-daily[best]?k:best,'protein' as typeof macroKeys[number]);
  if(p.target[macro]-daily[macro]<=5+1e-8)return [];
  return mealTotals(plan.dishes,p.portions,p.target).filter(m=>meals.includes(m.meal)).flatMap(m=>{
   const room=macro==='fibre'?Infinity:p.target[macro]*.4-m.macros[macro];
   return room>1e-8?[{personIndex,meal:m.meal,macro,grams:Math.max(0,Math.min(p.target[macro]-daily[macro],room)),dailyActual:daily,actual:m.macros,target:p.target,...personalSideRoom(plan,personIndex,m.meal)}]:[];
  });
 });
}
export function attachPersonalSideAlternatives(plan:DisplayPlan,groups:{personIndex:number;meal?:Dish['meal'];options:Dish[]}[],people:Person[],stock:Stock[],catalog:Food[],custom:CustomFood[]=[],meals:readonly Dish['meal'][]=mealNames):DisplayPlan{
 let result=attachPersonalSides(plan,[],people,stock,catalog,custom,meals);
 const required=stock.filter(s=>s.mustUse&&!allowedFood(catalog.find(f=>f.id===s.id)!,people));
 const rank=(p:DisplayPlan,personIndex:number)=>{
  const missing=required.filter(s=>!p.personalSides?.some(side=>side.dish.ingredients.some(i=>i.id===s.id&&i.grams>0))).length;
  const person=p.people[personIndex],gaps=macroKeys.map(k=>Math.max(0,(k==='fibre'?-person.gaps[k]:Math.abs(person.gaps[k]))-5)).sort((a,b)=>b-a);
  const range=Math.max(...person.meals.flatMap(m=>(['protein','carbs','fat'] as const).map(k=>Math.abs(m.mealCheck.rangeGaps[k])/Math.max(person.target[k],1))));
  return [missing,...gaps,range,macroKeys.reduce((sum,k)=>sum+(k==='fibre'?Math.max(0,-person.gaps[k]):Math.abs(person.gaps[k])),0)];
 };
 for(let personIndex=0;personIndex<people.length;personIndex++){
  const seen=new Set<string>(),eligible=groups.filter(g=>{const meal=g.meal??g.options[0]?.meal;if(g.personIndex!==personIndex||!meal||!meals.includes(meal)||seen.has(meal))return false;seen.add(meal);return true;});
  let combinations:Dish[][]=[[]];for(const group of eligible)combinations=combinations.flatMap(c=>[c,...group.options.slice(0,4).filter(d=>d.meal===(group.meal??group.options[0]?.meal)).map(d=>[...c,d])]);
  let best=result,bestRank=rank(best,personIndex);const retained=result.personalSides??[];
  for(const selected of combinations){if(!selected.length)continue;try{
   const candidate=fitSideCombination(result,personIndex,selected,retained,people,stock,catalog,custom),candidateRank=rank(candidate,personIndex);
   const first=candidateRank.findIndex((v,i)=>Math.abs(v-bestRank[i])>1e-7);if(first>=0&&candidateRank[first]<bestRank[first]){best=candidate;bestRank=candidateRank;}
  }catch{/* Unsafe or infeasible alternatives cannot be saved. */}}
  result=best;
 }
 return result;
}

export function attachPersonalSides(plan:DisplayPlan,candidates:{personIndex:number;dish:Dish}[],people:Person[],stock:Stock[],catalog:Food[],custom:CustomFood[]=[],meals:readonly Dish['meal'][]=mealNames):DisplayPlan{
 const slots=personalSideSlots(plan),seen=new Set<string>();
 const retained=(plan.personalSides??[]).filter(s=>!meals.includes(s.meal));
 const sides:PersonalSide[]=[];
 for(const candidate of [...retained.map(s=>({personIndex:s.personIndex,dish:s.dish})),...candidates]){
  const {personIndex,dish}=candidate,key=`${personIndex}:${dish.meal}`,slot=slots.find(s=>s.personIndex===personIndex&&s.meal===dish.meal);
  if(!Number.isInteger(personIndex)||!people[personIndex]||!slot||seen.has(key)||dish.role!=='side')throw new Error('Each eligible person may have at most one side per meal.');seen.add(key);
  // Identical ingredient checks; only their recipient defines the diet/allergies.
  validateDishIngredients(dish,[people[personIndex]],stock,catalog);
  const daily=sharedDaily(plan,personIndex);for(const s of sides.filter(s=>s.personIndex===personIndex))for(const k of macroKeys)daily[k]+=s.dish.macros[k];
  const prior=retained.find(s=>s.dish===dish);const target=plan.people[personIndex].target;const priority=prior?.closes??macroKeys.filter(k=>dish.macros[k]>0).reduce((best,k)=>target[k]-daily[k]>target[best]-daily[best]?k:best,macroKeys.find(k=>dish.macros[k]>0)??'protein');
  const perGram=dish.macros[priority]/dish.weight;if(perGram<=0)continue;
  let cap=Math.min(servingCap(dish),retained.some(s=>s.dish===dish)?dish.weight:Infinity);const person=plan.people[personIndex];
  const bread=dish.ingredients.filter(i=>i.id==='bread').reduce((sum,i)=>sum+i.grams,0);
  if(bread>0){const used=plan.dishes.reduce((sum,d,j)=>sum+(d.meal===dish.meal&&d.weight>0?person.portions[j].grams*d.ingredients.filter(i=>i.id==='bread').reduce((s,i)=>s+i.grams,0)/d.weight:0),0);cap=Math.min(cap,Math.max(0,4*servingSizes.breadSlice-used)*dish.weight/bread);}
  if(isRoti(dish)){const used=plan.dishes.reduce((sum,d,j)=>sum+(d.meal===dish.meal&&isRoti(d)?person.portions[j].grams:0),0);cap=Math.min(cap,Math.max(0,4*servingSizes.roti-used));}
  // Daily upper budgets apply across all sides; fibre deliberately has no upper cap.
  for(const k of ['protein','carbs','fat'] as const)if(dish.macros[k]>0)cap=Math.min(cap,Math.max(0,target[k]+5-daily[k])*dish.weight/dish.macros[k]);
  const gap=prior?Infinity:Math.max(0,Math.min(target[priority]-daily[priority],priority==='fibre'?Infinity:target[priority]*.4-slot.actual[priority]));
  const weight=Math.floor(Math.min(cap,gap/perGram)*10+1e-8)/10;const egg=dish.ingredients.filter(i=>i.id==='egg').reduce((sum,i)=>sum+i.grams,0);
  const minimum=egg>0?Math.max(50,50*dish.weight/egg):50;
  if(weight+1e-8<minimum)continue;
  const scale=weight/dish.weight;const scaled={...dish,weight,macros:Object.fromEntries(macroKeys.map(k=>[k,dish.macros[k]*scale])) as Macros,ingredients:dish.ingredients.map(i=>({...i,grams:i.grams*scale}))};
  sides.push({personIndex,meal:dish.meal,closes:priority,dish:scaled});
 }
 const quantities=new Map<string,number>();for(const d of [...plan.dishes,...sides.map(s=>s.dish)])for(const i of d.ingredients)quantities.set(i.id,round((quantities.get(i.id)??0)+i.grams));
 const ingredients=[...quantities].map(([id,grams])=>{const available=stock.find(s=>s.id===id)?.grams??0;return {id,grams,available,shortage:round(Math.max(0,grams-available))};});
 const {sideNotice,...base}=plan;return withHouseholdMeasures({...base,personalSides:sides,ingredients},custom);
}
