import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePlan } from '../convex/lib/portions';
const macros = (protein:number,carbs:number,fat:number,fibre:number)=>({protein,carbs,fat,fibre});
const dishes = [
 {meal:'breakfast',name:'Example oats',weight:500,macros:macros(20,80,10,10),ingredients:[{id:'oats',grams:100}]},
 {meal:'lunch',name:'Example lentils',weight:600,macros:macros(60,50,15,15),ingredients:[{id:'lentils',grams:200}]},
 {meal:'dinner',name:'Example tofu',weight:400,macros:macros(40,10,25,5),ingredients:[{id:'tofu',grams:250}]},
] as any;
const person=(name:string,target:any)=>({name,target,diet:'veg',allergies:[],preferences:''});
test('Convex portions meet different individual targets and cooking totals equal their portions',()=>{
 const balanced=dishes.map(d=>({...d,weight:300,macros:macros(40,140/3,50/3,10)}));
 const result=calculatePlan(balanced,[person('Test A',macros(120,140,50,30)),person('Test B',macros(60,70,25,15))],[]);
 assert.ok(result.people.every(p=>p.withinTolerance));
 for(let j=0;j<3;j++) assert.ok(Math.abs(result.dishes[j].weight-result.people.reduce((s,p)=>s+p.portions[j].grams,0))<0.01);
 assert.equal(result.dishes[0].ingredients[0].grams,Math.round(result.dishes[0].weight/3*10)/10);
});
test('Impossible targets show real gaps instead of claiming success',()=>{
 const result=calculatePlan(dishes,[person('Test A',macros(180,10,5,2))],[]);
 assert.equal(result.people[0].withinTolerance,false);
 assert.ok(Object.values(result.people[0].gaps).some(g=>Math.abs(g)>5));
});
test('Ingredient shortages consider quantities across all meals',()=>{
 const repeated=dishes.map((d:any)=>({...d,weight:300,macros:macros(40,140/3,50/3,10),ingredients:[{id:'oats',grams:100}]}));
 const result=calculatePlan(repeated,[person('Test A',macros(120,140,50,30))],[{id:'oats',grams:120,mustUse:false}]);
 assert.equal(result.ingredients[0].grams,300);
 assert.equal(result.ingredients[0].shortage,180);
});
test('Daily totals are calculated from displayed portion weights, not rounded macro labels',()=>{
 const result=calculatePlan(dishes,[person('Test A',macros(73.3,97.7,34.4,20.1))],[]);
 for(const key of ['protein','carbs','fat','fibre'] as const){
  const expected=dishes.reduce((sum:any,d:any,j:number)=>sum+d.macros[key]*result.people[0].portions[j].grams/d.weight,0);
  assert.ok(Math.abs(expected-result.people[0].total[key])<1e-8);
  assert.ok(Math.abs(result.people[0].gaps[key]-(expected-result.people[0].target[key]))<1e-8);
 }
});
test('Portions never exceed 3 katoris even for incompatible targets',()=>{
 const result=calculatePlan(dishes,[person('Test A',macros(400,800,250,100))],[]);
 assert.ok(result.people[0].portions.every(p=>p.grams>=0&&p.grams<=450));
});

test('V1 tolerance accepts both signs at 5 g and rejects any macro over 5 g',async()=>{
 const {withinMacroTolerance}=await import('../shared/food');
 assert.equal(withinMacroTolerance(macros(5,-5,4.3,-3.4)),true);
 for(const key of ['protein','carbs','fat','fibre'])for(const sign of [-1,1])assert.equal(withinMacroTolerance({...macros(0,0,0,0),[key]:sign*5.01}),false);
});
