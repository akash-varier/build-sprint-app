import type {CustomFood} from '../../shared/ingredientEstimate';
import type {MealCuisines} from '../../shared/cuisines';
import {naturalAmount} from './ingredientUnits';
import {mealCheck,mealTotals,servingSizes} from './portions';
import { withinMacroTolerance } from '../../shared/food';
import type { MealPlan } from './portions';
function reference(name:string):{singular:string;plural:string;grams:number}{
 const n=name.toLowerCase();
 const mixed=/\b(with|and|dal|rice|curry|stew)\b|[+&]/.test(n);
 if(!mixed&&/\b(rotis?|chapatis?|phulkas?)\b/.test(n))return {singular:'roti',plural:'rotis',grams:40};
 if(!mixed&&/\b(parathas?)\b/.test(n))return {singular:'paratha',plural:'parathas',grams:80};
 if(!mixed&&/\b(idlis?)\b/.test(n))return {singular:'idli',plural:'idlis',grams:40};
 if(/oats|porridge|rice/.test(n)&&!/dal|lentil|stew|curry/.test(n))return {singular:'cup',plural:'cups',grams:/rice/.test(n)?servingSizes.cookedRiceCup:240};
 return {singular:'katori',plural:'katoris',grams:servingSizes.katori};
}
export function portionMeasure(name:string,grams:number):string{
 if(grams===0)return 'No serving';
 if(/bread|toast/.test(name.toLowerCase()))return `About ${Math.round(grams/servingSizes.breadSlice*4)/4} slices`;
 const r=reference(name);const count=Math.max(0.25,Math.round(grams/r.grams*4)/4);
 return `About ${count} ${count===1?r.singular:r.plural}`;
}
function itemMeasure(dish:StoredPlan['dishes'][number],grams:number){
 const bread=dish.ingredients.filter(i=>i.id==='bread').reduce((sum,i)=>sum+i.grams,0);
 if(bread>0&&dish.weight>0)return `About ${Math.round(bread*grams/dish.weight/servingSizes.breadSlice*4)/4} slices`;
 return portionMeasure(dish.name,grams);
}
export function withHouseholdMeasures(plan:StoredPlan,custom:CustomFood[]=[]){
 return {...plan,servingCapsApplied:plan.people.every(p=>p.portions.every(x=>x.mealCheck!==undefined)),ingredients:plan.ingredients.map(i=>({...i,measure:naturalAmount(i.id,i.grams,custom),availableMeasure:naturalAmount(i.id,i.available,custom),shortageMeasure:naturalAmount(i.id,i.shortage,custom)})),people:plan.people.map(p=>({...p,withinTolerance:withinMacroTolerance(p.gaps),meals:mealTotals(plan.dishes,p.portions,p.target),portions:p.portions.map((portion,j)=>({...portion,mealCheck:mealCheck(portion.macros,p.target),measure:itemMeasure(plan.dishes[j],portion.grams)}))}))};
}
export type StoredPlan=Omit<MealPlan,'people'> & {mealCuisines?:MealCuisines} & {people:(Omit<MealPlan['people'][number],'portions'|'meals'> & {meals?:MealPlan['people'][number]['meals']} & {portions:{grams:number;macros:MealPlan['people'][number]['total'];measure?:string;mealCheck?:ReturnType<typeof mealCheck>}[]})[]};
export type DisplayPlan=ReturnType<typeof withHouseholdMeasures>;
