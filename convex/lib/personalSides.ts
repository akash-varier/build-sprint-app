import {macroKeys,type Dish,type Person,type Stock,type Food,type Macros} from '../../shared/food';
import {biggestMealShortfall,type PersonalSide} from '../../shared/personalSides';
import {mealNames,validateDishIngredients} from '../../shared/validation';
import {mealTotals,servingCap,isRoti,servingSizes} from './portions';
import {withHouseholdMeasures,type DisplayPlan} from './householdMeasures';
import type {CustomFood} from '../../shared/ingredientEstimate';
const round=(n:number)=>Math.round(n*10)/10;
export function personalSideRoom(plan:DisplayPlan,personIndex:number,meal:Dish['meal']){
 const p=plan.people[personIndex];let bread=0,rotis=0;
 plan.dishes.forEach((d,j)=>{if(d.meal!==meal)return;if(d.weight>0)bread+=p.portions[j].grams*d.ingredients.filter(i=>i.id==='bread').reduce((sum,i)=>sum+i.grams,0)/d.weight;if(isRoti(d))rotis+=p.portions[j].grams;});
 return {remainingBreadRawGrams:Math.max(0,4*servingSizes.breadSlice-bread),remainingRotiCookedGrams:Math.max(0,4*servingSizes.roti-rotis)};
}
export function personalSideSlots(plan:DisplayPlan,meals:readonly Dish['meal'][]=mealNames){
 return plan.people.flatMap((p,personIndex)=>mealTotals(plan.dishes,p.portions,p.target).filter(m=>meals.includes(m.meal)).flatMap(m=>{const gap=biggestMealShortfall(m.macros,p.target);return gap?[{personIndex,meal:m.meal,macro:gap.macro,grams:gap.grams,actual:m.macros,target:p.target,...personalSideRoom(plan,personIndex,m.meal)}]:[];}));
}
export function attachPersonalSides(plan:DisplayPlan,candidates:{personIndex:number;dish:Dish}[],people:Person[],stock:Stock[],catalog:Food[],custom:CustomFood[]=[],meals:readonly Dish['meal'][]=mealNames):DisplayPlan{
 const slots=personalSideSlots(plan,meals),seen=new Set<string>();
 const sides:PersonalSide[]=(plan.personalSides??[]).filter(s=>!meals.includes(s.meal));
 for(const candidate of candidates){
  const {personIndex,dish}=candidate,key=`${personIndex}:${dish.meal}`,slot=slots.find(s=>s.personIndex===personIndex&&s.meal===dish.meal);
  if(!Number.isInteger(personIndex)||!people[personIndex]||!slot||seen.has(key)||dish.role!=='side')throw new Error('Each eligible person may have at most one side per meal.');seen.add(key);
  // Identical ingredient checks; only their recipient defines the diet/allergies.
  validateDishIngredients(dish,[people[personIndex]],stock,catalog);
  const perGram=dish.macros[slot.macro]/dish.weight;if(perGram<=0)continue;
  let cap=servingCap(dish);const person=plan.people[personIndex];
  const bread=dish.ingredients.filter(i=>i.id==='bread').reduce((sum,i)=>sum+i.grams,0);
  if(bread>0){const used=plan.dishes.reduce((sum,d,j)=>sum+(d.meal===dish.meal&&d.weight>0?person.portions[j].grams*d.ingredients.filter(i=>i.id==='bread').reduce((s,i)=>s+i.grams,0)/d.weight:0),0);cap=Math.min(cap,Math.max(0,4*servingSizes.breadSlice-used)*dish.weight/bread);}
  if(isRoti(dish)){const used=plan.dishes.reduce((sum,d,j)=>sum+(d.meal===dish.meal&&isRoti(d)?person.portions[j].grams:0),0);cap=Math.min(cap,Math.max(0,4*servingSizes.roti-used));}
  // Close the biggest shortfall to the 25% boundary; never enlarge beyond caps.
  const weight=Math.floor(Math.min(cap,slot.grams/perGram)*10+1e-8)/10;if(weight<=0)continue;
  const scale=weight/dish.weight;const scaled={...dish,weight,macros:Object.fromEntries(macroKeys.map(k=>[k,dish.macros[k]*scale])) as Macros,ingredients:dish.ingredients.map(i=>({...i,grams:i.grams*scale}))};
  sides.push({personIndex,meal:dish.meal,closes:slot.macro,dish:scaled});
 }
 const quantities=new Map<string,number>();for(const d of [...plan.dishes,...sides.map(s=>s.dish)])for(const i of d.ingredients)quantities.set(i.id,round((quantities.get(i.id)??0)+i.grams));
 const ingredients=[...quantities].map(([id,grams])=>{const available=stock.find(s=>s.id===id)?.grams??0;return {id,grams,available,shortage:round(Math.max(0,grams-available))};});
 const {sideNotice,...base}=plan;return withHouseholdMeasures({...base,personalSides:sides,ingredients},custom);
}
