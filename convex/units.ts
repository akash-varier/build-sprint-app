import { query } from './_generated/server';
import { v } from 'convex/values';
import { entryV,unitV } from './validators';
import { foods } from '../shared/food';
import { supportedUnits } from '../shared/units';
import { changeEntryUnit,unitHint } from './lib/ingredientUnits';
export const convert=query({args:{entry:entryV,unit:unitV},returns:entryV,handler:(_,args)=>changeEntryUnit(args.entry,args.unit)});
export const catalog=query({args:{},returns:v.array(v.object({id:v.string(),hints:v.array(v.object({unit:unitV,hint:v.string()}))})),handler:()=>foods.map(f=>({id:f.id,hints:supportedUnits(f.id).map(unit=>({unit,hint:unitHint(f.id,unit)}))}))});
