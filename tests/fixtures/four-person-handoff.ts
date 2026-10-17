import type {Dish,Person,Macros} from '../../shared/food';
import {withHouseholdMeasures} from '../../convex/lib/householdMeasures';import {assembleSides} from '../../convex/lib/jointSides';
export function fourPersonHandoff(){
 const people:Person[]=Array.from({length:4},(_,i)=>({name:`Test ${String.fromCharCode(65+i)}`,diet:'egg',allergies:[],preferences:'',target:{protein:100,carbs:250,fat:70,fibre:25}}));
 const dishes: Dish[]=(['breakfast','lunch','dinner'] as const).flatMap(meal=>[
  {meal,role:'main',name:`${meal} tomato eggs`,weight:600,macros:{protein:28,carbs:10,fat:21,fibre:3},ingredients:[{id:'egg',grams:200},{id:'tomato',grams:200}]},
  {meal,role:'staple',name:`${meal} steamed rice`,weight:800,macros:{protein:20,carbs:200,fat:2,fibre:2},ingredients:[{id:'rice',grams:280},{id:'water',grams:560}]},
  {meal,role:'side',name:`${meal} steamed carrots`,weight:400,macros:{protein:3,carbs:40,fat:.8,fibre:11.2},ingredients:[{id:'carrot',grams:400}]},
 ]);
 const plan=withHouseholdMeasures({dishes,ingredients:[],personalSides:[],people:people.map(p=>({name:p.name,target:p.target,total:{protein:0,carbs:0,fat:0,fibre:0},gaps:{protein:0,carbs:0,fat:0,fibre:0},withinTolerance:false,portions:dishes.map(d=>({grams:d.weight/4,macros:Object.fromEntries(Object.entries(d.macros).map(([k,v])=>[k,v/4])) as Macros}))}))});
 const sides=people.flatMap((_,personIndex)=>(['breakfast','lunch','dinner'] as const).flatMap(meal=>[
  {personIndex,meal,closes:'protein' as const,dish:{meal,role:'side' as const,name:`${meal} curd`,weight:100,macros:{protein:4,carbs:5,fat:3,fibre:0},ingredients:[{id:'curd',grams:100}]}},
  {personIndex,meal,closes:'fat' as const,dish:{meal,role:'side' as const,name:`${meal} toasted peanuts`,weight:20,macros:{protein:5,carbs:4,fat:10,fibre:2},ingredients:[{id:'peanut',grams:20}]}},
 ]));
 return {people,plan:assembleSides(plan,sides,[])};
}
