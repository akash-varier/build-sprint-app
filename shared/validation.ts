import { z } from 'zod';
import { allergyNames, foods, allowedFood, foodById, macroKeys, type Person, type Stock, type Dish } from './food';
import { units,supportedUnits,type FridgeEntry } from './units';
const number=z.number().finite().nonnegative();
export const macrosSchema=z.object({protein:number,carbs:number,fat:number,fibre:number}).strict();
export const peopleSchema=z.array(z.object({name:z.string().trim().min(1).max(40),target:macrosSchema,diet:z.enum(['veg','egg','nonveg']),allergies:z.array(z.enum(allergyNames)).max(9),preferences:z.string().trim().max(100)}).strict()).min(1).max(6);
export const stockSchema=z.array(z.object({id:z.string().max(60),grams:z.number().finite().positive().max(100000),mustUse:z.boolean(),quantity:z.number().optional(),unit:z.enum(units).optional()}).strict()).min(1).max(foods.length);
const dishSchema=z.object({meal:z.enum(['breakfast','lunch','dinner']),role:z.enum(['main','staple','side']).optional(),name:z.string().min(1).max(80),weight:z.number().finite().positive().max(15000),macros:macrosSchema,ingredients:z.array(z.object({id:z.string(),grams:z.number().finite().positive().max(15000)}).strict()).min(1).max(12)}).strict();
// Legacy three-dish plans remain readable. New AI requests require item roles.
export const dishesSchema=z.object({dishes:z.array(dishSchema).min(3).max(9)}).strict();
export const menuItemsSchema=z.object({dishes:z.array(dishSchema.extend({role:z.enum(['main','staple','side'])})).min(6).max(9)}).strict();
export const mealNames=['breakfast','lunch','dinner'] as const;
export const stapleIds=new Set(['bread','pasta','rice','potato','oats','atta']);
export function validateInputs(people:Person[],stock:Stock[]) {
 if(!peopleSchema.safeParse(people).success)throw new Error('Enter names, valid daily targets, and supported allergies for 1–6 people.');
 if(!stockSchema.safeParse(stock).success)throw new Error('Add at least one ingredient with a quantity greater than zero.');
 if(new Set(stock.map(s=>s.id)).size!==stock.length)throw new Error('Remove duplicate ingredients.');
 if(new Set(people.map(p=>p.name.trim().toLowerCase())).size!==people.length)throw new Error('Give each family member a different name.');
 for(const p of people)for(const k of macroKeys)if(p.target[k]>({protein:400,carbs:800,fat:250,fibre:100}[k]))throw new Error('One of the daily targets is too high. Check the grams.');
 if(people.some(p=>macroKeys.every(k=>p.target[k]===0)))throw new Error('Enter daily targets for every person.');
 for(const s of stock){const f=foodById.get(s.id);if(!f)throw new Error('Choose ingredients from the suggestions.');if(s.mustUse&&!allowedFood(f,people))throw new Error(`${f.name} cannot be must-use because of a family allergy or dietary choice.`);}
}
export type IngredientConflict={dish:string;ingredientId:string;ingredient:string;person:string|null;reason:'unknown ingredient'|'diet conflict'|'allergy conflict';detail:string};
export class UnsafeMenuError extends Error {
 constructor(public conflicts:IngredientConflict[]){super(conflicts.map(c=>c.reason==='unknown ingredient'?`${c.dish} contains an ingredient we don’t recognise: ${c.ingredientId}.`:`${c.dish} contains ${c.ingredient}, which conflicts with ${c.person}’s ${c.detail}.`).join(' ')+' No menu was saved. Generate again.');this.name='UnsafeMenuError';}
}
function ingredientConflicts(dish:string,id:string,people:Person[]):IngredientConflict[]{
 const f=foodById.get(id);
 if(!f)return [{dish,ingredientId:id,ingredient:id,person:null,reason:'unknown ingredient',detail:'Unknown ingredient ID'}];
 const conflicts:IngredientConflict[]=[];
 for(const p of people){
  if((p.diet==='veg'&&f.diet!=='veg')||(p.diet==='egg'&&f.diet==='nonveg'))conflicts.push({dish,ingredientId:id,ingredient:f.name,person:p.name,reason:'diet conflict',detail:p.diet==='veg'?'vegetarian diet':'vegetarian + eggs diet'});
  for(const allergy of f.allergens.filter(a=>p.allergies.includes(a)))conflicts.push({dish,ingredientId:id,ingredient:f.name,person:p.name,reason:'allergy conflict',detail:`${allergy} allergy`});
 }
 return conflicts;
}
export function validateDishes(dishes:Dish[],people:Person[],stock:Stock[]) {
 dishesSchema.parse({dishes});
 const legacy=dishes.length===3&&dishes.every(d=>d.role===undefined);
 if(legacy){if(dishes.map(d=>d.meal).join(',')!=='breakfast,lunch,dinner')throw new Error('The menu must contain breakfast, lunch and dinner.');}
 else {
  menuItemsSchema.parse({dishes});
  for(const meal of mealNames){const items=dishes.filter(d=>d.meal===meal);
   if(items.length<2||items.length>3||items.filter(d=>d.role==='main').length!==1||items.filter(d=>d.role==='staple').length!==1||items.filter(d=>d.role==='side').length>1)throw new Error('Each meal needs one main, one staple and at most one side.');
   const staple=items.find(d=>d.role==='staple')!;
   if(!staple.ingredients.some(i=>stapleIds.has(i.id)&&stock.some(s=>s.id===i.id)))throw new Error('Choose a staple ingredient available in the fridge.');
  }
 }

 const ids=new Set(stock.map(s=>s.id));const used=new Set<string>();
 for(const d of dishes){
  if(new Set(d.ingredients.map(i=>i.id)).size!==d.ingredients.length)throw new Error('Repeated recipe ingredient.');
  const meaningful=d.ingredients.filter(i=>i.id!=='water');
  if(!meaningful.length||meaningful.filter(i=>ids.has(i.id)).length/meaningful.length<0.8)throw new Error('Too few available ingredients.');
  for(const i of d.ingredients){const f=foodById.get(i.id);if(!f||!allowedFood(f,people))throw new UnsafeMenuError(ingredientConflicts(d.name,i.id,people));used.add(i.id);}
  if(d.macros.fibre>d.macros.carbs||d.macros.protein+d.macros.carbs+d.macros.fat>d.weight)throw new Error('Invalid dish nutrition.');
 }
 if(stock.some(s=>s.mustUse&&!used.has(s.id)))throw new Error('A must-use ingredient was missed.');
}

export function validateFridgeInputs(people:Person[],entries:FridgeEntry[]) {
 const schema=z.array(z.object({id:z.string(),quantity:z.number().finite().positive(),unit:z.enum(units),mustUse:z.boolean()}).strict()).min(1).max(foods.length);
 if(!schema.safeParse(entries).success)throw new Error('Add ingredients with quantities greater than zero.');
 for(const e of entries)if(!supportedUnits(e.id).includes(e.unit))throw new Error('Choose a supported ingredient unit.');
 // Shared identity and family checks; actual quantities are validated in Convex.
 validateInputs(people,entries.map(e=>({id:e.id,grams:1,mustUse:e.mustUse})));
}
