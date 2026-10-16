import {macroKeys,macroTolerance,type Dish,type Macros} from './food';
export type PersonalSide={personIndex:number;meal:Dish['meal'];closes:typeof macroKeys[number];dish:Dish;measure?:string;ingredientMeasures?:string[]};
export function biggestMealShortfall(actual:Macros,target:Macros){
 let macro:typeof macroKeys[number]='protein',grams=0;
 for(const key of macroKeys){const deficit=target[key]*.25-actual[key];if(deficit>grams){macro=key;grams=deficit;}}
 return grams>macroTolerance+1e-8?{macro,grams}:null;
}
