import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateInputs,validateDishes } from '../shared/validation';
const people:any=[{name:'Test A',target:{protein:100,carbs:200,fat:60,fibre:30},diet:'veg',allergies:['Milk'],preferences:''}];
const stock:any=[{id:'rice',grams:500,mustUse:false},{id:'lentils',grams:500,mustUse:false},{id:'oil',grams:100,mustUse:false},{id:'tomato',grams:500,mustUse:false}];
const meals=['breakfast','lunch','dinner'];
const menu=(ids:string[])=>meals.map(meal=>({meal,name:'Example dish',weight:500,macros:{protein:20,carbs:50,fat:10,fibre:5},ingredients:ids.map(id=>({id,grams:50}))})) as any;
test('Rejects milk allergens and vegetarian conflicts before portions',()=>{
 assert.throws(()=>validateDishes(menu(['rice','lentils','oil','tomato','paneer']),people,stock),/Unsafe/);
 assert.throws(()=>validateDishes(menu(['rice','lentils','oil','tomato','chicken']),people,stock),/Unsafe/);
});
test('Every dish meets the 80% available ingredient rule, excluding water',()=>{
 assert.doesNotThrow(()=>validateDishes(menu(['rice','lentils','oil','tomato','spinach','water']),people,stock));
 assert.throws(()=>validateDishes(menu(['rice','spinach','water']),people,stock),/Too few/);
});
test('Must-use is enforced and cannot override an allergy',()=>{
 assert.throws(()=>validateDishes(menu(['rice']),people,[...stock,{id:'spinach',grams:100,mustUse:true}]),/must-use/);
 assert.throws(()=>validateInputs(people,[...stock,{id:'paneer',grams:100,mustUse:true}]),/cannot be must-use/);
});
test('Invalid targets, unsupported allergies and duplicate stock cannot reach AI',()=>{
 assert.throws(()=>validateInputs([{...people[0],target:{...people[0].target,protein:-1}}],stock));
 assert.throws(()=>validateInputs([{...people[0],allergies:['Mystery allergy']}],stock));
 assert.throws(()=>validateInputs(people,[...stock,stock[0]]),/duplicate/);
});
