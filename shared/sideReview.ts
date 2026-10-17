import {dishReviewKey,allDishesAccepted,pendingDecisions,type DishDecision} from './review';
import type {PersonalSide} from './personalSides';
export function sideReviewKey(sides:PersonalSide[]=[]){return JSON.stringify(sides.map(s=>[s.personIndex,s.meal,dishReviewKey([s.dish])]));}
export function sideDecisions(sides:PersonalSide[],started:number,review:{menuStarted:number;key:string;states:DishDecision[];operation?:unknown}|null){return review?.menuStarted===started&&review.key===sideReviewKey(sides)&&review.states.length===sides.length?review.states:pendingDecisions(sides.length);}
export function sidesAccepted(sides:PersonalSide[],started:number,review:{menuStarted:number;key:string;states:DishDecision[];operation?:unknown}|null){return sides.length===0||(!review?.operation&&allDishesAccepted(sideDecisions(sides,started,review)));}
