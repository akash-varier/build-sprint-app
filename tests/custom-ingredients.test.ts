import {test} from 'node:test';import assert from 'node:assert/strict';
import {estimatedFood,estimateSchema,confirmedEstimate} from '../shared/ingredientEstimate';
import {foods,allowedFood} from '../shared/food';
import {validateInputs,validateDishes} from '../shared/validation';
import {normalizeStock} from '../convex/lib/ingredientUnits';
const estimate={protein:22,carbs:62,fat:2,fibre:15,calories:354,unit:'katori' as const,gramsPerUnit:120,diet:'veg' as const,allergens:[],uncertainAllergens:[],note:'Raw dry dal.'};
const person={name:'Test A',diet:'egg' as const,allergies:['Milk','Fish'],preferences:'',target:{protein:100,carbs:300,fat:60,fibre:30}};
test('Confirmed custom ingredient passes the same stock, coverage and dish safety checks',()=>{
 const f=estimatedFood('custom_test','toor dal',estimate),catalog=[...foods,f];const stock=normalizeStock([{id:f.id,quantity:2,unit:'katori',mustUse:true}],[f]);assert.equal(stock[0].grams,240);assert.doesNotThrow(()=>validateInputs([person],stock,catalog));const dishes=['breakfast','lunch','dinner'].map(meal=>({meal,name:'Dal',weight:300,macros:{protein:22,carbs:62,fat:2,fibre:15},ingredients:[{id:f.id,grams:100}]})) as any;assert.doesNotThrow(()=>validateDishes(dishes,[person],stock,undefined,catalog));assert.throws(()=>validateDishes(dishes,[person],[],undefined,catalog),/Too few available/);
});
test('Unticked uncertain allergens are dropped; ticked and confirmed allergens still block',()=>{
 const input={...estimate,uncertainAllergens:['Milk','Fish'] as any};
 const unchecked=confirmedEstimate(input);assert.deepEqual(unchecked.uncertainAllergens,[]);assert.deepEqual(unchecked.allergens,[]);assert.equal(allowedFood(estimatedFood('custom_test','Mixed food',unchecked),[person]),true);
 const checked=confirmedEstimate({...input,allergens:['Milk']});assert.deepEqual(checked.allergens,['Milk']);assert.deepEqual(checked.uncertainAllergens,[]);assert.equal(allowedFood(estimatedFood('custom_test','Mixed food',checked),[person]),false);
 assert.equal(allowedFood(foods.find(f=>f.id==='paneer')!,[person]),false);
});
test('Unsafe conversions and impossible nutrition cannot be saved',()=>{assert.equal(estimateSchema.safeParse({...estimate,unit:'g',gramsPerUnit:120}).success,false);assert.equal(estimateSchema.safeParse({...estimate,protein:99}).success,false);});
