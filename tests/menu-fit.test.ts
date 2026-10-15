import {test} from 'node:test';import assert from 'node:assert/strict';
import {fitMenu} from '../convex/lib/menuFit';
const target={protein:90,carbs:180,fat:60,fibre:30};
const people=[{name:'Test A',target,diet:'veg' as const,allergies:[],preferences:''}];
const dishes=(good:boolean)=>['breakfast','lunch','dinner'].map(meal=>({meal,name:good?'Balanced lentils':'Poor rice',weight:300,macros:good?{protein:30,carbs:60,fat:20,fibre:10}:{protein:1,carbs:80,fat:1,fibre:1},ingredients:[{id:good?'lentils':'rice',grams:100}]})) as any;
test('Poor fit requests different dishes once, reserves another call, and keeps the better capped plan',async()=>{
 let requests=0,reserves=0;const plan=await fitMenu({people,stock:[],request:async feedback=>{requests++;if(requests===2)assert.match(feedback!,/Poor rice/);return dishes(requests===2);},reserve:async()=>{reserves++;},onRetryError:()=>assert.fail()});
 assert.equal(requests,2);assert.equal(reserves,1);assert.equal(plan.dishes[0].name,'Balanced lentils');assert.equal(plan.people[0].withinTolerance,true);
});
test('A fitting menu uses one call; a failed replacement keeps the safe capped first menu',async()=>{
 let requests=0;await fitMenu({people,stock:[],request:async()=>{requests++;return dishes(true);},reserve:async()=>assert.fail(),onRetryError:()=>assert.fail()});assert.equal(requests,1);
 let errors=0;const plan=await fitMenu({people,stock:[],request:async()=>dishes(false),reserve:async()=>{throw new Error('rate limit');},onRetryError:()=>{errors++;}});assert.equal(errors,1);assert.equal(plan.dishes[0].name,'Poor rice');assert.ok(plan.people[0].portions.every(x=>x.grams<=316));
});
