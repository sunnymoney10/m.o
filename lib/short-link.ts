// Short links. A plan or guest ID (a UUID, 36 characters) is written as 22 URL-safe characters.
// Nothing is lost or guessable: it is the same 128-bit ID, just packed tighter.
//   /p/<code>  → the plan      /i/<code> → one guest's personal invite
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ABC='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export function shortId(uuid:string){
 if(!UUID.test(uuid))return uuid;
 let n=BigInt('0x'+uuid.replace(/-/g,'')),out='';
 for(let i=0;i<22;i++){out=ABC[Number(n&BigInt(63))]+out;n>>=BigInt(6)}
 return out;
}
export function longId(code:string){
 if(!/^[A-Za-z0-9_-]{22}$/.test(code))return null;
 let n=BigInt(0);for(const c of code)n=(n<<BigInt(6))|BigInt(ABC.indexOf(c));
 if(n>>BigInt(128))return null;
 const h=n.toString(16).padStart(32,'0');
 return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export const planLink=(origin:string,planId:string)=>`${origin}/p/${shortId(planId)}`;
// Legacy identifier link only; it is not a credential. New personal links must come from the host API.
export const guestLink=(origin:string,guestId:string)=>`${origin}/i/${shortId(guestId)}`;
