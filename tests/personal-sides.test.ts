import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {PersonalSideForMeal} from '../src/PersonalSide';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {biggestMealShortfall} from '../shared/personalSides';import {foods,macroKeys,allowedFood,type Dish,type Person} from '../shared/food';import {attachPersonalSides,attachPersonalSideAlternatives,personalSideSlots,shrinkPersonalStaples,sameCalculatedSharedServings} from '../convex/lib/personalSides';import {withHouseholdMeasures,type DisplayPlan} from '../convex/lib/householdMeasures';import {mealTotals,mealCheck,servingCap} from '../convex/lib/portions';import {naturalAmount} from '../convex/lib/ingredientUnits';
const target={protein:100,carbs:300,fat:60,fibre:30};
const people:Person[]=[{name:'Test A',target,diet:'egg',allergies:['Soy'],preferences:''},{name:'Test B',target,diet:'nonveg',allergies:['Milk','Fish'],preferences:''}];
const shared:Dish[]=['breakfast','lunch','dinner'].flatMap(meal=>[{meal,role:'main',name:'Vegetables',weight:200,macros:{protein:2,carbs:10,fat:1,fibre:2},ingredients:[{id:'tomato',grams:100},{id:'onion',grams:100}]},{meal,role:'staple',name:'Rice',weight:200,macros:{protein:2,carbs:60,fat:1,fibre:1},ingredients:[{id:'rice',grams:70}]}]) as Dish[];
function base():DisplayPlan{const portions=shared.map(d=>({grams:d.weight/2,macros:Object.fromEntries(macroKeys.map(k=>[k,d.macros[k]/2])) as typeof target,mealCheck:mealCheck(d.macros,target)}));return withHouseholdMeasures({dishes:shared,people:people.map(p=>({...p,portions:structuredClone(portions),meals:mealTotals(shared,portions,p.target),total:{protein:6,carbs:105,fat:3,fibre:4.5},gaps:{protein:-94,carbs:-195,fat:-57,fibre:-25.5},withinTolerance:false})),ingredients:[]});}
const stock=['tomato','onion','rice','paneer','chicken','egg','spinach','carrot'].map(id=>({id,grams:100,mustUse:false}));
function side(id:string,personIndex=0,macro='carbs'){return {personIndex,dish:{meal:'breakfast',role:'side',name:`Test ${id}`,weight:100,macros:{protein:20,carbs:50,fat:10,fibre:0},ingredients:[{id,grams:100}]}} as {personIndex:number;dish:Dish};}
test('Personal sides trigger only for a shortfall more than 5 g below the existing 25% boundary',()=>{assert.equal(biggestMealShortfall({protein:20,carbs:75,fat:15,fibre:7.5},target),null);assert.deepEqual(biggestMealShortfall({protein:19.9,carbs:75,fat:15,fibre:7.5},target),{macro:'protein',grams:5.100000000000001});assert.equal(biggestMealShortfall({protein:60,carbs:150,fat:40,fibre:20},target),null);});
test('Recipient-only safety allows dairy for one person and chicken for another without changing shared dishes',()=>{const plan=base(),before=structuredClone(plan);const next=attachPersonalSides(plan,[side('paneer',0),side('chicken',1)],people,stock,foods);assert.equal(next.personalSides?.length,2);assert.deepEqual(next.dishes,before.dishes);for(let i=0;i<2;i++)assert.deepEqual(next.people[i].portions,before.people[i].portions);assert.equal(allowedFood(foods.find(f=>f.id==='paneer')!,people),false);assert.throws(()=>attachPersonalSides(plan,[side('paneer',1)],people,stock,foods),/Test B/);assert.throws(()=>attachPersonalSides(plan,[side('chicken',0)],people,stock,foods),/Test A/);});
test('Missing side ingredients are allowed and add natural-unit shopping shortages',()=>{const s=side('curd');s.dish.ingredients=[{id:'curd',grams:80},{id:'tomato',grams:5},{id:'onion',grams:5},{id:'spinach',grams:5},{id:'carrot',grams:5}];const next=attachPersonalSides(base(),[s],people,stock,foods);const need=next.ingredients.find(i=>i.id==='curd')!;assert.equal(need.available,0);assert.ok(need.shortage>0);assert.equal(need.shortageMeasure,naturalAmount('curd',need.shortage));assert.ok(attachPersonalSides(base(),[side('curd')],people,stock,foods).ingredients.find(i=>i.id==='curd')!.shortage>0);});
test('Only one side per person/meal is accepted and no side can be given to an ineligible slot',()=>{assert.throws(()=>attachPersonalSides(base(),[side('paneer'),side('egg')],people,stock,foods),/at most one/);const full=base();full.people.forEach(p=>p.portions.forEach(x=>{x.macros={protein:16,carbs:50,fat:10,fibre:5};}));assert.equal(personalSideSlots(full).length,0);assert.throws(()=>attachPersonalSides(full,[side('paneer')],people,stock,foods),/eligible/);});
test('Sides stay within egg/rice/katori caps and shared bread/roti allowances',()=>{for(const id of ['egg','rice','paneer']){const candidate=side(id);candidate.dish.macros.carbs=.1;const next=attachPersonalSides(base(),[candidate],people,stock,foods);assert.ok(next.personalSides![0].dish.weight<=servingCap(candidate.dish));}const p=base();p.dishes[1]={...p.dishes[1],name:'Toast',ingredients:[{id:'bread',grams:240}]};const candidate=side('bread');candidate.dish.ingredients=[{id:'bread',grams:50},{id:'tomato',grams:15},{id:'onion',grams:15},{id:'spinach',grams:10},{id:'carrot',grams:10}];const next=attachPersonalSides(p,[candidate],people,stock,foods);assert.equal(next.personalSides!.length,0);const r=base();r.dishes[1]={...r.dishes[1],name:'Rotis',ingredients:[{id:'atta',grams:100}]};const roti=side('atta');roti.dish.name='Whole wheat rotis';roti.dish.ingredients=[{id:'atta',grams:50},{id:'tomato',grams:15},{id:'onion',grams:15},{id:'spinach',grams:10},{id:'carrot',grams:10}];const fitted=attachPersonalSides(r,[roti],people,stock,foods);assert.equal(fitted.personalSides![0].dish.weight,60);});
test('Daily and meal totals include only that person’s side once, including after repeated reload decoration',()=>{let p=attachPersonalSides(base(),[side('paneer',0)],people,stock,foods);for(let repeat=0;repeat<3;repeat++){for(let personIndex=0;personIndex<2;personIndex++)for(const k of macroKeys){const actual=p.people[personIndex].portions.reduce((sum,x)=>sum+x.macros[k],0)+p.personalSides!.filter(s=>s.personIndex===personIndex).reduce((sum,s)=>sum+s.dish.macros[k],0);assert.equal(p.people[personIndex].total[k],actual);assert.equal(p.people[personIndex].gaps[k],actual-target[k]);}p=withHouseholdMeasures(p);}assert.equal(p.people[1].total.protein,6);});

