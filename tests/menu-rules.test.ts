import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateInputs,validateDishes,UnsafeMenuError } from '../shared/validation';
const people:any=[{name:'Test A',target:{protein:100,carbs:200,fat:60,fibre:30},diet:'veg',allergies:['Milk'],preferences:''}];
const stock:any=[{id:'rice',grams:500,mustUse:false},{id:'lentils',grams:500,mustUse:false},{id:'oil',grams:100,mustUse:false},{id:'tomato',grams:500,mustUse:false}];
const meals=['breakfast','lunch','dinner'];
const menu=(ids:string[])=>meals.map(meal=>({meal,name:'Example dish',weight:500,macros:{protein:20,carbs:50,fat:10,fibre:5},ingredients:ids.map(id=>({id,grams:50}))})) as any;
test('Rejects milk allergens and vegetarian conflicts before portions',()=>{
 assert.throws(()=>validateDishes(menu(['rice','lentils','oil','tomato','paneer']),people,stock),/Milk allergy/ );
 assert.throws(()=>validateDishes(menu(['rice','lentils','oil','tomato','chicken']),people,stock),/vegetarian diet/);
});
test('Missing ingredients are allowed for buying without weakening food safety',()=>{
 assert.doesNotThrow(()=>validateDishes(menu(['rice','lentils','oil','tomato','spinach','water']),people,stock));
 assert.doesNotThrow(()=>validateDishes(menu(['rice','spinach','water']),people,stock));
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

test('Unsafe menus name the exact dish, ingredient, person and every applicable reason',()=>{
 const both=[people[0],{...people[0],name:'Test B',allergies:['Egg']}];
 for(const [id,reason,person] of [['paneer','allergy conflict','Test A'],['chicken','diet conflict','Test A'],['mystery','unknown ingredient',null]]){
  assert.throws(()=>validateDishes(menu(['rice','lentils','oil','tomato',id as string]),both,stock),(e:unknown)=>{
   assert.ok(e instanceof UnsafeMenuError);assert.equal(e.conflicts[0].ingredientId,id);assert.equal(e.conflicts[0].dish,'Example dish');assert.equal(e.conflicts[0].reason,reason);assert.equal(e.conflicts[0].person,person);assert.match(e.message,/No menu was saved/);return true;
  });
 }
 assert.throws(()=>validateDishes(menu(['rice','lentils','oil','tomato','egg']),both,stock),(e:unknown)=>{
  assert.ok(e instanceof UnsafeMenuError);assert.ok(e.conflicts.some(c=>c.person==='Test B'&&c.reason==='allergy conflict'));assert.ok(e.conflicts.some(c=>c.person==='Test B'&&c.reason==='diet conflict'));return true;
 });
});

test('An empty fridge permits planning and buying but still rejects unknown or unsafe ingredients',()=>{
 assert.doesNotThrow(()=>validateInputs(people,[]));assert.doesNotThrow(()=>validateDishes(menu(['lentils','oil']),people,[]));
 assert.throws(()=>validateDishes(menu(['paneer']),people,[]),/Milk allergy/);assert.throws(()=>validateDishes(menu(['invented_food']),people,[]),/recognise/);
});

test('Mixed household accepts chicken must-use but never in shared dishes; nobody eligible still blocks',()=>{
 const mixed=[people[0],{...people[0],name:'Test B',diet:'nonveg'}];
 const required=[...stock,{id:'chicken',grams:200,mustUse:true}];
 assert.doesNotThrow(()=>validateInputs(mixed,required));
 assert.doesNotThrow(()=>validateDishes(menu(['rice','lentils']),mixed,required));
 assert.throws(()=>validateDishes(menu(['rice','chicken']),mixed,required),/vegetarian diet/);
 assert.throws(()=>validateInputs(people,required),/cannot be must-use/);
 const dairy=[...stock,{id:'curd',grams:100,mustUse:true}];
 assert.throws(()=>validateInputs(mixed,dairy),/cannot be must-use/);
 assert.doesNotThrow(()=>validateInputs([mixed[0],{...mixed[1],allergies:[]}],dairy));
});
