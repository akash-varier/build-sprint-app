import {test} from 'node:test';import assert from 'node:assert/strict';
import {initialMealCuisines,likesForMenu,cuisines,cuisineStaples} from '../shared/cuisines';
test('Existing cuisine starts all three meal pickers without modifying saved text',()=>{
 const people=[{preferences:'Continental '},{preferences:'Continental'}],before=JSON.stringify(people);
 assert.deepEqual(initialMealCuisines(people),{breakfast:'Continental',lunch:'Continental',dinner:'Continental'});assert.equal(JSON.stringify(people),before);
 assert.equal(likesForMenu('Continental '),'');assert.equal(likesForMenu('No broccoli'),'No broccoli');
});
test('Last saved household choices override old personal cuisine and never collapse to one choice',()=>{
 const saved={breakfast:'Continental',lunch:'Indian',dinner:'Continental'} as const;
 assert.deepEqual(initialMealCuisines([{preferences:'Indian'}],saved),saved);
 assert.deepEqual(initialMealCuisines([{preferences:''}]),{breakfast:'North Indian',lunch:'North Indian',dinner:'North Indian'});
});

test('All eight cuisine choices survive save/read while legacy Indian stays unchanged',()=>{assert.equal(cuisines.length,8);for(const c of cuisines){const saved={breakfast:c,lunch:c,dinner:c};assert.deepEqual(initialMealCuisines([],saved),saved);assert.ok(cuisineStaples[c].length>0);}assert.deepEqual(initialMealCuisines([],{breakfast:'Indian',lunch:'Continental',dinner:'Indian'}),{breakfast:'Indian',lunch:'Continental',dinner:'Indian'});assert.equal(initialMealCuisines([{preferences:'South Indian'}]).breakfast,'South Indian');});
