// Public guest IDs identify a record. Only this independent random secret authorizes it.
export const INVITE_SECRET=/^[A-Za-z0-9_-]{43}$/;
export function newInviteSecret(){const bytes=crypto.getRandomValues(new Uint8Array(32));return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
export async function inviteHash(secret:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(secret)))).map(b=>b.toString(16).padStart(2,'0')).join('')}
export const inviteExpiry=()=>new Date(Date.now()+30*86400000).toISOString();
