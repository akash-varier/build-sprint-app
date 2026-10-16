import {test} from 'node:test';import assert from 'node:assert/strict';
import {menuIngredientAmount,naturalAmount} from '../convex/lib/ingredientUnits';
test('Menu measures use spoons below quarter cup and familiar cup fractions above it',()=>{
 assert.equal(menuIngredientAmount('rice',15),'About 1½ tbsp');
 assert.equal(menuIngredientAmount('rice',1),'About ¼ tsp');
 for(const [fraction,label] of [[.25,'¼'],[1/3,'⅓'],[.5,'½'],[.75,'¾'],[1,'1'],[1.5,'1½']] as const)assert.equal(menuIngredientAmount('rice',185*fraction),`About ${label} ${fraction===1?'cup':'cups'}`);
 assert.equal(menuIngredientAmount('lentils',45.1),'About 4 tbsp');
});
test('Menu oil uses spoons and spinach uses handfuls or half bunches without altering other screen measures',()=>{
 assert.equal(menuIngredientAmount('oil',3.8),'About ¾ tsp');assert.equal(menuIngredientAmount('oil',13.8),'About 1 tbsp');
 assert.equal(menuIngredientAmount('spinach',22.6),'About a handful');assert.equal(menuIngredientAmount('spinach',50),'About ½ bunch');
 assert.equal(menuIngredientAmount('tomato',30.1),'1 piece');
 assert.equal(naturalAmount('rice',15),'0.09 cups');assert.equal(naturalAmount('spinach',22.6),'0.23 bunches');
 assert.equal(menuIngredientAmount('rice',0),'0 cups');
});
