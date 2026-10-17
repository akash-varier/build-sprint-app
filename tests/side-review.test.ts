import {test} from 'node:test';import assert from 'node:assert/strict';
import {sideDecisions,sideReviewKey,sidesAccepted} from '../shared/sideReview';
import {decideDish} from '../shared/review';
const sides:any=[{personIndex:0,meal:'breakfast',dish:{meal:'breakfast',role:'side',name:'Egg side',weight:50,macros:{protein:6,carbs:0,fat:5,fibre:0},ingredients:[{id:'egg',grams:50}]}}];
test('Personal-side acceptance is required, versioned, and rejected sides need replacement',()=>{
 const key=sideReviewKey(sides),pending=sideDecisions(sides,10,null);assert.equal(sidesAccepted(sides,10,null),false);
 const accepted={key,menuStarted:10,states:decideDish(pending,0,'accepted')};assert.equal(sidesAccepted(sides,10,accepted),true);
 assert.equal(sidesAccepted(sides,11,accepted),false);assert.equal(sidesAccepted([{...sides[0],dish:{...sides[0].dish,weight:60}}],10,accepted),false);
 const rejected=decideDish(accepted.states,0,'rejected','Too oily');assert.equal(rejected[0].reason,'Too oily');assert.throws(()=>decideDish(rejected,0,'accepted'),/Replace/);
 assert.equal(sidesAccepted(sides,10,{...accepted,operation:{}}),false);assert.equal(sidesAccepted([],10,null),true);
});

test('A side replacement changes only its decision while preserving other accepted sides',()=>{
 const before=[{state:'accepted' as const},{state:'accepted' as const}],rejected=decideDish(before,1,'rejected','Different vegetable');
 assert.deepEqual(rejected[0],before[0]);assert.equal(rejected[1].reason,'Different vegetable');
 const replaced=rejected.map((s,i)=>i===1?{state:'pending' as const}:s);assert.equal(replaced[0].state,'accepted');assert.equal(replaced[1].state,'pending');
});

test('Personal-side cards render their own Accept/Reject controls and saved rejection reason',async()=>{
 const React=await import('react'),{renderToStaticMarkup}=await import('react-dom/server'),{PersonalSideForMeal}=await import('../src/PersonalSide'),{DishReview}=await import('../src/DishReview');
 const html=renderToStaticMarkup(React.createElement(PersonalSideForMeal,{sides,personIndex:0,meal:'breakfast',person:'Test A',nameOf:id=>id,review:()=>React.createElement(DishReview,{decision:{state:'rejected',reason:'Too oily'},disabled:false,replacing:false,onAccept:async()=>{},onReject:async()=>{},onRetry:async()=>{}})}));
 assert.match(html,/Side for Test A only/);assert.match(html,/Rejected: Too oily/);assert.match(html,/>Accept</);assert.match(html,/>Reject</);assert.match(html,/Retry replacement/);
});
