import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recipeVideoUrl} from '../shared/recipeVideo';
test('Recipe searches encode the saved dish name and recipe suffix as one query',()=>{
 const name='Dal & rice / chef’s special?';
 const url=recipeVideoUrl(name);
 assert.equal(url,'https://www.youtube.com/results?search_query=Dal%20%26%20rice%20%2F%20chef%E2%80%99s%20special%3F%20recipe');
 assert.equal(new URL(url).searchParams.get('search_query'),name+' recipe');
});