test('Regenerating sides replaces prior sides instead of duplicating them',()=>{const first=attachPersonalSides(base(),[side('paneer',0)],people,stock,foods);const second=attachPersonalSides(first,[side('paneer',0)],people,stock,foods);assert.deepEqual(second.personalSides,first.personalSides);assert.deepEqual(second.ingredients,first.ingredients);assert.deepEqual(second.people,first.people);});

test('Rendered personal meal cards show only the recipient’s side, natural ingredients and smaller grams',()=>{const plan=attachPersonalSides(base(),[side('paneer',0),side('chicken',1)],people,stock,foods);const render=(personIndex:number,meal:'breakfast'|'dinner')=>renderToStaticMarkup(React.createElement(PersonalSideForMeal,{sides:plan.personalSides,personIndex,meal,person:people[personIndex].name,nameOf:id=>foods.find(f=>f.id===id)!.name}));const a=render(0,'breakfast'),b=render(1,'breakfast');assert.match(a,/Test paneer/);assert.doesNotMatch(a,/Test chicken/);assert.match(b,/Test chicken/);assert.doesNotMatch(b,/Test paneer/);assert.match(a,/<small>[^<]+ g cooked<\/small>/);assert.match(a,/<small>[^<]+ g raw<\/small>/);assert.equal(render(0,'dinner'),'');});


