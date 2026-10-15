import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Agent } from '@convex-dev/agent';
import { MockLanguageModelV4 } from 'ai/test';
import { requestDishes } from '../convex/lib/dishRequest';
const dishes=['breakfast','lunch','dinner'].flatMap(meal=>['main','staple'].map(role=>({meal,role,name:'Test rice',weight:300,macros:{protein:5,carbs:60,fat:1,fibre:2},ingredients:[{id:'rice',grams:100}]})));
test('AI request reaches the model without stored history or an existing conversation',async()=>{
 const model=new MockLanguageModelV4({doGenerate:{content:[{type:'text',text:JSON.stringify({dishes})}],finishReason:{unified:'stop',raw:'stop'},usage:{inputTokens:{total:100,noCache:100,cacheRead:0,cacheWrite:0},outputTokens:{total:200,text:200,reasoning:0}},warnings:[]}});
 const planner=new Agent({} as any,{name:'Test planner',languageModel:model});
 // No backend reads or writes should be needed to assemble this isolated request.
 const ctx=new Proxy({},{get(){throw new Error('Unexpected conversation history access');}}) as any;
 const result=await requestDishes(planner,ctx,'test-generation','Pick three dishes.');
 assert.deepEqual(result,dishes);
 assert.equal(model.doGenerateCalls.length,1);
 assert.equal(model.doGenerateCalls[0].maxOutputTokens,4000);
});
test('A reply cut off at the token cap is rejected instead of becoming a partial menu',async()=>{
 const model=new MockLanguageModelV4({doGenerate:{content:[{type:'text',text:'{"dishes":[{"meal":"breakfast","name":"Test rice"'}],finishReason:{unified:'length',raw:'length'},usage:{inputTokens:{total:100,noCache:100,cacheRead:0,cacheWrite:0},outputTokens:{total:4000,text:111,reasoning:3889}},warnings:[]}});
 const planner=new Agent({} as any,{name:'Test planner',languageModel:model});
 await assert.rejects(requestDishes(planner,{} as any,'test-truncated-generation','Pick three dishes.'),/No object generated/);
 assert.equal(model.doGenerateCalls.length,1);
});
