import {checkSideRotation} from './sideRules';
import {addedFatGrams,isFatAddition} from './fatAdditions';
import {servingAliases} from './ingredientAliases';
import {fitSideCombination,assembleSides,sideMinimum} from './jointSides';
import {dishReviewKey} from '../../shared/review';
import {allowedFood,macroKeys,type Dish,type Person,type Stock,type Food,type Macros} from '../../shared/food';
import {type PersonalSide} from '../../shared/personalSides';
import {mealNames,validateDishIngredients,UnsafeMenuError} from '../../shared/validation';
import {mealTotals,servingCap,personalServingCap,isRoti,servingSizes,shrinkStapleWeights} from './portions';
import {withHouseholdMeasures,type DisplayPlan} from './householdMeasures';
import type {CustomFood} from '../../shared/ingredientEstimate';
export const dailyMet=(p:DisplayPlan['people'][number])=>(['protein','carbs','fat'] as const).every(k=>Math.abs(p.gaps[k])<=5+1e-8)&&p.gaps.fibre>=-5-1e-8;
export const sideCapacity=(plan:DisplayPlan,index:number)=>dailyMet(plan.people[index])?1:2;
const round=(n:number)=>Math.round(n*10)/10;
export function sameCalculatedSharedServings(a:DisplayPlan,b:DisplayPlan){
 const portions=(p:DisplayPlan)=>p.people.map(person=>person.portions.map(x=>[x.grams,...macroKeys.map(k=>x.macros[k])]));
 return dishReviewKey(a.dishes)===dishReviewKey(b.dishes)&&JSON.stringify(portions(a))===JSON.stringify(portions(b));
}
export function shrinkPersonalStaples(plan:DisplayPlan,stock:Stock[],custom:CustomFood[]=[]):DisplayPlan{
 const people=plan.people.map(p=>{
  const weights=dailyMet(p)?p.portions.map(x=>x.grams):shrinkStapleWeights(plan.dishes,p.portions.map(x=>x.grams),p.target);
  return {...p,portions:p.portions.map((portion,j)=>{if(weights[j]===portion.grams)return portion;const d=plan.dishes[j];return {...portion,grams:weights[j],macros:Object.fromEntries(macroKeys.map(k=>[k,d.weight>0?d.macros[k]*weights[j]/d.weight:0])) as Macros};})};
 });
 const dishes=plan.dishes.map((d,j)=>{const weight=round(people.reduce((sum,p)=>sum+p.portions[j].grams,0));if(weight===d.weight)return d;const scale=d.weight>0?weight/d.weight:0;return {...d,weight,macros:Object.fromEntries(macroKeys.map(k=>[k,d.macros[k]*scale])) as Macros,ingredients:d.ingredients.map(i=>({...i,grams:i.grams*scale}))};});
 const quantities=new Map<string,number>();for(const d of dishes)for(const i of d.ingredients)quantities.set(i.id,round((quantities.get(i.id)??0)+i.grams));
 const ingredients=[...quantities].map(([id,grams])=>{const available=stock.find(s=>s.id===id)?.grams??0;return {id,grams,available,shortage:round(Math.max(0,grams-available))};});
 return assembleSides({...plan,dishes,people},plan.personalSides??[],stock,custom);
}
export function personalSideRoom(plan:DisplayPlan,personIndex:number,meal:Dish['meal']){
 const p=plan.people[personIndex];let bread=0,rotis=0;
 plan.dishes.forEach((d,j)=>{if(d.meal!==meal)return;if(d.weight>0)bread+=p.portions[j].grams*d.ingredients.filter(i=>i.id==='bread').reduce((sum,i)=>sum+i.grams,0)/d.weight;if(isRoti(d))rotis+=p.portions[j].grams;});
 return {remainingBreadRawGrams:Math.max(0,4*servingSizes.breadSlice-bread),remainingRotiCookedGrams:Math.max(0,4*servingSizes.roti-rotis)};
}
export function sharedDaily(plan:DisplayPlan,personIndex:number){return Object.fromEntries(macroKeys.map(k=>[k,plan.people[personIndex].portions.reduce((sum,p)=>sum+p.macros[k],0)])) as Macros;}
export function personalSideSlots(plan:DisplayPlan,meals:readonly Dish['meal'][]=mealNames){
 return plan.people.flatMap((p,personIndex)=>{
  if(dailyMet(p))return [];
  const daily=sharedDaily(plan,personIndex),macro=macroKeys.reduce((best,k)=>p.target[k]-daily[k]>p.target[best]-daily[best]?k:best,'protein' as typeof macroKeys[number]);
  if(p.target[macro]-daily[macro]<=5+1e-8)return [];
  return mealTotals(plan.dishes,p.portions,p.target).filter(m=>meals.includes(m.meal)).flatMap(m=>{
   const room=Math.max(...(['protein','carbs','fat'] as const).map(k=>p.target[k]*.4-m.macros[k]));
   return room>1e-8?[{personIndex,meal:m.meal,macro,grams:Math.max(0,Math.min(p.target[macro]-daily[macro],room)),dailyActual:daily,actual:m.macros,target:p.target,...personalSideRoom(plan,personIndex,m.meal)}]:[];
  });
 });
}
export function attachPersonalSideAlternatives(plan:DisplayPlan,groups:{personIndex:number;meal?:Dish['meal'];options:Dish[]}[],people:Person[],stock:Stock[],catalog:Food[],custom:CustomFood[]=[],meals:readonly Dish['meal'][]=mealNames):DisplayPlan{
 let result=assembleSides(plan,(plan.personalSides??[]).filter(s=>dailyMet(plan.people[s.personIndex])||!meals.includes(s.meal)),stock,custom);
 const required=stock.filter(s=>s.mustUse&&!allowedFood(catalog.find(f=>f.id===s.id)!,people));
 const rank=(p:DisplayPlan,personIndex:number)=>{
  const missing=required.filter(s=>!p.personalSides?.some(side=>side.dish.ingredients.some(i=>i.id===s.id&&i.grams>0))).length;
  const person=p.people[personIndex],gaps=macroKeys.map(k=>Math.max(0,(k==='fibre'?-person.gaps[k]:Math.abs(person.gaps[k]))-5)).sort((a,b)=>b-a);
  const rangeGaps=person.meals.flatMap(m=>(['protein','carbs','fat'] as const).map(k=>Math.abs(m.mealCheck.rangeGaps[k])/Math.max(person.target[k],1))),range=Math.max(...rangeGaps);
  return [...gaps,missing,(p.personalSides??[]).filter(s=>s.personIndex===personIndex&&isFatAddition(s.dish,servingAliases(catalog))).reduce((sum,s)=>sum+addedFatGrams(s.dish,servingAliases(catalog)),0),range,rangeGaps.reduce((sum,x)=>sum+x,0),macroKeys.reduce((sum,k)=>sum+(k==='fibre'?Math.max(0,-person.gaps[k]):Math.abs(person.gaps[k])),0)];
 };
 for(let personIndex=0;personIndex<people.length;personIndex++){
  if(dailyMet(plan.people[personIndex]))continue;
  const seen=new Set<string>(),eligible=groups.filter(g=>{const meal=g.meal??g.options[0]?.meal;if(g.personIndex!==personIndex||!meal||!meals.includes(meal)||seen.has(meal))return false;seen.add(meal);return true;});
  let combinations:Dish[][]=[[]];for(const group of eligible){const options=group.options.slice(0,4).filter(d=>d.meal===(group.meal??group.options[0]?.meal));const choices:Dish[][]=[[],...options.map(d=>[d])];if(sideCapacity(plan,personIndex)===2)for(let i=0;i<options.length;i++)for(let j=i+1;j<options.length;j++)if(dishReviewKey([options[i]])!==dishReviewKey([options[j]]))choices.push([options[i],options[j]]);combinations=combinations.flatMap(c=>choices.map(choice=>[...c,...choice]));}
  let best=result,bestRank=rank(best,personIndex);const retained=result.personalSides??[];
  const previous=(plan.personalSides??[]).filter(s=>s.personIndex===personIndex&&meals.includes(s.meal));
  if(previous.length){try{const baseline=fitSideCombination(result,personIndex,[],[...retained,...previous],people,stock,catalog,custom),baselineRank=rank(baseline,personIndex),first=baselineRank.findIndex((v,i)=>Math.abs(v-bestRank[i])>1e-7);if(first>=0&&baselineRank[first]<bestRank[first]){best=baseline;bestRank=baselineRank;}}catch{/* Older oversized sides must refit under current limits. */}}

  for(const adjustShared of [false,true]){
   const daily=sharedDaily(result,personIndex),target=result.people[personIndex].target;
   if(adjustShared&&(dailyMet(best.people[personIndex])||!(daily.fat>=target.fat-5&&result.people[personIndex].gaps.protein< -5||daily.carbs>target.carbs+5||daily.protein>target.protein+5)))break;
   for(const selected of combinations){if(!selected.length)continue;try{
    const candidate=fitSideCombination(result,personIndex,selected,retained,people,stock,catalog,custom,adjustShared),candidateRank=rank(candidate,personIndex);
    const first=candidateRank.findIndex((v,i)=>Math.abs(v-bestRank[i])>1e-7);if(first>=0&&candidateRank[first]<bestRank[first]){best=candidate;bestRank=candidateRank;}
    if(dailyMet(best.people[personIndex])&&best.people[personIndex].meals.every(m=>m.mealCheck.withinRange)&&bestRank[4]===0&&!best.personalSides?.some(s=>s.personIndex===personIndex&&isFatAddition(s.dish,servingAliases(catalog))))break;
   }catch{/* Unsafe or infeasible alternatives cannot be saved. */}}
  }
  result=best;
 }
 return result;
}

