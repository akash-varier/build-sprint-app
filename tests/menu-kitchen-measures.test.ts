import {test} from 'node:test';import assert from 'node:assert/strict';
import {menuIngredientAmount,naturalAmount} from '../convex/lib/ingredientUnits';
test('Menu staples use eighth-cup fractions or tablespoons rounded to halves',()=>{
 assert.equal(menuIngredientAmount('rice',15),'About 1½ tbsp');
 assert.equal(menuIngredientAmount('rice',1),'About 0 tbsp');
 for(const [fraction,label] of [[.125,'⅛'],[.25,'¼'],[1/3,'⅓'],[.5,'½'],[.75,'¾'],[1,'1'],[1.5,'1½']] as const)assert.equal(menuIngredientAmount('rice',185*fraction),`About ${label} ${fraction<=1?'cup':'cups'}`);
 assert.equal(menuIngredientAmount('lentils',45),'About ¼ cup');
});
test('Menu oil uses spoons and spinach uses handfuls or half bunches without altering other screen measures',()=>{
 assert.equal(menuIngredientAmount('oil',3.8),'About ¾ tsp');assert.equal(menuIngredientAmount('oil',13.8),'About 1 tbsp');
 assert.equal(menuIngredientAmount('spinach',22.6),'About a handful');assert.equal(menuIngredientAmount('spinach',50),'About ½ bunch');
 assert.equal(menuIngredientAmount('tomato',30.1),'About ½ piece');
 assert.equal(naturalAmount('rice',15),'0.09 cups');assert.equal(naturalAmount('spinach',22.6),'0.23 bunches');
 assert.equal(menuIngredientAmount('rice',0),'0 cups');
});

test('Ingredient type selects cups, spoons, pinches or half counts regardless of amount',()=>{
 for(const id of ['rice','lentils','atta','oats','milk','curd','carrot','broccoli','peas'])assert.equal(menuIngredientAmount(id,1),'About 0 tbsp');
 assert.match(menuIngredientAmount('ghee',10),/ tbsp| tsp/);
 assert.equal(menuIngredientAmount('salt',.1),'About a pinch');
 assert.match(menuIngredientAmount('turmeric',2),/ tsp/);
 assert.equal(menuIngredientAmount('onion',55),'About ½ piece');
 assert.equal(menuIngredientAmount('egg',100),'About 2 pieces');
});

test('Custom staples and chopped count vegetables keep type-based units',()=>{
 const custom=(name:string)=>[{id:'custom_test',name,diet:'veg' as const,allergens:[],estimate:{protein:0,carbs:0,fat:0,fibre:0,calories:0,unit:'g' as const,gramsPerUnit:1,diet:'veg' as const,allergens:[],uncertainAllergens:[],note:''}}];
 for(const name of ['toor dal','atta','ragi flour','chopped onion','milk','curd'])assert.equal(menuIngredientAmount('custom_test',5,custom(name)),'About ½ tbsp');
 for(const name of ['butter','ginger garlic paste','sugar'])assert.match(menuIngredientAmount('custom_test',5,custom(name)),/tsp|tbsp|pinch/);
});
