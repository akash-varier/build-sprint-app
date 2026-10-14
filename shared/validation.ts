import { z } from 'zod';
import { allergyNames, allowedFood, foodById, macroKeys, type Person, type Stock, type Dish } from './food';
import { units,supportedUnits,type FridgeEntry } from './units';
const number=z.number().finite().nonnegative();
export const macrosSchema=z.object({protein:number,carbs:number,fat:number,fibre:number}).strict();
export const peopleSchema=z.array(z.object({name:z.string().trim().min(1).max(40),target:macrosSchema,diet:z.enum(['veg','egg','nonveg']),allergies:z.array(z.enum(allergyNames)).max(9),preferences:z.string().trim().max(100)}).strict()).min(1).max(6);
export const stockSchema=z.array(z.object({id:z.string().max(60),grams:z.number().finite().positive().max(100000),mustUse:z.boolean(),quantity:z.number().optional(),unit:z.enum(units).optional()}).strict()).min(1).max(38);
export const dishesSchema=z.object({dishes:z.array(z.object({meal:z.enum(['breakfast','lunch','dinner']),name:z.string().min(1).max(80),weight:z.number().finite().positive().max(15000),macros:macrosSchema,ingredients:z.array(z.object({id:z.string(),grams:z.number().finite().positive().max(15000)}).strict()).min(1).max(12)}).strict()).length(3)}).strict();
export function validateInputs(people:Person[],stock:Stock[]) {
 if(!peopleSchema.safeParse(people).success)throw new Error('Enter names, valid daily targets, and supported allergies for 1–6 people.');
 if(!stockSchema.safeParse(stock).success)throw new Error('Add at least one ingredient with a quantity greater than zero.');
 if(new Set(stock.map(s=>s.id)).size!==stock.length)throw new Error('Remove duplicate ingredients.');
 if(new Set(people.map(p=>p.name.trim().toLowerCase())).size!==people.length)throw new Error('Give each family member a different name.');
 for(const p of people)for(const k of macroKeys)if(p.target[k]>({protein:400,carbs:800,fat:250,fibre:100}[k]))throw new Error('One of the daily targets is too high. Check the grams.');
 if(people.some(p=>macroKeys.every(k=>p.target[k]===0)))throw new Error('Enter daily targets for every person.');
 for(const s of stock){const f=foodById.get(s.id);if(!f)throw new Error('Choose ingredients from the suggestions.');if(s.mustUse&&!allowedFood(f,people))throw new Error(`${f.name} cannot be must-use because of a family allergy or dietary choice.`);}
}
export function validateDishes(dishes:Dish[],people:Person[],stock:Stock[]) {
 dishesSchema.parse({dishes});
 if(dishes.map(d=>d.meal).join(',')!=='breakfast,lunch,dinner')throw new Error('The menu must contain breakfast, lunch and dinner.');
 const ids=new Set(stock.map(s=>s.id));const used=new Set<string>();
 for(const d of dishes){
  if(new Set(d.ingredients.map(i=>i.id)).size!==d.ingredients.length)throw new Error('Repeated recipe ingredient.');
  const meaningful=d.ingredients.filter(i=>i.id!=='water');
  if(!meaningful.length||meaningful.filter(i=>ids.has(i.id)).length/meaningful.length<0.8)throw new Error('Too few available ingredients.');
  for(const i of d.ingredients){const f=foodById.get(i.id);if(!f||!allowedFood(f,people))throw new Error('Unsafe ingredient in menu.');used.add(i.id);}
  if(d.macros.fibre>d.macros.carbs||d.macros.protein+d.macros.carbs+d.macros.fat>d.weight)throw new Error('Invalid dish nutrition.');
 }
 if(stock.some(s=>s.mustUse&&!used.has(s.id)))throw new Error('A must-use ingredient was missed.');
}

export function validateFridgeInputs(people:Person[],entries:FridgeEntry[]) {
 const schema=z.array(z.object({id:z.string(),quantity:z.number().finite().positive(),unit:z.enum(units),mustUse:z.boolean()}).strict()).min(1).max(38);
 if(!schema.safeParse(entries).success)throw new Error('Add ingredients with quantities greater than zero.');
 for(const e of entries)if(!supportedUnits(e.id).includes(e.unit))throw new Error('Choose a supported ingredient unit.');
 // Shared identity and family checks; actual quantities are validated in Convex.
 validateInputs(people,entries.map(e=>({id:e.id,grams:1,mustUse:e.mustUse})));
}
