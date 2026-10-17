import type {DishDecision} from './review';
export function acceptPending(states:DishDecision[]):DishDecision[]{return states.map(s=>s.state==='pending'?{state:'accepted'}:s);}
