import {internal} from '../_generated/api';
import type {ActionCtx} from '../_generated/server';
import {exactError} from './actionErrors';
export async function trackStep<T>(ctx:ActionCtx,token:string,step:string,call:()=>Promise<T>):Promise<T>{
 const id=await ctx.runMutation(internal.runSteps.start,{token,step});
 try{const result=await call();await ctx.runMutation(internal.runSteps.finish,{id});return result;}
 catch(error){await ctx.runMutation(internal.runSteps.finish,{id,error:exactError(error)});throw error;}
}
