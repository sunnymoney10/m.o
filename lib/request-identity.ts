// Public headers are not authentication. Only a configured, signed gateway may assert identity.
// Gateway identities must not alias the UUID-shaped browser bearer cookie. Namespace UUID user IDs in the gateway.
// Internal MCP -> API requests keep the verified identity without reusing the public header.
const trusted = new WeakMap<Request,string>();
export function trustIdentity(request:Request,actor:string){trusted.set(request,actor);return request}
async function message(request:Request,actor:string,timestamp:string){
 const url=new URL(request.url),body=await request.clone().text();
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 return new TextEncoder().encode([timestamp,request.method,url.pathname+url.search,actor,digest].join('\n'));
}
export async function verifiedIdentity(request:Request,secret?:string){
 const internal=trusted.get(request);if(internal)return internal;
 const actor=request.headers.get('oai-authenticated-user-id'),timestamp=request.headers.get('x-mo-identity-time')||'',signature=request.headers.get('x-mo-identity-signature')||'';
 if(!secret||!actor||actor.length>200||/^[a-f0-9-]{36}$/i.test(actor)||!/^\d{10}$/.test(timestamp)||Math.abs(Date.now()/1000-Number(timestamp))>300||! /^[a-f0-9]{64}$/.test(signature))return null;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const bytes=Uint8Array.from(signature.match(/../g)!,x=>parseInt(x,16));
 return await crypto.subtle.verify('HMAC',key,bytes,await message(request,actor,timestamp))?actor:null;
}
