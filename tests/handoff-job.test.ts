import {test} from 'node:test';import assert from 'node:assert/strict';
import {prepare,status} from '../convex/handoffs';
import {calculatePlan} from '../convex/lib/portions';import {withHouseholdMeasures} from '../convex/lib/householdMeasures';
import {handoffVersion} from '../shared/handoff';import {dishReviewKey} from '../shared/review';
function fixture(){
 const recipes=['breakfast','lunch','dinner'].map(meal=>({meal,role:'main',name:'Vegetable rice',weight:300,macros:{protein:20,carbs:50,fat:10,fibre:5},ingredients:[{id:'rice',grams:60}]})) as any;
 const plan=withHouseholdMeasures(calculatePlan(recipes,[{name:'Test A',diet:'egg',allergies:[],preferences:'',target:{protein:60,carbs:150,fat:30,fibre:15}}],[]));
 const token='a'.repeat(64),h={_id:'household',token,started:1,plan,generation:null};
 const tables:any={households:[h],menuReviews:[{householdId:h._id,menuStarted:1,dishKey:dishReviewKey(plan.dishes),states:plan.dishes.map(()=>({state:'accepted'}))}],sideReviews:[],personalSideRuns:[],ingredientEstimates:[],handoffs:[],handoffJobs:[]};let scheduled=0;
 const ctx:any={db:{query:(table:string)=>{let tests:any[]=[];const q:any={withIndex:(_name:string,fn:any)=>{const eq:any={eq:(key:string,value:any)=>{tests.push([key,value]);return eq;}};fn?.(eq);return q;},order:()=>q,unique:async()=>tables[table].find((r:any)=>tests.every(([k,v])=>r[k]===v))??null,take:async()=>tables[table].filter((r:any)=>tests.every(([k,v])=>r[k]===v))};return q;},insert:async(table:string,row:any)=>{const id=`${table}-${tables[table].length}`;tables[table].push({...row,_id:id});return id;},replace:async(id:string,row:any)=>{for(const rows of Object.values(tables) as any[]) {const i=rows.findIndex((r:any)=>r._id===id);if(i>=0)rows[i]={...row,_id:id};}}},scheduler:{runAfter:async()=>{scheduled++;}}};
 return {ctx,token,version:handoffVersion(plan),tables,scheduled:()=>scheduled};
}
test('Concurrent handoff creation schedules exactly one job; failed jobs can be retried',async()=>{
 const f=fixture(),args={token:f.token,version:f.version,operation:'first'};
 await (prepare as any)._handler(f.ctx,args);await (prepare as any)._handler(f.ctx,{...args,operation:'duplicate'});
 assert.equal(f.scheduled(),1);assert.equal(f.tables.handoffJobs.length,1);assert.equal((await (status as any)._handler(f.ctx,args)).state,'working');
 f.tables.handoffJobs[0].status='failed';f.tables.handoffJobs[0].message='The AI took longer than 60 seconds to respond.';
 assert.match((await (status as any)._handler(f.ctx,args)).message,/60 seconds/);
 await (prepare as any)._handler(f.ctx,{...args,operation:'retry'});assert.equal(f.scheduled(),2);assert.equal(f.tables.handoffJobs[0].operation,'retry');
});
test('Handoff jobs cannot start with a rejected dish or a stale menu version',async()=>{
 const f=fixture();f.tables.menuReviews[0].states[0]={state:'rejected',reason:'Different main'};
 await assert.rejects(()=>(prepare as any)._handler(f.ctx,{token:f.token,version:f.version,operation:'first'}),/Accept every dish/);assert.equal(f.scheduled(),0);
 f.tables.menuReviews[0].states[0]={state:'accepted'};
 await assert.rejects(()=>(prepare as any)._handler(f.ctx,{token:f.token,version:'old',operation:'first'}),/menu has changed/);assert.equal(f.scheduled(),0);
});
test('A running handoff remains working throughout both 150-second attempts',async()=>{
 const f=fixture(),args={token:f.token,version:f.version,operation:'first'};
 await (prepare as any)._handler(f.ctx,args);
 f.tables.handoffJobs[0].startedAt=Date.now()-300000;
 assert.equal((await (status as any)._handler(f.ctx,args)).state,'working');
 await (prepare as any)._handler(f.ctx,{...args,operation:'duplicate'});assert.equal(f.scheduled(),1);
 f.tables.handoffJobs[0].startedAt=Date.now()-331000;
 assert.equal((await (status as any)._handler(f.ctx,args)).state,'error');
});
