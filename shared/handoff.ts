import {macroKeys,type Macros,type Dish} from './food';
import {allDishesAccepted,dishReviewKey,type DishDecision} from './review';
import type {DisplayPlan} from '../convex/lib/householdMeasures';
export type HandoffIngredient={name:string;measure:string;grams:number};
export type HandoffItem={key:string;meal:Dish['meal'];name:string;grams:number;ingredients:HandoffIngredient[];steps:string[]};
export type HandoffPage={dishes:(HandoffItem&{portions:{personIndex:number;name:string;measure:string;grams:number}[];main:boolean})[];sides:(HandoffItem&{personIndex:number;person:string;measure:string})[];people:{name:string;target:Macros;actual:Macros}[]};
export function handoffVersion(plan:Pick<DisplayPlan,'dishes'|'people'|'personalSides'>){
 const macros=(m:Macros)=>macroKeys.map(k=>m[k]);
 return JSON.stringify([dishReviewKey(plan.dishes),plan.people.map(p=>[p.name,macros(p.target),macros(p.total),p.portions.map(x=>[x.grams,macros(x.macros)])]),(plan.personalSides??[]).map(s=>[s.personIndex,s.meal,dishReviewKey([s.dish])])]);
}
export function handoffAccepted(plan:{dishes:Dish[]}|null,started:number,review:{dishKey:string;menuStarted?:number;states:DishDecision[];operation?:unknown}|null,generating=false,sideRunning=false){
 return !!plan&&!generating&&!sideRunning&&!!review&&!review.operation&&review.menuStarted===started&&review.dishKey===dishReviewKey(plan.dishes)&&review.states.length===plan.dishes.length&&allDishesAccepted(review.states);
}
export function whatsappHandoffUrl(url:string){return `https://wa.me/?text=${encodeURIComponent(url)}`;}
export const handoffChanged="This menu has changed, ask for a fresh link.";
