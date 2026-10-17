import {test} from 'node:test';import assert from 'node:assert/strict';
import {foods,macroKeys,type Dish,type Person} from '../shared/food';
import {withHouseholdMeasures} from '../convex/lib/householdMeasures';
import {attachPersonalSideAlternatives} from '../convex/lib/personalSides';
import {personalServingCap} from '../convex/lib/portions';
import {sideMinimum} from '../convex/lib/jointSides';
import {PersonalSideForMeal} from '../src/PersonalSide';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
const meals=['breakfast','lunch','dinner'] as const;
const people:Person[]=[{name:'Test A',diet:'nonveg',allergies:['Milk'],preferences:'',target:{protein:130,carbs:300,fat:150,fibre:12}},{name:'Test B',diet:'egg',allergies:['Soy'],preferences:'',target:{protein:30,carbs:300,fat:60,fibre:12}}];
function base(){const dishes=meals.flatMap(meal=>[{meal,role:'main',name:'Vegetables',weight:500,macros:{protein:20,carbs:40,fat:40,fibre:8},ingredients:[{id:'tomato',grams:400}]},{meal,role:'staple',name:'Rice',weight:500,macros:{protein:0,carbs:160,fat:0,fibre:0},ingredients:[{id:'rice',grams:160}]}]) as Dish[];return withHouseholdMeasures({dishes,people:people.map(p=>({name:p.name,target:p.target,total:{protein:0,carbs:0,fat:0,fibre:0},gaps:{protein:0,carbs:0,fat:0,fibre:0},withinTolerance:false,portions:dishes.map(d=>({grams:250,macros:Object.fromEntries(macroKeys.map(k=>[k,d.macros[k]/2])) as typeof p.target}))})),ingredients:[],personalSides:[]});}
const recipe=(id:string,macros:any):Dish=>({meal:'breakfast',role:'side',name:id,weight:100,macros,ingredients:[{id,grams:100}]});
const chicken=recipe('chicken',{protein:31,carbs:0,fat:3.6,fibre:0}),oil=recipe('oil',{protein:0,carbs:0,fat:100,fibre:0}),nuts=recipe('almond',{protein:21,carbs:20,fat:50,fibre:10});
const stock=[{id:'chicken',grams:1000,mustUse:true},{id:'oil',grams:1000,mustUse:false}];
test('Two real protein/fat sides per meal close large gaps without changing shared food or an already-fitting person',()=>{
 const p=base(),before=structuredClone(p),groups=meals.map(meal=>({personIndex:0,meal,options:[chicken,oil,nuts].map(d=>({...d,meal}))}));
 const result=attachPersonalSideAlternatives(p,groups,people,stock,foods);
 assert.ok(result.people[0].withinTolerance);assert.ok(result.people[0].meals.every(m=>m.mealCheck.withinRange));
 for(const meal of meals){const own=result.personalSides!.filter(s=>s.meal===meal&&s.personIndex===0);assert.equal(own.length,2);assert.ok(own.filter(s=>s.dish.ingredients.some(i=>i.id==='chicken')).reduce((sum,s)=>sum+s.dish.weight,0)<=250);assert.ok(own.reduce((sum,s)=>sum+s.dish.ingredients.filter(i=>i.id==='oil').reduce((a,i)=>a+i.grams,0),0)<=28+1e-8);}
 assert.deepEqual(result.dishes,before.dishes);assert.deepEqual(result.people[1],before.people[1]);assert.deepEqual(result.people.map(p=>p.portions),before.people.map(p=>p.portions));
 const html=renderToStaticMarkup(React.createElement(PersonalSideForMeal,{sides:result.personalSides,personIndex:0,meal:'breakfast',person:'Test A',nameOf:id=>id}));assert.match(html,/chicken/);assert.match(html,/oil/);
});
test('Dense personal food caps and natural minimums allow real nuts/oil servings below 50 g',()=>{
 assert.equal(personalServingCap(chicken),250);assert.equal(personalServingCap(recipe('paneer',chicken.macros)),150);assert.equal(personalServingCap(nuts),40);assert.equal(personalServingCap(oil),28);assert.equal(sideMinimum(oil),4.6);assert.equal(sideMinimum(nuts),10);assert.equal(sideMinimum(chicken),50);
});

test('An immutable shared macro excess names the exact daily ceiling that sides cannot fix',async()=>{
 const {sideLimitNotice}=await import('../convex/lib/sideLimits');const p=base();p.people[1].target.fat=40;p.people[1].gaps.fat=20;
 const notice=sideLimitNotice(p,1);assert.match(notice,/fixed shared fat 60.0 g already exceeds the daily 45 g ceiling; sides cannot remove it/);
});

test('Saved shared excess shows its exact immutable limit on screen without editing saved grams',()=>{
 const p=base();p.people[1].target.fat=40;const before=structuredClone(p.dishes);const displayed=withHouseholdMeasures(p);
 assert.match(displayed.sideNotice!,/Test B: fixed shared fat is 60.0 g, above the daily 45.0 g ceiling; sides cannot remove it/);assert.deepEqual(p.dishes,before);
});
