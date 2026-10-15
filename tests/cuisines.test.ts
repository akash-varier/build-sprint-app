import {test} from 'node:test';import assert from 'node:assert/strict';
import {initialMealCuisines,likesForMenu} from '../shared/cuisines';
test('Existing cuisine starts all three meal pickers without modifying saved text',()=>{
 const people=[{preferences:'Continental '},{preferences:'Continental'}],before=JSON.stringify(people);
 assert.deepEqual(initialMealCuisines(people),{breakfast:'Continental',lunch:'Continental',dinner:'Continental'});assert.equal(JSON.stringify(people),before);
 assert.equal(likesForMenu('Continental '),'');assert.equal(likesForMenu('No broccoli'),'No broccoli');
});
test('Last saved household choices override old personal cuisine and never collapse to one choice',()=>{
 const saved={breakfast:'Continental',lunch:'Indian',dinner:'Continental'} as const;
 assert.deepEqual(initialMealCuisines([{preferences:'Indian'}],saved),saved);
 assert.deepEqual(initialMealCuisines([{preferences:''}]),{breakfast:'Indian',lunch:'Indian',dinner:'Indian'});
});
