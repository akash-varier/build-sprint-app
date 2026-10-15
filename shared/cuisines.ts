import type {Person} from './food';
export const cuisines=['Indian','Continental'] as const;
export type Cuisine=typeof cuisines[number];
export type MealCuisines={breakfast:Cuisine;lunch:Cuisine;dinner:Cuisine};
export function initialMealCuisines(people:Pick<Person,'preferences'>[],saved?:MealCuisines):MealCuisines{
 if(saved)return {...saved};
 const found=people.map(p=>cuisines.find(c=>new RegExp(`\\b${c}\\b`,'i').test(p.preferences))).find(Boolean)??'Indian';
 return {breakfast:found,lunch:found,dinner:found};
}
export function likesForMenu(text:string){return cuisines.some(c=>c.toLowerCase()===text.trim().toLowerCase())?'':text;}
