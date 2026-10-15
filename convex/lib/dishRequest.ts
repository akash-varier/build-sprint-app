import type { Agent } from '@convex-dev/agent';
import type { ActionCtx } from '../_generated/server';
import { Output } from 'ai';
import { menuItemsSchema } from '../../shared/validation';
// Give the agent an isolated request scope without including old messages.
// This is an internal request ID, not a sign-in or a family identifier.
export async function requestDishes(planner:Agent,ctx:ActionCtx,generation:string,prompt:string) {
 const result=await planner.generateText(ctx,{userId:generation}, {prompt,output:Output.object({schema:menuItemsSchema}),maxOutputTokens:4000,maxRetries:0,providerOptions:{openai:{reasoningEffort:'low',textVerbosity:'low'}},abortSignal:AbortSignal.timeout(60000)}, {contextOptions:{recentMessages:0,searchOtherThreads:false},storageOptions:{saveMessages:'none'}});
 return menuItemsSchema.parse(result.output).dishes;
}