test('Daily ceilings count every side, keep shared portions fixed, and never cap fibre',()=>{
 const p=base();p.people[0].target={protein:8,carbs:110,fat:60,fibre:1};
 const a=side('paneer');a.dish.macros={protein:10,carbs:10,fat:50,fibre:8};
 const b=structuredClone(a);b.dish.meal='lunch';
 const result=attachPersonalSides(p,[a,b],people,stock,foods);
 for(const k of ['protein','carbs','fat'] as const)assert.ok(result.people[0].total[k]<=p.people[0].target[k]+5+1e-8);
 assert.ok(result.people[0].total.fibre>p.people[0].target.fibre+5);
 assert.deepEqual(result.people.map(x=>x.portions.map(v=>({grams:v.grams,macros:v.macros}))),p.people.map(x=>x.portions.map(v=>({grams:v.grams,macros:v.macros}))));
});
test('Already excessive shared carbs allow zero-carb fat sides, reject carb sides, and try alternatives',()=>{
 const p=base();p.people[0].target={protein:100,carbs:90,fat:120,fibre:30};
 const bad=side('paneer').dish;const good=structuredClone(bad);good.name='Fat side';good.macros={protein:0,carbs:0,fat:50,fibre:0};
 const result=attachPersonalSideAlternatives(p,[{personIndex:0,options:[bad,good]}],people,stock,foods);
 assert.equal(result.personalSides?.length,1);assert.equal(result.personalSides![0].dish.name,'Fat side');assert.equal(result.personalSides![0].closes,'fat');assert.equal(result.people[0].total.carbs,105);assert.ok(result.people[0].total.fat<=125);
 const omitted=attachPersonalSideAlternatives(p,[{personIndex:0,options:[bad,bad,bad,bad,good]}],people,stock,foods);assert.equal(omitted.personalSides?.length,0);
});
test('Alternative safety remains recipient-specific and falls through to a safe option',()=>{
 const bad=side('paneer',1).dish,good=side('chicken',1).dish;
 const result=attachPersonalSideAlternatives(base(),[{personIndex:1,options:[bad,good]}],people,stock,foods);
 assert.equal(result.personalSides?.[0].dish.name,'Test chicken');
});

test('Alternatives favour the largest safe improvement of the biggest daily shortfall',()=>{
 const a=side('paneer').dish,b=structuredClone(a);a.name='Small carbohydrate gain';a.macros={protein:20,carbs:1,fat:10,fibre:0};b.name='Larger carbohydrate gain';
 const result=attachPersonalSideAlternatives(base(),[{personIndex:0,options:[a,b]}],people,stock,foods);
 assert.equal(result.personalSides?.[0].dish.name,'Larger carbohydrate gain');
});

test('Staple shrink is per person, preserves main servings and recipe ratios, and recomputes shortages',()=>{
 let p=base();p.people[1].target={...target,carbs:90};p=withHouseholdMeasures(p);
 const result=shrinkPersonalStaples(p,stock);
 assert.ok(result.people[1].total.carbs<=90+1e-8);
 assert.deepEqual(result.people[0].portions,p.people[0].portions);
 for(let j=0;j<p.dishes.length;j++){
  if(p.dishes[j].role!=='staple'){assert.deepEqual(result.dishes[j],p.dishes[j]);assert.deepEqual(result.people[1].portions[j],p.people[1].portions[j]);}
  else{assert.ok(result.people[1].portions[j].grams<=p.people[1].portions[j].grams);assert.ok(Math.abs(result.dishes[j].ingredients[0].grams/result.dishes[j].weight-p.dishes[j].ingredients[0].grams/p.dishes[j].weight)<1e-8);}
  assert.equal(result.dishes[j].weight,result.people.reduce((sum,x)=>sum+x.portions[j].grams,0));
 }
 assert.deepEqual(shrinkPersonalStaples(result,stock),result);
});

test('Daily gaps can request a side even when every meal already reaches the old 25% boundary',()=>{
 const p=base();for(const person of p.people)for(const portion of person.portions)portion.macros={protein:15,carbs:50,fat:7.5,fibre:5};
 const slots=personalSideSlots(withHouseholdMeasures(p));assert.equal(slots.length,6);assert.ok(slots.every(s=>s.macro==='fat'));
});

test('Staple-save validation compares recipe and portion values across Convex field reordering',()=>{
 const p=shrinkPersonalStaples(base(),stock);
 const reorder=(v:any):any=>Array.isArray(v)?v.map(reorder):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).reverse().map(([k,x])=>[k,reorder(x)])):v;
 const reordered=reorder(p);assert.equal(sameCalculatedSharedServings(p,reordered),true);
 reordered.people[0].portions[0].grams+=.1;assert.equal(sameCalculatedSharedServings(p,reordered),false);
 const changed=reorder(p);changed.dishes[0].ingredients[0].grams+=.1;assert.equal(sameCalculatedSharedServings(p,changed),false);
});
