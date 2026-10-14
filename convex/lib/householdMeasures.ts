import { withinMacroTolerance } from '../../shared/food';
import type { MealPlan } from './portions';
function reference(name:string):{singular:string;plural:string;grams:number}{
 const n=name.toLowerCase();
 const mixed=/\b(with|and|dal|rice|curry|stew)\b|[+&]/.test(n);
 if(!mixed&&/\b(rotis?|chapatis?|phulkas?)\b/.test(n))return {singular:'roti',plural:'rotis',grams:40};
 if(!mixed&&/\b(parathas?)\b/.test(n))return {singular:'paratha',plural:'parathas',grams:80};
 if(!mixed&&/\b(idlis?)\b/.test(n))return {singular:'idli',plural:'idlis',grams:40};
 if(/oats|porridge|rice/.test(n)&&!/dal|lentil|stew|curry/.test(n))return {singular:'cup',plural:'cups',grams:/rice/.test(n)?158:240};
 return {singular:'katori',plural:'katoris',grams:150};
}
export function portionMeasure(name:string,grams:number):string{
 const r=reference(name);const count=Math.max(0.25,Math.round(grams/r.grams*4)/4);
 return `About ${count} ${count===1?r.singular:r.plural}`;
}
export function withHouseholdMeasures(plan:MealPlan){
 return {...plan,people:plan.people.map(p=>({...p,withinTolerance:withinMacroTolerance(p.gaps),portions:p.portions.map((portion,j)=>({...portion,measure:portionMeasure(plan.dishes[j].name,portion.grams)}))}))};
}
export type DisplayPlan=ReturnType<typeof withHouseholdMeasures>;
