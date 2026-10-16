import {test} from 'node:test';import assert from 'node:assert/strict';import {buyableAmount,naturalAmount} from '../convex/lib/ingredientUnits';
test('Shopping rounds shortages upward to whole bunches/pieces, half cups and spoons',()=>{
 assert.equal(buyableAmount('spinach',326.5),'4 bunches');assert.equal(buyableAmount('carrot',92.3),'2 pieces');
 assert.equal(buyableAmount('atta',109.9),'1 cup');assert.equal(buyableAmount('lentils',253.8),'1½ cups');assert.equal(buyableAmount('chickpeas',204.5),'1½ cups');
 assert.equal(buyableAmount('oil',80.3),'6 tbsp');assert.equal(buyableAmount('cumin',7.6),'4 tsp');assert.equal(buyableAmount('oil',1),'1 tsp');
 assert.equal(naturalAmount('spinach',326.5),'3.27 bunches');assert.equal(naturalAmount('oil',80.3),'87.29 ml');
});
test('Packed shopping quantities use 100 g or 250 g increments without changing custom ingredients',()=>{
 const custom:any=[{id:'custom_mushroom',name:'Mushroom',diet:'veg',allergens:[],estimate:{unit:'g',gramsPerUnit:1}}];
 assert.equal(buyableAmount('custom_mushroom',161.4,custom),'200 g');assert.equal(buyableAmount('chicken',251),'500 g');assert.equal(buyableAmount('paneer',200),'250 g');
});
