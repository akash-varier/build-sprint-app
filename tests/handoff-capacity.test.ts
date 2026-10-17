import {test} from 'node:test';import assert from 'node:assert/strict';
import {chargeAiCall} from '../convex/households';import {methodReply} from '../convex/lib/handoffPage';
function context(){const calls:any[]=[],counts=new Map<string,number>(),configs:any[]=[];return {calls,configs,ctx:{runMutation:async(_ref:any,a:any)=>{configs.push(a);const key=`${a.name}:${a.key??''}`,count=counts.get(key)??0;if(count>=a.config.rate)return {ok:false,retryAfter:a.config.period};counts.set(key,count+1);return {ok:true};},db:{query:()=>{const q:any={withIndex:()=>q,take:async()=>calls};return q;},insert:async(_table:any,row:any)=>{calls.push(row);},delete:async()=>{}}} as any};}
test('Three handoff attempts remain available after the ordinary household allowance is used',async()=>{
 const f=context();for(let i=0;i<3;i++)await chargeAiCall(f.ctx,'test-household',1000000);
 await assert.rejects(()=>chargeAiCall(f.ctx,'test-household',1000000));
 for(let i=0;i<3;i++)await chargeAiCall(f.ctx,'test-household',1000000,'handoff');
 assert.equal(f.calls.length,6);const h=f.configs.filter(x=>x.name==='handoff');assert.equal(h.length,3);assert.ok(h.every(x=>x.config.period===600000&&x.config.rate===3));
 await assert.rejects(()=>chargeAiCall(f.ctx,'test-household',1000000,'handoff'));
 await chargeAiCall(f.ctx,'different-household',1000000,'handoff');
});
test('Four people can receive all 33 shared and personal cooking methods',()=>{
 const methods=Array.from({length:9+4*3*2},(_,i)=>({key:`recipe-${i}`,steps:['Prepare the listed ingredients.','Cook the recipe thoroughly.','Keep the saved portions.']}));
 assert.equal(methodReply.parse({methods}).methods.length,33);
});
import {Agent} from '@convex-dev/agent';import {getFunctionName} from 'convex/server';import {build} from '../convex/handoffAI';import {fourPersonHandoff} from './fixtures/four-person-handoff';import {handoffRecipes} from '../convex/lib/handoffPage';import {handoffVersion} from '../shared/handoff';
test('The actual cooking request receives 16000 output tokens and saves all four-person methods',async()=>{
 const {plan}=fourPersonHandoff(),original=Agent.prototype.generateText;let cap=0,saved:any;
 (Agent.prototype as any).generateText=async(_ctx:any,_scope:any,options:any)=>{cap=options.maxOutputTokens;return {output:{methods:handoffRecipes(plan).map(r=>({key:r.key,steps:['Prepare the listed ingredients.','Cook the recipe thoroughly.','Keep the saved portions.']}))}};};
 const ctx:any={runQuery:async(ref:any)=>getFunctionName(ref)==='handoffs:snapshot'?{plan,started:1}:[],runMutation:async(ref:any,args:any)=>{const name=getFunctionName(ref);if(name==='runSteps:start')return 'step';if(name==='handoffs:save'){saved=args.page;return 'b'.repeat(64);}return null;}};
 try{await (build as any)._handler(ctx,{token:'a'.repeat(64),version:handoffVersion(plan),operation:'test',jobId:'test-job'});}finally{Agent.prototype.generateText=original;}
 assert.equal(cap,16000);assert.equal(saved.dishes.length,9);assert.equal(saved.sides.length,24);assert.equal(saved.people.length,4);
});
test('The actual handoff request waits 150 seconds before aborting',async(t)=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {plan}=fourPersonHandoff(),original=Agent.prototype.generateText;let aborted=false,done=false;
 (Agent.prototype as any).generateText=async(_ctx:any,_scope:any,options:any)=>new Promise(resolve=>options.abortSignal.addEventListener('abort',()=>{aborted=true;resolve({output:{methods:[]}});}));
 const ctx:any={runQuery:async(ref:any)=>getFunctionName(ref)==='handoffs:snapshot'?{plan,started:1}:[],runMutation:async(ref:any)=>getFunctionName(ref)==='runSteps:start'?'step':null};
 try{
 const run=(build as any)._handler(ctx,{token:'a'.repeat(64),version:handoffVersion(plan),operation:'test',jobId:'test-job'}).then(()=>{done=true;});
 for(let i=0;i<20;i++)await Promise.resolve();
 t.mock.timers.tick(149999);assert.equal(aborted,false);assert.equal(done,false);
 t.mock.timers.tick(1);for(let i=0;i<30;i++)await Promise.resolve();assert.equal(aborted,true);
 t.mock.timers.tick(150000);await run;
 }finally{Agent.prototype.generateText=original;t.mock.timers.reset();}
});
