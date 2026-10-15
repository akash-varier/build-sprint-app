export const macroKeys = ['protein','carbs','fat','fibre'] as const;
export type Macros = Record<typeof macroKeys[number], number>;
export type Person = {name:string; target:Macros; diet:'veg'|'egg'|'nonveg'; allergies:string[]; preferences:string};
export type Stock = {id:string; grams:number; mustUse:boolean; quantity?:number; unit?:import("./units").Unit};
export type Dish = {role?:'main'|'staple'|'side';meal:'breakfast'|'lunch'|'dinner';name:string;weight:number;macros:Macros;ingredients:{id:string;grams:number}[]};
export const allergyNames = ['Milk','Egg','Wheat / gluten','Soy','Peanut','Tree nuts','Sesame','Fish','Shellfish'] as const;
export type Food = {id:string;name:string;diet:Person['diet'];allergens:string[]};
const food=(id:string,name:string,diet:Person['diet']='veg',allergens:string[]=[]):Food=>({id,name,diet,allergens});
export const foods:Food[] = [
 food('bread','Plain bread (milk/egg-free)','veg',['Wheat / gluten']),food('pasta','Egg-free pasta','veg',['Wheat / gluten']),food('rice','Rice'),food('oats','Certified gluten-free oats'),food('atta','Whole wheat flour','veg',['Wheat / gluten']),
 food('lentils','Lentils / dal'),food('chickpeas','Chickpeas'),food('rajma','Kidney beans'),food('moong','Moong beans'),
 food('paneer','Paneer','veg',['Milk']),food('tofu','Tofu','veg',['Soy']),food('milk','Milk','veg',['Milk']),food('curd','Curd','veg',['Milk']),
 food('egg','Egg','egg',['Egg']),food('chicken','Chicken','nonveg'),food('fish','Fish','nonveg',['Fish']),
 food('potato','Potato'),food('tomato','Tomato'),food('onion','Onion'),food('spinach','Spinach'),food('carrot','Carrot'),
 food('peas','Green peas'),food('capsicum','Capsicum'),food('cauliflower','Cauliflower'),food('broccoli','Broccoli'),
 food('cucumber','Cucumber'),food('banana','Banana'),food('apple','Apple'),food('lemon','Lemon'),
 food('oil','Sunflower oil'),food('ghee','Ghee','veg',['Milk']),food('peanut','Peanuts','veg',['Peanut']),
 food('almond','Almonds','veg',['Tree nuts']),food('sesame','Sesame seeds','veg',['Sesame']),
 food('ginger','Ginger'),food('garlic','Garlic'),food('cumin','Cumin'),food('turmeric','Turmeric'),food('salt','Salt'),food('water','Water'),
];
export const foodById = new Map(foods.map(f=>[f.id,f]));
export function allowedFood(f:Food,people:Person[]) {
 return people.every(p=> !(p.diet==='veg'&&f.diet!=='veg') && !(p.diet==='egg'&&f.diet==='nonveg') && !f.allergens.some(a=>p.allergies.includes(a)));
}

export const macroTolerance=5;
export const withinMacroTolerance=(gaps:Macros)=>macroKeys.every(k=>Math.abs(gaps[k])<=macroTolerance+1e-8);
