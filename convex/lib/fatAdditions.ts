import type {Dish} from '../../shared/food';
export const addedFatIds=['oil','ghee','butter'];
export function addedFatGrams(d:Dish,aliases:Record<string,string>={}){return d.ingredients.filter(i=>addedFatIds.includes(aliases[i.id]??i.id)).reduce((sum,i)=>sum+i.grams,0);}
export function isFatAddition(d:Dish,aliases:Record<string,string>={}){
 const food=d.ingredients.filter(i=>!['water','salt','cumin','turmeric','garlic','ginger','lemon'].includes(aliases[i.id]??i.id));
 return food.length>0&&food.every(i=>addedFatIds.includes(aliases[i.id]??i.id));
}
export function labelFatAddition(d:Dish,host:string,aliases:Record<string,string>={}){
 const additions=d.ingredients.filter(i=>addedFatIds.includes(aliases[i.id]??i.id));
 const amount=additions.map(i=>`${Number((i.grams/4.6).toFixed(2))} tsp ${aliases[i.id]??i.id}`).join(' and ');
 return {...d,name:`Add ${amount} to your ${host}`};
}
