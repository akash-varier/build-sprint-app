import type {ReactNode} from 'react';
import {IngredientRequirements} from './IngredientRequirements';
import type {DisplayPlan} from '../convex/lib/householdMeasures';
export function IngredientsScreen({ingredients,nameOf,back,handoff}:{ingredients:DisplayPlan['ingredients'];nameOf:(id:string)=>string;back:ReactNode;handoff?:ReactNode}){return <><div className="intro"><h1>What you’ll need.</h1><p>Combined ingredient quantities for all three meals and everyone’s portions.</p></div><IngredientRequirements ingredients={ingredients} nameOf={nameOf}/>{back}{handoff}</>;}
