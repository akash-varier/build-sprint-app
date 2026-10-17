'use node';
import {action} from './_generated/server';
import {api,internal} from './_generated/api';
import {v,ConvexError} from 'convex/values';
import {planV} from './validators';
import {withHouseholdMeasures,type DisplayPlan} from './lib/householdMeasures';
import {shrinkPersonalStaples} from './lib/personalSides';
import {planPersonalSides,sideFailure} from './lib/planPersonalSides';
export const generate=action({args:{token:v.string(),dishKey:v.string()},returns:planV,handler:async(ctx,args):Promise<DisplayPlan>=>{
 const runId=crypto.randomUUID(),snapshot=await ctx.runMutation(internal.personalSideState.begin,{...args,runId});
 try{const custom=await ctx.runQuery(api.ingredients.list,{token:args.token});const plan=await planPersonalSides(ctx,{token:args.token,...snapshot,plan:shrinkPersonalStaples(withHouseholdMeasures(snapshot.plan,custom),snapshot.stock,custom),custom,reserve:async()=>{await ctx.runMutation(internal.personalSideState.charge,{token:args.token,runId});}});await ctx.runMutation(internal.personalSideState.finish,{token:args.token,runId,plan});return plan;}
 catch(e){const message=sideFailure(e);throw new ConvexError(message);}
 finally{await ctx.runMutation(internal.personalSideState.release,{token:args.token,runId});}
}});
