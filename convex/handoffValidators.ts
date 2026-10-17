import {v} from 'convex/values';
import {macrosV} from './validators';
const item={key:v.string(),meal:v.union(v.literal('breakfast'),v.literal('lunch'),v.literal('dinner')),name:v.string(),grams:v.number(),ingredients:v.array(v.object({name:v.string(),measure:v.string(),grams:v.number()})),steps:v.array(v.string())};
export const handoffPageV=v.object({dishes:v.array(v.object({...item,main:v.boolean(),portions:v.array(v.object({personIndex:v.number(),name:v.string(),measure:v.string(),grams:v.number()}))})),sides:v.array(v.object({...item,personIndex:v.number(),person:v.string(),measure:v.string()})),people:v.array(v.object({name:v.string(),target:macrosV,actual:macrosV}))});
