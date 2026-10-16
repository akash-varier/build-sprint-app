export type DishDecision={state:'pending'|'accepted'|'rejected';reason?:string};
export const pendingDecisions=(count:number):DishDecision[]=>Array.from({length:count},()=>({state:'pending'}));
export const allDishesAccepted=(states:DishDecision[])=>states.length>0&&states.every(s=>s.state==='accepted');
export function decideDish(states:DishDecision[],index:number,state:'accepted'|'rejected',reason?:string){
 if(!Number.isInteger(index)||index<0||index>=states.length)throw new Error('Dish not found.');
 if(state==='accepted'&&states[index].state==='rejected')throw new Error('Replace the rejected dish before accepting it.');
 const text=reason?.trim();if(state==='rejected'&&(!text||text.length>160))throw new Error('Enter a rejection reason of 1–160 characters.');
 return states.map((s,i)=>i===index?state==='accepted'?{state} as DishDecision:{state,reason:text} as DishDecision:s);
}
export function dishReviewKey(dishes:import('./food').Dish[]):string{return JSON.stringify(dishes.map(d=>[d.meal,d.role??null,d.name,d.weight,[d.macros.protein,d.macros.carbs,d.macros.fat,d.macros.fibre],d.ingredients.map(i=>[i.id,i.grams])]));}
