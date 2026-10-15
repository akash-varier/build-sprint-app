import {test} from 'node:test';import assert from 'node:assert/strict';
import {calculatePlan,servingCap} from '../convex/lib/portions';
import {validateDishes} from '../shared/validation';
const target={protein:90,carbs:240,fat:60,fibre:24};
const people=[{name:'Test A',target,diet:'egg' as const,allergies:[],preferences:'Continental'}];
const items=['breakfast','lunch','dinner'].flatMap(meal=>[
 {meal,role:'main',name:'Vegetable eggs',weight:300,macros:{protein:30,carbs:10,fat:20,fibre:3},ingredients:[{id:'egg',grams:150},{id:'tomato',grams:100}]},
 {meal,role:'staple',name:'Rice',weight:300,macros:{protein:0,carbs:70,fat:0,fibre:5},ingredients:[{id:'rice',grams:100}]},
]) as any;
const stock=[{id:'egg',grams:1000,mustUse:false},{id:'tomato',grams:500,mustUse:false},{id:'rice',grams:1000,mustUse:false}];
test('Main plus staple portions meet combined meal ranges without treating each item as a full meal',()=>{
 const plan=calculatePlan(items,people,stock);assert.equal(plan.people[0].withinTolerance,true);
 assert.equal(plan.dishes.length,6);assert.equal(plan.people[0].meals.length,3);
 for(const meal of plan.people[0].meals)assert.equal(meal.mealCheck.withinRange,true);
 for(let i=0;i<6;i++)assert.ok(plan.people[0].portions[i].grams<=servingCap(items[i]));
});
test('An entire meal can exceed 450 g while each item remains capped',()=>{
 const plan=calculatePlan(items,people,stock);assert.ok(plan.people[0].portions[0].grams+plan.people[0].portions[1].grams>450);
});
test('Bread caps use ingredient slices even when a bread item includes vegetables',()=>{
 const bread={...items[0],name:'Vegetable toast',weight:500,ingredients:[{id:'bread',grams:300},{id:'tomato',grams:100}]};
 assert.equal(servingCap(bread),200);
});
test('Meals require one main, one staple and at most one side',()=>{
 assert.doesNotThrow(()=>validateDishes(items,people,stock));
 assert.throws(()=>validateDishes(items.filter((_:any,i:number)=>i!==1),people,stock));
 assert.throws(()=>validateDishes(items.map((x:any,i:number)=>i===1?{...x,role:'main'}:x),people,stock));
 assert.throws(()=>validateDishes(items,people,stock.filter(x=>x.id!=='rice')));
});
test('Four bread slices is a combined meal limit even when multiple items contain bread',()=>{
 const breadItems=items.map((x:any)=>({...x,ingredients:[{id:'bread',grams:300}],weight:300}));
 const plan=calculatePlan(breadItems,[{...people[0],target:{protein:400,carbs:800,fat:250,fibre:100}}],[]);
 for(const meal of ['breakfast','lunch','dinner'])assert.ok(breadItems.reduce((sum:number,d:any,i:number)=>sum+(d.meal===meal?plan.people[0].portions[i].grams:0),0)<=120+1e-8);
});

test('Scaling raw batch ingredients preserves the exact egg cap after portions are rounded',()=>{
 const selected=items.map((x:any)=>x.role==='main'?{...x,weight:890,ingredients:[{id:'egg',grams:400},{id:'tomato',grams:100}]}:x);
 const plan=calculatePlan(selected,[people[0],{...people[0],name:'Test B',target:{protein:130,carbs:318,fat:85,fibre:30}}],stock);
 for(let j=0;j<selected.length;j++){const d=plan.dishes[j];if(d.weight===0)continue;for(const p of plan.people){const eggs=d.ingredients.filter(i=>i.id==='egg').reduce((sum,i)=>sum+i.grams,0)*p.portions[j].grams/d.weight;assert.ok(eggs<=200+1e-8);}}
});

test('Cuisine staples may be missing when their item still meets 80% fridge coverage',()=>{
 const selected=items.map((d:any)=>d.role==='staple'?{...d,name:'Vegetable pasta',ingredients:[{id:'pasta',grams:100},{id:'egg',grams:20},{id:'tomato',grams:20},{id:'onion',grams:20},{id:'spinach',grams:20}]}:d);
 const available=[...stock,{id:'onion',grams:100,mustUse:false},{id:'spinach',grams:100,mustUse:false}];
 const choices={breakfast:'Continental',lunch:'Continental',dinner:'Continental'} as const;
 assert.doesNotThrow(()=>validateDishes(selected,people,available,choices));
 assert.throws(()=>validateDishes(selected,people,available,{...choices,lunch:'Indian'}));
 assert.ok(calculatePlan(selected,people,available).ingredients.find(i=>i.id==='pasta')!.shortage>0);
});
test('Rotis stay within four across multiple items in a meal',()=>{
 const selected=items.map((d:any)=>({...d,name:'Rotis',ingredients:[{id:'atta',grams:200}]}));
 const plan=calculatePlan(selected,[{...people[0],target:{protein:400,carbs:800,fat:250,fibre:100}}],[]);
 for(const meal of ['breakfast','lunch','dinner'])assert.ok(selected.reduce((sum:number,d:any,i:number)=>sum+(d.meal===meal?plan.people[0].portions[i].grams:0),0)<=160+1e-8);
});
