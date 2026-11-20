// Synthetic gateway signer for authentication regression tests only.
export async function signedHeaders(url,method,body,actor,secret,time=Math.floor(Date.now()/1000).toString()){
 const u=new URL(url),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body)))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const signature=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode([time,method,u.pathname+u.search,actor,hash].join('\n'))))).map(x=>x.toString(16).padStart(2,'0')).join('');
 return {'oai-authenticated-user-id':actor,'x-mo-identity-time':time,'x-mo-identity-signature':signature};
}
