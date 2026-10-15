import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculatePlan} from '../convex/lib/portions';
const target={protein:120,carbs:240,fat:60,fibre:30};
const person={name:'Test A',target,diet:'egg' as const,allergies:[],preferences:''};
const dish=(meal:any,id:string,weight:number,grams:number,macros=target)=>({meal,name:`Example ${id}`,weight,macros,ingredients:[{id,grams}]});
test('Egg, rice and dish serving caps hold even for impossible targets',()=>{
 const dishes=[dish('breakfast','egg',1000,1000),dish('lunch','rice',1000,300),dish('dinner','lentils',1000,300)];
 const p=calculatePlan(dishes,[{...person,target:{protein:400,carbs:800,fat:250,fibre:100}}],[]).people[0];
 assert.ok(p.portions[0].grams<=200);assert.ok(p.portions[1].grams<=316);assert.ok(p.portions.every(x=>x.grams<=450));assert.equal(p.withinTolerance,false);
});
test('When meal ranges are possible every macro in every meal stays within 25–40%',()=>{
 const dishes=['breakfast','lunch','dinner'].map(meal=>dish(meal,'lentils',900,300));
 const p=calculatePlan(dishes,[person],[]).people[0];
 for(const portion of p.portions)for(const key of Object.keys(target) as (keyof typeof target)[])assert.ok(portion.macros[key]>=target[key]*.25-0.02&&portion.macros[key]<=target[key]*.4+0.02);
 assert.equal(p.withinTolerance,true);
});

test('Unreachable meal ranges report separate signed gaps while preserving physical caps',()=>{
 const dishes=['breakfast','lunch','dinner'].map(meal=>dish(meal,'lentils',500,200,{protein:100,carbs:10,fat:1,fibre:1}));
 const p=calculatePlan(dishes,[person],[]).people[0];
 for(const x of p.portions){assert.ok(x.grams<=450);assert.equal(x.mealCheck.withinRange,false);assert.ok(x.mealCheck.rangeGaps.carbs<0);assert.notEqual(x.mealCheck.rangeGaps.carbs,x.mealCheck.rangeGaps.fat);}
 for(const k of Object.keys(target) as (keyof typeof target)[])assert.equal(p.gaps[k],p.portions.reduce((sum,x)=>sum+x.macros[k],0)-target[k]);
});
test('Tiny egg-heavy batches cannot force even a 50 g serving beyond the egg cap',()=>{
 const dishes=['breakfast','lunch','dinner'].map(meal=>dish(meal,'egg',100,1000));
 const p=calculatePlan(dishes,[person],[]).people[0];assert.ok(p.portions.every(x=>x.grams<=20));
});
