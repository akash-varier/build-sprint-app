import {test} from 'node:test';import assert from 'node:assert/strict';
import {foods,type Dish} from '../shared/food';import {fourPersonHandoff} from './fixtures/four-person-handoff';
import {assembleSides} from '../convex/lib/jointSides';import {isFatAddition,addedFatGrams} from '../convex/lib/fatAdditions';import {fitPortions} from '../convex/lib/portions';import {servingAliases} from '../convex/lib/ingredientAliases';
const fat=(id:string,grams=10,meal='breakfast'):Dish=>({meal:meal as Dish['meal'],role:'side',name:'Plain fat',weight:grams,macros:{protein:0,carbs:0,fat:grams,fibre:0},ingredients:[{id,grams}]});
test('Oil, ghee and butter become explicit additions to a dish the recipient eats',()=>{
 for(const id of ['oil','ghee']){const {plan}=fourPersonHandoff();const result=assembleSides(plan,[{personIndex:0,meal:'breakfast',closes:'fat',dish:fat(id)}],[]);assert.match(result.personalSides![0].dish.name,/^Add .* tsp .* to your /);assert.equal(result.personalSides![0].dish.ingredients[0].grams,10);assert.equal(result.people[0].total.fat,plan.people[0].portions.reduce((s,p)=>s+p.macros.fat,0)+10);}
});
test('Added fats cannot be offered without a recipient’s actual dish, or exceed 2 tbsp across the day',()=>{
 const {plan}=fourPersonHandoff();plan.people[0].portions.forEach(p=>p.grams=0);
 assert.throws(()=>assembleSides(plan,[{personIndex:0,meal:'breakfast',closes:'fat',dish:fat('oil')}],[]),/needs a dish/);
 const p=fourPersonHandoff().plan;assert.throws(()=>assembleSides(p,['breakfast','lunch','dinner'].map(meal=>({personIndex:0,meal:meal as Dish['meal'],closes:'fat',dish:fat('oil',10,meal)})),[]),/2 tbsp per day/);
});
test('The portion solver combines custom oil, ghee and butter into one daily allowance',()=>{
 const aliases=servingAliases([{id:'custom_butter',name:'Butter'}] as any);assert.equal(aliases.custom_butter,'butter');
 const recipes=['breakfast','lunch','dinner'].map(m=>fat('custom_butter',100,m));const weights=fitPortions(recipes,{protein:0,carbs:0,fat:100,fibre:0},[],[4.6,4.6,4.6],0,[],aliases);assert.ok(weights.reduce((a,b)=>a+b,0)<=28);assert.ok(weights.every(w=>w>=4.6));
 assert.equal(isFatAddition(fat('custom_butter'),aliases),true);assert.equal(addedFatGrams(fat('custom_butter'),aliases),10);
});
test('A fitting real-food side wins over an oil addition',async()=>{
 const {attachPersonalSideAlternatives}=await import('../convex/lib/personalSides');const {withHouseholdMeasures}=await import('../convex/lib/householdMeasures');
 const {plan,people}=fourPersonHandoff();plan.personalSides=[];
 for(let i=0;i<people.length;i++){const actual=Object.fromEntries(['protein','carbs','fat','fibre'].map(k=>[k,plan.people[i].portions.reduce((sum,p)=>sum+p.macros[k as keyof typeof p.macros],0)])) as typeof people[number]['target'];people[i].target={...actual,fat:actual.fat+(i===0?10:0)};plan.people[i].target=people[i].target;}
 const base=withHouseholdMeasures(plan),nuts:Dish={meal:'breakfast',role:'side',name:'Toasted almonds',weight:100,ingredients:[{id:'almond',grams:100}],macros:{protein:21,carbs:20,fat:50,fibre:10}};
 const result=attachPersonalSideAlternatives(base,[{personIndex:0,meal:'breakfast',options:[fat('oil',100),nuts]}],people,[],foods);
 assert.ok(result.people[0].withinTolerance);assert.ok(result.personalSides!.some(s=>s.dish.name==='Toasted almonds'));assert.ok(result.personalSides!.every(s=>!isFatAddition(s.dish)));
});
