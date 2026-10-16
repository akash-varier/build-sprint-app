import type {Person} from './food';
export const cuisines=['North Indian','South Indian','Continental','Italian','Chinese / Indo-Chinese','Mediterranean','Mexican','Thai'] as const;
export const supportedCuisines=[...cuisines,'Indian'] as const;
export type Cuisine=typeof supportedCuisines[number];
export type MealCuisines={breakfast:Cuisine;lunch:Cuisine;dinner:Cuisine};
export function initialMealCuisines(people:Pick<Person,'preferences'>[],saved?:MealCuisines):MealCuisines{
 if(saved)return {...saved};
 const found=people.map(p=>supportedCuisines.find(c=>new RegExp(`\\b${c}\\b`,'i').test(p.preferences))).find(Boolean)??'North Indian';
 return {breakfast:found,lunch:found,dinner:found};
}
export function likesForMenu(text:string){return supportedCuisines.some(c=>c.toLowerCase()===text.trim().toLowerCase())?'':text;}

export const cuisineStaples:Record<Cuisine,readonly string[]>={Indian:['rice','atta'],'North Indian':['rice','atta'],'South Indian':['rice'],Continental:['bread','pasta','potato'],Italian:['bread','pasta','potato'],'Chinese / Indo-Chinese':['rice','pasta'],Mediterranean:['bread','rice','pasta','potato'],Mexican:['rice','atta'],Thai:['rice','pasta']};
