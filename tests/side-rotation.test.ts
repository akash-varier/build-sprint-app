import {test} from 'node:test';import assert from 'node:assert/strict';
import type {Dish} from '../shared/food';import {checkSideRotation,sideIngredientCounts} from '../convex/lib/sideRules';import {personalServingCap,servingCap} from '../convex/lib/portions';
const side=(id:string,meal: Dish['meal']='breakfast'):Dish=>({meal,role:'side',name:id,weight:500,macros:{protein:10,carbs:20,fat:5,fibre:2},ingredients:[{id,grams:500},{id:'water',grams:100}]});
test('An ingredient can appear in two personal sides, but not three, across meals',()=>{
 const dishes=[side('egg'),side('egg','lunch')];assert.doesNotThrow(()=>checkSideRotation(dishes));assert.throws(()=>checkSideRotation([...dishes,side('egg','dinner')]),/egg exceeds twice/);
 assert.doesNotThrow(()=>checkSideRotation([...dishes,side('chicken','dinner')]));
});
test('Count each ingredient once per side, ignore water, and combine saved aliases',()=>{
 const d=side('egg');d.ingredients.push({id:'egg',grams:10});assert.equal(sideIngredientCounts([d]).get('egg'),1);
 assert.doesNotThrow(()=>checkSideRotation([side('egg'),side('chicken'),side('paneer')]));
 assert.throws(()=>checkSideRotation([side('oil'),side('custom_oil'),side('ghee')],{custom_oil:'oil',ghee:'oil'}),/oil exceeds twice/);
});
test('Every personal side caps at 250 cooked grams, preserving stricter caps and shared servings',()=>{
 assert.equal(personalServingCap(side('mushroom')),250);assert.equal(servingCap(side('mushroom')),450);assert.equal(personalServingCap(side('paneer')),150);assert.equal(personalServingCap(side('almond')),40);
});
import {fourPersonHandoff} from './fixtures/four-person-handoff';import {fitSideCombination} from '../convex/lib/jointSides';import {foods} from '../shared/food';
test('The actual portion calculation blocks a third ingredient use including retained sides',()=>{
 const {plan,people}=fourPersonHandoff(),retained=['breakfast','lunch'].map(meal=>({personIndex:0,meal:meal as Dish['meal'],closes:'protein' as const,dish:{...side('egg',meal as Dish['meal']),weight:100}}));
 assert.throws(()=>fitSideCombination(plan,0,[side('egg','dinner')],retained,people,[],foods),/egg exceeds twice/);
 assert.doesNotThrow(()=>checkSideRotation([side('egg'),side('egg')]));
});
