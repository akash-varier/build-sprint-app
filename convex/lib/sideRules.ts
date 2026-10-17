import type {Dish} from '../../shared/food';
export function sideIngredientCounts(dishes:Dish[],aliases:Record<string,string>={}){
 const counts=new Map<string,number>();
 for(const d of dishes)for(const id of new Set(d.ingredients.filter(i=>i.grams>0).map(i=>aliases[i.id]??i.id).filter(id=>id!=='water')))counts.set(id,(counts.get(id)??0)+1);
 return counts;
}
export function checkSideRotation(dishes:Dish[],aliases:Record<string,string>={}){
 const repeated=[...sideIngredientCounts(dishes,aliases)].find(([,count])=>count>2);
 if(repeated)throw new Error(`Personal side ingredient ${repeated[0]} exceeds twice per person per day.`);
}
