import {dishReviewKey} from '../../shared/review';
import {macroKeys,type Dish,type Person,type Stock,type Food,type Macros} from '../../shared/food';
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
 const seen=new Set<string>();
 for(const group of groups){
  const meal=group.meal??group.options[0]?.meal,key=`${group.personIndex}:${meal}`;
  if(!meal||!meals.includes(meal)||seen.has(key))continue;seen.add(key);
  if(result.personalSides?.some(s=>s.personIndex===group.personIndex&&s.meal===meal))continue;
  const target=result.people[group.personIndex]?.target;if(!target)continue;
  const daily=sharedDaily(result,group.personIndex);for(const s of result.personalSides??[])if(s.personIndex===group.personIndex)for(const k of macroKeys)daily[k]+=s.dish.macros[k];
  const priority=macroKeys.reduce((best,k)=>target[k]-daily[k]>target[best]-daily[best]?k:best,'protein' as typeof macroKeys[number]);
  let best=result,improvement=0;
  for(const dish of group.options.slice(0,4)){
   if(dish.meal!==meal)continue;
   try {
    const fitted=attachPersonalSides(result,[{personIndex:group.personIndex,dish}],people,stock,catalog,custom,[]);
    const side=fitted.personalSides?.find(s=>s.personIndex===group.personIndex&&s.meal===meal),gain=side?.dish.macros[priority]??0;
    if(gain>improvement){best=fitted;improvement=gain;}
   }catch(error){console.error('Personal side alternative rejected:',error instanceof UnsafeMenuError?JSON.stringify({conflicts:error.conflicts}):error instanceof Error?error.message:String(error));}
  }
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
  const prior=retained.find(s=>s.dish===dish);const target=plan.people[personIndex].target;const priority=prior?.closes??macroKeys.reduce((best,k)=>target[k]-daily[k]>target[best]-daily[best]?k:best,'protein' as typeof macroKeys[number]);
  const perGram=dish.macros[priority]/dish.weight;if(perGram<=0)continue;
  let cap=Math.min(servingCap(dish),retained.some(s=>s.dish===dish)?dish.weight:Infinity);const person=plan.people[personIndex];
  const bread=dish.ingredients.filter(i=>i.id==='bread').reduce((sum,i)=>sum+i.grams,0);
  if(bread>0){const used=plan.dishes.reduce((sum,d,j)=>sum+(d.meal===dish.meal&&d.weight>0?person.portions[j].grams*d.ingredients.filter(i=>i.id==='bread').reduce((s,i)=>s+i.grams,0)/d.weight:0),0);cap=Math.min(cap,Math.max(0,4*servingSizes.breadSlice-used)*dish.weight/bread);}
  if(isRoti(dish)){const used=plan.dishes.reduce((sum,d,j)=>sum+(d.meal===dish.meal&&isRoti(d)?person.portions[j].grams:0),0);cap=Math.min(cap,Math.max(0,4*servingSizes.roti-used));}
  // Daily upper budgets apply across all sides; fibre deliberately has no upper cap.
  for(const k of ['protein','carbs','fat'] as const)if(dish.macros[k]>0)cap=Math.min(cap,Math.max(0,target[k]+5-daily[k])*dish.weight/dish.macros[k]);
  const gap=prior?Infinity:Math.max(0,Math.min(target[priority]-daily[priority],priority==='fibre'?Infinity:target[priority]*.4-slot.actual[priority]));
  const weight=Math.floor(Math.min(cap,gap/perGram)*10+1e-8)/10;if(weight<=0)continue;
  const scale=weight/dish.weight;const scaled={...dish,weight,macros:Object.fromEntries(macroKeys.map(k=>[k,dish.macros[k]*scale])) as Macros,ingredients:dish.ingredients.map(i=>({...i,grams:i.grams*scale}))};
  sides.push({personIndex,meal:dish.meal,closes:priority,dish:scaled});
 }
 const quantities=new Map<string,number>();for(const d of [...plan.dishes,...sides.map(s=>s.dish)])for(const i of d.ingredients)quantities.set(i.id,round((quantities.get(i.id)??0)+i.grams));
 const ingredients=[...quantities].map(([id,grams])=>{const available=stock.find(s=>s.id===id)?.grams??0;return {id,grams,available,shortage:round(Math.max(0,grams-available))};});
 const {sideNotice,...base}=plan;return withHouseholdMeasures({...base,personalSides:sides,ingredients},custom);
}
