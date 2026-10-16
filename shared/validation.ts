import {cuisineStaples,type MealCuisines} from './cuisines';
import { z } from 'zod';
import { allergyNames, foods, allowedFood, foodById, macroKeys, type Food, type Person, type Stock, type Dish } from './food';
import { units,supportedUnits,type FridgeEntry } from './units';
const number=z.number().finite().nonnegative();
export const macrosSchema=z.object({protein:number,carbs:number,fat:number,fibre:number}).strict();
export const peopleSchema=z.array(z.object({name:z.string().trim().min(1).max(40),target:macrosSchema,diet:z.enum(['veg','egg','nonveg']),allergies:z.array(z.enum(allergyNames)).max(9),preferences:z.string().trim().max(100)}).strict()).min(1).max(6);
export const stockSchema=z.array(z.object({id:z.string().max(60),grams:z.number().finite().positive().max(100000),mustUse:z.boolean(),quantity:z.number().optional(),unit:z.enum(units).optional()}).strict()).max(240);
export const dishSchema=z.object({meal:z.enum(['breakfast','lunch','dinner']),role:z.enum(['main','staple','side']).optional(),name:z.string().min(1).max(80),weight:z.number().finite().positive().max(15000),macros:macrosSchema,ingredients:z.array(z.object({id:z.string(),grams:z.number().finite().positive().max(15000)}).strict()).min(1).max(12)}).strict();
export const singleDishSchema=dishSchema.extend({role:z.enum(['main','staple','side'])});
// Legacy three-dish plans remain readable. New AI requests require item roles.
export const dishesSchema=z.object({dishes:z.array(dishSchema).min(3).max(9)}).strict();
export const menuItemsSchema=z.object({dishes:z.array(dishSchema.extend({role:z.enum(['main','staple','side'])})).min(6).max(9)}).strict();
export const mealNames=['breakfast','lunch','dinner'] as const;
export const stapleIds=new Set(['bread','pasta','rice','potato','oats','atta']);
export function validateInputs(people:Person[],stock:Stock[],catalog:Food[]=foods) {
 if(!peopleSchema.safeParse(people).success)throw new Error('Enter names, valid daily targets, and supported allergies for 1–6 people.');
 if(!stockSchema.safeParse(stock).success)throw new Error('Enter a quantity greater than zero for each fridge ingredient.');
 if(new Set(stock.map(s=>s.id)).size!==stock.length)throw new Error('Remove duplicate ingredients.');
 if(new Set(people.map(p=>p.name.trim().toLowerCase())).size!==people.length)throw new Error('Give each family member a different name.');
 for(const p of people)for(const k of macroKeys)if(p.target[k]>({protein:400,carbs:800,fat:250,fibre:100}[k]))throw new Error('One of the daily targets is too high. Check the grams.');
 if(people.some(p=>macroKeys.every(k=>p.target[k]===0)))throw new Error('Enter daily targets for every person.');
 for(const s of stock){const f=catalog.find(f=>f.id===s.id);if(!f)throw new Error('Choose ingredients from the suggestions.');if(s.mustUse&&!allowedFood(f,people))throw new Error(`${f.name} cannot be must-use because of a family allergy or dietary choice.`);}
}
export type IngredientConflict={dish:string;ingredientId:string;ingredient:string;person:string|null;reason:'unknown ingredient'|'diet conflict'|'allergy conflict';detail:string};
export class UnsafeMenuError extends Error {
 constructor(public conflicts:IngredientConflict[]){super(conflicts.map(c=>c.reason==='unknown ingredient'?`${c.dish} contains an ingredient we don’t recognise: ${c.ingredientId}.`:`${c.dish} contains ${c.ingredient}, which conflicts with ${c.person}’s ${c.detail}.`).join(' ')+' No menu was saved. Generate again.');this.name='UnsafeMenuError';}
}
function ingredientConflicts(dish:string,id:string,people:Person[],catalog:Food[]):IngredientConflict[]{
 const f=catalog.find(f=>f.id===id);
 if(!f)return [{dish,ingredientId:id,ingredient:id,person:null,reason:'unknown ingredient',detail:'Unknown ingredient ID'}];
 const conflicts:IngredientConflict[]=[];
 for(const p of people){
  if((p.diet==='veg'&&f.diet!=='veg')||(p.diet==='egg'&&f.diet==='nonveg'))conflicts.push({dish,ingredientId:id,ingredient:f.name,person:p.name,reason:'diet conflict',detail:p.diet==='veg'?'vegetarian diet':'vegetarian + eggs diet'});
  for(const allergy of f.allergens.filter(a=>p.allergies.includes(a)))conflicts.push({dish,ingredientId:id,ingredient:f.name,person:p.name,reason:'allergy conflict',detail:`${allergy} allergy`});
 }
 return conflicts;
}
export function validateDishes(dishes:Dish[],people:Person[],stock:Stock[],mealCuisines?:MealCuisines,catalog:Food[]=foods) {
 dishesSchema.parse({dishes});
 const legacy=dishes.length===3&&dishes.every(d=>d.role===undefined);
 if(legacy){if(dishes.map(d=>d.meal).join(',')!=='breakfast,lunch,dinner')throw new Error('The menu must contain breakfast, lunch and dinner.');}
 else {
  menuItemsSchema.parse({dishes});
  for(const meal of mealNames){const items=dishes.filter(d=>d.meal===meal);
   if(items.length<2||items.length>3||items.filter(d=>d.role==='main').length!==1||items.filter(d=>d.role==='staple').length!==1||items.filter(d=>d.role==='side').length>1)throw new Error('Each meal needs one main, one staple and at most one side.');
   const staple=items.find(d=>d.role==='staple')!;
   const compatible=mealCuisines?new Set(cuisineStaples[mealCuisines[meal]]):stapleIds;
   if(!staple.ingredients.some(i=>compatible.has(i.id)))throw new Error('Choose a staple matching the meal cuisine.');
  }
 }

 const used=new Set<string>();
 for(const d of dishes){validateDishIngredients(d,people,stock,catalog);for(const i of d.ingredients)used.add(i.id);}
 if(stock.some(s=>s.mustUse&&!used.has(s.id)))throw new Error('A must-use ingredient was missed.');
}

