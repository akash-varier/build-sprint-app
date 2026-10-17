import {fitSideCombination} from '../convex/lib/jointSides';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {servingCap,shrinkStapleWeights} from '../convex/lib/portions';
import type {Dish} from '../shared/food';
const dishes: Dish[]=['breakfast','lunch','dinner'].map(meal=>({meal,role:'main',name:'Vegetable main',weight:300,ingredients:[{id:'peanut',grams:80}],macros:{protein:30,carbs:100,fat:27,fibre:8}})) as Dish[];
test('Fat excess shrinks personal shared mains even when carbs are already on target',()=>{
 const before=[300,300,300],weights=shrinkStapleWeights(dishes,[...before],{protein:100,carbs:300,fat:70,fibre:15});
 const fat=weights.reduce((sum,w,j)=>sum+w*dishes[j].macros.fat/dishes[j].weight,0);
 assert.ok(fat<=70+1e-8);assert.ok(weights.some((w,j)=>w<before[j]));assert.ok(weights.every(w=>w>=50));assert.deepEqual(before,[300,300,300]);
});
test('Fat reduction respects a fixed serving and never increases another serving',()=>{
 const weights=shrinkStapleWeights(dishes,[300,300,300],{protein:100,carbs:300,fat:70,fibre:15},[300]);assert.equal(weights[0],300);assert.ok(weights.every(w=>w<=300&&w>=50));
});
import {exactError,plainError,retryOnce,withDeadline} from '../convex/lib/actionErrors';
test('Cooking requests retry once, save each exact failure, and return the second plain reason',async()=>{
 const errors:string[]=[];let calls=0;
 await assert.rejects(()=>retryOnce(async()=>{calls++;throw Object.assign(new Error('Provider rate limit message'),{statusCode:429,responseBody:'{"error":{"code":"rate_limit_exceeded"}}'});},async e=>{errors.push(exactError(e));}),/Provider rate limit message/);
 assert.equal(calls,2);assert.equal(errors.length,2);for(const e of errors){assert.match(e,/"statusCode":429/);assert.match(e,/rate_limit_exceeded/);}
 assert.match(plainError(Object.assign(new Error('rate_limit_exceeded'),{statusCode:429})),/request limit/);
});
test('A cooking timeout aborts the first request and retries only once',async()=>{
 let calls=0,aborts=0;const saved:string[]=[];
 await assert.rejects(()=>retryOnce(async()=>{calls++;return withDeadline(signal=>new Promise((_resolve,_reject)=>signal.addEventListener('abort',()=>{aborts++;})),2);},async e=>{saved.push(exactError(e));}),/timed out after 0.002 seconds/);
 assert.equal(calls,2);assert.equal(aborts,2);assert.equal(saved.length,2);assert.match(plainError(new Error('AI request timed out after 60 seconds.')),/longer than 60 seconds/);
});
test('A successful retry returns cooking steps and preserves the first failure',async()=>{
 let calls=0;const failures:unknown[]=[];const result=await retryOnce(async()=>{if(++calls===1)throw new Error('Invalid JSON');return 'saved link';},async e=>{failures.push(e);});assert.equal(result,'saved link');assert.equal(calls,2);assert.equal(failures.length,1);
});
test('Recorded provider errors remove credentials while preserving status and message',()=>{
 const e=Object.assign(new Error('Call failed sk-testcredentialvalue'),{statusCode:401,responseBody:'Authorization: Bearer secretvalue'}),s=exactError(e);assert.doesNotMatch(s,/sk-testcredentialvalue|secretvalue/);assert.match(s,/401/);assert.match(s,/Call failed/);
});
import {replaceOneDish} from '../convex/lib/replaceDish';import {withHouseholdMeasures} from '../convex/lib/householdMeasures';
test('Replacing one dish also removes an existing fat excess from that person’s other shared servings',()=>{
 const recipes=dishes.map(d=>({...d,weight:200,macros:{protein:20,carbs:100,fat:40,fibre:8}}));
 const plan=withHouseholdMeasures({dishes:recipes,people:[{name:'Test A',target:{protein:60,carbs:300,fat:30,fibre:15},total:{protein:60,carbs:300,fat:120,fibre:24},gaps:{protein:0,carbs:0,fat:90,fibre:9},withinTolerance:false,portions:recipes.map(d=>({grams:200,macros:d.macros}))}],ingredients:[]});
 const result=replaceOneDish(plan,0,{...recipes[0],name:'Replacement main'},[]);
 assert.ok(result.people[0].total.fat<=35);assert.ok(result.people[0].portions.slice(1).some(p=>p.grams<200));assert.equal(result.dishes[1].name,recipes[1].name);
});
import {attachPersonalSideAlternatives,sameSharedRecipeRatios} from '../convex/lib/personalSides';import {foods,type Person} from '../shared/food';
test('Joint shared/side fitting frees fat room for real protein sides and leaves a fitting person unchanged',()=>{
 const recipes=['breakfast','lunch','dinner'].flatMap(meal=>[{meal,role:'main',name:'Vegetable main',weight:200,macros:{protein:20,carbs:40,fat:46.6666666667,fibre:8},ingredients:[{id:'tomato',grams:100},{id:'oil',grams:40}]},{meal,role:'staple',name:'Rice',weight:200,macros:{protein:4,carbs:160,fat:0,fibre:0},ingredients:[{id:'rice',grams:80}]}]) as Dish[];
 const people:Person[]=[{name:'Test A',diet:'egg',allergies:['Soy'],preferences:'',target:{protein:100,carbs:300,fat:70,fibre:6}},{name:'Test B',diet:'nonveg',allergies:['Milk'],preferences:'',target:{protein:36,carbs:300,fat:70,fibre:6}}];
 const plan=withHouseholdMeasures({dishes:recipes,people:people.map(p=>({name:p.name,target:p.target,total:{protein:36,carbs:300,fat:70,fibre:12},gaps:{protein:0,carbs:0,fat:0,fibre:6},withinTolerance:false,portions:recipes.map(d=>({grams:100,macros:Object.fromEntries(Object.entries(d.macros).map(([k,v])=>[k,v/2])) as typeof p.target}))})),ingredients:[],personalSides:[]});
 const groups=['breakfast','lunch','dinner'].map(meal=>({personIndex:0,meal:meal as Dish['meal'],options:[{meal,role:'side',name:'Curd',weight:100,macros:{protein:10,carbs:4,fat:5,fibre:0},ingredients:[{id:'curd',grams:100}]} as Dish]}));
 const joint=fitSideCombination(plan,0,groups.flatMap(g=>g.options),[],people,[],foods,[],true);assert.ok(joint.people[0].withinTolerance,JSON.stringify(joint.people[0].gaps));
 const result=attachPersonalSideAlternatives(plan,groups,people,[],foods);
 assert.ok(result.people[0].withinTolerance,JSON.stringify(result.people[0].gaps));assert.deepEqual(result.people[1],plan.people[1]);assert.ok(sameSharedRecipeRatios(plan,result));assert.ok(result.people[0].portions.some((p,j)=>recipes[j].role==='main'&&p.grams<100));assert.ok(result.personalSides!.every(s=>s.dish.weight>=50));
});
test('Mixed fractional recipes and the full side search finish within a bounded calculation',()=>{
 const start=performance.now();
 const recipes=dishes.flatMap(d=>[{...d,weight:672.4,macros:{protein:33.62,carbs:25.480421052631577,fat:74.67178947368421,fibre:7.431789473684211}},{...d,role:'staple' as const,name:'Rice',weight:566.4,macros:{protein:15.689014084507043,carbs:180.82253521126762,fat:1.595492957746479,fibre:2.9250704225352115},ingredients:[{id:'rice',grams:226}]}]);
 const person:Person={name:'Test A',diet:'egg',allergies:['Soy'],preferences:'',target:{protein:100,carbs:300,fat:70,fibre:15}};
 const plan=withHouseholdMeasures({dishes:recipes,people:[{name:person.name,target:person.target,total:{protein:0,carbs:0,fat:0,fibre:0},gaps:{protein:0,carbs:0,fat:0,fibre:0},withinTolerance:false,portions:recipes.map(d=>({grams:d.weight,macros:d.macros}))}],ingredients:[],personalSides:[]});
 const options=[{id:'egg',protein:11,carbs:1,fat:.2,fibre:0},{id:'curd',protein:4,carbs:5,fat:3,fibre:0},{id:'peanut',protein:25,carbs:20,fat:50,fibre:8},{id:'oil',protein:0,carbs:0,fat:100,fibre:0}];
 const groups=['breakfast','lunch','dinner'].map(meal=>({personIndex:0,meal:meal as Dish['meal'],options:options.map(o=>({meal,role:'side',name:o.id,weight:100,macros:{protein:o.protein,carbs:o.carbs,fat:o.fat,fibre:o.fibre},ingredients:[{id:o.id,grams:100}]} as Dish))}));
 const fitted=attachPersonalSideAlternatives(plan,groups,[person],[],foods);assert.ok(performance.now()-start<5000);assert.ok(fitted.people[0].total.fat<=75+1e-7);assert.ok(fitted.people[0].portions.every((p,j)=>p.grams<=servingCap(recipes[j])+1e-7));
});
import {servingAliases} from '../convex/lib/ingredientAliases';import {personalServingCap} from '../convex/lib/portions';import {sideMinimum} from '../convex/lib/jointSides';
test('Saved olive oil retains the existing 2 tbsp maximum and 1 tsp natural serving minimum',()=>{
 const catalog=[{id:'custom_test_olive',name:'Olive oil'}] as any,aliases=servingAliases(catalog),dish: Dish={meal:'lunch',role:'side',name:'Olive oil drizzle',weight:100,macros:{protein:0,carbs:0,fat:100,fibre:0},ingredients:[{id:'custom_test_olive',grams:100}]};
 assert.equal(personalServingCap(dish,aliases),28);assert.equal(sideMinimum(dish,aliases),4.6);
});
test('Saved and catalogue oils share one unchanged 2 tbsp personal budget per meal',async()=>{
 const {fitPortions}=await import('../convex/lib/portions'),zero={protein:0,carbs:0,fat:0,fibre:0};
 const shared=['breakfast','lunch','dinner'].map(meal=>({meal,role:'main',name:'Vegetable main',weight:100,macros:zero,ingredients:[{id:'tomato',grams:100}]} as Dish));
 const oils=['custom_test_olive','oil'].map(id=>({meal:'lunch',role:'side',name:id,weight:100,macros:{...zero,fat:100},ingredients:[{id,grams:100}]} as Dish));
 const weights=fitPortions([...shared,...oils],{...zero,fat:100},[],[0,0,0,4.6,4.6],3,[],{custom_test_olive:'oil'});assert.ok(weights[3]+weights[4]<=28+1e-8);assert.ok(weights[3]>=4.6&&weights[4]>=4.6);
});
