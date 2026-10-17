// Preserve provider details for diagnosis; credentials never belong in a record.
export function exactError(error:unknown):string{
 const seen=new Set<unknown>();
 const describe=(e:any):unknown=>{if(e===null||typeof e!=='object')return String(e);if(seen.has(e))return '[circular]';seen.add(e);return Object.fromEntries(['name','message','statusCode','status','responseBody','data','finishReason','text','usage','cause'].filter(k=>e[k]!==undefined).map(k=>[k,k==='cause'?describe(e[k]):e[k]]));};
 let result=JSON.stringify(describe(error));
 const key=process.env.OPENAI_API_KEY;if(key)result=result.replaceAll(key,'[redacted]');
 return result.replace(/sk-[A-Za-z0-9_-]+/g,'[redacted]').replace(/Bearer\s+[^\s"\\]+/gi,'Bearer [redacted]');
}
export function plainError(error:unknown,deadlineSeconds=60):string{
 const raw=exactError(error),e=error as any;
 if(/quota|credit|billing|insufficient_quota/i.test(raw))return 'The AI account has no credits available.';
 if(e?.statusCode===429||/rate.?limit|Busy right now/i.test(raw))return 'The AI request limit was reached. Please try again in a minute.';
 if(/timeout|timed out|abort/i.test(raw))return `The AI took longer than ${deadlineSeconds} seconds to respond.`;
 if(/length|token.?limit|max.?output|incomplete/i.test(raw))return 'The AI reply reached its length limit.';
 if(/JSON|parse|NoObjectGenerated|Cooking methods|ZodError/i.test(raw))return 'The AI returned incomplete or invalid cooking steps.';
 if(e?.data&&typeof e.data==='string')return e.data;
 if(e?.statusCode>=500)return 'The AI service is temporarily unavailable.';
 return 'The cooking link could not be prepared. Please try again.';
}
export async function withDeadline<T>(call:(signal:AbortSignal)=>Promise<T>,ms=60000):Promise<T>{
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>;
 const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();const e=new Error(`AI request timed out after ${ms/1000} seconds.`);e.name='TimeoutError';reject(e);},ms);});
 try{return await Promise.race([call(controller.signal),timeout]);}finally{clearTimeout(timer!);}
}
export async function retryOnce<T>(call:(attempt:number)=>Promise<T>,onError:(e:unknown,attempt:number)=>Promise<void>):Promise<T>{
 for(let attempt=1;attempt<=2;attempt++){try{return await call(attempt);}catch(e){await onError(e,attempt);if(attempt===2)throw e;}}
 throw new Error('Unreachable retry state.');
}
