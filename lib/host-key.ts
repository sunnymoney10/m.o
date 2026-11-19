// Host links: a private, random key that lets the host manage their plan from another phone or computer.
// Only a hash of the key is stored, so the database never holds a working key.
const ABC='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export function newHostKey(){const b=new Uint8Array(24);crypto.getRandomValues(b);return [...b].map(x=>ABC[x&63]).join('').slice(0,24)}
export const HOST_KEY=/^[A-Za-z0-9_-]{24}$/;
export async function hashHostKey(key:string){const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('mo-host:'+key));return [...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')}
export const hostLink=(origin:string,key:string)=>`${origin}/h/${key}`;
