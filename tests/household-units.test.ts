import {menuIngredientAmount} from '../convex/lib/ingredientUnits';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toGrams,normalizeStock,stockToEntries,changeEntryUnit,naturalAmount } from '../convex/lib/ingredientUnits';
import { portionMeasure,withHouseholdMeasures } from '../convex/lib/householdMeasures';
import { newFridgeEntry } from '../shared/units';
import { calculatePlan } from '../convex/lib/portions';
test('Eggs default to pieces and rice defaults to cups',()=>{
 assert.equal(newFridgeEntry('egg').unit,'pieces');assert.equal(newFridgeEntry('rice').unit,'cup');assert.equal(newFridgeEntry('spinach').unit,'bunch');
});
test('Convex converts item-specific household measures and metric quantities',()=>{
 const e=(id:string,quantity:number,unit:any)=>({id,quantity,unit,mustUse:false});
 assert.equal(toGrams(e('egg',2,'pieces')),100);assert.equal(toGrams(e('rice',2,'cup')),370);
 assert.equal(toGrams(e('spinach',2,'bunch')),200);assert.equal(toGrams(e('lentils',1,'katori')),120);
 assert.equal(toGrams(e('rice',1,'kg')),1000);assert.equal(toGrams(e('water',1,'L')),1000);
 assert.equal(toGrams(e('oil',100,'ml')),92);assert.equal(toGrams(e('milk',1,'L')),1030);
});
test('Changing units preserves weight and legacy stock still converts without losing quantities',()=>{
 const original={id:'rice',quantity:1000,unit:'g' as const,mustUse:true};const converted=changeEntryUnit(original,'cup');
 assert.ok(Math.abs(toGrams(converted)-1000)<1e-8);
 const legacy=[{id:'egg',grams:100,mustUse:false},{id:'rice',grams:1000,mustUse:true}];
 const entries=stockToEntries(legacy);assert.equal(entries[0].quantity,2);
 const stock=normalizeStock(entries);assert.ok(Math.abs(stock[1].grams-legacy[1].grams)<1e-8);
});
test('Invalid units, invalid quantities and excessive weights cannot reach the planner',()=>{
 assert.throws(()=>toGrams({id:'rice',quantity:1,unit:'pieces',mustUse:false}));
 for(const quantity of [0,-1,Infinity,NaN])assert.throws(()=>toGrams({id:'egg',quantity,unit:'pieces',mustUse:false}));
 assert.throws(()=>toGrams({id:'rice',quantity:101,unit:'kg',mustUse:false}));
});
test('Household labels are presentation only; portions, macros and gaps remain identical',()=>{
 assert.equal(portionMeasure('Whole wheat rotis',80),'About 2 rotis');assert.equal(portionMeasure('Dal',150),'About 1 katori');
 assert.notEqual(portionMeasure('Roti with dal',150),'About 3.75 rotis');
 const macros={protein:20,carbs:60,fat:10,fibre:10};
 const dishes=['breakfast','lunch','dinner'].map(meal=>({meal,name:'Dal',weight:500,macros,ingredients:[{id:'lentils',grams:100}]})) as any;
 const plan=calculatePlan(dishes,[{name:'Test',target:{protein:60,carbs:180,fat:30,fibre:30},diet:'veg',allergies:[],preferences:''}],[]);
 const before=JSON.stringify(plan);const display=withHouseholdMeasures(plan);assert.equal(JSON.stringify(plan),before);
 const {servingCapsApplied,dishIngredientMeasures,...withoutFlag}=display;assert.equal(servingCapsApplied,true);
 const stripped={...withoutFlag,ingredients:display.ingredients.map(({measure,availableMeasure,shortageMeasure,buyMeasure,...i})=>i),people:display.people.map(p=>({...p,portions:p.portions.map(({measure,...portion})=>portion)}))};
 assert.deepEqual(stripped,plan);
});

test('Ingredients use the same raw conversions and round pieces up, never reducing required grams',()=>{
 assert.equal(naturalAmount('egg',201),'5 pieces');assert.equal(naturalAmount('tomato',121),'2 pieces');assert.equal(naturalAmount('rice',370),'2 cups');assert.equal(naturalAmount('lentils',192),'1 cup');assert.equal(naturalAmount('spinach',150),'1.5 bunches');assert.equal(naturalAmount('egg',0),'0 pieces');
});
test('Saved menus from before serving caps are clearly marked for regeneration',()=>{
 const macros={protein:20,carbs:60,fat:10,fibre:10};const dishes=['breakfast','lunch','dinner'].map(meal=>({meal,name:'Dal',weight:500,macros,ingredients:[{id:'lentils',grams:100}]})) as any;
 const plan=calculatePlan(dishes,[{name:'Test',target:{protein:60,carbs:180,fat:30,fibre:30},diet:'veg',allergies:[],preferences:''}],[]);
 const legacy={...plan,people:plan.people.map(p=>({...p,portions:p.portions.map(({mealCheck,...portion})=>portion)}))};assert.equal(withHouseholdMeasures(legacy).servingCapsApplied,false);
});

test('Every Menu dish uses kitchen measures without changing recipe grams or nutrition',()=>{const macros={protein:20,carbs:60,fat:10,fibre:10};const dishes=['breakfast','lunch','dinner'].map(meal=>({meal,name:'Vegetable rice',weight:500,macros,ingredients:[{id:'rice',grams:185},{id:'tomato',grams:121},{id:'spinach',grams:50},{id:'bread',grams:60}]})) as any;const plan=calculatePlan(dishes,[{name:'Test',target:{protein:60,carbs:180,fat:30,fibre:30},diet:'veg',allergies:[],preferences:''}],[]);const display=withHouseholdMeasures(plan);assert.deepEqual(display.dishes,plan.dishes);display.dishes.forEach((d,j)=>d.ingredients.forEach((i,k)=>assert.equal(display.dishIngredientMeasures[j][k],menuIngredientAmount(i.id,i.grams))));assert.deepEqual(display.people.map(p=>[p.total,p.gaps]),plan.people.map(p=>[p.total,p.gaps]));});