export function validateDishIngredients(d:Dish,people:Person[],stock:Stock[],catalog:Food[]=foods){
 dishSchema.parse(d);
 if(new Set(d.ingredients.map(i=>i.id)).size!==d.ingredients.length)throw new Error('Repeated recipe ingredient.');
  const meaningful=d.ingredients.filter(i=>i.id!=='water');
  if(!meaningful.length)throw new Error('A dish needs at least one food ingredient.');
  for(const i of d.ingredients){const f=catalog.find(f=>f.id===i.id);if(!f||!allowedFood(f,people))throw new UnsafeMenuError(ingredientConflicts(d.name,i.id,people,catalog));}
  if(d.macros.fibre>d.macros.carbs||d.macros.protein+d.macros.carbs+d.macros.fat>d.weight)throw new Error('Invalid dish nutrition.');
}

export function validateFridgeInputs(people:Person[],entries:FridgeEntry[],catalog:Food[]=foods) {
 const schema=z.array(z.object({id:z.string(),quantity:z.number().finite().positive(),unit:z.enum(units),mustUse:z.boolean()}).strict()).max(240);
 if(!schema.safeParse(entries).success)throw new Error('Enter quantities greater than zero for fridge ingredients.');
 for(const e of entries)if(!catalog.some(f=>f.id===e.id)||(e.id.startsWith('custom_')?!['g','kg','pieces','katori'].includes(e.unit):!supportedUnits(e.id).includes(e.unit)))throw new Error('Choose a supported ingredient unit.');
 // Shared identity and family checks; actual quantities are validated in Convex.
 validateInputs(people,entries.map(e=>({id:e.id,grams:1,mustUse:e.mustUse})),catalog);
}
