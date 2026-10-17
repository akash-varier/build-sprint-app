import type {ReactNode} from 'react';
import type {PersonalSide as Side} from '../shared/personalSides';
import {macroKeys} from '../shared/food';
import {recipeVideoUrl} from '../shared/recipeVideo';
const fmt=(n:number)=>new Intl.NumberFormat('en-IN',{maximumFractionDigits:1}).format(n);
export function PersonalSide({side,person,nameOf}:{side:Side;person:string;nameOf:(id:string)=>string}){
 return <div className="personal-side" aria-label={`Side for ${person}`}><p className="personal-side-label">Side for {person} only</p><h4>{side.dish.name}</h4><p className="portion-amount">{side.measure}<small>{fmt(side.dish.weight)} g cooked</small></p><p className="help">Ingredients for {person}’s portion only</p><ul className="dish-ingredient-lines" aria-label={`Ingredients for ${person} only`}>{side.dish.ingredients.map((i,k)=><li key={i.id}><span>{nameOf(i.id)}</span><span>{side.ingredientMeasures?.[k]}<small>{fmt(i.grams)} g raw</small></span></li>)}</ul><p className="help">{macroKeys.map(k=>`${k}: ${fmt(side.dish.macros[k])} g`).join(' · ')}. Included in this person’s meal and daily totals.</p><a className="recipe-video-button" href={recipeVideoUrl(side.dish.name)} target="_blank" rel="noopener noreferrer">Watch how to make it</a></div>;
}
export function PersonalSideForMeal({sides,personIndex,meal,person,nameOf,review}:{sides:Side[]|undefined;personIndex:number;meal:Side['meal'];person:string;nameOf:(id:string)=>string;review?:(index:number)=>ReactNode}){
 const matches=sides?.filter(s=>s.personIndex===personIndex&&s.meal===meal)??[];
 return <>{matches.map(side=><div key={sides!.indexOf(side)}><PersonalSide side={side} person={person} nameOf={nameOf}/>{review?.(sides!.indexOf(side))}</div>)}</>;
}