export function attachPersonalSides(plan:DisplayPlan,candidates:{personIndex:number;dish:Dish}[],people:Person[],stock:Stock[],catalog:Food[],custom:CustomFood[]=[],meals:readonly Dish['meal'][]=mealNames):DisplayPlan{
 if(!candidates.length)return assembleSides(plan,(plan.personalSides??[]).filter(s=>!meals.includes(s.meal)),stock,custom);
 const slots=personalSideSlots(plan),seen=new Map<string,number>();
 const retained=(plan.personalSides??[]).filter(s=>!meals.includes(s.meal));
 const sides:PersonalSide[]=[];
 for(const candidate of [...retained.map(s=>({personIndex:s.personIndex,dish:s.dish})),...candidates]){
  const {personIndex,dish}=candidate,key=`${personIndex}:${dish.meal}`,slot=slots.find(s=>s.personIndex===personIndex&&s.meal===dish.meal);
  if(!Number.isInteger(personIndex)||!people[personIndex]||!slot||(seen.get(key)??0)>=sideCapacity(plan,personIndex)||dish.role!=='side')throw new Error('Each eligible person may have at most two sides per meal for large gaps.');seen.set(key,(seen.get(key)??0)+1);
  // Identical ingredient checks; only their recipient defines the diet/allergies.
  validateDishIngredients(dish,[people[personIndex]],stock,catalog);
  try{checkSideRotation([...sides.filter(s=>s.personIndex===personIndex).map(s=>s.dish),dish],servingAliases(catalog));}catch{continue;}
  const daily=sharedDaily(plan,personIndex);for(const s of sides.filter(s=>s.personIndex===personIndex))for(const k of macroKeys)daily[k]+=s.dish.macros[k];
  const prior=retained.find(s=>s.dish===dish);const target=plan.people[personIndex].target;const priority=prior?.closes??macroKeys.filter(k=>dish.macros[k]>0).reduce((best,k)=>target[k]-daily[k]>target[best]-daily[best]?k:best,macroKeys.find(k=>dish.macros[k]>0)??'protein');
  const perGram=dish.macros[priority]/dish.weight;if(perGram<=0)continue;
  let cap=Math.min(personalServingCap(dish),retained.some(s=>s.dish===dish)?dish.weight:Infinity);const person=plan.people[personIndex];
  const bread=dish.ingredients.filter(i=>i.id==='bread').reduce((sum,i)=>sum+i.grams,0);
  if(bread>0){const used=plan.dishes.reduce((sum,d,j)=>sum+(d.meal===dish.meal&&d.weight>0?person.portions[j].grams*d.ingredients.filter(i=>i.id==='bread').reduce((s,i)=>s+i.grams,0)/d.weight:0),0);cap=Math.min(cap,Math.max(0,4*servingSizes.breadSlice-used)*dish.weight/bread);}
  if(isRoti(dish)){const used=plan.dishes.reduce((sum,d,j)=>sum+(d.meal===dish.meal&&isRoti(d)?person.portions[j].grams:0),0);cap=Math.min(cap,Math.max(0,4*servingSizes.roti-used));}
  // Daily upper budgets apply across all sides; fibre deliberately has no upper cap.
  for(const k of ['protein','carbs','fat'] as const)if(dish.macros[k]>0)cap=Math.min(cap,Math.max(0,target[k]+5-daily[k])*dish.weight/dish.macros[k]);
  const gap=prior?Infinity:Math.max(0,Math.min(target[priority]-daily[priority],priority==='fibre'?Infinity:target[priority]*.4-slot.actual[priority]));
  const weight=Math.floor(Math.min(cap,gap/perGram)*10+1e-8)/10;const egg=dish.ingredients.filter(i=>i.id==='egg').reduce((sum,i)=>sum+i.grams,0);
  const fat=addedFatGrams(dish,servingAliases(catalog)),usedFat=sides.filter(s=>s.personIndex===personIndex).reduce((sum,s)=>sum+addedFatGrams(s.dish,servingAliases(catalog)),0);if(fat>0&&weight*fat/dish.weight+usedFat>28+1e-8)continue;
  const minimum=sideMinimum(dish);
  if(weight+1e-8<minimum)continue;
  const scale=weight/dish.weight;const scaled={...dish,weight,macros:Object.fromEntries(macroKeys.map(k=>[k,dish.macros[k]*scale])) as Macros,ingredients:dish.ingredients.map(i=>({...i,grams:i.grams*scale}))};
  sides.push({personIndex,meal:dish.meal,closes:priority,dish:scaled});
 }
 const quantities=new Map<string,number>();for(const d of [...plan.dishes,...sides.map(s=>s.dish)])for(const i of d.ingredients)quantities.set(i.id,round((quantities.get(i.id)??0)+i.grams));
 const ingredients=[...quantities].map(([id,grams])=>{const available=stock.find(s=>s.id===id)?.grams??0;return {id,grams,available,shortage:round(Math.max(0,grams-available))};});
 const {sideNotice,...base}=plan;return withHouseholdMeasures({...base,personalSides:sides,ingredients},custom);
}

// Shared recipe choices and ingredient ratios stay unchanged when portions rebalance.
export function sameSharedRecipeRatios(a:DisplayPlan,b:DisplayPlan){
 return a.dishes.length===b.dishes.length&&a.dishes.every((d,j)=>{const e=b.dishes[j],scale=d.weight>0?e.weight/d.weight:1;return d.name===e.name&&d.meal===e.meal&&d.role===e.role&&d.ingredients.length===e.ingredients.length&&d.ingredients.every((x,k)=>x.id===e.ingredients[k].id&&Math.abs(x.grams*scale-e.ingredients[k].grams)<1e-6)&&macroKeys.every(k=>Math.abs(d.macros[k]*scale-e.macros[k])<1e-6);});
}
